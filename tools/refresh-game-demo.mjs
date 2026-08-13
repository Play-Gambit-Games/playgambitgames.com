#!/usr/bin/env node
/*
 * refresh-game-demo.mjs, the QA gate behind the daily demo refresh.
 *
 * Usage:
 *   node tools/refresh-game-demo.mjs --slug sweet-bomb-or-a-wild [--check-only]
 *
 * A scheduled agent runs this, then commits and merges ONLY on exit code 0 with status "updated".
 * Everything that decides whether the public site changes lives here rather than in the agent's
 * prompt, so the gate is deterministic: the same build either passes or fails regardless of how
 * an agent reads its instructions that day.
 *
 * Exit codes:
 *   0  and prints "STATUS: up-to-date"  nothing to do, deployed build already matches the game
 *   0  and prints "STATUS: updated"     rebuilt, every QA gate passed, safe to commit and merge
 *   2                                   rebuilt but QA FAILED, do not merge, the working tree
 *                                       holds the failed build for inspection
 *   1                                   the refresh could not run at all (bad args, no repo)
 *
 * The claim check is the one that matters most. The demo's disclosure panel quotes constants read
 * from the game's own math config, so if the game ever re-tunes its RTP or win cap, the published
 * disclaimer silently becomes false. That is a compliance defect, not a cosmetic one, so a
 * mismatch fails the run and holds the site at the previous build until a human rewrites the
 * manifest.
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(TOOLS_DIR, '..');

/* Where each published slug's source lives. Adding a game here plus a demos/<slug>.json manifest
   is all a new game needs to join the daily refresh. */
const GAMES = {
	'sweet-bomb-or-a-wild': {
		repo: '/Users/robertbotto/Projects/sweet-bomb-or-a-wild',
		app: 'web',
		configPath: 'web/src/game/config.ts',
	},
};

function arg(name, fallback = null) {
	const index = process.argv.indexOf(`--${name}`);
	if (index === -1 || index === process.argv.length - 1) return fallback;
	return process.argv[index + 1];
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

function die(code, message) {
	console.error(`refresh-game-demo: ${message}`);
	process.exit(code);
}
const run = (cmd, args, cwd) =>
	execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const slug = arg('slug');
if (!slug) die(1, 'missing --slug');
const game = GAMES[slug];
if (!game) die(1, `unknown slug "${slug}", add it to GAMES in this file`);
if (!existsSync(game.repo)) die(1, `game repo not found at ${game.repo}`);

const appDir = path.join(game.repo, game.app);
const distDir = path.join(appDir, 'dist');

// ------------------------------------------------------------------ is there anything to do

run('git', ['fetch', 'origin', '--quiet'], game.repo);
const remoteSha = run('git', ['rev-parse', 'origin/main'], game.repo);

const markerPath = path.join(SITE_DIR, slug, '.published-by-publish-game-demo');
const deployedSha = existsSync(markerPath)
	? (readFileSync(markerPath, 'utf8').match(/source-commit:\s*([0-9a-f]{7,40})/)?.[1] ?? 'unknown')
	: 'none';

console.log(`deployed: ${deployedSha}`);
console.log(`upstream: ${remoteSha}`);

if (deployedSha === remoteSha) {
	console.log('STATUS: up-to-date');
	process.exit(0);
}

const newCommits = run('git', ['log', '--oneline', `${deployedSha}..${remoteSha}`], game.repo);
console.log(`new commits:\n${newCommits}`);

if (hasFlag('check-only')) {
	console.log('STATUS: behind (check-only, nothing rebuilt)');
	process.exit(0);
}

// ------------------------------------------------------------------ rebuild

/* --ff-only so a diverged local branch stops the run instead of opening a merge the agent would
   then have to resolve unattended. */
try {
	run('git', ['pull', '--ff-only', 'origin', 'main'], game.repo);
} catch (error) {
	die(2, `git pull --ff-only failed, resolve the game repo by hand:\n${error.stderr || error.message}`);
}

try {
	run('npx', ['vite', 'build'], appDir);
} catch (error) {
	die(2, `the game build failed:\n${error.stdout || ''}\n${error.stderr || ''}`);
}

try {
	console.log(run('node', [path.join(TOOLS_DIR, 'publish-game-demo.mjs'), '--src', distDir, '--slug', slug], SITE_DIR));
} catch (error) {
	die(2, `publish rejected the build:\n${error.stdout || ''}\n${error.stderr || ''}`);
}

// ------------------------------------------------------------------ gate 1: the claims still hold

/* The panel states these as fact. If the game re-tunes any of them, the published disclosure is
   wrong until the manifest is rewritten, so this fails the run rather than shipping it. */
const configSrc = readFileSync(path.join(game.repo, game.configPath), 'utf8');
const constant = (name) => configSrc.match(new RegExp(`${name}\\s*=\\s*([\\d.]+)`))?.[1] ?? null;
const manifest = JSON.parse(readFileSync(path.join(TOOLS_DIR, 'demos', `${slug}.json`), 'utf8'));
const factFor = (label) => manifest.facts.find((f) => f.label === label)?.value ?? null;

/* Each config constant is bound to the SPECIFIC fact row that states it. An earlier version just
   asked whether the number appeared anywhere in the manifest, which passed a deliberately broken
   test: the facts row was changed to a wrong RTP and the check still passed, because the correct
   figure was also mentioned in the surrounding prose. A gate that decides whether a public site
   auto-updates has to be exact about which claim it is checking. */
const claimChecks = [
	['PUBLISHED_RTP', 'Published return to player', (v) => `${Number(v).toFixed(2)}%`],
	['MAX_WIN_MULTIPLIER', 'Maximum win', (v) => `${Number(v).toLocaleString('en-US')}x the stake`],
	['STARTING_BALANCE', 'Starting play-money balance', (v) => `$${Number(v).toLocaleString('en-US')}.00`],
];
const claimFailures = [];
let expectedRtp = null;
for (const [name, label, format] of claimChecks) {
	const value = constant(name);
	if (value === null) {
		claimFailures.push(`${name} not found in ${game.configPath}`);
		continue;
	}
	const expected = format(value);
	if (name === 'PUBLISHED_RTP') expectedRtp = expected;
	const stated = factFor(label);
	if (stated === null) {
		claimFailures.push(`the manifest has no "${label}" fact row to carry ${name}`);
	} else if (stated !== expected) {
		claimFailures.push(`${name} is ${value}, so "${label}" should read "${expected}" but reads "${stated}"`);
	}
}

/* The prose must not contradict the config either. Every percentage quoted anywhere in the notes
   or footnote has to be the published RTP, because that is the only percentage this panel is
   entitled to state as fact. */
if (expectedRtp !== null) {
	const prose = JSON.stringify(manifest.notes) + JSON.stringify(manifest.footnote ?? '');
	for (const quoted of new Set(prose.match(/\d+\.\d\d%/g) ?? [])) {
		if (quoted !== expectedRtp) {
			claimFailures.push(`the panel prose quotes ${quoted}, which is not the published RTP ${expectedRtp}`);
		}
	}
}
if (claimFailures.length > 0) {
	die(
		2,
		`QA FAILED, the demo disclosure no longer matches the game's math config:\n  ` +
			claimFailures.join('\n  ') +
			`\nRewrite tools/demos/${slug}.json before this can ship.`,
	);
}
console.log('gate 1 claims: PASS');

// ------------------------------------------------------------------ gate 2: it actually plays

const PORT = 8971;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: SITE_DIR, stdio: 'ignore' });
const stopServer = () => server.kill();
process.on('exit', stopServer);

const browserQa = `
const { chromium } = require('playwright');
const TARGET = 'http://127.0.0.1:${PORT}/${slug}/';
const fail = [];
(async () => {
  const b = await chromium.launch();
  for (const view of [
    { name: 'desktop', opts: { viewport: { width: 1440, height: 900 } } },
    { name: 'portrait', opts: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ]) {
    const p = await b.newPage(view.opts);
    const errs = [], bad = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    await p.goto(TARGET, { waitUntil: 'networkidle', timeout: 60000 });

    /* Wait for readiness rather than guessing at it. A fixed delay here produced a false
       failure the moment the game grew a longer studio intro: the click landed while the
       loader was still counting up, so the spins that followed were still settling when the
       badge checks read the balance, and a passing build was reported as chain-spinning
       behind the disclosure panel. Anchor on what the game actually shows instead, so a
       future intro of any length cannot make this lie again. */
    await p.getByText('PLAY', { exact: true }).first().waitFor({ state: 'visible', timeout: 90000 });

    const badge = await p.evaluate(() => {
      const h = document.getElementById('demo-badge-host');
      return h && h.shadowRoot ? h.shadowRoot.querySelector('.pill').innerText : null;
    });
    if (!badge || !/DEMO/i.test(badge)) fail.push(view.name + ': DEMO badge missing');

    await p.getByText('PLAY', { exact: true }).first().click();
    // The HUD's CREDIT readout is the game's own signal that it is ready to take a bet.
    await p.waitForFunction(
      () => /CREDIT\\s*\\n?\\s*\\$[\\d,]+\\.\\d\\d/i.test(document.body.innerText),
      null,
      { timeout: 60000 },
    );
    await p.waitForTimeout(1500);
    const credit = () => p.evaluate(() => {
      const m = document.body.innerText.match(/CREDIT\\s*\\n?\\s*\\$([\\d,]+\\.\\d\\d)/i);
      return m ? m[1] : null;
    });
    /* A win credits after the round's presentation finishes, so reading the balance the instant a
       spin loop ends can catch a payout still in flight and make the NEXT comparison look like an
       unexpected wager. Wait for it to hold steady before using it as a baseline. */
    const settled = async () => {
      let last = await credit();
      for (let i = 0; i < 20; i++) {
        await p.waitForTimeout(700);
        const now = await credit();
        if (now === last) return now;
        last = now;
      }
      return last;
    };
    const before = await settled();
    if (before === null) fail.push(view.name + ': no CREDIT readout, the HUD did not render');
    for (let i = 0; i < 4; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(4000); }
    const after = await settled();
    if (before !== null && before === after) fail.push(view.name + ': 4 spins did not move the balance (' + before + ')');

    if (view.name === 'desktop') {
      // the badge must not steal Space from the game, nor let a held Space spin behind the panel
      await p.evaluate(() => document.getElementById('demo-badge-host').shadowRoot.querySelector('.pill').focus());
      const c0 = await settled();
      await p.keyboard.press('Space'); await p.waitForTimeout(1200);
      const opened = await p.evaluate(() => !!document.getElementById('demo-badge-host').shadowRoot.querySelector('.scrim'));
      if (!opened) fail.push('Space on the pill did not open the disclosure panel');
      if (await credit() !== c0) fail.push('Space on the pill wagered a round');
      await p.evaluate(() => { for (let i = 0; i < 12; i++) document.body.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'Space', key: ' ', repeat: true, bubbles: true, composed: true, cancelable: true })); });
      await p.waitForTimeout(6000);
      if (await credit() !== c0) fail.push('a held Space chain-spun behind the open panel');
      await p.keyboard.press('Escape'); await p.waitForTimeout(600);
      await p.evaluate(() => document.getElementById('demo-badge-host').shadowRoot.querySelector('.pill').click());
      await p.waitForTimeout(600);
      await p.evaluate(() => { const s = document.getElementById('demo-badge-host').shadowRoot.querySelector('.scrim');
        s.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      await p.waitForTimeout(600);
      const c1 = await settled();
      await p.keyboard.press('Space'); await p.waitForTimeout(4000);
      if (await settled() === c1) fail.push('after a mouse open and dismiss, Space no longer spins');
    }

    if (errs.length) fail.push(view.name + ' console errors: ' + JSON.stringify(errs.slice(0, 5)));
    if (bad.length) fail.push(view.name + ' failed requests: ' + JSON.stringify(bad.slice(0, 5)));
    await p.close();
  }
  await b.close();
  if (fail.length) { console.error('QA FAILURES:\\n  ' + fail.join('\\n  ')); process.exit(1); }
  console.log('gate 2 playable: PASS');
})().catch(e => { console.error('QA harness crashed: ' + e.message); process.exit(1); });
`;

await new Promise((resolve) => setTimeout(resolve, 2500));
try {
	console.log(execFileSync('node', ['-e', browserQa], { cwd: appDir, encoding: 'utf8' }).trim());
} catch (error) {
	stopServer();
	die(2, `QA FAILED against the rebuilt demo:\n${error.stdout || ''}\n${error.stderr || ''}`);
}
stopServer();

console.log(`STATUS: updated ${deployedSha.slice(0, 7)} -> ${remoteSha.slice(0, 7)}`);
