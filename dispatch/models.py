from django.db import models
from django.utils.translation import gettext_lazy as _

from parcels.models import Parcel
from riders.models import Rider


class AssignmentStatus(models.TextChoices):
    ASSIGNED = "assigned", _("Assigned")
    IN_TRANSIT = "in_transit", _("In Transit")
    DELIVERED = "delivered", _("Delivered")
    FAILED = "failed", _("Failed")
    CANCELLED = "cancelled", _("Cancelled")


class Assignment(models.Model):
    """
    Represents the assignment of a parcel to a rider for delivery.
    Tracks the assignment lifecycle and status.
    """

    parcel = models.ForeignKey(
        Parcel,
        on_delete=models.CASCADE,
        related_name="assignments",
        verbose_name=_("Parcel"),
    )
    rider = models.ForeignKey(
        Rider,
        on_delete=models.CASCADE,
        related_name="assignments",
        verbose_name=_("Rider"),
    )
    assigned_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Assigned At"),
    )
    status = models.CharField(
        max_length=20,
        choices=AssignmentStatus.choices,
        default=AssignmentStatus.ASSIGNED,
        verbose_name=_("Status"),
        db_index=True,
    )

    class Meta:
        verbose_name = _("Assignment")
        verbose_name_plural = _("Assignments")
        ordering = ["-assigned_at"]
        indexes = [
            models.Index(fields=["parcel", "status"]),
            models.Index(fields=["rider", "status"]),
            models.Index(fields=["assigned_at"]),
        ]

    def __str__(self):
        return f"Assignment: {self.parcel.tracking_id} -> {self.rider}"

    @property
    def is_active(self) -> bool:
        """Check if this assignment is still active."""
        return self.status in [
            AssignmentStatus.ASSIGNED,
            AssignmentStatus.IN_TRANSIT,
        ]