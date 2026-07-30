from django.contrib import admin

from .models import DeliveryAttempt


@admin.register(DeliveryAttempt)
class DeliveryAttemptAdmin(admin.ModelAdmin):
    """Admin configuration for DeliveryAttempt model."""

    list_display = [
        "parcel",
        "attempt_number",
        "status",
        "failure_reason",
        "attempted_at",
    ]
    list_filter = ["status", "failure_reason", "attempted_at"]
    search_fields = ["parcel__tracking_id", "notes"]
    readonly_fields = ["attempted_at"]
    ordering = ["-attempted_at"]
    date_hierarchy = "attempted_at"