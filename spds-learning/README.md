# SPDS — What's Your Learning Superpower?

A small adaptation of the existing quiz, plus a separate automatic TV slideshow. Plain HTML/CSS/JavaScript and a Python standard-library/SQLite totals service; no application framework, build step or pip dependencies.

**Nothing is deployed by this repository change.** Louise handles all DigitalOcean configuration and deployment. See [DEPLOYMENT.md](DEPLOYMENT.md) for complete installation, preview, slideshow editing, live-switch and rollback instructions tailored to the supplied NGINX configuration.

## Included

- `public/index.htm`: 10-question quiz, randomised answers, one point per selection, six short title/summary results, calculating screen, restart and confetti. Original branding and layout retained.
- `public/quiz-data.js`: all 60 answers and six personality summaries from the supplied brief. Ties use the latest question answered among tied personalities, independent of random display order.
- `public/tracking.js`: anonymous completion IDs and an offline retry queue. Authoritative totals are stored centrally, not in the browser. Pending submissions survive refresh where browser storage is available.
- `public/slideshow/index.html`: independent 16:9 TV display. Three placeholder image slides at 18 seconds each, a 30-second results slide, crossfades and fullscreen control.
- `public/slideshow/playlist.json`: image filenames, order and durations; results polling and transition timing. Replace the SVG placeholders with Canva PNG/JPG exports at 1920 × 1080.
- `tracking/server.py`: shared transactional counter. `/display-results` exposes only read-only aggregate JSON for the TV; `/totals` is an administration HTML page protected by NGINX.
- `tracking/`: systemd unit, narrow NGINX routes, and separate staging/live full configs retaining the existing domain and SSL certificate paths.

The TV polls every 10 seconds, including while promotional slides are visible. It shows all six counts, percentages and total completions, retains last-known figures during outages, and rotates independently of the results service. Invalid/missing image files use a fallback slide; a bad playlist retries without needing operator refresh. Editing the playlist/images requires a one-time page refresh after deployment.

## Original quiz remains preserved

The root `index.htm`, `script.js`, `styles.css`, `images/`, `gifs/`, `deploy.sh` and `NOTES.md` are unchanged from original commit `8f9c738faa97bfabf334c271d5183d9639aff2fb`. A full recoverable copy is on GitHub branch `archive/job-personality-2026-11-02`. New work stays under `spds-learning/` on branch `spds-learning-superpower`. The deployment guide also backs up the server's original files outside the public web root and keeps `/var/www/html` intact.

## Test and live isolation

Preview paths begin `/learning-preview/`, use `/learning-test-api`, and have separate SQLite data and retry queues. Main quiz and `/slideshow/` use `/learning-api`. No admin reset endpoint exists. The TV never calls the completion endpoint or changes totals. Counts plus anonymous deduplication hashes are the only stored data; no participant identities or individual answer histories are collected.

Use one quiz tab per tablet. Clearing browser storage before offline submissions have been sent will lose those pending submissions. If storage is unavailable, in-memory retries continue but cannot survive closing the page. No old job-personality result GIFs are used for the new learning personalities.

## Checks

From repository root:

```bash
node spds-learning/tests/quiz.test.cjs
node spds-learning/tests/retry.test.cjs
node spds-learning/tests/slideshow.test.cjs
python3 -m unittest discover -s spds-learning/tests -v
```

Passed: all six quiz outcomes and tie-breaking; assignment-preserving shuffle; concurrent/deduplicated counts; persistent SQLite reinitialization; test/live separation; HTTP validation; read-only display JSON and no-store headers; browser retry queue recovery; playlist timing/looping; missing-image fallback; retained results during outages; polling recovery; stage scaling. Slideshow JS tests exercise logic with a simulated DOM, not a rendered browser.

Optional real browser checks, with Playwright and Chromium already installed:

```bash
# Terminal 1, repository root:
python3 -m http.server 8090 --bind 127.0.0.1 --directory spds-learning/public
# Terminal 2:
node spds-learning/tests/browser.cjs
node spds-learning/tests/slideshow-browser.cjs
```

Actual browser/TV visual QA remains outstanding: this environment has no installed Chromium executable and the attempted download failed. No rendered-browser pass is claimed. Actual Surface/TV appearance, NGINX syntax/authentication, certificate behavior and reboot persistence must be checked by Louise in the preview setup before the live switch. No droplet access was attempted.
