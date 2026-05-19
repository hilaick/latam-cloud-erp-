import os
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

def setup_db(app):
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///erp_database.db')
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
    target_vpc = db.Column(db.String(100))

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