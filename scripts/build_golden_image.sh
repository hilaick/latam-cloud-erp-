#!/bin/bash
# Build mig_worker golden image for Huawei Cloud IMS
# VERIFIED Sep 2026 (KooCLI 7.2.2) — replaces earlier script that used
# non-existent verbs (ecs create / ecs wait / eip list / ims create-image).
set -e

# ── Config (override via env) ──
REGION="${REGION:-ap-southeast-3}"
PROFILE="${PROFILE:-erp-75729268-src}"
WORKER_FLAVOR="${WORKER_FLAVOR:-x1.2u.2g}"        # x0.4u.8g does NOT exist in ap-southeast-3
BASE_IMAGE_NAME="${BASE_IMAGE_NAME:-1c136556-5a40-4382-884a-eb340532dc58}"  # Ubuntu 22.04 gold (resolve per-region)
VPC_ID="${VPC_ID:-01063374-94cc-4992-988d-5e46e645e1db}"
SUBNET_ID="${SUBNET_ID:-265fbc83-9aff-4e7c-8a2f-5f4c87194335}"   # resolve per-project: hcloud VPC ListSubnets
SG_ID="${SG_ID:-2355e7d0-0eb4-4d4b-8a18-76907aba8553}"           # route: hcloud VPC ListSecurityGroups
AZ="${AZ:-ap-southeast-3e}"
IMAGE_NAME="${IMAGE_NAME:-mig_worker_golden_v1_$(date +%Y%m%d)}"

if [ -z "${WORKER_PASSWORD}" ]; then
  echo "ERROR: WORKER_PASSWORD not set (server: /root/.worker_password.env after generation)" >&2
  exit 1
fi

hcloud configure set --profile="$PROFILE" >/dev/null 2>&1

echo "Building golden image: $IMAGE_NAME (region=$REGION profile=$PROFILE)"

echo "[1/5] Launching base ECS..."
INSTANCE_JSON=$(hcloud ECS CreateServers \
  --server.name="${IMAGE_NAME}-build" --server.flavorRef="$WORKER_FLAVOR" --server.imageRef="$BASE_IMAGE_NAME" \
  --server.vpcid="$VPC_ID" --server.nics.1.subnet_id="$SUBNET_ID" \
  --server.root_volume.volumetype=SAS --server.root_volume.size=40 \
  --server.security_groups.1.id="$SG_ID" --server.availability_zone="$AZ" \
  --server.adminPass="${WORKER_PASSWORD}" --server.count=1 --server.extendparam.chargingMode=postPaid \
  --server.publicip.eip.iptype=5_bgp --server.publicip.eip.bandwidth.size=50 \
  --server.publicip.eip.bandwidth.sharetype=PER --server.publicip.eip.bandwidth.chargemode=traffic \
  --cli-region="$REGION" 2>&1)
echo "$INSTANCE_JSON"
INSTANCE_ID=$(echo "$INSTANCE_JSON" | grep -oP '"serverIds":\s*\[\s*"\K[0-9a-f-]{36}')
echo "  Instance: $INSTANCE_ID"

# Wait for ACTIVE and capture EIP (pattern: float inside addresses)
for i in $(seq 1 15); do
  DETAILS=$(hcloud ECS ShowServer --server_id="$INSTANCE_ID" --cli-region="$REGION" 2>&1)
  STATUS=$(echo "$DETAILS" | grep -oP '"status"\s*:\s*"\K\w+')
  EIP=$(echo "$DETAILS" | grep -oP '"addr"\s*:\s*"\K\d+\.\d+\.\d+\.\d+' | tail -1)
  [ "$STATUS" = "ACTIVE" ] && [ -n "$EIP" ] && break
  sleep 20
done
echo "  Status=$STATUS EIP=$EIP"

echo "[2/5] Installing tools..."
ssh -o StrictHostKeyChecking=no root@$EIP 'bash -s' << 'EOF'
apt-get update -qq && apt-get install -y jq redis-tools netcat-openbsd wget qemu-utils rsync sshpass screen tmux lvm2 parted gdisk -qq
pip3 install huaweicloudsdkcore huaweicloudsdkecs huaweicloudsdkvpc huaweicloudsdkims huaweicloudsdksms huaweicloudsdkdcs huaweicloudsdkobs huaweicloudsdkevs huaweicloudsdkelb huaweicloudsdknat huaweicloudsdkcbr huaweicloudsdkdrs huaweicloudsdkrds huaweicloudsdkdws -q
curl -sSL "https://hwcloudcli.obs.cn-north-1.myhuaweicloud.com/cli/latest/hcloud_install.sh" -o /tmp/hcloud_install.sh && bash /tmp/hcloud_install.sh -y
wget -qO /tmp/obsutil.tar.gz "https://obs-community.obs.cn-north-1.myhuaweicloud.com/obsutil/current/obsutil_linux_amd64.tar.gz" && tar xzf /tmp/obsutil.tar.gz -C /usr/local/bin/ --strip-components=1 && chmod +x /usr/local/bin/obsutil
curl -sL "https://aka.ms/downloadazcopy-v10-linux" -o /tmp/azcopy.tar.gz && tar xzf /tmp/azcopy.tar.gz -C /tmp && cp /tmp/azcopy_linux_amd64_*/azcopy /usr/local/bin/ && chmod +x /usr/local/bin/azcopy
curl -sSL "https://github.com/alibaba/RedisShake/releases/download/v4.4.2/redis-shake-v4.4.2-linux-amd64.tar.gz" -o /tmp/redis-shake.tar.gz && mkdir -p /usr/local/redis-shake && tar xzf /tmp/redis-shake.tar.gz -C /usr/local/redis-shake --strip-components=1 && ln -sf /usr/local/redis-shake/redis-shake /usr/local/bin/redis-shake
EOF
echo "  Tools installed"

echo "[3/5] Stopping for imaging (BatchStopServers — StopServer does not exist)..."
hcloud ECS BatchStopServers --os-stop.servers.1.id="$INSTANCE_ID" --os-stop.type=HARD --cli-region="$REGION" >/dev/null 2>&1
for i in $(seq 1 15); do
  STATUS=$(hcloud ECS ShowServer --server_id="$INSTANCE_ID" --cli-region="$REGION" 2>&1 | grep -oP '"status"\s*:\s*"\K\w+')
  [ "$STATUS" = "SHUTOFF" ] && break
  sleep 15
done
echo "  Status: $STATUS"

echo "[4/5] Creating private image (IMS CreateImage)..."
CREATE_OUT=$(hcloud IMS CreateImage --name="$IMAGE_NAME" --instance_id="$INSTANCE_ID" \
  --description="mig_worker golden image: azcopy, qemu-img, obsutil, KooCLI, 14x SDKs, redis-shake v4.4.2, rsync, sshpass" \
  --cli-region="$REGION" 2>&1)
echo "$CREATE_OUT"
JOB_ID=$(echo "$CREATE_OUT" | grep -oP '"job_id"\s*:\s*"\K[0-9a-f-]{36}')
echo "  Job: $JOB_ID (image id from: hcloud IMS ListImages --__imagetype=private)"

echo "[5/5] Waiting for image to become active..."
for i in $(seq 1 30); do
  IMG=$(hcloud IMS ListImages --__imagetype=private --cli-region="$REGION" 2>&1 \
        | python3 -c "import sys,json; d=json.load(sys.stdin); print('\\n'.join(i['id']+'|'+i.get('name','')+'|'+i.get('status','') for i in d.get('images',[]) if i.get('status')=='active'))" 2>/dev/null)
  echo "$IMG" | grep -q "$IMAGE_NAME" && break
  sleep 30
done
echo "DONE: Golden image $IMAGE_NAME active in $REGION (share later to any target account: hcloud IMS ShareImage)"

echo "NOTE: build ECS $INSTANCE_ID left STOPPED. Delete when done: hcloud ECS DeleteServers --servers.1.id=$INSTANCE_ID"
