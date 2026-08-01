from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from .models import Parcel, ParcelStatusHistory, Zone


@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    """Admin configuration for Zone model."""

    list_display = ["name", "pincode_range_start", "pincode_range_end"]
    list_filter = ["name"]
    search_fields = ["name", "pincode_range_start", "pincode_range_end"]
    ordering = ["name"]


@admin.register(Parcel)
class ParcelAdmin(admin.ModelAdmin):
    """Admin configuration for Parcel model."""

    list_display = [
        "tracking_id",
        "sender_name",
        "receiver_name",
        "pincode",
        "zone",
        "priority",
        "weight",
        "status",
        "created_at",
    ]
    list_filter = ["status", "priority", "zone", "created_at"]
    search_fields = [
        "tracking_id",
        "sender_name",
        "receiver_name",
        "receiver_phone",
        "pincode",
    ]
    readonly_fields = ["tracking_id", "created_at", "updated_at"]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"

    fieldsets = (
        (_("Tracking Info"), {"fields": ("tracking_id", "status", "priority", "qr_code")}),
        (
            _("Sender Details"),
            {"fields": ("sender_name", "sender_address")},
        ),
        (
            _("Receiver Details"),
            {"fields": ("receiver_name", "receiver_address", "receiver_phone")},
        ),
        (
            _("Delivery Info"),
            {"fields": ("pincode", "zone", "weight")},
        ),
        (
            _("Timestamps"),
            {"fields": ("created_at", "updated_at")},
        ),
    )


@admin.register(ParcelStatusHistory)
class ParcelStatusHistoryAdmin(admin.ModelAdmin):
    """Admin configuration for ParcelStatusHistory model."""

    list_display = ["parcel", "status", "changed_at", "rider"]
    list_filter = ["status", "changed_at"]
    search_fields = ["parcel__tracking_id", "notes"]
    readonly_fields = ["parcel", "status", "changed_at", "notes", "rider"]
    ordering = ["-changed_at"]
