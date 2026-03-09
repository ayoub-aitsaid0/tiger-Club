from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Reservation, User
from app import db
from sqlalchemy import func, cast, Numeric
from datetime import date, timedelta
from functools import wraps

analytics_bp = Blueprint("analytics", __name__)


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


@analytics_bp.route("/revenue", methods=["GET"])
@admin_required
def revenue():
    period = request.args.get("period", "daily")
    payment_filter = request.args.get("payment_method", "all")

    today = date.today()

    if period == "daily":
        start = today
        end = today
    elif period == "weekly":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
    elif period == "monthly":
        start = today.replace(day=1)
        end = today
    else:
        return jsonify({"error": "period doit être daily, weekly ou monthly"}), 400

    query = Reservation.query.filter(
        Reservation.date_reservation >= start,
        Reservation.date_reservation <= end,
        Reservation.status != "cancelled"
    )

    if payment_filter != "all":
        query = query.filter(Reservation.payment_method == payment_filter)

    reservations = query.all()

    total_revenue = sum(float(r.total_price) for r in reservations)
    total_advance = sum(float(r.advance_paid) for r in reservations)
    count = len(reservations)

    # Breakdown by day
    breakdown = {}
    for r in reservations:
        d = r.date_reservation.isoformat()
        if d not in breakdown:
            breakdown[d] = {"date": d, "total": 0, "advance": 0, "count": 0, "cash": 0, "tpe": 0}
        breakdown[d]["total"] += float(r.total_price)
        breakdown[d]["advance"] += float(r.advance_paid)
        breakdown[d]["count"] += 1
        breakdown[d][r.payment_method] += float(r.total_price)

    return jsonify({
        "period": period,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "total_revenue": total_revenue,
        "total_advance": total_advance,
        "reservation_count": count,
        "payment_method_filter": payment_filter,
        "daily_breakdown": sorted(breakdown.values(), key=lambda x: x["date"]),
    }), 200


@analytics_bp.route("/summary", methods=["GET"])
@admin_required
def summary():
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    def get_total(start, end):
        res = Reservation.query.filter(
            Reservation.date_reservation >= start,
            Reservation.date_reservation <= end,
            Reservation.status != "cancelled"
        ).all()
        return {
            "total": sum(float(r.total_price) for r in res),
            "advance": sum(float(r.advance_paid) for r in res),
            "count": len(res),
        }

    return jsonify({
        "daily": get_total(today, today),
        "weekly": get_total(week_start, today),
        "monthly": get_total(month_start, today),
    }), 200
