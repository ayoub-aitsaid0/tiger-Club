from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import DailyShift, AuditLog
from app import db
from datetime import date

shifts_bp = Blueprint("shifts", __name__)


@shifts_bp.route("/today", methods=["GET"])
@jwt_required()
def get_today_shift():
    """Return the shift for a given date (defaults to today).
    Accepts optional ?date=YYYY-MM-DD query param.
    """
    date_str = request.args.get("date")
    if date_str:
        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            return jsonify({"error": "Format de date invalide"}), 400
    else:
        target_date = date.today()

    shift = DailyShift.query.filter_by(date=target_date).first()
    if not shift:
        return jsonify(None), 200
    return jsonify(shift.to_dict()), 200


@shifts_bp.route("/", methods=["POST"])
@jwt_required()
def set_today_shift():
    user_id = int(get_jwt_identity())

    # Prevent overwriting a shift already set today
    existing = DailyShift.query.filter_by(date=date.today()).first()
    if existing:
        return jsonify({
            "error": "Shift déjà défini pour aujourd'hui",
            "shift": existing.to_dict()
        }), 409

    data = request.get_json()
    operator_name = (data.get("operator_name") or "").strip()
    if not operator_name:
        return jsonify({"error": "Le nom de l'opérateur est requis"}), 400

    shift = DailyShift(
        date=date.today(),
        operator_name=operator_name,
        set_by_user_id=user_id,
    )
    db.session.add(shift)

    log = AuditLog(
        user_id=user_id,
        action="SET_DAILY_SHIFT",
        details={"operator_name": operator_name, "date": date.today().isoformat()},
    )
    db.session.add(log)
    db.session.commit()

    return jsonify(shift.to_dict()), 201
