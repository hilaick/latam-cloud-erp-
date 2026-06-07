# ... (Keep existing imports and routes at the top of the file) ...

@cloud_ops_bp.route('/api/cloud/inventory', methods=['POST'])
@jwt_required()
def get_live_inventory():
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        provider = data.get('provider', 'Huawei') # Default to Huawei if not specified
        
        # 🚨 STRICT VAULT ENFORCEMENT
        if not customer_id:
            return jsonify({"success": False, "error": "Customer ID is required for secure live discovery."}), 400
            
        customer = Customer.query.get(customer_id)
        if not customer:
            return jsonify({"success": False, "error": "Customer missing from Vault."}), 404

        master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")

        if provider == 'Huawei':
            if not customer.ak or not customer.sk:
                return jsonify({"success": False, "error": "Huawei Vault keys incomplete."}), 404
            discovery_engine = HuaweiDiscovery(
                encrypted_ak_data=customer.ak,
                encrypted_sk_data=customer.sk,
                region=customer.region or data.get('region', 'la-south-2'),
                master_password=master_password
            )
            result = discovery_engine.discover_all()

        elif provider == 'AWS':
            engine = HyperscalerDiscoveryEngine(customer_id)
            result = engine.run_aws_agentless_discovery(region=data.get('region', 'us-east-1'))

        elif provider == 'Azure':
            engine = HyperscalerDiscoveryEngine(customer_id)
            # Azure requires a Subscription ID to search. We default to zeros so the Azure SDK throws an 
            # authentic Azure Active Directory error (proving the SDK works) instead of a local 400 error.
            sub_id = data.get('subscriptionId', '00000000-0000-0000-0000-000000000000')
            result = engine.run_azure_agentless_discovery(subscription_id=sub_id)

        else:
            return jsonify({"success": False, "error": f"Unknown provider: {provider}"}), 400
        
        if result.get("success"):
            return jsonify({"success": True, "inventory": result.get("inventory"), "message": f"{provider} Discovery completed safely."})
        else:
            return jsonify({"success": False, "error": result.get("error")}), 500

    except ValueError as ve:
        return jsonify({"success": False, "error": f"Vault Decryption Failed. Details: {str(ve)}"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error during discovery: {str(e)}"}), 500

# ... (Keep the rest of your file exactly the same) ...
