"""
Local development settings.
Overrides base settings for local development.
"""
from .base import *  # noqa: F401, F403, F811

# Override DEBUG for local development
DEBUG = True

# Use SQLite for local development by default
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Disable HTTPS redirect for local dev
SECURE_SSL_REDIRECT = False

# Console email backend for development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"