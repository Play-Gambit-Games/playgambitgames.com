/*
 * demo-badge.js, the thing that stops anyone mistaking a hosted game demo for a real-money game.
 *
 * A permanent, always-visible marker plus a panel that spells out exactly what the demo is and
 * what it is not. Two rules shaped it:
 *
 *   1. It has to be legible without hunting for it. A disclaimer in a menu three taps deep is a
 *      disclaimer nobody reads.
 *   2. It must not fight the game for space. So the resting state is a single small pill in a
 *      corner the game's HUD does not use, and everything else is behind one tap.
 *
 * Every word and number it shows comes from window.__DEMO_CONFIG__, which publish-game-demo.mjs
 * writes from a per-game manifest. Nothing here invents an RTP, a hit rate or a payout figure:
 * if the manifest does not carry it, the panel does not say it.
 *
 * Rendered into a shadow root so the game's stylesheets and this one cannot reach each other.
 */

(function () {
	'use strict';

	var CONFIG = window.__DEMO_CONFIG__ || {};
	var THEME = CONFIG.theme || {};

	var ACCENT = THEME.accent || '#ffd873';
	var ACCENT_SOFT = THEME.accentSoft || 'rgba(255, 216, 115, 0.4)';
	var ACCENT_BRIGHT = THEME.accentBright || '#ffe9a8';
	var FOCUS = THEME.focus || '#35d6d0';
	var PANEL_TOP = THEME.panelTop || '#0b1b2a';
	var PANEL_BOTTOM = THEME.panelBottom || '#050e16';
	var INK_DARK = THEME.inkOnAccent || '#17110a';

	var host = document.createElement('div');
	host.id = 'demo-badge-host';
	host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000;';
	var root = host.attachShadow({ mode: 'open' });

	var style = document.createElement('style');
	style.textContent = [
		':host { all: initial; }',
		'* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }',

		/* The resting marker. Top-left, above the safe-area inset, small enough to ignore and
		   contrasty enough to read over whatever art the game puts behind it. */
		'.pill {',
		'  position: absolute;',
		'  top: calc(env(safe-area-inset-top, 0px) + 8px);',
		'  left: calc(env(safe-area-inset-left, 0px) + 8px);',
		'  display: inline-flex; align-items: center; gap: 6px;',
		'  padding: 5px 10px;',
		'  border-radius: 999px;',
		'  border: 1px solid ' + ACCENT_SOFT + ';',
		'  background: rgba(5, 8, 20, 0.72);',
		'  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);',
		'  color: ' + ACCENT + ';',
		'  font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;',
		'  line-height: 1; white-space: nowrap; cursor: pointer;',
		'  pointer-events: auto;',
		'  opacity: 0.82; transition: opacity 160ms ease, transform 160ms ease;',
		'}',
		'.pill:hover, .pill:focus-visible { opacity: 1; transform: translateY(1px); outline: none; }',
		'.pill:focus-visible { box-shadow: 0 0 0 2px ' + FOCUS + '; }',
		'.dot { width: 6px; height: 6px; border-radius: 50%; background: ' + FOCUS + '; flex: none; }',
		'.pill .hint { color: rgba(255, 255, 255, 0.55); font-weight: 600; }',

		/* Narrow portrait phones: shrink the "Details" affordance rather than removing it. An
		   earlier version hid it outright, which left the pill reading as a static label on
		   exactly the devices where the panel behind it is least likely to be discovered, and
		   the panel is where the play-money disclosure actually lives. */
		'@media (max-width: 420px) {',
		'  .pill { font-size: 9px; padding: 4px 8px; }',
		'  .pill .hint-word { display: none; }',
		'}',
		'.pill .mark {',
		'  display: inline-flex; align-items: center; justify-content: center;',
		'  width: 12px; height: 12px; border-radius: 50%; flex: none;',
		'  border: 1px solid currentColor; font-size: 8px; font-weight: 700;',
		'  font-style: normal; letter-spacing: 0; line-height: 1;',
		'}',

		'.scrim {',
		'  position: absolute; inset: 0;',
		'  background: rgba(3, 5, 14, 0.72);',
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
		'  border: 1px solid ' + ACCENT_SOFT + ';',
		'  background: linear-gradient(180deg, ' + PANEL_TOP + ' 0%, ' + PANEL_BOTTOM + ' 100%);',
		'  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);',
		'  color: #e8eef5;',
		'  padding: 22px 22px 18px;',
		'}',
		'.panel h2 {',
		'  margin: 0 0 4px; color: ' + ACCENT + ';',
		'  font-size: 15px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700;',
		'}',
		'.panel .lede { margin: 0 0 14px; font-size: 13px; line-height: 1.5; color: #b9c7d6; }',
		'.panel ul { margin: 0 0 14px; padding-left: 18px; }',
		'.panel li { font-size: 13px; line-height: 1.6; margin-bottom: 7px; }',
		'.panel strong { color: ' + ACCENT_BRIGHT + '; font-weight: 600; }',
		'.facts { margin: 0 0 14px; border-top: 1px solid rgba(255,255,255,0.09); }',
		'.fact { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.07); font-size: 12px; }',
		'.fact dt { color: #8fa3b6; }',
		'.fact dd { margin: 0; color: #e8eef5; font-variant-numeric: tabular-nums; text-align: right; }',
		'.footnote { margin: 0 0 14px; font-size: 11px; line-height: 1.5; color: #8fa3b6; }',
		'.actions { display: flex; gap: 8px; flex-wrap: wrap; }',
		'button {',
		'  font: inherit; font-size: 12px; font-weight: 600; letter-spacing: 0.06em;',
		'  padding: 9px 14px; border-radius: 7px; cursor: pointer;',
		'  border: 1px solid ' + ACCENT_SOFT + '; background: rgba(255, 255, 255, 0.08); color: ' + ACCENT + ';',
		'}',
		'button:hover { background: rgba(255, 255, 255, 0.16); }',
		'button.primary { background: ' + ACCENT + '; color: ' + INK_DARK + '; border-color: ' + ACCENT + '; }',
		'button.primary:hover { background: ' + ACCENT_BRIGHT + '; }',
		'button:focus-visible { outline: 2px solid ' + FOCUS + '; outline-offset: 2px; }',
		'@media (prefers-reduced-motion: reduce) { .pill { transition: none; } }',
	].join('\n');
	root.appendChild(style);

	// ------------------------------------------------------------------ helpers

	function escapeHtml(value) {
		return String(value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	/* Manifest prose is allowed exactly one piece of markup, <strong>, so a bullet can lead with
	   its point in bold the way the Dragonhoard panel does. Everything else is escaped, which
	   keeps a manifest from being able to inject script or markup into the page. */
	function richText(value) {
		return escapeHtml(value)
			.replace(/&lt;strong&gt;/g, '<strong>')
			.replace(/&lt;\/strong&gt;/g, '</strong>');
	}

	// ------------------------------------------------------------------ resting pill

	var pill = document.createElement('button');
	pill.className = 'pill';
	pill.type = 'button';
	pill.setAttribute('aria-haspopup', 'dialog');
	pill.setAttribute('aria-expanded', 'false');
	pill.innerHTML =
		'<span class="dot"></span><span>Demo &middot; Play money</span>' +
		'<span class="hint"><span class="hint-word">&middot; Details </span>' +
		'<i class="mark" aria-hidden="true">i</i></span>';
	root.appendChild(pill);

	// ------------------------------------------------------------------ panel

	var scrim = null;

	/* The panel declares aria-modal, so the rest of the page has to actually be unreachable or
	   that declaration is a lie. Without this, Tab from the panel walks straight into the game's
	   own controls sitting invisible behind an opaque scrim, Buy Bonus among them. */
	var inerted = [];

	function setBackgroundInert(on) {
		if (on) {
			inerted = [];
			Array.prototype.forEach.call(document.body.children, function (element) {
				// Skip anything the game already marked inert itself, so closing this panel
				// cannot silently re-activate a game modal that was inert before we opened.
				if (element === host || element.hasAttribute('inert')) return;
				element.setAttribute('inert', '');
				inerted.push(element);
			});
			return;
		}
		inerted.forEach(function (element) {
			element.removeAttribute('inert');
		});
		inerted = [];
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

		var notes = (CONFIG.notes || [])
			.map(function (note) {
				return '<li>' + richText(note) + '</li>';
			})
			.join('');

		var facts = (CONFIG.facts || [])
			.map(function (row) {
				return (
					'<div class="fact"><dt>' +
					escapeHtml(row.label) +
					'</dt><dd>' +
					escapeHtml(row.value) +
					'</dd></div>'
				);
			})
			.join('');

		panel.innerHTML =
			'<h2>About this demo</h2>' +
			'<p class="lede">This is a free demonstration of ' +
			escapeHtml(CONFIG.gameTitle || 'the game') +
			'. It is not a casino, and nothing here can be won or lost.</p>' +
			(notes ? '<ul>' + notes + '</ul>' : '') +
			(facts ? '<dl class="facts">' + facts + '</dl>' : '') +
			(CONFIG.footnote ? '<p class="footnote">' + richText(CONFIG.footnote) + '</p>' : '') +
			'<div class="actions">' +
			'<button type="button" class="primary" data-action="close">Back to the game</button>' +
			'</div>';

		scrim.appendChild(panel);
		root.appendChild(scrim);
		setBackgroundInert(true);
		pill.setAttribute('aria-expanded', 'true');

		// preventScroll matters on a phone: the panel scrolls, the dismiss button is at the bottom
		// of it, and focusing normally scrolls it into view, so the panel opens with its heading
		// and its first line already off-screen. Keyboard focus still lands correctly.
		panel.querySelector('[data-action="close"]').focus({ preventScroll: true });
		panel.scrollTop = 0;

		scrim.addEventListener('click', function (event) {
			if (event.target === scrim) closePanel();
		});
		panel.addEventListener('click', function (event) {
			if (event.target && event.target.getAttribute('data-action') === 'close') closePanel();
		});
	}

	function closePanel() {
		if (!scrim) return;
		root.removeChild(scrim);
		scrim = null;
		setBackgroundInert(false);
		pill.setAttribute('aria-expanded', 'false');
		pill.focus();
	}

	pill.addEventListener('click', openPanel);

	function aimedAtBadge(event) {
		if (typeof event.composedPath !== 'function') return false;
		return event.composedPath().indexOf(host) !== -1;
	}

	/*
	 * Keyboard, and the reason this is more than a one-line Escape handler.
	 *
	 * A slot frontend binds Space to spin, and it does so by calling preventDefault on EVERY
	 * Space keydown before it checks anything, because Space must never scroll the frame. Two
	 * consequences land on this badge, both measured in a real browser rather than assumed:
	 *
	 *   1. Space with the pill focused never activates the pill. The game's preventDefault
	 *      suppresses the button's native activation, and the game wagers a round instead. The
	 *      disclosure is unopenable with the key the game's own HUD tells players to press.
	 *   2. Space held while the panel is open chains spins behind the scrim, because the game
	 *      treats a repeat as fast-forward plus auto-spin and knows nothing about this panel.
	 *
	 * So the badge claims Space outright whenever it is the target, or whenever the panel is
	 * open, and drives activation itself rather than trusting the native default to survive.
	 * Listening at the document in the CAPTURE phase is what makes that work: capture reaches
	 * the document before the target, so stopping here means the game's window listener never
	 * runs and never gets to call preventDefault. Everything else is left alone.
	 */
	document.addEventListener(
		'keydown',
		function (event) {
			var isSpace = event.code === 'Space' || event.key === ' ';
			var isEscape = event.key === 'Escape';
			if (!isSpace && !isEscape) return;

			if (isEscape) {
				if (!scrim) return;
				event.stopPropagation();
				event.preventDefault();
				closePanel();
				return;
			}

			if (!scrim && !aimedAtBadge(event)) return;
			event.stopPropagation();
			event.preventDefault();
			if (event.repeat) return;
			if (!scrim) openPanel();
			else if (aimedAtBadge(event)) closePanel();
		},
		true,
	);

	function mount() {
		document.body.appendChild(host);
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
	else mount();
})();
