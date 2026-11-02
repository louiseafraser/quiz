# SPDS — What's Your Learning Superpower?

Adaptation of the existing job personality quiz at commit `8f9c738faa97bfabf334c271d5183d9639aff2fb`.
The root quiz, `images/`, `gifs/`, `deploy.sh` and `NOTES.md` are unchanged.
A complete recoverable copy is on branch `archive/job-personality-2026-11-02`.
The new version is entirely within `spds-learning/` on branch `spds-learning-superpower`.

## What changed

- `public/index.htm`: new introduction and short name/summary result, original screens/logo.
- `public/quiz-data.js`: all 10 questions and 60 personality assignments from the brief.
- `public/script.js`: one point per answer; ties use the latest question answered among tied personalities. Original tap-to-advance behavior retained (the original has no back/next controls).
- `public/styles.css`: original CSS with small overrides for longer answers, mobile viewport and hidden inactive result screen. Original pulse, spinner and confetti retained.
- `public/tracking.js`: anonymous completion ID, retry queue and separate test/live API paths.
- `tracking/server.py`: Python standard-library HTTP endpoint and SQLite aggregate counts, bound to loopback only. No pip dependencies.

No new personality illustrations are included: the existing GIFs represent unrelated jobs. The short result uses the existing card styling and confetti. Illustrations can be added later if supplied.

## Counting and privacy

Only six aggregate counters and SHA-256 hashes of random completion IDs are stored centrally. Hashes provide permanent duplicate protection; they have no associated personality, answers, date, name or IP. Each new quiz generates a fresh random ID. A transaction inserts the hash and increments the appropriate counter together, so concurrent tablets and retried requests cannot double count. Total completions is the sum of six counters.

The browser keeps only unacknowledged `{id, personality}` submissions in localStorage and retries them every 15 seconds, on network recovery and on page load. Restarting the quiz does not erase unsent results. A refresh cannot create a new submission for a completed quiz; it retries the existing one with the same ID. If browser storage is disabled/full, retries work in memory but cannot survive the tab closing. Clearing tablet browser data before queued submissions are sent will lose those submissions. The quiz remains usable during tracking outages.

Use one quiz tab per tablet. Test preview URLs always submit to the test service and use a distinct queue key. There is no API for deleting totals. Do not move or delete the live database, its receipt ledger or its WAL files. Back up SQLite using the SQLite backup API, rather than copying an open database file alone.

## Verification

From repository root:

```bash
node spds-learning/tests/quiz.test.cjs
python3 -m unittest discover -s spds-learning/tests -v
```

Browser checks are in `tests/browser.cjs` (requires an existing Playwright installation). They verify six outcomes through the UI, question count, long-answer layout at portrait tablet sizes, loading/result screens, restart, and offline retry across refresh without double counting.

Real Surface hardware, actual NGINX authentication, the installed SSL certificate and reboot persistence require checks on the droplet. Local tests cannot verify those.

## Inspect the droplet first (read-only)

Repository notes identify `142.93.33.159`, `https://myjob.cosla.gov.uk/`, `/var/www/html` and a protected source checkout at `/opt/job-personality-source`. These are clues, not a verified description of today's server. Open the DigitalOcean console and run:

```bash
sudo nginx -T
sudo systemctl status nginx --no-pager
python3 --version
sudo ss -ltnp
sudo ls -ld /var/www/html /opt/job-personality-source
sudo git -C /opt/job-personality-source status --short
sudo git -C /opt/job-personality-source rev-parse HEAD
sudo git -C /opt/job-personality-source remote -v
```

Inspect the server block for `myjob.cosla.gov.uk`: confirm its config filename, `root`/`alias`, index directives, certificate paths, other locations and whether ports 8765/8766 and the proposed new directories/URL prefixes below are unused. If the source directory does not exist, stop those Git checks; inspect the actual checkout identified on the server. Do not run the old `deploy.sh` to deploy this branch: it deploys the original root quiz from `main`.

**Send the relevant NGINX server block and directory findings back before following the setup or switch instructions. Do not include private keys or passwords. No server changes have been made from this workspace.**

## Stage separately after confirming paths

The following are proposed commands, not an executed deployment. If any named path/account already exists, inspect and adapt rather than overwriting it. Keep the original NGINX config and live document root intact.

1. Back up the actual existing web root (including hidden files) and its NGINX config outside any public directory. Set `LIVE_ROOT` and `HTTPS_CONFIG` to the verified paths, then:

```bash
sudo install -d -m 0700 /root/spds-backups
sudo tar -czf "/root/spds-backups/original-quiz-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$LIVE_ROOT" .
sudo cp -a "$HTTPS_CONFIG" "/root/spds-backups/nginx-$(date +%Y%m%d-%H%M%S).conf"
```

Keep the timestamped backup names for rollback. The archive Git branch preserves repository assets; the server backup also preserves any files that were never committed.

2. Clone the development branch into a new source directory. The script and data directories below are outside the website root:

```bash
sudo git clone --branch spds-learning-superpower --single-branch https://github.com/louiseafraser/quiz.git /opt/spds-learning-source
sudo useradd --system --home-dir /var/lib/spds-learning --shell /usr/sbin/nologin spds-learning
sudo install -d -m 0755 /opt/spds-learning/tracking
sudo install -m 0644 /opt/spds-learning-source/spds-learning/tracking/server.py /opt/spds-learning/tracking/server.py
sudo install -d -o spds-learning -g spds-learning -m 0700 /var/lib/spds-learning/test /var/lib/spds-learning/live
sudo install -d -m 0750 -o root -g www-data /etc/spds-learning
sudo install -d -m 0755 /var/www/spds-learning-preview
sudo cp -a /opt/spds-learning-source/spds-learning/public/. /var/www/spds-learning-preview/
sudo install -m 0644 /opt/spds-learning-source/spds-learning/tracking/spds-learning@.service /etc/systemd/system/
```

3. Create `/etc/spds-learning/test.env` with these two lines (root-owned mode 0600):

```text
SPDS_DB=/var/lib/spds-learning/test/totals.sqlite3
SPDS_PORT=8766
```

Create `/etc/spds-learning/live.env` similarly:

```text
SPDS_DB=/var/lib/spds-learning/live/totals.sqlite3
SPDS_PORT=8765
```

Then:

```bash
sudo chmod 0600 /etc/spds-learning/test.env /etc/spds-learning/live.env
sudo systemctl daemon-reload
sudo systemctl enable --now spds-learning@test spds-learning@live
```

4. Create a password file with `htpasswd` (from Ubuntu's `apache2-utils`, if not already installed). It prompts securely for your chosen password:

```bash
sudo htpasswd -cB /etc/spds-learning/admin.htpasswd louise
sudo chown root:www-data /etc/spds-learning/admin.htpasswd
sudo chmod 0640 /etc/spds-learning/admin.htpasswd
```

Use `-c` only for this new file. Do not put the password in Git, JavaScript or a shell command.

5. Review `tracking/nginx-locations.conf.example` against the verified HTTPS server block. Once approved, add its locations inside that block, retaining all existing SSL/domain/root directives. Do not expose port 8765 or 8766 externally. Never add a generic API proxy that bypasses the protected totals routes. Test with `sudo nginx -t` before `sudo systemctl reload nginx`.

Preview: `https://myjob.cosla.gov.uk/learning-preview/` (password protected).
Test totals: `https://myjob.cosla.gov.uk/learning-test-api/totals` (password protected).
Live totals: `https://myjob.cosla.gov.uk/learning-api/totals` (password protected).

The password prompt protects both the preview and its test API. API proxy access logging is disabled; the unchanged static-site logging policy may still log normal website visits.

## Live switch — ONLY after Louise approves

Before asking for switch approval: complete preview checks; confirm live totals are zero; retain the server backup; check the existing certificate and expiration; confirm the original page still works. Test all 10 questions on the actual portrait Surface, restart, refresh, temporarily unavailable tracking, password protection and simultaneous tablets. Reboot the staged tracking service and check totals persist.

After approval, create a separate new `/var/www/spds-learning-live` directory and copy **only** the contents of the reviewed preview public directory there. Do not move the original live directory or copy backend/config/SQLite files into a public folder.

In the verified existing HTTPS server block, change only the quiz's document root to `/var/www/spds-learning-live` and ensure its index includes `index.htm`. Review existing `location /`/`try_files` behavior against that root; do not guess or remove unrelated locations. Keep domain, listen and certificate directives. Run `nginx -t`, reload, then check the existing HTTPS URL, every script/logo and protected totals page. At the root URL the browser automatically uses the live API; `/learning-preview/` remains test-only.

Rollback: restore the saved original HTTPS config (or its original document root/index directives if other approved config changes should remain), run `nginx -t`, reload and confirm the original quiz. Its original files and source remain in place throughout. Do not run a destructive reset/pull or clear either database to roll back the website.

## Excluding tests

Use the protected preview for every rehearsal: those counters are already separate and can simply be left in place. No clearing is necessary before the conference. Do not test completions at the production root URL. If test totals must be reset, stop **only** `spds-learning@test`, archive its entire test state directory outside the web root, recreate the empty test directory with the same owner/mode, and restart only that instance. Never run a wildcard reset against `/var/lib/spds-learning/`.

## Current validation status (2 November 2026)

Passed locally: quiz structure and all six outcomes; tie-breaking; shuffle assignments; HTTP payload validation; duplicate retries; 40 concurrent distinct completions plus 30 retries of one completion; database reinitialization preserving counts; separate test storage; browser queue recovery after a simulated refresh; separate test/live queues; JS/Python syntax; original tracked files unchanged.

The Playwright browser check was attempted but could not launch because this environment has no installed Chromium executable. Its script is included for a browser-equipped environment; no visual or physical Surface verification is claimed. Run it with `QUIZ_URL` pointing at a local server serving `public/` before considering it passed. For example, start `python3 -m http.server 8090 --bind 127.0.0.1 --directory spds-learning/public` from repository root, then run `node spds-learning/tests/browser.cjs` in another terminal with Playwright/browser already installed. Never run this root-path browser test against the live conference URL: it deliberately submits test completions.

Nothing has been deployed to the droplet, and the live URL and SSL configuration have not been altered.
