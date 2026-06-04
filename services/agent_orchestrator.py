import os
import json
import subprocess
from datetime import datetime

# 🚨 IMPORT YOUR EXISTING LOAD BALANCER
# Adjust the class/method name to match exactly what is inside your huawei_load_balancer.py
from services.huawei_load_balancer import LLMLoadBalancer 

class ProprietaryCognitiveEngine:
    def __init__(self, project_id, safe_vault, blueprint):
        self.project_id = project_id
        self.vault = safe_vault  
        self.blueprint = blueprint
        self.workspace_dir = f"/opt/erp/agent_workspaces/proj_{project_id}"
        os.makedirs(self.workspace_dir, exist_ok=True)

    def _stream_cognitive_logic(self, system_prompt, user_context):
        """
        Delegates the AI call entirely to your existing Huawei Load Balancer.
        This ensures FinOps tracking and key security remain centralized.
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_context}
        ]
        
        # --- MOCK STREAMING FOR IMMEDIATE UI TESTING (If LB isn't ready yet) ---
        # import time
        # mock_response = "ANALYSIS: VPC.0114 Quota Exceeded. ACTION: Clearing stale staging VPC 'vpc-staging-old' within Sandbox... Retrying RFS apply... Success."
        # for word in mock_response.split(" "):
        #     time.sleep(0.1)
        #     yield word + " "
        # return
        # -----------------------------------------------------------------------

        # 🚨 REAL IMPLEMENTATION: 
        # Call your load balancer's streaming method. 
        # (Change 'stream_completion' to whatever method your load balancer uses).
        
        lb = LLMLoadBalancer()
        try:
            # We explicitly request DeepSeek v3.2 via the load balancer, with low temperature
            response_stream = lb.stream_completion(
                model="deepseek-v3.2", 
                messages=messages, 
                temperature=0.1
            )
            
            for token in response_stream:
                if token:
                    yield token
                    
        except Exception as e:
            yield f"\n[CRITICAL ERROR] Load Balancer Routing Failed: {str(e)}"

    def orchestrate_streaming_pipeline(self):
        """
        A Generator function that yields SSE formatted payloads back to the React UI.
        """
        # 1. Yield Initial Status
        yield {"type": "log", "content": "[SYSTEM] Constructing Deterministic Sandbox Architecture..."}
        
        # Lock the Blueprint into the local workspace
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
        
        # 3. Stream the AI's internal thoughts directly to the UI via the Load Balancer
        yield {"type": "ai_stream_start"}
        
        full_remediation_plan = ""
        for token in self._stream_cognitive_logic(system_prompt, context):
            full_remediation_plan += token
            # Yield each token individually so the UI "types" it out
            yield {"type": "ai_token", "content": token}
            
        yield {"type": "ai_stream_end"}

        # 4. Finalize
        yield {"type": "log", "content": "✅ [SYSTEM] Orchestration successful. Sandbox finalized."}
        yield {"type": "done"}
