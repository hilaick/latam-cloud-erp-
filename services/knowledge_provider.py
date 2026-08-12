"""
External Knowledge Store + Knowledge Provider
----------------------------------------------
Three-source federated knowledge for migration decision-making:

  Source 1 — SKILLS (SkillRegistry, curated, priority 1)
  Source 2 — EXTERNAL (GitHub SKILL.md repo, community, priority 2)
  Source 3 — HISTORY (ExecutionHistoryStore, empirical, priority 3)
"""

import os, json, time, re, shutil, subprocess, logging
from typing import List, Optional, Dict
from datetime import datetime

import yaml

logger = logging.getLogger(__name__)

# ── External repo config ──────────────────────────────────────────
EXTERNAL_REPO_URL = "https://github.com/binrogithub/1-3-Cloud-Adoption-Skills.git"
EXTERNAL_REPO_BASE_PATH = "AI-Assist-Migration"
EXTERNAL_CACHE_DIR = os.path.expanduser("~/.hermes/knowledge-cache/1-3-Cloud-Adoption-Skills")


class ExternalKnowledgeStore:
    """Sync and query external migration knowledge from a SKILL.md repository.

    Sources from: https://github.com/binrogithub/1-3-Cloud-Adoption-Skills
    Path: AI-Assist-Migration/

    Categories:
      - Virtual-Machine-Migration/   (SMS, MGC, VMware → Huawei)
      - Database-Migration/          (DRS, PostgreSQL, Big Data)
      - Cloud-to-Cloud-Migration/    (AWS → Huawei patterns)
      - Container-Migration/         (K8s, Docker)
      - Object-Migration/            (OBS, S3 → OBS)
      - Cloud-Foundation/            (Landing Zone, IaC, IAM)
      - Workspace-Migration/         (VDI, Workspace)
    """

    _entries: list = []
    _initialized: bool = False
    _last_sync: Optional[str] = None
    _sync_interval_hours: int = 6

    # ── Public API ──────────────────────────────────────────────────

    @classmethod
    def initialize(cls, force_sync: bool = False):
        """Load cached entries. Sync from GitHub if cache is stale or missing."""
        if cls._initialized and not force_sync:
            return

        cache_file = os.path.join(EXTERNAL_CACHE_DIR, ".entries.json")
        need_sync = True

        if os.path.exists(cache_file):
            try:
                mtime = os.path.getmtime(cache_file)
                age_hours = (time.time() - mtime) / 3600
                if age_hours < cls._sync_interval_hours and not force_sync:
                    with open(cache_file, "r", encoding="utf-8") as f:
                        cls._entries = json.load(f)
                    cls._last_sync = datetime.fromtimestamp(mtime).isoformat()
                    need_sync = False
                    logger.info(
                        "[ExternalKnowledge] Loaded %d cached entries (age: %.1fh)",
                        len(cls._entries), age_hours
                    )
            except Exception:
                pass

        if need_sync:
            cls._sync_from_github()
            cls._save_cache(cache_file)

        cls._initialized = True

    @classmethod
    def query(cls, profile: dict, mapper_node: dict) -> list:
        """Query external knowledge for matching entries by OS, role, region.

        Returns list of KnowledgeEntry dicts sorted by relevance_score.
        """
        cls.initialize()
        results = []
        server_os = (mapper_node.get("os") or profile.get("os") or "").lower()
        server_role = mapper_node.get("role") or profile.get("role", "")
        region = mapper_node.get("region", "")

        for entry in cls._entries:
            score = 0.0
            reasons = []

            # OS match (highest weight)
            entry_os_list = [o.lower() for o in entry.get("os_support", [])]
            if any(o in server_os for o in entry_os_list):
                score += 0.30
                reasons.append(f"os:{server_os}")
            elif "linux" in entry_os_list and "linux" in server_os:
                score += 0.15
                reasons.append("os_broad:linux")

            # Migration type match
            if entry.get("migration_type") in ("sms", "image", "mgc", "general"):
                score += 0.10
                reasons.append(f"type:{entry['migration_type']}")

            # Role match
            if server_role and server_role.lower() in entry.get("description", "").lower():
                score += 0.10
                reasons.append(f"role:{server_role}")

            # Region relevance
            if region and region.lower() in entry.get("description", "").lower():
                score += 0.05
                reasons.append(f"region:{region}")

            # Has specific error code knowledge (valuable for troubleshooting)
            if entry.get("failure_modes"):
                score += 0.10
                reasons.append("has_error_codes")

            if score > 0.0:
                results.append({
                    **entry,
                    "relevance_score": round(score, 3),
                    "match_reasons": reasons,
                    "confidence": round(entry.get("confidence_base", 0.75) * min(score * 2.5, 1.0), 3),
                })

        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results[:10]

    @classmethod
    def get_stats(cls) -> dict:
        """Return summary stats about the external knowledge store."""
        cls.initialize()
        categories = {}
        for e in cls._entries:
            cat = e.get("category", "unknown")
            categories[cat] = categories.get(cat, 0) + 1
        return {
            "total_entries": len(cls._entries),
            "last_sync": cls._last_sync,
            "categories": categories,
            "migration_types": list({e.get("migration_type") for e in cls._entries}),
        }

    # ── Internal: Git sync ──────────────────────────────────────────

    @classmethod
    def _sync_from_github(cls):
        """Clone or pull the external repo and parse all SKILL.md files."""
        logger.info("[ExternalKnowledge] Syncing from %s...", EXTERNAL_REPO_URL)
        try:
            git_dir = os.path.join(EXTERNAL_CACHE_DIR, ".git")
            if os.path.exists(git_dir):
                result = subprocess.run(
                    ["git", "-C", EXTERNAL_CACHE_DIR, "pull", "--ff-only", "origin", "main"],
                    capture_output=True, text=True, timeout=30
                )
                if result.returncode != 0:
                    logger.warning(
                        "[ExternalKnowledge] git pull failed: %s. Re-cloning...",
                        result.stderr[:200]
                    )
                    shutil.rmtree(EXTERNAL_CACHE_DIR, ignore_errors=True)
                    cls._clone_repo()
            else:
                cls._clone_repo()

            cls._parse_repo()
            cls._last_sync = datetime.now().isoformat()
            logger.info("[ExternalKnowledge] Synced: %d entries", len(cls._entries))
        except Exception as e:
            logger.error("[ExternalKnowledge] Sync failed: %s. Falling back to cache.", e)
            cache_file = os.path.join(EXTERNAL_CACHE_DIR, ".entries.json")
            if os.path.exists(cache_file):
                with open(cache_file, "r", encoding="utf-8") as f:
                    cls._entries = json.load(f)

    @classmethod
    def _clone_repo(cls):
        """Shallow clone the external repo."""
        os.makedirs(os.path.dirname(EXTERNAL_CACHE_DIR), exist_ok=True)
        subprocess.run(
            ["git", "clone", "--depth", "1", EXTERNAL_REPO_URL, EXTERNAL_CACHE_DIR],
            capture_output=True, text=True, timeout=60, check=True
        )

    # ── Internal: SKILL.md parsing ───────────────────────────────────

    @classmethod
    def _parse_repo(cls):
        """Walk AI-Assist-Migration/ and parse every SKILL.md file."""
        base = os.path.join(EXTERNAL_CACHE_DIR, EXTERNAL_REPO_BASE_PATH)
        if not os.path.isdir(base):
            logger.warning("[ExternalKnowledge] Path not found: %s", base)
            return

        cls._entries = []
        for root, _dirs, files in os.walk(base):
            for fname in files:
                if fname == "SKILL.md":
                    entry = cls._parse_skill_file(os.path.join(root, fname))
                    if entry:
                        cls._entries.append(entry)

    @classmethod
    def _parse_skill_file(cls, path: str) -> Optional[dict]:
        """Parse one SKILL.md: YAML frontmatter + structured markdown sections."""
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception:
            return None

        fm = {}
        body = content
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                try:
                    fm = yaml.safe_load(parts[1]) or {}
                except Exception:
                    pass
                body = parts[2]

        name = fm.get("name", os.path.basename(os.path.dirname(path)))
        description = fm.get("description", "")

        # Structured sections
        sections = cls._extract_markdown_sections(body)

        # Auto-derive metadata
        text_sample = f"{description} {body[:500]}"
        os_tags = cls._extract_os_tags(text_sample)
        source_clouds = cls._extract_cloud_tags(text_sample)
        failure_modes = cls._extract_failure_modes(
            sections.get("troubleshooting", "")
        )
        commands = cls._extract_commands(body)

        return {
            "source": "external",
            "id": name,
            "name": name,
            "description": description,
            "category": cls._derive_category(path),
            "source_clouds": source_clouds,
            "target_cloud": "huawei",
            "os_support": os_tags,
            "migration_type": cls._derive_migration_type(path, description),
            "commands": commands,
            "failure_modes": failure_modes,
            "rules": sections.get("rules", ""),
            "workflow": sections.get("workflow", ""),
            "prerequisites": sections.get("prerequisites", ""),
            "metadata": fm.get("metadata", {}),
            "confidence_base": 0.75,
        }

    @staticmethod
    def _extract_markdown_sections(body: str) -> dict:
        """Extract ##-headed sections, keyed by lowercase section name."""
        sections = {}
        current_section = "preamble"
        current_lines = []
        for line in body.split("\n"):
            m = re.match(r"^##\s+(.+)", line)
            if m:
                if current_lines:
                    key = current_section.lower().replace(" ", "_")
                    sections[key] = "\n".join(current_lines).strip()
                current_section = m.group(1).strip()
                current_lines = []
            else:
                current_lines.append(line)
        if current_lines:
            key = current_section.lower().replace(" ", "_")
            sections[key] = "\n".join(current_lines).strip()
        return sections

    @staticmethod
    def _extract_os_tags(text: str) -> list:
        """Detect OS references."""
        os_map = {
            "linux": r"\blinux\b", "ubuntu": r"\bubuntu\b", "debian": r"\bdebian\b",
            "centos": r"\bcentos\b", "rhel": r"\brhel\b", "windows server": r"\bwindows\s*server\b",
            "windows": r"\bwindows\b", "suse": r"\bsuse\b", "oracle linux": r"\boracle\s*linux\b",
        }
        tags = [os_name for os_name, pat in os_map.items()
                if re.search(pat, text, re.IGNORECASE)]
        return tags or ["linux"]

    @staticmethod
    def _extract_cloud_tags(text: str) -> list:
        """Detect cloud provider references."""
        cloud_map = {
            "aws": r"\baws\b|\bamazon\b",
            "azure": r"\bazure\b",
            "gcp": r"\bgcp\b|\bgoogle\s*cloud\b",
            "vmware": r"\bvmware\b",
            "huawei": r"\bhuawei\b|\bhcloud\b",
            "on-prem": r"\bon[- ]?prem\b",
            "alibaba": r"\balibaba\b|\balicloud\b",
        }
        return [cloud for cloud, pat in cloud_map.items()
                if re.search(pat, text, re.IGNORECASE)]

    @staticmethod
    def _extract_failure_modes(troubleshooting_text: str) -> list:
        """Parse error codes like `SMS.6504`, `DRS.M00300` from troubleshooting section."""
        modes = []
        for m in re.finditer(
            r"`([A-Z]+\.[0-9]+)`\s*[：:]\s*(.+?)(?=\n|$)",
            troubleshooting_text
        ):
            modes.append({
                "code": m.group(1),
                "description": m.group(2).strip(),
                "source": "external",
            })
        return modes

    @staticmethod
    def _extract_commands(body: str) -> list:
        """Extract CLI commands from code blocks."""
        commands = []
        cmd_prefixes = (
            "hcloud ", "terraform ", "ssh ", "curl ", "wget ", "git ",
            "docker ", "kubectl ", "python ", "pip ", "npm ", "rsync ",
            "scp ", "tar ", "growpart ", "resize2fs ", "xfs_growfs ",
            "systemctl ", "service ", "apt ", "yum ", "dnf ", "./", "nohup ",
        )
        for block in re.findall(r"```(?:bash|shell|sh|hcl|terraform)?\s*\n(.*?)```", body, re.DOTALL):
            for line in block.strip().split("\n"):
                line = line.strip()
                if line and not line.startswith(("#", "//")) and line.startswith(cmd_prefixes):
                    commands.append({"desc": line[:80], "cmd": line, "source": "external"})
        return commands[:20]

    @staticmethod
    def _derive_category(path: str) -> str:
        p = path.lower()
        if "virtual-machine" in p: return "migration"
        if "database" in p: return "database_migration"
        if "container" in p: return "container_migration"
        if "object" in p or "storage" in p: return "storage"
        if "cloud-foundation" in p: return "infrastructure"
        if "workspace" in p: return "workspace"
        return "general"

    @staticmethod
    def _derive_migration_type(path: str, description: str) -> str:
        combined = f"{path} {description}".lower()
        for t in ("drs", "sms", "image", "mgc", "rsync"):
            if t in combined:
                return t
        return "general"

    @classmethod
    def _save_cache(cls, cache_file: str):
        """Persist parsed entries to JSON cache file."""
        try:
            os.makedirs(os.path.dirname(cache_file), exist_ok=True)
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(cls._entries, f, ensure_ascii=False, indent=2)
        except Exception:
            pass


class KnowledgeProvider:
    """Federated knowledge query across three backends with priority merging.

    Priority order (conflict resolution):
      1. skill    — curated, authoritative
      2. external — community/industry patterns
      3. history  — empirical from past simulations

    Usage:
        knowledge = KnowledgeProvider.query(profile, mapper_node)
        # knowledge["top_recommendation"]["strategy"]
        # knowledge["entries"] — merged, deduped, ranked list
    """

    PRIORITY_MAP = {"skill": 1, "external": 2, "history": 3}
    BASE_CONFIDENCE = {"skill": 0.90, "external": 0.75, "history": 0.55}

    @classmethod
    def query(
        cls,
        profile: dict,
        mapper_node: dict,
        skill_matches: Optional[list] = None,
        history_matches: Optional[list] = None,
        external_matches: Optional[list] = None,
    ) -> dict:
        """Query all three backends, merge, dedup, rank.

        Returns dict with:
          entries, source_breakdown, top_recommendation, enrichment_count
        """
        # Lazy imports to avoid circular deps
        from services.agentic_simulator import SkillRegistry, ExecutionHistoryStore

        if skill_matches is None:
            skill_matches = SkillRegistry.get_skills_for_server(profile, mapper_node)
        if history_matches is None:
            history_matches = ExecutionHistoryStore.query_similar(profile, mapper_node)
        if external_matches is None:
            external_matches = ExternalKnowledgeStore.query(profile, mapper_node)

        all_entries = []
        breakdown = {"skill": 0, "external": 0, "history": 0}

        # ── Tier 1: Skills (authoritative) ──
        skill_names = set()
        for s in skill_matches:
            entry = {**s, "source": "skill", "priority": 1,
                     "confidence": s.get("confidence", cls.BASE_CONFIDENCE["skill"])}
            all_entries.append(entry)
            breakdown["skill"] += 1
            skill_names.add(s.get("name", ""))

        # ── Tier 2: External (community) — dedup vs skills ──
        for ext in external_matches:
            if ext.get("name") in skill_names:
                continue
            entry = {**ext, "source": "external", "priority": 2,
                     "confidence": ext.get("confidence", cls.BASE_CONFIDENCE["external"])}
            all_entries.append(entry)
            breakdown["external"] += 1

        # ── Tier 3: History (empirical) — dedup vs both ──
        # Build command signatures for dedup
        known_sigs = set()
        for e in all_entries:
            cmds = e.get("commands", [])
            if isinstance(cmds, list):
                for cmd in cmds[:3]:
                    known_sigs.add(hash(cmd.get("cmd", "")) % 10_000_000)

        covered_strategies = {
            e.get("migration_type") or e.get("strategy", "")
            for e in all_entries
        }

        for hist in history_matches:
            h_strat = hist.get("strategy") or hist.get("migration_type", "")
            if h_strat and h_strat in covered_strategies:
                continue
            hist_cmds = hist.get("commands", [])
            if isinstance(hist_cmds, list) and hist_cmds:
                sig = hash(hist_cmds[0].get("cmd", "")) % 10_000_000
                if sig in known_sigs:
                    continue

            entry = {**hist, "source": "history", "priority": 3,
                     "confidence": hist.get("confidence",
                                            hist.get("success_rate",
                                                     cls.BASE_CONFIDENCE["history"]))}
            all_entries.append(entry)
            breakdown["history"] += 1

        # Sort: priority asc, confidence desc
        all_entries.sort(key=lambda x: (x["priority"], -x.get("confidence", 0)))

        # Build top recommendation
        top = all_entries[0] if all_entries else None
        recommendation = None
        if top:
            recommendation = {
                "source": top["source"],
                "name": top.get("name", ""),
                "strategy": top.get("strategy") or top.get("migration_type", ""),
                "confidence": top.get("confidence", 0),
                "description": top.get("description", "")[:150],
                "reason": (
                    f"{top['source'].upper()} match — "
                    f"confidence {top.get('confidence', 0):.0%}"
                ),
            }

        return {
            "entries": all_entries,
            "source_breakdown": breakdown,
            "total_enrichment": sum(breakdown.values()),
            "top_recommendation": recommendation,
            "enrichment_count": len(all_entries),
        }

    @classmethod
    def generate_trace_enrichment(
        cls,
        profile: dict,
        mapper_node: dict,
        start_id: int,
    ) -> dict:
        """Generate trace entries that show knowledge informing decisions.

        Use in simulation pipeline to make knowledge enrichment VISIBLE in trace.
        """
        knowledge = cls.query(profile, mapper_node)
        trace_entries = []

        for i, entry in enumerate(knowledge["entries"][:5]):
            source_label = entry["source"].upper()
            trace_entries.append({
                "id": start_id + i,
                "phase": "PHASE_4_2_KNOWLEDGE",
                "agent": "KnowledgeProvider",
                "action": f"KNOWLEDGE_{source_label}",
                "target": mapper_node.get("name", "unknown"),
                "message": (
                    f"📚 [{source_label}] {entry.get('name', '')}: "
                    f"{entry.get('description', '')[:120]}. "
                    f"Confidence: {entry.get('confidence', 0):.0%}, "
                    f"Relevance: {entry.get('relevance_score', 'N/A')}"
                ),
                "commands": (entry.get("commands", []) if isinstance(entry.get("commands"), list) else [])[:3],
                "decision": {
                    "source": entry["source"],
                    "priority": entry["priority"],
                    "confidence": entry.get("confidence", 0),
                    "migration_type": entry.get("migration_type", ""),
                },
                "result": "enrichment",
            })

        return {
            "knowledge": knowledge,
            "trace_entries": trace_entries,
        }
