import logging

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from .services import RiderAssignmentEngine

logger = logging.getLogger("delivery_hub.dispatch.tasks")


def _run_sync(func, *args, **kwargs):
    """
    Execute a task function synchronously when Celery is disabled.
    Logs the fallback so it is visible in deployments without Redis/Celery.
    """
    logger.info("USE_CELERY is False; running %s synchronously.", func.__name__)
    return func(*args, **kwargs)


@shared_task
def run_daily_assignment():
    """
    Periodic task to run rider assignment engine.
    Triggered daily at midnight by Celery Beat.
    """
    try:
        engine = RiderAssignmentEngine()
        result = engine.run()
        logger.info(
            "Daily assignment completed: %d assigned, %d unassigned",
            len(result["assigned"]),
            len(result["unassigned"]),
        )
        return result
    except Exception as e:
        logger.error("Daily assignment failed: %s", e)
        raise


@shared_task
def generate_report_task(report_type: str, **kwargs):
    """
    Async task for report generation.
    report_type: 'daily_dispatch', 'rider_performance', 'parcel_csv', 'delivery_excel'
    """
    from reports.services import (
        generate_daily_dispatch_pdf,
        generate_delivery_performance_excel,
        generate_parcel_csv,
        generate_rider_performance_pdf,
    )

    try:
        if report_type == "daily_dispatch":
            return generate_daily_dispatch_pdf()
        elif report_type == "rider_performance":
            return generate_rider_performance_pdf()
        elif report_type == "parcel_csv":
            return generate_parcel_csv(kwargs.get("start_date"), kwargs.get("end_date"))
        elif report_type == "delivery_excel":
            return generate_delivery_performance_excel(
                kwargs.get("start_date"), kwargs.get("end_date")
            )
        else:
            raise ValueError(f"Unknown report type: {report_type}")
    except Exception as e:
        logger.error("Report generation failed: %s", e)
        raise


@shared_task
def send_notification_task(recipient_email: str, subject: str, message: str):
    """
    Async task for sending email notifications.
    Uses Django's console email backend for development.
    """
    from django.core.mail import EmailMessage

    try:
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=None,  # Uses DEFAULT_FROM_EMAIL
            to=[recipient_email],
        )
        email.send()
        logger.info("Notification sent to %s: %s", recipient_email, subject)
    except Exception as e:
        logger.error("Failed to send notification to %s: %s", recipient_email, e)
        raise


def run_assignment_task():
    """
    Run the rider assignment engine, honoring the USE_CELERY setting.

    When USE_CELERY is True (default), dispatches run_daily_assignment as a
    Celery task. When False, runs the engine synchronously so the app works
    without Redis/Celery running (e.g. Render free tier).
    """
    if getattr(settings, "USE_CELERY", True):
        return run_daily_assignment.delay()
    return _run_sync(run_daily_assignment)


def generate_report(report_type: str, **kwargs):
    """
    Generate a report, honoring the USE_CELERY setting.

    When USE_CELERY is True, dispatches generate_report_task as a Celery task.
    When False, runs the report generation synchronously.
    """
    if getattr(settings, "USE_CELERY", True):
        return generate_report_task.delay(report_type, **kwargs)
    return _run_sync(generate_report_task, report_type, **kwargs)


def send_notification(recipient_email: str, subject: str, message: str):
    """
    Send a notification, honoring the USE_CELERY setting.

    When USE_CELERY is True, dispatches send_notification_task as a Celery task.
    When False, sends synchronously.
    """
    if getattr(settings, "USE_CELERY", True):
        return send_notification_task.delay(recipient_email, subject, message)
    return _run_sync(send_notification_task, recipient_email, subject, message)
