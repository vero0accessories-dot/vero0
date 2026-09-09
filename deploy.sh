#!/usr/bin/env bash
# ==============================================================================
# VERO LUXURY ACCESSORIES - PRODUCTION ZERO-DOWNTIME DEPLOYMENT SCRIPT
# Domain: vero-accessoires.store
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================================="
echo "  VERO LUXURY - PRODUCTION DEPLOYMENT"
echo "  Timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo "=================================================="

# ------------------------------------------------------------------------------
# 1. Pre-Flight System Checks
# ------------------------------------------------------------------------------
echo "1. Running Pre-Flight Environment Checks..."

if ! command -v docker &> /dev/null; then
  echo "ERROR: 'docker' is not installed on this host!"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo "ERROR: 'docker compose' is not installed or not working!"
  exit 1
fi

if [ ! -f .env ]; then
  echo "ERROR: Production .env file is missing!"
  echo "Please copy .env.example to .env and configure production credentials:"
  echo "  cp .env.example .env"
  exit 1
fi

# Validate mandatory variables
REQUIRED_VARS=("POSTGRES_PASSWORD" "SESSION_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^${var}=" .env || [ -z "$(grep "^${var}=" .env | cut -d '=' -f2-)" ]; then
    echo "ERROR: Required environment variable '${var}' is missing or empty in .env!"
    exit 1
  fi
done

echo "   Pre-flight checks passed."

# ------------------------------------------------------------------------------
# 2. Optional Git Pull
# ------------------------------------------------------------------------------
PULL_CODE=false
for arg in "$@"; do
  if [ "$arg" == "--pull" ] || [ "$arg" == "-p" ]; then
    PULL_CODE=true
  fi
done

if [ "$PULL_CODE" = true ]; then
  echo "2. Pulling latest code from GitHub branch..."
  if [ -d .git ]; then
    git fetch origin
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    git pull origin "$CURRENT_BRANCH"
    echo "   Successfully pulled latest commits on branch: $CURRENT_BRANCH"
  else
    echo "   Notice: Not a git repository, skipping git pull."
  fi
else
  echo "2. Skipping git pull (use --pull or -p flag to pull latest commits)."
fi

# ------------------------------------------------------------------------------
# 3. Build Production Container Images
# ------------------------------------------------------------------------------
echo "3. Building production container images..."
docker compose build --pull vero-app

# ------------------------------------------------------------------------------
# 4. Start Infrastructure & Run Migrations
# ------------------------------------------------------------------------------
echo "4. Launching PostgreSQL database container..."
docker compose up -d postgres

echo "   Waiting for database container to be healthy..."
RETRY_COUNT=0
MAX_RETRIES=20
until [ "$(docker inspect -f '{{.State.Health.Status}}' vero-postgres 2>/dev/null || echo 'starting')" == "healthy" ]; do
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "ERROR: PostgreSQL failed to become healthy within timeout!"
    docker logs vero-postgres --tail 50
    exit 1
  fi
done
echo "   PostgreSQL container is healthy."

# ------------------------------------------------------------------------------
# 5. Launch Application & Nginx Containers
# ------------------------------------------------------------------------------
echo "5. Starting VERO application & reverse proxy..."
docker compose up -d vero-app nginx certbot

# ------------------------------------------------------------------------------
# 6. Post-Deployment Live Health Check
# ------------------------------------------------------------------------------
echo "6. Verifying live deployment health..."
HEALTH_URL="http://127.0.0.1:3000/health"
APP_HEALTHY=false

for i in {1..15}; do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    APP_HEALTHY=true
    break
  fi
  echo "   Waiting for application warmup ($i/15)..."
  sleep 3
done

if [ "$APP_HEALTHY" = true ]; then
  HEALTH_PAYLOAD=$(curl -s "$HEALTH_URL")
  echo "   Application response: $HEALTH_PAYLOAD"
  echo ""
  echo "=================================================="
  echo "  ✅ DEPLOYMENT SUCCEEDED!"
  echo "  VERO Luxury Accessories is active."
  echo "  Production URL: https://vero-accessoires.store"
  echo "=================================================="
  exit 0
else
  echo ""
  echo "=================================================="
  echo "  ❌ DEPLOYMENT FAILED HEALTH CHECK!"
  echo "=================================================="
  echo "Application failed to respond at $HEALTH_URL."
  echo ""
  echo "Recent application logs:"
  docker logs vero-app --tail 40
  echo ""
  echo "ROLLBACK INSTRUCTIONS:"
  echo "To rollback to previous working state:"
  echo "  1. git checkout <previous_stable_commit_hash>"
  echo "  2. ./deploy.sh"
  echo "To inspect container status:"
  echo "  docker compose ps"
  echo "  docker compose logs --tail 100 -f"
  exit 1
fi
