import os

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.db import connection
from django.core.cache import cache


def health_check(request):
    """Simple health check endpoint for Docker healthcheck."""
    return JsonResponse({"status": "healthy"}, status=200)


def spa_serve(request):
    """
    Serve the React SPA's built index.html for any non-API, non-admin route.

    This enables React Router's client-side routing so that paths like
    /dashboard, /parcels, /riders, etc. all serve the same index.html and
    let React Router handle the client-side route.

    The index.html file is expected to be in STATIC_ROOT (the staticfiles/
    directory), where build.sh copies it from the built frontend.
    """
    index_path = os.path.join(settings.STATIC_ROOT, "index.html")
    try:
        with open(index_path, "rb") as f:
            return HttpResponse(f.read(), content_type="text/html")
    except FileNotFoundError:
        return HttpResponse(
            "Frontend not built. Run `npm run build` in the frontend/ directory.",
            status=501,
        )