from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from .models import Rider


@admin.register(Rider)
class RiderAdmin(admin.ModelAdmin):
    """Admin configuration for Rider model."""

    list_display = [
        "user",
        "zone",
        "capacity",
        "current_load",
        "remaining_capacity",
        "is_available",
        "vehicle_type",
    ]
    list_filter = ["is_available", "vehicle_type", "zone"]
    search_fields = ["user__username", "user__email", "user__first_name", "user__last_name"]
    readonly_fields = ["current_load"]
    ordering = ["user__username"]

    fieldsets = (
        (_("User Info"), {"fields": ("user",)}),
        (
            _("Delivery Details"),
            {
                "fields": (
                    "zone",
                    "capacity",
                    "current_load",
                    "is_available",
                    "vehicle_type",
                )
            },
        ),
    )

    def remaining_capacity(self, obj):
        return obj.remaining_capacity

    remaining_capacity.short_description = "Remaining Capacity"