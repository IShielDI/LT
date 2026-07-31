"""
Django management command to seed initial users for each role.
Creates admin, hub_manager, and rider accounts from environment variables.
"""
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import UserRole

User = get_user_model()


class Command(BaseCommand):
    help = "Seed initial users for each role (admin, hub_manager, rider) from environment variables"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing seeded users before recreating them with current env vars.",
        )

    def handle(self, *args, **options):
        """Execute the command to seed users."""
        reset = options["reset"]
        self.stdout.write(self.style.SUCCESS("Starting user seeding..."))

        # Define user configurations
        user_configs = [
            {
                "role": UserRole.ADMIN,
                "prefix": "ADMIN",
                "is_superuser": True,
                "is_staff": True,
            },
            {
                "role": UserRole.HUB_MANAGER,
                "prefix": "HUB_MANAGER",
                "is_superuser": False,
                "is_staff": True,
            },
            {
                "role": UserRole.RIDER,
                "prefix": "RIDER",
                "is_superuser": False,
                "is_staff": False,
            },
        ]

        # If --reset, delete existing users that match the env var usernames
        if reset:
            deleted_count = 0
            for config in user_configs:
                username = os.environ.get(f"{config['prefix']}_USERNAME")
                if username and User.objects.filter(username=username).exists():
                    User.objects.filter(username=username).delete()
                    deleted_count += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f"🗑️  Deleted existing user '{username}' for --reset"
                        )
                    )
            if deleted_count:
                self.stdout.write(
                    self.style.WARNING(
                        f"Cleared {deleted_count} existing user(s) for re-seeding."
                    )
                )

        created_users = []
        skipped_users = []

        for config in user_configs:
            username_env = f"{config['prefix']}_USERNAME"
            password_env = f"{config['prefix']}_PASSWORD"
            email_env = f"{config['prefix']}_EMAIL"

            username = os.environ.get(username_env)
            password = os.environ.get(password_env)
            email = os.environ.get(email_env)

            # Check if all required env vars are set
            if not all([username, password, email]):
                self.stdout.write(
                    self.style.WARNING(
                        f"⚠️  Skipping {config['role'].label}: "
                        f"Missing environment variables. "
                        f"Required: {username_env}, {password_env}, {email_env}"
                    )
                )
                skipped_users.append(config["role"].label)
                continue

            # Check if user already exists (idempotent)
            if User.objects.filter(username=username).exists():
                self.stdout.write(
                    self.style.WARNING(
                        f"⏭️  User '{username}' already exists, skipping..."
                    )
                )
                skipped_users.append(config["role"].label)
                continue

            # Create the user
            try:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    role=config["role"],
                    is_superuser=config["is_superuser"],
                    is_staff=config["is_staff"],
                )
                created_users.append(f"{user.username} ({user.get_role_display()})")
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✅ Created user: {user.username} ({user.get_role_display()})"
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"❌ Failed to create user '{username}': {str(e)}"
                    )
                )
                skipped_users.append(config["role"].label)

        # Summary
        self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
        self.stdout.write(self.style.SUCCESS("SEEDING SUMMARY"))
        self.stdout.write(self.style.SUCCESS("=" * 60))

        if created_users:
            self.stdout.write(
                self.style.SUCCESS(f"\n✅ Created {len(created_users)} user(s):")
            )
            for user_info in created_users:
                self.stdout.write(f"   - {user_info}")

        if skipped_users:
            self.stdout.write(
                self.style.WARNING(f"\n⏭️  Skipped {len(skipped_users)} user(s):")
            )
            for role_label in skipped_users:
                self.stdout.write(f"   - {role_label}")

        if not created_users and not skipped_users:
            self.stdout.write(self.style.WARNING("No users were processed."))

        self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))

        if created_users:
            self.stdout.write(
                self.style.SUCCESS(
                    "\n🎉 User seeding completed successfully! "
                    "You can now log in with the created credentials."
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    "\n⚠️  No new users were created. "
                    "All users may already exist or environment variables are not set."
                )
            )