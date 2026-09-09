import sys
sys.path.insert(0, '/home/huawei-cloud/latam-cloud-erp-')
from app import app
from models import db
from sqlalchemy import text

with app.app_context():
    with db.engine.connect() as conn:
        conn.execute(text("ALTER TABLE hermes_config ADD COLUMN IF NOT EXISTS mcp_default_ak VARCHAR(255)"))
        conn.execute(text("ALTER TABLE hermes_config ADD COLUMN IF NOT EXISTS mcp_default_sk VARCHAR(255)"))
        conn.commit()
        print("Columns added successfully")
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='hermes_config' AND column_name LIKE 'mcp%'"))
        for row in result:
            print("  Column:", row[0])
