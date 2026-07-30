"""
URL configuration for delivery_hub project.
"""
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    # API docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    # JWT token endpoints
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # API endpoints
    path("api/auth/", include("accounts.urls")),
    path("api/parcels/", include("parcels.urls")),
    path("api/riders/", include("riders.urls")),
    path("api/dispatch/", include("dispatch.urls")),
    path("api/delivery/", include("delivery.urls")),
    path("api/reports/", include("reports.urls")),
]