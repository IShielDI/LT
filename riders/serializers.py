from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from delivery.models import AttemptStatus, DeliveryAttempt
from dispatch.models import Assignment, AssignmentStatus

from .models import Rider


class RiderSerializer(serializers.ModelSerializer):
    """Serializer for Rider model."""

    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    zone_name = serializers.CharField(source="zone.name", read_only=True, allow_null=True)
    remaining_capacity = serializers.IntegerField(read_only=True)
    performance = serializers.SerializerMethodField()
    assigned_parcels = serializers.SerializerMethodField()

    class Meta:
        model = Rider
        fields = [
            "id",
            "user",
            "user_name",
            "username",
            "capacity",
            "current_load",
            "remaining_capacity",
            "zone",
            "zone_name",
            "is_available",
            "vehicle_type",
            "performance",
            "assigned_parcels",
        ]
        read_only_fields = ["id", "current_load"]

    def get_performance(self, obj):
        """Compute real performance stats from DeliveryAttempt data."""
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())

        # All delivery attempts for parcels assigned to this rider
        attempts = DeliveryAttempt.objects.filter(
            parcel__assignments__rider=obj
        )

        total_attempts = attempts.count()
        delivered = attempts.filter(status=AttemptStatus.SUCCESS).count()
        failed = attempts.filter(status=AttemptStatus.FAILED).count()
        reattempted = attempts.filter(status=AttemptStatus.REATTEMPT_SCHEDULED).count()

        # Success rate: delivered / total attempts
        success_rate = round((delivered / total_attempts) * 100, 1) if total_attempts else 0.0

        # Average delivery time: time from assignment to successful delivery
        delivered_assignments = Assignment.objects.filter(
            rider=obj,
            status=AssignmentStatus.DELIVERED,
        )
        avg_delivery_seconds = 0.0
        if delivered_assignments.exists():
            total_seconds = 0
            count = 0
            for assignment in delivered_assignments:
                # Use the delivery attempt time as the completion time
                success_attempt = DeliveryAttempt.objects.filter(
                    parcel=assignment.parcel,
                    status=AttemptStatus.SUCCESS,
                ).order_by("-attempted_at").first()
                if success_attempt:
                    total_seconds += (
                        success_attempt.attempted_at - assignment.assigned_at
                    ).total_seconds()
                    count += 1
            if count:
                avg_delivery_seconds = total_seconds / count

        avg_delivery_minutes = round(avg_delivery_seconds / 60, 1) if avg_delivery_seconds else 0.0

        # Deliveries today / this week
        delivered_today = attempts.filter(
            status=AttemptStatus.SUCCESS,
            attempted_at__gte=today_start,
        ).count()
        delivered_this_week = attempts.filter(
            status=AttemptStatus.SUCCESS,
            attempted_at__gte=week_start,
        ).count()

        # Failure rate for flagging
        failure_rate = round((failed / total_attempts) * 100, 1) if total_attempts else 0.0

        return {
            "total_deliveries": delivered,
            "total_attempts": total_attempts,
            "failed": failed,
            "reattempted": reattempted,
            "success_rate": success_rate,
            "failure_rate": failure_rate,
            "avg_delivery_minutes": avg_delivery_minutes,
            "delivered_today": delivered_today,
            "delivered_this_week": delivered_this_week,
        }

    def get_assigned_parcels(self, obj):
        """Return parcels currently assigned to this rider."""
        parcels = obj.assignments.filter(
            status__in=[AssignmentStatus.ASSIGNED, AssignmentStatus.IN_TRANSIT]
        ).select_related("parcel__zone").values(
            "parcel__tracking_id",
            "parcel__receiver_name",
            "parcel__pincode",
            "parcel__zone__name",
            "parcel__priority",
            "parcel__status",
            "parcel__created_at",
        )
        return [
            {
                "tracking_id": str(p["parcel__tracking_id"]),
                "receiver_name": p["parcel__receiver_name"],
                "pincode": p["parcel__pincode"],
                "zone_name": p["parcel__zone__name"],
                "priority": p["parcel__priority"],
                "status": p["parcel__status"],
                "created_at": p["parcel__created_at"],
            }
            for p in parcels
        ]

    def validate(self, data):
        if "current_load" in data and "capacity" in data:
            if data["current_load"] > data["capacity"]:
                raise serializers.ValidationError(
                    {"current_load": "Current load cannot exceed capacity."}
                )
        return data