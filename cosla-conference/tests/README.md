# Local checks

Run `python3 tests/preview.py` from the project directory. This serves both URL mounts on localhost with two fresh temporary SQLite databases. To exercise the full browser flow, run `node tests/browser.cjs` with Playwright resolvable (for example via `NODE_PATH`) and Chromium installed. Set `CHROMIUM_PATH` if Chromium lives outside `/usr/bin/chromium`. Restart the test harness for a fresh run. The tests use a 900×1200 tablet viewport, 390×844 mobile viewport and 1920×1080 TV viewport.

The local harness exercises the application and paths. The Ubuntu NGINX/systemd integration, physical Surfaces and TV, and the live service checks belong to the deployment walkthrough in `../DEPLOY-COSLA.md`.
