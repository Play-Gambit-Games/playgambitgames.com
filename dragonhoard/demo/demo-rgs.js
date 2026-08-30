/*
 * demo-rgs.js, a Remote Game Server that runs in the browser.
 *
 * WHAT THIS IS FOR
 * The game talks HTTP to an RGS for every spin. Locally that server is mock-rgs/ (Node); in
 * production it is Stake's. A static host, GitHub Pages, an S3 bucket, a folder on a CDN, can
 * run neither. This file stands in for the server so a fully static build of the SAME game
 * binary is playable with nothing behind it.
 *
 * WHERE IT SITS
 * At the network boundary, and nowhere else. It patches window.fetch before the app bundle
 * loads and answers only requests aimed at the demo's sentinel RGS host; everything else falls
 * through to the real fetch untouched. No game component knows it exists, which is the point:
 * the demo build and the real build are the same game, and pointing the game at a real
 * `rgs_url` bypasses this file entirely.
 *
 * WHAT IT IMPLEMENTS
 * The subset of the contract the frontend actually calls, read off packages/rgs-requests and
 * matched against mock-rgs/server.js rather than guessed:
 *
 *   POST /wallet/authenticate  -> balance, resumable round, bet ladder, jurisdiction flags
 *   POST /wallet/play          -> debit, draw a weighted book, return its events
 *   POST /wallet/end-round     -> credit the pending win
 *   POST /wallet/balance       -> balance
 *   POST /bet/event            -> acknowledgement (the frontend fires these per book event)
 *   GET  /bet/replay/...       -> a specific book, no session involved
 *
 * ...including the error shape `{ error: { code, message } }`, because
 * utils-xstate/createPrimaryMachines and components-shared/Authenticate both branch on
 * `data.error` and surface it through the error modal. Insufficient balance really does come
 * back as ERR_IPB here.
 *
 * MONEY
 * There is none. The balance is a play-money integer in localStorage, it can be reset from the
 * demo badge, and no code path in this file touches a payment system, a purchase, or a real
 * account. Amounts use the API's 6-decimal minor units (1_000_000 = 1.00) because that is what
 * the contract and constants-shared/bet.ts API_AMOUNT_MULTIPLIER use.
 *
 * OUTCOMES
 * Drawn from the bundled sample built by demo/scripts/sample-books.mjs, a stratified subset of
 * the real published library that preserves the library's RTP and hit rate exactly. It is still
 * a subset: see demo-badge.js for what that honestly does and does not give a player.
 */

(function () {
	'use strict';

	var CONFIG = window.__DEMO_CONFIG__ || {};
	var GAME_ID = CONFIG.gameId || 'dragonhoard';

	// The modes this demo actually bundles, straight from the sampler's manifest. Requests for
	// anything else are rejected with ERR_VAL before a file is fetched. Otherwise a typo'd mode
	// turns into a 404 in the network panel and an ERR_GEN in the console, when the honest answer
	// is that the mode does not exist. mock-rgs/server.js rejects unknown modes the same way.
	var MODES = CONFIG.modes || ['base'];

	// Sentinel host. The game builds its request URLs as `https://<rgs_url><path>` (see
	// packages/rgs-fetcher), so the demo hands it a hostname that exists only here. Nothing is
	// ever resolved: the fetch patch below answers before the network is reached. It is a .invalid
	// name on purpose: that TLD is reserved by RFC 2606 and can never be registered, so even a
	// catastrophic failure of the patch cannot leak a request to a third party.
	var RGS_HOST = 'demo-rgs.invalid';

	// Where the sampled book files live, resolved against THIS script's own URL rather than the
	// document's. That is what makes the demo work from a subdirectory: `/dragonhoard/demo/...`
	// and `/demo/...` both fall out of the same expression with no base path configured anywhere.
	var SCRIPT_URL = (document.currentScript && document.currentScript.src) || window.location.href;
	var DATA_BASE = new URL('data/', SCRIPT_URL).href;

	// Cache key for the sample files. See the long note in demo/scripts/build-demo.mjs: these
	// files ship under stable names and are fetched with force-cache, so without this a
	// republish leaves returning visitors mixing an old index with new blocks.
	//
	// Note which file actually carries the price, because it is easy to get wrong: the debit at
	// handlePlay reads `library.header.cost`, and `header` is the per-mode INDEX
	// (books-<mode>.index.json.gz), not sample-manifest.json. The manifest is descriptive. So a
	// stale index is not merely a corrupt library, it is a wrong PRICE, and any check that a
	// republish landed has to look at the indexes rather than the manifest. The harness
	// detects that and refuses, which reaches the player as "the game server is not
	// responding" on their first spin. Empty when a demo predates this, which is the old
	// behaviour and no worse than it was.
	var DATA_VERSION = CONFIG.dataVersion ? '?v=' + encodeURIComponent(CONFIG.dataVersion) : '';

	// Play-money session profile. Mirrors mock-rgs/server.js's USD profile so the demo opens on
	// the same ladder a local dev session does.
	var STARTING_BALANCE = CONFIG.startingBalance || 1000000000; // 1,000.00
	var CURRENCY = CONFIG.currency || 'USD';
	var MIN_BET = 100000; // 0.10
	var MAX_BET = 10000000; // 10.00
	var STEP_BET = 100000; // 0.10
	var DEFAULT_BET_LEVEL = 1000000; // 1.00
	var BET_LEVELS = [100000, 200000, 500000, 1000000, 2000000, 5000000, 10000000];

	// Mirrors constants-shared/bet.ts BOOK_AMOUNT_MULTIPLIER: books say 100 for 1x the bet, the
	// RGS contract says 1.
	var BOOK_AMOUNT_MULTIPLIER = 100;

	var STORAGE_PREFIX = 'demo-rgs/' + GAME_ID + '/v1/';
	var BALANCE_KEY = STORAGE_PREFIX + 'balance';
	var ROUND_KEY = STORAGE_PREFIX + 'round';

	// ------------------------------------------------------------------ launch params
	//
	// state-shared/stateUrl.svelte.ts snapshots window.location.search ONCE at module init and
	// every RGS call reads rgs_url and sessionID from that snapshot. A game opened at a bare URL
	// therefore has no rgs_url at all, and rgsFetcher deliberately throws rather than issue a
	// malformed request. So the launch params a real operator would supply are written into the
	// URL here, synchronously, from a <head> script, which runs before the app bundle is even
	// fetched, let alone before state-shared initialises.
	//
	// Anything already present is left alone: a hand-written ?replay=... or ?social=true URL
	// still means what it means.
	function ensureLaunchParams() {
		var url = new URL(window.location.href);
		var params = url.searchParams;
		var changed = false;

		function setIfAbsent(key, value) {
			if (params.get(key)) return;
			params.set(key, value);
			changed = true;
		}

		setIfAbsent('rgs_url', RGS_HOST);
		setIfAbsent('sessionID', 'demo');
		setIfAbsent('currency', CURRENCY);
		setIfAbsent('lang', 'en');

		if (changed) window.history.replaceState(null, '', url.toString());
	}

	// ------------------------------------------------------------------ play-money wallet

	function readNumber(key, fallback) {
		try {
			var raw = window.localStorage.getItem(key);
			if (raw === null) return fallback;
			var value = Number(raw);
			return Number.isFinite(value) ? value : fallback;
		} catch (error) {
			// Private browsing / storage disabled. The demo still plays, it just forgets.
			return fallback;
		}
	}

	function writeStorage(key, value) {
		try {
			window.localStorage.setItem(key, value);
			return true;
		} catch (error) {
			return false;
		}
	}

	function clearStorage(key) {
		try {
			window.localStorage.removeItem(key);
		} catch (error) {
			/* ignore */
		}
	}

	var wallet = {
		balance: readNumber(BALANCE_KEY, STARTING_BALANCE),
		pendingRound: null,
	};

	function persistBalance() {
		writeStorage(BALANCE_KEY, String(wallet.balance));
	}

	function persistRound() {
		if (!wallet.pendingRound) {
			clearStorage(ROUND_KEY);
			return;
		}
		// A bonus book is tens of thousands of events; a few of them will not fit in the ~5 MB
		// localStorage quota. Losing the round on reload is acceptable, losing the WIN is not, so
		// when the round cannot be persisted it is settled into the balance immediately instead.
		// The player keeps the money; all they lose is the ability to resume mid-animation.
		var stored = writeStorage(ROUND_KEY, JSON.stringify(wallet.pendingRound));
		if (!stored) {
			wallet.balance += wallet.pendingRound.payoutAmount;
			wallet.pendingRound = null;
			persistBalance();
			clearStorage(ROUND_KEY);
		}
	}

	function restoreRound() {
		try {
			var raw = window.localStorage.getItem(ROUND_KEY);
			if (!raw) return null;
			var round = JSON.parse(raw);
			return round && Array.isArray(round.state) ? round : null;
		} catch (error) {
			return null;
		}
	}

	wallet.pendingRound = restoreRound();

	function resetWallet() {
		wallet.balance = STARTING_BALANCE;
		wallet.pendingRound = null;
		persistBalance();
		clearStorage(ROUND_KEY);
	}

	function balanceObject() {
		return { amount: wallet.balance, currency: CURRENCY };
	}

	// Exposed for the demo badge's "reset balance" control and for automated verification.
	window.__DEMO_RGS__ = {
		reset: function reset() {
			resetWallet();
			window.location.reload();
		},
		getBalance: function getBalance() {
			return wallet.balance;
		},
		startingBalance: STARTING_BALANCE,
		currency: CURRENCY,
	};

	// ------------------------------------------------------------------ book library
	//
	// Each mode ships as two files (see demo/scripts/sample-books.mjs):
	//
	//   books-<mode>.index.json.gz   ids, payout multipliers, draw weights, and the gzipped size
	//                                of every block, so a block can be located by arithmetic
	//   books-<mode>.blocks.gz       the books as JSONL, cut into groups of `blockSize` and
	//                                gzipped INDEPENDENTLY, then concatenated
	//
	// Only the COMPRESSED bytes stay resident. A spin inflates one block (a few hundred KB) and
	// JSON.parse-s one line out of it. Decompressing the whole sample up front is what the first
	// version did, and it cost 227 MB of buffers on a phone for data the game reads one book at a
	// time. A tiny LRU keeps the last few blocks so a burst of spins in the same neighbourhood
	// does not re-inflate.

	var libraries = {}; // mode -> Promise<library>
	var BLOCK_CACHE_LIMIT = 4;

	function inflate(bytes) {
		if (typeof DecompressionStream !== 'function') {
			return Promise.reject(
				new Error(
					'This browser has no DecompressionStream. The demo needs it to unpack its outcome ' +
						'sample without shipping a decompression library.',
				),
			);
		}
		var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
		return new Response(stream).arrayBuffer();
	}

	var decoder = new TextDecoder();

	function fetchBinary(url, label) {
		return nativeFetch(url, { cache: 'force-cache' }).then(function (response) {
			if (!response.ok) {
				throw new Error('Could not load ' + label + ' (HTTP ' + response.status + ').');
			}
			return response.arrayBuffer();
		});
	}

	function loadLibrary(mode) {
		if (libraries[mode]) return libraries[mode];

		libraries[mode] = Promise.all([
			fetchBinary(
				DATA_BASE + 'books-' + mode + '.index.json.gz' + DATA_VERSION,
				'the "' + mode + '" outcome index',
			).then(inflate),
			fetchBinary(
				DATA_BASE + 'books-' + mode + '.blocks.gz' + DATA_VERSION,
				'the "' + mode + '" outcome sample',
			),
		])
			.then(function (parts) {
				var header = JSON.parse(decoder.decode(new Uint8Array(parts[0])));
				var blocks = new Uint8Array(parts[1]);

				// Where each block starts in the concatenated file. Derived rather than shipped: the
				// sizes are already in the index and this is one pass over a few hundred numbers.
				var starts = new Uint32Array(header.blockSizesGzip.length + 1);
				var offset = 0;
				for (var b = 0; b < header.blockSizesGzip.length; b++) {
					starts[b] = offset;
					offset += header.blockSizesGzip[b];
				}
				starts[header.blockSizesGzip.length] = offset;
				if (offset !== blocks.length) {
					throw new Error(
						'The "' + mode + '" outcome sample is ' + blocks.length + ' bytes but its index ' +
							'describes ' + offset + '. The two files are from different builds.',
					);
				}

				var cumulative = new Float64Array(header.count);
				var running = 0;
				for (var i = 0; i < header.count; i++) {
					running += header.weights[i];
					cumulative[i] = running;
				}

				return {
					header: header,
					blocks: blocks,
					starts: starts,
					cumulative: cumulative,
					total: running,
					cache: [], // [{ index, lines }], most recent last
				};
			})
			.catch(function (error) {
				// Do not cache a failed load: a reload, or the next spin, should be able to retry.
				delete libraries[mode];
				throw error;
			});

		return libraries[mode];
	}

	function blockLines(library, blockIndex) {
		for (var c = 0; c < library.cache.length; c++) {
			if (library.cache[c].index === blockIndex) return Promise.resolve(library.cache[c].lines);
		}

		var slice = library.blocks.subarray(library.starts[blockIndex], library.starts[blockIndex + 1]);
		return inflate(slice).then(function (buffer) {
			var text = decoder.decode(new Uint8Array(buffer));
			// The sampler terminates every block with a newline, so the trailing split is empty.
			var lines = text.split('\n');
			if (lines[lines.length - 1] === '') lines.pop();

			library.cache.push({ index: blockIndex, lines: lines });
			if (library.cache.length > BLOCK_CACHE_LIMIT) library.cache.shift();
			return lines;
		});
	}

	function bookAt(library, index) {
		var blockIndex = Math.floor(index / library.header.blockSize);
		return blockLines(library, blockIndex).then(function (lines) {
			var parsed = JSON.parse(lines[index % library.header.blockSize]);
			return {
				id: library.header.ids[index],
				payoutMultiplier: library.header.payoutMultipliers[index],
				events: parsed.events,
			};
		});
	}

	function drawBook(library) {
		var target = Math.random() * library.total;
		var lo = 0;
		var hi = library.header.count - 1;
		while (lo < hi) {
			var mid = (lo + hi) >>> 1;
			if (library.cumulative[mid] > target) hi = mid;
			else lo = mid + 1;
		}
		return bookAt(library, lo);
	}

	function findBookById(library, id) {
		var ids = library.header.ids;
		// ids are written in ascending order by the sampler.
		var lo = 0;
		var hi = ids.length - 1;
		while (lo <= hi) {
			var mid = (lo + hi) >>> 1;
			if (ids[mid] === id) return bookAt(library, mid);
			if (ids[mid] < id) lo = mid + 1;
			else hi = mid - 1;
		}
		return Promise.resolve(null);
	}

	// ------------------------------------------------------------------ responses

	function jsonResponse(status, body) {
		return new Response(JSON.stringify(body), {
			status: status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// The frontend never reads the HTTP status, rgsFetcher only logs a non-200 and hands the body
	// on, so the `error` object is what actually drives behaviour. Shape and codes match
	// mock-rgs/server.js, which in turn matches the documented RGS contract.
	function errorResponse(status, code, message) {
		return jsonResponse(status, { error: { code: code, message: message } });
	}

	function normalizeMode(mode) {
		// The frontend sends its bet-mode key, which is uppercase ('BASE' / 'BONUS'); index.json
		// and the sampled files use lowercase. Both spellings appear in the RGS docs.
		return String(mode || '').toLowerCase();
	}

	function isKnownMode(mode) {
		return MODES.indexOf(mode) !== -1;
	}

	// ------------------------------------------------------------------ route handlers

	function handleAuthenticate(body) {
		if (!body.sessionID) return errorResponse(400, 'ERR_VAL', 'sessionID is required');

		var round = wallet.pendingRound
			? {
					amount: wallet.pendingRound.betAmount,
					payoutMultiplier: wallet.pendingRound.payoutMultiplier,
					active: true,
					state: wallet.pendingRound.state,
					mode: wallet.pendingRound.mode,
					event: null,
				}
			: null;

		return jsonResponse(200, {
			balance: balanceObject(),
			round: round,
			config: {
				gameID: GAME_ID,
				minBet: MIN_BET,
				maxBet: MAX_BET,
				stepBet: STEP_BET,
				defaultBetLevel: DEFAULT_BET_LEVEL,
				betLevels: BET_LEVELS,
				betModes: {},
				// Everything permitted. A demo has no jurisdiction to satisfy, and switching any of
				// these on would hide part of the game from someone evaluating it. The one thing
				// that is NOT play-acted is the money, which is why socialCasino is left false:
				// the demo does not claim to be a licensed social casino, it claims to be a demo,
				// and says so on the badge.
				jurisdiction: {
					socialCasino: false,
					disabledFullscreen: false,
					disabledTurbo: false,
					disabledSuperTurbo: false,
					disabledAutoplay: false,
					disabledSlamstop: false,
					disabledSpacebar: false,
					disabledBuyFeature: false,
					displayNetPosition: false,
					displayRTP: false,
					displaySessionTimer: false,
					minimumRoundDuration: 0,
				},
			},
			meta: null,
		});
	}

	function handleBalance(body) {
		if (!body.sessionID) return errorResponse(400, 'ERR_VAL', 'sessionID is required');
		return jsonResponse(200, { balance: balanceObject() });
	}

	function handlePlay(body) {
		if (!body.sessionID) return Promise.resolve(errorResponse(400, 'ERR_VAL', 'sessionID is required'));

		var amount = body.amount;
		if (typeof amount !== 'number' || amount < MIN_BET || amount > MAX_BET) {
			return Promise.resolve(
				errorResponse(400, 'ERR_VAL', 'amount must be between ' + MIN_BET + ' and ' + MAX_BET),
			);
		}

		var mode = normalizeMode(body.mode);
		if (!isKnownMode(mode)) {
			return Promise.resolve(
				errorResponse(400, 'ERR_VAL', 'Unknown mode "' + body.mode + '". Known modes: ' + MODES.join(', ')),
			);
		}

		return loadLibrary(mode)
			.then(function (library) {
				var costMultiplier = library.header.cost;
				var cost = Math.round(amount * costMultiplier);
				if (cost > wallet.balance) {
					return errorResponse(400, 'ERR_IPB', 'Insufficient player balance');
				}

				// The draw happens before the debit, and the debit only lands once the book has
				// actually been read: a failure to inflate the block must not leave the player
				// charged for a round the demo cannot deliver.
				return drawBook(library).then(function (book) {
					wallet.balance -= cost;

					var payoutMultiplier = book.payoutMultiplier / BOOK_AMOUNT_MULTIPLIER;
					var payoutAmount = Math.round(amount * payoutMultiplier);

					if (payoutMultiplier > 0) {
						// The round stays open until /wallet/end-round credits it, exactly as the real
						// contract works, the win lands when the animation finishes, not before.
						wallet.pendingRound = {
							mode: mode,
							betAmount: amount,
							payoutAmount: payoutAmount,
							payoutMultiplier: payoutMultiplier,
							costMultiplier: costMultiplier,
							state: book.events,
						};
					} else {
						wallet.pendingRound = null;
					}
					persistBalance();
					persistRound();

					return jsonResponse(200, {
						balance: balanceObject(),
						round: {
							payoutMultiplier: payoutMultiplier,
							costMultiplier: costMultiplier,
							state: book.events,
						},
					});
				});
			})
			.catch(function (error) {
				console.error('[demo-rgs] play failed', error);
				return errorResponse(500, 'ERR_GEN', String((error && error.message) || error));
			});
	}

	function handleEndRound(body) {
		if (!body.sessionID) return errorResponse(400, 'ERR_VAL', 'sessionID is required');

		if (wallet.pendingRound) {
			wallet.balance += wallet.pendingRound.payoutAmount;
			wallet.pendingRound = null;
			persistBalance();
			persistRound();
		}

		return jsonResponse(200, { balance: balanceObject() });
	}

	function handleBetEvent(body) {
		if (!body.sessionID) return errorResponse(400, 'ERR_VAL', 'sessionID is required');
		// The real RGS records progress so an interrupted round can be resumed from the right
		// event. The demo persists the whole round instead, so there is nothing to record here;
		// acknowledge in the documented shape and move on.
		return jsonResponse(200, { event: body.event === undefined ? null : body.event });
	}

	function handleReplay(pathname) {
		// GET /bet/replay/{game}/{version}/{mode}/{event}
		var parts = pathname.split('/').filter(Boolean);
		var game = parts[2];
		var version = parts[3];
		var rawMode = parts[4];
		var event = parts[5];

		if (!game || !version || !rawMode || event === undefined) {
			return Promise.resolve(
				errorResponse(400, 'ERR_VAL', 'Expected /bet/replay/{game}/{version}/{mode}/{event}'),
			);
		}
		if (game !== GAME_ID) {
			return Promise.resolve(errorResponse(404, 'NOT_FOUND', 'Unknown game "' + game + '"'));
		}

		var mode = normalizeMode(rawMode);
		if (!isKnownMode(mode)) {
			return Promise.resolve(errorResponse(400, 'ERR_VAL', 'Unknown mode "' + rawMode + '"'));
		}

		return loadLibrary(mode)
			.then(function (library) {
				// Only the sampled books exist here, so most real round ids cannot be replayed. That
				// is a property of shipping a subset, not a bug, and it is reported as a plain 404
				// rather than by substituting a different round, a replay that silently shows the
				// wrong round would be worse than one that says it has nothing.
				return findBookById(library, Number(event)).then(function (book) {
					if (!book) {
						return errorResponse(
							404,
							'NOT_FOUND',
							'Round ' + event + ' is not part of this demo’s bundled sample.',
						);
					}
					return jsonResponse(200, {
						betID: Number(event),
						mode: mode,
						payoutMultiplier: book.payoutMultiplier / BOOK_AMOUNT_MULTIPLIER,
						costMultiplier: library.header.cost,
						state: book.events,
					});
				});
			})
			.catch(function (error) {
				console.error('[demo-rgs] replay failed', error);
				return errorResponse(500, 'ERR_GEN', String((error && error.message) || error));
			});
	}

	// ------------------------------------------------------------------ fetch patch

	var nativeFetch = window.fetch.bind(window);

	function requestUrlOf(input) {
		if (typeof input === 'string') return input;
		if (input instanceof URL) return input.href;
		if (input && typeof input.url === 'string') return input.url;
		return '';
	}

	function parseBody(init, input) {
		var raw = init && init.body !== undefined ? init.body : input && input.body;
		if (typeof raw !== 'string') return Promise.resolve({});
		try {
			return Promise.resolve(JSON.parse(raw));
		} catch (error) {
			return Promise.resolve({});
		}
	}

	function route(url, init, input) {
		var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();

		if (method === 'GET' && url.pathname.indexOf('/bet/replay/') === 0) {
			return handleReplay(url.pathname);
		}

		if (method !== 'POST') {
			return Promise.resolve(
				errorResponse(404, 'NOT_FOUND', 'No route for ' + method + ' ' + url.pathname),
			);
		}

		return parseBody(init, input).then(function (body) {
			switch (url.pathname) {
				case '/wallet/authenticate':
					return handleAuthenticate(body);
				case '/wallet/balance':
					return handleBalance(body);
				case '/wallet/play':
					return handlePlay(body);
				case '/wallet/end-round':
					return handleEndRound(body);
				case '/bet/event':
					return handleBetEvent(body);
				default:
					return errorResponse(404, 'NOT_FOUND', 'No route for POST ' + url.pathname);
			}
		});
	}

	window.fetch = function demoFetch(input, init) {
		var href = requestUrlOf(input);
		var url;
		try {
			url = new URL(href, window.location.href);
		} catch (error) {
			return nativeFetch(input, init);
		}

		// Everything that is not addressed at the demo's sentinel RGS host goes to the real fetch
		// unchanged, the game's own asset and font requests must not pass through here.
		if (url.hostname !== RGS_HOST) return nativeFetch(input, init);

		return Promise.resolve(route(url, init, input)).catch(function (error) {
			console.error('[demo-rgs] request failed', error);
			return errorResponse(500, 'ERR_GEN', String((error && error.message) || error));
		});
	};

	ensureLaunchParams();

	// Warm the base library while the game is still downloading its art, so the first spin does
	// not pay for the decompression. A failure here is not fatal: loadLibrary drops the cached
	// rejection, so the first /wallet/play simply retries.
	loadLibrary('base').catch(function (error) {
		console.warn('[demo-rgs] preload of the base sample failed; will retry on first spin', error);
	});
})();
