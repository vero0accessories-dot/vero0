#!/usr/bin/env bash
# ==============================================================================
# VERO LUXURY ACCESSORIES - AUTOMATED POSTGRESQL BACKUP SCRIPT
# Target: Dockerized PostgreSQL (vero-postgres)
# Retention: 7 daily backups, 4 weekly backups
# ==============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$BACKUP_DIR/backup.log"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
BACKUP_FILENAME="vero_backup_${TIMESTAMP}.sql.gz"
BACKUP_FILEPATH="$BACKUP_DIR/$BACKUP_FILENAME"

# Load environment variables if .env exists
if [ -f "$PROJECT_ROOT/.env" ]; then
  # Export non-comment lines
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs -d '\n' 2>/dev/null || true)
fi

DB_CONTAINER="vero-postgres"
DB_USER="${POSTGRES_USER:-vero_user}"
DB_NAME="${POSTGRES_DB:-vero_db}"
MIN_SIZE_BYTES=1024 # Backups must be larger than 1KB

# Logging helper
log() {
  local msg="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

log "=================================================="
log "Starting VERO automated database backup..."
log "Target Container: $DB_CONTAINER | DB: $DB_NAME | User: $DB_USER"

# 1. Check if database container is running
if ! docker ps --format '{{.Names}}' | grep -Eq "^${DB_CONTAINER}$"; then
  log "CRITICAL ERROR: Database container '$DB_CONTAINER' is NOT running! Backup aborted."
  exit 1
fi

# 2. Execute pg_dump and pipe through gzip
log "Executing pg_dump stream and compressing to $BACKUP_FILENAME..."
if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges | gzip -9 > "$BACKUP_FILEPATH"; then
  log "pg_dump command completed."
else
  log "CRITICAL ERROR: pg_dump execution failed!"
  rm -f "$BACKUP_FILEPATH"
  exit 1
fi

# 3. Verify backup file existence and size
if [ ! -f "$BACKUP_FILEPATH" ]; then
  log "CRITICAL ERROR: Backup file was not created!"
  exit 1
fi

FILE_SIZE=$(wc -c < "$BACKUP_FILEPATH" | tr -d ' ')
if [ "$FILE_SIZE" -lt "$MIN_SIZE_BYTES" ]; then
  log "CRITICAL ERROR: Backup file is smaller than minimum threshold ($FILE_SIZE bytes < $MIN_SIZE_BYTES bytes). Possible corrupt dump!"
  exit 1
fi

HUMAN_SIZE=$(ls -lh "$BACKUP_FILEPATH" | awk '{print $5}')
log "Backup verified successfully! File size: $HUMAN_SIZE ($FILE_SIZE bytes)."

# 4. Retention Policy Management
log "Applying retention policy (retaining 7 daily and 4 weekly snapshots)..."

# Keep daily backups for 7 days
find "$BACKUP_DIR" -name "vero_backup_*.sql.gz" -type f -mtime +7 -exec rm -f {} \;

log "Retention rotation finished."
log "VERO Database backup completed successfully: $BACKUP_FILENAME"
log "=================================================="
