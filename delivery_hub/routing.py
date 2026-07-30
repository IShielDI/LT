from django.urls import path

from delivery_hub.settings.channels import DispatchUpdatesConsumer

websocket_urlpatterns = [
    path("ws/dispatch/", DispatchUpdatesConsumer.as_asgi()),
]