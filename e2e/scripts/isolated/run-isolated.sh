#!/usr/bin/env bash
# Mode B — run the financial lifecycle against a DISPOSABLE local backend.
#
# Creates a brand-new SQLite file (assab-e2e-<stamp>.sqlite) in a temp dir,
# migrates it, provisions the deterministic harness fixture, starts
# `php artisan serve` on 127.0.0.1, runs Playwright, then stops the server.
# Never touches staging, MySQL, Coolify or any shared database.
#
# Usage:
#   ASSAB_BACKEND_DIR=/path/to/assab-checkout \
#   ASSAB_E2E_FIXTURE_PASSWORD="$(openssl rand -base64 24)" \
#   bash scripts/isolated/run-isolated.sh [extra playwright args]
#
# Optional: ASSAB_E2E_PORT (8787), ASSAB_E2E_NAMESPACE (assab-ui-qa-20261018),
#           ASSAB_E2E_FRONTEND_URL + ASSAB_E2E_UI=true to include dashboard UI steps,
#           ASSAB_E2E_PROJECTS ("lifecycle regression").
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUITE="$(cd "$HERE/../.." && pwd)"
: "${ASSAB_BACKEND_DIR:?set ASSAB_BACKEND_DIR to a backend checkout with vendor/ installed}"
: "${ASSAB_E2E_FIXTURE_PASSWORD:?set ASSAB_E2E_FIXTURE_PASSWORD (>=16 chars, never commit it)}"
PORT="${ASSAB_E2E_PORT:-8787}"
NS="${ASSAB_E2E_NAMESPACE:-assab-ui-qa-20261018}"
PROJECTS="${ASSAB_E2E_PROJECTS:-lifecycle regression}"

WORK="$(mktemp -d -t assab-e2e-XXXXXX)"
SERVER_PID=""
stop_server() {
  if [[ -n "$SERVER_PID" ]]; then kill "$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true; SERVER_PID=""; fi
}
cleanup() { stop_server; rm -rf "$WORK"; }
trap cleanup EXIT

export APP_ENV=local APP_DEBUG=false DB_CONNECTION=sqlite \
  QUEUE_CONNECTION=sync CACHE_STORE=array SESSION_DRIVER=array BROADCAST_CONNECTION=log \
  MAIL_MAILER=log LOG_CHANNEL=single APP_URL="http://127.0.0.1:$PORT"
export APP_KEY="base64:$(head -c 32 /dev/urandom | base64)"
export ASSAB_E2E_MODE=isolated ASSAB_E2E_API_ORIGIN="http://127.0.0.1:$PORT" ASSAB_E2E_NAMESPACE="$NS"
export ASSAB_E2E_UI="${ASSAB_E2E_UI:-false}"

# Each project gets its OWN brand-new database: the lifecycle closes the
# manager day, and every scenario needs an unused (cashier, template, date) slot.
run_project() {
  local project="$1"; shift
  export DB_DATABASE="$WORK/assab-e2e-$project-$(date +%Y%m%d%H%M%S).sqlite"
  : > "$DB_DATABASE"
  echo "[isolated:$project] migrating disposable database $DB_DATABASE"
  ( cd "$ASSAB_BACKEND_DIR" && php artisan migrate --force --no-interaction >/dev/null )
  echo "[isolated:$project] provisioning fixture namespace $NS"
  php "$HERE/bootstrap-local-fixture.php" "$ASSAB_BACKEND_DIR" "$NS"
  echo "[isolated:$project] starting backend on 127.0.0.1:$PORT"
  ( cd "$ASSAB_BACKEND_DIR" && exec php artisan serve --host=127.0.0.1 --port="$PORT" --no-reload ) > "$WORK/server-$project.log" 2>&1 &
  SERVER_PID=$!
  for _ in $(seq 1 60); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/v1/aggregators" || true)"
    [[ "$code" != "000" ]] && break
    sleep 0.5
  done
  ( cd "$SUITE" && ASSAB_E2E_REPORT_DIR="$SUITE/reports/$project" npx playwright test --project="$project" "$@" )
  local status=$?
  stop_server
  return "$status"
}

OVERALL=0
for p in $PROJECTS; do
  set +e
  run_project "$p" "$@"
  st=$?
  set -e
  echo "[isolated:$p] playwright exit status $st"
  [[ $st -ne 0 ]] && OVERALL=$st
done
echo "[isolated] done (reports in $SUITE/reports/<project>/{html,junit.xml,results.json})"
exit "$OVERALL"
