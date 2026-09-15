"""
Engine Minions — lightweight subprocess workers for the orchestration engine.

1. Cloud Query Cache: shared dict across phases, avoids redundant hcloud calls.
2. Phase Pre-warmer: starts hermes agent preload for next phase at 70% of current.
3. Concurrent Phase Runner: runs independent phases in parallel threads.

Project-agnostic: no hardcoded project IDs, regions, or profiles.
"""

import json
import logging
import subprocess
import threading
import time
from collections import defaultdict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
# 1. CLOUD QUERY CACHE
# ═══════════════════════════════════════════════════════════════════

class CloudQueryCache:
    """Thread-safe cache for hcloud CLI results.
    
    Avoids redundant API calls across phases. Each query is keyed by
    (command, region, profile). TTL is 300s by default (5 min).
    """
    
    def __init__(self, ttl_seconds=300):
        self._cache = {}
        self._lock = threading.Lock()
        self._ttl = ttl_seconds
        self._stats = {'hits': 0, 'misses': 0, 'evictions': 0}
    
    def query(self, cmd_args, region=None, profile=None, timeout=20):
        """Run hcloud command with caching. Returns parsed JSON or None."""
        key = (tuple(cmd_args), region, profile)
        now = time.time()
        
        with self._lock:
            if key in self._cache:
                entry = self._cache[key]
                if now - entry['ts'] < self._ttl:
                    self._stats['hits'] += 1
                    return entry['data']
                else:
                    del self._cache[key]
                    self._stats['evictions'] += 1
        
        # Cache miss — execute
        self._stats['misses'] += 1
        full_cmd = list(cmd_args)
        if region:
            full_cmd += [f'--cli-region={region}']
        if profile:
            full_cmd += [f'--cli-profile={profile}']
        
        try:
            result = subprocess.run(
                ['hcloud'] + full_cmd,
                capture_output=True, text=True, timeout=timeout
            )
            # Parse JSON from output (hcloud may append diagnostic tables)
            raw = result.stdout or ''
            start = raw.find('{')
            if start < 0:
                start = raw.find('[')
            if start >= 0:
                depth = 0
                end = start
                for i in range(start, len(raw)):
                    if raw[i] in '[{':
                        depth += 1
                    elif raw[i] in ']}':
                        depth -= 1
                    if depth == 0:
                        end = i + 1
                        break
                data = json.loads(raw[start:end])
            else:
                data = None
        except Exception as e:
            logger.warning(f'[cache] query failed: {e}')
            data = None
        
        with self._lock:
            self._cache[key] = {'ts': now, 'data': data}
        
        return data
    
    def invalidate(self, cmd_prefix=None):
        """Invalidate entries matching a command prefix, or all."""
        with self._lock:
            if cmd_prefix is None:
                self._cache.clear()
            else:
                keys_to_remove = [
                    k for k in self._cache
                    if any(str(a).startswith(cmd_prefix) for a in k[0])
                ]
                for k in keys_to_remove:
                    del self._cache[k]
    
    def stats(self):
        with self._lock:
            return dict(self._stats)
    
    def summary(self):
        s = self.stats()
        total = s['hits'] + s['misses']
        hit_rate = f"{s['hits']/total*100:.0f}%" if total > 0 else "N/A"
        return f"cache: {s['hits']} hits / {s['misses']} misses ({hit_rate} hit rate), {s['evictions']} evictions"
    
    def prefetch_for_phase(self, phase_key, region='la-north-2', profile='internal'):
        """Pre-fetch cloud data for a phase and return as context string.
        This avoids the agent making redundant hcloud calls."""
        ctx_lines = [f"=== CACHED CLOUD STATE ({phase_key}) ==="]
        queries = {
            'PHASE_4_1': [
                (['VPC', 'ListVpcs', '--limit=20'], 'VPCs'),
                (['VPC', 'ListSubnets', '--limit=50'], 'Subnets'),
            ],
            'PHASE_4_2': [
                (['SMS', 'ListServers', '--limit=20'], 'SMS_Sources'),
            ],
            'PHASE_4_3': [
                (['ECS', 'NovaListServers', '--limit=20'], 'ECS'),
            ],
            'PHASE_4_5': [
                (['SMS', 'ListTasks', '--limit=20'], 'SMS_Tasks'),
            ],
        }
        for cmd_parts, label in queries.get(phase_key, []):
            data = self.query(cmd_parts, region=region, profile=profile)
            if data is not None:
                ctx_lines.append(f"{label}: {json.dumps(data, indent=2)[:500]}")
        if len(ctx_lines) > 1:
            ctx_lines.append("=== END CACHED STATE ===")
            return '\n'.join(ctx_lines)
        return ""


# Global cache instance (shared across all pipeline runs)
_cloud_cache = CloudQueryCache()

def get_cloud_cache():
    return _cloud_cache


# ═══════════════════════════════════════════════════════════════════
# 2. PHASE PRE-WARMER (Engine Minion)
# ═══════════════════════════════════════════════════════════════════

# Phases that can be pre-warmed while current phase is still running
PHASE_PREWARM_MAP = {  # Public alias for orchestration engine
    'PHASE_4_1': ['PHASE_4_2'],
    'PHASE_4_2': ['PHASE_4_3'],
    'PHASE_4_3': ['PHASE_4_4'],
    'PHASE_4_4': ['PHASE_4_5'],
    'PHASE_4_5': ['PHASE_4_6'],
    'PHASE_4_6': ['PHASE_4_7'],
    'PHASE_4_7': ['PHASE_4_8'],
}
_PREWARM_MAP = PHASE_PREWARM_MAP

class PhasePreWarmer:
    """Engine minion that pre-loads skills for the next phase.
    
    At 70% progress of the current phase (estimated by agent output length
    vs typical output length), starts a lightweight hermes session to
    preload skills. The session is then reused when the phase actually starts.
    
    This is NOT prompt injection — it's hermes --skills preloading so
    the model context is warm when the real phase begins.
    """
    
    # Typical output sizes per phase (chars) — used for 70% estimation
    PHASE_OUTPUT_ESTIMATES = {
        'PHASE_4_1': 3000, 'PHASE_4_2': 5000, 'PHASE_4_3': 4000,
        'PHASE_4_4': 4000, 'PHASE_4_5': 6000, 'PHASE_4_6': 5000,
        'PHASE_4_7': 3000, 'PHASE_4_8': 3000,
    }
    
    def __init__(self, log_cb=None):
        self._active = {}  # phase_key -> prewarm_thread
        self._sessions = {}  # phase_key -> session_id
        self._log = log_cb or (lambda msg: logger.info(msg))
    
    def check_and_prewarm(self, current_phase, output_so_far_len, skills_for_next):
        """Called during agent output streaming. If output exceeds 70%,
        starts pre-warming the next phase's skills."""
        
        next_phases = _PREWARM_MAP.get(current_phase, [])
        if not next_phases:
            return
        
        estimate = self.PHASE_OUTPUT_ESTIMATES.get(current_phase, 4000)
        progress = output_so_far_len / estimate if estimate > 0 else 0
        
        if progress < 0.70:
            return
        
        for next_phase in next_phases:
            if next_phase in self._active:
                continue  # Already pre-warming
            
            self._log(f'[minion:prewarm] {current_phase} at {progress:.0%} — pre-warming skills for {next_phase}')
            t = threading.Thread(
                target=self._prewarm_phase,
                args=(next_phase, skills_for_next),
                daemon=True,
                name=f'prewarm-{next_phase}',
            )
            self._active[next_phase] = t
            t.start()
    
    def _prewarm_phase(self, phase_key, skills):
        """Run hermes chat -q with --skills to warm the model context."""
        try:
            import subprocess as sp
            binary = sp.run(['which', 'hermes'], capture_output=True, text=True).stdout.strip()
            if not binary:
                binary = '/usr/local/bin/hermes'
            
            skill_str = ','.join(skills) if skills else ''
            cmd = [binary, 'chat', '-q', f'Preload skills for {phase_key}. Acknowledge.',
                   '--profile', 'default', '--model', 'glm-5.2', '--yolo']
            if skill_str:
                cmd += ['--skills', skill_str]
            cmd += ['--toolsets', 'terminal,file,web']
            
            result = sp.run(cmd, capture_output=True, text=True, timeout=120)
            self._sessions[phase_key] = True  # Mark as pre-warmed
            self._log(f'[minion:prewarm] {phase_key} skills pre-loaded ({len(result.stdout)} chars)')
        except Exception as e:
            self._log(f'[minion:prewarm] {phase_key} failed: {e}')
        finally:
            self._active.pop(phase_key, None)
    
    def is_prewarmed(self, phase_key):
        return phase_key in self._sessions
    
    def clear(self):
        self._active.clear()
        self._sessions.clear()


# ═══════════════════════════════════════════════════════════════════
# 3. CONCURRENT PHASE RUNNER
# ═══════════════════════════════════════════════════════════════════

# Phases that can run concurrently (different regions, different resources)
CONCURRENT_PHASE_GROUPS = [
    # DISABLED: concurrent phases compete for LB RPM (5-8 RPM/key),
    # causing rate-limit retries that make total time WORSE than sequential.
    # Also blocks the pipeline log during concurrent execution.
    # Keep sequential — optimize each phase via minions + cache instead.
    # {'PHASE_4_1', 'PHASE_4_2'},
]


def get_concurrent_group(phase_key):
    """If a phase is part of a concurrent group, return the group. Else None."""
    for group in CONCURRENT_PHASE_GROUPS:
        if phase_key in group:
            return group
    return None


class ConcurrentPhaseRunner:
    """Engine minion that runs independent phases in parallel.
    
    When PHASE_4_1 and PHASE_4_2 are both ready, runs them in parallel
    threads. Results are merged before advancing to PHASE_4_3.
    """
    
    def __init__(self, spawn_fn, log_cb=None):
        self._spawn_fn = spawn_fn  # (goal, context, project_id, phase, log_cb) -> (success, response, error)
        self._log = log_cb or (lambda msg: logger.info(msg))
        self._results = {}  # phase_key -> (success, response, error)
    
    def run_group(self, group, pipeline, project_id, enriched_context, phase_status_map):
        """Run all phases in the group concurrently. Returns dict of results."""
        
        threads = {}
        results = {}
        
        for phase_key in group:
            # Find the step in pipeline
            step = next((s for s in pipeline if s['phase'] == phase_key), None)
            if not step:
                continue
            if phase_key in phase_status_map and phase_status_map[phase_key] == 'completed':
                self._log(f'[concurrent] {phase_key} already completed — skipping')
                continue
            
            self._log(f'[concurrent] Starting {phase_key}: {step["label"]} in parallel')
            
            def _run(pk, s):
                try:
                    # Flask DB calls require app_context — not inherited by threads
                    from flask import current_app
                    try:
                        _app = current_app._get_current_object()
                    except RuntimeError:
                        from app import app as _app
                    with _app.app_context():
                        success, response, error = self._spawn_fn(
                            s['goal'], enriched_context, project_id, pk,
                            log_cb=lambda msg: self._log(f'[{pk}] {msg}')
                        )
                        results[pk] = (success, response, error)
                except Exception as e:
                    results[pk] = (False, '', str(e))
            
            t = threading.Thread(target=_run, args=(phase_key, step), daemon=True, name=f'phase-{phase_key}')
            threads[phase_key] = t
            t.start()
        
        # Wait for all threads
        for pk, t in threads.items():
            t.join(timeout=7200)  # 2h safety ceiling
            if t.is_alive():
                self._log(f'[concurrent] {pk} timed out after 2h')
                results.setdefault(pk, (False, '', 'Timed out after 2h'))
        
        # Report results
        for pk, (success, response, error) in results.items():
            status = 'completed' if success else 'failed'
            self._log(f'[concurrent] {pk}: {status}')
        
        return results
