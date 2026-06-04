from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

# 🚨 Ensure you import your actual database and model structure
# from models import db, Customer

crm_bp = Blueprint('crm', __name__)

@crm_bp.route('/api/erp/customers', methods=['GET', 'POST'])
# @jwt_required() # Uncomment when auth is fully enforced
def manage_customers():
    if request.method == 'GET':
        try:
            customers = Customer.query.all()
            return jsonify({
                "success": True,
                "customers": [{
                    "id": c.id, 
                    "name": c.name, 
                    "region": c.region,
                    
                    # Legacy Contacts
                    "cio": c.cio,
                    "itLead": c.it_lead,
                    "architect": c.architect,

                    # Huawei Identity Tiers
                    "ak": c.ak, "sk": c.sk,
                    "tier1AK": c.tier1_ak, "tier1SK": c.tier1_sk,
                    "tier2AK": c.tier2_ak, "tier2SK": c.tier2_sk,
                    "tier3AK": c.tier3_ak, "tier3SK": c.tier3_sk,

                    # Multi-Cloud Credentials
                    "awsAK": c.aws_ak, "awsSK": c.aws_sk,
                    "azureTenant": c.azure_tenant_id, 
                    "azureClient": c.azure_client_id, 
                    "azureSecret": c.azure_client_secret,
                    "vCenterHost": c.vcenter_host,

                    # Data Plane / OS
                    "osDomain": c.os_domain, 
                    "osUser": c.os_user, 
                    "osPassword": c.os_password
                } for c in customers]
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.json
            new_name = data.get('name', 'Unknown').strip()
            
            existing_customer = Customer.query.filter(Customer.name.ilike(new_name)).first()
            if existing_customer:
                return jsonify({"success": True, "message": "Customer already exists."})

            customer = Customer(
                id=str(data.get('id')), 
                name=new_name, 
                region=data.get('region', 'la-south-2'),
                cio=data.get('cio'),
                it_lead=data.get('itLead'),
                architect=data.get('architect'),
                
                # Vault fields
                ak=data.get('ak'), sk=data.get('sk'),
                tier1_ak=data.get('tier1AK'), tier1_sk=data.get('tier1SK'),
                tier2_ak=data.get('tier2AK'), tier2_sk=data.get('tier2SK'),
                tier3_ak=data.get('tier3AK'), tier3_sk=data.get('tier3SK'),
                
                aws_ak=data.get('awsAK'), aws_sk=data.get('awsSK'),
                azure_tenant_id=data.get('azureTenant'), 
                azure_client_id=data.get('azureClient'), 
                azure_client_secret=data.get('azureSecret'),
                vcenter_host=data.get('vCenterHost'),
                
                os_domain=data.get('osDomain'), 
                os_user=data.get('osUser'), 
                os_password=data.get('osPassword')
            )
            db.session.add(customer)
            db.session.commit()
            return jsonify({"success": True})
        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "error": str(e)}), 500

@crm_bp.route('/api/erp/customers/<c_id>', methods=['PUT', 'DELETE'])
# @jwt_required()
def update_delete_customer(c_id):
    try:
        customer = Customer.query.get(c_id)
        if not customer: 
            return jsonify({"success": False, "error": "Customer not found"}), 404
        
        if request.method == 'DELETE':
            db.session.delete(customer)
        
        elif request.method == 'PUT':
            data = request.json
            customer.name = data.get('name', customer.name)
            customer.region = data.get('region', customer.region)
            customer.cio = data.get('cio', customer.cio)
            customer.it_lead = data.get('itLead', customer.it_lead)
            customer.architect = data.get('architect', customer.architect)
            
            customer.ak = data.get('ak', customer.ak)
            customer.sk = data.get('sk', customer.sk)
            customer.tier1_ak = data.get('tier1AK', customer.tier1_ak)
            customer.tier1_sk = data.get('tier1SK', customer.tier1_sk)
            customer.tier2_ak = data.get('tier2AK', customer.tier2_ak)
            customer.tier2_sk = data.get('tier2SK', customer.tier2_sk)
            customer.tier3_ak = data.get('tier3AK', customer.tier3_ak)
            customer.tier3_sk = data.get('tier3SK', customer.tier3_sk)
            
            customer.aws_ak = data.get('awsAK', customer.aws_ak)
            customer.aws_sk = data.get('awsSK', customer.aws_sk)
            customer.azure_tenant_id = data.get('azureTenant', customer.azure_tenant_id)
            customer.azure_client_id = data.get('azureClient', customer.azure_client_id)
            customer.azure_client_secret = data.get('azureSecret', customer.azure_client_secret)
            customer.vcenter_host = data.get('vCenterHost', customer.vcenter_host)
            
            customer.os_domain = data.get('osDomain', customer.os_domain)
            customer.os_user = data.get('osUser', customer.os_user)
            customer.os_password = data.get('osPassword', customer.os_password)
            
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
