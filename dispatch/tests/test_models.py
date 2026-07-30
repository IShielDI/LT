import pytest

from accounts.models import User
from parcels.models import Parcel, Zone
from riders.models import Rider
from ..models import Assignment


class TestAssignmentModel:
    """Tests for the Assignment model."""

    def test_create_assignment(self, db, rider_user):
        """Test creating an assignment."""
        zone = Zone.objects.create(
            name="Test Zone",
            pincode_range_start="100000",
            pincode_range_end="199999",
        )
        parcel = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="150000",
            weight=1.0,
            zone=zone,
        )
        rider = Rider.objects.create(
            user=rider_user,
            capacity=10,
            zone=zone,
        )
        assignment = Assignment.objects.create(
            parcel=parcel,
            rider=rider,
        )
        assert assignment.parcel == parcel
        assert assignment.rider == rider
        assert assignment.status == "assigned"
        assert assignment.is_active is True
        assert str(assignment).startswith("Assignment:")

    def test_assignment_status_transitions(self, db, rider_user):
        """Test assignment status changes."""
        parcel = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="150000",
            weight=1.0,
        )
        rider = Rider.objects.create(user=rider_user, capacity=10)
        assignment = Assignment.objects.create(parcel=parcel, rider=rider)

        assert assignment.is_active is True

        assignment.status = "in_transit"
        assignment.save()
        assert assignment.is_active is True

        assignment.status = "delivered"
        assignment.save()
        assert assignment.is_active is False

    def test_assignment_is_active_property(self, db, rider_user):
        """Test the is_active property."""
        parcel = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="150000",
            weight=1.0,
        )
        rider = Rider.objects.create(user=rider_user, capacity=10)
        assignment = Assignment.objects.create(parcel=parcel, rider=rider)

        assert assignment.is_active is True

        assignment.status = "cancelled"
        assert assignment.is_active is False

    def test_assignment_indexes(self, db):
        """Test that required indexes exist."""
        indexes = [idx.fields for idx in Assignment._meta.indexes]
        assert ["parcel", "status"] in indexes
        assert ["rider", "status"] in indexes
        assert ["assigned_at"] in indexes

    def test_assignment_ordering(self, db, rider_user):
        """Test that assignments are ordered by most recent first."""
        parcel1 = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="150000",
            weight=1.0,
        )
        parcel2 = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="150000",
            weight=2.0,
        )
        rider = Rider.objects.create(
            user=User.objects.create_user(
                username="rider2", password="pass", role="rider"
            ),
            capacity=10,
        )
        Assignment.objects.create(parcel=parcel1, rider=rider)
        Assignment.objects.create(parcel=parcel2, rider=rider)

        assignments = Assignment.objects.all()
        assert assignments[0].parcel == parcel2
        assert assignments[1].parcel == parcel1