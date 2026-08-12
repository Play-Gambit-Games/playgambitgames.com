#!/usr/bin/env node
/*
 * publish-game-demo.mjs, drops a built game into this site as a playable demo subdirectory.
 *
 * Usage:
 *   node tools/publish-game-demo.mjs --src <path to the game's dist> --slug <url segment>
 *
 * The game build is copied in verbatim. Two edits are made to index.html: a script tag appended
 * to <body> that loads demo/badge.js plus the inline window.__DEMO_CONFIG__ that feeds it, and
 * the search and social metadata written into <head> by tools/seo-head.mjs. Everything else is
 * byte-identical to the build the studio submits.
 *
 * The head is rewritten rather than left alone because a game build's <head> is written for the
 * casino iframe it normally runs inside, where nothing crawls it and nothing shares it. Hosted at
 * a public URL those same defaults are the page's entire search result, and Sweet Bomb's build
 * shipped a title with an em dash in it and no canonical at all. Hand-fixing the published copy
 * does not survive the next publish, which is why it happens here.
 *
 * Two things it refuses to publish, both of which would ship a page that works locally and
 * breaks under playgambitgames.com/<slug>/:
 *
 *   1. A root-absolute asset URL (src="/assets/..."). At a subdirectory that resolves to the
 *      site root and 404s. Vite emits relative URLs when base is "./", so a hit here means the
 *      game's base config regressed.
 *   2. A missing <body>. Nothing to inject into means the badge silently never mounts, and a
 *      demo with no demo label is the one outcome this script exists to prevent.
 *
 * .nojekyll is written into the game directory as well as relying on the one at the site root,
 * because GitHub Pages runs Jekyll and Jekyll refuses to publish any path starting with an
 * underscore. A build that emits an _app/ or _next/ directory serves a blank page without it,
 * and the resulting 404s read like a code bug rather than a hosting one.
 *
 * Publishing starts by deleting the target directory, so that a file dropped from the build is
 * dropped from the site too. That makes a mistyped --slug destructive, and kebab-case is not
 * much of a guard: "assets", "docs" and "tools" are all valid slugs and all real directories
 * here. So a delete is allowed only against a directory this script itself created, proven by
 * the marker it leaves behind. A first publish into a path that already holds something stops
 * instead, and says what to remove by hand.
 */

import {
	existsSync,
	readFileSync,
	rmSync,
	renameSync,
	writeFileSync,
	cpSync,
	mkdirSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectSeoHead } from './seo-head.mjs';

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(TOOLS_DIR, '..');

function arg(name, fallback = null) {
	const index = process.argv.indexOf(`--${name}`);
	if (index === -1 || index === process.argv.length - 1) return fallback;
	return process.argv[index + 1];
}

function fail(message) {
	console.error(`publish-game-demo: ${message}`);
	process.exit(1);
}

const src = arg('src');
const slug = arg('slug');
if (!src) fail('missing --src (the game build directory to publish)');
if (!slug) fail('missing --slug (the URL segment to publish it under)');
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail(`--slug must be lowercase kebab-case, got "${slug}"`);

const srcDir = path.resolve(src);
if (!existsSync(path.join(srcDir, 'index.html'))) fail(`no index.html in ${srcDir}`);

const manifestPath = path.join(TOOLS_DIR, 'demos', `${slug}.json`);
if (!existsSync(manifestPath)) fail(`no demo manifest at ${path.relative(SITE_DIR, manifestPath)}`);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const badgeSource = path.join(TOOLS_DIR, 'demo-badge.js');
if (!existsSync(badgeSource)) fail('tools/demo-badge.js is missing');

// ------------------------------------------------------------------ claim the target directory

/* Written on every publish. Its presence is the only thing that authorises deleting a directory,
   so a slug that lands on hand-authored content can never take that content with it. */
const MARKER = '.published-by-publish-game-demo';

/* Claim check only. The live copy is NOT deleted here: a republish whose new build then fails
   the audit below would take the working demo down with it, and since the homepage CTAs point
   at this path, that turns a build regression into a 404 on the site's main call to action.
   The delete happens at the promote step instead, once there is something to replace it with. */
const outDir = path.join(SITE_DIR, slug);
if (existsSync(outDir) && !existsSync(path.join(outDir, MARKER))) {
	fail(
		`refusing to overwrite ${slug}/: it exists but was not published by this script.\n` +
			`If replacing it is genuinely what you want, delete it by hand first.`,
	);
}

// Publish into a sibling directory and move it into place at the end, so a copy that dies partway
// through cannot leave the live site serving half a game.
const stageDir = path.join(SITE_DIR, `.${slug}.publishing`);
rmSync(stageDir, { recursive: true, force: true });
cpSync(srcDir, stageDir, { recursive: true });

function abort(message) {
	rmSync(stageDir, { recursive: true, force: true });
	fail(message);
}

// ------------------------------------------------------------------ audit the copied build

const indexPath = path.join(stageDir, 'index.html');
let html = readFileSync(indexPath, 'utf8');

/* Root-absolute asset URLs resolve to the site root, so src="/assets/x.js" 404s under /<slug>/.
   Protocol-relative "//cdn.example.com/x.js" is excluded by requiring a non-slash second
   character: it is a real external URL, not a path that subdirectory hosting would break.
   All three attribute quoting styles are matched. Vite only ever emits double quotes, but this
   is presented as a safety gate and what it guards against is a silent 404 on the site's main
   call to action, so it should not depend on one bundler's formatting.
   Only index.html is scanned, because Vite rewrites CSS and JS asset references itself and a
   root-absolute one there means base regressed, which this check would have caught here first. */
const rootAbsolute = [
	...html.matchAll(/(?:src|href)\s*=\s*(?:"(\/(?:[^/"][^"]*)?)"|'(\/(?:[^/'][^']*)?)'|(\/(?:[^/\s>][^\s>]*)?))/g),
].map((m) => m[1] ?? m[2] ?? m[3]);
if (rootAbsolute.length > 0) {
	abort(
		`index.html holds root-absolute asset URLs, which 404 under /${slug}/:\n  ` +
			rootAbsolute.join('\n  ') +
			'\nBuild the game with a relative base (Vite: base: "./") and publish again.',
	);
}

if (!html.includes('</body>')) {
	abort('index.html has no </body> to inject the demo badge into');
}

/* The badge lands at <slug>/demo/badge.js. A build that already ships its own demo/ would have
   it silently overwritten, so stop rather than corrupt the game. */
if (existsSync(path.join(stageDir, 'demo'))) {
	abort('the build already contains a demo/ directory, which the badge would overwrite');
}

// ------------------------------------------------------------------ inject the badge

mkdirSync(path.join(stageDir, 'demo'), { recursive: true });
cpSync(badgeSource, path.join(stageDir, 'demo', 'badge.js'));

const config = {
	gameTitle: manifest.gameTitle,
	theme: manifest.theme ?? {},
	notes: manifest.notes ?? [],
	facts: manifest.facts ?? [],
	footnote: manifest.footnote ?? null,
};

// </script> inside the JSON would close the tag early and dump the rest of the config as markup.
const configJson = JSON.stringify(config).replace(/</g, '\\u003c');

html = html.replace(
	'</body>',
	`  <script>window.__DEMO_CONFIG__ = ${configJson};</script>\n` +
		`    <script src="./demo/badge.js" defer></script>\n  </body>`,
);

// ------------------------------------------------------------------ write the head metadata

/* After the audit, deliberately, for the same reason the badge is: the audit's job is to judge
   the build the studio produced, and it cannot do that against a document this script has
   already been editing. The canonical and og:image this writes are fully qualified
   https://playgambitgames.com/... URLs, so the root-absolute check above would pass them anyway,
   but the ordering is what keeps that a property of the metadata rather than a coincidence.
   See tools/seo-head.mjs for what it writes and tools/demos/<slug>.json for the copy itself. */
try {
	html = injectSeoHead(html, { slug, seo: manifest.seo });
} catch (error) {
	abort(`the head metadata could not be written:\n${error.message}`);
}

writeFileSync(indexPath, html);

writeFileSync(path.join(stageDir, '.nojekyll'), '');

/* Record which game commit this build came from. The daily watcher compares it against the game
   repo's origin/main to decide whether the demo is stale, so without it there is no way to tell
   what is actually deployed short of diffing bundle hashes. */
let sourceCommit = 'unknown';
try {
	sourceCommit = execFileSync('git', ['-C', srcDir, 'rev-parse', 'HEAD'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore'],
	}).trim();
} catch {
	// Not a git checkout, or git is unavailable. The marker still identifies the source path.
}

writeFileSync(
	path.join(stageDir, MARKER),
	`${slug} published from ${srcDir} by tools/publish-game-demo.mjs\n` +
		`source-commit: ${sourceCommit}\n`,
);

// ------------------------------------------------------------------ promote

rmSync(outDir, { recursive: true, force: true });
renameSync(stageDir, outDir);

console.log(`published ${srcDir}`);
console.log(`      to  ${path.relative(SITE_DIR, outDir)}/  (serves at /${slug}/)`);
