from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserRole(models.TextChoices):
    ADMIN = "admin", _("Admin")
    HUB_MANAGER = "hub_manager", _("Hub Manager")
    RIDER = "rider", _("Delivery Partner (Rider)")


class UserManager(BaseUserManager):
    """Custom manager for User model."""

    def get_queryset(self):
        return super().get_queryset()

    def admins(self):
        return self.get_queryset().filter(role=UserRole.ADMIN)

    def hub_managers(self):
        return self.get_queryset().filter(role=UserRole.HUB_MANAGER)

    def riders(self):
        return self.get_queryset().filter(role=UserRole.RIDER)

    def _create_user(self, username, email, password, **extra_fields):
        """Create and save a user with the given username, email, and password."""
        if not username:
            raise ValueError("The given username must be set")
        email = self.normalize_email(email)
        username = self.model.normalize_username(username)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(username, email, password, **extra_fields)

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(username, email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom user model with role-based access control.
    Extends Django's AbstractUser to add role, phone_number fields.
    """

    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.HUB_MANAGER,
        verbose_name=_("Role"),
        help_text=_("User role determining system access level"),
    )
    phone_number = models.CharField(
        max_length=15,
        blank=True,
        verbose_name=_("Phone Number"),
        help_text=_("Contact phone number"),
    )

    objects = UserManager()

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ["-date_joined"]
        indexes = [
            models.Index(fields=["role"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    def clean(self):
        """Validate model fields."""
        super().clean()
        if self.phone_number and not self.phone_number.isdigit():
            from django.core.exceptions import ValidationError
            raise ValidationError({"phone_number": _("Phone number must contain only digits.")})

    @property
    def is_admin(self):
        return self.role == UserRole.ADMIN

    @property
    def is_hub_manager(self):
        return self.role == UserRole.HUB_MANAGER

    @property
    def is_rider(self):
        return self.role == UserRole.RIDER