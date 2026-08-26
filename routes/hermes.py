"""
Huawei ModelArts Hermes WebSocket Router — Function-Calling Edition

The ERP Agent now uses OpenAI-compatible function calling to execute real
ERP API operations. Tools call the same Flask routes the frontend uses —
the agent behaves like a user clicking through the GUI, not a mock.

Architecture:
  1. User sends query via Socket.IO ('hermes_query_stream')
  2. Backend builds ERP context + tool definitions
  3. LLM receives the query + tools, returns a tool_call or a text response
  4. If tool_call: backend executes it (HTTP call to localhost API or direct Python)
  5. Tool result is fed back to LLM for a natural-language summary
  6. Final response streams to the frontend via Socket.IO tokens
"""

from flask import Blueprint, request, jsonify
from flask_socketio import emit
import json
import logging
import requests
import subprocess
import os
import urllib.request
import urllib.error
from models import Customer, ProjectData, db

logger = logging.getLogger(__name__)
hermes_bp = Blueprint('hermes', __name__)

from services.model_config import ModelConfigStore

LOAD_BALANCER_URL = "http://localhost:8666/v1/chat/completions"
LOAD_BALANCER_AUTH = "Basic YWRtaW46ODIxODcwZWVlNGQzMTA4NGUxYmZmNDA1YWJhMTVjYTY="

def _get_model_config():
    """Get the profile's configured model for the ERP Agent."""
    try:
        store = ModelConfigStore()
        cfg = store.get_public_config()
        provider = cfg.get('primary_provider', 'deepseek')
        model = cfg.get('primary_model', 'deepseek-v4-pro')
        return provider, model
    except Exception:
        return 'deepseek', 'deepseek-v3.2'


# ═══════════════════════════════════════════════
# ERP TOOL DEFINITIONS — OpenAI function-calling schema
# These are the same operations a user can do via the GUI.
# The agent calls ERP's own API endpoints (localhost).
# ═══════════════════════════════════════════════

ERP_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_project_state",
            "description": "Get the full state of a project including mapperNodes (topology), SOW data, phase, and any existing simulation results. This is the same data the GUI shows.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "The project ID"}
                },
                "required": ["project_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_projects",
            "description": "List all projects in the ERP system with their IDs, types, and current phases.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_simulation",
            "description": "Run an agentic dry-run migration simulation for a project. This executes the full migration pipeline simulation (phases 4.0 through 4.8) and returns the trace with steps, resource usage, and delivery report. Same as clicking 'Run Agentic Dry-Run' in the GUI.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "The project ID to simulate"},
                    "mode": {"type": "string", "description": "Execution mode", "enum": ["dry-run", "live"], "default": "dry-run"}
                },
                "required": ["project_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_simulation_result",
            "description": "Get the stored agentic dry-run simulation result for a project (trace, summary, resource_usage). Returns the same data shown in the Agentic Orchestration Panel.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "The project ID"}
                },
                "required": ["project_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_topology",
            "description": "Get the topology mapper nodes for a project — all discovered resources (ECS, RDS, VPC, EIP, SG, EVS, etc.) with their types, OS, and statuses.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "The project ID"}
                },
                "required": ["project_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_skills",
            "description": "List all registered migration skills in the ERP SkillRegistry — skill names, descriptions, and which phases they apply to.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_knowledge_tree",
            "description": "Get the ERP knowledge tree — all available skills, MCP servers, and documentation registered in the system.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_project",
            "description": "Update a project's data (e.g., set phase, update mapperNodes, save simulation results). Same as the GUI saving changes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "The project ID"},
                    "patch": {"type": "object", "description": "Partial JSON to merge into the project data"}
                },
                "required": ["project_id", "patch"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_execution_logs",
            "description": "Get execution logs for a project — phase-by-phase execution history, events, and agent actions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "The project ID"}
                },
                "required": ["project_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_system_info",
            "description": "Get ERP system info — database counts, running processes, Hermes config, and system health.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_hermes_cli",
            "description": "Execute a command via the Hermes CLI binary (hermes chat) for OS-level operations — terminal commands, file operations, or asking Hermes to perform complex tasks. Use sparingly for things outside the ERP API.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The natural-language command for Hermes CLI"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_project_trace_summary",
            "description": "Get a summary of the migration simulation trace — total steps, phases completed, resources migrated, sync status, and any failures. More concise than get_simulation_result.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "The project ID"}
                },
                "required": ["project_id"]
            }
        }
    },
]


# ═══════════════════════════════════════════════
# TOOL EXECUTORS — call ERP's own API or direct Python
# ═══════════════════════════════════════════════

def _call_erp_api(method, path, json_data=None, project_id=None):
    """Call the ERP's own Flask API (localhost) — same as the frontend does."""
    base_url = "http://localhost:9119"
    url = base_url + path
    headers = {"Content-Type": "application/json"}
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, timeout=30)
        elif method == "POST":
            resp = requests.post(url, headers=headers, json=json_data or {}, timeout=120)
        elif method == "PATCH":
            resp = requests.patch(url, headers=headers, json=json_data or {}, timeout=30)
        elif method == "DELETE":
            resp = requests.delete(url, headers=headers, timeout=30)
        else:
            return {"error": f"Unsupported method: {method}"}
        return resp.json() if resp.headers.get('content-type', '').startswith('application/json') else {"raw": resp.text[:2000]}
    except Exception as e:
        return {"error": f"ERP API call failed: {str(e)}"}


def execute_tool(tool_name, args, project_id="global"):
    """Execute an ERP tool and return the result as a string for the LLM."""
    try:
        if tool_name == "get_project_state":
            pid = args.get("project_id", project_id)
            project = ProjectData.query.filter_by(id=pid).first()
            if not project:
                return json.dumps({"error": f"Project {pid} not found"})
            data = json.loads(project.data) if project.data else {}
            # Truncate large fields
            if "agenticDryRun" in data and data["agenticDryRun"]:
                ar = data["agenticDryRun"]
                data["agenticDryRun_summary"] = {
                    "totalSteps": len(ar.get("trace", [])),
                    "phases": list(set(s.get("phase","") for s in ar.get("trace",[]))),
                    "summary": ar.get("summary", {}),
                }
                data["agenticDryRun"] = "[use get_simulation_result for full data]"
            result = {
                "id": project.id, "type": project.project_type,
                "updated_at": project.updated_at.isoformat() if project.updated_at else None,
                "data_keys": list(data.keys()),
                "mapperNodes": data.get("mapperNodes", []),
                "topologyFilter": data.get("topologyFilter", "All"),
                "currentPhase": data.get("currentPhase", data.get("phase", "unknown")),
                "phase": data.get("phase"),
                "agenticDryRun_summary": data.get("agenticDryRun_summary"),
            }
            return json.dumps(result, default=str)[:8000]

        elif tool_name == "list_projects":
            projects = ProjectData.query.all()
            result = [{"id": p.id, "type": p.project_type, "updated_at": p.updated_at.isoformat() if p.updated_at else None} for p in projects]
            return json.dumps(result, default=str)[:4000]

        elif tool_name == "run_simulation":
            pid = args.get("project_id", project_id)
            mode = args.get("mode", "dry-run")
            result = _call_erp_api("POST", f"/api/projects/{pid}/simulate-orchestration", {"mode": mode}, pid)
            # Truncate trace if too large
            if "trace" in result and isinstance(result.get("trace"), list):
                trace = result["trace"]
                result["trace"] = trace[:20]
                result["trace_total"] = len(trace)
                result["trace_note"] = f"[Showing first 20 of {len(trace)} steps. Use get_simulation_result for full data.]"
            return json.dumps(result, default=str)[:12000]

        elif tool_name == "get_simulation_result":
            pid = args.get("project_id", project_id)
            project = ProjectData.query.filter_by(id=pid).first()
            if not project:
                return json.dumps({"error": f"Project {pid} not found"})
            data = json.loads(project.data) if project.data else {}
            adr = data.get("agenticDryRun")
            if not adr:
                return json.dumps({"error": "No simulation result found. Run a simulation first."})
            trace = adr.get("trace", [])
            summary = adr.get("summary", {})
            # Return summary + phase breakdown, not full trace
            phases = {}
            for step in trace:
                ph = step.get("phase", "unknown")
                if ph not in phases:
                    phases[ph] = {"steps": 0, "actions": []}
                phases[ph]["steps"] += 1
                if len(phases[ph]["actions"]) < 5:
                    phases[ph]["actions"].append(step.get("action", ""))
            result = {
                "totalSteps": len(trace),
                "summary": summary,
                "phases": phases,
            }
            return json.dumps(result, default=str)[:8000]

        elif tool_name == "get_topology":
            pid = args.get("project_id", project_id)
            project = ProjectData.query.filter_by(id=pid).first()
            if not project:
                return json.dumps({"error": f"Project {pid} not found"})
            data = json.loads(project.data) if project.data else {}
            nodes = data.get("mapperNodes", [])
            # Group by type
            by_type = {}
            for n in nodes:
                t = n.get("type", "unknown")
                if t not in by_type:
                    by_type[t] = []
                by_type[t].append({"name": n.get("name", n.get("id","")), "os": n.get("os",""), "status": n.get("status","")})
            return json.dumps({"total": len(nodes), "by_type": by_type}, default=str)[:6000]

        elif tool_name == "list_skills":
            try:
                from services.agentic_simulator import SkillRegistry
                skills = SkillRegistry.SKILLS
                result = {k: {"description": v.get("description","")[:200]} for k, v in skills.items()}
                return json.dumps(result, default=str)[:6000]
            except Exception as e:
                return json.dumps({"error": f"Failed to load skills: {str(e)}"})

        elif tool_name == "get_knowledge_tree":
            result = _call_erp_api("GET", "/api/knowledge/tree")
            return json.dumps(result, default=str)[:6000]

        elif tool_name == "update_project":
            pid = args.get("project_id", project_id)
            patch = args.get("patch", {})
            result = _call_erp_api("PATCH", f"/api/erp/projects/{pid}/partial", patch, pid)
            return json.dumps(result, default=str)[:4000]

        elif tool_name == "get_execution_logs":
            pid = args.get("project_id", project_id)
            result = _call_erp_api("GET", f"/api/executions/{pid}/logs")
            return json.dumps(result, default=str)[:6000]

        elif tool_name == "get_system_info":
            result = _call_erp_api("GET", "/api/hermes-cli/system-info")
            return json.dumps(result, default=str)[:4000]

        elif tool_name == "get_project_trace_summary":
            pid = args.get("project_id", project_id)
            project = ProjectData.query.filter_by(id=pid).first()
            if not project:
                return json.dumps({"error": f"Project {pid} not found"})
            data = json.loads(project.data) if project.data else {}
            adr = data.get("agenticDryRun", {})
            trace = adr.get("trace", [])
            if not trace:
                return json.dumps({"error": "No simulation trace found. Run a simulation first."})
            phases_seen = []
            resources_migrated = 0
            failures = []
            for step in trace:
                ph = step.get("phase","")
                if ph not in phases_seen:
                    phases_seen.append(ph)
                result_str = (step.get("result","") + step.get("outcome","")).lower()
                if "success" in result_str or "complete" in result_str:
                    resources_migrated += 1
                if "error" in result_str or "fail" in result_str:
                    failures.append({"step": step.get("id"), "action": step.get("action",""), "result": step.get("result","")})
            summary = {
                "total_steps": len(trace),
                "phases": phases_seen,
                "successful_steps": resources_migrated,
                "failures": failures[:10],
                "resource_usage": adr.get("summary", {}).get("resource_usage", {}),
            }
            return json.dumps(summary, default=str)[:6000]

        elif tool_name == "run_hermes_cli":
            query = args.get("query", "")
            if not query:
                return json.dumps({"error": "Query required"})
            try:
                hc = None
                try:
                    from models import HermesConfig
                    hc = HermesConfig.get_config()
                except:
                    pass
                binary = hc.hermes_binary_path if hc and hc.hermes_binary_path else 'hermes'
                model = hc.global_model if hc else 'deepseek-v4-pro'
                provider = hc.global_provider if hc else 'deepseek'
                cmd = [binary, 'chat', '-q', query, '--model', model, '--provider', provider, '--quiet']
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
                if result.returncode == 0:
                    return result.stdout.strip()[:6000]
                else:
                    return json.dumps({"error": result.stderr.strip()[:2000]})
            except subprocess.TimeoutExpired:
                return json.dumps({"error": "Hermes CLI timed out after 90 seconds"})
            except Exception as e:
                return json.dumps({"error": f"Hermes CLI failed: {str(e)}"})

        else:
            return json.dumps({"error": f"Unknown tool: {tool_name}"})

    except Exception as e:
        logger.error(f"Tool execution error [{tool_name}]: {str(e)}", exc_info=True)
        return json.dumps({"error": f"Tool execution failed: {str(e)}"})


# ═══════════════════════════════════════════════
# CONTEXT BUILDER
# ═══════════════════════════════════════════════

def build_hermes_context(project_id):
    """Build context about the ERP system for the AI."""
    context = {
        "system": "LATAM Cloud ERP Migration Factory on Huawei Cloud",
        "capabilities": [
            "View project topology (mapperNodes: ECS, RDS, VPC, EIP, SG, EVS, etc.)",
            "Run agentic migration simulations (dry-run, 15 phases, 65+ steps)",
            "View simulation traces and delivery reports",
            "List registered migration skills",
            "View knowledge tree and MCP servers",
            "Update project data and phases",
            "View execution logs",
            "Execute Hermes CLI commands for OS-level operations",
        ],
        "note": "You have real tools. Call them to get real data. Do NOT make up answers.",
    }
    if project_id and project_id != 'global':
        try:
            project = ProjectData.query.filter_by(id=project_id).first()
            if project:
                data = json.loads(project.data) if project.data else {}
                context["current_project"] = {
                    "id": project.id,
                    "type": project.project_type,
                    "phase": data.get("phase", data.get("currentPhase", "unknown")),
                    "resource_count": len(data.get("mapperNodes", [])),
                    "has_simulation": bool(data.get("agenticDryRun")),
                }
        except Exception as e:
            logger.error(f"Context build error: {str(e)}")
    return context


# ═══════════════════════════════════════════════
# STREAMING HANDLER — with function-calling loop
# ═══════════════════════════════════════════════

def handle_hermes_stream(payload):
    """WebSocket handler with function-calling support."""
    try:
        from flask import request as flask_request
        token = payload.get('token', '')
        if not token:
            socketio.emit('hermes_error', {'error': 'Authentication required: no token provided'})
            return
        try:
            from flask_jwt_extended import decode_token
            decode_token(token)
        except Exception:
            socketio.emit('hermes_error', {'error': 'Authentication failed: invalid or expired token'})
            return

        user_query = payload.get('query', '')
        project_id = payload.get('projectId', 'global')
        historical_messages = payload.get('messages', [])

        # 1. Build context
        context_data = build_hermes_context(project_id)
        context_string = json.dumps(context_data, indent=2)

        provider, configured_model = _get_model_config()
        system_instruction = f"""You are the ERP Agent — the AI assistant for the LATAM Cloud ERP Migration Factory on Huawei Cloud.

You have REAL tools to interact with the ERP system. Always use tools to get actual data — never make up answers.

SYSTEM CONTEXT:
{context_string}

INSTRUCTIONS:
- When asked about a project, use get_project_state or get_topology
- When asked to simulate, use run_simulation
- When asked about simulation results, use get_simulation_result or get_project_trace_summary
- When asked about skills, use list_skills or get_knowledge_tree
- When asked about system health, use get_system_info
- When asked to update something, use update_project
- For OS-level tasks outside the ERP, use run_hermes_cli
- Always provide clear, structured markdown responses
- Reference real data from tool results, not assumptions
"""

        messages = [{"role": "system", "content": system_instruction}]
        for msg in historical_messages:
            if msg.get("role") in ["user", "assistant"]:
                messages.append({"role": msg["role"], "content": msg["content"]})

        headers = {
            "Authorization": LOAD_BALANCER_AUTH,
            "Content-Type": "application/json"
        }

        # 2. Function-calling loop (max 5 rounds)
        max_rounds = 5
        for round_num in range(max_rounds):
            llm_payload = {
                "model": configured_model,
                "messages": messages,
                "stream": False,
                "temperature": 0.1,
                "tools": ERP_TOOLS,
                "tool_choice": "auto",
            }

            logger.info(f"ERP Agent round {round_num+1}: model={configured_model}, messages={len(messages)}")

            try:
                response = requests.post(LOAD_BALANCER_URL, headers=headers, json=llm_payload, timeout=180)
            except Exception as e:
                socketio.emit('hermes_error', {'error': f'Model request failed: {str(e)}'})
                return

            if response.status_code != 200:
                socketio.emit('hermes_error', {'error': f'Model returned HTTP {response.status_code}: {response.text[:200]}'})
                return

            try:
                resp_data = response.json()
            except:
                socketio.emit('hermes_error', {'error': 'Model returned non-JSON response'})
                return

            choice = resp_data.get("choices", [{}])[0]
            message = choice.get("message", {})
            tool_calls = message.get("tool_calls", [])

            if tool_calls:
                # 3. Execute each tool call
                messages.append(message)  # Add assistant's tool_call message

                for tc in tool_calls:
                    func = tc.get("function", {})
                    tool_name = func.get("name", "")
                    try:
                        tool_args = json.loads(func.get("arguments", "{}"))
                    except:
                        tool_args = {}

                    # Notify frontend that a tool is being executed
                    socketio.emit('hermes_token', {'text': f"\n\n⚙️ **Executing:** `{tool_name}`({json.dumps(tool_args)[:100]})\n\n"})

                    logger.info(f"ERP Agent tool call: {tool_name}({json.dumps(tool_args)[:200]})")
                    tool_result = execute_tool(tool_name, tool_args, project_id)

                    # Add tool result to conversation
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.get("id", ""),
                        "content": tool_result,
                    })

                # Continue to next round — LLM will process tool results
                continue
            else:
                # 4. No tool calls — this is the final response. Stream it.
                content = message.get("content", "")
                if content:
                    # Stream in chunks for a responsive feel
                    chunk_size = 4
                    for i in range(0, len(content), chunk_size):
                        chunk = content[i:i+chunk_size]
                        socketio.emit('hermes_token', {'text': chunk})
                    socketio.emit('hermes_done', {'status': 'success'})
                    return
                else:
                    # Empty content with no tool calls — done
                    socketio.emit('hermes_done', {'status': 'success'})
                    return

        # Max rounds reached
        socketio.emit('hermes_token', {'text': '\n\n*(Maximum tool-call rounds reached. Here is what I found.)*\n\n'})
        socketio.emit('hermes_done', {'status': 'success'})

    except Exception as e:
        logger.error(f"WebSocket streaming pipeline error: {str(e)}", exc_info=True)
        socketio.emit('hermes_error', {'error': f'Agent Error: {str(e)}'})


# Keep a reference to socketio for emit calls
socketio = None

def register_hermes_sockets(sio):
    """Register WebSocket event handlers."""
    global socketio
    socketio = sio
    sio.on_event('hermes_query_stream', handle_hermes_stream)


# Legacy HTTP fallback
@hermes_bp.route('/api/hermes/query', methods=['POST'])
def hermes_query():
    """Legacy HTTP fallback — routes to the CLI daemon bridge."""
    try:
        data = request.get_json()
        project_id = data.get('projectId', 'global')
        user_query = data.get('query', '')
        if not user_query and data.get('messages'):
            for msg in reversed(data.get('messages')):
                if msg.get('role') == 'user':
                    user_query = msg.get('content', '')
                    break
        if not user_query:
            return jsonify({'success': False, 'error': 'Query required'}), 400
        from routes.hermes_cli_api import execute_privileged_engine_command
        response_text = execute_privileged_engine_command(user_query, project_id)
        return jsonify({'response': response_text, 'projectId': project_id, 'status': 'success', 'source': 'hermes-core-daemon-fallback'})
    except Exception as e:
        return jsonify({"error": f"Internal Agent Error: {str(e)}"}), 500
