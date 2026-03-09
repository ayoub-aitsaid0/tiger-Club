# Tiger Club - Management System

A professional management system for Tiger Club, featuring a real-time Floor Map, Reservation Management, and Administrative Dashboard.

## Features
- **Real-time Floor Map**: Visual table management.
- **Reservation System**: Full lifecycle from booking to payment.
- **Admin Dashboard**: Analytics and business monitoring.
- **Role-based Access**: Custom views for Admins and Caissiers.
- **Humane Audit Logs**: Clear history of all critical actions.

## Production Deployment with Docker Compose

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd tiger-club
   ```

2. **Configure Environment**:
   - Copy `.env.example` to `.env`.
   - Update `POSTGRES_PASSWORD`, `JWT_SECRET_KEY`, and `NEXT_PUBLIC_API_URL`.

3. **Launch with Docker Compose**:
   ```bash
   docker-compose up -d --build
   ```

4. **Initialize Database**:
   ```bash
   docker-compose exec backend flask db upgrade
   docker-compose exec backend python seed.py
   ```

The application will be available at `http://your-server-ip:3000`.
