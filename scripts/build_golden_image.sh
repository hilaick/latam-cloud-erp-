#!/bin/bash
# Build mig_worker golden image for Huawei Cloud IMS
set -e

ERP_PROJECT_ID="${HUAWEI_PROJECT_ID}"
REGION="la-north-2"
WORKER_FLAVOR="x0.4u.8g"
BASE_IMAGE_NAME="Ubuntu 22.04 server 64bit"
IMAGE_NAME="mig_worker_golden_v1_$(date +%Y%m%d)"

echo "Building golden image: $IMAGE_NAME"

echo "[1/5] Launching base ECS..."
INSTANCE_ID=$(hcloud ecs create --name "${IMAGE_NAME}-build" \
  --flavor "$WORKER_FLAVOR" --image-name "$BASE_IMAGE_NAME" \
  --vpc-name "mgmt-vpc-351a" --subnet-id "5889167e-a1ca-495f-81f2-927a23e160e8" \
  --security-group "Sys-default" --bandwidth 100 --password "${WORKER_PASSWORD}" \
  --format json | jq -r '.server.id')
hcloud ecs wait "$INSTANCE_ID" --state ACTIVE
EIP=$(hcloud eip list --bind-instance "$INSTANCE_ID" --format json | jq -r '.publicips[0].public_ip_address')
echo "  Instance: $INSTANCE_ID  EIP: $EIP"

echo "[2/5] Installing tools..."
ssh -o StrictHostKeyChecking=no root@$EIP 'bash -s' << 'EOF'
apt-get update -qq && apt-get install -y jq redis-tools netcat-openbsd wget -qq
pip3 install huaweicloudsdkcore huaweicloudsdkecs huaweicloudsdkvpc huaweicloudsdkims huaweicloudsdksms huaweicloudsdkdcs -q
curl -sSL "https://hwcloudcli.obs.cn-north-1.myhuaweicloud.com/cli/latest/hcloud_install.sh" -o /tmp/hcloud_install.sh && bash /tmp/hcloud_install.sh -y
wget -qO /tmp/obsutil.tar.gz "https://obs-community.obs.${REGION}.myhuaweicloud.com/obsutil/current/obsutil_linux_amd64.tar.gz" && tar xzf /tmp/obsutil.tar.gz -C /usr/local/bin/ && chmod +x /usr/local/bin/obsutil
EOF
echo "  Tools installed"

echo "[3/5] Stopping for imaging..."
hcloud ecs stop "$INSTANCE_ID" && hcloud ecs wait "$INSTANCE_ID" --state SHUTOFF

echo "[4/5] Creating private image..."
IMAGE_ID=$(hcloud ims create-image --name "$IMAGE_NAME" --instance-id "$INSTANCE_ID" \
  --description "mig_worker golden image: KooCLI, SDKs, obsutil, redis-shake" --format json | jq -r '.id')
echo "  Image ID: $IMAGE_ID"

echo "[5/5] Sharing to target project..."
TARGET_PROJECT="${1}"
hcloud ims share-image "$IMAGE_ID" --target-project "$TARGET_PROJECT"
echo "  Shared to $TARGET_PROJECT"

echo "DONE: Golden image $IMAGE_ID ready, shared to $TARGET_PROJECT"
