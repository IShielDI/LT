from django.db import models
from django.utils.translation import gettext_lazy as _

from parcels.models import Parcel


class AttemptStatus(models.TextChoices):
    SUCCESS = "success", _("Delivered Successfully")
    FAILED = "failed", _("Failed")
    REATTEMPT_SCHEDULED = "reattempt_scheduled", _("Reattempt Scheduled")


class FailureReason(models.TextChoices):
    CUSTOMER_UNAVAILABLE = "customer_unavailable", _("Customer Unavailable")
    WRONG_ADDRESS = "wrong_address", _("Wrong Address")
    DAMAGED = "damaged", _("Damaged Parcel")
    REATTEMPT_REQUIRED = "reattempt_required", _("Reattempt Required")
    OTHER = "other", _("Other")


class DeliveryAttempt(models.Model):
    """
    Records each delivery attempt for a parcel.
    Supports exception handling with configurable retry logic.
    Max 3 attempts per parcel before permanent failure.
    """

    MAX_ATTEMPTS = 3

    parcel = models.ForeignKey(
        Parcel,
        on_delete=models.CASCADE,
        related_name="delivery_attempts",
        verbose_name=_("Parcel"),
    )
    attempt_number = models.PositiveIntegerField(
        default=1,
        verbose_name=_("Attempt Number"),
        help_text=_("Which attempt this is (1-based)"),
    )
    status = models.CharField(
        max_length=30,
        choices=AttemptStatus.choices,
        default=AttemptStatus.FAILED,
        verbose_name=_("Status"),
        db_index=True,
    )
    failure_reason = models.CharField(
        max_length=30,
        choices=FailureReason.choices,
        null=True,
        blank=True,
        verbose_name=_("Failure Reason"),
    )
    attempted_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Attempted At"),
    )
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes"),
        help_text=_("Additional notes about this delivery attempt"),
    )

    class Meta:
        verbose_name = _("Delivery Attempt")
        verbose_name_plural = _("Delivery Attempts")
        ordering = ["-attempted_at"]
        unique_together = ["parcel", "attempt_number"]
        indexes = [
            models.Index(fields=["parcel", "status"]),
            models.Index(fields=["attempt_number"]),
            models.Index(fields=["attempted_at"]),
        ]

    def __str__(self):
        return f"Attempt #{self.attempt_number} for {self.parcel.tracking_id} - {self.get_status_display()}"

    @property
    def is_final_attempt(self) -> bool:
        """Check if this is the last allowed attempt."""
        return self.attempt_number >= self.MAX_ATTEMPTS