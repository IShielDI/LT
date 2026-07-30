import logging
from typing import Dict, List

from django.db import transaction
from django.db.models import Case, F, IntegerField, Q, Value, When

from parcels.models import Parcel, ParcelPriority, ParcelStatus
from riders.models import Rider

from .models import Assignment, AssignmentStatus

logger = logging.getLogger("delivery_hub.dispatch.services")


class RiderAssignmentEngine:
    """
    Assigns unassigned parcels to available riders using a greedy algorithm.

    Algorithm:
    1. Fetch unassigned parcels ordered by priority (Express first) then creation time
    2. Fetch available riders filtered by zone match and remaining capacity
    3. Assign parcels to riders maximizing zone-match while respecting capacity
    4. Handle cases where no rider is available (leave unassigned, log, surface)
    5. Use select_for_update to avoid race conditions under concurrent runs
    """

    def __init__(self):
        self.assignment_results: Dict[str, List[dict]] = {
            "assigned": [],
            "unassigned": [],
        }

    def get_unassigned_parcels(self) -> List[Parcel]:
        """
        Fetch parcels that are registered or sorted but not yet assigned.
        Ordered by priority (Express before Standard) then by creation time.
        """
        # Use Case/When to order Express (0) before Standard (1)
        priority_order = Case(
            When(priority=ParcelPriority.EXPRESS, then=Value(0)),
            When(priority=ParcelPriority.STANDARD, then=Value(1)),
            default=Value(2),
            output_field=IntegerField(),
        )

        return list(
            Parcel.objects.filter(
                Q(status=ParcelStatus.REGISTERED) | Q(status=ParcelStatus.SORTED)
            )
            .select_related("zone")
            .order_by(priority_order, "created_at")
        )

    def get_available_riders(self) -> List[Rider]:
        """
        Fetch riders who are available and have remaining capacity.
        """
        return list(
            Rider.objects.filter(
                is_available=True,
                current_load__lt=F("capacity"),
            )
            .select_related("zone", "user")
            .order_by("current_load")  # Least loaded first
        )

    def _assign_parcel_to_rider(
        self, parcel: Parcel, rider: Rider
    ) -> Assignment:
        """Create an assignment and update rider's current load."""
        assignment = Assignment.objects.create(
            parcel=parcel,
            rider=rider,
            status=AssignmentStatus.ASSIGNED,
        )
        # Use F() expression to atomically increment current_load
        Rider.objects.filter(pk=rider.pk).update(
            current_load=F("current_load") + 1
        )

        parcel.status = ParcelStatus.ASSIGNED
        parcel.save(update_fields=["status"])

        return assignment

    def run(self) -> Dict[str, List[dict]]:
        """
        Execute the assignment algorithm.

        Returns a summary dict with:
        - assigned: list of {parcel_id, rider_id, rider_name, zone}
        - unassigned: list of {parcel_id, reason}
        """
        self.assignment_results = {"assigned": [], "unassigned": []}

        parcels = self.get_unassigned_parcels()
        if not parcels:
            logger.info("No unassigned parcels found.")
            return self.assignment_results

        riders = self.get_available_riders()
        if not riders:
            logger.warning("No available riders found.")
            for parcel in parcels:
                self.assignment_results["unassigned"].append(
                    {
                        "parcel_id": str(parcel.tracking_id),
                        "reason": "No available riders",
                    }
                )
            return self.assignment_results

        # Build a mutable list of riders with remaining capacity tracking
        rider_pool: List[dict] = []
        for rider in riders:
            rider_pool.append(
                {
                    "rider": rider,
                    "remaining": rider.remaining_capacity,
                    "zone": rider.zone,
                }
            )

        for parcel in parcels:
            assigned = False

            # Try to find a rider in the same zone first
            if parcel.zone:
                for rp in rider_pool:
                    if rp["remaining"] <= 0:
                        continue
                    if rp["zone"] == parcel.zone:
                        rider = rp["rider"]
                        with transaction.atomic():
                            # Lock the rider row to prevent race conditions
                            locked_rider = Rider.objects.select_for_update().get(
                                pk=rider.pk
                            )
                            if locked_rider.remaining_capacity > 0:
                                self._assign_parcel_to_rider(parcel, locked_rider)
                                rp["remaining"] -= 1
                                self.assignment_results["assigned"].append(
                                    {
                                        "parcel_id": str(parcel.tracking_id),
                                        "rider_id": rider.pk,
                                        "rider_name": str(rider),
                                        "zone": str(parcel.zone),
                                    }
                                )
                                assigned = True
                                break

            # If no zone match, try any rider with remaining capacity
            if not assigned:
                for rp in rider_pool:
                    if rp["remaining"] <= 0:
                        continue
                    rider = rp["rider"]
                    with transaction.atomic():
                        locked_rider = Rider.objects.select_for_update().get(
                            pk=rider.pk
                        )
                        if locked_rider.remaining_capacity > 0:
                            self._assign_parcel_to_rider(parcel, locked_rider)
                            rp["remaining"] -= 1
                            zone_info = str(parcel.zone) if parcel.zone else "No zone"
                            self.assignment_results["assigned"].append(
                                {
                                    "parcel_id": str(parcel.tracking_id),
                                    "rider_id": rider.pk,
                                    "rider_name": str(rider),
                                    "zone": zone_info,
                                }
                            )
                            assigned = True
                            break

            if not assigned:
                reason = "No rider with available capacity"
                if parcel.zone:
                    reason = f"No rider available in zone {parcel.zone}"
                self.assignment_results["unassigned"].append(
                    {
                        "parcel_id": str(parcel.tracking_id),
                        "reason": reason,
                    }
                )
                logger.warning(
                    "Parcel %s unassigned: %s", parcel.tracking_id, reason
                )

        return self.assignment_results

    def get_unassigned_parcels_summary(self) -> List[dict]:
        """Return a queryable list of unassigned parcels with reasons."""
        return self.assignment_results.get("unassigned", [])


class SchedulingService:
    """
    Generates the day's dispatch queue.
    Filters parcels due today, orders by priority, groups by zone.
    """

    def get_dispatch_queue(self) -> Dict[str, List[Parcel]]:
        """
        Build the dispatch queue grouped by zone.

        Returns:
            dict mapping zone name -> list of parcels ordered by priority then time
        """
        from django.utils import timezone

        today = timezone.now().date()

        priority_order = Case(
            When(priority=ParcelPriority.EXPRESS, then=Value(0)),
            When(priority=ParcelPriority.STANDARD, then=Value(1)),
            default=Value(2),
            output_field=IntegerField(),
        )

        parcels = (
            Parcel.objects.filter(
                Q(status=ParcelStatus.REGISTERED) | Q(status=ParcelStatus.SORTED),
                created_at__date=today,
            )
            .select_related("zone")
            .order_by(priority_order, "created_at")
        )

        queue: Dict[str, List[Parcel]] = {}
        for parcel in parcels:
            zone_name = parcel.zone.name if parcel.zone else "Unzoned"
            if zone_name not in queue:
                queue[zone_name] = []
            queue[zone_name].append(parcel)

        return queue

    def get_priority_queue(self) -> List[Parcel]:
        """
        Get parcels ordered by priority (Express first) then creation time.
        Useful for batch assignment processing.
        """
        priority_order = Case(
            When(priority=ParcelPriority.EXPRESS, then=Value(0)),
            When(priority=ParcelPriority.STANDARD, then=Value(1)),
            default=Value(2),
            output_field=IntegerField(),
        )

        return list(
            Parcel.objects.filter(
                Q(status=ParcelStatus.REGISTERED) | Q(status=ParcelStatus.SORTED)
            )
            .select_related("zone")
            .order_by(priority_order, "created_at")
        )