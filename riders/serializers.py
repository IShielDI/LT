from rest_framework import serializers

from .models import Rider


class RiderSerializer(serializers.ModelSerializer):
    """Serializer for Rider model."""

    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    zone_name = serializers.CharField(source="zone.name", read_only=True, allow_null=True)
    remaining_capacity = serializers.IntegerField(read_only=True)

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
        ]
        read_only_fields = ["id", "current_load"]

    def validate(self, data):
        if "current_load" in data and "capacity" in data:
            if data["current_load"] > data["capacity"]:
                raise serializers.ValidationError(
                    {"current_load": "Current load cannot exceed capacity."}
                )
        return data