# Delivery Hub Management System

A full-stack logistics operations platform for managing courier/delivery hub operations including parcel intake, sorting, rider assignment, dispatch, delivery tracking, and performance analytics.

## Tech Stack

### Backend
- **Python 3.13** with **Django 5.0**
- **Django REST Framework** for REST API
- **PostgreSQL** for primary database
- **Redis** for Celery broker and caching
- **Celery** for async task processing
- **Django Channels** for WebSocket real-time updates
- **SimpleJWT** for authentication

### Frontend
- **React 18** with **TypeScript**
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Router** for routing
- **Axios** for API calls
- **Recharts** for analytics
- **Lucide React** for icons

## Features

- Role-based access control (Admin, Hub Manager, Rider)
- Parcel registration with QR code generation
- Automatic rider assignment based on zone and capacity
- Real-time dispatch board updates via WebSocket
- Delivery status tracking and exception handling
- Report generation (PDF, CSV, Excel)
- Public parcel tracking page
- QR code scanning for quick lookup
- Live dashboard with analytics

## Quick Start

### Prerequisites
- Python 3.13+
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd delivery-hub
   ```

2. **Set up Python virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run migrations**
   ```bash
   python manage.py migrate
   ```

5. **Create a superuser**
   ```bash
   python manage.py createsuperuser
   ```

6. **Seed initial users** (optional)
   ```bash
   # Set environment variables for initial users (see .env.example)
   # Then run the seed_users command:
   python manage.py seed_users
   ```
   
   This creates three default users from environment variables:
   - **Admin**: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`
   - **Hub Manager**: `HUB_MANAGER_USERNAME`, `HUB_MANAGER_PASSWORD`, `HUB_MANAGER_EMAIL`
   - **Rider**: `RIDER_USERNAME`, `RIDER_PASSWORD`, `RIDER_EMAIL`
   
   The command is idempotent - running it multiple times won't create duplicates.
   See `.env.example` for the required environment variables.

7. **Start Redis** (required for Celery)
   ```bash
   redis-server
   ```

7. **Start Celery worker** (in a separate terminal)
   ```bash
   celery -A delivery_hub.settings.celery worker --loglevel=info
   ```

8. **Start Django development server**
   ```bash
   python manage.py runserver
   ```

9. **Set up frontend** (in a separate terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

10. **Access the application**
    - Frontend: http://localhost:5173
    - Backend API: http://localhost:8000/api/
    - Admin panel: http://localhost:8000/admin/
    - API docs: http://localhost:8000/api/docs/

### Docker Setup (Production)

1. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with production settings
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Run migrations**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

4. **Create superuser**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

5. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost/api/

## Project Structure

```
delivery-hub/
├── accounts/              # User authentication and profiles
├── parcels/               # Parcel management, QR codes
├── riders/                # Rider management
├── dispatch/              # Assignment engine, scheduling
├── delivery/              # Delivery attempts, exception handling
├── reports/               # Report generation (PDF/CSV/Excel)
├── core/                  # Shared permissions, utilities
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Zustand state management
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # API client, utilities
│   │   └── types/         # TypeScript definitions
│   └── ...
├── delivery_hub/          # Django project settings
│   └── settings/
│       ├── base.py        # Shared settings
│       ├── local.py       # Development settings
│       ├── celery.py      # Celery configuration
│       └── channels.py    # WebSocket consumers
├── Dockerfile             # Backend Docker image
├── docker-compose.yml     # Multi-service orchestration
└── requirements.txt       # Python dependencies
```

## API Endpoints

### Authentication
- `POST /api/auth/login/` - Login (returns JWT tokens)
- `POST /api/auth/token/refresh/` - Refresh access token
- `GET /api/auth/users/me/` - Get current user

### Parcels
- `GET /api/parcels/parcels/` - List parcels
- `POST /api/parcels/parcels/` - Create parcel
- `GET /api/parcels/parcels/{id}/` - Retrieve parcel
- `POST /api/parcels/parcels/{id}/mark_sorted/` - Mark as sorted
- `POST /api/parcels/parcels/{id}/generate_qr/` - Generate QR code
- `POST /api/parcels/parcels/scan/` - Scan QR code
- `GET /api/parcels/parcels/track/?tracking_id={id}` - Public tracking

### Dispatch
- `POST /api/dispatch/assignments/run_assignment/` - Run assignment engine
- `POST /api/dispatch/assignments/{id}/mark_in_transit/` - Mark in transit
- `POST /api/dispatch/assignments/{id}/mark_delivered/` - Mark delivered

### Delivery
- `POST /api/delivery/attempts/record_attempt/` - Record delivery attempt

### Reports
- `GET /api/reports/daily-dispatch/` - Download daily dispatch PDF
- `GET /api/reports/rider-performance/` - Download rider performance PDF
- `GET /api/reports/parcel-csv/` - Export parcels as CSV
- `GET /api/reports/delivery-excel/` - Export delivery performance as Excel

### WebSocket
- `ws://localhost:8000/ws/dispatch/` - Real-time dispatch updates

## Testing

### Backend Tests
```bash
python -m pytest -v
```

### Frontend Build
```bash
cd frontend
npm run build
```

## Deployment

### Environment Variables
See `.env.example` for required environment variables.

#### Required for seed_users Command
When deploying to production (especially Railway), set these environment variables to create initial users:
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`
- `HUB_MANAGER_USERNAME`, `HUB_MANAGER_PASSWORD`, `HUB_MANAGER_EMAIL`
- `RIDER_USERNAME`, `RIDER_PASSWORD`, `RIDER_EMAIL`

After deployment, run: `python manage.py seed_users`

### Deployment Targets
- **Railway**: Supports direct Docker deploys
- **Render**: Supports Docker and background workers
- **Fly.io**: Supports multi-service Docker apps

### CI/CD
GitHub Actions workflow runs on every push/PR:
- Backend tests with PostgreSQL
- Frontend TypeScript check and build
- Linting (Ruff for Python, ESLint for frontend)
- Docker image build and push on merge to main
- Automatic deployment to Railway

## Development Stages

This project was built in stages following a structured approach:

1. **Stage 1**: Project foundation & data models
2. **Stage 2**: Business logic layer (rider assignment, exception handling)
3. **Stage 3**: REST API layer with DRF
4. **Stage 4**: Frontend (React + TypeScript)
5. **Stage 5**: QR codes, barcode scanning, reports
6. **Stage 6**: Async processing & real-time updates (Celery + Channels)
7. **Stage 7**: Containerization & deployment (Docker + CI/CD)

## License

MIT License