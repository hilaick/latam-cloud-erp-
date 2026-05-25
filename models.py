from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

def setup_db(app):
    # Assuming you already have your URI configured in app.py or here
    app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql://postgres:password@localhost:5432/latam_erp"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)
    with app.app_context():
        db.create_all()

# 🚨 ADD THIS USER MODEL
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default="Sales")
    status = db.Column(db.String(50), nullable=False, default="Pending") # Pending, Active, Reset Required
    is_2fa = db.Column(db.Boolean, default=False)
    last_login = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'status': self.status,
            'is_2fa': self.is_2fa,
            'last_login': self.last_login.strftime('%Y-%m-%d %H:%M') if self.last_login else "Never"
        }
