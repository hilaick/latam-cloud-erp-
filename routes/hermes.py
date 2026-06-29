"""
Hermes integration for the ERP system.
Simple endpoint to query Hermes with project context.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import json
import subprocess
import os

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
    
    # Extract detailed data from each phase
    context = {
        "project_id": project_id,
        "project_name": data.get('name', f'Project {project_id}'),
        "customer_name": data.get('customerName', 'Unknown Customer'),
        
        # Phase 2 - Blueprint
        "phase_2_blueprint": phase_2,
        "phase_2_assets": phase_2.get('commercial_intent', {}).get('deployable_assets', []),
        "phase_2_asset_count": len(phase_2.get('commercial_intent', {}).get('deployable_assets', [])),
        
        # Phase 4 - Deployment/NOC
        "phase_4_deployment": phase_4,
        "phase_4_servers": phase_4.get('servers', []),
        "phase_4_server_count": len(phase_4.get('servers', [])),
        "phase_4_sandbox": phase_4.get('sandbox_vpc', {}),
        "phase_4_migration_tasks": phase_4.get('migration_tasks', []),
        "phase_4_agent_status": {
            'online': len([s for s in phase_4.get('servers', []) if s.get('agent_status') == 'online']),
            'offline': len([s for s in phase_4.get('servers', []) if s.get('agent_status') == 'offline']),
            'ready': len([s for s in phase_4.get('servers', []) if s.get('migration_ready') == True]),
            'not_ready': len([s for s in phase_4.get('servers', []) if s.get('migration_ready') == False]),
        },
        
        # Phase 5 - Reconciliation
        "phase_5_reconciliation": phase_5,
        "phase_5_matrix": phase_5.get('matrix', []),
        "phase_5_summary": phase_5.get('summary', {}),
        "missing_ris": phase_5.get('summary', {}).get('total_missing', 0),
        "live_servers": phase_5.get('summary', {}).get('total_live', 0),
        "technical_categories": phase_5.get('summary', {}).get('technical_categories', {}),
        
        # Quotation Data
        "quotation_data": quotation,
        "quotation_servers": quotation.get('servers', []),
        "quotation_server_count": len(quotation.get('servers', [])),
        "total_quoted_ris": quotation.get('summary', {}).get('total_ris', 0),
        
        # Console RIs
        "console_ris": console_ris,
        "console_ri_servers": console_ris.get('servers', []),
        "console_ri_count": len(console_ris.get('servers', [])),
        "total_owned_ris": console_ris.get('total_ris', 0),
        
        # Active Subscriptions
        "active_subs_status": phase_5.get('active_subs_status', {})
    }
    
    return context

@hermes_bp.route('/api/hermes/query', methods=['POST'])
# @jwt_required()  # Temporarily disabled for testing
def hermes_query():
    """Simple endpoint that calls local Hermes with project context"""
    try:
        data = request.get_json()
        project_id = data.get('projectId')
        query = data.get('query', '').strip()
        
        if not project_id:
            return jsonify({"error": "projectId is required"}), 400
        
        if not query:
            return jsonify({"error": "query is required"}), 400
        
        # Build context prompt with detailed phase information
        context = build_hermes_context(project_id)
        prompt = f"""You are Hermes, an AI assistant for the Huawei Cloud ERP migration system.
You are helping with a cloud migration project. You have FULL ACCESS to all project data across all phases.

IMPORTANT: You can see detailed data from all phases. Use this data to answer questions specifically and accurately.

PROJECT CONTEXT:
Project ID: {context.get('project_id')}
Project Name: {context.get('project_name')}
Customer: {context.get('customer_name')}

PHASE 2 - BLUEPRINT (Commercial Intent):
- {context.get('phase_2_asset_count', 0)} ECS instances planned in blueprint
- Full blueprint data available with {len(context.get('phase_2_assets', []))} deployable assets
- Each asset has: name, spec, vpc, cost, and configuration details
- **Asset List:** {[asset.get('name', f'Asset-{i}') for i, asset in enumerate(context.get('phase_2_assets', [])[:5])]}

PHASE 4 - DEPLOYMENT/NOC (Current State):
- {context.get('phase_4_server_count', 0)} servers discovered with agents
- Agent Status: {context.get('phase_4_agent_status', {}).get('online', 0)} online, {context.get('phase_4_agent_status', {}).get('offline', 0)} offline
- Migration Ready: {context.get('phase_4_agent_status', {}).get('ready', 0)} ready, {context.get('phase_4_agent_status', {}).get('not_ready', 0)} not ready
- Sandbox VPC: {context.get('phase_4_sandbox', {}).get('id', 'Not configured')}
- {len(context.get('phase_4_migration_tasks', []))} migration tasks configured
- **Server List:** {[server.get('name', f'Server-{i}') for i, server in enumerate(context.get('phase_4_servers', [])[:5])]}
- **Server Details:** Each server has: name, IP, agent_status, migration_ready, specs

PHASE 5 - RECONCILIATION (Gap Analysis):
- Missing RIs: {context.get('missing_ris', 0)}
- Live Servers: {context.get('live_servers', 0)}
- Technical Categories: {len(context.get('technical_categories', {}))}
- Reconciliation Matrix: {len(context.get('phase_5_matrix', []))} specs with quoted/owned/live counts
- **Matrix Details:** {[{k: v for k, v in item.items() if k in ['specification', 'quoted_count', 'owned_count', 'live_count', 'missing_ris']} for item in context.get('phase_5_matrix', [])[:3]]}
- Each matrix entry shows: spec, quoted count, owned count, live count, missing count

QUOTATION DATA:
- {context.get('quotation_server_count', 0)} servers in quotation
- Total RIs quoted: {context.get('total_quoted_ris', 0)}
- Each quoted server has: name, spec, monthly_cost, term
- **Quoted Servers:** {[server.get('name', f'Quoted-{i}') for i, server in enumerate(context.get('quotation_servers', [])[:3])]}

CONSOLE RIS (Owned):
- {context.get('console_ri_count', 0)} RIs owned in console
- Total RIs owned: {context.get('total_owned_ris', 0)}
- Each owned RI has: spec, count, expiration_date
- **Owned RIs:** {[ri.get('spec', f'RI-{i}') for i, ri in enumerate(context.get('console_ri_servers', [])[:3])]}

USER QUERY:
{query}

INSTRUCTIONS:
1. Use the detailed data above to answer the query specifically
2. If asking about servers, list them with their details
3. If asking about migration readiness, check phase_4_agent_status
4. If asking about RI gaps, check phase_5_matrix
5. If asking about costs, check quotation_data
6. Be concise but thorough - include relevant numbers and specifics
7. Reference which phase data you're using
8. When listing items, show actual names/IDs from the data

Answer based on the actual data available above."""


        # For now, use the canned response since Hermes CLI is timing out
        # TODO: Fix Hermes CLI integration when we have more time
        response = generate_hermes_response(query, context)
        
        return jsonify({
            'response': response,
            'context_summary': {
                'project_name': context.get('project_name'),
                'customer_name': context.get('customer_name'),
                'total_quoted_ris': context.get('quotation_data', {}).get('summary', {}).get('total_ris', 0),
                'total_owned_ris': context.get('console_ris', {}).get('total_ris', 0),
                'missing_ris': context.get('missing_ris', 0),
                'live_servers': context.get('live_servers', 0),
                'planned_instances': len(context.get('phase_2_blueprint', {}).get('commercial_intent', {}).get('deployable_assets', []))
            }
        })
            
    except subprocess.TimeoutExpired:
        return jsonify({
            "error": "Hermes query timed out after 30 seconds"
        }), 504
    except Exception as e:
        return jsonify({
            "error": f"Internal server error: {str(e)}"
        }), 500


def generate_hermes_response(query, context):
    """Generate a contextual AI response based on project data"""
    
    # Extract key metrics
    project_name = context.get('project_name', 'Unknown Project')
    customer_name = context.get('customer_name', 'Unknown Customer')
    total_quoted = context.get('quotation_data', {}).get('summary', {}).get('total_ris', 0)
    total_owned = context.get('console_ris', {}).get('total_ris', 0)
    missing_ris = context.get('missing_ris', 0)
    live_servers = context.get('live_servers', 0)
    planned_instances = len(context.get('phase_2_blueprint', {}).get('commercial_intent', {}).get('deployable_assets', []))
    
    # Get reconciliation matrix
    matrix = context.get('phase_5_reconciliation', {}).get('matrix', [])
    
    # Analyze query type
    query_lower = query.lower()
    
    if 'ri' in query_lower or 'reserved' in query_lower or 'reconciliation' in query_lower:
        return generate_ri_response(query, context, matrix, total_quoted, total_owned, missing_ris)
    elif 'ecs' in query_lower or 'server' in query_lower or 'instance' in query_lower:
        return generate_ecs_response(query, context, planned_instances, live_servers)
    elif 'status' in query_lower or 'progress' in query_lower:
        return generate_status_response(query, context, matrix)
    elif 'help' in query_lower or 'assist' in query_lower:
        return generate_help_response()
    else:
        return generate_general_response(query, context)


def generate_ri_response(query, context, matrix, total_quoted, total_owned, missing_ris):
    """Generate response for RI-related queries"""
    
    if missing_ris == 0:
        return f"""Great news! For project **{context.get('project_name')}**, all Reserved Instances are accounted for.

**RI Reconciliation Status:**
- ✅ **Quoted RIs:** {total_quoted}
- ✅ **Owned RIs:** {total_owned} 
- ✅ **Missing RIs:** {missing_ris}

All {total_quoted} quoted RIs have been purchased. The reconciliation is complete and balanced.

**Next Steps:**
1. Monitor RI utilization in Huawei Console
2. Consider optimizing RI coverage for future scaling
3. Review RI expiration dates for renewal planning

Is there anything specific about the RI coverage you'd like me to analyze?"""
    
    else:
        # Find urgent missing RIs
        urgent_ris = []
        for item in matrix:
            if item.get('missing_ris', 0) > 0:
                spec = item.get('specification', 'Unknown')
                missing_count = item.get('missing_ris', 0)
                live_count = item.get('live_count', 0)
                quoted_count = item.get('quoted_count', 0)
                
                # Calculate urgency (higher live servers without RIs = more urgent)
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
        
        response = f"""**RI Reconciliation Status for {context.get('project_name')}:**

**Summary:**
- 📋 **Quoted RIs:** {total_quoted}
- ✅ **Owned RIs:** {total_owned}
- ⚠️ **Missing RIs:** {missing_ris} ({missing_ris/total_quoted*100:.1f}% of quoted)

**Urgent RI Purchases Needed:**"""
        
        if urgent_ris:
            for i, ri in enumerate(urgent_ris[:3], 1):
                response += f"\n{i}. **{ri['spec']}** - Missing: {ri['missing']} | Live servers: {ri['live']} | Urgency: {'High' if ri['urgency'] > 2 else 'Medium'}"
        else:
            response += "\nNo urgent RI gaps identified. All live servers have matching RI coverage."
        
        response += f"""

**Recommendations:**
1. Purchase missing RIs within 30 days to avoid pay-as-you-go costs
2. Focus on specs with live servers first
3. Consider 1-year commitments for flexibility
4. Review RI utilization monthly

Would you like me to generate a purchase order for the missing RIs?"""
        
        return response


def generate_ecs_response(query, context, planned_instances, live_servers):
    """Generate response for ECS-related queries"""
    
    # Get detailed server data from Phase 4
    phase_4_servers = context.get('phase_4_servers', [])
    phase_4_agent_status = context.get('phase_4_agent_status', {})
    phase_2_assets = context.get('phase_2_assets', [])
    
    # Check if query is asking for server list
    query_lower = query.lower()
    
    # Check for specific server queries
    if any(term in query_lower for term in ['list server', 'show server', 'which server', 'what server', 'server list', 'servers']):
        # User wants to see server details
        if not phase_4_servers:
            return f'''**No servers discovered in Phase 4 for {context.get('project_name')}.**

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
3. Check agent connectivity and configuration'''

        # Build server list response
        response = f'''**ECS Servers in {context.get('project_name')} - Phase 4 Discovery:**

**Summary:**
- 📋 **Planned (Phase 2):** {planned_instances} instances
- 🔍 **Discovered (Phase 4):** {len(phase_4_servers)} servers with agents
- 🚀 **Live (Phase 5):** {live_servers} servers deployed
- 📊 **Agent Status:** {phase_4_agent_status.get('online', 0)} online, {phase_4_agent_status.get('offline', 0)} offline
- ✅ **Migration Ready:** {phase_4_agent_status.get('ready', 0)} ready, {phase_4_agent_status.get('not_ready', 0)} not ready

**Server Details:**'''

        # List servers (limit to 10 for readability)
        for i, server in enumerate(phase_4_servers[:10]):
            name = server.get('name', f'Server-{i+1}')
            ip = server.get('ip', 'N/A')
            agent_status = server.get('agent_status', 'unknown')
            migration_ready = server.get('migration_ready', False)
            specs = server.get('specs', {})
            
            status_icon = "🟢" if agent_status == 'online' else "🔴" if agent_status == 'offline' else "⚪"
            ready_icon = "✅" if migration_ready else "❌"
            
            response += f'''
{i+1}. **{name}**
   - IP: {ip}
   - Agent: {status_icon} {agent_status}
   - Migration Ready: {ready_icon} {migration_ready}
   - Specs: {specs.get('vCPU', 'N/A')} vCPU, {specs.get('memory', 'N/A')} GB RAM, {specs.get('storage', 'N/A')} GB'''
        
        if len(phase_4_servers) > 10:
            response += f'''

... and {len(phase_4_servers) - 10} more servers'''
        
        response += f'''

**Available Actions:**
1. Check migration readiness for specific servers
2. View detailed agent logs
3. Configure migration tasks
4. Test in sandbox VPC

**Try asking:**
- "Show migration readiness for server XYZ"
- "Check agent status for server ABC"
- "What are the specs of server DEF?"'''

        return response
    
    # Check for specific asset queries (Phase 2)
    elif any(term in query_lower for term in ['asset', 'blueprint', 'planned', 'quoted']):
        if not phase_2_assets:
            return f'''**No blueprint assets found in Phase 2 for {context.get('project_name')}.**

**Phase 2 Status:**
- 📋 **Planned ECS Instances:** {planned_instances}
- 💰 **Commercial Intent:** Complete
- 🎯 **Target Configuration:** Ready

**Next Steps:**
1. Check Phase 2 blueprint configuration
2. Verify commercial intent data
3. Review deployment timeline'''

        response = f'''**Blueprint Assets in {context.get('project_name')} - Phase 2:**

**Summary:**
- 📋 **Total Assets:** {len(phase_2_assets)} deployable assets
- 💰 **Quoted ECS:** {planned_instances} instances
- 🎯 **Target Configuration:** Complete

**Asset Details:**'''

        # List assets (limit to 10 for readability)
        for i, asset in enumerate(phase_2_assets[:10]):
            name = asset.get('name', f'Asset-{i+1}')
            spec = asset.get('spec', 'Unknown')
            vpc = asset.get('vpc', 'N/A')
            cost = asset.get('monthly_cost', 'N/A')
            config = asset.get('configuration', {})
            
            response += f'''
{i+1}. **{name}**
   - Spec: {spec}
   - VPC: {vpc}
   - Monthly Cost: ${cost}
   - Configuration: {config.get('os', 'N/A')}, {config.get('storage_type', 'N/A')}'''
        
        if len(phase_2_assets) > 10:
            response += f'''

... and {len(phase_2_assets) - 10} more assets'''
        
        response += f'''

**Available Actions:**
1. Review detailed specifications
2. Check cost breakdown
3. Validate network configuration
4. Plan deployment schedule

**Try asking:**
- "What's the spec for asset XYZ?"
- "How much does asset ABC cost?"
- "What VPC is asset DEF in?"'''

        return response
    
    # Default ECS response
    return f'''**ECS Status for {context.get('project_name')}:**

**Cross-Phase Overview:**
- 📋 **Planned (Phase 2):** {planned_instances} instances
- 🔍 **Discovered (Phase 4):** {len(phase_4_servers)} servers with agents
- 🚀 **Live (Phase 5):** {live_servers} servers deployed

**Phase 4 Discovery:**
- Agents: {phase_4_agent_status.get('online', 0)} online, {phase_4_agent_status.get('offline', 0)} offline
- Migration Ready: {phase_4_agent_status.get('ready', 0)} ready, {phase_4_agent_status.get('not_ready', 0)} not ready
- Sandbox VPC: {context.get('phase_4_sandbox', {}).get('id', 'Not configured')}

**Available Data:**
- **Phase 2:** {len(phase_2_assets)} blueprint assets with specs and costs
- **Phase 4:** {len(phase_4_servers)} discovered servers with agent status
- **Phase 5:** {live_servers} live servers with RI coverage

**What would you like to know?**
- "List Phase 4 servers" - Show discovered servers with details
- "Show blueprint assets" - List Phase 2 planned assets
- "Check agent status" - View agent connectivity
- "Migration readiness" - Check which servers are ready'''
            

    
    # Default ECS response
    return f"""**ECS Status for {context.get('project_name')}:**

**Deployment Status:**
- 📋 **Planned ECS Instances (Phase 2):** {planned_instances}
- 🔍 **Discovered Servers (Phase 4):** {len(phase_4_servers)}
- 🚀 **Live ECS Servers (Phase 5):** {live_servers}
- 📊 **Deployment Progress:** {live_servers}/{planned_instances} ({live_servers/planned_instances*100:.1f}%)

**Phase 4 Discovery:**
- Agents Online: {phase_4_agent_status.get('online', 0)}
- Agents Offline: {phase_4_agent_status.get('offline', 0)}
- Migration Ready: {phase_4_agent_status.get('ready', 0)}
- Not Ready: {phase_4_agent_status.get('not_ready', 0)}

**Key Observations:**
1. {planned_instances - live_servers} instances still need to be deployed
2. {len(phase_4_servers)} servers discovered with agents
3. {phase_4_agent_status.get('ready', 0)} servers ready for migration

**Recommended Actions:**
1. Complete remaining ECS deployments
2. Verify network configurations for all servers
3. Check security group assignments
4. Monitor agent status in Phase 4

**Try asking:** "List servers in Phase 4" or "Show migration ready servers" for more details."""


def generate_status_response(query, context, matrix):
    """Generate project status response"""
    
    total_quoted = context.get('quotation_data', {}).get('summary', {}).get('total_ris', 0)
    total_owned = context.get('console_ris', {}).get('total_ris', 0)
    missing_ris = context.get('missing_ris', 0)
    
    # Get Phase 4 data
    phase_4_servers = context.get('phase_4_servers', [])
    phase_4_agent_status = context.get('phase_4_agent_status', {})
    phase_4_sandbox = context.get('phase_4_sandbox', {})
    phase_4_migration_tasks = context.get('phase_4_migration_tasks', [])
    
    # Get Phase 2 data
    phase_2_assets = context.get('phase_2_assets', [])
    
    # Count specs with issues
    specs_with_missing = sum(1 for item in matrix if item.get('missing_ris', 0) > 0)
    specs_with_live_no_ri = sum(1 for item in matrix if item.get('live_count', 0) > 0 and item.get('bought_count', 0) == 0)
    
    # Calculate RI coverage percentage safely
    ri_coverage_pct = (total_owned / total_quoted * 100) if total_quoted > 0 else 0.0
    
    return f"""**Project Status: {context.get('project_name')}**

**Overall Health:**
- ✅ **RI Coverage:** {total_owned}/{total_quoted} ({ri_coverage_pct:.1f}%)
- ⚠️ **Missing RIs:** {missing_ris} across {specs_with_missing} specs
- 🔥 **Live Servers without RIs:** {specs_with_live_no_ri} specs

**Phase 2 - Blueprint:**
- 📋 **Planned Assets:** {len(phase_2_assets)} deployable assets
- 💰 **Commercial Intent:** {len(context.get('phase_2_blueprint', {}).get('commercial_intent', {}).get('deployable_assets', []))} ECS instances
- 🎯 **Target Configuration:** Complete

**Phase 4 - Deployment/NOC:**
- 🔍 **Discovered Servers:** {len(phase_4_servers)} with agents
- 📡 **Agent Status:** {phase_4_agent_status.get('online', 0)} online, {phase_4_agent_status.get('offline', 0)} offline
- ✅ **Migration Ready:** {phase_4_agent_status.get('ready', 0)} servers
- 🏗️ **Sandbox VPC:** {phase_4_sandbox.get('id', 'Not configured')}
- ⚙️ **Migration Tasks:** {len(phase_4_migration_tasks)} configured

**Phase 5 - Reconciliation:**
- 📊 **Matrix Specs:** {len(matrix)} specifications analyzed
- ⚖️ **RI Balance:** {missing_ris} missing, {total_owned} owned, {total_quoted} quoted
- 🏷️ **Technical Categories:** {len(context.get('technical_categories', {}))} categories

**Cross-Phase Analysis:**
1. **Blueprint → Discovery Gap:** {len(phase_2_assets) - len(phase_4_servers)} assets not yet discovered
2. **Discovery → Migration Gap:** {phase_4_agent_status.get('not_ready', 0)} servers not migration ready
3. **Migration → Live Gap:** {len(phase_4_servers) - context.get('live_servers', 0)} discovered but not live

**Priority Actions:**
1. **Phase 4**: Fix agent issues for {phase_4_agent_status.get('offline', 0)} offline servers
2. **Phase 5**: Purchase {missing_ris} missing RIs
3. **Phase 2→4**: Discover remaining {max(0, len(phase_2_assets) - len(phase_4_servers))} assets
4. **Phase 4→5**: Migrate {phase_4_agent_status.get('ready', 0)} ready servers

**Try asking:**
- "List Phase 4 servers" for discovery details
- "Show RI gaps" for reconciliation details  
- "Check migration readiness" for Phase 4 status
- "What's in the blueprint?" for Phase 2 details"""


def generate_help_response():
    """Generate help response"""
    
    return """**Hermes AI Assistant - Huawei Cloud ERP Migration**

I can help you with:

**📊 RI Reconciliation**
- Check missing Reserved Instances
- Identify urgent purchase needs
- Analyze RI coverage gaps
- Generate purchase recommendations

**🚀 ECS Management**
- Track deployment progress
- Monitor live servers
- Identify configuration issues
- Plan capacity scaling

**📈 Project Status**
- Overall migration health
- Phase completion tracking
- Risk assessment
- Next steps planning

**💡 Technical Guidance**
- Huawei Cloud best practices
- Cost optimization strategies
- Security recommendations
- Performance tuning

**Try asking:**
- "What RIs are missing for CODELPA?"
- "How many ECS instances are live vs planned?"
- "What's our migration progress status?"
- "Which specs need urgent RI purchases?"

What would you like to know about your Huawei Cloud migration?"""


def generate_general_response(query, context):
    """Generate general contextual response"""
    
    project_name = context.get('project_name', 'Unknown Project')
    customer_name = context.get('customer_name', 'Unknown Customer')
    total_quoted = context.get('quotation_data', {}).get('summary', {}).get('total_ris', 0)
    total_owned = context.get('console_ris', {}).get('total_ris', 0)
    missing_ris = context.get('missing_ris', 0)
    live_servers = context.get('live_servers', 0)
    planned_instances = len(context.get('phase_2_blueprint', {}).get('commercial_intent', {}).get('deployable_assets', []))
    
    # Get Phase 4 data
    phase_4_servers = context.get('phase_4_servers', [])
    phase_4_agent_status = context.get('phase_4_agent_status', {})
    
    # Calculate some insights
    deployment_progress = f"{live_servers}/{planned_instances} ({live_servers/planned_instances*100:.1f}%)" if planned_instances > 0 else "0%"
    ri_coverage = f"{total_owned}/{total_quoted} ({total_owned/total_quoted*100:.1f}%)" if total_quoted > 0 else "0%"
    
    # Check query for specific phase references
    query_lower = query.lower()
    
    # Check for Phase 2 (Blueprint) queries
    if any(term in query_lower for term in ['blueprint', 'phase 2', 'commercial intent', 'planned', 'quoted', 'target']):
        return f'''**Phase 2 - Blueprint Analysis for {project_name}:**

**Commercial Intent:**
- 📋 **Planned Assets:** {len(context.get('phase_2_assets', []))} deployable assets
- 💰 **Quoted ECS Instances:** {planned_instances}
- 🎯 **Target Configuration:** Complete

**Blueprint Details:**
Each asset in the blueprint includes:
- Server specifications (vCPU, RAM, storage)
- Network configuration (VPC, subnet, security groups)
- Cost estimates and billing mode
- Deployment timeline targets

**Available Data:**
- Full commercial intent structure
- Deployable assets with specs
- Cost breakdowns
- Timeline estimates

**Try asking:**
- "Show me the blueprint assets"
- "What are the target specs?"
- "What's the commercial intent?"'''

    # Check for Phase 4 (Deployment) queries
    elif any(term in query_lower for term in ['phase 4', 'deployment', 'noc', 'agent', 'discovery', 'migration', 'sandbox', 'server list']):
        if not phase_4_servers:
            return f"""**Phase 4 - Deployment/NOC Status for {project_name}:**

**Discovery Status:**
- 🔍 **Servers Discovered:** 0 (no agents detected yet)
- 📡 **Agent Status:** No agents online
- ✅ **Migration Ready:** 0 servers
- 🏗️ **Sandbox VPC:** Not configured
- ⚙️ **Migration Tasks:** 0 configured

**Next Steps for Phase 4:**
1. Install agents on source servers
2. Run discovery scan in NOC module
3. Configure sandbox VPC
4. Set up migration tasks
5. Check agent connectivity

**Phase 4 provides:**
- Server discovery with agents
- Migration readiness assessment
- Sandbox environment for testing
- Migration task configuration
- Execution orchestration"""

        return f'''**Phase 4 - Deployment/NOC Status for {project_name}:**

**Discovery Status:**
- 🔍 **Servers Discovered:** {len(phase_4_servers)} with agents
- 📡 **Agent Status:** {phase_4_agent_status.get('online', 0)} online, {phase_4_agent_status.get('offline', 0)} offline
- ✅ **Migration Ready:** {phase_4_agent_status.get('ready', 0)} servers
- ❌ **Not Ready:** {phase_4_agent_status.get('not_ready', 0)} servers
- 🏗️ **Sandbox VPC:** {context.get('phase_4_sandbox', {}).get('id', 'Not configured')}
- ⚙️ **Migration Tasks:** {len(context.get('phase_4_migration_tasks', []))} configured

**Phase 4 Capabilities:**
1. **Discovery**: Agent-based server scanning
2. **Readiness Assessment**: Migration compatibility checks
3. **Sandbox Testing**: Safe migration testing environment
4. **Task Orchestration**: Automated migration execution
5. **Progress Monitoring**: Real-time migration tracking

**Available Data:**
- Full server list with agent status
- Migration readiness scores
- Sandbox VPC configuration
- Migration task definitions

**Try asking:**
- "List Phase 4 servers"
- "Show agent status"
- "Check migration readiness"
- "What's in the sandbox?"'''

    # Check for Phase 5 (Reconciliation) queries
    elif any(term in query_lower for term in ['phase 5', 'reconciliation', 'ri', 'reserved instance', 'gap', 'coverage', 'matrix']):
        # Calculate RI coverage percentage safely
        missing_pct = (missing_ris / total_quoted * 100) if total_quoted > 0 else 0.0
        
        return f'''**Phase 5 - Reconciliation Analysis for {project_name}:**

**RI Coverage Status:**
- ✅ **Quoted RIs:** {total_quoted}
- ✅ **Owned RIs:** {total_owned}
- ⚠️ **Missing RIs:** {missing_ris} ({missing_pct:.1f}% of quoted)

**Reconciliation Matrix:**
- 📊 **Specifications Analyzed:** {len(context.get('phase_5_matrix', []))}
- 🏷️ **Technical Categories:** {len(context.get('technical_categories', {}))}
- ⚖️ **Coverage Gaps:** Identified across {sum(1 for item in context.get('phase_5_matrix', []) if item.get('missing_ris', 0) > 0)} specs

**Phase 5 Analysis:**
1. **Cross-reference**: Compare quoted vs owned vs live
2. **Gap Identification**: Find missing RI coverage
3. **Cost Optimization**: Suggest RI purchases
4. **Compliance Tracking**: Ensure billing alignment

**Available Data:**
- Full reconciliation matrix
- Technical category mappings
- Live vs owned vs quoted counts
- Gap analysis by spec

**Try asking:**
- "Show RI gaps"
- "What specs need RIs?"
- "Show reconciliation matrix"
- "What's our coverage status?"'''

    # Default general response
    return f"""I'm analyzing your Huawei Cloud ERP migration project **{project_name}** for customer **{customer_name}**.

**Current Status Across All Phases:**

**Phase 2 - Blueprint:**
- 📋 **Planned Assets:** {len(context.get('phase_2_assets', []))}
- 💰 **Quoted ECS:** {planned_instances}

**Phase 4 - Deployment/NOC:**
- 🔍 **Discovered Servers:** {len(phase_4_servers)}
- 📡 **Agent Status:** {phase_4_agent_status.get('online', 0)} online, {phase_4_agent_status.get('offline', 0)} offline
- ✅ **Migration Ready:** {phase_4_agent_status.get('ready', 0)} servers

**Phase 5 - Reconciliation:**
- 🚀 **Live Servers:** {live_servers} ({deployment_progress} deployed)
- ✅ **RI Coverage:** {ri_coverage}
- ⚠️ **Missing RIs:** {missing_ris}

**Your question:** "{query}"

**How I can help:**
I have access to detailed data from all phases. You can ask me about:

**Phase 2 (Blueprint):** "What's in the blueprint?", "Show me planned assets"
**Phase 4 (Deployment):** "List servers in Phase 4", "Check agent status", "Show migration readiness"
**Phase 5 (Reconciliation):** "Show RI gaps", "What specs need RIs?", "Reconciliation status"

What specific information would you like from which phase?"""