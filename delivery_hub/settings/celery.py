import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "delivery_hub.settings")

app = Celery("delivery_hub")

# Load task configuration from Django settings
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all registered Django apps
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    """Debug task to verify Celery is working."""
    print(f"Request: {self.request!r}")


# Celery Beat schedule for periodic tasks
app.conf.beat_schedule = {
    "run-daily-assignment": {
        "task": "dispatch.tasks.run_daily_assignment",
        "schedule": crontab(hour=0, minute=0),  # Run at midnight
    },
}