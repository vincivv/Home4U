#!/bin/bash

# Home4U Quick Fix Script
# Run this on your EC2 instance to fix nginx and restart services

set -e

APP_ROOT="${HOME4U_APP_ROOT:-/opt/home4u}"

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

echo "=== Home4U Quick Fix Script ==="

# Navigate to project directory
cd "$APP_ROOT/application" 2>/dev/null || {
    echo "ERROR: Could not find project directory. Please navigate to your project first."
    exit 1
}

echo "Project directory: $(pwd)"

# Step 1: Check if backend is running
echo ""
echo "[1/5] Checking backend status..."
if pgrep -f "uvicorn.*main:app" > /dev/null; then
    echo "Backend is already running"
else
    echo "Starting backend..."
    cd backend
    source .venv/bin/activate
    nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
    cd ..
    sleep 2
    echo "Backend started"
fi

# Step 2: Test backend directly
echo ""
echo "[2/5] Testing backend..."
if curl -s http://localhost:8000/ > /dev/null; then
    echo "Backend is responding at http://localhost:8000"
else
    echo "ERROR: Backend is not responding"
    cat /tmp/backend.log
    exit 1
fi

# Step 3: Test API endpoint
echo ""
echo "[3/5] Testing API endpoint..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "API is accessible"
else
    echo "Warning: API health check failed, but continuing..."
fi

# Step 4: Update nginx configuration
echo ""
echo "[4/5] Updating nginx configuration..."

# Check if nginx config exists
if [ -f /etc/nginx/conf.d/home4u.conf ]; then
    echo "Updating existing nginx config..."
else
    echo "Creating new nginx config..."
    touch /etc/nginx/conf.d/home4u.conf
fi

# Write nginx config
cat > /etc/nginx/conf.d/home4u.conf << 'EOF'
server {
    listen 80;
    server_name __SERVER_NAMES__;

    # Frontend static files
    root /var/www/home4u;
    index index.html;

    # Do not cache HTML documents so clients pick up new deployments quickly.
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }

    # Serve static files (React app)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        rewrite ^/api(/.*)$ $1 break;
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy uploads
    location /uploads/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }
}
EOF

# Render dynamic server_name values and disable distro default site.
sed -i "s/__SERVER_NAMES__/$SERVER_NAMES/g" /etc/nginx/conf.d/home4u.conf
if [ -f /etc/nginx/conf.d/default.conf ]; then
    mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled
fi

# Test nginx config
nginx -t

# Restart nginx
systemctl restart nginx
echo "Nginx restarted"

# Step 5: Test the full flow
echo ""
echo "[5/5] Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost/api/auth/login \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=test@example.com&password=test123")

echo "Login response: $LOGIN_RESPONSE"

echo ""
echo "=== Fix Complete! ==="
echo ""
if [ -n "$PUBLIC_DNS" ]; then
    echo "Try accessing your site at: http://$PUBLIC_DNS"
else
    echo "Try accessing your site at your current EC2 public IP or DNS"
fi
echo ""
echo "If login still fails, inspect logs:"
echo "  journalctl -u home4u-backend -n 120 --no-pager"
