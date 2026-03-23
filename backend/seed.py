import os
import bcrypt
from flask import Flask
from app import create_app, db
from app.models import User, Table, Reservation, AuditLog

app = create_app()

def build_tables():
    tables = []
    tid = 1

    def add(t_num, z_type, x, y, w, h, cap=4):
        nonlocal tid
        tables.append({
            'table_number': str(t_num),
            'zone_type': z_type,
            'capacity': cap,
            'coordinates_json': {"x": x, "y": y, "w": w, "h": h}
        })
        tid += 1

    # Grid columns X  — scaled ×1.8 for 1080-wide canvas
    C1 = 43    # was 24
    C2 = 171   # was 95
    C3 = 232   # was 129
    C4 = 358   # was 199
    C5 = 484   # was 269
    C6 = 634   # was 352
    C7 = 760   # was 422
    C8 = 925   # was 514
    C9 = 986   # was 548

    # Grid rows Y  — scaled ×(1920/1060) for 1920-tall canvas
    Y_TOP = 136
    Ys = [0, 362, 498, 634, 770, 906, 1042, 1178, 1314, 1450, 1586, 1722]

    W_org = 110  # was 61
    H_org = 109  # was 60
    W_st  = 56   # was 31
    H_st  = 63   # was 35
    W_c9  = 88   # was 49

    # ── TOP ROW ──────────────────────────────────────────────────────────────
    add("36B",  "Orange", C1, Y_TOP, W_org, 91, 4)
    add("36",   "Orange", C1, 254,   W_org, 91, 4)
    add("37",   "Orange", C3, Y_TOP, W_org, 91, 4)
    add("37.B", "Orange", C4, Y_TOP, W_org, 91, 4)
    add("38",   "Orange", C5, Y_TOP, 131,   91, 6)
    add("38.B", "Orange", C6, Y_TOP, W_org, 91, 4)
    add("39",   "Orange", C7, Y_TOP, W_org, 91, 4)
    add("40",   "Orange", C9, Y_TOP, W_c9,  91, 4)
    add("40B",  "Orange", C9, 254,   W_c9,  91, 4)

    # ── C1 (Far Left column) ─────────────────────────────────────────────────
    add("35.C", "Orange", C1, Ys[1], W_org, H_org)
    add("35.B", "Orange", C1, Ys[2], W_org, H_org)
    add("35",   "Orange", C1, Ys[3], W_org, H_org)
    add("34",   "Orange", C1, Ys[4], W_org, H_org)
    add("33.B", "Orange", C1, Ys[5], W_org, H_org)
    add("33",   "Orange", C1, Ys[6], W_org, H_org)

    # ── C3 (Inner Left) ──────────────────────────────────────────────────────
    add("11",   "Orange", C3, Ys[1], W_org, H_org)
    add("10",   "Orange", C3, Ys[2], W_org, H_org)
    add("09",   "Orange", C3, Ys[3], W_org, H_org)
    add("08",   "Teal",   C3, Ys[4], W_org, H_org)
    add("07",   "Teal",   C3, Ys[5], W_org, H_org)
    add("07.B", "Orange", C3, Ys[6], W_org, H_org)
    add("07.C", "Orange", C3, Ys[7], W_org, H_org)
    add("30",   "Orange", 203, 1414, 144, H_org)

    # ── C4 (Grey/Teal – Left of Stage) ───────────────────────────────────────
    add("14", "Grey", C4, Ys[1], W_org, H_org)
    add("15", "Grey", C4, Ys[2], W_org, H_org)
    add("16", "Grey", C4, Ys[3], W_org, H_org)
    add("12", "Teal", C4, Ys[4], W_org, H_org)
    add("06", "Teal", C4, Ys[7], W_org, H_org)

    # ── C6 (Grey/Teal – Right of Stage) ──────────────────────────────────────
    add("17",   "Grey", C6, Ys[1], W_org, H_org)
    add("18",   "Grey", C6, Ys[2], W_org, H_org)
    add("19",   "Grey", C6, Ys[3], W_org, H_org)
    add("12.B", "Teal", C6, Ys[4], W_org, H_org)
    add("05.B", "Teal", C6, Ys[7], W_org, H_org)

    # Below-piste centre tables
    add("06C", "Teal", 409, 1301, 121, 94, 4)
    add("06K", "Teal", 545, 1301, 121, 94, 4)

    # ── C7 (Inner Right) ─────────────────────────────────────────────────────
    add("01",  "Orange", C7,  Ys[1], W_org, H_org)
    add("02",  "Orange", C7,  Ys[2], W_org, H_org)
    add("03",  "Orange", C7,  Ys[3], W_org, H_org)
    add("04",  "Teal",   C7,  Ys[4], W_org, H_org)
    add("04B", "Teal",   870, Ys[4], 55,    H_org, 4)
    add("05",  "Teal",   C7,  Ys[5], W_org, H_org)
    add("20",  "Teal",   C7,  Ys[6], W_org, H_org)
    add("20B", "Teal",   870, Ys[6], 55,    H_org, 4)

    # ── C9 (Far Right column: 41-50) ─────────────────────────────────────────
    for i in range(1, 11):
        add(str(40 + i), "Orange", C9, Ys[i], W_c9, H_org)

    # "49B" – companion to 49
    add("49B", "Orange", 873, Ys[9], 50, 100, 4)

    # ── Bottom Centre Block ───────────────────────────────────────────────────
    add("23", "Orange", 358, 1414, W_org, H_org)
    add("22", "Orange", 497, 1414, W_org, H_org)
    add("21", "Orange", 634, 1414, W_org, H_org)
    add("25", "Orange", 401, 1554, 131,   H_org)
    add("24", "Orange", 567, 1554, 131,   H_org)
    add("27", "Orange", 401, 1685, 131,   145)
    add("26", "Orange", 567, 1685, 131,   145)

    # ── Bottom Right extras ───────────────────────────────────────────────────
    add("51B", "Orange", 727, 1685, 94, H_org)
    add("51",  "Orange", 837, 1685, 94, H_org)

    # ── VIP 2×2 grid (Bottom Left) ───────────────────────────────────────────
    add("VIP1", "Purple", 16,  1503, 88, 109, 8)
    add("VIP2", "Purple", 121, 1503, 88, 109, 8)
    add("VIP3", "Purple", 16,  1649, 88, 109, 8)
    add("VIP4", "Purple", 121, 1649, 88, 109, 8)


    # ── Stools Left (C2) ─────────────────────────────────────────────────────
    # Group 1 (150-141): y=362, step=72
    y_st = Ys[1]
    for i in range(150, 140, -1):
        add(str(i), "White", C2, y_st, W_st, H_st, 2)
        y_st += 72

    # Group 2 (140-136): start at y=1127
    y_st = 1127
    for i in range(140, 135, -1):
        add(str(i), "White", C2, y_st, W_st, H_st, 2)
        y_st += 72

    # ── Stools Right (C8) ────────────────────────────────────────────────────
    # Group 1 (101-111)
    y_st = Ys[1]
    for i in range(101, 112):
        add(str(i), "White", C8, y_st, W_st, H_st, 2)
        y_st += 72

    # Group 2 (121-130): y=1178
    y_st = Ys[7]
    for i in range(121, 131):
        add(str(i), "White", C8, y_st, W_st, H_st, 2)
        y_st += 72

    # ── 08B rendered LAST so it appears on top of stool 145 (y=722-785) ──────
    # Sits between tables 09 (ends y=743) and 08 (starts y=770), in stool column
    add("08B", "Orange", C2, 743, W_st, 27, 2)

    return tables


with app.app_context():
    print("Ensuring database tables exist...")
    db.create_all()

    print("Clearing existing data...")
    db.session.query(AuditLog).delete()
    db.session.query(Reservation).delete()
    db.session.query(Table).delete()
    db.session.query(User).delete()
    db.session.commit()

    print("Creating users...")
    admin = User(
        username="admin",
        password_hash=bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode('utf-8'),
        role="admin"
    )
    db.session.add(admin)

    caissier = User(
        username="caissier1",
        password_hash=bcrypt.hashpw("123".encode(), bcrypt.gensalt()).decode('utf-8'),
        role="caissier"
    )
    db.session.add(caissier)

    print("Seeding tables...")
    tables_data = build_tables()
    seen: set = set()
    for t in tables_data:
        if t['table_number'] in seen:
            print(f"  ⚠ Duplicate skipped: {t['table_number']}")
            continue
        seen.add(t['table_number'])
        db.session.add(Table(**t))

    db.session.commit()
    print(f"✅ Done — {len(seen)} tables created.")
