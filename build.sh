#!/usr/bin/env bash
#
# Build script for Render (free tier) deployment.
# Builds the React frontend, copies its output into Django's static files
# directory, then runs collectstatic, migrations, and seeds initial data.
#
# This is an additional deployment path; the existing docker-compose.yml
# setup for local full-stack dev is untouched.
set -e

echo "==> Installing Python dependencies"
pip install --no-cache-dir -r requirements.txt

echo "==> Building React frontend"
cd frontend
npm install
npm run build
cd ..

echo "==> Copying frontend build into Django static files directory"
# Vite outputs to frontend/dist. Copy it into the staticfiles dir so WhiteNoise
# can serve the built SPA alongside Django's collected static assets.
mkdir -p staticfiles
cp -r frontend/dist/* staticfiles/

echo "==> Collecting static files"
python manage.py collectstatic --noinput

echo "==> Running database migrations"
python manage.py migrate

echo "==> Seeding initial users (TEMPORARY --reset to fix passwords from env vars)"
python manage.py seed_users --reset

echo "==> Seeding demo data (idempotent — skips if data already exists)"
python manage.py seed_demo_data

echo "==> Build complete"