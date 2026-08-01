import logging
from typing import Optional

from django.db import transaction

from parcels.models import Parcel, ParcelStatus, ParcelStatusHistory

from .models import AttemptStatus, DeliveryAttempt, FailureReason

logger = logging.getLogger("delivery_hub.delivery.services")


class InvalidStatusTransitionError(Exception):
    """Raised when an invalid parcel status transition is attempted."""

    def __init__(self, current_status: str, attempted_status: str, message: str = ""):
        self.current_status = current_status
        self.attempted_status = attempted_status
        self.message = message or (
            f"Invalid status transition from '{current_status}' "
            f"to '{attempted_status}'"
        )
        super().__init__(self.message)


# Valid status transitions for parcels
VALID_TRANSITIONS = {
    ParcelStatus.REGISTERED: [ParcelStatus.SORTED, ParcelStatus.ASSIGNED],
    ParcelStatus.SORTED: [ParcelStatus.ASSIGNED],
    ParcelStatus.ASSIGNED: [ParcelStatus.IN_TRANSIT, ParcelStatus.FAILED],
    ParcelStatus.IN_TRANSIT: [
        ParcelStatus.DELIVERED,
        ParcelStatus.FAILED,
        ParcelStatus.REATTEMPT_SCHEDULED,
    ],
    ParcelStatus.REATTEMPT_SCHEDULED: [ParcelStatus.IN_TRANSIT, ParcelStatus.FAILED],
    ParcelStatus.DELIVERED: [],  # Terminal state
    ParcelStatus.FAILED: [],  # Terminal state
}


class ExceptionHandlingService:
    """
    Processes failed delivery attempts with configurable retry logic.

    Business rules:
    - Records the failure reason and increments attempt_number
    - Max 3 attempts per parcel before permanent failure
    - Guards valid status transitions (raises InvalidStatusTransitionError)
    - Schedules reattempt or marks as permanently failed
    """

    MAX_ATTEMPTS = 3

    def validate_transition(
        self, parcel: Parcel, new_status: str
    ) -> None:
        """
        Validate that the status transition is allowed.

        Raises InvalidStatusTransitionError if the transition is invalid.
        """
        allowed = VALID_TRANSITIONS.get(parcel.status, [])
        if new_status not in allowed:
            raise InvalidStatusTransitionError(
                current_status=parcel.status,
                attempted_status=new_status,
            )

    def record_attempt(
        self,
        parcel: Parcel,
        status: str,
        failure_reason: Optional[str] = None,
        notes: str = "",
    ) -> DeliveryAttempt:
        """
        Record a delivery attempt and update parcel status accordingly.

        Args:
            parcel: The parcel being delivered
            status: 'success', 'failed', or 'reattempt_scheduled'
            failure_reason: Reason for failure (required if status is 'failed')
            notes: Additional notes about the attempt

        Returns:
            The created DeliveryAttempt

        Raises:
            InvalidStatusTransitionError: If the status transition is invalid
        """
        # Determine the next attempt number
        last_attempt = (
            DeliveryAttempt.objects.filter(parcel=parcel)
            .order_by("-attempt_number")
            .first()
        )
        attempt_number = (last_attempt.attempt_number + 1) if last_attempt else 1

        if attempt_number > self.MAX_ATTEMPTS:
            raise InvalidStatusTransitionError(
                current_status=parcel.status,
                attempted_status=status,
                message=(
                    f"Parcel {parcel.tracking_id} has already exhausted "
                    f"all {self.MAX_ATTEMPTS} delivery attempts"
                ),
            )

        with transaction.atomic():
            # Create the delivery attempt record
            attempt = DeliveryAttempt.objects.create(
                parcel=parcel,
                attempt_number=attempt_number,
                status=status,
                failure_reason=failure_reason,
                notes=notes,
            )

            # Update parcel status based on attempt outcome
            if status == AttemptStatus.SUCCESS:
                self.validate_transition(parcel, ParcelStatus.DELIVERED)
                parcel.status = ParcelStatus.DELIVERED
                parcel.save(update_fields=["status"])
                ParcelStatusHistory.record(
                    parcel=parcel,
                    status=ParcelStatus.DELIVERED,
                    notes=f"Delivered on attempt #{attempt_number}",
                )

            elif status == AttemptStatus.FAILED:
                if attempt_number >= self.MAX_ATTEMPTS:
                    # Exhausted all retries - mark as permanently failed
                    self.validate_transition(parcel, ParcelStatus.FAILED)
                    parcel.status = ParcelStatus.FAILED
                    parcel.save(update_fields=["status"])
                    ParcelStatusHistory.record(
                        parcel=parcel,
                        status=ParcelStatus.FAILED,
                        notes=f"Permanently failed after {attempt_number} attempts. Reason: {failure_reason or 'unknown'}",
                    )
                    logger.info(
                        "Parcel %s permanently failed after %d attempts",
                        parcel.tracking_id,
                        attempt_number,
                    )
                else:
                    # Schedule a reattempt
                    self.validate_transition(
                        parcel, ParcelStatus.REATTEMPT_SCHEDULED
                    )
                    parcel.status = ParcelStatus.REATTEMPT_SCHEDULED
                    parcel.save(update_fields=["status"])
                    ParcelStatusHistory.record(
                        parcel=parcel,
                        status=ParcelStatus.REATTEMPT_SCHEDULED,
                        notes=f"Attempt #{attempt_number} failed ({failure_reason or 'unknown'}). Reattempt #{attempt_number + 1} scheduled.",
                    )
                    logger.info(
                        "Parcel %s scheduled for reattempt #%d",
                        parcel.tracking_id,
                        attempt_number + 1,
                    )

            elif status == AttemptStatus.REATTEMPT_SCHEDULED:
                self.validate_transition(parcel, ParcelStatus.REATTEMPT_SCHEDULED)
                parcel.status = ParcelStatus.REATTEMPT_SCHEDULED
                parcel.save(update_fields=["status"])
                ParcelStatusHistory.record(
                    parcel=parcel,
                    status=ParcelStatus.REATTEMPT_SCHEDULED,
                    notes=f"Reattempt #{attempt_number} scheduled",
                )

        return attempt

    def get_attempts_for_parcel(self, parcel: Parcel) -> list:
        """Get all delivery attempts for a parcel, ordered by most recent first."""
        return list(
            DeliveryAttempt.objects.filter(parcel=parcel).order_by("-attempt_number")
        )

    def can_reattempt(self, parcel: Parcel) -> bool:
        """Check if a parcel can be reattempted (hasn't exceeded max attempts)."""
        attempt_count = DeliveryAttempt.objects.filter(parcel=parcel).count()
        return attempt_count < self.MAX_ATTEMPTS