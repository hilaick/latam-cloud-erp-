import os
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

def setup_db(app):
    database_url = os.environ.get('DATABASE_URL')
    
    # 🚨 STRICT ENFORCEMENT: No more SQLite fallback!
    if not database_url:
        raise ValueError("CRITICAL ERROR: DATABASE_URL is missing from .env. PostgreSQL is strictly required.")
    
    # Fix for newer SQLAlchemy versions that require 'postgresql://'
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
        
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    with app.app_context():
        db.create_all()

# ==========================================
# ENTERPRISE DATABASE SCHEMA
# ==========================================

class ProjectData(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.String(50), primary_key=True)
    # 🚨 CLOUD-NATIVE FORK: Differentiates between 'migration' and 'greenfield'
    project_type = db.Column(db.String(50), default='migration') 
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
    region = db.Column(db.String(50))
    cio = db.Column(db.String(100))
    it_lead = db.Column(db.String(100))
    architect = db.Column(db.String(100))

    # 1. HUAWEI MASTER & LEAST PRIVILEGE TIERS
    ak = db.Column(db.Text)  # Changed from String(120) to Text for encrypted JSON
    sk = db.Column(db.Text)  # Changed from String(120) to Text for encrypted JSON
    tier1_ak = db.Column(db.Text)  # Changed from String(120) to Text
    tier1_sk = db.Column(db.Text)  # Changed from String(120) to Text
    tier2_ak = db.Column(db.Text)  # Changed from String(120) to Text
    tier2_sk = db.Column(db.Text)  # Changed from String(120) to Text
    tier3_ak = db.Column(db.Text)  # Changed from String(120) to Text
    tier3_sk = db.Column(db.Text)  # Changed from String(120) to Text

    # 2. MULTI-CLOUD CONTROL PLANE (Hyperscaler APIs)
    aws_ak = db.Column(db.Text)  # Changed from String(120) to Text
    aws_sk = db.Column(db.Text)  # Changed from String(120) to Text
    azure_tenant_id = db.Column(db.String(120))
    azure_client_id = db.Column(db.String(120))
    azure_client_secret = db.Column(db.Text)  # Changed from String(120) to Text
    azure_subscription_id = db.Column(db.String(120)) 
    vcenter_host = db.Column(db.String(120))

    # 3. OS DATA PLANE (Local/Domain Admin for Rsync/WinRM)
    os_domain = db.Column(db.String(120))
    os_user = db.Column(db.String(120))
    os_password = db.Column(db.Text)  # Already Text for encrypted ciphertext

    # 4. MIGRATION SOURCE CREDENTIALS (For Huawei Cloud cross-account/region migrations)
    source_huawei_ak = db.Column(db.Text)  # Source Huawei Cloud AK for migration discovery
    source_huawei_sk = db.Column(db.Text)  # Source Huawei Cloud SK for migration discovery
    source_huawei_region = db.Column(db.String(50))  # Source region (if different from target)
    source_huawei_project_id = db.Column(db.String(100))  # Source project ID (if different from target)
    source_huawei_domain_id = db.Column(db.String(100))  # Source domain ID (if different from target)

class HuaweiAccount(db.Model):
    __tablename__ = 'huawei_accounts'
    id = db.Column(db.String(50), primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    encrypted_ak = db.Column(db.Text, nullable=False)
    encrypted_sk = db.Column(db.Text, nullable=False)
    iv = db.Column(db.String(32), nullable=False)
    tag = db.Column(db.String(32), nullable=False)
    default_region = db.Column(db.String(50), default='ap-southeast-3')
    is_active = db.Column(db.Boolean, default=True)
    last_used = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    migration_tasks = db.relationship('MigrationTask', backref='account', lazy=True)

class MigrationTask(db.Model):
    __tablename__ = 'migration_tasks'
    id = db.Column(db.String(50), primary_key=True)
    account_id = db.Column(db.String(50), db.ForeignKey('huawei_accounts.id'), nullable=False)
    user_id = db.Column(db.String(50), nullable=False)
    source_server_id = db.Column(db.String(100))
    source_server_name = db.Column(db.String(200))
    target_region = db.Column(db.String(50))
    status = db.Column(db.String(50), default='created')
    progress = db.Column(db.Integer, default=0)
    config = db.Column(db.Text)
    huawei_task_id = db.Column(db.String(100))
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

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default="Sales")
    status = db.Column(db.String(50), nullable=False, default="Pending")
    is_2fa = db.Column(db.Boolean, default=False)
    last_login = db.Column(db.DateTime, nullable=True)
    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'email': self.email, 'role': self.role, 'status': self.status, 'is_2fa': self.is_2fa, 'last_login': self.last_login.strftime('%Y-%m-%d %H:%M') if self.last_login else "Never"}

class CognitiveLearningLog(db.Model):
    __tablename__ = 'cognitive_learning_logs'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.String(50), db.ForeignKey('projects.id'))
    error_signature = db.Column(db.Text, nullable=False)
    context_snapshot = db.Column(db.Text)
    ai_remediation_applied = db.Column(db.Text)
    success = db.Column(db.Boolean, default=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class QuotationVersion(db.Model):
    __tablename__ = 'quotation_versions'
    id = db.Column(db.String(50), primary_key=True)
    project_id = db.Column(db.String(50), db.ForeignKey('projects.id'), nullable=False, index=True)
    version_number = db.Column(db.Integer, nullable=False)
    quotation_filename = db.Column(db.String(255), nullable=False)
    quotation_path = db.Column(db.String(500), nullable=False)
    uploaded_by = db.Column(db.String(120), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    blueprint_snapshot = db.Column(db.Text, nullable=False)  
    change_summary = db.Column(db.Text)
    cr_id = db.Column(db.String(50))  
    previous_version_id = db.Column(db.String(50), db.ForeignKey('quotation_versions.id'))
    
    previous_version = db.relationship('QuotationVersion', remote_side=[id], backref='next_versions')
    __table_args__ = (db.UniqueConstraint('project_id', 'version_number', name='uq_project_version'),)

# 🚨 DB-Backed Execution State Machine
class ExecutionState(db.Model):
    __tablename__ = 'execution_states'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.String(50), db.ForeignKey('projects.id'), unique=True, nullable=False)
    current_phase = db.Column(db.String(50), default='PHASE_4_0')
    status = db.Column(db.String(50), default='PENDING') # PENDING, IN_PROGRESS, WAITING_ON_CUSTOMER, COMPLETED
    pending_action = db.Column(db.String(100)) 
    migration_mode = db.Column(db.String(50)) # 'EP' or 'VPC_SANDBOX'
    execution_logs = db.Column(db.Text, default='[]') 
    last_active_at = db.Column(db.DateTime, default=datetime.utcnow)

# 🚨 Hermes AI Configuration — Global settings store
class HermesConfig(db.Model):
    __tablename__ = 'hermes_config'
    id = db.Column(db.String(50), primary_key=True, default='singleton')
    # Connection mode: 'cli' = local subprocess, 'http' = loadbalancer API
    mode = db.Column(db.String(10), default='cli')
    # CLI mode settings
    hermes_binary_path = db.Column(db.String(500))
    # HTTP/Loadbalancer mode settings
    lb_url = db.Column(db.String(500))          # e.g. http://localhost:8666/v1/chat/completions
    lb_auth = db.Column(db.String(500))         # e.g. Basic <base64>
    # Model configuration
    global_provider = db.Column(db.String(50))  # e.g. deepseek, zai, kimi-coding
    global_model = db.Column(db.String(100))    # e.g. deepseek-v4-pro, glm-5.2
    delegation_provider = db.Column(db.String(50))
    delegation_model = db.Column(db.String(100))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @staticmethod
    def get_config():
        """Returns the singleton HermesConfig, creating defaults if missing."""
        config = HermesConfig.query.get('singleton')
        if not config:
            config = HermesConfig(
                id='singleton',
                mode='cli',
                hermes_binary_path='/usr/local/lib/hermes-agent/venv/bin/hermes',
                lb_url='http://localhost:8666/v1/chat/completions',
                lb_auth='Basic YWRtaW46ODIxODcwZWVlNGQzMTA4NGUxYmZmNDA1YWJhMTVjYTY=',
                global_provider='deepseek',
                global_model='deepseek-v4-pro',
                delegation_provider='zai',
                delegation_model='glm-5.2'
            )
            db.session.add(config)
            db.session.commit()
        return config

    def to_dict(self):
        return {k: getattr(self, k) for k in [
            'mode', 'hermes_binary_path', 'lb_url', 'lb_auth',
            'global_provider', 'global_model',
            'delegation_provider', 'delegation_model'
        ]}
