from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Table, Reservation
from app import db
from datetime import date

tables_bp = Blueprint("tables", __name__)


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

    # Get all tables
    tables = Table.query.all()

    # Get all reservations for that day (not cancelled)
    reservations = Reservation.query.filter(
        Reservation.date_reservation == query_date,
        Reservation.status != "cancelled"
    ).all()

    # Map table_id -> status
    reserved_map = {}
    for r in reservations:
        for tid in r.table_ids:
            reserved_map[tid] = r.status  # "reserved" or "occupied"

    result = []
    for t in tables:
        status = reserved_map.get(t.id, "free")
        result.append({
            **t.to_dict(),
            "status": status,
        })

    return jsonify(result), 200
