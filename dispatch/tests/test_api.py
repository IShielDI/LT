import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from accounts.models import User
from parcels.models import Parcel, ParcelStatus, Zone
from riders.models import Rider

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        username="admin", email="admin@test.com",
        password="adminpass123", role="admin",
    )


@pytest.fixture
def manager_user(db):
    return User.objects.create_user(
        username="manager", email="manager@test.com",
        password="managerpass123", role="hub_manager",
    )


@pytest.fixture
def rider_user(db):
    return User.objects.create_user(
        username="rider", email="rider@test.com",
        password="riderpass123", role="rider",
    )


@pytest.fixture
def authed_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def manager_client(api_client, manager_user):
    api_client.force_authenticate(user=manager_user)
    return api_client


@pytest.fixture
def rider_client(api_client, rider_user):
    api_client.force_authenticate(user=rider_user)
    return api_client


@pytest.fixture
def zone(db):
    return Zone.objects.create(
        name="North Zone",
        pincode_range_start="100000",
        pincode_range_end="199999",
    )


@pytest.fixture
def parcel(db, zone):
    return Parcel.objects.create(
        sender_name="John", sender_address="Addr",
        receiver_name="Jane", receiver_address="Addr",
        receiver_phone="9876543210", pincode="150000",
        weight=1.0, zone=zone, priority="express",
    )


@pytest.fixture
def rider(db, rider_user, zone):
    return Rider.objects.create(
        user=rider_user, capacity=5, zone=zone, is_available=True,
    )


class TestAuthFlow:
    """Tests for authentication endpoints."""

    def test_login_success(self, api_client, admin_user):
        """Test successful login returns JWT tokens."""
        response = api_client.post("/api/auth/login/", {
            "username": "admin",
            "password": "adminpass123",
        }, format="json")
        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data
        assert "user" in response.data

    def test_login_invalid_credentials(self, api_client, admin_user):
        """Test login with wrong password."""
        response = api_client.post("/api/auth/login/", {
            "username": "admin",
            "password": "wrongpass",
        }, format="json")
        assert response.status_code == 401

    def test_login_nonexistent_user(self, api_client, db):
        """Test login with non-existent user."""
        response = api_client.post("/api/auth/login/", {
            "username": "nobody",
            "password": "pass",
        }, format="json")
        assert response.status_code == 401

    def test_get_me(self, authed_client, admin_user):
        """Test getting current user profile."""
        response = authed_client.get("/api/auth/users/me/")
        assert response.status_code == 200
        assert response.data["username"] == "admin"
        assert response.data["role"] == "admin"

    def test_unauthenticated_access(self, api_client):
        """Test that unauthenticated requests are rejected."""
        response = api_client.get("/api/parcels/parcels/")
        assert response.status_code == 401


class TestPermissionBoundaries:
    """Tests for role-based permission boundaries."""

    def test_admin_can_create_parcel(self, authed_client, zone):
        """Admin can create parcels."""
        response = authed_client.post("/api/parcels/parcels/", {
            "sender_name": "S", "sender_address": "A",
            "receiver_name": "R", "receiver_address": "A",
            "receiver_phone": "1234567890", "pincode": "150000",
            "weight": 1.0, "priority": "express",
        }, format="json")
        assert response.status_code == 201

    def test_manager_can_create_parcel(self, manager_client, zone):
        """Hub manager can create parcels."""
        response = manager_client.post("/api/parcels/parcels/", {
            "sender_name": "S", "sender_address": "A",
            "receiver_name": "R", "receiver_address": "A",
            "receiver_phone": "1234567890", "pincode": "150000",
            "weight": 1.0, "priority": "express",
        }, format="json")
        assert response.status_code == 201

    def test_rider_cannot_create_parcel(self, rider_client, zone):
        """Riders cannot create parcels."""
        response = rider_client.post("/api/parcels/parcels/", {
            "sender_name": "S", "sender_address": "A",
            "receiver_name": "R", "receiver_address": "A",
            "receiver_phone": "1234567890", "pincode": "150000",
            "weight": 1.0, "priority": "express",
        }, format="json")
        assert response.status_code == 403

    def test_rider_can_list_assigned_parcels(self, rider_client, rider, parcel):
        """Riders can list parcels assigned to them."""
        from dispatch.models import Assignment
        Assignment.objects.create(parcel=parcel, rider=rider)
        response = rider_client.get("/api/parcels/parcels/")
        assert response.status_code == 200
        assert len(response.data["results"]) == 1

    def test_rider_cannot_list_all_parcels(self, rider_client, parcel):
        """Riders without assignments see no parcels."""
        response = rider_client.get("/api/parcels/parcels/")
        assert response.status_code == 200
        assert len(response.data["results"]) == 0

    def test_public_tracking(self, api_client, parcel):
        """Public tracking endpoint works without auth."""
        response = api_client.get(
            f"/api/parcels/parcels/track/?tracking_id={parcel.tracking_id}"
        )
        assert response.status_code == 200
        assert response.data["tracking_id"] == str(parcel.tracking_id)

    def test_public_tracking_no_id(self, api_client):
        """Tracking without tracking_id returns 400."""
        response = api_client.get("/api/parcels/parcels/track/")
        assert response.status_code == 400

    def test_public_tracking_not_found(self, api_client, db):
        """Tracking with invalid ID returns 404."""
        import uuid
        response = api_client.get(
            f"/api/parcels/parcels/track/?tracking_id={uuid.uuid4()}"
        )
        assert response.status_code == 404


class TestDispatchEndpoints:
    """Tests for dispatch custom action endpoints."""

    def test_run_assignment(self, authed_client, parcel, rider):
        """Test running the assignment engine."""
        response = authed_client.post(
            "/api/dispatch/assignments/run_assignment/", format="json"
        )
        assert response.status_code == 200
        assert "assigned" in response.data
        assert "unassigned" in response.data
        assert len(response.data["assigned"]) == 1

    def test_run_assignment_no_parcels(self, authed_client):
        """Test running assignment with no parcels."""
        response = authed_client.post(
            "/api/dispatch/assignments/run_assignment/", format="json"
        )
        assert response.status_code == 200
        assert len(response.data["assigned"]) == 0

    def test_rider_cannot_run_assignment(self, rider_client, parcel, rider):
        """Riders cannot run assignment."""
        response = rider_client.post(
            "/api/dispatch/assignments/run_assignment/", format="json"
        )
        assert response.status_code == 403

    def test_mark_in_transit(self, authed_client, parcel, rider):
        """Test marking an assignment as in transit."""
        from dispatch.models import Assignment
        assignment = Assignment.objects.create(parcel=parcel, rider=rider)
        response = authed_client.post(
            f"/api/dispatch/assignments/{assignment.pk}/mark_in_transit/",
            format="json",
        )
        assert response.status_code == 200
        assert response.data["status"] == "in_transit"

    def test_mark_delivered(self, authed_client, parcel, rider):
        """Test marking an assignment as delivered."""
        from dispatch.models import Assignment
        assignment = Assignment.objects.create(parcel=parcel, rider=rider)
        assignment.status = "in_transit"
        assignment.save()
        response = authed_client.post(
            f"/api/dispatch/assignments/{assignment.pk}/mark_delivered/",
            format="json",
        )
        assert response.status_code == 200
        assert response.data["status"] == "delivered"


class TestDeliveryEndpoints:
    """Tests for delivery custom action endpoints."""

    def test_record_attempt_success(self, authed_client, parcel):
        """Test recording a successful delivery attempt."""
        parcel.status = ParcelStatus.IN_TRANSIT
        parcel.save()
        response = authed_client.post(
            "/api/delivery/attempts/record_attempt/",
            {
                "parcel": str(parcel.tracking_id),
                "status": "success",
                "notes": "Delivered",
            },
            format="json",
        )
        assert response.status_code == 201
        assert response.data["status"] == "success"

    def test_record_attempt_failed(self, authed_client, parcel):
        """Test recording a failed delivery attempt."""
        parcel.status = ParcelStatus.IN_TRANSIT
        parcel.save()
        response = authed_client.post(
            "/api/delivery/attempts/record_attempt/",
            {
                "parcel": str(parcel.tracking_id),
                "status": "failed",
                "failure_reason": "customer_unavailable",
                "notes": "Not home",
            },
            format="json",
        )
        assert response.status_code == 201
        assert response.data["status"] == "failed"

    def test_record_attempt_invalid_status(self, authed_client, parcel):
        """Test recording attempt with invalid status transition."""
        # Parcel is in 'registered' state, can't record attempt
        response = authed_client.post(
            "/api/delivery/attempts/record_attempt/",
            {
                "parcel": str(parcel.tracking_id),
                "status": "success",
            },
            format="json",
        )
        assert response.status_code == 400

    def test_record_attempt_no_parcel(self, authed_client):
        """Test recording attempt without parcel field."""
        response = authed_client.post(
            "/api/delivery/attempts/record_attempt/",
            {"status": "success"},
            format="json",
        )
        assert response.status_code == 400

    def test_record_attempt_parcel_not_found(self, authed_client):
        """Test recording attempt for non-existent parcel."""
        import uuid
        response = authed_client.post(
            "/api/delivery/attempts/record_attempt/",
            {
                "parcel": str(uuid.uuid4()),
                "status": "success",
            },
            format="json",
        )
        assert response.status_code == 404

    def test_rider_cannot_record_attempt(self, rider_client, parcel):
        """Riders cannot record delivery attempts."""
        parcel.status = ParcelStatus.IN_TRANSIT
        parcel.save()
        response = rider_client.post(
            "/api/delivery/attempts/record_attempt/",
            {
                "parcel": str(parcel.tracking_id),
                "status": "success",
            },
            format="json",
        )
        assert response.status_code == 403


class TestParcelValidation:
    """Tests for parcel API validation."""

    def test_create_parcel_negative_weight(self, authed_client, zone):
        """Test that negative weight is rejected."""
        response = authed_client.post("/api/parcels/parcels/", {
            "sender_name": "S", "sender_address": "A",
            "receiver_name": "R", "receiver_address": "A",
            "receiver_phone": "1234567890", "pincode": "150000",
            "weight": -1.0, "priority": "express",
        }, format="json")
        assert response.status_code == 400

    def test_create_parcel_invalid_phone(self, authed_client, zone):
        """Test that non-digit phone is rejected."""
        response = authed_client.post("/api/parcels/parcels/", {
            "sender_name": "S", "sender_address": "A",
            "receiver_name": "R", "receiver_address": "A",
            "receiver_phone": "abc123", "pincode": "150000",
            "weight": 1.0, "priority": "express",
        }, format="json")
        assert response.status_code == 400

    def test_list_parcels(self, authed_client, parcel):
        """Test listing parcels."""
        response = authed_client.get("/api/parcels/parcels/")
        assert response.status_code == 200
        assert "results" in response.data
        assert len(response.data["results"]) == 1

    def test_retrieve_parcel(self, authed_client, parcel):
        """Test retrieving a single parcel."""
        response = authed_client.get(
            f"/api/parcels/parcels/{parcel.tracking_id}/"
        )
        assert response.status_code == 200
        assert response.data["tracking_id"] == str(parcel.tracking_id)

    def test_mark_sorted(self, authed_client, parcel):
        """Test marking a parcel as sorted."""
        response = authed_client.post(
            f"/api/parcels/parcels/{parcel.tracking_id}/mark_sorted/",
            format="json",
        )
        assert response.status_code == 200
        assert response.data["status"] == "sorted"