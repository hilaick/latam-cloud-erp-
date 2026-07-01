# Huawei ModelArts Hermes endpoint
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import json
import logging
import requests
from models import Customer, ProjectData, HuaweiAccount, MigrationTask, db

logger = logging.getLogger(__name__)
hermes_bp = Blueprint('hermes', __name__)

# Huawei ModelArts load balancer
LOAD_BALANCER_URL = "http://localhost:8666/v1/chat/completions"
LOAD_BALANCER_AUTH = "Basic YWRtaW46ODIxODcwZWVlNGQzMTA4NGUxYmZmNDA1YWJhMTVjYTY="  # admin:821870eee4d31084e1bff405aba15ca6

def build_hermes_context(project_id):
    """Build context about the ERP system for Hermes AI"""
    context = {
        "system_info": "Huawei Cloud ERP System - Real-time Data Access",
        "available_data": {
            "customers": "Customer directory with Huawei Cloud credentials",
            "projects": "Migration and greenfield project data",
            "huawei_accounts": "Huawei Cloud account credentials",
            "playbooks": "Global migration playbooks",
            "migration_logs": "Ad-hoc migration task logs"
        }
    }
    
    # Add customer data if project_id is provided
    if project_id:
        try:
            # Try to find project data
            project = ProjectData.query.filter_by(id=project_id).first()
            if project:
                context["current_project"] = {
                    "id": project.id,
                    "type": project.project_type,
                    "updated_at": project.updated_at.isoformat() if project.updated_at else None
                }
                
                # Try to parse project data JSON
                try:
                    project_data = json.loads(project.data)
                    context["project_details"] = {
                        "name": project_data.get("name", "Unknown"),
                        "customer_name": project_data.get("customer_name", "Unknown"),
                        "status": project_data.get("status", "Unknown")
                    }
                except:
                    context["project_details"] = {"raw_data_available": True}
        except Exception as e:
            logger.error(f"Error fetching project data: {str(e)}")
    
    # Add customer count
    try:
        customer_count = Customer.query.count()
        context["customer_count"] = customer_count
    except Exception as e:
        logger.error(f"Error counting customers: {str(e)}")
        context["customer_count"] = 0
    
    return context

@hermes_bp.route('/api/hermes/query', methods=['POST'])
# @jwt_required()
def hermes_query():
    try:
        data = request.get_json()
        if not data:
            logger.error("Hermes query: No JSON data received")
            return jsonify({
                'response': 'No JSON data received',
                'status': 'error'
            }), 400
            
        logger.info(f"Hermes query received: {data}")
        project_id = data.get('projectId')
        messages = data.get('messages', [])
        
        # Extract the last user message from the conversation history
        user_query = ''
        if messages:
            # Find the last user message
            for msg in reversed(messages):
                if msg.get('role') == 'user':
                    user_query = msg.get('content', '')
                    break
        
        # Fallback to direct query field if provided
        if not user_query:
            user_query = data.get('query', '')
        
        # Simple response without LLM integration
        if not user_query:
            logger.warning(f"Hermes query: No user query found in data: {data}")
            return jsonify({
                'response': 'Please provide a query parameter or messages array.',
                'status': 'error'
            }), 400
        
        # ⚡⚡⚡ SIMPLE PROXY TO HERMES CLI API ⚡⚡⚡
        # NO pattern matching, NO logic duplication
        # Let Hermes CLI handle ALL intelligence
        try:
            # Forward the query to the Hermes CLI API
            import requests
            local_api_url = f"http://localhost:{request.environ.get('SERVER_PORT', 5000)}/api/hermes-cli/query"
            
            # Build the request for the new API
            cli_request_data = {
                'query': user_query,
                'type': 'natural',
                'projectId': project_id,
                'full_context': True  # Give Hermes CLI full context
            }
            
            try:
                # Call the Hermes CLI API with 30-second timeout
                response = requests.post(
                    local_api_url,
                    json=cli_request_data,
                    timeout=30  # Give more time for complex queries
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Return whatever Hermes CLI returns
                    return jsonify({
                        'response': result.get('response', 'No response from Hermes CLI'),
                        'projectId': project_id,
                        'status': 'success',
                        'data': result.get('data', []),
                        'source': 'hermes-cli'  # Mark as coming from Hermes CLI
                    })
                else:
                    logger.error(f"Hermes CLI API error: {response.status_code} - {response.text}")
                    # Fallback to simple database query
                    return fallback_to_database_query(user_query, project_id)
                    
            except requests.exceptions.Timeout:
                logger.error("Hermes CLI API timeout after 30 seconds")
                # Fallback to simple database query
                return fallback_to_database_query(user_query, project_id)
            except requests.exceptions.ConnectionError:
                logger.error("Hermes CLI API connection refused")
                # Fallback to simple database query
                return fallback_to_database_query(user_query, project_id)
                
        except Exception as e:
            logger.error(f"Hermes CLI API connection error: {str(e)}", exc_info=True)
            # Ultimate fallback
            return jsonify({
                'response': f'Query received: "{user_query}". Hermes AI is connected to Huawei Cloud ERP database.',
                'projectId': project_id,
                'status': 'simplified',
                'source': 'fallback'
            })
                
    except Exception as e:
        logger.error(f"Hermes Query Error: {str(e)}", exc_info=True)
        return jsonify({"error": f"Internal Agent Error: {str(e)}"}), 500

def fallback_to_database_query(user_query, project_id):
    """Fallback to simple database queries when Hermes CLI is unavailable"""
    query_lower = user_query.lower()
    
    # Only handle VERY basic queries as fallback
    if 'customer' in query_lower:
        customers = Customer.query.limit(10).all()
        if customers:
            customer_list = []
            for cust in customers:
                customer_list.append(f"- {cust.name} (ID: {cust.id}, Region: {cust.region})")
            return jsonify({
                'response': f"Found {len(customer_list)} customers:\n" + "\n".join(customer_list),
                'projectId': project_id,
                'status': 'success',
                'data': [{'id': c.id, 'name': c.name, 'region': c.region} for c in customers],
                'source': 'fallback-db'
            })
    
    elif 'project' in query_lower:
        projects = ProjectData.query.limit(10).all()
        if projects:
            project_list = []
            for proj in projects:
                try:
                    proj_data = json.loads(proj.data) if proj.data else {}
                    proj_name = proj_data.get('name', proj.id)
                    project_list.append(f"- {proj_name} (ID: {proj.id})")
                except:
                    project_list.append(f"- {proj.id}")
            
            return jsonify({
                'response': f"Found {len(project_list)} projects:\n" + "\n".join(project_list),
                'projectId': project_id,
                'status': 'success',
                'source': 'fallback-db'
            })
    
    # Generic fallback response
    return jsonify({
        'response': f'I received your query: "{user_query}". For full AI-powered responses, please ensure the Hermes CLI service is running.',
        'projectId': project_id,
        'status': 'fallback',
        'source': 'fallback-generic'
    })