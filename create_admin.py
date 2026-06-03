from app import app
from models import db, User
from werkzeug.security import generate_password_hash
from datetime import datetime

with app.app_context():
    # Check if admin already exists to prevent duplicates
    admin_email = "hilaick@latamcloud.com"
    existing_admin = User.query.filter_by(email=admin_email).first()
    
    if existing_admin:
        print(f"User {admin_email} already exists!")
    else:
        # Create the Master Admin
        master_admin = User(
            name="Hilaick Yard",
            email=admin_email,
            password_hash=generate_password_hash("MasterSecure2026!"), # Temporary secure password
            role="Master Admin",
            status="Active",
            is_2fa=False,
            last_login=datetime.utcnow()
        )
        
        db.session.add(master_admin)
        db.session.commit()
        print(f"Success! Master Admin {admin_email} created with password: MasterSecure2026!")
