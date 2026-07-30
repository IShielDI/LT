import pytest
from django.core.exceptions import ValidationError

from .models import Parcel, Zone


class TestZoneModel:
    """Tests for the Zone model."""

    def test_create_zone(self, db):
        """Test creating a zone."""
        zone = Zone.objects.create(
            name="North Zone",
            pincode_range_start="100000",
            pincode_range_end="199999",
        )
        assert zone.name == "North Zone"
        assert zone.pincode_range_start == "100000"
        assert zone.pincode_range_end == "199999"
        assert str(zone) == "North Zone (100000 - 199999)"

    def test_zone_pincode_validation(self, db):
        """Test that pincode range start must be <= end."""
        zone = Zone(
            name="Invalid Zone",
            pincode_range_start="200000",
            pincode_range_end="100000",
        )
        with pytest.raises(ValidationError):
            zone.full_clean()

    def test_zone_contains_pincode(self, db):
        """Test the contains_pincode method."""
        zone = Zone.objects.create(
            name="Central Zone",
            pincode_range_start="500000",
            pincode_range_end="599999",
        )
        assert zone.contains_pincode("550000") is True
        assert zone.contains_pincode("500000") is True
        assert zone.contains_pincode("599999") is True
        assert zone.contains_pincode("600000") is False
        assert zone.contains_pincode("499999") is False

    def test_zone_unique_name(self, db):
        """Test that zone names must be unique."""
        Zone.objects.create(
            name="Unique Zone",
            pincode_range_start="100000",
            pincode_range_end="199999",
        )
        with pytest.raises(Exception):
            Zone.objects.create(
                name="Unique Zone",
                pincode_range_start="200000",
                pincode_range_end="299999",
            )


class TestParcelModel:
    """Tests for the Parcel model."""

    def test_create_parcel(self, db):
        """Test creating a parcel."""
        parcel = Parcel.objects.create(
            sender_name="John Doe",
            sender_address="123 Main St",
            receiver_name="Jane Smith",
            receiver_address="456 Oak Ave",
            receiver_phone="9876543210",
            pincode="560001",
            weight=2.5,
            priority="standard",
        )
        assert parcel.sender_name == "John Doe"
        assert parcel.receiver_name == "Jane Smith"
        assert parcel.weight == 2.5
        assert parcel.status == "registered"
        assert parcel.priority == "standard"
        assert str(parcel).startswith("Parcel ")
        assert "Registered" in str(parcel)

    def test_parcel_auto_assigns_zone(self, db):
        """Test that parcel auto-assigns zone based on pincode."""
        zone = Zone.objects.create(
            name="Test Zone",
            pincode_range_start="560000",
            pincode_range_end="569999",
        )
        parcel = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="560001",
            weight=1.0,
        )
        assert parcel.zone == zone

    def test_parcel_negative_weight_validation(self, db):
        """Test that negative weight is rejected."""
        parcel = Parcel(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="560001",
            weight=-1.0,
        )
        with pytest.raises(ValidationError):
            parcel.full_clean()

    def test_parcel_invalid_phone_validation(self, db):
        """Test that non-digit phone is rejected."""
        parcel = Parcel(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="abc123",
            pincode="560001",
            weight=1.0,
        )
        with pytest.raises(ValidationError):
            parcel.full_clean()

    def test_parcel_express_priority(self, db):
        """Test creating an express parcel."""
        parcel = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="560001",
            weight=1.0,
            priority="express",
        )
        assert parcel.priority == "express"

    def test_parcel_status_transitions(self, db):
        """Test that status field accepts valid statuses."""
        parcel = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="560001",
            weight=1.0,
        )
        parcel.status = "in_transit"
        parcel.save()
        assert parcel.status == "in_transit"

        parcel.status = "delivered"
        parcel.save()
        assert parcel.status == "delivered"

    def test_parcel_tracking_id_is_uuid(self, db):
        """Test that tracking_id is auto-generated UUID."""
        parcel = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="560001",
            weight=1.0,
        )
        assert parcel.tracking_id is not None
        import uuid
        assert isinstance(parcel.tracking_id, uuid.UUID)

    def test_parcel_indexes(self, db):
        """Test that required indexes exist."""
        indexes = [idx.fields for idx in Parcel._meta.indexes]
        assert ["tracking_id"] in indexes
        assert ["status"] in indexes
        assert ["priority"] in indexes
        assert ["pincode"] in indexes
        assert ["zone", "status"] in indexes
        assert ["created_at"] in indexes