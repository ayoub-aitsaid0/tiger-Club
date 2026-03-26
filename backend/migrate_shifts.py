"""
One-time migration: adds daily_shifts table and operator_name column to reservations.
Run once after deploying the new code:

    docker exec tiger-club-backend python migrate_shifts.py
    # or locally:
    python migrate_shifts.py
"""
from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    with db.engine.connect() as conn:
        # 1. Add operator_name to reservations (safe – uses IF NOT EXISTS equivalent)
        try:
            conn.execute(text(
                "ALTER TABLE reservations ADD COLUMN operator_name VARCHAR(100)"
            ))
            conn.commit()
            print("✓ Added operator_name column to reservations")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("  operator_name column already exists, skipping")
            else:
                raise

        # 2. Create daily_shifts table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS daily_shifts (
                id SERIAL PRIMARY KEY,
                date DATE UNIQUE NOT NULL,
                operator_name VARCHAR(100) NOT NULL,
                set_at TIMESTAMP DEFAULT NOW(),
                set_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
            )
        """))
        conn.commit()
        print("✓ Created daily_shifts table")

    print("\nMigration complete.")
