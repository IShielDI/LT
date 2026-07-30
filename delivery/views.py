from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdminOrHubManager
from parcels.models import Parcel

from .models import DeliveryAttempt
from .serializers import DeliveryAttemptSerializer, RecordAttemptSerializer
from .services import ExceptionHandlingService, InvalidStatusTransitionError


class DeliveryAttemptViewSet(viewsets.ModelViewSet):
    """ViewSet for managing delivery attempts."""

    queryset = DeliveryAttempt.objects.select_related("parcel").all()
    serializer_class = DeliveryAttemptSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHubManager]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin or user.is_hub_manager:
            return DeliveryAttempt.objects.select_related("parcel").all()

        if user.is_rider:
            rider = getattr(user, "rider_profile", None)
            if rider:
                return DeliveryAttempt.objects.filter(
                    parcel__assignments__rider=rider
                ).select_related("parcel").distinct()

        return DeliveryAttempt.objects.none()

    @action(detail=False, methods=["post"])
    def record_attempt(self, request):
        """
        Record a delivery attempt for a parcel.
        Uses ExceptionHandlingService to process the attempt.
        """
        serializer = RecordAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        parcel_id = request.data.get("parcel")
        if not parcel_id:
            return Response(
                {"error": "parcel field is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            parcel = Parcel.objects.get(pk=parcel_id)
        except Parcel.DoesNotExist:
            return Response(
                {"error": "Parcel not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        service = ExceptionHandlingService()
        try:
            attempt = service.record_attempt(
                parcel=parcel,
                status=serializer.validated_data["status"],
                failure_reason=serializer.validated_data.get("failure_reason"),
                notes=serializer.validated_data.get("notes", ""),
            )
        except InvalidStatusTransitionError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            DeliveryAttemptSerializer(attempt).data,
            status=status.HTTP_201_CREATED,
        )