from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DeliveryAttemptViewSet

router = DefaultRouter()
router.register(r"attempts", DeliveryAttemptViewSet, basename="attempt")

urlpatterns = [
    path("", include(router.urls)),
]