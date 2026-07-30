from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsAdminOrHubManager

from .services import (
    generate_daily_dispatch_pdf,
    generate_delivery_performance_excel,
    generate_parcel_csv,
    generate_rider_performance_pdf,
)


class DailyDispatchReportView(APIView):
    """Generate and download a daily dispatch summary PDF."""

    permission_classes = [IsAuthenticated, IsAdminOrHubManager]

    def get(self, request):
        pdf_bytes = generate_daily_dispatch_pdf()
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="daily_dispatch.pdf"'
        return response


class RiderPerformanceReportView(APIView):
    """Generate and download a rider performance PDF."""

    permission_classes = [IsAuthenticated, IsAdminOrHubManager]

    def get(self, request):
        pdf_bytes = generate_rider_performance_pdf()
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="rider_performance.pdf"'
        return response


class ParcelCSVExportView(APIView):
    """Export parcel list as CSV with optional date filters."""

    permission_classes = [IsAuthenticated, IsAdminOrHubManager]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        csv_bytes = generate_parcel_csv(start_date, end_date)
        response = HttpResponse(csv_bytes, content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="parcels.csv"'
        return response


class DeliveryPerformanceExcelView(APIView):
    """Export delivery performance as Excel with optional date filters."""

    permission_classes = [IsAuthenticated, IsAdminOrHubManager]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        excel_bytes = generate_delivery_performance_excel(start_date, end_date)
        response = HttpResponse(
            excel_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="delivery_performance.xlsx"'
        return response