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

    W = 100
    H = 100
    W_st = 60
    H_st = 20
    GAP = 20

    CX = {
        "C1": 30,
        "C2": 150,
        "C3": 220,
        "C4": 340,
        "C5": 490,
        "C6": 640,
        "C7": 760,
        "C8": 880,
        "C9": 950
    }

    def y_row(r): return 140 + r * 120
    def sy(start_y, i, gap=14): return start_y + i * (H_st + gap)

    # ── R0: Top Row ──────────────────────────────────────────────────────────
    r0 = y_row(0)
    add("36",   "Orange", CX["C1"], r0, W, H, 4)
    add("37",   "Orange", CX["C3"], r0, W, H, 4)
    add("37.B", "Orange", CX["C4"], r0, W, H, 4)
    add("38",   "Orange", 460,      r0, 160, H, 6) # Center 540
    add("38.B", "Orange", CX["C6"], r0, W, H, 4)
    add("39",   "Orange", CX["C7"], r0, W, H, 4)
    add("40",   "Orange", CX["C9"], r0, W, 40, 2)
    add("40B",  "Orange", CX["C9"], r0+60, W, 40, 2)

    # ── Main Grid ────────────────────────────────────────────────────────────
    # Helper to add standard tables across standard columns
    def grid_row(r, c1, c3, c4, c5, c6, c7, c9):
        y = y_row(r)
        if c1: add(c1[0], c1[1], CX["C1"], y, W, H, 4)
        if c3: add(c3[0], c3[1], CX["C3"], y, W, H, 4)
        if c4: add(c4[0], c4[1], CX["C4"], y, W, H, 4)
        if c5: add(c5[0], c5[1], CX["C5"], y, W, H, 4)
        if c6: add(c6[0], c6[1], CX["C6"], y, W, H, 4)
        if c7: add(c7[0], c7[1], CX["C7"], y, W, H, 4)
        if c9: add(c9[0], c9[1], CX["C9"], y, W, H, 4)

    # R2 (Y=380)
    grid_row(2, 
        ("35.C", "Orange"), ("11", "Orange"), ("14", "Grey"), None, ("17", "Grey"), ("01", "Orange"), ("41", "Orange")
    )
    
    # R3 (Y=500)
    grid_row(3, 
        ("35.B", "Orange"), ("10", "Orange"), ("15", "Grey"), None, ("18", "Grey"), ("02", "Orange"), ("42", "Orange")
    )
    
    # R4 (Y=620)
    grid_row(4, 
        ("35", "Orange"),   ("09", "Orange"), ("16", "Grey"), None, ("19", "Grey"), ("03", "Orange"), ("43", "Orange")
    )
    
    # R5 (Teal Row 1 - Y=740)
    # User instruction: "for 04 to 20b they all should be moved down to add 04b above 04 and under 03"
    # "give space to 08b 12 and 12b so they dont appear overlapped"
    grid_row(5, 
        ("34", "Orange"),   ("08", "Teal"),   ("08B", "Teal"), ("12", "Teal"), ("12.B", "Teal"), ("04B", "Teal"), ("44", "Orange")
    )

    # R6 (Teal Row 2 - Y=860) Piste Top
    grid_row(6, 
        ("33.B", "Orange"), ("07", "Teal"),   None, None, None, ("04", "Teal"), ("45", "Orange")
    )

    # R7 (Y=980) Piste Mid
    grid_row(7, 
        ("33", "Orange"),   ("07.B", "Orange"), None, None, None, ("05", "Teal"), ("46", "Orange")
    )

    # R8 (Y=1100) Piste Bot
    grid_row(8, 
        None, ("07.C", "Orange"), ("06", "Teal"), None, ("06.B", "Teal"), ("20", "Teal"), ("47", "Orange")
    )
    
    # R9 (Y=1220) Below Piste
    grid_row(9, 
        None, ("30", "Orange"),   ("06C", "Teal"), None, ("06K", "Teal"), ("20B", "Teal"), ("48", "Orange")
    )

    # ── Bottom Center Block ──────────────────────────────────────────────────
    # R10 (Y=1340)
    y10 = y_row(10)
    add("23",   "Orange", CX["C4"], y10, W, H, 4)
    add("22",   "Orange", CX["C5"], y10, W, H, 4)
    add("21",   "Orange", CX["C6"], y10, W, H, 4)
    add("49",   "Orange", CX["C9"], y10, W, H, 4)

    # R11 (Y=1460)
    y11 = y_row(11)
    add("25",   "Orange", 430,      y11, W, H, 4)
    add("24",   "Orange", 550,      y11, W, H, 4)
    add("49B",  "Orange", CX["C9"], y11, W, H, 4)

    # R12 (Y=1580)
    y12 = y_row(12)
    add("27",   "Orange", 430,      y12, W, H, 4)
    add("26",   "Orange", 550,      y12, W, H, 4)
    # Corner 51B, 51, 50 offset to avoid stool column overlap
    add("51B",  "Orange", 710,      y12, W, H, 4)
    add("51",   "Orange", 830,      y12, W, H, 4)
    add("50",   "Orange", CX["C9"], y12, W, H, 4)

    # ── VIP Block (Bottom Left) ──────────────────────────────────────────────
    # Exactly 3 VIP zones requested. Spanning col 1 and 2 area.
    w_vip = 150
    h_vip = 100
    add("VIP1", "Purple", CX["C1"], y_row(10), w_vip, h_vip, 8)
    add("VIP2", "Purple", CX["C1"], y_row(11), w_vip, h_vip, 8)
    add("VIP3", "Purple", CX["C1"], y_row(12), w_vip, h_vip, 8)

    # ── Stools C2 (Left) ─────────────────────────────────────────────────────
    # "the height of tables like 150 to 101 should be minimized" -> H_st=20
    # Group 1: 150-141. R2 Y=380.
    for i in range(10): add(str(150 - i), "White", CX["C2"], sy(y_row(2), i), W_st, H_st, 2)
    # Group 2: 140-131. R6 Y=860.
    for i in range(10): add(str(140 - i), "White", CX["C2"], sy(y_row(6), i), W_st, H_st, 2)

    # ── Stools C8 (Right) ────────────────────────────────────────────────────
    for i in range(10): add(str(101 + i), "White", CX["C8"], sy(y_row(2), i), W_st, H_st, 2)
    for i in range(10): add(str(111 + i), "White", CX["C8"], sy(y_row(6), i), W_st, H_st, 2)
    for i in range(10): add(str(121 + i), "White", CX["C8"], sy(y_row(9), i), W_st, H_st, 2)
    
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
