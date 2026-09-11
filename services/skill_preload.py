"""
Phase-specific skill preloading for pipeline agents.

The orchestration spawn uses --toolsets terminal,file, which strips the
skill_view tool. Agents then see only skill NAME+description in the prompt
and cannot load the actual runbook/commands. This module maps each pipeline
phase to the skills that contain its proven commands (ERP server skill tree
at /root/.hermes/skills/<category>/<name>/), and the spawner passes them via
--skills so the FULL skill content is injected into the agent session.

Names verified 2026-09-11 against /root/.hermes/skills/devops/ listing.
"""

_PHASE_SKILLS = {
    'PHASE_4_1': [  # Network fabric: VPC/SG/EIP
        'huawei-cloud-operations',
    ],
    'PHASE_4_2': [  # Source Prep: SMS agents + migration project
        'huawei-cloud-sms-migration',
        'huawei-cloud-sms-api-only',
        'huawei-cloud-sms-migration-exact-disk-config',
        'huawei-cloud-sms-0515-fix',
        'sms-dev-session-lessons-2026-09-04',
        'sms-migration-linux-pattern',
    ],
    'PHASE_4_3': [  # Target: ECS + EIP + target config
        'huawei-cloud-sms-migration',
        'huawei-cloud-sms-migration-exact-disk-config',
        'huawei-cloud-eip-billing-region-pitfalls',
        'huawei-cloud-sms-0515-fix',
        'sms-error-codes-troubleshooting',
        'huawei-cloud-sms-api-only',
    ],
    'PHASE_4_4': [  # Data Sync: SMS tasks, disk mapping
        'huawei-cloud-sms-migration',
        'huawei-cloud-sms-migration-exact-disk-config',
        'huawei-cloud-sms-api-only',
        'huawei-cloud-sms-0515-fix',
        'sms-error-codes-troubleshooting',
    ],
    'PHASE_4_5': [  # Monitor
        'huawei-cloud-sms-migration',
        'sms-migration-automatic-retry-monitor',
        'huawei-cloud-health-monitor',
    ],
    'PHASE_4_6': [  # Cutover
        'huawei-cloud-sms-migration',
        'huawei-cloud-eip-billing-region-pitfalls',
        'huawei-cloud-sms-0515-fix',
        'sms-error-codes-troubleshooting',
    ],
    'PHASE_4_7': [  # Teardown / post-migration
        'linux-system-recovery',
        'huawei-cloud-operations',
    ],
}

_FALLBACK_SKILLS = [
    'erp-execution-orchestration',
    'huawei-cloud-migration-workflow',
]


def skills_for_phase(phase_key):
    """Return the list of skill names to preload for a pipeline phase."""
    skills = list(_PHASE_SKILLS.get(phase_key, []))
    seen = set(skills)
    for s in _FALLBACK_SKILLS:
        if s not in seen:
            skills.append(s)
            seen.add(s)
    return skills
