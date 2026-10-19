#!/bin/bash
set -e

if [ "$EUID" -ne 0 ]; then
    echo "Please run this installer as root."
    echo "  Use the one-time installer URL returned when creating a server."
    exit 1
fi

APP_DIR="/etc/parrot-status"
BASE_URL="https://raw.githubusercontent.com/formalParrot/status/refs/heads/main"

echo "Checking for Node.js..."

if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is not installed. Installing..."

    sudo apt update
    sudo apt install -y nodejs npm
else
    echo "Node.js is already installed: $(node --version)"
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "npm is missing. Installing..."
    sudo apt install -y npm
fi

echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"

echo "Creating $APP_DIR"
mkdir -p "$APP_DIR"

echo "Downloading server script"
curl -fsSL "$BASE_URL/agent/serverScript.js" -o "$APP_DIR/agent.js"

cd "$APP_DIR"

echo "Installing dependencies"
npm install dotenv

echo
echo "Configuring heartbeat agent"
SERVER_ID="__SERVER_ID__"
SERVER_TOKEN="__SERVER_TOKEN__"
HEARTBEAT_URL="__HEARTBEAT_URL__"

if [[ "$SERVER_ID" == "__SERVER_ID__" || "$SERVER_TOKEN" == "__SERVER_TOKEN__" || "$HEARTBEAT_URL" == "__HEARTBEAT_URL__" ]]; then
    echo "Installer token data is missing or invalid."
    exit 1
fi

cat > "$APP_DIR/.env" <<EOF
SERVER_ID=$SERVER_ID
SERVER_TOKEN=$SERVER_TOKEN
HEARTBEAT_URL=$HEARTBEAT_URL
EOF

chmod 600 "$APP_DIR/.env"

echo
PM2_USER="${SUDO_USER:-}"
if [[ -z "$PM2_USER" || "$PM2_USER" == "root" ]]; then
    echo "SUDO_USER is not set. Run this installer with sudo from the account that should run Parrot Status."
    exit 1
fi

if ! id "$PM2_USER" >/dev/null 2>&1 || [[ "$PM2_USER" == "root" ]]; then
    echo "User '$PM2_USER' does not exist or cannot be root."
    exit 1
fi

PM2_HOME="$(getent passwd "$PM2_USER" | cut -d: -f6)/.pm2"

echo "Granting $PM2_USER access to the agent config..."
chown "$PM2_USER" "$APP_DIR/.env"

echo "Installing PM2..."
npm install -g pm2

echo "Starting agent as $PM2_USER..."
runuser -u "$PM2_USER" -- env PM2_HOME="$PM2_HOME" pm2 delete parrot-status >/dev/null 2>&1 || true
runuser -u "$PM2_USER" -- env PM2_HOME="$PM2_HOME" pm2 start "$APP_DIR/agent.js" --name parrot-status

echo "Saving PM2 process..."
runuser -u "$PM2_USER" -- env PM2_HOME="$PM2_HOME" pm2 save

echo "Configuring PM2 startup..."
env PATH="$PATH:/usr/bin" pm2 startup systemd \
    -u "$PM2_USER" \
    --hp "$(getent passwd "$PM2_USER" | cut -d: -f6)"

cat > /usr/local/bin/parrot-status <<EOF
#!/bin/bash
set -e

if [ "\$EUID" -ne 0 ]; then
    echo "Please run this command as root: sudo parrot-status uninstall"
    exit 1
fi

case "\${1:-}" in
    uninstall)
        echo "Stopping Parrot Status..."
        runuser -u "$PM2_USER" -- env PM2_HOME="$PM2_HOME" pm2 delete parrot-status >/dev/null 2>&1 || true
        runuser -u "$PM2_USER" -- env PM2_HOME="$PM2_HOME" pm2 save >/dev/null 2>&1 || true
        rm -rf "$APP_DIR"
        rm -f /usr/local/bin/parrot-status
        echo "Parrot Status uninstalled."
        ;;
    *)
        echo "Usage: sudo parrot-status uninstall"
        exit 1
        ;;
esac
EOF
chmod 755 /usr/local/bin/parrot-status

echo
echo "PM2 setup complete."
echo "Uninstall with: sudo parrot-status uninstall"
echo
echo "Installed."
