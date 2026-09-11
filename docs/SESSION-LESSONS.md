"# SESSION-LESSONS — Auto-synced from dev sessions
_This file is appended by the erp-session-summary-sync cron job. It is the durable bridge between local Hermes sessions and the ERP's LLM context._

## 2026-09-04 (initial bootstrap)
- **Orchestration provider fix**: The ERP orchestration engine was hardcoding `--provider zai --model glm-5.2` in `_spawn_hermes_agent()`. The ERP Hermes has NO zai credentials (it uses `provider: custom` → LB on localhost:8666). Fix: removed the `--provider` flag so it uses the config default (LB). Symptom: pipeline spawned agent, failed instantly with EMPTY error, "terminal appears then disappears".
- **Flask stale-code bug**: After deploying code changes to services/*.py, Flask continued running OLD code until restart. Symptom: fixes appear correct on disk + compile, but behavior unchanged. Fix: always `fuser -k 9119/tcp; restart` after deploying backend changes; verify process start time > file mtime.
- **Logs not visible**: StepExecution.jsx rendered the orchestration log ONLY inside `autoOrchestrating ? (...) : (...)` — so when pipeline halted/crashed, accumulated logs were never shown. Fix: render log whenever `orchestrationLog.length > 0`, gated by the Logs toggle button.
- **Postgres persistence**: ExecutionHistoryStore was in-memory only (lost on Flask restart). Added `execution_outcomes` table (Postgres, erp_prod_db) + `_pg_save`/`_pg_load`/`_pg_ensure_table` helpers. psycopg2 returns JSONB as DICT not str — handle both in _pg_load.
- **Plan-sim-exec architecture**: Plan generation (LLM) → dry-run simulation (predict) → deterministic execution (no LLM per phase) → auto-heal on failure (retry → LLM diagnose → update plan). Neither plan gen nor dry-run can anticipate 100% of execution outcomes — execution is the only validator; the failure→knowledge→plan loop makes repeat scenarios deterministic.

## 2026-09-05 (LB config lesson)
- **ERP LB agents ran with kawaii personality + reasoning off** — agents hallucinated success ('Wave 0 provisioned! ✨ ヽ(>∀<☆)ノ') and created EIPs with wrong billing (bandwidth instead of traffic 300Mbit). Root cause: display.personality=kawaii + show_reasoning=false + no verification mandate + no phase-scope in spawn prompt.
- **Fix applied (4 changes)**: (1) personality kawaii→professional in /root/.hermes/config.yaml, (2) show_reasoning false→true, (3) spawn cmd adds --reasoning medium, (4) system prompt in _spawn_hermes_agent now mandates: phase-scope only (no cross-phase provisioning), verify-before-report (run Show/read commands), exact params from plan (EIP traffic-billed 300, syncing=false), honest failure reporting, no kaomoji.
- **Verified**: LB response now shows reasoning_content (reasoning ON).
- **Also**: default delegation model changed glm-5.2→deepseek-v4-pro (the actual LB model).
- **Pipeline behavior confirmed**: agents DID provision real infra (VPC/SG/EIP/2 ECS/2 SMS tasks) but 4.4 failed with SMS.0202 (source agent AK/SK or stale registration). Orchestrator recorded 'timed out' wrapper error instead of root cause.

## 2026-09-05 (full context injection)
- **SESSION-LESSONS.md now injected into spawn prompt**: every pipeline agent receives today's session lessons (from docs/SESSION-LESSONS.md, 6000 chars) + Resources Kit inventory + last 10 Postgres execution outcomes. The spawn prompt in _spawn_hermes_agent reads these from disk on every spawn.
- **5 PDFs extracted to searchable markdown**: sms-api-pdf.pdf (673p, 1.1MB), sms-faq-pdf.pdf (242p, 0.4MB), eip-api-pdf.pdf (332p, 0.4MB), eip-usermanual-pdf.pdf (107p, 0.2MB), sms-usermanual-pdf.pdf (69p, 0.1MB). Stored at docs/pdf-text-cache/*.md.
- **pypdf installed** in ERP venv for future PDF search.
- **LB restarted** (PID 510447, healthy, serving deepseek-v4-pro).

## 2026-09-05 (spawn retry)
- **_spawn_hermes_agent now retries on transient LB failures**: 2 retries with 8s/16s backoff for any 502/503/429/rate-limit/MaxRetriesExhausted error. Previously a single LB key-cooldown spike killed the whole phase. Now the pipeline survives transient LLM provider hiccups.

## 2026-09-05 (session archive lesson)
- **Session 20260731_045435 was deleted to fix 98K-token context overflow** (Telegram gateway failure: 'model provider failed after retries' = provider_stream_non_json_data with msgs=197 tokens=98,844 — context too large for deepseek-v4-pro).
- **Lesson learned**: NEVER delete session data without archiving first. Session request dumps (10 files, 1.6MB) were preserved in docs/session-archives/20260731_045435/. Full transcript lost — recoverable value was the request dumps.
- **Prevention**: sessions that exceed ~150 messages / ~60K tokens should be archived + reset automatically BEFORE hitting the model context limit.

## 2026-09-05 (Telegram export mining)
- Mined 52,603-message Telegram export (ChatExport_2026-08-07) → 6 new skills created: hcloud-cli-workarounds, huawei-cloud-eip-billing-region-pitfalls, sms-migration-automatic-retry-monitor, huawei-cloud-erp-execution-safety-architecture, huaweicloud-sdk-mcp-tradeoffs, azure-vhd-to-huawei-obs-ecs.
- 5 duplicate topics mapped to existing skills (SMS agent install → sms-migration skills; proxy → proxy-ssh-tunnel; phases → erp-execution-orchestration; flask → huawei-cloud-flask-server; ops → huawei-cloud-operations).
- Full chat archived at docs/session-archives/telegram-2026-08-07/ (chat_full.json.gz 3.3MB, chat_full.txt.gz 2.0MB).
# SESSION-LESSONS — Auto-synced from dev sessions

## 2026-09-11 (Phase 4.2/4.3 live execution — ERP GUI)
- **Resource-Kit-First is now directive #0**: preloaded skills contain exact image IDs, disk mapping, syncing=false, error fixes. Agents MUST read skills + plan before any hcloud --help / self-discovery. SMS.0515 has a fix skill — read it, don't re-derive.
- **source_servers enrichment**: after 4.2, agents MUST persist discovered source server data (EIP, sms_id, disk, agent_version) into executionContext.source_servers + sms_migration_project_id. Later phases read these from the spawn context — no DB hunting.
- **Source SSH password**: wizard stores it in dataPlaneAccess.password (hasDataPlaneAdmin). Agents get it injected as SOURCE OS ACCESS. If servers reject it: reset via `hcloud ECS ResetServerPassword` + reboot (worked on 4.2 — password was cleared at creation).
- **SMS agent install (proven)**: download SMS-Agent.tar.gz from region URL → extract /tmp/SMS-Agent → write auth.cfg directly (bypass interactive startup.sh) → screen linuxmain with AK/SK + region endpoint → verify 13/13 health. Do NOT use interactive printf pipe (terminal blocks it).
- **No DB reads**: agents NEVER query erp_prod_db directly (.env blocked). All project data comes via spawn context (executionContext, SOURCE OS ACCESS, targetArchitecture summary).
- **Deterministic executor**: plan steps run via subprocess first (no LLM), retry x2, then agent lane. Det lane consumoter executionContext — placeholders that can't resolve fall through to agent.
- **hcloud SMS ListSourceServers NOT supported** — use ListServers/ListMigprojects; server UUIDs from `hcloud ECS ListServers` in source region.
- **completed_phases from delegate_tasks**: persists across log resets; runbook shows done from DB not cloud-guessing.
