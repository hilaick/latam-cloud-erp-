import json
import logging
from services.huawei_load_balancer import HuaweiLoadBalancer
from models import db, CognitiveLearningLog

logger = logging.getLogger(__name__)
llm_balancer = HuaweiLoadBalancer()

def classify_unknown_service_with_ai(service_name: str, service_desc: str, project_id: str = None) -> str:
    """
    Uses the Huawei ModelArts LLM to semantically categorize unknown cloud services.
    Logs the decision to the database to build a permanent training corpus.
    """
    prompt = f"""
    You are an expert cloud architect. Categorize the following cloud service into EXACTLY ONE of these categories: 
    ['compute', 'database', 'network', 'storage', 'security', 'unknown'].
    
    Service Name: {service_name}
    Description: {service_desc}
    
    Respond ONLY with the category name in lowercase. Do not add punctuation or explanation.
    """
    
    request_data = {
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1, # Keep it low for deterministic classification
        "max_tokens": 10
    }
    
    try:
        response = llm_balancer.chat_completion(request_data)
        
        category = 'unknown'
        if response.get('success', True) and 'choices' in response:
            category = response['choices'][0]['message']['content'].strip().lower()
            
            # Strict validation
            valid_categories = ['compute', 'database', 'network', 'storage', 'security']
            if category not in valid_categories:
                category = 'unknown'
                
            # Log the cognitive decision to the database
            if category != 'unknown':
                log = CognitiveLearningLog(
                    project_id=project_id,
                    error_signature=f"Unrecognized SOW Service: {service_name} | {service_desc}",
                    context_snapshot=json.dumps({"service": service_name, "desc": service_desc}),
                    ai_remediation_applied=f"Semantic Fallback mapped to: {category}",
                    success=True
                )
                db.session.add(log)
                db.session.commit()
                logger.info(f"🧠 Cognitive Engine learned new service: '{service_name}' -> {category}")
                
        return category
        
    except Exception as e:
        logger.error(f"AI Semantic Fallback failed: {str(e)}")
        db.session.rollback()
        return 'unknown'
