import pytest

from parcels.models import Parcel, ParcelStatus, Zone
from ..models import DeliveryAttempt
from ..services import (
    ExceptionHandlingService,
    InvalidStatusTransitionError,
)


@pytest.fixture
def parcel(db):
    return Parcel.objects.create(
        sender_name="John",
        sender_address="Addr",
        receiver_name="Jane",
        receiver_address="Addr",
        receiver_phone="9876543210",
        pincode="150000",
        weight=1.0,
        status=ParcelStatus.IN_TRANSIT,
    )


class TestExceptionHandlingService:
    """Tests for the ExceptionHandlingService."""

    def test_successful_delivery(self, db, parcel):
        """Test recording a successful delivery."""
        service = ExceptionHandlingService()
        attempt = service.record_attempt(
            parcel=parcel,
            status="success",
            notes="Delivered to reception",
        )

        assert attempt.status == "success"
        assert attempt.attempt_number == 1
        assert attempt.failure_reason is None

        parcel.refresh_from_db()
        assert parcel.status == ParcelStatus.DELIVERED

    def test_failed_delivery_schedules_reattempt(self, db, parcel):
        """Test that a failed delivery schedules a reattempt."""
        service = ExceptionHandlingService()
        attempt = service.record_attempt(
            parcel=parcel,
            status="failed",
            failure_reason="customer_unavailable",
            notes="Customer not home",
        )

        assert attempt.status == "failed"
        assert attempt.attempt_number == 1
        assert attempt.failure_reason == "customer_unavailable"

        parcel.refresh_from_db()
        assert parcel.status == ParcelStatus.REATTEMPT_SCHEDULED

    def test_max_retries_exhausted(self, db, parcel):
        """Test that parcel is permanently failed after max retries."""
        service = ExceptionHandlingService()

        # First attempt - fails, schedules reattempt
        service.record_attempt(
            parcel=parcel, status="failed",
            failure_reason="customer_unavailable",
        )

        # Second attempt - fails, schedules reattempt
        parcel.status = ParcelStatus.IN_TRANSIT
        parcel.save()
        service.record_attempt(
            parcel=parcel, status="failed",
            failure_reason="customer_unavailable",
        )

        # Third attempt - fails, permanently failed
        parcel.status = ParcelStatus.IN_TRANSIT
        parcel.save()
        attempt = service.record_attempt(
            parcel=parcel, status="failed",
            failure_reason="customer_unavailable",
        )

        assert attempt.attempt_number == 3
        assert attempt.is_final_attempt is True

        parcel.refresh_from_db()
        assert parcel.status == ParcelStatus.FAILED

    def test_invalid_status_transition(self, db, parcel):
        """Test that invalid transitions raise an error."""
        service = ExceptionHandlingService()

        # Parcel is IN_TRANSIT, trying to go back to REGISTERED should fail
        with pytest.raises(InvalidStatusTransitionError) as exc_info:
            service.validate_transition(parcel, ParcelStatus.REGISTERED)

        assert "in_transit" in str(exc_info.value)
        assert "registered" in str(exc_info.value)

    def test_attempt_exceeds_max(self, db, parcel):
        """Test that attempting beyond max retries raises error."""
        service = ExceptionHandlingService()

        # Create 3 attempts manually
        for i in range(1, 4):
            DeliveryAttempt.objects.create(
                parcel=parcel,
                attempt_number=i,
                status="failed",
                failure_reason="customer_unavailable",
            )

        # Mark parcel as failed
        parcel.status = ParcelStatus.FAILED
        parcel.save()

        # Trying to record another attempt should fail
        with pytest.raises(InvalidStatusTransitionError) as exc_info:
            service.record_attempt(
                parcel=parcel, status="failed",
                failure_reason="customer_unavailable",
            )

        assert "exhausted" in str(exc_info.value).lower()

    def test_can_reattempt(self, db, parcel):
        """Test the can_reattempt method."""
        service = ExceptionHandlingService()

        assert service.can_reattempt(parcel) is True

        # After 3 attempts, can't reattempt
        for i in range(1, 4):
            DeliveryAttempt.objects.create(
                parcel=parcel,
                attempt_number=i,
                status="failed",
            )

        assert service.can_reattempt(parcel) is False

    def test_get_attempts_for_parcel(self, db, parcel):
        """Test retrieving attempts for a parcel."""
        service = ExceptionHandlingService()

        service.record_attempt(
            parcel=parcel, status="failed",
            failure_reason="customer_unavailable",
        )

        parcel.status = ParcelStatus.IN_TRANSIT
        parcel.save()

        service.record_attempt(
            parcel=parcel, status="success",
            notes="Delivered",
        )

        attempts = service.get_attempts_for_parcel(parcel)
        assert len(attempts) == 2
        # Most recent first
        assert attempts[0].status == "success"

    def test_reattempt_scheduled_status(self, db, parcel):
        """Test recording a reattempt_scheduled status."""
        service = ExceptionHandlingService()
        attempt = service.record_attempt(
            parcel=parcel,
            status="reattempt_scheduled",
            failure_reason="customer_unavailable",
        )

        assert attempt.status == "reattempt_scheduled"
        parcel.refresh_from_db()
        assert parcel.status == ParcelStatus.REATTEMPT_SCHEDULED

    def test_delivered_is_terminal(self, db, parcel):
        """Test that delivered is a terminal state."""
        service = ExceptionHandlingService()

        # Deliver the parcel
        service.record_attempt(parcel=parcel, status="success")
        parcel.refresh_from_db()
        assert parcel.status == ParcelStatus.DELIVERED

        # Can't transition from DELIVERED
        with pytest.raises(InvalidStatusTransitionError):
            service.validate_transition(parcel, ParcelStatus.IN_TRANSIT)

    def test_failed_is_terminal(self, db, parcel):
        """Test that failed is a terminal state."""
        service = ExceptionHandlingService()

        # Force parcel to failed state
        parcel.status = ParcelStatus.FAILED
        parcel.save()

        # Can't transition from FAILED
        with pytest.raises(InvalidStatusTransitionError):
            service.validate_transition(parcel, ParcelStatus.IN_TRANSIT)