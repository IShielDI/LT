# Railway Deployment Checklist

## ✅ Completed Configuration

The following has been configured in your project:

- [x] **railway.toml** - Defines 3 services (web, celery-worker, celery-beat)
- [x] **Dockerfile** - Multi-stage build with Gunicorn
- [x] **django-environ** - Already in requirements.txt and configured in settings
- [x] **Environment variables** - DEBUG, ALLOWED_HOSTS, DATABASE_URL, REDIS_URL all configured
- [x] **Celery** - Settings module fixed for production
- [x] **CORS** - Production-ready with FRONTEND_URL support
- [x] **.gitignore** - Created to exclude secrets and sensitive files
- [x] **Railway CLI** - Installed (version 5.30.1)
- [x] **seed_users command** - Created for initial user seeding from env vars

## 🔐 Environment Variables to Set in Railway Dashboard

**Set these variables for ALL services (web, celery-worker, celery-beat):**

### Required:
```bash
DJANGO_SECRET_KEY=<generate-with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())">
DATABASE_URL=<provided-by-railway-after-adding-postgres-plugin>
REDIS_URL=<provided-by-railway-after-adding-redis-plugin>
DJANGO_ALLOWED_HOSTS=<your-app-name>.up.railway.app,localhost,127.0.0.1
```

### Optional:
```bash
DJANGO_DEBUG=False
FRONTEND_URL=https://your-frontend-domain.com
```

## 🚀 Quick Start Commands

```bash
# 1. Login to Railway
railway login

# 2. Initialize project
railway init

# 3. Add PostgreSQL
railway add -p postgres

# 4. Add Redis
railway add -p redis

# 5. Set environment variables
railway variables set DJANGO_SECRET_KEY="your-secret-key"
railway variables set DJANGO_ALLOWED_HOSTS="your-app.up.railway.app"
railway variables set DJANGO_DEBUG="False"

# 6. Deploy
railway up

# 7. Run migrations (after deployment)
railway shell
python manage.py migrate
python manage.py collectstatic --noinput
exit
```

## 📋 Manual Steps in Railway Dashboard

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub/GitLab/Bitbucket

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo" (or use CLI)
   - Select your repository

3. **Add PostgreSQL Database**
   - Click "+ New" → "Database" → "PostgreSQL"
   - Railway auto-sets `DATABASE_URL`

4. **Add Redis**
   - Click "+ New" → "Database" → "Redis"
   - Railway auto-sets `REDIS_URL`

5. **Set Environment Variables**
   - Click on your service
   - Go to "Variables" tab
   - Add the variables listed above

6. **Deploy**
   - Railway auto-deploys on git push
   - Or click "Deploy" button

7. **Run Migrations**
   - Go to your service
   - Click "Deployments" → "View Logs"
   - Use "Run Command" to execute:
     ```
     python manage.py migrate
     python manage.py collectstatic --noinput
     ```

8. **Verify Deployment**
   - Visit: `https://your-app.up.railway.app/api/health/`
   - Check logs for all 3 services
   - Test API at: `https://your-app.up.railway.app/api/schema/`

## 🔍 Service Configuration

### Web Service
- **Start Command:** `gunicorn delivery_hub.wsgi:application --bind 0.0.0.0:8000 --workers 4`
- **Port:** 8000
- **Health Check:** `/api/health/`
- **Auto-deploy:** Yes

### Celery Worker
- **Start Command:** `celery -A delivery_hub.settings.celery worker --loglevel=info`
- **Auto-deploy:** Yes

### Celery Beat
- **Start Command:** `celery -A delivery_hub.settings.celery beat --loglevel=info`
- **Auto-deploy:** Yes

## ⚠️ Important Notes

1. **Never commit secrets** - All sensitive data is in environment variables
2. **DEBUG must be False** in production (already set in railway.toml)
3. **ALLOWED_HOSTS** must include your Railway domain
4. **Database migrations** must be run after first deployment
5. **Static files** must be collected with `collectstatic`

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection error | Check DATABASE_URL is set, PostgreSQL plugin added |
| Redis connection error | Check REDIS_URL is set, Redis plugin added |
| Celery not working | Verify REDIS_URL accessible, check worker logs |
| Static files 404 | Run `python manage.py collectstatic --noinput` |
| CORS errors | Set FRONTEND_URL env var with your frontend domain |
| 500 error | Check logs with `railway logs`, verify SECRET_KEY is set |

## 📚 Additional Resources

- Full deployment guide: `RAILWAY_DEPLOYMENT.md`
- Railway docs: https://docs.railway.app
- Project README: `README.md`