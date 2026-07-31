from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache

# Create your views here.


def health_check(request):
    """Simple health check endpoint for Docker healthcheck."""
    return JsonResponse({"status": "healthy"}, status=200)
