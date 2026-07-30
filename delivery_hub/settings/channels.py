import json
import logging

from asgiref.sync import async_to_sync
from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger("delivery_hub.channels")


class DispatchUpdatesConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time dispatch board updates.
    Broadcasts parcel status changes and new assignments to all connected clients.
    """

    async def connect(self):
        """Accept connection and join the dispatch-updates group."""
        self.group_name = "dispatch-updates"

        # Join the group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info("WebSocket client connected to dispatch-updates")

    async def disconnect(self, close_code):
        """Leave the dispatch-updates group."""
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info("WebSocket client disconnected from dispatch-updates")

    async def receive_json(self, content):
        """
        Receive message from WebSocket client.
        Currently just echoes back for heartbeat/ping.
        """
        message_type = content.get("type")
        if message_type == "ping":
            await self.send_json({"type": "pong"})

    async def parcel_status_update(self, event):
        """
        Send parcel status update to WebSocket client.
        Triggered by group_send from views.
        """
        await self.send_json(
            {
                "type": "parcel_status_update",
                "data": event["data"],
            }
        )

    async def new_assignment(self, event):
        """
        Send new assignment notification to WebSocket client.
        Triggered by group_send from views.
        """
        await self.send_json(
            {
                "type": "new_assignment",
                "data": event["data"],
            }
        )


def broadcast_parcel_status_update(parcel_id: int, status: str, tracking_id: str):
    """
    Helper function to broadcast parcel status updates to all connected clients.
    Call this from views when a parcel status changes.
    """
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            "dispatch-updates",
            {
                "type": "parcel_status_update",
                "data": {
                    "parcel_id": parcel_id,
                    "tracking_id": str(tracking_id),
                    "status": status,
                },
            },
        )


def broadcast_new_assignment(assignment_id: int, parcel_tracking_id: str, rider_name: str):
    """
    Helper function to broadcast new assignment notifications.
    Call this from views when a new assignment is created.
    """
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            "dispatch-updates",
            {
                "type": "new_assignment",
                "data": {
                    "assignment_id": assignment_id,
                    "parcel_tracking_id": str(parcel_tracking_id),
                    "rider_name": rider_name,
                },
            },
        )