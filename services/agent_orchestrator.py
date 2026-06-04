import os
import json
import requests
import subprocess
from datetime import datetime

MODELSQUARE_API_URL = os.environ.get("MODELSQUARE_API_URL", "https://api.modelsquare.internal/v1/chat/completions")
MODELSQUARE_API_KEY = os.environ.get("MODELSQUARE_API_KEY", "MOCK_KEY_FOR_TESTING")

class ProprietaryCognitiveEngine:
    def __init__(self, project_id, safe_vault, blueprint):
        self.project_id = project_id
        self.vault = safe_vault  
        self.blueprint = blueprint
        self.workspace_dir = f"/opt/erp/agent_workspaces/proj_{project_id}"
        os.makedirs(self.workspace_dir, exist_ok=True)

    def _stream_deepseek(self, system_prompt, user_context):
        """Streams the LLM response token-by-token from ModelSquare."""
        headers = {
            "Authorization": f"Bearer {MODELSQUARE_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "deepseek-v3.2",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_context}
            ],
            "temperature": 0.1,
            "stream": True  # 🚨 Critical: Enables streaming mode
        }
        
        # --- MOCK STREAMING FOR IMMEDIATE UI TESTING ---
        import time
        mock_response = "ANALYSIS: VPC.0114 Quota Exceeded. ACTION: Clearing stale staging VPC 'vpc-staging-old' within Sandbox... Retrying RFS apply... Success."
        for word in mock_response.split(" "):
            time.sleep(0.1)
            yield word + " "
        return
        # -----------------------------------------------

        # REAL IMPLEMENTATION (Uncomment when API is active)
        # try:
        #     with requests.post(MODELSQUARE_API_URL, json=payload, headers=headers, stream=True) as r:
        #         for line in r.iter_lines():
        #             if line:
        #                 line_str = line.decode('utf-8')
        #                 if line_str.startswith('data: ') and line_str != 'data: [DONE]':
        #                     chunk_data = json.loads(line_str[6:])
        #                     token = chunk_data['choices'][0]['delta'].get('content', '')
        #                     if token:
        #                         yield token
        # except Exception as e:
        #     yield f"\n[CRITICAL ERROR] AI Core unreachable: {str(e)}"

    def orchestrate_streaming_pipeline(self):
        """
        A Generator function that yields SSE formatted payloads.
        """
        # 1. Yield Initial Status
        yield {"type": "log", "content": "[SYSTEM] Constructing Deterministic Sandbox Architecture..."}
        
        tfvars = {
            "access_key": self.vault['tier2_ak'],
            "secret_key": self.vault['tier2_sk'],
            "region": self.blueprint.get('region', 'la-south-2'),
            "target_vpc_cidr": self.blueprint['infrastructure'].get('vpc_cidr', '10.0.0.0/16')
        }
        
        with open(f"{self.workspace_dir}/terraform.tfvars.json", "w") as f:
            json.dump(tfvars, f)

        # 2. Simulate Execution & Failure Triggering Cognitive Loop
        yield {"type": "log", "content": f"[SYSTEM] Applying locked RFS template for Proj {self.project_id}..."}
        
        # Simulating a Terraform Failure to trigger the AI
        error_log = "Error: VPC.0114 Quota Exceeded in current region."
        yield {"type": "log", "content": f"❌ [RFS ERROR] {error_log}"}
        yield {"type": "log", "content": "[AGENT] Error detected. Booting Cognitive Troubleshooter..."}
        
        system_prompt = "You are the Latam Cloud ERP remediation agent operating strictly in a Tier 2 Sandbox. Output the required fix for the provided error."
        context = f"Blueprint: {json.dumps(self.blueprint)}\nError Log: {error_log}"
        
        # 3. Stream the AI's internal thoughts directly to the UI
        yield {"type": "ai_stream_start"}
        
        full_remediation_plan = ""
        for token in self._stream_deepseek(system_prompt, context):
            full_remediation_plan += token
            # Yield each token individually so the UI "types" it out
            yield {"type": "ai_token", "content": token}
            
        yield {"type": "ai_stream_end"}

        # 4. Finalize
        # self._record_learning(error_log, full_remediation_plan)
        yield {"type": "log", "content": "✅ [SYSTEM] Orchestration successful. Sandbox finalized."}
        yield {"type": "done"}
