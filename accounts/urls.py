from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LoginViewSet, UserViewSet

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")

urlpatterns = [
    path("login/", LoginViewSet.as_view({"post": "create"}), name="login"),
    path("", include(router.urls)),
]