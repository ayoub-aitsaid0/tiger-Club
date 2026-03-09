from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, AuditLog
from app import db
from functools import wraps

users_bp = Blueprint("users", __name__)


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != "admin":
            return jsonify({"error": "Accès refusé – Admin requis"}), 403
        return fn(*args, **kwargs)
    return wrapper


@users_bp.route("/", methods=["GET"])
@admin_required
def list_users():
    users = User.query.order_by(User.id).all()
    return jsonify([u.to_dict() for u in users]), 200


@users_bp.route("/", methods=["POST"])
@admin_required
def create_user():
    admin_id = int(get_jwt_identity())
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")
    role = data.get("role", "caissier")

    if not username or not password:
        return jsonify({"error": "username et password sont requis"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Ce nom d'utilisateur existe déjà"}), 409

    user = User(username=username, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    log = AuditLog(user_id=admin_id, action="CREATE_USER", details={"username": username, "role": role})
    db.session.add(log)
    db.session.commit()

    return jsonify(user.to_dict()), 201


@users_bp.route("/<int:uid>", methods=["PATCH"])
@admin_required
def update_user(uid):
    admin_id = int(get_jwt_identity())
    user = User.query.get_or_404(uid)
    data = request.get_json()

    old = user.to_dict()

    if "is_active" in data:
        user.is_active = data["is_active"]
    if "role" in data:
        user.role = data["role"]
    if "password" in data and data["password"]:
        user.set_password(data["password"])

    log = AuditLog(user_id=admin_id, action="UPDATE_USER", details={"old": old, "new": user.to_dict()})
    db.session.add(log)
    db.session.commit()

    return jsonify(user.to_dict()), 200
