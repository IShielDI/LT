import pytest
from django.contrib.auth import get_user_model

from accounts.models import User
from parcels.models import Parcel, ParcelStatus, Zone
from riders.models import Rider

from ..models import Assignment
from ..services import RiderAssignmentEngine, SchedulingService

User = get_user_model()


@pytest.fixture
def zone(db):
    return Zone.objects.create(
        name="North Zone",
        pincode_range_start="100000",
        pincode_range_end="199999",
    )


@pytest.fixture
def zone2(db):
    return Zone.objects.create(
        name="South Zone",
        pincode_range_start="200000",
        pincode_range_end="299999",
    )


@pytest.fixture
def rider_user1(db):
    return User.objects.create_user(
        username="rider1", password="pass", role="rider",
        first_name="John", last_name="Doe",
    )


@pytest.fixture
def rider_user2(db):
    return User.objects.create_user(
        username="rider2", password="pass", role="rider",
        first_name="Jane", last_name="Smith",
    )


@pytest.fixture
def rider_user3(db):
    return User.objects.create_user(
        username="rider3", password="pass", role="rider",
        first_name="Bob", last_name="Wilson",
    )


@pytest.fixture
def rider1(db, rider_user1, zone):
    return Rider.objects.create(
        user=rider_user1, capacity=5, zone=zone, is_available=True,
    )


@pytest.fixture
def rider2(db, rider_user2, zone):
    return Rider.objects.create(
        user=rider_user2, capacity=3, zone=zone, is_available=True,
    )


@pytest.fixture
def rider3(db, rider_user3, zone2):
    return Rider.objects.create(
        user=rider_user3, capacity=2, zone=zone2, is_available=True,
    )


@pytest.fixture
def parcel1(db, zone):
    return Parcel.objects.create(
        sender_name="Sender1", sender_address="Addr1",
        receiver_name="Recv1", receiver_address="Addr1",
        receiver_phone="1111111111", pincode="150000",
        weight=1.0, zone=zone, priority="express",
    )


@pytest.fixture
def parcel2(db, zone):
    return Parcel.objects.create(
        sender_name="Sender2", sender_address="Addr2",
        receiver_name="Recv2", receiver_address="Addr2",
        receiver_phone="2222222222", pincode="150001",
        weight=2.0, zone=zone, priority="standard",
    )


@pytest.fixture
def parcel3(db, zone2):
    return Parcel.objects.create(
        sender_name="Sender3", sender_address="Addr3",
        receiver_name="Recv3", receiver_address="Addr3",
        receiver_phone="3333333333", pincode="250000",
        weight=1.5, zone=zone2, priority="express",
    )


@pytest.fixture
def parcel4(db):
    """Parcel with no zone (pincode doesn't match any zone)."""
    return Parcel.objects.create(
        sender_name="Sender4", sender_address="Addr4",
        receiver_name="Recv4", receiver_address="Addr4",
        receiver_phone="4444444444", pincode="999999",
        weight=1.0, priority="standard",
    )


class TestRiderAssignmentEngine:
    """Tests for the RiderAssignmentEngine service."""

    def test_normal_assignment_flow(self, db, rider1, rider2, parcel1, parcel2):
        """Test basic assignment: parcels get assigned to available riders."""
        engine = RiderAssignmentEngine()
        result = engine.run()

        assert len(result["assigned"]) == 2
        assert len(result["unassigned"]) == 0

        # Verify assignments were created
        assert Assignment.objects.count() == 2

        # Verify parcel statuses updated
        parcel1.refresh_from_db()
        parcel2.refresh_from_db()
        assert parcel1.status == ParcelStatus.ASSIGNED
        assert parcel2.status == ParcelStatus.ASSIGNED

        # Verify rider loads updated (both parcels in same zone,
        # so first rider gets both since it has capacity)
        rider1.refresh_from_db()
        rider2.refresh_from_db()
        assert rider1.current_load == 2
        assert rider2.current_load == 0

    def test_express_priority_first(self, db, rider1, parcel1, parcel2):
        """Test that Express parcels are assigned before Standard."""
        parcel1.priority = "express"
        parcel1.save()
        parcel2.priority = "standard"
        parcel2.save()

        engine = RiderAssignmentEngine()
        result = engine.run()

        # Express parcel should be assigned first
        assert result["assigned"][0]["parcel_id"] == str(parcel1.tracking_id)

    def test_zone_matching(self, db, rider1, rider3, parcel1, parcel3):
        """Test that riders get parcels from their own zone first."""
        engine = RiderAssignmentEngine()
        result = engine.run()

        assert len(result["assigned"]) == 2

        # rider1 (North Zone) should get parcel1 (North Zone)
        # rider3 (South Zone) should get parcel3 (South Zone)
        for assignment in result["assigned"]:
            if assignment["parcel_id"] == str(parcel1.tracking_id):
                assert "John" in assignment["rider_name"]
            elif assignment["parcel_id"] == str(parcel3.tracking_id):
                assert "Bob" in assignment["rider_name"]

    def test_capacity_exhaustion(self, db, rider1, parcel1, parcel2, parcel3):
        """Test that riders don't exceed their capacity."""
        # Set rider1 capacity to 1
        rider1.capacity = 1
        rider1.save()

        engine = RiderAssignmentEngine()
        result = engine.run()

        # Only 1 parcel should be assigned (rider1 has capacity 1)
        # parcel3 has no rider in its zone (rider3 not created), so it stays unassigned
        assert len(result["assigned"]) == 1
        assert len(result["unassigned"]) >= 1

    def test_no_available_riders(self, db, parcel1, parcel2):
        """Test when no riders are available."""
        engine = RiderAssignmentEngine()
        result = engine.run()

        assert len(result["assigned"]) == 0
        assert len(result["unassigned"]) == 2
        for ua in result["unassigned"]:
            assert ua["reason"] == "No available riders"

    def test_zone_mismatch_fallback(self, db, rider1, parcel3, parcel4):
        """Test that parcels without zone match fall back to any rider."""
        # rider1 is in North Zone, parcel3 is in South Zone
        # rider1 should still get parcel3 since it's the only rider
        engine = RiderAssignmentEngine()
        result = engine.run()

        assert len(result["assigned"]) >= 1

    def test_unassigned_parcels_summary(self, db, parcel1):
        """Test get_unassigned_parcels_summary method."""
        engine = RiderAssignmentEngine()
        engine.run()

        summary = engine.get_unassigned_parcels_summary()
        # With no riders, parcels should be unassigned
        assert isinstance(summary, list)

    def test_parcel_ordering_by_priority(self, db, rider1):
        """Test that get_unassigned_parcels returns Express first."""
        p1 = Parcel.objects.create(
            sender_name="S1", sender_address="A1",
            receiver_name="R1", receiver_address="A1",
            receiver_phone="1111111111", pincode="150000",
            weight=1.0, priority="standard",
        )
        p2 = Parcel.objects.create(
            sender_name="S2", sender_address="A2",
            receiver_name="R2", receiver_address="A2",
            receiver_phone="2222222222", pincode="150000",
            weight=1.0, priority="express",
        )

        engine = RiderAssignmentEngine()
        parcels = engine.get_unassigned_parcels()

        # Express should come first
        assert parcels[0].priority == "express"
        assert parcels[1].priority == "standard"

    def test_no_unassigned_parcels(self, db, rider1):
        """Test when all parcels are already assigned."""
        engine = RiderAssignmentEngine()
        result = engine.run()

        # Run again - no unassigned parcels should remain
        result2 = engine.run()
        assert len(result2["assigned"]) == 0
        assert len(result2["unassigned"]) == 0


class TestSchedulingService:
    """Tests for the SchedulingService."""

    def test_get_dispatch_queue(self, db, zone, parcel1, parcel2):
        """Test that dispatch queue groups parcels by zone."""
        service = SchedulingService()
        queue = service.get_dispatch_queue()

        assert "North Zone" in queue
        assert len(queue["North Zone"]) >= 2

    def test_get_priority_queue(self, db, parcel1, parcel2):
        """Test that priority queue orders Express first."""
        parcel1.priority = "express"
        parcel1.save()
        parcel2.priority = "standard"
        parcel2.save()

        service = SchedulingService()
        queue = service.get_priority_queue()

        assert queue[0].priority == "express"
        assert queue[1].priority == "standard"

    def test_empty_queue(self, db):
        """Test dispatch queue with no parcels."""
        service = SchedulingService()
        queue = service.get_dispatch_queue()
        assert queue == {}

    def test_unzoned_parcels(self, db, parcel4):
        """Test that parcels without zone go to 'Unzoned' group."""
        service = SchedulingService()
        queue = service.get_dispatch_queue()

        assert "Unzoned" in queue
        assert len(queue["Unzoned"]) == 1