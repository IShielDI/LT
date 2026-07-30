# Railway Deployment - Quick Start

## 🎯 What's Been Configured

Your Django project is now ready for Railway deployment with:

✅ **3 Services Defined:**
- **web** - Django app (Gunicorn on port 8000)
- **celery-worker** - Background task processor
- **celery-beat** - Scheduled task runner

✅ **Environment Variables:**
- `DJANGO_SECRET_KEY` - Django cryptographic key
- `DATABASE_URL` - PostgreSQL connection (auto-set by Railway)
- `REDIS_URL` - Redis connection (auto-set by Railway)
- `DJANGO_DEBUG` - Set to `False` for production
- `DJANGO_ALLOWED_HOSTS` - Your Railway domain
- `FRONTEND_URL` - Optional, for CORS

✅ **Settings Updated:**
- django-environ configured in `delivery_hub/settings/base.py`
- Celery module fixed: `delivery_hub.settings.celery`
- CORS supports production frontend URL
- DEBUG=False and ALLOWED_HOSTS from env vars

✅ **Files Created:**
- `.gitignore` - Excludes secrets and sensitive files
- `RAILWAY_DEPLOYMENT.md` - Full deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- `railway.toml` - Railway service configuration

## 🔐 Environment Variables You MUST Set

**⚠️ Set these in Railway Dashboard (Variables tab) for ALL services:**

### 1. DJANGO_SECRET_KEY (REQUIRED)
```bash
# Generate a secure key:
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Then set in Railway:
DJANGO_SECRET_KEY=<paste-generated-key-here>
```

### 2. DATABASE_URL (REQUIRED - Auto-provided)
```bash
# This is automatically set when you add PostgreSQL plugin
# Format: postgres://username:password@host:port/database
```

### 3. REDIS_URL (REQUIRED - Auto-provided)
```bash
# This is automatically set when you add Redis plugin
# Format: redis://username:password@host:port/db
```

### 4. DJANGO_ALLOWED_HOSTS (REQUIRED)
```bash
# Replace with your actual Railway app domain
DJANGO_ALLOWED_HOSTS=your-app-name.up.railway.app,localhost,127.0.0.1
```

### 5. DJANGO_DEBUG (Optional - Already set to False)
```bash
DJANGO_DEBUG=False
```

### 6. FRONTEND_URL (Optional)
```bash
# Add if you have a separate frontend deployment
FRONTEND_URL=https://your-frontend.vercel.app
```

## 🚀 5-Minute Deployment

### Option A: Using Railway CLI (Fastest)

```bash
# 1. Login
railway login

# 2. Initialize project
railway init

# 3. Add PostgreSQL
railway add -p postgres

# 4. Add Redis
railway add -p redis

# 5. Set required env vars
railway variables set DJANGO_SECRET_KEY="your-generated-key"
railway variables set DJANGO_ALLOWED_HOSTS="your-app.up.railway.app"

# 6. Deploy
railway up

# 7. Run migrations (after deployment completes)
railway shell
python manage.py migrate
python manage.py collectstatic --noinput
exit
```

### Option B: Using Railway Dashboard (Visual)

1. **Go to** https://railway.app/dashboard
2. **Create Project** → "New Project" → "Deploy from GitHub"
3. **Add PostgreSQL** → "+ New" → "Database" → "PostgreSQL"
4. **Add Redis** → "+ New" → "Database" → "Redis"
5. **Set Variables** → Click service → "Variables" tab → Add the 4 required vars above
6. **Deploy** → Railway auto-deploys from your repo
7. **Run Migrations** → "Deployments" → "View Logs" → "Run Command":
   ```bash
   python manage.py migrate && python manage.py collectstatic --noinput
   ```

## ✅ Verify Deployment

After deployment, check these:

1. **Health Check:**
   ```
   https://your-app.up.railway.app/api/health/
   ```
   Should return 200 OK

2. **API Documentation:**
   ```
   https://your-app.up.railway.app/api/schema/
   ```
   Should show Swagger/OpenAPI docs

3. **Admin Interface:**
   ```
   https://your-app.up.railway.app/admin/
   ```
   Should show Django admin login

4. **Check Logs:**
   ```bash
   railway logs
   ```
   Look for:
   - [web] "Starting Gunicorn"
   - [celery-worker] "ready"
   - [celery-beat] "Scheduler started"

## 📋 What Each Service Does

| Service | Command | Purpose |
|---------|---------|---------|
| **web** | `gunicorn delivery_hub.wsgi:application --bind 0.0.0.0:8000 --workers 4` | Serves Django API |
| **celery-worker** | `celery -A delivery_hub.settings.celery worker --loglevel=info` | Processes background tasks |
| **celery-beat** | `celery -A delivery_hub.settings.celery beat --loglevel=info` | Runs scheduled tasks (daily at midnight) |

## 🆘 Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| **Database connection error** | Verify PostgreSQL plugin added, DATABASE_URL set |
| **Redis connection error** | Verify Redis plugin added, REDIS_URL set |
| **Celery not starting** | Check REDIS_URL is set for all services |
| **Static files 404** | Run `python manage.py collectstatic --noinput` |
| **CORS error** | Set FRONTEND_URL with your frontend domain |
| **500 Internal Server Error** | Check `railway logs`, verify SECRET_KEY is set |
| **ALLOWED_HOSTS error** | Add your Railway domain to DJANGO_ALLOWED_HOSTS |

## 📚 Documentation

- **Full Guide:** `RAILWAY_DEPLOYMENT.md`
- **Checklist:** `DEPLOYMENT_CHECKLIST.md`
- **This File:** `QUICK_START.md`

## 🎓 Next Steps After Deployment

1. ✅ Backend is live on Railway
2. Deploy frontend to Vercel/Netlify
3. Update `FRONTEND_URL` environment variable
4. Seed initial users (optional but recommended):
   ```bash
   # Set these environment variables in Railway dashboard first:
   # ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL
   # HUB_MANAGER_USERNAME, HUB_MANAGER_PASSWORD, HUB_MANAGER_EMAIL
   # RIDER_USERNAME, RIDER_PASSWORD, RIDER_EMAIL
   
   railway shell
   python manage.py seed_users
   exit
   ```
5. Test all API endpoints
6. Set up custom domain (optional)
7. Configure monitoring alerts

## 💡 Pro Tips

- **Auto-deploy:** Connect your GitHub repo for automatic deployments on push
- **Preview apps:** Railway creates preview deployments for PRs
- **Rollback:** Easy one-click rollback in Railway dashboard
- **Logs:** Use `railway logs` to debug issues
- **Shell:** Use `railway shell` for Django management commands

## 🔗 Useful Links

- Railway Dashboard: https://railway.app/dashboard
- Railway Docs: https://docs.railway.app
- Your App: `https://your-app.up.railway.app`
- API Docs: `https://your-app.up.railway.app/api/schema/`
- Admin: `https://your-app.up.railway.app/admin/`

---

**Need Help?** Check `RAILWAY_DEPLOYMENT.md` for detailed troubleshooting.