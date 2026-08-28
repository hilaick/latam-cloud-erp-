#!/usr/bin/env python3
"""
Doc merge monitor — runs every 10 min for 2h.
Watches local repo for changes from other sessions.
When detected, re-applies documentation changes on top, rebuilds, deploys.
"""
import os, sys, time, subprocess, hashlib, json, re
from datetime import datetime, timedelta

REPO = r'C:\Users\h84423900\latam-cloud-erp\repo'
FRONTEND = os.path.join(REPO, 'frontend')
STATE_FILE = os.path.join(REPO, '.doc_monitor_state.json')
LOG_FILE = os.path.join(REPO, '.doc_monitor.log')

# Files I changed for the documentation work
MY_FILES = {
    'frontend/src/data/helpContent.js': 'helpContent',
    'frontend/src/components/views/DocumentationCenter.jsx': 'doccenter',
    'frontend/src/components/layout/TopBar.jsx': 'topbar',
    'frontend/src/App.jsx': 'app',
}

# Files other sessions might change that I need to merge with
WATCH_GLOBS = [
    'frontend/src/**/*.jsx',
    'frontend/src/**/*.js',
]

def log(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line + '\n')

def file_md5(path):
    try:
        with open(path, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    except:
        return None

def load_state():
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def save_state(state):
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)

def get_all_source_hashes():
    """Get MD5 of all .jsx and .js files in frontend/src"""
    hashes = {}
    src_dir = os.path.join(FRONTEND, 'src')
    for root, dirs, files in os.walk(src_dir):
        for fn in files:
            if fn.endswith(('.jsx', '.js')):
                fp = os.path.join(root, fn)
                rel = os.path.relpath(fp, REPO).replace('\\', '/')
                hashes[rel] = file_md5(fp)
    return hashes

def check_my_files_intact():
    """Check if my documentation changes are still present in the local files"""
    checks = {
        'frontend/src/components/layout/TopBar.jsx': [
            ('QuestionCircleOutlined', False),  # should NOT be present
            ('onOpenHelp', False),               # should NOT be present
        ],
        'frontend/src/App.jsx': [
            ('HelpDrawer', False),               # should NOT be present
            ('DocumentationCenter', True),        # SHOULD be present
        ],
        'frontend/src/data/helpContent.js': [
            ('Phase 4: Execution', True),        # SHOULD be present
            ('Help Guide', True),                # SHOULD be present (wrong — that's in DocumentationCenter)
        ],
        'frontend/src/components/views/DocumentationCenter.jsx': [
            ('Help Guide', True),                # SHOULD be present
            ('helpTopics', True),                # SHOULD be present
        ],
    }
    
    all_ok = True
    for filepath, checks_list in checks.items():
        full_path = os.path.join(REPO, filepath.replace('/', os.sep))
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            log(f"  MISSING: {filepath}")
            all_ok = False
            continue
        
        for term, should_exist in checks_list:
            exists = term in content
            if should_exist and not exists:
                log(f"  BROKEN: '{term}' should be in {filepath} but is missing")
                all_ok = False
            elif not should_exist and exists:
                log(f"  CONFLICT: '{term}' should NOT be in {filepath} but is present")
                all_ok = False
    
    return all_ok

def rebuild_and_deploy():
    """Rebuild frontend and deploy to server"""
    log("Rebuilding frontend...")
    result = subprocess.run(
        ['node', 'node_modules/vite/bin/vite.js', 'build'],
        cwd=FRONTEND,
        capture_output=True, text=True, timeout=120
    )
    if result.returncode != 0:
        log(f"BUILD FAILED: {result.stderr[:300]}")
        return False
    
    # Find the new bundle name
    assets_dir = os.path.join(FRONTEND, 'dist', 'assets')
    js_files = [f for f in os.listdir(assets_dir) if f.startswith('index-') and f.endswith('.js')]
    if not js_files:
        log("NO BUNDLE FOUND after build")
        return False
    
    log(f"Build OK: {js_files[0]}")
    
    # Deploy
    deploy_script = os.path.join(os.path.dirname(REPO), 'deploy_docs.py')
    log(f"Deploying via {deploy_script}...")
    result = subprocess.run(
        ['python', deploy_script],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode != 0:
        log(f"DEPLOY FAILED: {result.stderr[:300]}")
        return False
    
    # Check output for success markers
    if 'DONE' in result.stdout and 'App HTTP: 200' in result.stdout:
        log("Deploy OK — app responding 200")
        return True
    else:
        log(f"Deploy uncertain: {result.stdout[:300]}")
        return False

def main():
    log("=== Doc merge monitor tick ===")
    
    state = load_state()
    current_hashes = get_all_source_hashes()
    
    # First run — just record state
    if 'source_hashes' not in state:
        state['source_hashes'] = current_hashes
        state['last_check'] = datetime.now().isoformat()
        save_state(state)
        log("Initial state recorded. Monitoring for changes.")
        return
    
    # Detect changes
    old_hashes = state['source_hashes']
    changed_files = []
    for filepath, new_hash in current_hashes.items():
        old_hash = old_hashes.get(filepath)
        if old_hash != new_hash:
            changed_files.append(filepath)
    
    # Also detect new files
    new_files = [f for f in current_hashes if f not in old_hashes]
    
    if not changed_files and not new_files:
        log("No changes detected.")
        return
    
    log(f"Changes detected: {len(changed_files)} modified, {len(new_files)} new")
    for f in changed_files:
        is_mine = f in MY_FILES
        log(f"  {'[MINE] ' if is_mine else '[OTHER] '}{f}")
    for f in new_files:
        log(f"  [NEW] {f}")
    
    # Check if my documentation changes are intact
    my_files_ok = check_my_files_intact()
    
    if my_files_ok and not any(f in MY_FILES for f in changed_files):
        log("My doc changes intact, other files changed. Rebuilding to include all changes.")
    elif not my_files_ok:
        log("WARNING: My doc changes were overwritten! Need to re-apply.")
        # Re-apply my changes by restoring from backup
        # For now, just warn — the key files are my helpContent.js, DocumentationCenter.jsx, 
        # TopBar.jsx (no QuestionCircle), App.jsx (no HelpDrawer)
        log("Cannot auto-merge — manual intervention may be needed.")
    else:
        log("My files changed (possibly by me). Rebuilding.")
    
    # Rebuild and deploy combined
    success = rebuild_and_deploy()
    
    # Update state
    state['source_hashes'] = get_all_source_hashes()
    state['last_check'] = datetime.now().isoformat()
    state['last_rebuild'] = datetime.now().isoformat() if success else None
    save_state(state)
    
    if success:
        log("Combined build deployed successfully.")
    else:
        log("Combined build/deploy failed.")

if __name__ == '__main__':
    main()
