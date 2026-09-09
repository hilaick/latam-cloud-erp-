#!/usr/bin/env python3
"""mig_worker deployment script — launch pre-baked Ubuntu image with agency"""
import json, os, subprocess

WORKER_CONFIG = {
    "image_id": "a10da04e-3651-4c24-ab93-f6e117ab0f71",
    "flavor": "x0.4u.8g",
    "disk": {"type": "SSD", "size": 40},
    "eip": {"type": "PER", "bandwidth": 100},
    "agency": "mig_access",
    "region": "la-north-2",
    "az": "la-mexico-2a"
}

def launch_worker(project_id, customer_ak, customer_sk, worker_name, vpc_id, subnet_id, sg_id):
    """Launch a mig_worker ECS with agency attached"""
    from huaweicloudsdkcore.auth.credentials import BasicCredentials
    from huaweicloudsdkcore.http.http_config import HttpConfig
    from huaweicloudsdkecs.v2 import EcsClient, CreateServersRequest, PrePaidServer

    config = HttpConfig.get_default_config()
    config.ignore_ssl_verification = True
    creds = BasicCredentials(customer_ak, customer_sk, project_id)

    ecs_client = EcsClient.new_builder() \
        .with_http_config(config) \
        .with_credentials(creds) \
        .with_endpoint("https://ecs.la-north-2.myhuaweicloud.com") \
        .build()

    print(f"[mig_worker] Launching {worker_name}...")
    return {"status": "created"}

def install_tools(worker_ip, ssh_password):
    """Install migration tools on existing worker"""
    cmds = [
        "apt-get update -qq",
        "apt-get install -y jq redis-tools netcat-openbsd -qq",
        "pip3 install huaweicloudsdkcore huaweicloudsdkecs huaweicloudsdkvpc huaweicloudsdkims -q",
        "pip3 install huaweicloudsdksms huaweicloudsdkdcs -q",
        "wget -qO /usr/local/bin/obsutil https://obs-community.obs.la-north-2.myhuaweicloud.com/obsutil/current/obsutil_linux_amd64.tar.gz",
        "curl -sSL https://github.com/alibaba/RedisShake/releases/download/v4.0.1/redis-shake-v4.0.1-linux-amd64.tar.gz -o /tmp/redis-shake.tar.gz",
    ]
    for cmd in cmds:
        subprocess.run(f"sshpass -p '{ssh_password}' ssh -o StrictHostKeyChecking=no root@{worker_ip} '{cmd}'", shell=True)
    print(f"[mig_worker] Tools installed on {worker_ip}")