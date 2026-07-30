from rest_framework import serializers

from .models import Assignment


class AssignmentSerializer(serializers.ModelSerializer):
    """Serializer for Assignment model."""

    parcel_tracking_id = serializers.UUIDField(
        source="parcel.tracking_id", read_only=True
    )
    rider_name = serializers.CharField(
        source="rider.user.get_full_name", read_only=True
    )
    rider_username = serializers.CharField(
        source="rider.user.username", read_only=True
    )

    class Meta:
        model = Assignment
        fields = [
            "id",
            "parcel",
            "parcel_tracking_id",
            "rider",
            "rider_name",
            "rider_username",
            "assigned_at",
            "status",
        ]
        read_only_fields = ["id", "assigned_at"]


class AssignmentRunSerializer(serializers.Serializer):
    """Serializer for the assignment run result."""

    assigned = serializers.ListField(child=serializers.DictField())
    unassigned = serializers.ListField(child=serializers.DictField())