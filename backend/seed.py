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

    # Grid columns X
    C1 = 40
    C2 = 155
    C3 = 210
    C4 = 325
    C5 = 440
    C6 = 575
    C7 = 690
    C8 = 805
    C9 = 860

    # Grid rows Y 
    Y_TOP = 75
    Ys = [0, 200, 275, 350, 425, 500, 575, 650, 725, 800, 875, 950]
    
    W_org = 100
    H_org = 60
    W_st = 40
    H_st = 16

    # TOP ROW
    add("36", "Orange", C1, Y_TOP, W_org, 50, 4)
    add("37", "Orange", C3, Y_TOP, W_org, 50, 4)
    add("37.B", "Orange", C4, Y_TOP, W_org, 50, 4)
    add("38", "Orange", C5, Y_TOP, 120, 50, 6)
    add("38.B", "Orange", C6, Y_TOP, W_org, 50, 4)
    add("39", "Orange", C7, Y_TOP, W_org, 50, 4)
    add("40", "Orange", C9, Y_TOP, W_org, 50, 4)

    # C1 (Far Left)
    add("35.C", "Orange", C1, Ys[1], W_org, H_org)
    add("35.B", "Orange", C1, Ys[3], W_org, H_org)
    add("35", "Orange", C1, Ys[4], W_org, H_org)
    add("34", "Orange", C1, Ys[6], W_org, H_org)
    add("33.B", "Orange", C1, Ys[7], W_org, H_org)
    add("33", "Orange", C1, Ys[8], W_org, H_org)

    # C3 (Inner Left)
    add("11", "Orange", C3, Ys[1], W_org, H_org)
    add("10", "Orange", C3, Ys[2], W_org, H_org)
    add("09", "Orange", C3, Ys[3], W_org, H_org)
    add("08", "Teal", C3, Ys[4], W_org, H_org)
    add("07", "Teal", C3, Ys[5], W_org, H_org)
    add("07.B", "Orange", C3, Ys[6], W_org, H_org)
    add("07.C", "Orange", C3, Ys[7], W_org, H_org)
    add("30", "Orange", 170, Ys[8], 140, H_org) # Shifted between C2 and C3

    # C4 (Grey/Teal Left)
    add("14", "Grey", C4, Ys[1], W_org, H_org)
    add("15", "Grey", C4, Ys[2], W_org, H_org)
    add("16", "Grey", C4, Ys[3], W_org, H_org)
    add("12", "Teal", C4, Ys[4], W_org, H_org)
    add("06", "Teal", C4, Ys[7], W_org, H_org)

    # C6 (Grey/Teal Right)
    add("17", "Grey", C6, Ys[1], W_org, H_org)
    add("18", "Grey", C6, Ys[2], W_org, H_org)
    add("19", "Grey", C6, Ys[3], W_org, H_org)
    add("12.B", "Teal", C6, Ys[4], W_org, H_org)
    add("06.B", "Teal", C6, Ys[7], W_org, H_org)

    # C7 (Inner Right)
    add("01", "Orange", C7, Ys[1], W_org, H_org)
    add("02", "Orange", C7, Ys[2], W_org, H_org)
    add("03", "Orange", C7, Ys[3], W_org, H_org)
    add("04", "Teal", C7, Ys[4], W_org, H_org)
    add("05", "Teal", C7, Ys[5], W_org, H_org)
    add("20", "Teal", C7, Ys[6], W_org, H_org)

    # C9 (Far Right)
    for i in range(1, 11):
        add(str(40 + i), "Orange", C9, Ys[i], W_org, H_org)

    # Bottom Center Block (Below Piste)
    add("23", "Orange", 325, Ys[8], W_org, H_org)
    add("22", "Orange", 450, Ys[8], W_org, H_org)
    add("21", "Orange", 575, Ys[8], W_org, H_org)
    add("25", "Orange", 365, Ys[9], 120, H_org)
    add("24", "Orange", 515, Ys[9], 120, H_org)
    add("27", "Orange", 365, Ys[10], 120, 80)
    add("26", "Orange", 515, Ys[10], 120, 80)

    # Bottom Left VIP
    add("VIP 1", "Purple", 40, Ys[9] + 30, 150, 50, 8)
    add("VIP 2", "Purple", 40, Ys[10] + 30, 70, 60, 8)
    add("VIP 3", "Purple", 120, Ys[10] + 30, 70, 60, 8)

    # Bottom Right 51
    add("51", "Orange", 760, Ys[10], 85, H_org)

    # Stools Left (C2)
    y_st = Ys[1]
    for i in range(150, 140, -1):
        add(str(i), "White", C2, y_st, W_st, H_st, 2)
        y_st += 21
        
    y_st = Ys[4]
    for i in range(140, 130, -1):
        add(str(i), "White", C2, y_st, W_st, H_st, 2)
        y_st += 21

    # Stools Right (C8)
    y_st = Ys[1]
    for i in range(101, 111):
        add(str(i), "White", C8, y_st, W_st, H_st, 2)
        y_st += 21
        
    y_st = Ys[4]
    for i in range(111, 121):
        add(str(i), "White", C8, y_st, W_st, H_st, 2)
        y_st += 21

    y_st = Ys[7]
    for i in range(121, 131):
        add(str(i), "White", C8, y_st, W_st, H_st, 2)
        y_st += 21

    return tables

with app.app_context():
    print("Ensuring database tables exist...")
    db.create_all()

    print("Clearing tables...")
    db.session.query(AuditLog).delete()
    db.session.query(Reservation).delete()
    db.session.query(Table).delete()
    db.session.query(User).delete()
    db.session.commit()

    print("Creating admin user...")
    admin = User(
        username="admin",
        password_hash=bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode('utf-8'),
        role="admin"
    )
    db.session.add(admin)

    # Create one caissier for quick testing
    caissier = User(
        username="caissier1",
        password_hash=bcrypt.hashpw("123".encode(), bcrypt.gensalt()).decode('utf-8'),
        role="caissier"
    )
    db.session.add(caissier)    
    
    print("Seeding new tables topology...")
    tables_data = build_tables()
    for t in tables_data:
        db.session.add(Table(**t))
    
    db.session.commit()
    print(f"✅ Created {len(tables_data)} tables (Blueprint Exact).")
