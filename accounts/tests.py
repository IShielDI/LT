import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()


class TestUserModel:
    """Tests for the custom User model."""

    def test_create_user_with_role(self, db):
        """Test creating a user with a specific role."""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            role="hub_manager",
        )
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.role == "hub_manager"
        assert user.is_active is True
        assert user.is_staff is False

    def test_create_admin_user(self, db):
        """Test creating an admin user."""
        admin = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="adminpass123",
            role="admin",
        )
        assert admin.role == "admin"
        assert admin.is_superuser is True
        assert admin.is_staff is True

    def test_user_str_representation(self, db):
        """Test the string representation of a user."""
        user = User.objects.create_user(
            username="johndoe",
            first_name="John",
            last_name="Doe",
            password="testpass123",
            role="rider",
        )
        assert str(user) == "John Doe (Delivery Partner (Rider))"

    def test_user_role_properties(self, db):
        """Test role property methods."""
        admin = User.objects.create_user(
            username="admin", password="testpass123", role="admin"
        )
        manager = User.objects.create_user(
            username="manager", password="testpass123", role="hub_manager"
        )
        rider = User.objects.create_user(
            username="rider", password="testpass123", role="rider"
        )

        assert admin.is_admin is True
        assert admin.is_hub_manager is False
        assert admin.is_rider is False

        assert manager.is_admin is False
        assert manager.is_hub_manager is True
        assert manager.is_rider is False

        assert rider.is_admin is False
        assert rider.is_hub_manager is False
        assert rider.is_rider is True

    def test_user_phone_number_validation(self, db):
        """Test that phone number must contain only digits."""
        user = User(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            phone_number="abc123",
        )
        with pytest.raises(ValidationError):
            user.full_clean()

    def test_user_phone_number_valid(self, db):
        """Test valid phone number passes validation."""
        user = User(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            phone_number="9876543210",
        )
        # Should not raise
        user.full_clean()

    def test_user_manager_querysets(self, db):
        """Test custom manager methods."""
        User.objects.create_user(username="admin1", password="pass", role="admin")
        User.objects.create_user(username="admin2", password="pass", role="admin")
        User.objects.create_user(username="manager1", password="pass", role="hub_manager")
        User.objects.create_user(username="rider1", password="pass", role="rider")

        assert User.objects.admins().count() == 2
        assert User.objects.hub_managers().count() == 1
        assert User.objects.riders().count() == 1

    def test_user_default_role(self, db):
        """Test that default role is hub_manager."""
        user = User.objects.create_user(
            username="defaultuser", password="testpass123"
        )
        assert user.role == "hub_manager"

    def test_user_indexes(self, db):
        """Test that indexes exist on role and is_active fields."""
        indexes = [idx.fields for idx in User._meta.indexes]
        assert ["role"] in indexes
        assert ["is_active"] in indexes