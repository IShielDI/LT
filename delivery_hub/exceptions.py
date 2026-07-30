from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler that returns a consistent error response shape.
    Always returns: {"error": {"detail": ..., "code": ...}}
    """
    response = exception_handler(exc, context)

    if response is not None:
        detail = response.data
        code = response.status_code

        # Standardize the error shape
        response.data = {
            "error": {
                "detail": detail,
                "code": code,
            }
        }

    return response