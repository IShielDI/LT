import pytest

from parcels.models import Parcel
from ..models import DeliveryAttempt


class TestDeliveryAttemptModel:
    """Tests for the DeliveryAttempt model."""

    def test_create_delivery_attempt(self, db):
        """Test creating a delivery attempt."""
        parcel = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="150000",
            weight=1.0,
        )
        attempt = DeliveryAttempt.objects.create(
            parcel=parcel,
            attempt_number=1,
            status="failed",
            failure_reason="customer_unavailable",
            notes="Customer was not home",
        )
        assert attempt.parcel == parcel
        assert attempt.attempt_number == 1
        assert attempt.status == "failed"
        assert attempt.failure_reason == "customer_unavailable"
        assert attempt.notes == "Customer was not home"
        assert attempt.is_final_attempt is False
        assert str(attempt).startswith("Attempt #1 for")

    def test_delivery_attempt_success(self, db):
        """Test a successful delivery attempt."""
        parcel = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="150000",
            weight=1.0,
        )
        attempt = DeliveryAttempt.objects.create(
            parcel=parcel,
            attempt_number=1,
            status="success",
            notes="Delivered to reception",
        )
        assert attempt.status == "success"
        assert attempt.failure_reason is None

    def test_delivery_attempt_max_retries(self, db):
        """Test final attempt detection."""
        parcel = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="150000",
            weight=1.0,
        )
        attempt = DeliveryAttempt.objects.create(
            parcel=parcel,
            attempt_number=3,
            status="failed",
            failure_reason="customer_unavailable",
        )
        assert attempt.is_final_attempt is True

    def test_delivery_attempt_unique_together(self, db):
        """Test that parcel + attempt_number must be unique."""
        parcel = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="150000",
            weight=1.0,
        )
        DeliveryAttempt.objects.create(
            parcel=parcel,
            attempt_number=1,
            status="failed",
        )
        with pytest.raises(Exception):
            DeliveryAttempt.objects.create(
                parcel=parcel,
                attempt_number=1,
                status="failed",
            )

    def test_delivery_attempt_multiple_attempts(self, db):
        """Test multiple delivery attempts for same parcel."""
        parcel = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="150000",
            weight=1.0,
        )
        for i in range(1, 4):
            DeliveryAttempt.objects.create(
                parcel=parcel,
                attempt_number=i,
                status="failed" if i < 3 else "success",
            )
        assert DeliveryAttempt.objects.filter(parcel=parcel).count() == 3

    def test_delivery_attempt_indexes(self, db):
        """Test that required indexes exist."""
        indexes = [idx.fields for idx in DeliveryAttempt._meta.indexes]
        assert ["parcel", "status"] in indexes
        assert ["attempt_number"] in indexes
        assert ["attempted_at"] in indexes

    def test_delivery_attempt_ordering(self, db):
        """Test that attempts are ordered by most recent first."""
        parcel = Parcel.objects.create(
            sender_name="John",
            sender_address="Addr",
            receiver_name="Jane",
            receiver_address="Addr",
            receiver_phone="9876543210",
            pincode="150000",
            weight=1.0,
        )
        DeliveryAttempt.objects.create(parcel=parcel, attempt_number=1, status="failed")
        DeliveryAttempt.objects.create(parcel=parcel, attempt_number=2, status="failed")

        attempts = DeliveryAttempt.objects.all()
        assert attempts[0].attempt_number == 2
        assert attempts[1].attempt_number == 1