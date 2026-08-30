/**
 * Read a numeric constant out of a game's config source.
 *
 * A constant is not always a literal. The game may define one as an alias of another:
 *
 *   export const BONUS_BUY_MAX_WIN_MULTIPLIER = MAX_WIN_MULTIPLIER;
 *
 * A digits-only matcher reads that as absent, and "absent" is the loudest failure this gate has:
 * it stops the site refreshing and says the constant is gone, when the constant is present and its
 * VALUE has changed. That is the wrong diagnosis pointed at the wrong repo, and it happened on
 * 2026-08-30 when the bonus-buy cap was raised from 10,667x to the full 12,777x. The real defect
 * was a stale disclosure on the site, which is exactly what this gate exists to catch, and the
 * misreport cost a debugging session in the game repo before anyone looked at the manifest.
 *
 * So follow one alias to the next until a literal turns up. A genuinely missing constant still
 * returns null and still fails the run, which is the behaviour the gate depends on.
 */
export function readNumericConstant(source, name) {
	const seen = new Set();
	let current = name;

	while (!seen.has(current)) {
		seen.add(current);
		// \b matters: without it, MAX_WIN_MULTIPLIER matches inside BONUS_BUY_MAX_WIN_MULTIPLIER.
		const match = source.match(new RegExp(`\\b${current}\\s*=\\s*([A-Za-z_$][\\w$]*|[\\d.]+)`));
		if (!match) return null;

		const value = match[1];
		if (/^[\d.]+$/.test(value)) return value;
		current = value;
	}

	// A cycle (A = B, B = A). Not a number, so treat it as unreadable rather than looping forever.
	return null;
}
