from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from accounts.models import User
from parcels.models import Zone


class VehicleType(models.TextChoices):
    BIKE = "bike", _("Bike")
    SCOOTER = "scooter", _("Scooter")
    CAR = "car", _("Car")
    VAN = "van", _("Van")
    TRUCK = "truck", _("Truck")
    ON_FOOT = "on_foot", _("On Foot")


class Rider(models.Model):
    """
    Represents a delivery partner (rider) who delivers parcels.
    Tracks capacity, current load, zone assignment, and availability.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="rider_profile",
        verbose_name=_("User"),
        help_text=_("Linked user account for this rider"),
    )
    capacity = models.PositiveIntegerField(
        default=10,
        verbose_name=_("Max Capacity"),
        help_text=_("Maximum number of parcels this rider can carry per day"),
    )
    current_load = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Current Load"),
        help_text=_("Number of parcels currently assigned to this rider"),
    )
    zone = models.ForeignKey(
        Zone,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="riders",
        verbose_name=_("Zone"),
        help_text=_("Primary delivery zone for this rider"),
    )
    is_available = models.BooleanField(
        default=True,
        verbose_name=_("Is Available"),
        help_text=_("Whether this rider is currently available for assignments"),
    )
    vehicle_type = models.CharField(
        max_length=20,
        choices=VehicleType.choices,
        default=VehicleType.BIKE,
        verbose_name=_("Vehicle Type"),
    )

    class Meta:
        verbose_name = _("Rider")
        verbose_name_plural = _("Riders")
        ordering = ["user__username"]
        indexes = [
            models.Index(fields=["is_available"]),
            models.Index(fields=["zone", "is_available"]),
            models.Index(fields=["capacity"]),
        ]

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.zone or 'No Zone'}"

    @property
    def remaining_capacity(self) -> int:
        """Calculate remaining capacity for this rider."""
        return max(0, self.capacity - self.current_load)

    @property
    def is_at_capacity(self) -> bool:
        """Check if rider has reached maximum capacity."""
        return self.current_load >= self.capacity

    def clean(self):
        """Validate model fields."""
        super().clean()
        if self.current_load is not None and self.capacity is not None:
            if self.current_load > self.capacity:
                raise ValidationError(
                    {"current_load": _("Current load cannot exceed capacity.")}
                )