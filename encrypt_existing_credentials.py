#!/usr/bin/env python3
"""
Emergency script to encrypt all plaintext credentials in the database.
This should be run immediately to secure customer master keys.
"""

import os
import sys
import json
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.append(str(project_root))

from app import app, db
from models import Customer
from services.credential_manager import CredentialManager

def encrypt_existing_credentials():
    """Encrypt all plaintext credentials in the database"""
    
    # Master password from environment (same as used by the app)
    master_password = os.environ.get("VAULT_MASTER_PASSWORD", "LatamCloudAdmin2026!")
    
    if not master_password:
        print("❌ ERROR: VAULT_MASTER_PASSWORD environment variable not set!")
        print("Set it with: export VAULT_MASTER_PASSWORD='your-strong-password'")
        return False
    
    cm = CredentialManager(master_password)
    
    with app.app_context():
        customers = Customer.query.all()
        print(f"Found {len(customers)} customers in database")
        
        updated_count = 0
        error_count = 0
        
        for customer in customers:
            try:
                updated = False
                
                # Check and encrypt AK/SK pairs
                ak_sk_pairs = [
                    ('ak', 'sk'),
                    ('tier1_ak', 'tier1_sk'),
                    ('tier2_ak', 'tier2_sk'),
                    ('tier3_ak', 'tier3_sk'),
                    ('aws_ak', 'aws_sk')
                ]
                
                for ak_field, sk_field in ak_sk_pairs:
                    ak_value = getattr(customer, ak_field)
                    sk_value = getattr(customer, sk_field)
                    
                    # Skip if empty or already encrypted
                    if not ak_value or not sk_value:
                        continue
                    
                    # Check if already encrypted (starts with { and contains encrypted_)
                    if (isinstance(ak_value, str) and ak_value.startswith('{') and 'encrypted_' in ak_value and
                        isinstance(sk_value, str) and sk_value.startswith('{') and 'encrypted_' in sk_value):
                        print(f"  {customer.name}: {ak_field}/{sk_field} already encrypted")
                        continue
                    
                    # Skip if they look like placeholders or masked values
                    if ak_value == "********" or sk_value == "********":
                        continue
                    
                    # Encrypt the pair
                    try:
                        print(f"  {customer.name}: Encrypting {ak_field}/{sk_field}...")
                        enc_dict = cm.encrypt_credentials(ak_value, sk_value)
                        encrypted_json = json.dumps(enc_dict)
                        
                        setattr(customer, ak_field, encrypted_json)
                        setattr(customer, sk_field, encrypted_json)
                        updated = True
                        print(f"    ✓ Encrypted")
                    except Exception as e:
                        print(f"    ✗ Error encrypting {ak_field}/{sk_field}: {e}")
                        error_count += 1
                
                # Check and encrypt Azure client secret
                if customer.azure_client_secret and customer.azure_client_secret != "********":
                    if not (isinstance(customer.azure_client_secret, str) and 
                           customer.azure_client_secret.startswith('{') and 
                           'encrypted_' in customer.azure_client_secret):
                        try:
                            print(f"  {customer.name}: Encrypting azure_client_secret...")
                            # For single field, we need to create a wrapper
                            # Use a placeholder SK since the method expects both
                            enc_dict = cm.encrypt_credentials(customer.azure_client_secret, "placeholder_sk_for_azure")
                            customer.azure_client_secret = json.dumps(enc_dict)
                            updated = True
                            print(f"    ✓ Encrypted")
                        except Exception as e:
                            print(f"    ✗ Error encrypting azure_client_secret: {e}")
                            error_count += 1
                
                # Check and encrypt OS password
                if customer.os_password and customer.os_password != "********":
                    if not (isinstance(customer.os_password, str) and 
                           customer.os_password.startswith('{') and 
                           'encrypted_' in customer.os_password):
                        try:
                            print(f"  {customer.name}: Encrypting os_password...")
                            # Use a placeholder SK since the method expects both
                            enc_dict = cm.encrypt_credentials(customer.os_password, "placeholder_sk_for_os")
                            customer.os_password = json.dumps(enc_dict)
                            updated = True
                            print(f"    ✓ Encrypted")
                        except Exception as e:
                            print(f"    ✗ Error encrypting os_password: {e}")
                            error_count += 1
                
                if updated:
                    db.session.add(customer)
                    updated_count += 1
                    print(f"  ✓ {customer.name}: Updated")
                else:
                    print(f"  - {customer.name}: No changes needed")
                    
            except Exception as e:
                print(f"❌ Error processing customer {customer.name}: {e}")
                error_count += 1
        
        if updated_count > 0:
            db.session.commit()
            print(f"\n✅ Successfully encrypted credentials for {updated_count} customers")
        else:
            print(f"\nℹ️  No credentials needed encryption")
        
        if error_count > 0:
            print(f"⚠️  Encountered {error_count} errors")
        
        return error_count == 0

def verify_encryption():
    """Verify that all credentials are now encrypted"""
    with app.app_context():
        customers = Customer.query.all()
        plaintext_count = 0
        encrypted_count = 0
        
        for customer in customers:
            # Check AK/SK fields
            fields_to_check = [
                'ak', 'sk', 'tier1_ak', 'tier1_sk', 'tier2_ak', 'tier2_sk',
                'tier3_ak', 'tier3_sk', 'aws_ak', 'aws_sk',
                'azure_client_secret', 'os_password'
            ]
            
            for field in fields_to_check:
                value = getattr(customer, field)
                if value and value != "********":
                    if isinstance(value, str) and value.startswith('{') and 'encrypted_' in value:
                        encrypted_count += 1
                    else:
                        plaintext_count += 1
                        print(f"⚠️  {customer.name}.{field}: Still plaintext ({value[:20]}...)")
        
        print(f"\n🔒 Encryption Status:")
        print(f"   Encrypted fields: {encrypted_count}")
        print(f"   Plaintext fields: {plaintext_count}")
        
        if plaintext_count == 0:
            print("✅ ALL CREDENTIALS ARE ENCRYPTED")
            return True
        else:
            print("❌ SOME CREDENTIALS ARE STILL PLAINTEXT!")
            return False

if __name__ == "__main__":
    print("=" * 60)
    print("EMERGENCY CREDENTIAL ENCRYPTION")
    print("=" * 60)
    print("\n⚠️  WARNING: This will encrypt all plaintext credentials in the database.")
    print("   Make sure you have a backup before proceeding!\n")
    
    response = input("Do you want to proceed? (yes/NO): ")
    if response.lower() != 'yes':
        print("Operation cancelled.")
        sys.exit(0)
    
    print("\n" + "=" * 60)
    print("Step 1: Encrypting existing credentials...")
    print("=" * 60)
    
    if encrypt_existing_credentials():
        print("\n" + "=" * 60)
        print("Step 2: Verifying encryption...")
        print("=" * 60)
        
        if verify_encryption():
            print("\n✅ SUCCESS: All credentials are now encrypted!")
            print("\n🔐 Next steps:")
            print("1. Update the CRM routes to encrypt new credentials on save")
            print("2. Update services to decrypt credentials when needed")
            print("3. Rotate the VAULT_MASTER_PASSWORD regularly")
            print("4. Implement key rotation for customer credentials")
        else:
            print("\n❌ FAILED: Some credentials are still plaintext!")
            sys.exit(1)
    else:
        print("\n❌ FAILED: Could not encrypt all credentials!")
        sys.exit(1)