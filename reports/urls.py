from django.urls import path

from .views import (
    DailyDispatchReportView,
    DeliveryPerformanceExcelView,
    ParcelCSVExportView,
    RiderPerformanceReportView,
)

urlpatterns = [
    path("daily-dispatch/", DailyDispatchReportView.as_view(), name="daily-dispatch"),
    path("rider-performance/", RiderPerformanceReportView.as_view(), name="rider-performance"),
    path("parcel-csv/", ParcelCSVExportView.as_view(), name="parcel-csv"),
    path("delivery-excel/", DeliveryPerformanceExcelView.as_view(), name="delivery-excel"),
]