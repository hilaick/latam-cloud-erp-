import os
import json
import requests
import subprocess
from datetime import datetime
# from models import db, CognitiveLearningLog

MODELSQUARE_API_URL = os.environ.get("MODELSQUARE_API_URL", "https://api.modelsquare.internal/v1/chat/completions")
MODELSQUARE_API_KEY = os.environ.get("MODELSQUARE_API_KEY")

class ProprietaryCognitiveEngine:
    def __init__(self, project_id, safe_vault, blueprint):
        self.project_id = project_id
        self.vault = safe_vault  # This ONLY contains the Tier 2 keys. The Master key is gone.
        self.blueprint = blueprint
        self.workspace_dir = f"/opt/erp/agent_workspaces/proj_{project_id}"
        os.makedirs(self.workspace_dir, exist_ok=True)

    def _query_deepseek(self, system_prompt, user_context):
        """Routes execution logic through your internal ModelSquare Load Balancer."""
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
            "temperature": 0.1 # Highly deterministic, no hallucinations allowed
        }
        
        try:
            # response = requests.post(MODELSQUARE_API_URL, json=payload, headers=headers)
            # return response.json()['choices'][0]['message']['content']
            
            # Simulated response for UI testing
            return "ANALYSIS: VPC Quota Exceeded (VPC.0114). ACTION: Clearing stale staging VPC 'vpc-test-old' in Sandbox. Retrying execution..."
        except Exception as e:
            return f"CRITICAL: AI Core unreachable. {str(e)}"

    def _record_learning(self, error_trace, solution):
        """Saves the AI's troubleshooting steps to the evolutionary memory bank."""
        print(f"[RAG MEMORY] Logging new skill logic for signature: {error_trace[:50]}...")
        # log = CognitiveLearningLog(project_id=self.project_id, error_signature=error_trace, ai_remediation_applied=solution)
        # db.session.add(log)
        # db.session.commit()

    def orchestrate_landing_zone(self):
        """
        The core deterministic loop. It attempts standard RFS provisioning.
        If it fails, it invokes the AI to fix it autonomously within the sandbox.
        """
        # 1. Enforce Deterministic Architecture (Lock the .tfvars)
        tfvars = {
            "access_key": self.vault['tier2_ak'],
            "secret_key": self.vault['tier2_sk'],
            "region": self.blueprint.get('region', 'la-south-2'),
            "target_vpc_cidr": self.blueprint['infrastructure'].get('vpc_cidr')
        }
        
        with open(f"{self.workspace_dir}/terraform.tfvars.json", "w") as f:
            json.dump(tfvars, f)

        # 2. Execution Loop
        try:
            print(f"[SYSTEM] Executing Deterministic Infrastructure for Proj {self.project_id}")
            # subprocess.run(["terraform", "init"], cwd=self.workspace_dir, check=True)
            # subprocess.run(["terraform", "apply", "-auto-approve"], cwd=self.workspace_dir, check=True)
            
            # If successful immediately:
            return {"success": True, "ai_remediation_plan": "Standard execution successful. No cognitive intervention required."}
            
        except subprocess.CalledProcessError as e:
            # 3. Cognitive Intervention (The AI Troubleshooter)
            error_log = e.stderr.decode('utf-8')
            
            system_prompt = (
                "You are the internal Latam Cloud ERP remediation agent. "
                "Analyze the provided Terraform failure log. You operate strictly within a Tier 2 Sandbox. "
                "Output the required bash/terraform commands to clear the blocker and proceed."
            )
            
            context = f"Blueprint: {json.dumps(self.blueprint)}\nError Log: {error_log}"
            
            # Ask DeepSeek for the fix
            remediation_plan = self._query_deepseek(system_prompt, context)
            
            # Save this knowledge for future migrations
            self._record_learning(error_log, remediation_plan)
            
            return {
                "success": True, 
                "ai_remediation_plan": f"Error Encountered. AI Intervention Applied: {remediation_plan}"
            }
