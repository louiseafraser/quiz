# Deploy the COSLA Conference survey

Use the conference source ZIP or the `cosla-conference-2026` branch of `louiseafraser/quiz` once it is published. This guide assumes Ubuntu, Python 3.10+, systemd, NGINX, HTTPS already working for `myjob.cosla.gov.uk`, and sudo access. Run commands in an SSH session on the existing droplet. Keep the existing quiz checkout and web roots out of the commands below.

## 1. Check the host and get the source

```sh
sudo ss -ltnp '( sport = :8775 or sport = :8776 )'
sudo nginx -T 2>&1 | less
```

If using the source ZIP, upload it to your SSH home directory and extract it into a new directory.

```sh
mkdir ~/cosla-conference-source
unzip ~/COSLA-Conference-2026.zip -d ~/cosla-conference-source
cd ~/cosla-conference-source/cosla-conference
```

If the GitHub branch is available, use these commands instead and record the commit printed by Git.

```sh
git clone --single-branch --branch cosla-conference-2026 https://github.com/louiseafraser/quiz.git ~/cosla-conference-source
cd ~/cosla-conference-source
git rev-parse HEAD
cd cosla-conference
```

Ports 8775 (live) and 8776 (preview) are proposals. Use them only if the socket check shows both free and NGINX's current configuration shows no planned use. Otherwise select two unused non-SPDS ports and change both the copied environment files and their corresponding upstream values in the COSLA NGINX snippet. Locate the active HTTPS server block for the hostname in the NGINX output. The `public/` tree is the only web content. It contains the survey files, original assets and fonts, plus `slideshow/` with its playlist and statistics. The `backend/` tree contains the Python service and requirements declaration. `deploy/` contains the unit, env examples and NGINX snippets. `tests/` runs locally.

## 2. Install the separate files and services

Run from the project directory in the fresh checkout.

```sh
sudo install -d /opt/cosla-conference/backend /etc/cosla-conference
sudo install -d /var/www/cosla-conference-live /var/www/cosla-conference-test
sudo cp -a public/. /var/www/cosla-conference-live/
sudo cp -a public/. /var/www/cosla-conference-test/
sudo install -m 0644 backend/server.py /opt/cosla-conference/backend/server.py
sudo install -m 0644 deploy/cosla-conference@.service /etc/systemd/system/
sudo install -m 0644 deploy/live.env.example /etc/cosla-conference/live.env
sudo install -m 0644 deploy/test.env.example /etc/cosla-conference/test.env
sudo install -m 0644 deploy/nginx-server.conf /etc/cosla-conference/nginx-server.conf
sudo install -m 0644 deploy/nginx-http.conf /etc/cosla-conference/nginx-http.conf
sudo systemctl daemon-reload
sudo systemctl enable --now cosla-conference@test cosla-conference@live
sudo systemctl status cosla-conference@test cosla-conference@live --no-pager
curl -fsS http://127.0.0.1:8776/display-results
curl -fsS http://127.0.0.1:8775/display-results
```

No pip packages are needed. The service creates each database on first start using systemd-managed private state directories. A fresh live database should return zero. If it already has votes, review its history before choosing whether to reset. Running the service again preserves recorded responses.

## 3. Add the routes

Back up the actual site configuration file identified in step 1 before editing it. Add the following include inside the existing `http` block, or use an existing include directory that is loaded once in that context.

```nginx
include /etc/cosla-conference/nginx-http.conf;
```

Add this line inside the active HTTPS `server` block for `myjob.cosla.gov.uk`.

```nginx
include /etc/cosla-conference/nginx-server.conf;
```

Keep existing directives and routes in place. If the host uses Cloudflare caching rules that cache API URLs irrespective of origin headers, bypass caching for both COSLA API prefixes. The submission limit is per address observed by NGINX, with a burst for delegates on shared connections. Check your existing trusted-proxy and real-IP setup if multiple unrelated clients appear under one address.

```sh
sudo nginx -t && sudo systemctl reload nginx
curl -fsS https://myjob.cosla.gov.uk/coslaconf/
curl -fsS https://myjob.cosla.gov.uk/coslaconf/slideshow/
curl -fsS https://myjob.cosla.gov.uk/coslaconf-api/display-results
curl -fsS https://myjob.cosla.gov.uk/coslaconf-preview/
curl -fsS https://myjob.cosla.gov.uk/coslaconf-preview/slideshow/
curl -fsS https://myjob.cosla.gov.uk/coslaconf-test-api/display-results
```

Use the preview tablet URL for a test vote while watching the preview TV URL. Verify live totals stay at zero. On the venue equipment check readable labels, scrolling, QR scanning, Wi-Fi, the full slideshow loop, and the 15-second tablet reset. On TV use the fullscreen button or F after loading the page. Verify the original quiz, SPDS quiz, TV and API also respond as they did before. Preview links and votes use the test database. The production QR appears only on the live TV screen.

## API and administration

`POST /complete` requires JSON with an `id` (a random UUID v4 per response) and an `answers` array containing exactly four uppercase letters A–E in question order. A successful submission or exact retry returns HTTP 200 and `{"ok":true}`. An existing ID with different answers returns 409. Invalid answers return 400 and the proxy may return 429 for a burst. Use the same ID and answers after an uncertain outcome.

`GET /display-results` returns HTTP 200 with `{"total":0,"questions":[{"counts":[0,0,0,0,0]},{"counts":[0,0,0,0,0]},{"counts":[0,0,0,0,0]},{"counts":[0,0,0,0,0]}]}`. Counts stay in A–E order and each row sums to `total`. Neither route exposes per-response data.

Check totals, export a CSV containing only the four answers and clear preview data using root on the host. Close the preview survey in browsers before resetting it so an in-progress retry does not repopulate it.

```sh
sudo python3 /opt/cosla-conference/backend/server.py --database /var/lib/cosla-conference-live/results.sqlite3 totals
(umask 077; sudo python3 /opt/cosla-conference/backend/server.py --database /var/lib/cosla-conference-live/results.sqlite3 export > ~/cosla-conference-results.csv)
sudo python3 /opt/cosla-conference/backend/server.py --database /var/lib/cosla-conference-test/results.sqlite3 --confirm-reset reset
```

If production smoke tests generate live votes, export them if needed and use the same reset command with the **live** database only after confirming that all records are test votes. Do this before opening participation.

## Troubleshooting and rollback

- A 404 on a public URL usually means the COSLA include is in the wrong server block or the files were copied to a different web root. Check the HTTPS configuration with `sudo nginx -T`.
- For a 502, check the port and service with `sudo ss -ltnp` and `sudo journalctl -u cosla-conference@live -u cosla-conference@test -n 80 --no-pager`. Test the localhost API before troubleshooting external DNS or caching.
- For an unavailable or stale results label, check the matching API prefix and verify the display returns the documented JSON. For a stalled submission, leave the retry screen open while restoring connectivity.
- To roll back, remove only the two COSLA include lines added in step 3. Run `sudo nginx -t && sudo systemctl reload nginx`, then run `sudo systemctl disable --now cosla-conference@test cosla-conference@live`. Preserve databases for export or recovery. The separate COSLA files can stay in place until you are ready to reuse or remove them.

## Reporting and configuration

Update TV figures and the supplied cohort note in `public/slideshow/statistics.json`. Confirm the methodology behind the historical savings estimate and the reporting definitions behind the three 2025 unit costs with the source owner. Edit the loop and refresh timing in `public/slideshow/playlist.json`. If changing questions, preserve option identifiers and their meanings once responses exist, since historical records are stored as A–E.
