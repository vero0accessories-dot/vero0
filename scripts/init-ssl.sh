#!/usr/bin/env bash
# ==============================================================================
# VERO LUXURY ACCESSORIES - INITIAL SSL CERTIFICATE BOOTSTRAPPER
# Domain: vero-accessoires.store
# ==============================================================================

set -euo pipefail

DOMAIN="vero-accessoires.store"
EMAIL="${SSL_EMAIL:-admin@vero-accessoires.store}"
DATA_PATH="./certbot"

echo "=================================================="
echo "  VERO LUXURY - SSL CERTIFICATE INITIALIZATION"
echo "=================================================="

if [ -d "$DATA_PATH/conf/live/$DOMAIN" ]; then
  echo "Existing certificate found for $DOMAIN."
  read -p "Do you want to force renewal/reissue? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted. Existing certificate preserved."
    exit 0
  fi
fi

# Ensure directories exist
mkdir -p "$DATA_PATH/conf" "$DATA_PATH/www"

echo "1. Creating temporary self-signed certificate for Nginx startup..."
CERT_DIR="$DATA_PATH/conf/live/$DOMAIN"
mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -subj "/CN=localhost"
fi

echo "2. Starting Nginx container to serve ACME challenges..."
docker compose up -d nginx

echo "3. Requesting Let's Encrypt SSL certificate for $DOMAIN and www.$DOMAIN..."
docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal \
    --non-interactive" certbot

echo "4. Reloading Nginx with real production SSL certificate..."
docker compose exec nginx nginx -s reload

echo "=================================================="
echo "  SSL CERTIFICATE CONFIGURED SUCCESSFULLY!"
echo "  HTTPS is now active at https://$DOMAIN"
echo "=================================================="
