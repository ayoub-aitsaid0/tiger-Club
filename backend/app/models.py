from datetime import datetime
from app import db
from sqlalchemy.dialects.postgresql import ARRAY, JSON
import bcrypt


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="caissier")  # caissier | admin
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    reservations = db.relationship("Reservation", backref="caissier", lazy=True)
    audit_logs = db.relationship("AuditLog", backref="user", lazy=True)

    def set_password(self, password: str):
        self.password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def check_password(self, password: str) -> bool:
        return bcrypt.checkpw(password.encode(), self.password_hash.encode())

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
        }


class Table(db.Model):
    __tablename__ = "tables"

    id = db.Column(db.Integer, primary_key=True)
    table_number = db.Column(db.String(20), unique=True, nullable=False)
    zone_type = db.Column(db.String(20), nullable=False)  # Orange | Teal | Grey | Purple | White
    coordinates_json = db.Column(JSON, nullable=False, default=dict)
    capacity = db.Column(db.Integer, default=4)

    def to_dict(self):
        return {
            "id": self.id,
            "table_number": self.table_number,
            "zone_type": self.zone_type,
            "coordinates": self.coordinates_json,
            "capacity": self.capacity,
        }


class Reservation(db.Model):
    __tablename__ = "reservations"

    id = db.Column(db.Integer, primary_key=True)
    table_ids = db.Column(ARRAY(db.Integer), nullable=False)
    customer_name = db.Column(db.String(120), nullable=False)
    customer_phone = db.Column(db.String(30), nullable=True)
    total_price = db.Column(db.Numeric(10, 2), nullable=False)
    advance_paid = db.Column(db.Numeric(10, 2), default=0)
    payment_method = db.Column(db.String(10), nullable=False, default="cash")  # cash | tpe
    date_reservation = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default="reserved")  # reserved | occupied | cancelled
    notes = db.Column(db.Text, nullable=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        table_numbers = [
            t.table_number for t in
            Table.query.filter(Table.id.in_(self.table_ids or [])).all()
        ]
        return {
            "id": self.id,
            "table_ids": self.table_ids,
            "table_numbers": table_numbers,
            "customer_name": self.customer_name,
            "customer_phone": self.customer_phone,
            "total_price": float(self.total_price),
            "advance_paid": float(self.advance_paid),
            "payment_method": self.payment_method,
            "date_reservation": self.date_reservation.isoformat(),
            "status": self.status,
            "notes": self.notes,
            "created_by_user_id": self.created_by_user_id,
            "created_by_username": self.caissier.username if self.caissier else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action = db.Column(db.String(80), nullable=False)
    details = db.Column(JSON, nullable=True)  # {"old": ..., "new": ...}
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.user.username if self.user else "system",
            "action": self.action,
            "details": self.details,
            "created_at": self.created_at.isoformat(),
        }
