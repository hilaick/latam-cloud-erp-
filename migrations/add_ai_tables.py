#!/usr/bin/env python3
"""
Migration script to add AI configuration tables to ERP database.
Run with: python migrations/add_ai_tables.py
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
from datetime import datetime

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

def add_ai_tables():
    """Add AI configuration and usage tracking tables"""
    
    with app.app_context():
        # Check if tables already exist
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        # SQL for new tables
        sql_statements = [
            """
            CREATE TABLE IF NOT EXISTS ai_configurations (
                id SERIAL PRIMARY KEY,
                provider VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                api_keys TEXT NOT NULL,
                endpoint VARCHAR(255),
                model VARCHAR(100) DEFAULT 'deepseek-v3.2',
                is_active BOOLEAN DEFAULT true,
                priority INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS ai_usage_logs (
                id SERIAL PRIMARY KEY,
                configuration_id INTEGER REFERENCES ai_configurations(id),
                provider VARCHAR(50),
                user_id INTEGER,
                endpoint VARCHAR(255),
                tokens_used INTEGER,
                estimated_cost DECIMAL(10, 4),
                response_time_ms INTEGER,
                success BOOLEAN,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_logs(created_at);
            """,
            """
            CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage_logs(user_id);
            """,
            """
            CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_logs(provider);
            """,
            """
            CREATE INDEX IF NOT EXISTS idx_ai_config_provider ON ai_configurations(provider);
            """,
            """
            CREATE INDEX IF NOT EXISTS idx_ai_config_active ON ai_configurations(is_active);
            """
        ]
        
        print("Adding AI configuration tables to database...")
        
        try:
            # Execute each SQL statement
            for i, sql in enumerate(sql_statements):
                print(f"Executing statement {i+1}/{len(sql_statements)}...")
                db.session.execute(db.text(sql))
            
            db.session.commit()
            print("✅ Successfully added AI configuration tables!")
            
            # Verify tables were created
            inspector = inspect(db.engine)
            new_tables = inspector.get_table_names()
            
            if 'ai_configurations' in new_tables and 'ai_usage_logs' in new_tables:
                print("✅ Tables verified:")
                print(f"   - ai_configurations")
                print(f"   - ai_usage_logs")
                
                # Add a default Huawei configuration if none exists
                from sqlalchemy import text
                result = db.session.execute(
                    text("SELECT COUNT(*) FROM ai_configurations")
                ).scalar()
                
                if result == 0:
                    print("\nAdding default Huawei configuration...")
                    db.session.execute(text("""
                        INSERT INTO ai_configurations 
                        (provider, name, api_keys, endpoint, model, is_active, priority)
                        VALUES 
                        ('huawei', 'Default Huawei', '[]', 'https://api-ap-southeast-1.modelarts-maas.com/openai/v1', 'deepseek-v3.2', true, 1)
                    """))
                    db.session.commit()
                    print("✅ Added default Huawei configuration")
                    
            else:
                print("❌ Tables not created properly")
                return False
                
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error creating tables: {e}")
            return False
        
        return True

if __name__ == '__main__':
    print("=" * 60)
    print("ERP AI Configuration Tables Migration")
    print("=" * 60)
    
    if add_ai_tables():
        print("\n✅ Migration completed successfully!")
        print("\nNext steps:")
        print("1. Add encryption utilities for API keys")
        print("2. Create AI Manager service")
        print("3. Build settings page UI")
        print("4. Create monitoring dashboard")
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)