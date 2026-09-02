#!/usr/bin/env bash
set -Eeuo pipefail

trap 'echo "Deploy failed on line $LINENO." >&2' ERR

REPOSITORY_URL="https://github.com/louiseafraser/quiz.git"
SOURCE_DIRECTORY="/opt/job-personality-source"
WEB_DIRECTORY="/var/www/html"

if (( EUID != 0 )); then
  echo "Run this deployment script as root." >&2
  exit 1
fi

if [[ -e "$SOURCE_DIRECTORY" && ! -d "$SOURCE_DIRECTORY/.git" ]]; then
  echo "$SOURCE_DIRECTORY exists but is not a Git repository. Deployment stopped." >&2
  exit 1
fi

if [[ ! -d "$SOURCE_DIRECTORY/.git" ]]; then
  echo "Creating the protected source checkout..."
  git clone --depth 1 --branch main "$REPOSITORY_URL" "$SOURCE_DIRECTORY"
else
  echo "Updating the protected source checkout..."
  git -C "$SOURCE_DIRECTORY" pull --ff-only origin main
fi

for SITE_FILE in index.htm script.js styles.css; do
  if [[ ! -f "$SOURCE_DIRECTORY/$SITE_FILE" ]]; then
    echo "Required file is missing: $SITE_FILE" >&2
    exit 1
  fi

  install -o www-data -g www-data -m 0644     "$SOURCE_DIRECTORY/$SITE_FILE"     "$WEB_DIRECTORY/$SITE_FILE"
done

for ASSET_DIRECTORY in gifs images; do
  if [[ ! -d "$SOURCE_DIRECTORY/$ASSET_DIRECTORY" ]]; then
    echo "Required directory is missing: $ASSET_DIRECTORY" >&2
    exit 1
  fi

  install -d -o www-data -g www-data -m 0755     "$WEB_DIRECTORY/$ASSET_DIRECTORY"

  cp -a     "$SOURCE_DIRECTORY/$ASSET_DIRECTORY/."     "$WEB_DIRECTORY/$ASSET_DIRECTORY/"

  chown -R www-data:www-data "$WEB_DIRECTORY/$ASSET_DIRECTORY"
  find "$WEB_DIRECTORY/$ASSET_DIRECTORY" -type d -exec chmod 0755 {} +
  find "$WEB_DIRECTORY/$ASSET_DIRECTORY" -type f -exec chmod 0644 {} +
done

nginx -t
systemctl reload nginx

DEPLOYED_COMMIT="$(git -C "$SOURCE_DIRECTORY" rev-parse --short HEAD)"
echo "Deploy complete: $DEPLOYED_COMMIT"
