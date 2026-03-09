from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import AuditLog, User
from app import db
from functools import wraps

audit_bp = Blueprint("audit", __name__)


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


@audit_bp.route("/", methods=["GET"])
@admin_required
def list_logs():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))
    user_filter = request.args.get("user_id")
    action_filter = request.args.get("action")
    from_date = request.args.get("from")
    to_date = request.args.get("to")

    query = AuditLog.query

    if user_filter:
        query = query.filter(AuditLog.user_id == int(user_filter))
    if action_filter:
        query = query.filter(AuditLog.action.ilike(f"%{action_filter}%"))
    if from_date:
        query = query.filter(AuditLog.created_at >= from_date)
    if to_date:
        query = query.filter(AuditLog.created_at <= to_date + " 23:59:59")

    query = query.order_by(AuditLog.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "items": [log.to_dict() for log in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "page": page,
        "per_page": per_page,
    }), 200
