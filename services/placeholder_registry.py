"""
Placeholder resolution registry + post-create reference chaining.

Cross-project mechanism: every <placeholder> in a plan step gets resolved by
ONE of three strategies:
  - 'context': read from project data / executionContext (deterministic)
  - 'chain':   read from the OUTPUT of a previous step (parsed via regex extractor)
  - 'env':     inject via environment, NEVER in the command string (secrets)
  - 'plan':    value must come from the plan itself (region, image, etc.)
Any placeholder that cannot resolve → step reports 'blocked' → agent lane.

This registry replaces ad-hoc placeholder handling so ANY new project's plan
resolves the same way.
"""
import json
import logging
import re

logger = logging.getLogger(__name__)

# ── Chain extractors: step action -> (output regex, capture group) ──
# After a step runs, its stdout is scanned with these regexes to produce
# values that later steps consume via <placeholder>.
CHAIN_EXTRACTORS = {
    'CREATE_VPC':     [(r'"(id|vpc_id)"\s*:\s*"([0-9a-f-]{36})"', 2), (r'vpc_id["\']?\s*[:=]\s*["\']?([0-9a-f-]{36})', 1)],
    'CREATE_SUBNET':  [(r'"(id|subnet_id)"\s*:\s*"([0-9a-f-]{36})"', 2), (r'subnet_id["\']?\s*[:=]\s*["\']?([0-9a-f-]{36})', 1)],
    'CREATE_SG':      [(r'"(id|security_group_id)"\s*:\s*"([0-9a-f-]{36})"', 2), (r'security_group_id["\']?\s*[:=]\s*["\']?([0-9a-f-]{36})', 1)],
    'CREATE_TARGET_ECS': [(r'"(id|server_id)"\s*:\s*"([0-9a-f-]{36})"', 2), (r'server_id["\']?\s*[:=]\s*["\']?([0-9a-f-]{36})', 1)],
    'SMS_TASK_CREATE': [(r'"(id|task_id)"\s*:\s*"([0-9a-f-]{32,36})"', 2), (r'task_id["\']?\s*[:=]\s*["\']?([0-9a-f-]{32,36})', 1)],
}

# ── Placeholder registry: placeholder -> resolution strategy + source key ──
PLACEHOLDER_REGISTRY = {
    # context-based (project data / executionContext)
    'source_ip':   ('context', 'source_ip'),
    'src_id':      ('context', 'src_id'),
    'sms_id':      ('context', 'sms_id'),
    'project_id':  ('context', 'mig_project_id'),
    'mig_project_id': ('context', 'mig_project_id'),
    'profile':     ('context', 'profile'),
    'DISCOVERED_FLAVOR': ('context', 'flavor'),
    'vpc_id':      ('chain', 'CREATE_VPC'),
    'subnet_id':   ('chain', 'CREATE_SUBNET'),
    'sg_id':       ('chain', 'CREATE_SG'),
    'ecs_id':      ('chain', 'CREATE_TARGET_ECS'),
    'task_id':     ('chain', 'SMS_TASK_CREATE'),
    # secrets — NEVER in command; env injection marker
    'AK':   ('env', 'ak'),
    'SK':   ('env', 'sk'),
    'ak':   ('env', 'ak'),
    'sk':   ('env', 'sk'),
    'source_ak': ('env', 'source_ak'),
    'source_sk': ('env', 'source_sk'),
    # plan-provided (region, image, keypair...) — must come from plan/project
    'REGION':           ('plan', 'region'),
    'CLUSTER_ID':       ('plan', ''),
    'KEYPAIR_NAME':     ('plan', 'keypair_name'),
    'SSH_PUBLIC_KEY':   ('plan', 'ssh_public_key'),
    'IMAGE_NAME':       ('plan', 'image_name'),
    'SOURCE_IMAGE':     ('plan', 'source_image'),
    'SWR_NAMESPACE':    ('plan', 'swr_namespace'),
    'TAG':              ('plan', 'tag'),
    'USER':             ('plan', 'user'),
}


def extract_chained_values(action, stdout):
    """Parse step stdout into {placeholder_key: value} using CHAIN_EXTRACTORS."""
    out = {}
    for pattern, group in CHAIN_EXTRACTORS.get(action, []):
        try:
            m = re.search(pattern, stdout or '')
            if m:
                out[action] = m.group(group)
                break
        except Exception:
            continue
    return out


def classify_placeholder(ph):
    """Return (strategy, source) for a placeholder token (e.g. '<vpc_id>')."""
    key = ph.strip('<>')
    return PLACEHOLDER_REGISTRY.get(key, ('plan', key))
