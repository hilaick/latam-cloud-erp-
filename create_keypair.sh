#!/bin/bash
# Create SSH key pair for mig_worker
KEY_NAME="mig-worker-key"
KEY_FILE="$HOME/.ssh/mig-worker-key.pem"

if [ ! -f "$KEY_FILE" ]; then
    echo "Creating SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f "$KEY_FILE" -N "" -C "mig-worker-key"
    chmod 400 "$KEY_FILE"
    echo "✅ Key pair created: $KEY_FILE"
else
    echo "✅ Key pair already exists: $KEY_FILE"
fi

# Import to Huawei Cloud
echo "Importing key pair to Huawei Cloud..."
hcloud ECS ImportKeypair --cli-region=af-south-1 \
    --keypair_name="mig-worker-key" \
    --public_key="$(cat ${KEY_FILE}.pub)"
