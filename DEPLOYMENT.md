# VERO Luxury Accessories — Production Deployment & Operations Manual

> **Domain:** `vero-accessoires.store` & `www.vero-accessoires.store`  
> **Architecture:** Internet → Cloudflare / DNS → Nginx (Reverse Proxy & SSL Termination) → Node.js (VERO Full-Stack) → PostgreSQL (Docker Isolated Network)  
> **Hosting Target:** IT PLUS Linux VPS (Ubuntu 22.04 LTS or 24.04 LTS)

---

## 1. Production Architecture Overview

```
                         [ USER / BROWSER ]
                                 │
                         (HTTPS:443 / HTTP:80)
                                 ▼
                     [ IT PLUS Linux VPS Host ]
 ┌────────────────────────────────────────────────────────────────────────┐
 │                                                                        │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │               NGINX REVERSE PROXY & SSL (Docker)                 │  │
 │  │      - Automated Let's Encrypt SSL via Certbot                   │  │
 │  │      - Gzip Compression, Security Headers, Rate Limiting        │  │
 │  │      - Static Assets & Persistent Uploads Caching (/uploads/)   │  │
 │  └──────────────────────────────┬───────────────────────────────────┘  │
 │                                 │                                      │
 │                       (Internal Network)                               │
 │                                 ▼                                      │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │             VERO NODE.JS APPLICATION (Docker: 3000)              │  │
 │  │      - Express + React/Vite Unified Full-Stack                   │  │
 │  │      - Self-Hosted Authentication (PBKDF2 Password Hashing)      │  │
 │  │      - Direct SQL Access via PostgreSQL Connection Pool (pg)     │  │
 │  │      - Native Health Check Endpoint (GET /health)               │  │
 │  └──────────────────────────────┬───────────────────────────────────┘  │
 │                                 │                                      │
 │                   (Isolated Bridge Network: 5432)                      │
 │                     [NO PUBLIC INTERNET ACCESS]                        │
 │                                 ▼                                      │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │           POSTGRESQL 16 ENTERPRISE DATABASE (Docker)             │  │
 │  │      - Persistent Named Volume: vero_postgres_data              │  │
 │  │      - Automated Schema Auto-Bootstrap & Idempotent Seeding     │  │
 │  │      - Full RBAC, Inventory Auditing, Coupons & Egyptian Rates  │  │
 │  └──────────────────────────────────────────────────────────────────┘  │
 │                                                                        │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Server Prerequisites & Recommended Sizing

### Recommended VPS Specifications (IT PLUS)
* **Operating System:** Ubuntu 22.04 LTS or Ubuntu 24.04 LTS (64-bit)
* **CPU:** 2 vCPU cores (minimum 1 vCPU)
* **Memory (RAM):** 2 GB RAM (minimum 1 GB RAM with 2 GB Swap file)
* **Storage:** 25 GB+ NVMe / SSD disk space
* **Network:** Static IPv4 address with reverse DNS capabilities

### DNS Configuration
Before initiating SSL certificates, create the following DNS records at your domain registrar or Cloudflare dashboard:

| Type | Name | Target / Value | TTL | Proxy Status |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (or `vero-accessoires.store`) | `YOUR_VPS_IP_ADDRESS` | Auto / 300 | DNS Only (Gray Cloud during SSL setup) |
| **A** (or **CNAME**) | `www` | `YOUR_VPS_IP_ADDRESS` | Auto / 300 | DNS Only (Gray Cloud during SSL setup) |

> ⚠️ **CRITICAL NOTE ON CLOUDFLARE:** If using Cloudflare, set proxy mode to **DNS Only** (gray cloud) while obtaining the initial Let's Encrypt certificate. Once SSL is active, you can re-enable Cloudflare proxy (orange cloud) with SSL mode set to **Full (Strict)**.

---

## 3. Initial Server Setup & Security Hardening

Connect to your VPS as `root`:
```bash
ssh root@YOUR_VPS_IP_ADDRESS
```

### Step 3.1: Update System Packages
```bash
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban htop unzip jq ca-certificates gnupg
```

### Step 3.2: Create a Dedicated Non-Root Deployment User (`deploy`)
```bash
# Add deploy user
adduser deploy

# Grant sudo permissions
usermod -aG sudo deploy

# Setup SSH key authentication for deploy user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true
```

### Step 3.3: Configure Swap Space (Crucial for 1GB - 2GB RAM VPS)
```bash
# Create 2GB swapfile if none exists
if [ $(swapon --show | wc -l) -le 0 ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl vm.swappiness=10
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi
```

---

## 4. Firewall Configuration (UFW)

Protect the server by only permitting standard web ports and SSH:

```bash
# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (Port 22 or your custom port)
ufw allow 22/tcp comment 'SSH'

# Allow Web Traffic
ufw allow 80/tcp comment 'HTTP ACME Challenge'
ufw allow 443/tcp comment 'HTTPS Secure'

# Enable firewall
ufw --force enable
ufw status verbose
```

> 🔒 **Security Notice:** Port `5432` (PostgreSQL) and Port `3000` (Node.js) are **NOT** opened in the firewall. PostgreSQL is isolated within the internal Docker bridge network (`vero-network`) and is never reachable from the public internet.

---

## 5. Installing Docker & Docker Compose

Run the official Docker installation commands on Ubuntu:

```bash
# 1. Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# 2. Add the repository to Apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Install Docker and Docker Compose plugin
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Add deploy user to docker group
usermod -aG docker deploy
systemctl enable docker
systemctl start docker
```

Switch to the `deploy` user for all subsequent operations:
```bash
su - deploy
```

Verify Docker works without root:
```bash
docker --version
docker compose version
```

---

## 6. Project Setup on the VPS

### Step 6.1: Clone the Repository
```bash
cd ~
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY.git vero-accessories
cd ~/vero-accessories
```

### Step 6.2: Ensure Script Permissions
```bash
chmod +x deploy.sh backup-db.sh restore-db.sh scripts/init-ssl.sh
```

---

## 7. Environment Configuration

### Step 7.1: Create `.env` from `.env.example`
```bash
cp .env.example .env
```

### Step 7.2: Generate Production Secrets
Generate a cryptographically secure database password and session secret:
```bash
# Generate DB Password
openssl rand -base64 24

# Generate Session Secret
openssl rand -hex 32
```

### Step 7.3: Edit `.env`
Open `.env` in `nano` or `vim`:
```bash
nano .env
```

Ensure the following variables are filled in:
```ini
# Application Configuration
NODE_ENV=production
PORT=3000
APP_URL=https://vero-accessoires.store
SESSION_SECRET=PASTE_YOUR_GENERATED_64_CHAR_HEX_SECRET_HERE

# Database Configuration
POSTGRES_DB=vero_db
POSTGRES_USER=vero_user
POSTGRES_PASSWORD=PASTE_YOUR_GENERATED_DB_PASSWORD_HERE
DATABASE_URL=postgresql://vero_user:PASTE_YOUR_GENERATED_DB_PASSWORD_HERE@postgres:5432/vero_db
DB_POOL_MAX=20

# SSL / Domain Settings
SSL_EMAIL=admin@vero-accessoires.store
DOMAIN_NAME=vero-accessoires.store
DOMAIN_ALIASES=www.vero-accessoires.store
```

---

## 8. SSL Setup with Let's Encrypt / Certbot

Run the automated SSL initialization script:
```bash
./scripts/init-ssl.sh
```

### What this script does automatically:
1. Generates temporary dummy certificates so Nginx can boot without crashing.
2. Starts the Nginx container to respond to Let's Encrypt ACME challenges on port 80.
3. Invokes the official Certbot Docker container to obtain genuine certificates for `vero-accessoires.store` and `www.vero-accessoires.store`.
4. Reloads Nginx with the newly issued production certificates.

---

## 9. Starting the Production System

Deploy the entire stack with the automated deployment script:
```bash
./deploy.sh
```

Or execute manually via Docker Compose:
```bash
# Build and start all containers in detached mode
docker compose up -d --build
```

Verify running containers:
```bash
docker compose ps
```

Expected output:
```
NAME            IMAGE                     COMMAND                  SERVICE      CREATED          STATUS                    PORTS
vero-postgres   postgres:16-alpine        "docker-entrypoint.s…"   postgres     30 seconds ago   Up 30 seconds (healthy)   5432/tcp
vero-app        vero-accessories:latest   "/usr/bin/dumb-init …"   vero-app     15 seconds ago   Up 15 seconds (healthy)   127.0.0.1:3000->3000/tcp
vero-nginx      nginx:1.25-alpine         "/docker-entrypoint.…"   nginx        10 seconds ago   Up 10 seconds             0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
vero-certbot    certbot/certbot:latest    "/bin/sh -c 'trap ex…"   certbot      10 seconds ago   Up 10 seconds
```

---

## 10. Verifying the Production Deployment

### 1. Health Check Endpoint
Test from VPS terminal:
```bash
curl -i http://localhost:3000/health
```
Or over the live domain:
```bash
curl -i https://vero-accessoires.store/health
```

Expected response (`HTTP/1.1 200 OK`):
```json
{
  "status": "healthy",
  "timestamp": "2026-09-08T04:30:00.000Z",
  "uptimeSeconds": 120,
  "environment": "production",
  "database": {
    "type": "postgresql_docker",
    "status": "healthy",
    "latencyMs": 2,
    "database": "vero_db"
  }
}
```

### 2. Live Browser Verification
* Open `https://vero-accessoires.store` in your browser.
* Verify green padlock SSL indicator.
* Browse categories, add products to cart, and verify Egyptian Governorate shipping rates.
* Log in as Executive Admin (`vero2026@vero.com`) to inspect order management and stock levels.

---

## 11. Routine Updates & Maintenance

### Updating Code after a GitHub Push
To pull the latest code, build images, and restart with zero downtime:
```bash
./deploy.sh --pull
```

### Viewing Real-Time Logs
```bash
# Follow logs for all services
docker compose logs -f

# Follow logs specifically for Node.js app
docker compose logs -f vero-app

# Follow logs for PostgreSQL
docker compose logs -f postgres

# Follow Nginx web access and error logs
docker compose logs -f nginx
```

### Inspecting Resource Usage
```bash
# Live CPU and Memory consumption per container
docker stats
```

---

## 12. Backup & Restore Procedures

### Step 12.1: Run a Manual Backup
```bash
./backup-db.sh
```
Backups are saved to `./backups/vero_backup_YYYYMMDD_HHMMSS.sql.gz`.

### Step 12.2: Automated Daily Backups via Cron
Open the cron editor:
```bash
crontab -e
```
Add the following line to execute automated backups every day at 3:00 AM:
```cron
0 3 * * * /home/deploy/vero-accessories/backup-db.sh >> /home/deploy/vero-accessories/backups/cron.log 2>&1
```

### Step 12.3: Restoring from a Backup File
To restore the database:
```bash
./restore-db.sh backups/vero_backup_YYYYMMDD_HHMMSS.sql.gz
```
The script will ask you to confirm by typing `RESTORE-VERO-CONFIRM` to prevent accidental overwrites.

---

## 13. GitHub Actions Continuous Deployment (CI/CD)

The repository includes `.github/workflows/deploy.yml`. To enable automated deployments whenever you push to `main`:

1. Go to your GitHub Repository → **Settings** → **Secrets and variables** → **Actions**.
2. Add the following Repository Secrets:

| Secret Name | Description / Example Value |
| :--- | :--- |
| `VPS_HOST` | `YOUR_VPS_PUBLIC_IP` |
| `VPS_USERNAME` | `deploy` |
| `VPS_SSH_PORT` | `22` |
| `VPS_SSH_PRIVATE_KEY` | Private SSH key matching `/home/deploy/.ssh/authorized_keys` |

---

## 14. Troubleshooting Common Issues

### Issue 1: 502 Bad Gateway in Browser
* **Cause:** The Node.js application (`vero-app`) is starting up or crashed.
* **Fix:**
  ```bash
  docker compose logs vero-app --tail 50
  docker compose restart vero-app
  ```

### Issue 2: PostgreSQL Fails to Start
* **Cause:** Incorrect permissions on volume or corrupted data directory.
* **Fix:**
  ```bash
  docker compose logs postgres --tail 50
  # Check available disk space
  df -h
  ```

### Issue 3: Let's Encrypt Certificate Renewal Failed
* **Cause:** Port 80 blocked or domain DNS changed.
* **Fix:**
  ```bash
  # Check if port 80 is listening
  sudo netstat -tlpn | grep ':80'
  # Test dry-run renewal
  docker compose run --rm certbot renew --dry-run
  ```

### Issue 4: Permission Denied on Image Uploads
* **Fix:**
  ```bash
  docker compose exec -u root vero-app chown -R node:node /app/public/uploads
  ```

---

## 15. Operational Commands Cheat Sheet

| Task | Command |
| :--- | :--- |
| **Deploy changes** | `./deploy.sh --pull` |
| **View status of containers** | `docker compose ps` |
| **View real-time logs** | `docker compose logs -f vero-app` |
| **Restart all containers** | `docker compose restart` |
| **Stop all containers** | `docker compose down` |
| **Execute SQL query inside DB** | `docker compose exec postgres psql -U vero_user -d vero_db -c "SELECT count(*) FROM users;"` |
| **Run DB backup** | `./backup-db.sh` |
| **Restore DB backup** | `./restore-db.sh backups/<file>.sql.gz` |
| **Check server health** | `curl http://localhost:3000/health` |
| **Clean up unused Docker assets**| `docker system prune -f` |
