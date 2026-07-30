from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Full access for admin users only."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin


class IsHubManager(BasePermission):
    """Access for hub managers and admins."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_admin or request.user.is_hub_manager
        )


class IsRider(BasePermission):
    """Access for riders only."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_rider


class IsAdminOrHubManager(BasePermission):
    """Access for admins and hub managers."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_admin or request.user.is_hub_manager
        )


class IsAdminOrReadOnly(BasePermission):
    """Admins have full access; others have read-only."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return request.user.is_admin


class IsRiderAssignedParcel(BasePermission):
    """
    Object-level permission: riders can only access parcels assigned to them.
    """

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.is_admin or request.user.is_hub_manager:
            return True
        if request.user.is_rider:
            # Check if this parcel/rider is assigned to this user
            rider = getattr(request.user, "rider_profile", None)
            if rider is None:
                return False
            # Check if the object has a rider field (Assignment) or is a Parcel
            if hasattr(obj, "rider") and obj.rider == rider:
                return True
            if hasattr(obj, "parcel") and hasattr(obj.parcel, "assignments"):
                return obj.parcel.assignments.filter(
                    rider=rider, status__in=["assigned", "in_transit"]
                ).exists()
        return False