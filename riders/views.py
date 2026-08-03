from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdminOrHubManager, IsRider

from .models import Rider
from .serializers import RiderSerializer


class RiderViewSet(viewsets.ModelViewSet):
    """ViewSet for managing riders."""

    queryset = Rider.objects.select_related("user", "zone").all()
    serializer_class = RiderSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHubManager]

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsRider])
    def me(self, request):
        """Get the current rider's profile."""
        try:
            rider = Rider.objects.select_related("user", "zone").get(user=request.user)
            serializer = self.get_serializer(rider)
            return Response(serializer.data)
        except Rider.DoesNotExist:
            return Response(
                {"detail": "No rider profile found for this user."},
                status=404,
            )
