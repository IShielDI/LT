from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdminOrHubManager
from delivery.services import InvalidStatusTransitionError
from parcels.models import Parcel, ParcelStatus
from riders.models import Rider

from .models import Assignment, AssignmentStatus
from .serializers import AssignmentRunSerializer, AssignmentSerializer
from .services import RiderAssignmentEngine
from .tasks import run_assignment_task


class AssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing parcel-to-rider assignments."""

    queryset = Assignment.objects.select_related(
        "parcel", "rider__user"
    ).all()
    serializer_class = AssignmentSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHubManager]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin or user.is_hub_manager:
            return Assignment.objects.select_related(
                "parcel", "rider__user"
            ).all()

        if user.is_rider:
            rider = getattr(user, "rider_profile", None)
            if rider:
                return Assignment.objects.filter(
                    rider=rider
                ).select_related("parcel", "rider__user")

        return Assignment.objects.none()

    @action(detail=False, methods=["post"])
    def run_assignment(self, request):
        """
        Trigger the RiderAssignmentEngine and return results.

        Honors the USE_CELERY setting: when Celery is enabled the assignment
        runs as a background task; otherwise it runs synchronously.
        """
        result = run_assignment_task()

        serializer = AssignmentRunSerializer(data=result)
        serializer.is_valid(raise_exception=True)

        return Response(serializer.validated_data)

    @action(detail=False, methods=["post"])
    def manual_assign(self, request):
        """
        Manually assign a specific parcel to a specific rider.
        Validates that the rider's zone matches the parcel's zone and that
        the rider has remaining capacity.
        """
        parcel_id = request.data.get("parcel")
        rider_id = request.data.get("rider")

        if not parcel_id or not rider_id:
            return Response(
                {"error": "Both 'parcel' and 'rider' fields are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            parcel = Parcel.objects.get(pk=parcel_id)
        except Parcel.DoesNotExist:
            return Response(
                {"error": "Parcel not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            rider = Rider.objects.select_related("user", "zone").get(pk=rider_id)
        except Rider.DoesNotExist:
            return Response(
                {"error": "Rider not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate parcel is in an assignable state
        if parcel.status not in ("registered", "sorted"):
            return Response(
                {"error": f"Parcel is in status '{parcel.status}' — only 'registered' or 'sorted' parcels can be assigned."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate rider is available
        if not rider.is_available:
            return Response(
                {"error": f"Rider '{rider}' is not available for assignment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate rider has remaining capacity
        if rider.remaining_capacity <= 0:
            return Response(
                {"error": f"Rider '{rider}' has reached maximum capacity."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate zone match (if both have zones)
        if parcel.zone and rider.zone and parcel.zone != rider.zone:
            return Response(
                {"error": f"Zone mismatch: parcel is in '{parcel.zone.name}' but rider is in '{rider.zone.name}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create the assignment
        assignment = Assignment.objects.create(
            parcel=parcel,
            rider=rider,
            status=AssignmentStatus.ASSIGNED,
        )

        # Update rider's current load
        from django.db.models import F
        Rider.objects.filter(pk=rider.pk).update(current_load=F("current_load") + 1)

        # Update parcel status
        parcel.status = ParcelStatus.ASSIGNED
        parcel.save(update_fields=["status"])

        return Response(AssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def mark_in_transit(self, request, pk=None):
        """Mark an assignment as in transit."""
        assignment = self.get_object()
        if assignment.status != "assigned":
            return Response(
                {"error": f"Cannot mark '{assignment.status}' as in transit"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        assignment.status = "in_transit"
        assignment.save(update_fields=["status"])

        # Also update parcel status
        assignment.parcel.status = ParcelStatus.IN_TRANSIT
        assignment.parcel.save(update_fields=["status"])

        return Response(AssignmentSerializer(assignment).data)

    @action(detail=True, methods=["post"])
    def mark_delivered(self, request, pk=None):
        """Mark an assignment as delivered."""
        assignment = self.get_object()
        if assignment.status not in ("assigned", "in_transit"):
            return Response(
                {"error": f"Cannot deliver assignment in status '{assignment.status}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        assignment.status = "delivered"
        assignment.save(update_fields=["status"])

        # Also update parcel status
        assignment.parcel.status = ParcelStatus.DELIVERED
        assignment.parcel.save(update_fields=["status"])

        return Response(AssignmentSerializer(assignment).data)