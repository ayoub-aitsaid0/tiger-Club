from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Table, Reservation, User
from app import db
from datetime import date
from functools import wraps

tables_bp = Blueprint("tables", __name__)


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


@tables_bp.route("/", methods=["GET"])
@jwt_required()
def get_tables():
    tables = Table.query.order_by(Table.id).all()
    return jsonify([t.to_dict() for t in tables]), 200


@tables_bp.route("/status", methods=["GET"])
@jwt_required()
def get_table_status():
    date_str = request.args.get("date")
    if not date_str:
        query_date = date.today()
    else:
        try:
            query_date = date.fromisoformat(date_str)
        except ValueError:
            return jsonify({"error": "Format de date invalide. Attendu: YYYY-MM-DD"}), 400

    tables = Table.query.all()

    reservations = Reservation.query.filter(
        Reservation.date_reservation == query_date,
        Reservation.status != "cancelled"
    ).all()

    reserved_map = {}
    for r in reservations:
        for tid in r.table_ids:
            reserved_map[tid] = r.status

    result = []
    for t in tables:
        status = reserved_map.get(t.id, "free")
        result.append({**t.to_dict(), "status": status})

    return jsonify(result), 200


@tables_bp.route("/", methods=["POST"])
@admin_required
def create_table():
    data = request.get_json() or {}
    table_number = str(data.get("table_number", "")).strip()
    zone_type    = data.get("zone_type", "")
    capacity     = data.get("capacity", 4)
    x = data.get("x")
    y = data.get("y")
    w = data.get("w")
    h = data.get("h")

    if not table_number or not zone_type or x is None or y is None or w is None or h is None:
        return jsonify({"error": "Champs requis: table_number, zone_type, x, y, w, h"}), 400

    if Table.query.filter_by(table_number=table_number).first():
        return jsonify({"error": "Ce numéro de table existe déjà"}), 409

    table = Table(
        table_number=table_number,
        zone_type=zone_type,
        capacity=int(capacity),
        coordinates_json={"x": int(x), "y": int(y), "w": int(w), "h": int(h)}
    )
    db.session.add(table)
    db.session.commit()
    return jsonify(table.to_dict()), 201


@tables_bp.route("/<int:tid>", methods=["PUT"])
@admin_required
def update_table(tid):
    table = Table.query.get_or_404(tid)
    data = request.get_json() or {}

    if "table_number" in data:
        new_num = str(data["table_number"]).strip()
        existing = Table.query.filter_by(table_number=new_num).first()
        if existing and existing.id != tid:
            return jsonify({"error": "Ce numéro de table existe déjà"}), 409
        table.table_number = new_num

    if "zone_type" in data:
        table.zone_type = data["zone_type"]
    if "capacity" in data:
        table.capacity = int(data["capacity"])

    # Rebuild coords dict to trigger SQLAlchemy JSON mutation detection
    coords = dict(table.coordinates_json)
    for field in ("x", "y", "w", "h"):
        if field in data:
            coords[field] = int(data[field])
    table.coordinates_json = coords

    db.session.commit()
    return jsonify(table.to_dict()), 200


@tables_bp.route("/<int:tid>", methods=["DELETE"])
@admin_required
def delete_table(tid):
    table = Table.query.get_or_404(tid)

    # Prevent deletion if any active reservation references this table
    refs = Reservation.query.filter(
        Reservation.table_ids.contains([tid]),
        Reservation.status != "cancelled"
    ).count()
    if refs > 0:
        return jsonify({"error": f"Impossible: {refs} réservation(s) active(s) référencent cette table"}), 409

    db.session.delete(table)
    db.session.commit()
    return jsonify({"message": "Table supprimée"}), 200
