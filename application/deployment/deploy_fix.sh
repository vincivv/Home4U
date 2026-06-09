#!/usr/bin/env bash
###############################################################################
# deploy_fix.sh — Home4U Market-Ready Zero-Downtime Deployment
#
# A production-grade deployment script featuring:
#   1. Global Health Gate — fails the build if the system is unstable
#   2. Atomic Build Swaps — zero-downtime frontend transitions
#   3. Persistence Shield — protects out-of-repo uploads and env config
#   4. Self-Healing — clears port conflicts and restarts services
#
# Recommended run:
#   bash application/deployment/deploy_fix.sh
###############################################################################
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND_DIR="$REPO_ROOT/application/backend"
FRONTEND_DIR="$REPO_ROOT/application/frontend"
DEPLOY_DIR="$REPO_ROOT/application/deployment"

DEPLOY_USER="${HOME4U_DEPLOY_USER:-home4u}"
UPLOAD_DIR="${HOME4U_UPLOAD_DIR:-/var/lib/home4u/uploads}"
ENV_DIR="/etc/home4u"
ENV_FILE="$ENV_DIR/home4u.env"

# Release directories (atomic swap)
WEB_ROOT="/var/www/home4u"
RELEASE_ROOT="/var/www/home4u-releases"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
NEW_RELEASE_DIR="$RELEASE_ROOT/$TIMESTAMP"

# Resolve current public host metadata for nginx server_name (IMDSv2 with IMDSv1 fallback).
get_imds_meta() {
    local path="$1"
    local token=""
    token="$(curl -fsS --connect-timeout 2 -X PUT \
      "http://169.254.169.254/latest/api/token" \
      -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null || true)"
    if [ -n "$token" ]; then
        curl -fsS --connect-timeout 2 \
          -H "X-aws-ec2-metadata-token: $token" \
          "http://169.254.169.254/latest/meta-data/$path" 2>/dev/null || true
        return
    fi
    curl -fsS --connect-timeout 2 "http://169.254.169.254/latest/meta-data/$path" 2>/dev/null || true
}

PUBLIC_DNS="$(get_imds_meta public-hostname)"
PUBLIC_IP="$(get_imds_meta public-ipv4)"
SERVER_NAMES="_"
if [ -n "$PUBLIC_DNS" ] && [ -n "$PUBLIC_IP" ]; then
    SERVER_NAMES="$PUBLIC_DNS $PUBLIC_IP"
elif [ -n "$PUBLIC_DNS" ]; then
    SERVER_NAMES="$PUBLIC_DNS"
elif [ -n "$PUBLIC_IP" ]; then
    SERVER_NAMES="$PUBLIC_IP"
fi
TLS_CERT_DIR=""
TLS_STATUS="disabled"
if [ -n "$PUBLIC_DNS" ]; then
    TLS_CERT_DIR="/etc/letsencrypt/live/$PUBLIC_DNS"
fi

require_production_environment() {
    if ! sudo test -s "$ENV_FILE" || ! sudo grep -Eq '^[[:space:]]*HOME4U_SECRET_KEY=.+' "$ENV_FILE"; then
        echo "  ❌ FATAL: $ENV_FILE is missing HOME4U_SECRET_KEY."
        echo "     Create the file and add a long random secret before restarting the production backend."
        exit 1
    fi
    if ! sudo grep -Eq '^[[:space:]]*DATABASE_URL=postgresql(\+psycopg2?)?://' "$ENV_FILE"; then
        echo "  ❌ FATAL: $ENV_FILE is missing a PostgreSQL DATABASE_URL."
        echo "     Add DATABASE_URL=postgresql+psycopg://user:password@host:5432/home4u before restarting the production backend."
        exit 1
    fi
}

echo "=========================================================="
echo "  🚀 Home4U PRODUCTION DEPLOY — $TIMESTAMP"
echo "=========================================================="

# ── Step 0: Infrastructure Guard ──────────────────────────────
echo "▶ Phase 0: Validation Environment..."
if ! command -v node >/dev/null 2>&1; then
    echo "  ❌ FATAL: Node.js is not installed."
    exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
    echo "  ❌ FATAL: Python3 is not installed."
    exit 1
fi
echo "  ✓ Environment validated (Node $(node -v), Python $(python3 --version))"

# ── Step 1: Pre-flight & Persistence ──────────────────────────────
echo "▶ Phase 1: Hardening persistence..."
sudo mkdir -p "$UPLOAD_DIR"
sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$UPLOAD_DIR"
sudo mkdir -p "$ENV_DIR"

# ── Step 2: Backend Refresh ─────────────────────────────────────────
echo ""
echo "▶ Phase 2: Orchestrating Backend..."
cd "$BACKEND_DIR"
require_production_environment

# Clear port 8000 (Self-healing)
echo "  🧹 Clearing port 8000 conflicts..."
sudo fuser -k 8000/tcp 2>/dev/null || true

# Update Venv
if [ ! -d ".venv" ]; then
    echo "  📦 Creating fresh virtual environment..."
    python3 -m venv .venv
fi
echo "  📥 Syncing requirements..."
.venv/bin/pip install -q -r requirements.txt

# Apply database migrations before the service touches production traffic.
echo "  🗄️  Applying database migrations..."
HOME4U_ENV=production ./run_migrations.sh upgrade head

# Deploy Systemd service
echo "  ⚙️  Configuring systemd service..."
sudo cp "$DEPLOY_DIR/home4u-backend.service" /etc/systemd/system/home4u-backend.service
sudo systemctl daemon-reload
sudo systemctl enable home4u-backend
sudo systemctl restart home4u-backend

# ── Step 3: Atomic Frontend Build ──────────────────────────────────
echo ""
echo "▶ Phase 3: Zero-Downtime Pipeline..."
cd "$FRONTEND_DIR"

echo "  📦 Initializing release path: $NEW_RELEASE_DIR"
sudo mkdir -p "$RELEASE_ROOT"
sudo mkdir -p "$NEW_RELEASE_DIR"
sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$RELEASE_ROOT"

echo "  🏗️  Executing build profile (Vite)..."
npm install --prefer-offline --no-audit --no-fund 2>&1 | tail -n 5
VITE_API_BASE=/api npx vite build --outDir "$NEW_RELEASE_DIR" 2>&1 | tail -n 3

# Verify build integrity
if [ ! -f "$NEW_RELEASE_DIR/index.html" ]; then
    echo "  ❌ FATAL: Vite build verification failed. Atomic swap cancelled."
    exit 1
fi

echo "  ⚡ ATOMIC SWAP: Linking $TIMESTAMP to $WEB_ROOT"
# We first link to a temp symlink then rotate it for absolute atomicity
sudo ln -sfn "$NEW_RELEASE_DIR" "$WEB_ROOT.tmp"
sudo mv -Tf "$WEB_ROOT.tmp" "$WEB_ROOT"

# Ensure Nginx owns the web root if it needs to
sudo chown -R nginx:nginx "$RELEASE_ROOT" 2>/dev/null || sudo chown -R www-data:www-data "$RELEASE_ROOT" 2>/dev/null || true

# ── Step 4: Infrastructure Guard ───────────────────────────────────
echo ""
echo "▶ Phase 4: Validating Infrastructure..."

# Update Nginx config
TMP_NGINX_CONF="$(mktemp)"
NGINX_TEMPLATE="$DEPLOY_DIR/nginx.conf"
if [ -n "$TLS_CERT_DIR" ] \
  && [ -f "$TLS_CERT_DIR/fullchain.pem" ] \
  && [ -f "$TLS_CERT_DIR/privkey.pem" ]; then
    NGINX_TEMPLATE="$DEPLOY_DIR/nginx-ssl.conf"
    TLS_STATUS="enabled ($PUBLIC_DNS)"
fi
sed \
  -e "s/__SERVER_NAMES__/$SERVER_NAMES/g" \
  -e "s/__TLS_HOSTNAME__/$PUBLIC_DNS/g" \
  "$NGINX_TEMPLATE" > "$TMP_NGINX_CONF"

if [ -d "/etc/nginx/conf.d" ]; then
    # Disable distro default site to avoid `server_name _` conflicts.
    if [ -f "/etc/nginx/conf.d/default.conf" ]; then
        sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled
    fi
    sudo cp "$TMP_NGINX_CONF" /etc/nginx/conf.d/home4u.conf
elif [ -d "/etc/nginx/sites-available" ]; then
    sudo cp "$TMP_NGINX_CONF" /etc/nginx/sites-available/home4u
    sudo ln -sf /etc/nginx/sites-available/home4u /etc/nginx/sites-enabled/home4u
fi
rm -f "$TMP_NGINX_CONF"

sudo nginx -t && sudo systemctl reload nginx
echo "  ✓ Nginx re-orchestrated (server_name: $SERVER_NAMES, TLS: $TLS_STATUS)"

# ── Step 5: Global Health Gate ──────────────────────────────────────
echo ""
echo "▶ Phase 5: Production Health Gate..."
MAX_RETRIES=10
for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf http://127.0.0.1:8000/health | grep -q '"status":"ok"'; then
        echo "  ✅ SYSTEM HEALTHY (Attempt $i)"
        break
    else
        if [ "$i" -eq "$MAX_RETRIES" ]; then
            echo "  ❌ SYSTEM UNSTABLE: Health Gate Timeout"
            sudo journalctl -u home4u-backend -n 20 --no-pager
            exit 1
        fi
        echo "  ⌛ Waiting for backend stabilization... ($i/$MAX_RETRIES)"
        sleep 2
    fi
done

# ── Step 6: Cleanup ────────────────────────────────────────────────
echo ""
echo "▶ Phase 6: Purging stale assets..."
# Keep last 3 releases
cd "$RELEASE_ROOT"
ls -dt 20* | tail -n +4 | xargs -r sudo rm -rf
echo "  ✓ Local cache pruned"

echo "=========================================================="
echo "  🚀 DEPLOYMENT SUCCESSFUL — Home4U is Live"
echo "  Environment: Production"
echo "  Release:     $TIMESTAMP"
echo "=========================================================="
