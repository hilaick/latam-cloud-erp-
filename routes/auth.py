from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from models import db, User
from datetime import datetime

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if user and check_password_hash(user.password_hash, password):
        # Update last login time
        user.last_login = datetime.utcnow()
        if user.status == 'Pending':
            user.status = 'Active'
        db.session.commit()

        # Generate JWT (injecting role for RBAC)
        access_token = create_access_token(
            identity=user.id, 
            additional_claims={"role": user.role, "name": user.name}
        )
        return jsonify(success=True, token=access_token, user=user.to_dict()), 200
    
    return jsonify(success=False, error="Invalid email or password"), 401

@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    # Only authenticated users can see the directory
    users = User.query.all()
    return jsonify(success=True, users=[u.to_dict() for u in users]), 200

@auth_bp.route('/invite', methods=['POST'])
@jwt_required()
def invite_user():
    claims = get_jwt()
    # RBAC: Only Master Admin can invite
    if claims.get('role') != 'Master Admin':
        return jsonify(success=False, error="Unauthorized. Master Admin required."), 403

    data = request.get_json()
    
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify(success=False, error="User with this email already exists"), 400

    # In a real app, this would be a random secure string emailed to the user.
    # For now, we set the initial password provided by the frontend.
    temp_password = data.get('temp_password', 'Welcome123!')
    hashed_pw = generate_password_hash(temp_password)
    
    new_user = User(
        name=data.get('name'),
        email=data.get('email'),
        password_hash=hashed_pw,
        role=data.get('role'),
        status="Pending"
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify(success=True, user=new_user.to_dict()), 201

@auth_bp.route('/reset/<int:user_id>', methods=['POST'])
@jwt_required()
def force_reset(user_id):
    claims = get_jwt()
    if claims.get('role') != 'Master Admin':
        return jsonify(success=False, error="Unauthorized. Master Admin required."), 403

    data = request.get_json()
    new_password = data.get('new_password')
    
    user = User.query.get(user_id)
    if not user:
        return jsonify(success=False, error="User not found"), 404

    user.password_hash = generate_password_hash(new_password)
    user.status = "Reset Required"
    db.session.commit()

    return jsonify(success=True, message=f"Password reset forced for {user.name}")
