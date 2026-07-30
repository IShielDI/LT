import csv
import io
import logging
from datetime import datetime, timedelta
from typing import List, Tuple

from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone

from dispatch.models import Assignment, AssignmentStatus
from parcels.models import Parcel, ParcelStatus
from riders.models import Rider

logger = logging.getLogger("delivery_hub.reports.services")


def generate_daily_dispatch_pdf() -> bytes:
    """
    Generate a PDF daily dispatch summary report.
    Returns PDF bytes.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import (
        SimpleDocTemplate,
        Table,
        TableStyle,
        Paragraph,
        Spacer,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph("Daily Dispatch Summary", styles["Title"]))
    elements.append(
        Paragraph(
            f"Date: {timezone.now().strftime('%Y-%m-%d %H:%M')}",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 20))

    # Summary stats
    today = timezone.now().date()
    parcels_today = Parcel.objects.filter(created_at__date=today)
    total = parcels_today.count()
    delivered = parcels_today.filter(status=ParcelStatus.DELIVERED).count()
    failed = parcels_today.filter(status=ParcelStatus.FAILED).count()
    in_transit = parcels_today.filter(status=ParcelStatus.IN_TRANSIT).count()

    summary_data = [
        ["Metric", "Count"],
        ["Total Parcels Today", str(total)],
        ["Delivered", str(delivered)],
        ["Failed", str(failed)],
        ["In Transit", str(in_transit)],
    ]
    summary_table = Table(summary_data, colWidths=[200, 100])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 12),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ]
        )
    )
    elements.append(summary_table)
    elements.append(Spacer(1, 20))

    # Parcel details
    elements.append(Paragraph("Parcel Details", styles["Heading2"]))
    parcel_data = [["Tracking ID", "Receiver", "Zone", "Priority", "Status"]]
    for parcel in parcels_today[:50]:
        parcel_data.append(
            [
                str(parcel.tracking_id)[:12] + "...",
                parcel.receiver_name,
                parcel.zone.name if parcel.zone else "N/A",
                parcel.priority,
                parcel.status,
            ]
        )

    parcel_table = Table(parcel_data, colWidths=[120, 120, 100, 80, 100])
    parcel_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ]
        )
    )
    elements.append(parcel_table)

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def generate_rider_performance_pdf() -> bytes:
    """
    Generate a PDF rider performance report.
    Returns PDF bytes.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import (
        SimpleDocTemplate,
        Table,
        TableStyle,
        Paragraph,
        Spacer,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("Rider Performance Report", styles["Title"]))
    elements.append(
        Paragraph(
            f"Generated: {timezone.now().strftime('%Y-%m-%d %H:%M')}",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 20))

    riders = Rider.objects.select_related("user", "zone").all()

    data = [["Rider", "Zone", "Capacity", "Current Load", "Delivered", "Failed"]]
    for rider in riders:
        delivered = Assignment.objects.filter(
            rider=rider, status=AssignmentStatus.DELIVERED
        ).count()
        failed = Assignment.objects.filter(
            rider=rider, status=AssignmentStatus.FAILED
        ).count()
        data.append(
            [
                rider.user.get_full_name() or rider.user.username,
                rider.zone.name if rider.zone else "N/A",
                str(rider.capacity),
                str(rider.current_load),
                str(delivered),
                str(failed),
            ]
        )

    table = Table(data, colWidths=[120, 100, 80, 90, 80, 80])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ]
        )
    )
    elements.append(table)

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def generate_parcel_csv(
    start_date: str | None = None, end_date: str | None = None
) -> bytes:
    """
    Generate a CSV export of parcels with optional date filters.
    Returns CSV bytes.
    """
    queryset = Parcel.objects.select_related("zone").all()

    if start_date:
        queryset = queryset.filter(created_at__date__gte=start_date)
    if end_date:
        queryset = queryset.filter(created_at__date__lte=end_date)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "Tracking ID",
            "Sender Name",
            "Receiver Name",
            "Receiver Phone",
            "Pincode",
            "Zone",
            "Priority",
            "Weight",
            "Status",
            "Created At",
        ]
    )

    for parcel in queryset:
        writer.writerow(
            [
                str(parcel.tracking_id),
                parcel.sender_name,
                parcel.receiver_name,
                parcel.receiver_phone,
                parcel.pincode,
                parcel.zone.name if parcel.zone else "",
                parcel.priority,
                str(parcel.weight),
                parcel.status,
                parcel.created_at.strftime("%Y-%m-%d %H:%M"),
            ]
        )

    csv_bytes = buffer.getvalue().encode("utf-8")
    buffer.close()
    return csv_bytes


def generate_delivery_performance_excel(
    start_date: str | None = None, end_date: str | None = None
) -> bytes:
    """
    Generate an Excel export of delivery performance over a date range.
    Returns Excel bytes.
    """
    import pandas as pd

    queryset = Assignment.objects.select_related(
        "parcel", "rider__user"
    ).all()

    if start_date:
        queryset = queryset.filter(assigned_at__date__gte=start_date)
    if end_date:
        queryset = queryset.filter(assigned_at__date__lte=end_date)

    data: List[dict] = []
    for assignment in queryset:
        data.append(
            {
                "Assignment ID": assignment.id,
                "Parcel Tracking ID": str(assignment.parcel.tracking_id),
                "Rider": assignment.rider.user.get_full_name()
                or assignment.rider.user.username,
                "Status": assignment.status,
                "Assigned At": assignment.assigned_at.strftime("%Y-%m-%d %H:%M"),
            }
        )

    df = pd.DataFrame(data)
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Delivery Performance", index=False)
    excel_bytes = buffer.getvalue()
    buffer.close()
    return excel_bytes