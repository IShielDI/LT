# Railway Deployment Guide

This guide walks you through deploying the Delivery Hub application to Railway.

## Prerequisites

- Railway CLI installed (`npm install -g @railway/cli`)
- Railway account (sign up at https://railway.app)
- Git repository (GitHub, GitLab, or Bitbucket)

## Environment Variables to Set in Railway Dashboard

**⚠️ IMPORTANT: These must be set manually in the Railway dashboard for security. Do NOT commit them to git.**

### Required Variables (Set for ALL services: web, celery-worker, celery-beat)

1. **`DJANGO_SECRET_KEY`** (Required)
   - Generate a secure random key
   - Example: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
   - This is used for cryptographic signing in Django

2. **`DATABASE_URL`** (Required)
   - Format: `postgres://username:password@host:port/database_name`
   - Railway will provide this automatically if you add a PostgreSQL plugin
   - Example: `postgres://postgres:password@postgres.railway.app:5432/railway`

3. **`REDIS_URL`** (Required)
   - Format: `redis://username:password@host:port/db_number`
   - Railway will provide this automatically if you add a Redis plugin
   - Example: `redis://default:password@redis.railway.app:6379/0`

4. **`DJANGO_ALLOWED_HOSTS`** (Required)
   - Comma-separated list of allowed hostnames
   - Include your Railway app domain
   - Example: `your-app.up.railway.app,localhost,127.0.0.1`

### Optional Variables

5. **`DJANGO_DEBUG`** (Optional, defaults to `False`)
   - Set to `False` for production (recommended)
   - Example: `False`

6. **`FRONTEND_URL`** (Optional)
   - URL of your frontend application for CORS
   - Example: `https://your-frontend.vercel.app`

## Manual Deployment Steps

### Step 1: Initialize Railway Project

```bash
# Login to Railway
railway login

# Initialize Railway in your project directory
railway init

# Follow the prompts to:
# 1. Select or create a Railway project
# 2. Link to your Git repository (optional but recommended)
```

### Step 2: Add Required Services

In the Railway dashboard or via CLI:

```bash
# Add PostgreSQL database
railway add -p postgres

# Add Redis cache
railway add -p redis
```

Railway will automatically set `DATABASE_URL` and `REDIS_URL` environment variables.

### Step 3: Set Environment Variables

**Option A: Using Railway Dashboard (Recommended)**
1. Go to https://railway.app/dashboard
2. Select your project
3. Click on your service
4. Go to "Variables" tab
5. Add each variable listed above

**Option B: Using Railway CLI**
```bash
# Set variables for all services
railway variables set DJANGO_SECRET_KEY="your-generated-secret-key"
railway variables set DJANGO_ALLOWED_HOSTS="your-app.up.railway.app,localhost,127.0.0.1"
railway variables set DJANGO_DEBUG="False"
railway variables set FRONTEND_URL="https://your-frontend.vercel.app"  # Optional
```

### Step 4: Deploy the Application

```bash
# Deploy to Railway
railway up
```

Or push to your connected Git repository (Railway will auto-deploy):
```bash
git add .
git commit -m "Deploy to Railway"
git push origin main
```

### Step 5: Run Database Migrations

After deployment, run migrations:

```bash
# Open Railway shell
railway shell

# Run migrations
python manage.py migrate

# Exit shell
exit
```

Or via the Railway dashboard:
1. Go to your service
2. Click "Deployments" → "View Logs"
3. Use the "Run Command" feature to execute: `python manage.py migrate`

### Step 5b: Seed Initial Users (Optional)

Create initial users for each role using environment variables:

**Prerequisites:** Set these environment variables in Railway dashboard:
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`
- `HUB_MANAGER_USERNAME`, `HUB_MANAGER_PASSWORD`, `HUB_MANAGER_EMAIL`
- `RIDER_USERNAME`, `RIDER_PASSWORD`, `RIDER_EMAIL`

```bash
# Open Railway shell
railway shell

# Seed users
python manage.py seed_users

# Exit shell
exit
```

Or via Railway dashboard "Run Command":
```bash
python manage.py seed_users
```

The command is idempotent - safe to run multiple times. It will skip users that already exist.

**Created users:**
- **Admin** (superuser + staff) - Full system access
- **Hub Manager** (staff) - Operations management
- **Rider** (regular user) - Delivery partner

### Step 6: Collect Static Files

```bash
railway shell
python manage.py collectstatic --noinput
exit
```

### Step 7: Verify Deployment

1. **Check Web Service:**
   - Visit `https://your-app.up.railway.app/api/health/`
   - Should return a health check response

2. **Check Celery Worker:**
   - View logs in Railway dashboard
   - Should show "ready" messages

3. **Check Celery Beat:**
   - View logs in Railway dashboard
   - Should show beat scheduler started

4. **Test API:**
   - Visit `https://your-app.up.railway.app/api/schema/` (API docs)
   - Test authentication endpoints

## Project Structure on Railway

Your deployment will have 3 services:

1. **web** - Main Django application (Gunicorn on port 8000)
   - Health check: `/api/health/`
   - Serves API and admin interface

2. **celery-worker** - Background task processor
   - Processes async tasks (reports, assignments, etc.)

3. **celery-beat** - Periodic task scheduler
   - Runs scheduled tasks (daily assignments at midnight)

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL plugin is added to Railway
- Ensure database is running (check Railway dashboard)

### Redis Connection Issues
- Verify `REDIS_URL` is set correctly
- Check Redis plugin is added to Railway
- Ensure Redis is running

### Celery Not Working
- Check `REDIS_URL` is accessible from all services
- Verify Celery worker logs for errors
- Ensure `delivery_hub.settings.celery` module is correct

### Static Files Not Loading
- Run `python manage.py collectstatic --noinput`
- Verify `STATIC_ROOT` is configured correctly
- Check that static files are being collected during build

### CORS Errors
- Add your frontend URL to `FRONTEND_URL` environment variable
- Or manually add to `CORS_ALLOWED_ORIGINS` in settings
- Ensure frontend URL uses HTTPS in production

## Security Notes

✅ **DO:**
- Set strong `DJANGO_SECRET_KEY`
- Use `DJANGO_DEBUG=False` in production
- Set specific `DJANGO_ALLOWED_HOSTS` (not `*`)
- Use HTTPS (Railway provides this automatically)
- Keep `.env` file in `.gitignore`

❌ **DON'T:**
- Commit `.env` file to git
- Use weak secret keys
- Leave `DEBUG=True` in production
- Expose database credentials
- Commit any files in `.gitignore`

## Continuous Deployment

Once connected to your Git repository:
- Every push to main branch triggers a deployment
- Railway automatically builds and deploys
- View deployment status in Railway dashboard
- Rollback to previous deployments if needed

## Monitoring

- View logs: `railway logs` or Railway dashboard
- Monitor resource usage in Railway dashboard
- Set up alerts for service failures
- Check database performance metrics

## Next Steps

1. ✅ Deploy backend to Railway
2. Deploy frontend to Vercel/Netlify
3. Update `FRONTEND_URL` with your frontend domain
4. Configure custom domain (optional)
5. Set up monitoring and alerts
6. Test all features in production

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Issues: Check your repository's issue tracker