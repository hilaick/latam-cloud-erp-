#!/usr/bin/env python3
"""
Migration script to change VARCHAR columns to TEXT for encrypted credentials.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.append(str(project_root))

from app import app, db

def migrate_columns_to_text():
    """Change VARCHAR columns to TEXT to store encrypted JSON"""
    
    with app.app_context():
        print("Starting database migration: VARCHAR(120) -> TEXT for encrypted credentials")
        
        # SQL commands to alter columns
        alter_commands = [
            "ALTER TABLE customers ALTER COLUMN ak TYPE TEXT",
            "ALTER TABLE customers ALTER COLUMN sk TYPE TEXT",
            "ALTER TABLE customers ALTER COLUMN tier1_ak TYPE TEXT",
            "ALTER TABLE customers ALTER COLUMN tier1_sk TYPE TEXT",
            "ALTER TABLE customers ALTER COLUMN tier2_ak TYPE TEXT",
            "ALTER TABLE customers ALTER COLUMN tier2_sk TYPE TEXT",
            "ALTER TABLE customers ALTER COLUMN tier3_ak TYPE TEXT",
            "ALTER TABLE customers ALTER COLUMN tier3_sk TYPE TEXT",
            "ALTER TABLE customers ALTER COLUMN aws_ak TYPE TEXT",
            "ALTER TABLE customers ALTER COLUMN aws_sk TYPE TEXT",
            "ALTER TABLE customers ALTER COLUMN azure_client_secret TYPE TEXT",
            "ALTER TABLE customers ALTER COLUMN os_password TYPE TEXT"
        ]
        
        try:
            for cmd in alter_commands:
                print(f"Executing: {cmd}")
                db.session.execute(db.text(cmd))
            
            db.session.commit()
            print("✅ Migration completed successfully!")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {e}")
            return False

if __name__ == "__main__":
    print("=" * 60)
    print("DATABASE MIGRATION: Expand credential columns to TEXT")
    print("=" * 60)
    print("\nThis will change VARCHAR(120) columns to TEXT to accommodate")
    print("encrypted JSON data for credentials.\n")
    
    response = input("Do you want to proceed? (yes/NO): ")
    if response.lower() != 'yes':
        print("Migration cancelled.")
        sys.exit(0)
    
    if migrate_columns_to_text():
        print("\n✅ Database schema updated successfully!")
        print("\nNext: Run the credential encryption script:")
        print("  python3 encrypt_existing_credentials.py")
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)