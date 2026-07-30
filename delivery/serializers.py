from rest_framework import serializers

from .models import DeliveryAttempt


class DeliveryAttemptSerializer(serializers.ModelSerializer):
    """Serializer for DeliveryAttempt model."""

    parcel_tracking_id = serializers.UUIDField(
        source="parcel.tracking_id", read_only=True
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )
    failure_reason_display = serializers.CharField(
        source="get_failure_reason_display", read_only=True, allow_null=True
    )

    class Meta:
        model = DeliveryAttempt
        fields = [
            "id",
            "parcel",
            "parcel_tracking_id",
            "attempt_number",
            "status",
            "status_display",
            "failure_reason",
            "failure_reason_display",
            "attempted_at",
            "notes",
        ]
        read_only_fields = ["id", "attempt_number", "attempted_at"]


class RecordAttemptSerializer(serializers.Serializer):
    """Serializer for recording a delivery attempt."""

    status = serializers.ChoiceField(
        choices=["success", "failed", "reattempt_scheduled"]
    )
    failure_reason = serializers.ChoiceField(
        choices=[
            "customer_unavailable",
            "wrong_address",
            "damaged",
            "reattempt_required",
            "other",
        ],
        required=False,
        allow_null=True,
    )
    notes = serializers.CharField(required=False, allow_blank=True)