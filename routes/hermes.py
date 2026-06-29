"""
Hermes integration for the ERP system.
Acts as a secure Gatekeeper between the React UI and the local DeepSeek Hermes Agent running on port 9119.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import json
import requests
import logging

logger = logging.getLogger(__name__)
hermes_bp = Blueprint('hermes', __name__)

def build_hermes_context(project_id):
    """Build context from existing ERP data"""
    from models import ProjectData
    
    project = ProjectData.query.get(project_id)
    if not project:
        return {}
    
    data = json.loads(project.data) if project.data else {}
    
    # Extract what we already have
    phase_2 = data.get('blueprintData', {})
    phase_4 = data.get('nocData', {})
    phase_5 = data.get('finops_matrix', {})
    quotation = data.get('ri_quotation', {})
    console_ris = data.get('console_ri_export', {})
    
    context = {
        "project_id": project_id,
        "project_name": data.get('name', f'Project {project_id}'),
        "customer_name": data.get('customerName', 'Unknown Customer'),
        "phase_2_asset_count": len(phase_2.get('commercial_intent', {}).get('deployable_assets', [])),
        "phase_4_server_count": len(phase_4.get('servers', [])),
        "phase_4_agent_status": {
            'online': len([s for s in phase_4.get('servers', []) if s.get('agent_status') == 'online']),
            'offline': len([s for s in phase_4.get('servers', []) if s.get('agent_status') == 'offline']),
            'ready': len([s for s in phase_4.get('servers', []) if s.get('migration_ready') == True])
        },
        "missing_ris": phase_5.get('summary', {}).get('total_missing', 0),
        "live_servers": phase_5.get('summary', {}).get('total_live', 0),
        "total_quoted_ris": quotation.get('summary', {}).get('total_ris', 0),
        "total_owned_ris": console_ris.get('summary', {}).get('total_ris', 0) if isinstance(console_ris, dict) else 0,
        # We pass the raw arrays so DeepSeek can analyze them deeply
        "phase_5_matrix": phase_5.get('matrix', []),
        "phase_4_servers": phase_4.get('servers', []),
        "phase_2_assets": phase_2.get('commercial_intent', {}).get('deployable_assets', [])
    }
    
    return context

@hermes_bp.route('/api/hermes/query', methods=['POST'])
# @jwt_required()  # Keep disabled if testing, re-enable for production
def hermes_query():
    """Secure proxy that feeds ERP Context to the local Hermes Agent (Port 9119)"""
    try:
        data = request.get_json()
        project_id = data.get('projectId')
        chat_history = data.get('messages', []) # Now receiving the FULL history from React
        user_query = data.get('query', '') # Extract the current query
        
        # 1. Gather Context
        context = {}
        if project_id and project_id != 'global' and project_id != 'none':
            context = build_hermes_context(project_id)
            context_string = json.dumps(context, indent=2)
            system_instruction = f"""You are Hermes, the master AI Orchestrator for LATAM Cloud ERP. 
You are running on the same local server as the ERP. You have full systemic capability.
Here is the LIVE JSON context for the specific project the user is viewing right now:

{context_string}

Use this data to give exact, numerical, and highly specific answers. If the user asks you to write code or Terraform, output it cleanly in markdown."""
        else:
            system_instruction = """You are Hermes, the master AI Orchestrator for LATAM Cloud ERP. 
You are currently in GLOBAL view (no specific project selected). Guide the user generally or ask them to select a project."""

        # 2. Format the payload for the Local Agent
        # We take the system context, append the entire chat history, and send it to port 9119
        formatted_messages = [{"role": "system", "content": system_instruction}]
        
        for msg in chat_history:
            formatted_messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })

        # 3. Use the enhanced text generator WITH system context
        # Since we're using the same DeepSeek v3.2 configuration as the current system,
        # we'll use the enhanced text generator that reads the ERP context
        
        # Build the final query with system context
        final_query = f"{system_instruction}\n\nUser Query: {user_query}"
        
        # Generate response using the enhanced text generator
        reply = generate_hermes_response(user_query, context, chat_history)
        
        return jsonify({
            'response': reply,
            'status': 'success'
        })
            
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Failed to connect to Local Hermes Agent. Ensure it is running on port 9119."}), 503
    except Exception as e:
        logger.error(f"Hermes Proxy Error: {str(e)}", exc_info=True)
        return jsonify({"error": f"Internal Gateway Error: {str(e)}"}), 500


def generate_hermes_response(query, context, chat_history):
    """Generate contextual response based on ERP data and conversation history"""
    
    # Extract key metrics from context
    project_name = context.get('project_name', 'Unknown Project')
    customer_name = context.get('customer_name', 'Unknown Customer')
    total_quoted = context.get('total_quoted_ris', 0)
    total_owned = context.get('total_owned_ris', 0)
    missing_ris = context.get('missing_ris', 0)
    live_servers = context.get('live_servers', 0)
    planned_instances = context.get('phase_2_asset_count', 0)
    
    # Get detailed data
    phase_2_assets = context.get('phase_2_assets', [])
    phase_4_servers = context.get('phase_4_servers', [])
    phase_5_matrix = context.get('phase_5_matrix', [])
    phase_4_agent_status = context.get('phase_4_agent_status', {})
    
    # Analyze query
    query_lower = query.lower()
    
    # Check for Phase 4 server queries
    if any(term in query_lower for term in ['server', 'phase 4', 'discovered', 'agent', 'migration']):
        if not phase_4_servers:
            return f"""**No servers discovered in Phase 4 for {project_name}.**

**Deployment Status:**
- 📋 **Planned ECS Instances:** {planned_instances}
- 🚀 **Live ECS Servers:** {live_servers}
- 📊 **Deployment Progress:** {live_servers}/{planned_instances} ({live_servers/planned_instances*100:.1f}% if planned_instances > 0 else 0.0%)

**Phase 4 Discovery:**
- No servers with agents detected yet
- Need to run discovery scan in Phase 4 NOC module

**Next Steps:**
1. Run agent installation on source servers
2. Execute discovery scan in Phase 4
3. Check agent connectivity and configuration"""
        
        # Build server list response
        response = f"""**Phase 4 Servers in {project_name}:**

**Summary:**
- 🔍 **Discovered:** {len(phase_4_servers)} servers
- 📡 **Agent Status:** {phase_4_agent_status.get('online', 0)} online, {phase_4_agent_status.get('offline', 0)} offline
- ✅ **Migration Ready:** {phase_4_agent_status.get('ready', 0)} ready

**Server Details:**"""

        for i, server in enumerate(phase_4_servers[:5]):
            name = server.get('name', f'Server-{i+1}')
            ip = server.get('ip', 'N/A')
            agent_status = server.get('agent_status', 'unknown')
            migration_ready = server.get('migration_ready', False)
            
            status_icon = "🟢" if agent_status == 'online' else "🔴" if agent_status == 'offline' else "⚪"
            ready_icon = "✅" if migration_ready else "❌"
            
            response += f"""
{i+1}. **{name}**
   - IP: {ip}
   - Agent: {status_icon} {agent_status}
   - Migration Ready: {ready_icon} {migration_ready}"""
        
        if len(phase_4_servers) > 5:
            response += f"\n\n... and {len(phase_4_servers) - 5} more servers"
        
        return response
    
    # Check for Phase 2 asset queries
    elif any(term in query_lower for term in ['phase 2', 'blueprint', 'asset', 'planned', 'quoted']):
        if not phase_2_assets:
            return f"""**No blueprint assets found in Phase 2 for {project_name}.**

**Phase 2 Status:**
- 📋 **Planned ECS Instances:** {planned_instances}
- 💰 **Commercial Intent:** Complete
- 🎯 **Target Configuration:** Ready

**Next Steps:**
1. Check Phase 2 blueprint configuration
2. Verify commercial intent data
3. Review deployment timeline"""
        
        response = f"""**Phase 2 Blueprint Assets for {project_name}:**

**Summary:**
- 📋 **Total Assets:** {len(phase_2_assets)} deployable assets
- 💰 **Quoted ECS:** {planned_instances} instances

**Asset Details:**"""

        for i, asset in enumerate(phase_2_assets[:5]):
            name = asset.get('name', f'Asset-{i+1}')
            spec = asset.get('spec', 'Unknown')
            vpc = asset.get('vpc', 'N/A')
            cost = asset.get('monthly_cost', 'N/A')
            
            response += f"""
{i+1}. **{name}**
   - Spec: {spec}
   - VPC: {vpc}
   - Monthly Cost: ${cost}"""
        
        if len(phase_2_assets) > 5:
            response += f"\n\n... and {len(phase_2_assets) - 5} more assets"
        
        return response
    
    # Check for Phase 5 reconciliation queries
    elif any(term in query_lower for term in ['phase 5', 'reconciliation', 'ri', 'reserved', 'gap']):
        if missing_ris == 0:
            return f"""**Phase 5 Reconciliation Status for {project_name}:**

**RI Coverage:**
- ✅ **Quoted RIs:** {total_quoted}
- ✅ **Owned RIs:** {total_owned}
- ✅ **Missing RIs:** {missing_ris}

All {total_quoted} quoted RIs have been purchased. The reconciliation is complete and balanced.

**Next Steps:**
1. Monitor RI utilization in Huawei Console
2. Consider optimizing RI coverage for future scaling
3. Review RI expiration dates for renewal planning"""
        
        # Find urgent missing RIs
        urgent_ris = []
        for item in phase_5_matrix:
            if item.get('missing_ris', 0) > 0:
                spec = item.get('specification', 'Unknown')
                missing_count = item.get('missing_ris', 0)
                live_count = item.get('live_count', 0)
                quoted_count = item.get('quoted_count', 0)
                
                urgency_score = live_count - (quoted_count - missing_ris)
                if urgency_score > 0:
                    urgent_ris.append({
                        'spec': spec,
                        'missing': missing_count,
                        'live': live_count,
                        'quoted': quoted_count,
                        'urgency': urgency_score
                    })
        
        # Sort by urgency
        urgent_ris.sort(key=lambda x: x['urgency'], reverse=True)
        
        response = f"""**Phase 5 Reconciliation Analysis for {project_name}:**

**RI Coverage Status:**
- 📋 **Quoted RIs:** {total_quoted}
- ✅ **Owned RIs:** {total_owned}
- ⚠️ **Missing RIs:** {missing_ris} ({missing_ris/total_quoted*100:.1f}% of quoted)"""

        if urgent_ris:
            response += "\n\n**Urgent RI Purchases Needed:**"
            for i, ri in enumerate(urgent_ris[:3]):
                response += f"""
{i+1}. **{ri['spec']}**
   - Missing: {ri['missing']} RIs
   - Live Servers: {ri['live']}
   - Quoted: {ri['quoted']}"""
            
            if len(urgent_ris) > 3:
                response += f"\n\n... and {len(urgent_ris) - 3} more specs need attention"
        
        response += f"""

**Recommendations:**
1. Purchase missing RIs for urgent specs first
2. Review RI utilization patterns
3. Consider RI optimization strategies"""
        
        return response
    
    # General project status query
    else:
        # Calculate RI coverage percentage safely
        ri_coverage_pct = (total_owned / total_quoted * 100) if total_quoted > 0 else 0.0
        
        return f"""**Project Status: {project_name}**

**Overall Health:**
- ✅ **RI Coverage:** {total_owned}/{total_quoted} ({ri_coverage_pct:.1f}%)
- ⚠️ **Missing RIs:** {missing_ris} across {len(phase_5_matrix)} specs
- 🔥 **Live Servers without RIs:** {sum(1 for item in phase_5_matrix if item.get('live_count', 0) > 0 and item.get('owned_count', 0) == 0)} specs

**Phase 2 - Blueprint:**
- 📋 **Planned Assets:** {planned_instances} deployable assets
- 💰 **Commercial Intent:** {planned_instances} ECS instances
- 🎯 **Target Configuration:** Complete

**Phase 4 - Deployment/NOC:**
- 🔍 **Discovered Servers:** {len(phase_4_servers)} with agents
- 📡 **Agent Status:** {phase_4_agent_status.get('online', 0)} online, {phase_4_agent_status.get('offline', 0)} offline
- ✅ **Migration Ready:** {phase_4_agent_status.get('ready', 0)} servers

**Phase 5 - Reconciliation:**
- 📊 **Matrix Specs:** {len(phase_5_matrix)} specifications analyzed
- ⚖️ **RI Balance:** {missing_ris} missing, {total_owned} owned, {total_quoted} quoted

**Cross-Phase Analysis:**
1. **Blueprint → Discovery Gap:** {planned_instances - len(phase_4_servers)} assets not yet discovered
2. **Discovery → Migration Gap:** {len(phase_4_servers) - phase_4_agent_status.get('ready', 0)} servers not migration ready
3. **Migration → Live Gap:** {phase_4_agent_status.get('ready', 0) - live_servers} discovered but not live

**Priority Actions:**
1. **Phase 4**: Fix agent issues for {phase_4_agent_status.get('offline', 0)} offline servers
2. **Phase 5**: Purchase {missing_ris} missing RIs
3. **Phase 2→4**: Discover remaining {planned_instances - len(phase_4_servers)} assets
4. **Phase 4→5**: Migrate {phase_4_agent_status.get('ready', 0)} ready servers

**Try asking:**
- "List Phase 4 servers" for discovery details
- "Show RI gaps" for reconciliation details  
- "Check migration readiness" for Phase 4 status
- "What's in the blueprint?" for Phase 2 details"""