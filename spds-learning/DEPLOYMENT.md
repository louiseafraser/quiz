# Deploy the quiz, tracking and TV slideshow together

For Louise's existing Ubuntu/NGINX droplet and `myjob.cosla.gov.uk`. These are manual instructions: no connection or change to the droplet has been made. Do not switch the live document root until you have approved the preview.

## Final URLs

| URL | Purpose |
| --- | --- |
| `https://myjob.cosla.gov.uk/` | New quiz after the final switch |
| `https://myjob.cosla.gov.uk/slideshow/` | Automatic conference TV slideshow after the final switch |
| `https://myjob.cosla.gov.uk/learning-api/totals` | Password-protected administration totals |
| `https://myjob.cosla.gov.uk/learning-api/display-results` | Public, read-only aggregate totals for the TV |
| `https://myjob.cosla.gov.uk/learning-preview/` | Password-protected test quiz |
| `https://myjob.cosla.gov.uk/learning-preview/slideshow/` | Password-protected test TV slideshow |
| `https://myjob.cosla.gov.uk/learning-test-api/totals` | Password-protected test totals |

The TV display feed deliberately contains only the total completion count and six personality counts. It contains no receipt hashes, passwords, answers or participant data. It cannot submit or reset results. The administration HTML page remains password protected. The quiz and TV are separate pages; neither interrupts the other.

## 1. Check the existing server (read-only)

Run in the droplet console as root:

```bash
nginx -T
readlink -f /etc/nginx/sites-enabled/myjob.cosla.gov.uk
python3 --version
ss -ltnp
getent passwd spds-learning
command -v htpasswd
ls -ld /opt/spds-learning-source /opt/spds-learning \
  /var/www/spds-learning-preview /var/www/spds-learning-live \
  /var/lib/spds-learning /etc/spds-learning
```

Missing proposed directories/account are expected on a fresh installation. If any already exist, inspect them before proceeding; do not overwrite existing credentials, databases or source changes. Ports 8765 and 8766 must be unused. Use Python 3.8 or newer. Install only missing prerequisites (`git`, `python3`, `apache2-utils` for `htpasswd`) using Ubuntu's package manager if necessary.

The two supplied full NGINX configurations match the HTTPS server block Louise provided. If the actual block has changed since then, apply the additions to the current config rather than replacing newer changes.

## 2. Preserve the original files and NGINX config

The existing quiz's entire repository and assets are archived on GitHub branch `archive/job-personality-2026-11-02`. Also back up the actual deployed files, including uncommitted files:

```bash
SPDS_BACKUP="/root/spds-backups/$(date +%Y%m%d-%H%M%S)"
install -d -m 0700 "$SPDS_BACKUP"
tar -czf "$SPDS_BACKUP/original-quiz.tar.gz" -C /var/www/html .
cp -a "$(readlink -f /etc/nginx/sites-enabled/myjob.cosla.gov.uk)" "$SPDS_BACKUP/site.conf"
printf 'Backup location: %s\n' "$SPDS_BACKUP"
```

Write down that backup location. Keep `/var/www/html` and `/opt/job-personality-source` intact. Do not run the old `deploy.sh`: it deploys the original quiz from `main`.

## 3. Install the new code in separate directories

Fresh-install commands (use only after checking the names above are unused):

```bash
git clone --branch spds-learning-superpower --single-branch \
  https://github.com/louiseafraser/quiz.git /opt/spds-learning-source
useradd --system --home-dir /var/lib/spds-learning --shell /usr/sbin/nologin spds-learning
install -d -m 0755 /opt/spds-learning/tracking
install -m 0644 /opt/spds-learning-source/spds-learning/tracking/server.py \
  /opt/spds-learning/tracking/server.py
install -d -o spds-learning -g spds-learning -m 0700 \
  /var/lib/spds-learning/test /var/lib/spds-learning/live
install -d -o root -g www-data -m 0750 /etc/spds-learning
install -d -m 0755 /var/www/spds-learning-preview
cp -a /opt/spds-learning-source/spds-learning/public/. /var/www/spds-learning-preview/
find /var/www/spds-learning-preview -type d -exec chmod 0755 {} +
find /var/www/spds-learning-preview -type f -exec chmod 0644 {} +
```

This copies the quiz **and** its `slideshow/` directory. Only `public/` belongs in the web root. Python, configuration, passwords and SQLite files stay outside it.

## 4. Start persistent tracking

Create separate environment files (fresh installation only):

```bash
printf '%s\n' \
  'SPDS_DB=/var/lib/spds-learning/test/totals.sqlite3' \
  'SPDS_PORT=8766' > /etc/spds-learning/test.env
printf '%s\n' \
  'SPDS_DB=/var/lib/spds-learning/live/totals.sqlite3' \
  'SPDS_PORT=8765' > /etc/spds-learning/live.env
chmod 0600 /etc/spds-learning/test.env /etc/spds-learning/live.env
install -m 0644 /opt/spds-learning-source/spds-learning/tracking/spds-learning@.service \
  /etc/systemd/system/spds-learning@.service
systemctl daemon-reload
systemctl enable --now spds-learning@test spds-learning@live
systemctl status spds-learning@test spds-learning@live --no-pager
curl --fail http://127.0.0.1:8766/display-results
curl --fail http://127.0.0.1:8765/display-results
```

Each service listens only on loopback; do not open firewall ports 8765/8766. SQLite data persists across service restarts and reboots. Concurrent submissions and retries increment one aggregate counter exactly once per completion ID. The total is the sum of six counters. The service stores only counters and anonymous receipt hashes needed for deduplication.

### If tracking was already installed before adding the slideshow

Update the source checkout only after confirming it has no uncommitted changes, copy the new `tracking/server.py` to `/opt/spds-learning/tracking/server.py`, and restart both instances. Do **not** recreate or clear the databases, environment files or password file. Update the NGINX locations too: the TV uses the new `/display-results` endpoint.

## 5. Add password protection and preview routes

For a new password file, this prompts securely for your chosen password:

```bash
htpasswd -cB /etc/spds-learning/admin.htpasswd louise
chown root:www-data /etc/spds-learning/admin.htpasswd
chmod 0640 /etc/spds-learning/admin.htpasswd
```

Use `-c` only when creating a new password file. No password is embedded in the TV or quiz JavaScript.

Install the supplied locations and **staging** NGINX config:

```bash
install -m 0644 /opt/spds-learning-source/spds-learning/tracking/nginx-locations.conf.example \
  /etc/spds-learning/nginx-locations.conf
cp /opt/spds-learning-source/spds-learning/tracking/nginx-staging.conf \
  "$(readlink -f /etc/nginx/sites-enabled/myjob.cosla.gov.uk)"
nginx -t
```

If the test fails, restore `site.conf` from your backup to the same resolved config path and fix the issue before reloading. When the test succeeds:

```bash
systemctl reload nginx
```

The staging config retains **`root /var/www/html`**, your existing domain names, index order, SSL certificate paths, TLS settings and `location /` behavior. It adds the separate preview and narrowly scoped API locations. The main URL still shows the original quiz. `/slideshow/` at the main root is intended for the final switch; use `/learning-preview/slideshow/` during testing.

Check these protections and responses:

```bash
curl -I https://myjob.cosla.gov.uk/learning-preview/
curl -I https://myjob.cosla.gov.uk/learning-api/totals
curl --fail -u louise https://myjob.cosla.gov.uk/learning-test-api/display-results
```

The first two should return HTTP 401 before login. The third prompts for your password and returns test JSON. If you have a Cloudflare cache rule that overrides origin cache headers, exclude `/learning-api/*`, `/learning-test-api/*`, `/learning-preview/*` and `/slideshow/*` from it. API responses and slideshow files already send `Cache-Control: no-store`.

## 6. Replace the placeholder slides

The three supplied placeholder images are editable SVGs; your Canva exports can be **PNG, JPG or JPEG**. Export at **1920 × 1080** for the TV. Put files in:

```text
spds-learning/public/slideshow/slides/
```

Edit `spds-learning/public/slideshow/playlist.json`:

```json
{
  "pollSeconds": 10,
  "transitionMs": 800,
  "slides": [
    {"type": "image", "src": "slides/welcome.png", "alt": "Welcome to SPDS", "duration": 18},
    {"type": "image", "src": "slides/promotion.jpg", "alt": "Our latest promotion", "duration": 20},
    {"type": "results", "duration": 30},
    {"type": "image", "src": "slides/find-us.png", "alt": "Visit our stand", "duration": 18}
  ]
}
```

- Array order is display order. Add/remove image entries to change the playlist.
- `duration` is in seconds. Keep exactly one `results` entry; move it anywhere in the loop. With the default playlist it appears once every 84 seconds.
- `pollSeconds` controls results refreshes, independently of slide rotation (minimum 5 seconds).
- `transitionMs` is the crossfade time in milliseconds.
- Filenames are case sensitive. Use relative same-site paths; image files are fitted without cropping or stretching.
- Commit source changes to GitHub, then copy changed files into the preview deployment first. Refresh the TV page once after changing the playlist or images. Live counts refresh automatically and do not need page refreshes.

The default loop is three 18-second image slides and one 30-second results slide. The chart shows all six personalities, their counts and their percentage of all completions. Percentages use one decimal place, so rounding may not sum to exactly 100%.

## 7. Test the preview before the final switch

1. Open `/learning-preview/` on the Surface tablets and `/learning-preview/slideshow/` on the TV; sign in when prompted.
2. Use the TV browser's fullscreen control or F11. The slideshow starts automatically, scales a 1920 × 1080 stage to the window and loops without operator input. Move the mouse to reveal its fullscreen button.
3. Complete quizzes on multiple tablets. Check the test administration page and TV update without refreshing. The TV reads the same six counters; it never submits quiz results.
4. Confirm the full loop, correct slide order, image fit, legible chart, total, percentages, and 30-second results duration. Test zero completions as well.
5. Temporarily stop **only** `spds-learning@test`. The quiz still works, slides keep rotating, and the TV retains its last figures with an update-status message. With no figures yet it shows an unavailable message rather than invented totals. Restart the test service and check queued submissions arrive and the TV recovers.
6. Restart the test service again and confirm totals persist. Confirm both instances are enabled with `systemctl is-enabled spds-learning@test spds-learning@live`. If you choose to reboot, check both return and counters remain.
7. Confirm the original main URL still works, unauthenticated admin requests return 401, and live totals remain zero. All rehearsals belong in the preview paths.

No reset is needed before the conference: test and live databases and browser retry queues are separate. Avoid deleting live SQLite files or receipt hashes. If backing up an active SQLite database, use SQLite's backup API rather than copying just the main file while it is open.

## 8. Final switch — only when you decide the preview is ready

This is the first step that changes the main quiz URL. Keep `/var/www/html` and the archive backup untouched. Create a new live directory from the reviewed preview files:

```bash
install -d -m 0755 /var/www/spds-learning-live
cp -a /var/www/spds-learning-preview/. /var/www/spds-learning-live/
cp /opt/spds-learning-source/spds-learning/tracking/nginx-live.conf \
  "$(readlink -f /etc/nginx/sites-enabled/myjob.cosla.gov.uk)"
nginx -t
```

Only if the configuration test succeeds:

```bash
systemctl reload nginx
```

The live config differs from staging only in `root /var/www/spds-learning-live`. The quiz is at `/`, the slideshow at `/slideshow/`, and both use the live counters. The preview remains available and uses only test counters. The existing domain and SSL certificate are retained.

Verify the normal HTTPS domain, quiz assets, slideshow and protected totals. Root HTML uses `index.htm`; slideshow HTML uses `slideshow/index.html`, both supported by the existing `index index.html index.htm` directive. Do not run the automated browser test against production: it submits rehearsals. Use preview for rehearsal completions, and verify production totals without submitting test quizzes.

### Roll back the website

To return to the original quiz while leaving tracking/preview available, change the document root back to `/var/www/html` (or reinstall `nginx-staging.conf`), run `nginx -t`, and reload only after it passes. To restore the exact pre-project NGINX configuration, restore your timestamped `site.conf` backup instead. Either option leaves both databases untouched. Original files never need to be deleted, reset or downloaded again.
