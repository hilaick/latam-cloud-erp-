#!/bin/bash
# Accept shared image and launch mig_worker in customer project
set -e

TARGET_PROJECT="${1}"
SOURCE_IMAGE="${2}"
WORKER_NAME="${3:-mig_worker}"
FLAVOR="${4:-x0.4u.8g}"
SUBNET="${5}"
SG="${6:-Sys-default}"

echo "Accepting image $SOURCE_IMAGE in project $TARGET_PROJECT..."
hcloud ims accept-shared-image "$SOURCE_IMAGE"
LOCAL_IMAGE=$(hcloud ims list --name "$SOURCE_IMAGE" --project-id "$TARGET_PROJECT" --format json | jq -r '.images[0].id')
echo "  Local image ID: $LOCAL_IMAGE"

echo "Launching worker $WORKER_NAME..."
INSTANCE=$(hcloud ecs create --name "$WORKER_NAME" --image-id "$LOCAL_IMAGE" \
  --flavor "$FLAVOR" --subnet-id "$SUBNET" --security-group "$SG" \
  --bandwidth 100 --password "${WORKER_PASSWORD}" --format json)
hcloud ecs wait $(echo $INSTANCE | jq -r '.server.id') --state ACTIVE
EIP=$(hcloud eip list --bind-instance $(echo $INSTANCE | jq -r '.server.id') --format json | jq -r '.publicips[0].public_ip_address')
echo "  Worker: $EIP"

# Register to ERP
curl -s -X POST "http://159.138.148.45:9119/api/delegation/register-worker" \
  -H "Content-Type: application/json" \
  -d "{\"ip\": \"$EIP\", \"hostname\": \"$WORKER_NAME\", \"project_id\": \"$TARGET_PROJECT\", \"image_id\": \"$LOCAL_IMAGE\"}"
echo "Registered to ERP"
