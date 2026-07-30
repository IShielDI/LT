import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _


class Zone(models.Model):
    """
    Represents a delivery zone defined by a pincode range.
    Used for matching parcels to riders based on geographic zones.
    """

    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Zone Name"),
        help_text=_("Name of the delivery zone (e.g., 'North Zone')"),
    )
    pincode_range_start = models.CharField(
        max_length=10,
        verbose_name=_("Pincode Range Start"),
        help_text=_("Starting pincode of the zone range"),
    )
    pincode_range_end = models.CharField(
        max_length=10,
        verbose_name=_("Pincode Range End"),
        help_text=_("Ending pincode of the zone range"),
    )

    class Meta:
        verbose_name = _("Zone")
        verbose_name_plural = _("Zones")
        ordering = ["name"]
        indexes = [
            models.Index(fields=["pincode_range_start", "pincode_range_end"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.pincode_range_start} - {self.pincode_range_end})"

    def clean(self):
        """Validate that range_start <= range_end."""
        super().clean()
        if self.pincode_range_start and self.pincode_range_end:
            if self.pincode_range_start > self.pincode_range_end:
                raise ValidationError(
                    _("Pincode range start must be less than or equal to range end.")
                )

    def contains_pincode(self, pincode: str) -> bool:
        """Check if a pincode falls within this zone's range."""
        return self.pincode_range_start <= pincode <= self.pincode_range_end


class ParcelStatus(models.TextChoices):
    REGISTERED = "registered", _("Registered")
    SORTED = "sorted", _("Sorted")
    ASSIGNED = "assigned", _("Assigned")
    IN_TRANSIT = "in_transit", _("In Transit")
    DELIVERED = "delivered", _("Delivered")
    FAILED = "failed", _("Failed")
    REATTEMPT_SCHEDULED = "reattempt_scheduled", _("Reattempt Scheduled")


class ParcelPriority(models.TextChoices):
    EXPRESS = "express", _("Express")
    STANDARD = "standard", _("Standard")


class Parcel(models.Model):
    """
    Represents a parcel/courier item in the delivery system.
    Tracks the entire lifecycle from registration to delivery.
    """

    tracking_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name=_("Tracking ID"),
        help_text=_("Unique identifier for the parcel (UUID-based)"),
    )
    sender_name = models.CharField(
        max_length=200,
        verbose_name=_("Sender Name"),
    )
    sender_address = models.TextField(
        verbose_name=_("Sender Address"),
    )
    receiver_name = models.CharField(
        max_length=200,
        verbose_name=_("Receiver Name"),
    )
    receiver_address = models.TextField(
        verbose_name=_("Receiver Address"),
    )
    receiver_phone = models.CharField(
        max_length=15,
        verbose_name=_("Receiver Phone"),
        help_text=_("Contact phone number of the receiver"),
    )
    pincode = models.CharField(
        max_length=10,
        verbose_name=_("Pincode"),
        help_text=_("Delivery pincode/zip code"),
    )
    zone = models.ForeignKey(
        Zone,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="parcels",
        verbose_name=_("Zone"),
        help_text=_("Delivery zone determined by pincode"),
    )
    priority = models.CharField(
        max_length=20,
        choices=ParcelPriority.choices,
        default=ParcelPriority.STANDARD,
        verbose_name=_("Priority"),
    )
    weight = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name=_("Weight (kg)"),
        help_text=_("Weight of the parcel in kilograms"),
    )
    status = models.CharField(
        max_length=30,
        choices=ParcelStatus.choices,
        default=ParcelStatus.REGISTERED,
        verbose_name=_("Status"),
        db_index=True,
    )
    qr_code = models.ImageField(
        upload_to="qr_codes/",
        null=True,
        blank=True,
        verbose_name=_("QR Code"),
        help_text=_("Generated QR code image for this parcel"),
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Created At"),
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Updated At"),
    )

    class Meta:
        verbose_name = _("Parcel")
        verbose_name_plural = _("Parcels")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tracking_id"]),
            models.Index(fields=["status"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["pincode"]),
            models.Index(fields=["zone", "status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Parcel {self.tracking_id} - {self.get_status_display()}"

    def clean(self):
        """Validate model fields."""
        super().clean()
        if self.weight is not None and self.weight < 0:
            raise ValidationError({"weight": _("Weight cannot be negative.")})
        if self.receiver_phone and not self.receiver_phone.isdigit():
            raise ValidationError(
                {"receiver_phone": _("Phone number must contain only digits.")}
            )

    def save(self, *args, **kwargs):
        """Auto-assign zone based on pincode if not set."""
        if not self.zone and self.pincode:
            zone = Zone.objects.filter(
                pincode_range_start__lte=self.pincode,
                pincode_range_end__gte=self.pincode,
            ).first()
            if zone:
                self.zone = zone
        super().save(*args, **kwargs)