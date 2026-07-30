from django.contrib import admin

from .models import Assignment


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    """Admin configuration for Assignment model."""

    list_display = [
        "parcel",
        "rider",
        "status",
        "assigned_at",
    ]
    list_filter = ["status", "assigned_at"]
    search_fields = [
        "parcel__tracking_id",
        "rider__user__username",
        "rider__user__first_name",
        "rider__user__last_name",
    ]
    readonly_fields = ["assigned_at"]
    ordering = ["-assigned_at"]
    date_hierarchy = "assigned_at"