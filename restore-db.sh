#!/usr/bin/env bash
# ==============================================================================
# VERO LUXURY ACCESSORIES - DATABASE RESTORATION SCRIPT
# Safely restores a compressed PostgreSQL dump into Docker container vero-postgres
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

if [ -f "$PROJECT_ROOT/.env" ]; then
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs -d '\n' 2>/dev/null || true)
fi

DB_CONTAINER="vero-postgres"
DB_USER="${POSTGRES_USER:-vero_user}"
DB_NAME="${POSTGRES_DB:-vero_db}"

echo "=================================================="
echo "  VERO LUXURY - DATABASE RESTORE UTILITY"
echo "=================================================="

# Check argument
if [ $# -eq 0 ]; then
  echo "Usage: $0 <path_to_backup_file.sql.gz>"
  echo ""
  echo "Available backups in ./backups:"
  ls -lh "$PROJECT_ROOT/backups/"*.sql.gz 2>/dev/null || echo "  (No backup files found)"
  echo ""
  exit 1
fi

BACKUP_FILE="$1"

# Verify file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file '$BACKUP_FILE' does not exist!"
  exit 1
fi

# Verify file is not empty
FILE_SIZE=$(wc -c < "$BACKUP_FILE" | tr -d ' ')
if [ "$FILE_SIZE" -lt 100 ]; then
  echo "ERROR: Backup file is suspiciously small ($FILE_SIZE bytes). Aborting."
  exit 1
fi

# Test gzip integrity
echo "1. Testing backup archive integrity..."
if ! gzip -t "$BACKUP_FILE"; then
  echo "ERROR: Corrupt archive! gzip test failed."
  exit 1
fi
echo "   Archive integrity confirmed."

# Verify target container is running
echo "2. Checking database container status..."
if ! docker ps --format '{{.Names}}' | grep -Eq "^${DB_CONTAINER}$"; then
  echo "ERROR: Database container '$DB_CONTAINER' is NOT running!"
  echo "Please start the services first with: docker compose up -d postgres"
  exit 1
fi
echo "   Database container '$DB_CONTAINER' is online."

# Production Confirmation Prompt
echo ""
echo "⚠️  WARNING: You are about to restore into production database '${DB_NAME}'!"
echo "   Target container: ${DB_CONTAINER}"
echo "   Target database:  ${DB_NAME}"
echo "   Source archive:   ${BACKUP_FILE} ($(ls -lh "$BACKUP_FILE" | awk '{print $5}'))"
echo ""
read -p "Type 'RESTORE-VERO-CONFIRM' to proceed: " CONFIRMATION

if [ "$CONFIRMATION" != "RESTORE-VERO-CONFIRM" ]; then
  echo "Restoration aborted by user. No changes were made."
  exit 0
fi

echo ""
echo "3. Restoring database schema and data..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"

echo ""
echo "4. Verifying restoration..."
ROW_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')

echo "=================================================="
echo "  DATABASE RESTORATION COMPLETED SUCCESSFULLY!"
echo "  Public tables restored: $ROW_COUNT"
echo "=================================================="
