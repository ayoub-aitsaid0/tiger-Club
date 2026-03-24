from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    app.url_map.strict_slashes = False  # Prevent 308 redirects that expose raw backend IP
    app.config.from_object("app.config.Config")

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}}, supports_credentials=True)

    from app.routes.auth import auth_bp
    from app.routes.tables import tables_bp
    from app.routes.reservations import reservations_bp
    from app.routes.users import users_bp
    from app.routes.analytics import analytics_bp
    from app.routes.audit import audit_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(tables_bp, url_prefix="/api/tables")
    app.register_blueprint(reservations_bp, url_prefix="/api/reservations")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
    app.register_blueprint(audit_bp, url_prefix="/api/audit")

    return app
