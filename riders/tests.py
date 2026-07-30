import pytest
from django.core.exceptions import ValidationError

from accounts.models import User
from parcels.models import Zone
from .models import Rider


class TestRiderModel:
    """Tests for the Rider model."""

    def test_create_rider(self, db, rider_user):
        """Test creating a rider profile."""
        zone = Zone.objects.create(
            name="Test Zone",
            pincode_range_start="100000",
            pincode_range_end="199999",
        )
        rider = Rider.objects.create(
            user=rider_user,
            capacity=15,
            zone=zone,
            vehicle_type="bike",
        )
        assert rider.user == rider_user
        assert rider.capacity == 15
        assert rider.current_load == 0
        assert rider.zone == zone
        assert rider.is_available is True
        assert rider.vehicle_type == "bike"
        assert rider.remaining_capacity == 15
        assert rider.is_at_capacity is False

    def test_rider_remaining_capacity(self, db, rider_user):
        """Test remaining capacity calculation."""
        rider = Rider.objects.create(
            user=rider_user,
            capacity=10,
            current_load=4,
        )
        assert rider.remaining_capacity == 6
        assert rider.is_at_capacity is False

    def test_rider_at_capacity(self, db, rider_user):
        """Test rider at full capacity."""
        rider = Rider.objects.create(
            user=rider_user,
            capacity=10,
            current_load=10,
        )
        assert rider.remaining_capacity == 0
        assert rider.is_at_capacity is True

    def test_rider_load_exceeds_capacity_validation(self, db, rider_user):
        """Test that current_load cannot exceed capacity."""
        rider = Rider(
            user=rider_user,
            capacity=10,
            current_load=15,
        )
        with pytest.raises(ValidationError):
            rider.full_clean()

    def test_rider_str_representation(self, db, rider_user):
        """Test the string representation."""
        rider_user.first_name = "John"
        rider_user.last_name = "Doe"
        rider_user.save()
        rider = Rider.objects.create(user=rider_user)
        assert "John Doe" in str(rider)

    def test_rider_zone_assignment(self, db, rider_user):
        """Test rider zone assignment."""
        zone = Zone.objects.create(
            name="North Zone",
            pincode_range_start="100000",
            pincode_range_end="199999",
        )
        rider = Rider.objects.create(user=rider_user, zone=zone)
        assert rider.zone == zone
        assert zone.name in str(rider)

    def test_rider_availability(self, db, rider_user):
        """Test rider availability toggle."""
        rider = Rider.objects.create(user=rider_user, is_available=False)
        assert rider.is_available is False

        rider.is_available = True
        rider.save()
        assert rider.is_available is True

    def test_rider_indexes(self, db):
        """Test that required indexes exist."""
        indexes = [idx.fields for idx in Rider._meta.indexes]
        assert ["is_available"] in indexes
        assert ["zone", "is_available"] in indexes
        assert ["capacity"] in indexes

    def test_rider_vehicle_types(self, db, rider_user):
        """Test different vehicle types."""
        for vehicle in ["bike", "scooter", "car", "van", "truck", "on_foot"]:
            rider = Rider.objects.create(
                user=User.objects.create_user(
                    username=f"rider_{vehicle}",
                    password="pass",
                    role="rider",
                ),
                vehicle_type=vehicle,
            )
            assert rider.vehicle_type == vehicle