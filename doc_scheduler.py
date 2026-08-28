#!/usr/bin/env python3
"""
Scheduler: runs doc_merge_monitor.py every 10 min for 2h (12 ticks).
Uses subprocess so each tick is a fresh process — no state leakage.
"""
import subprocess, sys, os, time
from datetime import datetime, timedelta

REPO = r'C:\Users\h84423900\latam-cloud-erp\repo'
MONITOR = os.path.join(REPO, 'doc_merge_monitor.py')
INTERVAL = 600  # 10 minutes
DURATION = 7200  # 2 hours
TICKS = DURATION // INTERVAL  # 12

print(f"Doc merge monitor scheduler started")
print(f"  Interval: {INTERVAL}s ({INTERVAL//60} min)")
print(f"  Duration: {DURATION}s ({DURATION//3600}h)")
print(f"  Total ticks: {TICKS}")
print(f"  Monitor script: {MONITOR}")
print()

for tick in range(1, TICKS + 1):
    now = datetime.now().strftime('%H:%M:%S')
    print(f"\n{'='*60}")
    print(f"  TICK {tick}/{TICKS} @ {now}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(
            [sys.executable, MONITOR],
            capture_output=True, text=True, timeout=120
        )
        print(result.stdout)
        if result.stderr:
            print(f"STDERR: {result.stderr[:500]}")
    except subprocess.TimeoutExpired:
        print("  TICK TIMED OUT (120s)")
    except Exception as e:
        print(f"  TICK ERROR: {e}")
    
    if tick < TICKS:
        print(f"\n  Next tick in {INTERVAL//60} minutes...")
        time.sleep(INTERVAL)

print(f"\n{'='*60}")
print(f"  Scheduler complete — {TICKS} ticks done")
print(f"{'='*60}")
