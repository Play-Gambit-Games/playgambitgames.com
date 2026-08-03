/*
 * demo-badge.js, the thing that stops anyone mistaking this for a real-money game.
 *
 * A permanent, always-visible marker plus a panel that spells out exactly what the demo is and
 * what it is not. Two rules shaped it:
 *
 *   1. It has to be legible without hunting for it. A disclaimer in a menu three taps deep is a
 *      disclaimer nobody reads.
 *   2. It must not fight the game for space. So the resting state is a single small pill in a
 *      corner the game's HUD does not use, and everything else is behind one tap.
 *
 * Every number it quotes comes from window.__DEMO_CONFIG__, which build-demo.mjs writes from the
 * sampler's own manifest. Nothing here invents an RTP, a hit rate or a payout figure, if the
 * manifest does not have it, the panel does not say it.
 *
 * Rendered into a shadow root so the game's stylesheets and this one cannot reach each other.
 */

(function () {
	'use strict';

	var CONFIG = window.__DEMO_CONFIG__ || {};
	var STATS = CONFIG.stats || {};

	function percent(value, digits) {
		if (typeof value !== 'number' || !isFinite(value)) return null;
		return value.toFixed(digits === undefined ? 2 : digits) + '%';
	}

	function formatMoney(minorUnits) {
		if (typeof minorUnits !== 'number') return '';
		return (minorUnits / 1000000).toLocaleString('en-US', {
			style: 'currency',
			currency: CONFIG.currency || 'USD',
		});
	}

	var host = document.createElement('div');
	host.id = 'demo-badge-host';
	host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000;';
	var root = host.attachShadow({ mode: 'open' });

	var style = document.createElement('style');
	style.textContent = [
		':host { all: initial; }',
		'* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }',

		/* The resting marker. Top-left, above the safe-area inset, small enough to ignore and
		   contrasty enough to read over the cavern background. */
		'.pill {',
		'  position: absolute;',
		'  top: calc(env(safe-area-inset-top, 0px) + 8px);',
		'  left: calc(env(safe-area-inset-left, 0px) + 8px);',
		'  display: inline-flex; align-items: center; gap: 6px;',
		'  padding: 5px 10px;',
		'  border-radius: 999px;',
		'  border: 1px solid rgba(255, 216, 115, 0.45);',
		'  background: rgba(5, 14, 22, 0.72);',
		'  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);',
		'  color: #ffd873;',
		'  font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;',
		'  line-height: 1; white-space: nowrap; cursor: pointer;',
		'  pointer-events: auto;',
		'  opacity: 0.82; transition: opacity 160ms ease, transform 160ms ease;',
		'}',
		'.pill:hover, .pill:focus-visible { opacity: 1; transform: translateY(1px); outline: none; }',
		'.pill:focus-visible { box-shadow: 0 0 0 2px rgba(53, 214, 208, 0.8); }',
		'.dot { width: 6px; height: 6px; border-radius: 50%; background: #35d6d0; flex: none; }',
		'.pill .hint { color: rgba(255, 255, 255, 0.55); font-weight: 600; }',

		/* Narrow portrait phones: drop the secondary word so the pill stays one short line. */
		'@media (max-width: 420px) { .pill .hint { display: none; } .pill { font-size: 9px; padding: 4px 8px; } }',

		'.scrim {',
		'  position: absolute; inset: 0;',
		'  background: rgba(3, 9, 16, 0.72);',
		'  -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);',
		'  display: flex; align-items: center; justify-content: center;',
		'  padding: 16px;',
		'  pointer-events: auto;',
		'}',
		'.panel {',
		'  width: min(520px, 100%);',
		'  max-height: min(84vh, 640px);',
		'  overflow-y: auto;',
		'  -webkit-overflow-scrolling: touch;',
		'  border-radius: 12px;',
		'  border: 1px solid rgba(255, 216, 115, 0.28);',
		'  background: linear-gradient(180deg, #0b1b2a 0%, #050e16 100%);',
		'  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);',
		'  color: #e8eef5;',
		'  padding: 22px 22px 18px;',
		'}',
		'.panel h2 {',
		'  margin: 0 0 4px; color: #ffd873;',
		'  font-size: 15px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700;',
		'}',
		'.panel .lede { margin: 0 0 14px; font-size: 13px; line-height: 1.5; color: #b9c7d6; }',
		'.panel ul { margin: 0 0 14px; padding-left: 18px; }',
		'.panel li { font-size: 13px; line-height: 1.6; margin-bottom: 7px; }',
		'.panel strong { color: #ffe9a8; font-weight: 600; }',
		'.facts { margin: 0 0 14px; border-top: 1px solid rgba(255,255,255,0.09); }',
		'.fact { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.07); font-size: 12px; }',
		'.fact dt { color: #8fa3b6; }',
		'.fact dd { margin: 0; color: #e8eef5; font-variant-numeric: tabular-nums; text-align: right; }',
		'.actions { display: flex; gap: 8px; flex-wrap: wrap; }',
		'button {',
		'  font: inherit; font-size: 12px; font-weight: 600; letter-spacing: 0.06em;',
		'  padding: 9px 14px; border-radius: 7px; cursor: pointer;',
		'  border: 1px solid rgba(255, 216, 115, 0.4); background: rgba(255, 216, 115, 0.1); color: #ffd873;',
		'}',
		'button:hover { background: rgba(255, 216, 115, 0.18); }',
		'button.primary { background: #ffd873; color: #17110a; border-color: #ffd873; }',
		'button.primary:hover { background: #ffe9a8; }',
		'button:focus-visible { outline: 2px solid #35d6d0; outline-offset: 2px; }',
		'@media (prefers-reduced-motion: reduce) { .pill { transition: none; } }',
	].join('\n');
	root.appendChild(style);

	// ------------------------------------------------------------------ resting pill

	var pill = document.createElement('button');
	pill.className = 'pill';
	pill.type = 'button';
	pill.setAttribute('aria-haspopup', 'dialog');
	pill.innerHTML =
		'<span class="dot"></span><span>Demo &middot; Play money</span>' +
		'<span class="hint">&middot; Details</span>';
	root.appendChild(pill);

	// ------------------------------------------------------------------ panel

	var scrim = null;

	function buildFacts() {
		var facts = [];
		if (typeof STATS.rtp === 'number') {
			facts.push(['Return to player (base game)', percent(STATS.rtp * 100)]);
		}
		if (typeof STATS.hitRate === 'number') {
			facts.push(['Spins that win something', percent(STATS.hitRate * 100, 1)]);
		}
		if (typeof STATS.maxWin === 'number') {
			facts.push(['Maximum win', STATS.maxWin.toLocaleString('en-US') + '× the stake']);
		}
		if (typeof STATS.sampledRounds === 'number') {
			facts.push([
				'Pre-generated rounds in this demo',
				STATS.sampledRounds.toLocaleString('en-US') +
					(typeof STATS.libraryRounds === 'number'
						? ' of ' + STATS.libraryRounds.toLocaleString('en-US')
						: ''),
			]);
		}
		facts.push(['Starting play-money balance', formatMoney(CONFIG.startingBalance)]);
		return facts;
	}

	function openPanel() {
		if (scrim) return;

		scrim = document.createElement('div');
		scrim.className = 'scrim';

		var panel = document.createElement('div');
		panel.className = 'panel';
		panel.setAttribute('role', 'dialog');
		panel.setAttribute('aria-modal', 'true');
		panel.setAttribute('aria-label', 'About this demo');

		var facts = buildFacts()
			.map(function (row) {
				return '<div class="fact"><dt>' + row[0] + '</dt><dd>' + row[1] + '</dd></div>';
			})
			.join('');

		panel.innerHTML =
			'<h2>About this demo</h2>' +
			'<p class="lede">This is a free demonstration of ' +
			(CONFIG.gameTitle || 'the game') +
			'. It is not a casino, and nothing here can be won or lost.</p>' +
			'<ul>' +
			'<li><strong>The balance is play money.</strong> It lives in this browser, it has no value, ' +
			'and it cannot be cashed out, transferred or topped up with anything real.</li>' +
			'<li><strong>Nothing is for sale.</strong> There is no payment step anywhere in this page, ' +
			'and no account to create.</li>' +
			'<li><strong>Outcomes come from a fixed sample.</strong> Spins are drawn at random from ' +
			(typeof STATS.sampledRounds === 'number'
				? STATS.sampledRounds.toLocaleString('en-US') + ' '
				: 'a set of ') +
			'rounds pre-generated by the game’s own maths, bundled with this page. The sample is ' +
			'weighted so that the long-run return and the proportion of winning spins match the full ' +
			'game exactly, but it is still a sample, so <strong>play long enough and rounds will ' +
			'repeat</strong>, and a short session will land nowhere near the long-run figure. ' +
			'That is true of real play too; here it is simply certain.</li>' +
			'<li><strong>The game itself is unmodified.</strong> The only thing swapped out is the ' +
			'server, which is replaced by code running in this page so the demo needs no connection ' +
			'to anything.</li>' +
			'</ul>' +
			'<dl class="facts">' +
			facts +
			'</dl>' +
			'<div class="actions">' +
			'<button type="button" class="primary" data-action="close">Back to the game</button>' +
			'<button type="button" data-action="reset">Reset play-money balance</button>' +
			'</div>';

		scrim.appendChild(panel);
		root.appendChild(scrim);

		// preventScroll matters on a phone: the panel scrolls, the dismiss button is at the bottom
		// of it, and focusing normally scrolls it into view, so the panel opens with its heading
		// and its first line already off-screen. Keyboard focus still lands correctly.
		panel.querySelector('[data-action="close"]').focus({ preventScroll: true });
		panel.scrollTop = 0;

		scrim.addEventListener('click', function (event) {
			if (event.target === scrim) closePanel();
		});
		panel.addEventListener('click', function (event) {
			var action = event.target && event.target.getAttribute('data-action');
			if (action === 'close') closePanel();
			if (action === 'reset' && window.__DEMO_RGS__) window.__DEMO_RGS__.reset();
		});
	}

	function closePanel() {
		if (!scrim) return;
		root.removeChild(scrim);
		scrim = null;
		pill.focus();
	}

	pill.addEventListener('click', openPanel);

	// The game binds the spacebar to spin and Escape to its own modals; the panel only claims
	// Escape, and only while it is open.
	document.addEventListener(
		'keydown',
		function (event) {
			if (event.key === 'Escape' && scrim) {
				event.stopPropagation();
				closePanel();
			}
		},
		true,
	);

	function mount() {
		document.body.appendChild(host);
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
	else mount();
})();
