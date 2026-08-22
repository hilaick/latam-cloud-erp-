#!/usr/bin/env python3
"""
Install SMS agent on source server via SSH from the live server.
Uses screen + printf to handle the interactive startup.sh prompts.

Usage: python3 install_sms_agent.py
"""
import os, sys, subprocess, time

# Source VM connection details
SOURCE_IPS = os.environ.get('SOURCE_IPS', '').split(',')
SOURCE_PASSWORD = os.environ.get('SOURCE_PASSWORD', '')
AK = os.environ.get('SOURCE_AK', '')
SK = os.environ.get('SOURCE_SK', '')
SMS_ENDPOINT = os.environ.get('SMS_ENDPOINT', 'sms.ap-southeast-3.myhuaweicloud.com')
AGENT_URL = os.environ.get('AGENT_URL', 'https://sms-resource-intl-ap-southeast-3.obs.ap-southeast-3.myhuaweicloud.com/SMS-Agent.tar.gz')

if not all([SOURCE_IPS, SOURCE_PASSWORD, AK, SK]):
    print('ERROR: Set SOURCE_IPS, SOURCE_PASSWORD, SOURCE_AK, SOURCE_SK environment variables')
    sys.exit(1)

for ip in SOURCE_IPS:
    ip = ip.strip()
    if not ip:
        continue
    print(f'\n=== Installing SMS agent on {ip} ===')

    # Download agent
    print('  Downloading agent...')
    subprocess.run(['sshpass', '-p', SOURCE_PASSWORD, 'ssh', '-o', 'StrictHostKeyChecking=no',
                    '-o', 'ConnectTimeout=15', f'root@{ip}',
                    f'wget -q -t 3 -T 15 -O /tmp/SMS-Agent.tar.gz {AGENT_URL} && ls -la /tmp/SMS-Agent.tar.gz'],
                   timeout=120)

    # Extract
    print('  Extracting...')
    subprocess.run(['sshpass', '-p', SOURCE_PASSWORD, 'ssh', '-o', 'StrictHostKeyChecking=no',
                    '-o', 'ConnectTimeout=15', f'root@{ip}',
                    'cd /opt && tar xzf /tmp/SMS-Agent.tar.gz && ls /opt/SMS-Agent/'],
                   timeout=60)

    # Start agent in screen with piped stdin
    print('  Starting agent...')
    start_cmd = f"""screen -wipe 2>/dev/null; screen -dmS sms_agent bash -c "printf 'y\\n{AK}\\n{SK}\\n{SMS_ENDPOINT}\\n\\n\\ny\\ny\\nn\\n' | bash /opt/SMS-Agent/startup.sh > /tmp/agent.log 2>&1" """
    subprocess.run(['sshpass', '-p', SOURCE_PASSWORD, 'ssh', '-o', 'StrictHostKeyChecking=no',
                    '-o', 'ConnectTimeout=15', f'root@{ip}', start_cmd],
                   timeout=30)

    # Wait for registration
    print('  Waiting 30s for registration...')
    time.sleep(30)

    # Verify
    result = subprocess.run(['sshpass', '-p', SOURCE_PASSWORD, 'ssh', '-o', 'StrictHostKeyChecking=no',
                             '-o', 'ConnectTimeout=15', f'root@{ip}',
                             'pgrep -af linuxmain || echo NO_AGENT'],
                            capture_output=True, text=True, timeout=15)
    if 'linuxmain' in result.stdout:
        print(f'  ✅ Agent running on {ip}')
    else:
        print(f'  ❌ Agent NOT running on {ip}')
        print(f'     Log: {result.stdout[:200]}')

print('\n=== DONE ===')
