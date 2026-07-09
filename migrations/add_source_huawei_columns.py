#!/usr/bin/env python3
"""
Migration script to add source Huawei Cloud credential columns to customers table.
Run with: python migrations/add_source_huawei_columns.py
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env
project_root = Path(__file__).parent.parent
load_dotenv(project_root / '.env')

# Add project root to path
sys.path.insert(0, str(project_root))

from flask import Flask
from models import db
from sqlalchemy import text

app = Flask(__name__)

# Use the same database URL as the main app
database_url = os.environ.get('DATABASE_URL')
if not database_url:
    print("ERROR: DATABASE_URL environment variable not set")
    print("Please set DATABASE_URL in your .env file")
    sys.exit(1)

# Fix for newer SQLAlchemy versions
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

def add_source_huawei_columns():
    """Add source Huawei Cloud credential columns to customers table"""
    
    with app.app_context():
        # Check if columns already exist
        with db.engine.connect() as conn:
            # Check for source_huawei_ak column
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='customers' AND column_name='source_huawei_ak'
            """))
            source_huawei_ak_exists = result.fetchone() is not None
            
            # Check for source_huawei_sk column
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='customers' AND column_name='source_huawei_sk'
            """))
            source_huawei_sk_exists = result.fetchone() is not None
            
            # Check for source_huawei_region column
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='customers' AND column_name='source_huawei_region'
            """))
            source_huawei_region_exists = result.fetchone() is not None
            
            # Check for source_huawei_project_id column
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='customers' AND column_name='source_huawei_project_id'
            """))
            source_huawei_project_id_exists = result.fetchone() is not None
            
            # Check for source_huawei_domain_id column
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='customers' AND column_name='source_huawei_domain_id'
            """))
            source_huawei_domain_id_exists = result.fetchone() is not None
            
            print("Checking existing columns in customers table...")
            print(f"source_huawei_ak exists: {source_huawei_ak_exists}")
            print(f"source_huawei_sk exists: {source_huawei_sk_exists}")
            print(f"source_huawei_region exists: {source_huawei_region_exists}")
            print(f"source_huawei_project_id exists: {source_huawei_project_id_exists}")
            print(f"source_huawei_domain_id exists: {source_huawei_domain_id_exists}")
            
            # Add columns if they don't exist
            if not source_huawei_ak_exists:
                print("Adding source_huawei_ak column...")
                conn.execute(text("""
                    ALTER TABLE customers 
                    ADD COLUMN source_huawei_ak TEXT
                """))
            
            if not source_huawei_sk_exists:
                print("Adding source_huawei_sk column...")
                conn.execute(text("""
                    ALTER TABLE customers 
                    ADD COLUMN source_huawei_sk TEXT
                """))
            
            if not source_huawei_region_exists:
                print("Adding source_huawei_region column...")
                conn.execute(text("""
                    ALTER TABLE customers 
                    ADD COLUMN source_huawei_region VARCHAR(50)
                """))
            
            if not source_huawei_project_id_exists:
                print("Adding source_huawei_project_id column...")
                conn.execute(text("""
                    ALTER TABLE customers 
                    ADD COLUMN source_huawei_project_id VARCHAR(100)
                """))
            
            if not source_huawei_domain_id_exists:
                print("Adding source_huawei_domain_id column...")
                conn.execute(text("""
                    ALTER TABLE customers 
                    ADD COLUMN source_huawei_domain_id VARCHAR(100)
                """))
            
            conn.commit()
            print("Migration completed successfully!")
            
            # Verify columns were added
            result = conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name='customers' 
                AND column_name IN ('source_huawei_ak', 'source_huawei_sk', 'source_huawei_region', 'source_huawei_project_id', 'source_huawei_domain_id')
                ORDER BY column_name
            """))
            
            columns = result.fetchall()
            print("\nVerification - Added columns:")
            for column in columns:
                print(f"  - {column[0]}: {column[1]}")

if __name__ == "__main__":
    print("Starting migration to add source Huawei Cloud credential columns...")
    add_source_huawei_columns()
    print("\nMigration completed!")