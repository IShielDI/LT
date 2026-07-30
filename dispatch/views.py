from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdminOrHubManager
from delivery.services import InvalidStatusTransitionError
from parcels.models import ParcelStatus

from .models import Assignment
from .serializers import AssignmentRunSerializer, AssignmentSerializer
from .services import RiderAssignmentEngine


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
        """
        engine = RiderAssignmentEngine()
        result = engine.run()

        serializer = AssignmentRunSerializer(data=result)
        serializer.is_valid(raise_exception=True)

        return Response(serializer.validated_data)

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