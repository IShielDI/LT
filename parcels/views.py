import calendar
import logging
from datetime import timedelta

from django.db.models import Count, DateField, F
from django.db.models.functions import Cast, TruncDate
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdminOrHubManager
from delivery.models import AttemptStatus, DeliveryAttempt

from .models import Parcel, ParcelPriority, ParcelStatus, ParcelStatusHistory, Zone
from .serializers import (
    ParcelDetailSerializer,
    ParcelListSerializer,
    ParcelTrackingSerializer,
    ZoneSerializer,
)
from .services import decode_qr_image, generate_qr_code

logger = logging.getLogger("delivery_hub.parcels.views")


class ZoneViewSet(viewsets.ModelViewSet):
    """ViewSet for managing delivery zones."""

    queryset = Zone.objects.all()
    serializer_class = ZoneSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHubManager]

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def preset_locations(self, request):
        """
        Return preset demo locations derived from actual Zone data.
        Each location has an area name, pincode, and zone reference so the
        parcel registration form can offer a controlled, predictable dropdown
        instead of free-text entry.
        """
        zones = Zone.objects.all().order_by("name")
        locations = []
        for zone in zones:
            # Use the zone name as the area name and the start of the
            # pincode range as the sample pincode. This is fully derived
            # from Zone data — no separate hardcoded list to drift out of sync.
            locations.append({
                "area_name": zone.name,
                "pincode": zone.pincode_range_start,
                "zone": zone.id,
                "zone_name": zone.name,
            })
        return Response(locations)


class ParcelViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing parcels.
    Admin/Hub Manager: full CRUD
    Riders: read-only on assigned parcels
    """

    queryset = Parcel.objects.select_related("zone").all()
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_serializer_class(self):
        if self.action == "list":
            return ParcelListSerializer
        return ParcelDetailSerializer

    def get_permissions(self):
        if self.action == "track":
            permission_classes = [AllowAny]
        elif self.action in ("list", "retrieve"):
            # All authenticated users can list/retrieve
            # (riders see only their assigned parcels via get_queryset)
            permission_classes = [IsAuthenticated]
        else:
            # Write actions require admin or hub manager
            permission_classes = [IsAuthenticated, IsAdminOrHubManager]
        return [p() for p in permission_classes]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Parcel.objects.none()

        if user.is_admin or user.is_hub_manager:
            return Parcel.objects.select_related("zone").all()

        if user.is_rider:
            # Riders can only see parcels assigned to them
            rider = getattr(user, "rider_profile", None)
            if rider:
                return Parcel.objects.filter(
                    assignments__rider=rider
                ).select_related("zone").distinct()
            return Parcel.objects.none()

        return Parcel.objects.none()

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def calendar(self, request):
        """
        Calendar view of parcels grouped by date.

        Query params:
          - year (required): e.g. 2026
          - month (required): 1-12
          - day (optional): 1-31. If provided, returns detailed parcel lists
            for that specific day split into "scheduled" and "delivered".
            If omitted, returns per-day counts for the whole month.

        Scheduling logic (derived from priority + created_at):
          - express  -> expected delivery on the same calendar day as created_at
          - standard -> expected delivery on the day after created_at

        Delivered: parcels with a DeliveryAttempt status=success whose
        attempted_at falls on the requested day.
        """
        try:
            year = int(request.query_params.get("year", ""))
            month = int(request.query_params.get("month", ""))
        except (ValueError, TypeError):
            return Response(
                {"error": "year and month query parameters are required integers"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (1 <= month <= 12) or not (1900 <= year <= 2100):
            return Response(
                {"error": "Invalid year or month"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        day_param = request.query_params.get("day")
        if day_param is not None:
            try:
                day = int(day_param)
            except (ValueError, TypeError):
                return Response(
                    {"error": "day must be an integer"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return self._calendar_day_detail(request, year, month, day)

        return self._calendar_month_summary(request, year, month)

    def _calendar_month_summary(self, request, year, month):
        """Return per-day counts of scheduled and delivered parcels."""
        parcels_qs = self.get_queryset()

        # Build the set of dates in the month for stable output
        _, days_in_month = calendar.monthrange(year, month)
        month_dates = [
            timezone.datetime(year, month, d).date()
            for d in range(1, days_in_month + 1)
        ]

        # --- Scheduled (expected) deliveries per day ---
        # Express: same day as created_at; Standard: next day after created_at
        express_qs = parcels_qs.filter(priority=ParcelPriority.EXPRESS)
        standard_qs = parcels_qs.filter(priority=ParcelPriority.STANDARD)

        express_dates = {
            d["d"]: d["c"]
            for d in express_qs.annotate(
                d=Cast("created_at", DateField())
            ).values("d").annotate(c=Count("tracking_id"))
        }
        standard_dates = {
            d["d"]: d["c"]
            for d in standard_qs.annotate(
                d=Cast(
                    TruncDate(F("created_at") + timedelta(days=1)),
                    DateField(),
                )
            ).values("d").annotate(c=Count("tracking_id"))
        }

        # --- Delivered per day (successful attempts) ---
        delivered_dates = {
            d["d"]: d["c"]
            for d in DeliveryAttempt.objects.filter(
                status=AttemptStatus.SUCCESS
            ).annotate(
                d=Cast("attempted_at", DateField())
            ).values("d").annotate(c=Count("id"))
        }

        days = []
        for date in month_dates:
            scheduled = express_dates.get(date, 0) + standard_dates.get(date, 0)
            delivered = delivered_dates.get(date, 0)
            days.append({
                "date": date.isoformat(),
                "scheduled": scheduled,
                "delivered": delivered,
            })

        return Response({
            "year": year,
            "month": month,
            "days": days,
        })

    def _calendar_day_detail(self, request, year, month, day):
        """Return detailed parcel lists for a specific day."""
        try:
            target_date = timezone.datetime(year, month, day).date()
        except ValueError:
            return Response(
                {"error": "Invalid day for the given month/year"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parcels_qs = self.get_queryset()

        # Scheduled: express created on this day OR standard created yesterday
        express_ids = list(
            parcels_qs.filter(
                priority=ParcelPriority.EXPRESS,
                created_at__date=target_date,
            ).values_list("tracking_id", flat=True)
        )
        standard_ids = list(
            parcels_qs.filter(
                priority=ParcelPriority.STANDARD,
                created_at__date=target_date - timedelta(days=1),
            ).values_list("tracking_id", flat=True)
        )
        scheduled_ids = set(express_ids) | set(standard_ids)

        # Delivered: successful attempts on this day
        delivered_ids = set(
            DeliveryAttempt.objects.filter(
                status=AttemptStatus.SUCCESS,
                attempted_at__date=target_date,
            ).values_list("parcel_id", flat=True)
        )

        scheduled_parcels = parcels_qs.filter(
            tracking_id__in=scheduled_ids
        ).order_by("priority", "-created_at")
        delivered_parcels = parcels_qs.filter(
            tracking_id__in=delivered_ids
        ).order_by("-created_at")

        return Response({
            "date": target_date.isoformat(),
            "scheduled": ParcelListSerializer(scheduled_parcels, many=True).data,
            "delivered": ParcelListSerializer(delivered_parcels, many=True).data,
        })

    @action(detail=False, methods=["get"])
    def track(self, request):
        """
        Public tracking endpoint - no auth required.
        Search by tracking ID (UUID).
        """
        tracking_id = request.query_params.get("tracking_id", None)
        if not tracking_id:
            return Response(
                {"error": "tracking_id query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            parcel = Parcel.objects.select_related("zone").get(
                tracking_id=tracking_id
            )
        except Parcel.DoesNotExist:
            return Response(
                {"error": "Parcel not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ParcelTrackingSerializer(parcel)
        return Response(serializer.data)

    def perform_create(self, serializer):
        """Create a parcel and immediately run the assignment engine for it."""
        parcel = serializer.save()

        # Record initial status history
        ParcelStatusHistory.record(
            parcel=parcel,
            status=ParcelStatus.REGISTERED,
            notes="Parcel registered via intake",
        )

        # Generate QR code
        generate_qr_code(parcel)

        # Immediately run the assignment engine for this single parcel
        from dispatch.services import RiderAssignmentEngine

        engine = RiderAssignmentEngine()
        result = engine.assign_single_parcel(parcel)

        if result["assigned"]:
            # Parcel status is now 'assigned' — refresh from DB
            parcel.refresh_from_db()
        else:
            # No eligible rider — leave as 'registered' and flag for attention
            logger.warning(
                "Parcel %s created but could not be auto-assigned: %s",
                parcel.tracking_id,
                result["reason"],
            )

    @action(detail=True, methods=["post"])
    def mark_sorted(self, request, pk=None):
        """Mark a parcel as sorted."""
        parcel = self.get_object()
        if parcel.status != "registered":
            return Response(
                {"error": f"Cannot sort parcel in status '{parcel.status}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        parcel.status = "sorted"
        parcel.save(update_fields=["status"])
        ParcelStatusHistory.record(
            parcel=parcel,
            status=ParcelStatus.SORTED,
            notes="Parcel marked as sorted",
        )
        return Response(ParcelDetailSerializer(parcel).data)

    @action(detail=True, methods=["post"])
    def generate_qr(self, request, pk=None):
        """Generate a QR code for a parcel."""
        parcel = self.get_object()
        generate_qr_code(parcel)
        return Response(
            {
                "tracking_id": str(parcel.tracking_id),
                "qr_code": parcel.qr_code.url if parcel.qr_code else None,
            }
        )

    @action(detail=False, methods=["post"])
    def scan(self, request):
        """
        Scan a QR code from an uploaded image.
        Returns the matching parcel's current status.
        """
        image = request.FILES.get("image")
        if not image:
            return Response(
                {"error": "Image file is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tracking_id = decode_qr_image(image)
        if not tracking_id:
            return Response(
                {"error": "No QR code found in the image"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            parcel = Parcel.objects.select_related("zone").get(
                tracking_id=tracking_id
            )
        except Parcel.DoesNotExist:
            return Response(
                {"error": f"Parcel with tracking ID '{tracking_id}' not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ParcelTrackingSerializer(parcel)
        return Response(serializer.data)
