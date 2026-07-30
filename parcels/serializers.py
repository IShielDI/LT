from rest_framework import serializers

from .models import Parcel, Zone


class ZoneSerializer(serializers.ModelSerializer):
    """Serializer for Zone model."""

    class Meta:
        model = Zone
        fields = "__all__"


class ParcelListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for parcel list views."""

    zone_name = serializers.CharField(source="zone.name", read_only=True, allow_null=True)

    class Meta:
        model = Parcel
        fields = [
            "tracking_id",
            "sender_name",
            "receiver_name",
            "receiver_phone",
            "pincode",
            "zone_name",
            "priority",
            "weight",
            "status",
            "created_at",
        ]
        read_only_fields = ["tracking_id", "created_at", "updated_at"]


class ParcelDetailSerializer(serializers.ModelSerializer):
    """Full serializer for parcel detail views."""

    zone_name = serializers.CharField(source="zone.name", read_only=True, allow_null=True)

    class Meta:
        model = Parcel
        fields = [
            "tracking_id",
            "sender_name",
            "sender_address",
            "receiver_name",
            "receiver_address",
            "receiver_phone",
            "pincode",
            "zone",
            "zone_name",
            "priority",
            "weight",
            "status",
            "qr_code",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["tracking_id", "qr_code", "created_at", "updated_at"]

    def validate_weight(self, value):
        if value < 0:
            raise serializers.ValidationError("Weight cannot be negative.")
        return value

    def validate_receiver_phone(self, value):
        if value and not value.isdigit():
            raise serializers.ValidationError("Phone number must contain only digits.")
        return value


class ParcelTrackingSerializer(serializers.ModelSerializer):
    """Public serializer for customer tracking page (no auth required)."""

    zone_name = serializers.CharField(source="zone.name", read_only=True, allow_null=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)

    class Meta:
        model = Parcel
        fields = [
            "tracking_id",
            "sender_name",
            "receiver_name",
            "pincode",
            "zone_name",
            "priority",
            "priority_display",
            "weight",
            "status",
            "status_display",
            "created_at",
            "updated_at",
        ]