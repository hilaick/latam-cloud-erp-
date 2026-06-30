# Update routes/hermes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import json
import logging
import requests
from services.hermes_executor import HermesExecutor

logger = logging.getLogger(__name__)
hermes_bp = Blueprint('hermes', __name__)

# NOTE: Adjust this URL to point to your local DeepSeek instance API
DEEPSEEK_API_URL = "http://localhost:11434/api/chat"

def build_hermes_context(project_id):
    # ... KEEP YOUR EXISTING CONTEXT BUILDER EXACTLY AS IS ...
    pass

@hermes_bp.route('/api/hermes/query', methods=['POST'])
# @jwt_required()
def hermes_query():
    try:
        data = request.get_json()
        project_id = data.get('projectId')
        chat_history = data.get('messages', [])
        user_query = data.get('query', '')
        
        # 1. Gather Live ERP Context
        context = {}
        if project_id and project_id != 'global' and project_id != 'none':
            context = build_hermes_context(project_id)

        # 2. Build the System Prompt (Context + Tools)
        tools_schema = json.dumps(HermesExecutor.get_tools_schema(), indent=2)
        context_string = json.dumps(context, indent=2) if context else "GLOBAL MODE - No project selected."
        
        system_instruction = f"""You are Hermes, the autonomous AI orchestrator for LATAM Cloud ERP.
You have FULL systemic capability.

LIVE ERP CONTEXT:
{context_string}

AVAILABLE TOOLS:
{tools_schema}

If you need to use a tool to accomplish the user's goal, output exactly this JSON format and NOTHING ELSE:
<TOOL_CALL>
{{"tool": "tool_name", "params": {{"param1": "value1"}}}}
</TOOL_CALL>

If you do not need a tool, just answer the user normally using markdown.
"""

        messages = [{"role": "system", "content": system_instruction}]
        
        # Append history
        for msg in chat_history:
            # We don't want to send frontend UI errors to the LLM
            if msg.get("role") in ["user", "assistant"]:
                messages.append({"role": msg.get("role"), "content": msg.get("content")})

        # --- THE REASON/ACT LOOP ---
        MAX_ITERATIONS = 3
        
        for iteration in range(MAX_ITERATIONS):
            # 1. Call DeepSeek
            response = requests.post(DEEPSEEK_API_URL, json={
                "model": "deepseek-coder", # Update with your exact local model name
                "messages": messages,
                "stream": False
            }).json()
            
            content = response.get('message', {}).get('content', '')

            # 2. Did the LLM call a tool?
            if "<TOOL_CALL>" in content:
                try:
                    json_str = content.split("<TOOL_CALL>")[1].split("</TOOL_CALL>")[0].strip()
                    tool_req = json.loads(json_str)
                    tool_name = tool_req.get("tool")
                    params = tool_req.get("params", {})
                    
                    logger.info(f"Hermes executing tool: {tool_name} with params: {params}")
                    
                    # 3. Execute the Python Code locally
                    execution_result = HermesExecutor.execute_tool(tool_name, params, context)
                    
                    # 4. Feed the result back into the conversation for DeepSeek to read
                    messages.append({"role": "assistant", "content": content}) # Record what it asked
                    messages.append({
                        "role": "user", 
                        "content": f"SYSTEM TOOL RESULT ({tool_name}):\n```text\n{execution_result}\n```\nAnalyze this result and continue."
                    })
                    continue # Loop back around to call DeepSeek again
                    
                except Exception as e:
                    logger.error(f"Tool parse error: {e}")
                    messages.append({"role": "assistant", "content": content})
                    messages.append({"role": "user", "content": f"SYSTEM ERROR: Failed to parse or execute tool: {str(e)}. Please correct your JSON format and try again."})
                    continue
            
            # 3. No tool called, meaning it's a final human-readable response!
            return jsonify({
                'response': content,
                'status': 'success'
            })

        return jsonify({"response": "Hermes Warning: Hit maximum execution iterations. Please try refining your query."})

    except Exception as e:
        logger.error(f"Hermes Loop Error: {str(e)}", exc_info=True)
        return jsonify({"error": f"Internal Agent Error: {str(e)}"}), 500
