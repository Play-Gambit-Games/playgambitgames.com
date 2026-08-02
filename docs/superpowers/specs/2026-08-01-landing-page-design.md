# Play Gambit Games Landing Page: Design Spec

Date: 2026-08-01
Status: Approved by user, pending spec review

## Purpose

A single-page marketing site for the studio Play Gambit Games at `playgambitgames.com`,
showcasing its two slot titles and giving the studio a public web presence with a
custom domain and HTTPS.

## Non-goals

- No CMS, no JS framework, no backend, no analytics/forms in this iteration (the
  architecture doesn't block adding these later, see Architecture).
- No fabricated statistics or invented player/revenue numbers. The "About" section
  uses qualitative copy only; no numeric claims should be added until they're real.
- No slot-machine imagery (reels, spinning wheels, fruit symbols) anywhere on the page,
  per explicit direction: the visual language is cyberpunk/futuristic, not casino kitsch.

## Architecture

Plain static HTML/CSS/JS, no build step, no framework. Chosen because:
- The site is a single page with no interactivity beyond scroll/hover effects.
- GitHub Pages serves static files directly from `main` with zero CI/build config.
- Any section (or the whole page) can be wholesale-replaced later without fighting
  generated output or build tooling: this was an explicit requirement.

Repo layout:

```
playgambitgames.com/
├── index.html
├── 404.html
├── CNAME                  → "playgambitgames.com"
├── assets/
│   ├── css/style.css
│   ├── js/main.js         (hero background animation, scroll-reveal, glitch-in text)
│   └── img/               (favicon, social share/og image)
└── README.md
```

Each content section in `index.html` is wrapped in a clearly labeled HTML comment block
(e.g. `<!-- SECTION: Hero -->`, `<!-- SECTION: Games -->`) so any one section, or the
whole file, can be swapped out independently later.

## Visual design

Quality bar: this should read as a portfolio-grade, Dribbble-quality landing page, not
a template. That means deliberate type pairing and scale, considered spacing rhythm,
layered depth (glow, blur, subtle parallax) instead of flat color blocks, and motion
that feels designed rather than decorative. The implementation phase should pull
reference from current Dribbble cyberpunk/sci-fi landing page work before writing CSS.

Cyberpunk/futuristic theme, applied consistently across the whole page (not just the
hero), so there's no jarring transition between sections:

- Near-black background throughout.
- Neon cyan + magenta accent palette used for headings, CTAs, badges, and dividers.
- Hero: animated perspective grid (Tron-style horizon lines, CSS/canvas-driven, no
  images) drifting slowly toward the viewer. "Play Gambit Games" wordmark enters with a
  subtle glitch/flicker-in animation; tagline fades/types in beneath it.
- Game badges pick up the same accent palette: LIVE badge in neon cyan/green,
  COMING SOON badge in neon magenta/amber.

## Content sections

1. **Hero**: wordmark, tagline, animated grid background (see Visual design).
2. **Games showcase**: two cards:
   - *Sweet or a Wild*: LIVE badge, "Play Now" CTA linking to
     `https://elite-sweet-bonanza.rork.app` (`target="_blank" rel="noopener"`).
   - *Dragon Hoard*: COMING SOON badge, teaser copy, no outbound link.
3. **About the studio**: qualitative copy only (e.g. "Built for Stake Engine. Two
   titles, one growing lineup."). No numeric claims.
4. **Footer**: copyright, placeholder contact/social links.

## Deployment & SSL

1. Push static files to `main` on `Play-Gambit-Games/playgambitgames.com` (this repo).
2. GitHub repo Settings → Pages → source = `main` / root.
3. `CNAME` file in the repo root containing `playgambitgames.com`.
4. DNS at the domain registrar:
   - 4 `A` records for the apex domain, pointing at GitHub Pages' IPs
     (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153).
   - `CNAME` record for `www` → `play-gambit-games.github.io`.
5. Once DNS resolves, GitHub auto-issues a Let's Encrypt certificate. Enable
   "Enforce HTTPS" in Pages settings once the cert is available.

## Error handling / edge cases

- Custom `404.html` matching the site's visual theme.
- Mobile responsiveness (single-column stacking below ~768px).
- External game link uses `rel="noopener"` and is clearly marked as leaving the site.

## Testing

Manual verification only (no test framework for a static marketing page):
- Visual check in a browser at desktop and mobile widths.
- Confirm both game cards render correctly (live link works, coming-soon has no dead link).
- After DNS propagates, confirm HTTPS padlock and that `http://` redirects to `https://`.
