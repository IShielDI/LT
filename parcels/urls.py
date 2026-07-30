from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ParcelViewSet, ZoneViewSet

router = DefaultRouter()
router.register(r"zones", ZoneViewSet, basename="zone")
router.register(r"parcels", ParcelViewSet, basename="parcel")

urlpatterns = [
    path("", include(router.urls)),
]