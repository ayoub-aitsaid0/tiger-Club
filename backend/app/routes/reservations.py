from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Reservation, Table, AuditLog, User, DailyShift
from app import db
from datetime import date, datetime
from functools import wraps

reservations_bp = Blueprint("reservations", __name__)


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


@reservations_bp.route("/", methods=["POST"])
@jwt_required()
def create_reservation():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify({"error": "Compte inactif"}), 403

    data = request.get_json()
    table_ids = data.get("table_ids", [])
    date_str = data.get("date_reservation")

    if not table_ids or not date_str:
        return jsonify({"error": "table_ids et date_reservation sont requis"}), 400

    try:
        res_date = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({"error": "Format de date invalide"}), 400

    # Check for conflicting reservations
    conflicts = Reservation.query.filter(
        Reservation.date_reservation == res_date,
        Reservation.status != "cancelled"
    ).all()

    for conflict in conflicts:
        overlap = set(conflict.table_ids) & set(table_ids)
        if overlap:
            return jsonify({
                "error": f"Table(s) {list(overlap)} déjà réservée(s) pour cette date"
            }), 409

    today_shift = DailyShift.query.filter_by(date=date.today()).first()

    reservation = Reservation(
        table_ids=table_ids,
        customer_name=data.get("customer_name", "").strip(),
        customer_phone=data.get("customer_phone", ""),
        total_price=data.get("total_price", 0),
        advance_paid=data.get("advance_paid", 0),
        payment_method=data.get("payment_method", "cash"),
        date_reservation=res_date,
        status="reserved",
        notes=data.get("notes", ""),
        operator_name=today_shift.operator_name if today_shift else None,
        created_by_user_id=user_id,
    )
    db.session.add(reservation)
    db.session.flush()

    log = AuditLog(
        user_id=user_id,
        action="CREATE_RESERVATION",
        details={"new": reservation.to_dict()}
    )
    db.session.add(log)
    db.session.commit()

    return jsonify(reservation.to_dict()), 201


@reservations_bp.route("/", methods=["GET"])
@jwt_required()
def list_reservations():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 401

    query = Reservation.query

    date_str = request.args.get("date")
    if date_str:
        try:
            query = query.filter(Reservation.date_reservation == date.fromisoformat(date_str))
        except ValueError:
            pass

    status_filter = request.args.get("status")
    if status_filter:
        query = query.filter(Reservation.status == status_filter)

    if user.role != "admin":
        query = query.filter(Reservation.created_by_user_id == user_id)

    reservations = query.order_by(Reservation.date_reservation.desc(), Reservation.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reservations]), 200


@reservations_bp.route("/<int:res_id>", methods=["PATCH"])
@jwt_required()
def update_reservation(res_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 401
    reservation = Reservation.query.get_or_404(res_id)

    if user.role != "admin" and reservation.created_by_user_id != user_id:
        return jsonify({"error": "Accès refusé – réservation non autorisée"}), 403

    old_data = reservation.to_dict()

    data = request.get_json()
    allowed_fields = ["customer_name", "customer_phone", "total_price", "advance_paid", "payment_method", "status", "notes"]
    # Caissier cannot change status to anything other than occupied/reserved/cancelled
    for field in allowed_fields:
        if field in data:
            setattr(reservation, field, data[field])

    reservation.updated_at = datetime.utcnow()

    log = AuditLog(
        user_id=user_id,
        action="UPDATE_RESERVATION",
        details={"old": old_data, "new": reservation.to_dict()}
    )
    db.session.add(log)
    db.session.commit()

    return jsonify(reservation.to_dict()), 200


@reservations_bp.route("/by-table/<int:table_id>", methods=["GET"])
@jwt_required()
def get_reservation_by_table(table_id):
    """Fetch a non-cancelled reservation for a specific table on a given date"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 401

    date_str = request.args.get("date")
    if not date_str:
        return jsonify({"error": "Paramètre 'date' requis"}), 400

    try:
        res_date = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({"error": "Format de date invalide"}), 400

    reservation = Reservation.query.filter(
        Reservation.date_reservation == res_date,
        Reservation.status != "cancelled",
        Reservation.table_ids.any(table_id)
    ).order_by(Reservation.created_at.desc()).first()

    if reservation:
        return jsonify(reservation.to_dict()), 200

    return jsonify({"error": "Aucune réservation trouvée"}), 404


@reservations_bp.route("/<int:res_id>", methods=["DELETE"])
@jwt_required()
def cancel_reservation(res_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 401
    reservation = Reservation.query.get_or_404(res_id)

    if user.role != "admin" and reservation.created_by_user_id != user_id:
        return jsonify({"error": "Accès refusé – réservation non autorisée"}), 403

    old_data = reservation.to_dict()

    reservation.status = "cancelled"
    reservation.updated_at = datetime.utcnow()

    log = AuditLog(
        user_id=user_id,
        action="CANCEL_RESERVATION",
        details={"old": old_data}
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "Réservation annulée"}), 200
