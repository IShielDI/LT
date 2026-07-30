from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsAdminOrHubManager

from .models import Rider
from .serializers import RiderSerializer


class RiderViewSet(viewsets.ModelViewSet):
    """ViewSet for managing riders."""

    queryset = Rider.objects.select_related("user", "zone").all()
    serializer_class = RiderSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHubManager]