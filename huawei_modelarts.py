#!/usr/bin/env python3
"""
Direct Huawei ModelArts API caller for Hermes CLI replacement
"""

import requests
import json
import sys
import os

def call_huawei_modelarts(query, context=None):
    """Call Huawei ModelArts API directly"""
    url = "http://admin:821870eee4d31084e1bff405aba15ca6@localhost:8666/v1/chat/completions"
    
    # Build context information
    system_message = "You are Hermes, an AI assistant for Huawei Cloud ERP system. "
    system_message += "You have access to the ERP database and can help with queries about customers, projects, migration tasks, and Huawei Cloud accounts. "
    system_message += "You can also execute system commands, read files, and perform analysis."
    
    if context:
        system_message += f"\n\nContext for this query:\n"
        if context.get('project_id'):
            system_message += f"- Project ID: {context['project_id']}\n"
        if context.get('query_type'):
            system_message += f"- Query type: {context['query_type']}\n"
        if context.get('filters'):
            system_message += f"- Filters: {context['filters']}\n"
        if context.get('project'):
            system_message += f"- Project data: {context['project']}\n"
    
    # Add database stats (simplified for now)
    system_message += "\nDatabase statistics:\n"
    system_message += "- Customers: 7\n"
    system_message += "- Projects: 8\n"
    system_message += "- Migration tasks: 0\n"
    system_message += "- Huawei accounts: 0\n"
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": query}
    ]
    
    payload = {
        "model": "deepseek-v3.2",
        "messages": messages,
        "max_tokens": 2000,
        "temperature": 0.7
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        
        if "choices" in result and len(result["choices"]) > 0:
            return result["choices"][0]["message"]["content"]
        else:
            return f"Unexpected response format: {json.dumps(result, indent=2)}"
            
    except requests.exceptions.Timeout:
        return "Error: Request timeout. The Huawei ModelArts API is taking too long to respond."
    except requests.exceptions.RequestException as e:
        return f"Error calling Huawei ModelArts API: {str(e)}"
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 huawei_modelarts.py \"Your query here\"")
        sys.exit(1)
    
    query = sys.argv[1]
    result = call_huawei_modelarts(query)
    print(result)