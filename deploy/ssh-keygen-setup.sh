#!/usr/bin/env bash
# =============================================================================
# ssh-keygen-setup.sh — SSH key setup for passwordless deploy
# =============================================================================
# Run this LOCALLY once to set up key-based SSH auth with the server.
# =============================================================================

set -euo pipefail

SERVER_USER="root"
SERVER_HOST="85.198.64.93"
SERVER_PORT="22"
KEY_PATH="${HOME}/.ssh/id_rsa_livegrid"

echo "========================================"
echo " SSH Key Setup for livegrid.ru deploy"
echo "========================================"

# 1. Generate SSH key (if not already present)
if [ ! -f "${KEY_PATH}" ]; then
    echo "[1/3] Generating SSH key..."
    ssh-keygen -t rsa -b 4096 -C "deploy@livegrid.ru" -f "${KEY_PATH}" -N ""
    echo "      Key created: ${KEY_PATH}"
else
    echo "[1/3] SSH key already exists: ${KEY_PATH}"
fi

# 2. Copy public key to server
echo "[2/3] Copying public key to server (you may be prompted for password)..."
ssh-copy-id -i "${KEY_PATH}.pub" -p "${SERVER_PORT}" "${SERVER_USER}@${SERVER_HOST}"

# 3. Test connection
echo "[3/3] Testing SSH connection..."
ssh -i "${KEY_PATH}" -p "${SERVER_PORT}" -o StrictHostKeyChecking=accept-new \
    "${SERVER_USER}@${SERVER_HOST}" "echo 'SSH connection successful!'"

echo ""
echo "========================================"
echo " Done! Add this to your local .env:"
echo "   DEPLOY_SSH_KEY=${KEY_PATH}"
echo "========================================"
