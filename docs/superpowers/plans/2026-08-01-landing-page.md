# Play Gambit Games Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single-page, portfolio-grade marketing site for playgambitgames.com, live on GitHub Pages with a custom domain and HTTPS.

**Architecture:** Plain static HTML/CSS/JS with no build step. One `index.html` with clearly labeled section blocks, one `style.css` for all styling (design tokens plus components), one small `main.js` for scroll-reveal and the footer year. GitHub Pages serves the repo root directly.

**Tech Stack:** HTML5, CSS3 (custom properties, `IntersectionObserver`-driven reveal), vanilla JS (no framework), Google Fonts (Orbitron + Rajdhani), GitHub Pages hosting.

## Global Constraints

- No em dashes anywhere, in any file (code, copy, commit messages, PR description). Rewrite with a comma, period, colon, or parentheses.
- No fabricated statistics or invented player/revenue numbers anywhere on the page.
- No slot-machine imagery (reels, spinning wheels, fruit symbols) anywhere on the page. Visual language is cyberpunk/futuristic only.
- Visual execution must read as portfolio-grade (Dribbble-quality), not templated: deliberate type pairing, considered spacing rhythm, layered depth (glow/blur), and motion that feels designed.
- Every section in `index.html` lives inside a labeled `<!-- SECTION: X -->` comment block so it can be replaced independently later.
- Respect `prefers-reduced-motion` for every animation.
- Never commit directly to `main`; work happens on `feat/initial-landing-page` (already checked out), merge only via PR.
- Invoke the `/gate-review` skill before the PR merge to `main` (Task 8).

---

## File Structure

```
playgambitgames.com/
├── index.html
├── 404.html
├── CNAME
├── README.md
├── assets/
│   ├── css/style.css
│   ├── js/main.js
│   └── img/favicon.svg
```

- `index.html`: all page markup, sectioned by HTML comments.
- `assets/css/style.css`: design tokens (custom properties), reset, and every component's styling, in the order they appear on the page.
- `assets/js/main.js`: footer year + scroll-reveal only, no framework, no build step.
- `assets/img/favicon.svg`: hand-authored inline SVG mark, no binary asset pipeline needed.
- `404.html`: standalone page reusing the hero's visual language.

---

### Task 1: Repo scaffold, design tokens, and base HTML shell

**Files:**
- Create: `CNAME`
- Create: `README.md`
- Create: `assets/img/favicon.svg`
- Create: `assets/css/style.css`
- Create: `index.html`

**Interfaces:**
- Produces: CSS custom properties consumed by every later task: `--color-bg`, `--color-bg-alt`, `--color-cyan`, `--color-magenta`, `--color-green`, `--color-text`, `--color-text-muted`, `--font-display`, `--font-body`, `--space-1` through `--space-6`, `--radius-md`, `--transition-base`.
- Produces: `index.html` `<body>` with four empty, labeled section anchors that Tasks 2 to 4 fill in: `<!-- SECTION: Hero -->`, `<!-- SECTION: Games -->`, `<!-- SECTION: About -->`, `<!-- SECTION: Footer -->`.

- [ ] **Step 1: Create `CNAME`**

```
playgambitgames.com
```

- [ ] **Step 2: Create `README.md`**

```markdown
# playgambitgames.com

Marketing landing page for Play Gambit Games, a slot studio building titles
for the Stake Engine.

Static HTML/CSS/JS, no build step, deployed via GitHub Pages.

## Local preview

Open `index.html` directly in a browser, or serve it locally:

    python3 -m http.server 8080

Then visit http://localhost:8080.

## Deployment

Pushes to `main` deploy automatically via GitHub Pages. The custom domain and
HTTPS are configured in repo Settings, Pages.
```

- [ ] **Step 3: Create `assets/img/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f0ff"/>
      <stop offset="100%" stop-color="#ff2fd0"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="#05060b"/>
  <path d="M32 8 L54 32 L32 56 L10 32 Z" fill="none" stroke="url(#g)" stroke-width="4"/>
  <circle cx="32" cy="32" r="8" fill="url(#g)"/>
</svg>
```

- [ ] **Step 4: Create `assets/css/style.css` with tokens and reset**

```css
:root {
  --color-bg: #05060b;
  --color-bg-alt: #0a0e1a;
  --color-cyan: #00f0ff;
  --color-magenta: #ff2fd0;
  --color-green: #39ff9d;
  --color-text: #eef1fb;
  --color-text-muted: #8b93b8;
  --font-display: 'Orbitron', sans-serif;
  --font-body: 'Rajdhani', sans-serif;
  --space-1: 0.5rem;
  --space-2: 1rem;
  --space-3: 1.5rem;
  --space-4: 2.5rem;
  --space-5: 4rem;
  --space-6: 6rem;
  --radius-md: 12px;
  --transition-base: 0.3s ease;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 1.125rem;
  line-height: 1.6;
  overflow-x: hidden;
}

img {
  max-width: 100%;
  display: block;
}

a {
  color: inherit;
  text-decoration: none;
}

.section-title {
  font-family: var(--font-display);
  text-align: center;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  letter-spacing: 0.06em;
  margin-bottom: var(--space-5);
  color: var(--color-text);
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
```

- [ ] **Step 5: Create `index.html` shell**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Play Gambit Games</title>
  <meta name="description" content="Play Gambit Games is a slot studio building Sweet Bomb or a Wild and Dragon Hoard for the Stake Engine.">
  <meta property="og:title" content="Play Gambit Games">
  <meta property="og:description" content="A slot studio building Sweet Bomb or a Wild and Dragon Hoard for the Stake Engine.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://playgambitgames.com">
  <link rel="icon" type="image/svg+xml" href="assets/img/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <!-- SECTION: Hero -->
  <!-- SECTION: Games -->
  <!-- SECTION: About -->
  <!-- SECTION: Footer -->
  <script src="assets/js/main.js" defer></script>
</body>
</html>
```

- [ ] **Step 6: Verify the shell loads with no console errors**

Run: `open index.html` (or serve with `python3 -m http.server 8080` and navigate to it)
Expected: blank dark page, page title "Play Gambit Games" in the browser tab, no console errors, favicon visible in the tab.

- [ ] **Step 7: Commit**

```bash
git add CNAME README.md assets/img/favicon.svg assets/css/style.css index.html
git commit -m "Add repo scaffold, design tokens, and base HTML shell"
```

---

### Task 2: Hero section

**Files:**
- Modify: `index.html` (replace `<!-- SECTION: Hero -->` with the hero markup)
- Modify: `assets/css/style.css` (append hero styles)

**Interfaces:**
- Consumes: tokens from Task 1 (`--color-*`, `--font-*`, `--space-*`, `--transition-base`).
- Produces: `.reveal` class convention (an element starts hidden and slides in) that Tasks 3 and 4 also use; the actual reveal behavior (`IntersectionObserver` toggling `.is-visible`) is implemented in Task 5, so elements marked `.reveal` before Task 5 runs will stay invisible until then, which is expected mid-plan state, not a bug.

- [ ] **Step 1: Replace the hero placeholder in `index.html`**

```html
<!-- SECTION: Hero -->
<header class="hero">
  <div class="hero__grid" aria-hidden="true"></div>
  <div class="hero__glow" aria-hidden="true"></div>
  <div class="hero__content">
    <p class="hero__eyebrow">Slot Studio</p>
    <h1 class="hero__title glitch" data-text="PLAY GAMBIT GAMES">PLAY GAMBIT GAMES</h1>
    <p class="hero__tagline">Engineering the next generation of Stake Engine slots.</p>
    <a href="#games" class="hero__cta">Enter the Lineup</a>
  </div>
</header>
```

- [ ] **Step 2: Append hero styles to `assets/css/style.css`**

```css
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: radial-gradient(ellipse at center, var(--color-bg-alt) 0%, var(--color-bg) 70%);
}

.hero__grid {
  position: absolute;
  inset: -50% -50% 0 -50%;
  background-image:
    linear-gradient(var(--color-cyan) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-cyan) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.15;
  transform: perspective(500px) rotateX(60deg);
  transform-origin: bottom;
  animation: grid-move 6s linear infinite;
  mask-image: linear-gradient(to top, black 0%, transparent 70%);
}

@keyframes grid-move {
  from { background-position: 0 0; }
  to { background-position: 0 60px; }
}

.hero__glow {
  position: absolute;
  top: 20%;
  left: 50%;
  width: 60vw;
  height: 60vw;
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(255, 47, 208, 0.25) 0%, transparent 60%);
  filter: blur(40px);
  pointer-events: none;
}

.hero__content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 0 var(--space-3);
}

.hero__eyebrow {
  font-family: var(--font-body);
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--color-cyan);
  font-size: 0.85rem;
  margin-bottom: var(--space-2);
}

.hero__title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 8vw, 5.5rem);
  font-weight: 900;
  letter-spacing: 0.05em;
  color: var(--color-text);
  position: relative;
  text-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
}

.hero__title.glitch::before,
.hero__title.glitch::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  opacity: 0;
}

.hero__title.glitch::before {
  color: var(--color-cyan);
  animation: glitch-shift 3.5s infinite;
  left: 2px;
}

.hero__title.glitch::after {
  color: var(--color-magenta);
  animation: glitch-shift 3.5s infinite reverse;
  left: -2px;
}

@keyframes glitch-shift {
  0%, 92%, 100% {
    opacity: 0;
    clip-path: inset(0 0 0 0);
    transform: translate(0, 0);
  }
  93% {
    opacity: 1;
    clip-path: inset(10% 0 60% 0);
    transform: translate(-3px, 2px);
  }
  95% {
    opacity: 1;
    clip-path: inset(60% 0 10% 0);
    transform: translate(3px, -1px);
  }
  97% {
    opacity: 0;
    clip-path: inset(30% 0 40% 0);
    transform: translate(-2px, 0);
  }
}

.hero__tagline {
  margin-top: var(--space-2);
  color: var(--color-text-muted);
  font-size: 1.25rem;
  max-width: 32rem;
  margin-left: auto;
  margin-right: auto;
}

.hero__cta {
  display: inline-block;
  margin-top: var(--space-4);
  padding: 0.9rem 2.2rem;
  border: 1px solid var(--color-cyan);
  border-radius: 999px;
  color: var(--color-cyan);
  font-family: var(--font-body);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: background var(--transition-base), color var(--transition-base), box-shadow var(--transition-base);
}

.hero__cta:hover,
.hero__cta:focus-visible {
  background: var(--color-cyan);
  color: var(--color-bg);
  box-shadow: 0 0 30px rgba(0, 240, 255, 0.6);
}

@media (prefers-reduced-motion: reduce) {
  .hero__grid,
  .hero__title.glitch::before,
  .hero__title.glitch::after {
    animation: none;
  }
}
```

- [ ] **Step 3: Verify in browser**

Run: open `index.html`
Expected: full-viewport dark hero with an animated cyan grid receding toward the horizon, a glitching "PLAY GAMBIT GAMES" title, tagline, and a pill-shaped "Enter the Lineup" button that glows cyan on hover.

- [ ] **Step 4: Commit**

```bash
git add index.html assets/css/style.css
git commit -m "Add animated cyberpunk hero section"
```

---

### Task 3: Games showcase section

**Files:**
- Modify: `index.html` (replace `<!-- SECTION: Games -->`)
- Modify: `assets/css/style.css` (append games styles)

**Interfaces:**
- Consumes: `.section-title` (Task 1), `.reveal` convention (Task 2 notes), design tokens.
- Produces: `.game-card`, `.game-card__badge--live`, `.game-card__badge--soon` classes, referenced by nothing later but documented for consistency if more games are added.

- [ ] **Step 1: Replace the games placeholder in `index.html`**

```html
<!-- SECTION: Games -->
<section id="games" class="games">
  <h2 class="section-title">The Lineup</h2>
  <div class="games__grid">
    <article class="game-card game-card--live reveal">
      <span class="game-card__badge game-card__badge--live">Live</span>
      <h3 class="game-card__title">Sweet Bomb or a Wild</h3>
      <p class="game-card__copy">Live now on the Stake Engine.</p>
      <a class="game-card__cta" href="https://elite-sweet-bonanza.rork.app" target="_blank" rel="noopener">
        Play Now
        <span aria-hidden="true">&#8594;</span>
      </a>
    </article>
    <article class="game-card game-card--soon reveal">
      <span class="game-card__badge game-card__badge--soon">Coming Soon</span>
      <h3 class="game-card__title">Dragon Hoard</h3>
      <p class="game-card__copy">In active development, coming soon to the Stake Engine.</p>
    </article>
  </div>
</section>
```

- [ ] **Step 2: Append games styles to `assets/css/style.css`**

```css
.games {
  position: relative;
  padding: var(--space-6) var(--space-3);
  background: var(--color-bg);
}

.games__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-4);
  max-width: 72rem;
  margin: 0 auto;
}

.game-card {
  position: relative;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
  transition: transform var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
}

.game-card--live:hover {
  transform: translateY(-6px);
  border-color: var(--color-cyan);
  box-shadow: 0 0 40px rgba(0, 240, 255, 0.25);
}

.game-card--soon:hover {
  transform: translateY(-6px);
  border-color: var(--color-magenta);
  box-shadow: 0 0 40px rgba(255, 47, 208, 0.2);
}

.game-card__badge {
  display: inline-block;
  padding: 0.3rem 0.9rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: var(--space-2);
}

.game-card__badge--live {
  color: var(--color-bg);
  background: var(--color-green);
}

.game-card__badge--soon {
  color: var(--color-bg);
  background: var(--color-magenta);
}

.game-card__title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  margin-bottom: var(--space-2);
}

.game-card__copy {
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}

.game-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-cyan);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.95rem;
}

.game-card__cta span {
  transition: transform var(--transition-base);
}

.game-card__cta:hover span {
  transform: translateX(4px);
}
```

- [ ] **Step 3: Verify in browser**

Run: open `index.html`, scroll to the games section
Expected: two cards side by side on desktop, "Sweet Bomb or a Wild" with a green LIVE badge and working "Play Now" link (opens `https://elite-sweet-bonanza.rork.app` in a new tab), "Dragon Hoard" with a magenta COMING SOON badge and no link. Both cards lift and glow on hover.

- [ ] **Step 4: Commit**

```bash
git add index.html assets/css/style.css
git commit -m "Add games showcase section with live and coming-soon cards"
```

---

### Task 4: About and footer sections

**Files:**
- Modify: `index.html` (replace `<!-- SECTION: About -->` and `<!-- SECTION: Footer -->`)
- Modify: `assets/css/style.css` (append about/footer styles)

**Interfaces:**
- Consumes: `.section-title`, `.reveal`, design tokens.
- Produces: `#year` element id, consumed by Task 5's `main.js`.

- [ ] **Step 1: Replace the about and footer placeholders in `index.html`**

```html
<!-- SECTION: About -->
<section class="about reveal">
  <div class="about__inner">
    <h2 class="section-title">Built for Stake Engine</h2>
    <p class="about__copy">
      Play Gambit Games is a slot studio focused on tight math, clean frontend
      engineering, and Stake Engine compliance from day one. Two titles, one
      growing lineup.
    </p>
  </div>
</section>

<!-- SECTION: Footer -->
<footer class="footer">
  <p class="footer__copy">&copy; <span id="year"></span> Play Gambit Games</p>
  <div class="footer__links">
    <a href="mailto:hello@playgambitgames.com">Contact</a>
  </div>
</footer>
```

- [ ] **Step 2: Append about/footer styles to `assets/css/style.css`**

```css
.about {
  padding: var(--space-6) var(--space-3);
  text-align: center;
  background: linear-gradient(180deg, var(--color-bg) 0%, var(--color-bg-alt) 100%);
}

.about__inner {
  max-width: 42rem;
  margin: 0 auto;
}

.about__copy {
  color: var(--color-text-muted);
  font-size: 1.15rem;
}

.footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.footer__links a {
  color: var(--color-cyan);
}
```

- [ ] **Step 3: Verify in browser**

Run: open `index.html`, scroll to the bottom
Expected: centered "Built for Stake Engine" section with qualitative copy (no numbers), footer with a blank year (populated by JS in Task 5) and a working `mailto:` contact link.

- [ ] **Step 4: Commit**

```bash
git add index.html assets/css/style.css
git commit -m "Add about and footer sections"
```

---

### Task 5: Scroll-reveal JS and responsive breakpoints

**Files:**
- Create: `assets/js/main.js`
- Modify: `assets/css/style.css` (append `.reveal`/`.is-visible` and responsive rules)

**Interfaces:**
- Consumes: `#year` (Task 4), `.reveal` elements (Tasks 2 to 4).
- Produces: nothing consumed by later tasks; this is the last behavioral piece.

- [ ] **Step 1: Create `assets/js/main.js`**

```javascript
document.getElementById('year').textContent = new Date().getFullYear();

const revealEls = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

revealEls.forEach((el) => observer.observe(el));
```

- [ ] **Step 2: Append reveal and responsive CSS to `assets/css/style.css`**

```css
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 768px) {
  .hero__title {
    font-size: clamp(2rem, 10vw, 3rem);
  }

  .games__grid {
    grid-template-columns: 1fr;
  }

  .footer {
    flex-direction: column;
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    transition: none;
    opacity: 1;
    transform: none;
  }
}
```

- [ ] **Step 3: Verify in browser**

Run: open `index.html`, resize the window to a mobile width (~390px) and scroll the full page
Expected: footer year shows the current year, game cards and about copy fade/slide into view as they enter the viewport, layout stacks to a single column below 768px with no horizontal scrollbar, and reduced-motion (toggle it in browser dev tools) shows all content immediately visible with no animation.

- [ ] **Step 4: Commit**

```bash
git add assets/js/main.js assets/css/style.css
git commit -m "Add scroll-reveal behavior and responsive breakpoints"
```

---

### Task 6: 404 page

**Files:**
- Create: `404.html`

**Interfaces:**
- Consumes: `assets/css/style.css` (`.hero`, `.hero__grid`, `.hero__glow`, `.hero__content`, `.hero__eyebrow`, `.hero__title.glitch`, `.hero__tagline`, `.hero__cta` from Task 2), `assets/img/favicon.svg` (Task 1).

- [ ] **Step 1: Create `404.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404: Signal Lost | Play Gambit Games</title>
  <link rel="icon" type="image/svg+xml" href="assets/img/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <header class="hero" style="min-height: 100vh;">
    <div class="hero__grid" aria-hidden="true"></div>
    <div class="hero__glow" aria-hidden="true"></div>
    <div class="hero__content">
      <p class="hero__eyebrow">Error 404</p>
      <h1 class="hero__title glitch" data-text="SIGNAL LOST">SIGNAL LOST</h1>
      <p class="hero__tagline">This page does not exist.</p>
      <a href="/" class="hero__cta">Return Home</a>
    </div>
  </header>
</body>
</html>
```

- [ ] **Step 2: Verify in browser**

Run: open `404.html`
Expected: same animated grid/glow/glitch treatment as the homepage hero, "SIGNAL LOST" heading, working "Return Home" link back to `/`.

- [ ] **Step 3: Commit**

```bash
git add 404.html
git commit -m "Add themed 404 page"
```

---

### Task 7: Visual QA pass across breakpoints and final compliance check

**Files:**
- No new files. This task only verifies and, if needed, patches issues found in `index.html`, `404.html`, `assets/css/style.css`, `assets/js/main.js`.

**Interfaces:**
- Consumes: the fully assembled site from Tasks 1 to 6.

- [ ] **Step 1: Grep for em dashes across every file**

Run: `grep -rn "—" index.html 404.html assets/ README.md`
Expected: no matches. If any are found, rewrite with a comma, period, colon, or parentheses and re-run until clean.

- [ ] **Step 2: Screenshot the homepage at desktop width**

Use the Playwright browser tools: navigate to the local `index.html` file, resize to 1440x900, take a screenshot.
Expected: hero, games, about, and footer all render with the cyberpunk theme, no layout overflow, no visible console errors.

- [ ] **Step 3: Screenshot the homepage at mobile width**

Resize to 390x844, take a screenshot.
Expected: single-column stacked layout, no horizontal scrollbar, tap targets (CTA buttons) are comfortably sized.

- [ ] **Step 4: Verify the external game link**

Use the Playwright browser tools to inspect the "Play Now" link's `href`, `target`, and `rel` attributes.
Expected: `href="https://elite-sweet-bonanza.rork.app"`, `target="_blank"`, `rel="noopener"`.

- [ ] **Step 5: Verify reduced-motion fallback**

Emulate `prefers-reduced-motion: reduce` (Playwright `browser_evaluate` or browser dev tools) and reload.
Expected: hero grid and glitch animations are disabled, all `.reveal` content is visible immediately with no fade/slide.

- [ ] **Step 6: Commit any fixes found during QA**

```bash
git add -A
git commit -m "Fix issues found during visual QA pass"
```

(Skip this commit if no fixes were needed.)

---

### Post-plan additions (documented after the fact, not re-run through the task loop)

- **Studio and Roadmap sections**: added to `index.html`/`style.css` after Task 7, per user request for more than three content sections. See the spec's Content sections list for what they contain and why (no invented team details, no invented dates/titles).
- **Gate review fixes** (Tech Lead phase, before merge): no-JS fallback for `.reveal` (a `.js` class gate on `<html>` set inline in `<head>`, so content defaults to visible if JS fails), null guards and an `IntersectionObserver` feature check in `main.js`, moved the glitch effect off the `<h1>` pseudo-elements onto a decorative `aria-hidden` span (screen readers were announcing the title three times), `min-height: 100svh` fallback alongside `100vh`, `overflow-wrap` on game card text, a transform-based (not `background-position`-based) grid animation for compositor performance, removed a no-op `backdrop-filter`, root-absolute asset paths everywhere (matching the 404 page's existing convention), an `og:image` (`assets/img/og.png`, generated by screenshotting the hero at 1200x630) plus `twitter:card`, deduplicated `.about`/`.studio` into a shared `.prose-section` class, and an explicit `font-weight` on `.roadmap__label`.

### Task 8: Deploy: PR, gate review, merge, GitHub Pages, DNS, and SSL

**Files:**
- No file changes beyond what Tasks 1 to 7 already produced.

**Interfaces:**
- N/A (deployment and infrastructure task).

- [ ] **Step 1: Push the branch and open a PR**

```bash
git push -u origin feat/initial-landing-page
gh pr create --title "Add playgambitgames.com landing page" --body "Static cyberpunk-themed landing page for the studio, showcasing Sweet Bomb or a Wild (live) and Dragon Hoard (coming soon). No em dashes, no fabricated stats, no slot imagery."
```

- [ ] **Step 2: Invoke the `/gate-review` skill on this PR**

Run the `gate-review` skill before merging, per the standing project rule. Do not proceed to Step 3 until it passes.

- [ ] **Step 3: Merge the PR to `main`**

```bash
gh pr merge --merge
```

- [ ] **Step 4: Enable GitHub Pages**

In the repo's Settings, Pages: set source to the `main` branch, root directory. GitHub will detect the `CNAME` file and pre-fill the custom domain field with `playgambitgames.com`.

- [ ] **Step 5: Add DNS records at the domain registrar**

Instruct the user to add these records wherever `playgambitgames.com` is registered (this step cannot be done by the agent, it requires access to the registrar account):
- Four `A` records on the apex domain, pointing to: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
- One `CNAME` record: `www` to `play-gambit-games.github.io`.

- [ ] **Step 6: Verify DNS propagation**

Run: `dig +short playgambitgames.com`
Expected: the four GitHub Pages IPs listed above are returned. If not yet, wait for DNS propagation (can take up to a few hours) and re-check.

- [ ] **Step 7: Enable HTTPS**

Once GitHub shows the custom domain as verified in Settings, Pages, check "Enforce HTTPS." GitHub auto-issues a Let's Encrypt certificate; this checkbox becomes available once that certificate is ready.

- [ ] **Step 8: Verify the live site**

Run: `curl -sI https://playgambitgames.com | head -5`
Expected: `HTTP/2 200` and a valid TLS handshake (curl would error out on a cert problem).

- [ ] **Step 9: Clean up the branch**

```bash
git branch -d feat/initial-landing-page
git push origin --delete feat/initial-landing-page
```
