import os
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

def setup_db(app):
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    else:
        basedir = os.path.abspath(os.path.dirname(__file__))
        db_path = os.path.join(basedir, 'instance', 'erp_database.db')
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
        
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    with app.app_context():
        db.create_all()

class ProjectData(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.String(50), primary_key=True)
    data = db.Column(db.Text, nullable=False) 
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class GlobalPlaybooks(db.Model):
    __tablename__ = 'playbooks'
    id = db.Column(db.String(50), primary_key=True, default="master")
    data = db.Column(db.Text, nullable=False)

class AdHocMigrationLog(db.Model):
    __tablename__ = 'adhoc_migrations'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    task_id = db.Column(db.String(100))
    region = db.Column(db.String(50))
    source_os = db.Column(db.String(50))
    target_flavor = db.Column(db.String(100))
    target_subnet = db.Column(db.String(255))
    status = db.Column(db.String(50), default="Initiated")
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100))
    ak = db.Column(db.String(100))
    sk = db.Column(db.String(100))
    region = db.Column(db.String(50))
    cio = db.Column(db.String(100))
    it_lead = db.Column(db.String(100))
    architect = db.Column(db.String(100))

class HuaweiAccount(db.Model):
    __tablename__ = 'huawei_accounts'
    id = db.Column(db.String(50), primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)  # Reference to ERP user
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    encrypted_ak = db.Column(db.Text, nullable=False)
    encrypted_sk = db.Column(db.Text, nullable=False)
    iv = db.Column(db.String(32), nullable=False)  # Initialization vector for AES-GCM
    tag = db.Column(db.String(32), nullable=False)  # Authentication tag for AES-GCM
    default_region = db.Column(db.String(50), default='ap-southeast-3')
    is_active = db.Column(db.Boolean, default=True)
    last_used = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    migration_tasks = db.relationship('MigrationTask', backref='account', lazy=True)

class MigrationTask(db.Model):
    __tablename__ = 'migration_tasks'
    id = db.Column(db.String(50), primary_key=True)
    account_id = db.Column(db.String(50), db.ForeignKey('huawei_accounts.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    source_server_id = db.Column(db.String(100))
    source_server_name = db.Column(db.String(200))
    target_region = db.Column(db.String(50))
    status = db.Column(db.String(50), default='created')  # created, running, completed, failed, cancelled
    progress = db.Column(db.Integer, default=0)  # 0-100
    config = db.Column(db.Text)  # JSON string of migration parameters
    huawei_task_id = db.Column(db.String(100))  # Huawei SMS task ID
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WBSTask(db.Model):
    __tablename__ = 'wbs_tasks'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.String(50), db.ForeignKey('projects.id'))
    wbs_id = db.Column(db.String(20))
    name = db.Column(db.String(200))
    progress = db.Column(db.String(20), default="0%")
    raci = db.Column(db.String(100))
    start_date = db.Column(db.String(50))
    end_date = db.Column(db.String(50))
    is_parent = db.Column(db.Boolean, default=False)

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