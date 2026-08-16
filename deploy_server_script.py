#!/usr/bin/env python3
"""Server-side deploy script — called via SSH after deploy.tar.gz is uploaded."""
import os, sys, tarfile, subprocess, time

TARGET = '/home/huawei-cloud/latam-cloud-erp-'

def run(cmd):
    print(f'$ {cmd[:80]}')
    r = os.system(cmd)
    if r != 0: print(f'  (exit {r})')

# 1. Git pull
os.chdir(TARGET)
run('git stash -m "pre-deploy-backup"')
run('git pull origin feature-migration-lifecycle-2')
run('git stash pop 2>/dev/null')

# 2. Clear bytecode
run('find . -name "*.pyc" -delete')
run('find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null')

# 3. Extract deploy tar
run('cd /tmp && rm -rf /tmp/deploy_dist && mkdir /tmp/deploy_dist && tar xzf deploy.tar.gz -C /tmp/deploy_dist')

# 4. Deploy dist/
run(f'rm -rf {TARGET}/frontend/dist/assets/*')
run(f'cp -r /tmp/deploy_dist/dist/assets/* {TARGET}/frontend/dist/assets/')
run(f'cp /tmp/deploy_dist/dist/index.html {TARGET}/frontend/dist/index.html')

# 5. Stop + restart Flask
run('pkill -f "python3 app.py" 2>/dev/null')
time.sleep(2)

cmd = (
    f'cd {TARGET} && PYTHONDONTWRITEBYTECODE=1 '
    f'source venv/bin/activate && nohup python3 app.py --port 9119 > /tmp/flask.log 2>&1 &'
)
run(cmd)
time.sleep(2)

# 6. Verify
run(f'ls -la {TARGET}/frontend/dist/assets/index-*.js')
run(f'curl -s http://localhost:9119/ | grep -oE "index-[^.]+")

print('Done!')
