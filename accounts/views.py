from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from core.permissions import IsAdmin

from .serializers import LoginSerializer, UserCreateSerializer, UserSerializer

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users.
    Admin: full access
    Others: read-only own profile
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == "create":
            permission_classes = [IsAuthenticated, IsAdmin]
        elif self.action in ("list", "destroy", "update", "partial_update"):
            permission_classes = [IsAuthenticated, IsAdmin]
        elif self.action == "me":
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthenticated]
        return [p() for p in permission_classes]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        """Get or update the current user's profile."""
        if request.method == "GET":
            serializer = UserSerializer(request.user)
            return Response(serializer.data)
        elif request.method == "PATCH":
            serializer = UserSerializer(
                request.user, data=request.data, partial=True
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)


class LoginViewSet(viewsets.ViewSet):
    """
    ViewSet for user login.
    Returns JWT access and refresh tokens.
    """

    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def create(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"error": "Account is disabled"},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )