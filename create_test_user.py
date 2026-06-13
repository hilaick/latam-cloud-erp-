#!/usr/bin/env python3
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db, User
from werkzeug.security import generate_password_hash
from datetime import datetime

with app.app_context():
    # Check if test user already exists
    test_email = "test@latamcloud.com"
    existing = User.query.filter_by(email=test_email).first()
    
    if existing:
        print(f"User {test_email} already exists!")
        print(f"ID: {existing.id}, Name: {existing.name}, Role: {existing.role}")
    else:
        # Create a test user
        test_user = User()
        test_user.name = "Test User"
        test_user.email = test_email
        test_user.password_hash = generate_password_hash("test123")
        test_user.role = "Sales"
        test_user.status = "Active"
        test_user.is_2fa = False
        test_user.last_login = datetime.utcnow()
        
        db.session.add(test_user)
        db.session.commit()
        print(f"Success! Test user created:")
        print(f"Email: {test_email}")
        print(f"Password: test123")
        print(f"Role: Sales")