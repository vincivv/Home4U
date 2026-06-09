#!/bin/bash

# Home4U AWS Deployment Setup Script
# Run this on your EC2 instance as sudo

set -euo pipefail

ENV_DIR="/etc/home4u"
ENV_FILE="$ENV_DIR/home4u.env"
APP_ROOT="${HOME4U_APP_ROOT:-/opt/home4u}"
DEPLOY_USER="${HOME4U_DEPLOY_USER:-home4u}"
UPLOAD_DIR="${HOME4U_UPLOAD_DIR:-/var/lib/home4u/uploads}"

require_production_environment() {
  if ! sudo test -s "$ENV_FILE" || ! sudo grep -Eq '^[[:space:]]*HOME4U_SECRET_KEY=.+' "$ENV_FILE"; then
    echo "FATAL: $ENV_FILE is missing HOME4U_SECRET_KEY."
    echo "Create the file and add a long random secret before continuing with production bootstrap."
    exit 1
  fi
  if ! sudo grep -Eq '^[[:space:]]*DATABASE_URL=postgresql(\+psycopg2?)?://' "$ENV_FILE"; then
    echo "FATAL: $ENV_FILE is missing a PostgreSQL DATABASE_URL."
    echo "Add DATABASE_URL=postgresql+psycopg://user:password@host:5432/home4u before continuing."
    exit 1
  fi
}

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

echo "=== Home4U Deployment Script ==="

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "FATAL: run this script with sudo."
  exit 1
fi

# Update and install dependencies
echo "[1/8] Updating system..."
apt-get update && apt-get upgrade -y

# Install Python and pip (if not installed)
echo "[2/8] Installing Python dependencies..."
apt-get install -y ca-certificates curl git nginx python3 python3-pip python3-venv

# Install Node.js (for building frontend)
echo "[3/8] Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$DEPLOY_USER"
fi

# Navigate to app directory
cd "$APP_ROOT"
mkdir -p "$ENV_DIR" "$UPLOAD_DIR"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$UPLOAD_DIR"
require_production_environment

# Set up Python virtual environment for backend
echo "[4/8] Setting up Python virtual environment..."
cd application/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Apply database migrations, then seed demo data when appropriate
echo "[5/8] Migrating and seeding database..."
HOME4U_ENV=production ./run_migrations.sh upgrade head
HOME4U_ENV=production python seed.py
deactivate

# Build frontend
echo "[6/8] Building frontend..."
cd ../frontend
npm install
npm run build

# Copy frontend build to /var/www/home4u
echo "[6b/8] Deploying frontend to /var/www/home4u..."
mkdir -p /var/www/home4u
cp -r dist/* /var/www/home4u/

# Create nginx configuration
echo "[7/8] Configuring nginx..."
cat > /tmp/home4u_nginx.conf << 'EOF'
server {
    listen 80;
    server_name __SERVER_NAMES__;

    # Frontend static files (from /var/www/home4u)
    root /var/www/home4u;
    index index.html;

    # Do not cache HTML documents so clients pick up new deployments quickly.
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }

    # Serve React app static files - try files first, fallback to index.html
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Serve React app - fallback to index.html for SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # /api/* -> strip /api and forward to FastAPI backend.
    location /api/ {
        rewrite ^/api(/.*)$ $1 break;
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Render dynamic server_name values
sed -i "s/__SERVER_NAMES__/$SERVER_NAMES/g" /tmp/home4u_nginx.conf

# Copy nginx config (Amazon Linux path)
cp /tmp/home4u_nginx.conf /etc/nginx/conf.d/home4u.conf

# Test nginx config
nginx -t

# Restart nginx
systemctl restart nginx
systemctl enable nginx

# Create systemd service for backend
echo "[8/8] Creating systemd service for backend..."
cp "$APP_ROOT/application/deployment/home4u-backend.service" /etc/systemd/system/home4u-backend.service

# Enable and start backend service
systemctl daemon-reload
systemctl enable home4u-backend
systemctl start home4u-backend
systemctl status home4u-backend

echo "=== Deployment Complete! ==="
if [ -z "$PUBLIC_DNS" ]; then
  echo "Frontend should be available at your current EC2 public DNS or IP"
  echo "Proxied API base is available at http://<your-host>/api"
  echo "Health check is available at http://<your-host>/health"
else
  echo "Frontend should be available at http://$PUBLIC_DNS"
  echo "Proxied API base is at http://$PUBLIC_DNS/api"
  echo "Health check is at http://$PUBLIC_DNS/health"
fi
