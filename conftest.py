import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def admin_user(db):
    """Create an admin user for testing."""
    return User.objects.create_superuser(
        username="admin",
        email="admin@example.com",
        password="adminpass123",
        role="admin",
    )


@pytest.fixture
def hub_manager_user(db):
    """Create a hub manager user for testing."""
    return User.objects.create_user(
        username="manager",
        email="manager@example.com",
        password="managerpass123",
        role="hub_manager",
    )


@pytest.fixture
def rider_user(db):
    """Create a rider user for testing."""
    return User.objects.create_user(
        username="rider",
        email="rider@example.com",
        password="riderpass123",
        role="rider",
    )