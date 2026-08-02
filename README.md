# playgambitgames.com

Marketing landing page for Gambit Games, a slot studio building titles
for the Stake Engine.

Static HTML/CSS/JS, no build step, deployed via GitHub Pages.

## Local preview

Asset paths are root-absolute, so the page must be served, not opened via `file://`:

    python3 -m http.server 8080

Then visit http://localhost:8080.

## Deployment

Pushes to `main` deploy automatically via GitHub Pages. The custom domain and
HTTPS are configured in repo Settings, Pages.
