#!/bin/sh
# Nightly database dump, run by the `backup` service in docker-compose.yml.
#
# Custom format (-Fc): compressed, and pg_restore can restore one table from
# it. Dumps older than KEEP_DAYS are removed. These sit on the same disk as the
# database, so they protect against a bad migration or a mistaken edit — not
# against losing the VPS. Copy ./backups off the machine as well (see
# docs/DEPLOYMENT-VPS.md).
set -eu

KEEP_DAYS="${KEEP_DAYS:-14}"

while true; do
  file="/backups/tribeca-$(date -u +%Y-%m-%d-%H%M).dump"
  if pg_dump -Fc -f "$file.partial"; then
    mv "$file.partial" "$file"
    echo "backup: wrote $file"
  else
    rm -f "$file.partial"
    echo "backup: pg_dump failed" >&2
  fi
  find /backups -name 'tribeca-*.dump' -mtime +"$KEEP_DAYS" -delete
  sleep 86400
done
