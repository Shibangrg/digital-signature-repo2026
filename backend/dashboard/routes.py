"""backend.dashboard.routes

Django URLConf for dashboard APIs.

Note: This project previously contained Flask blueprint-style routes that were
not wired into Django, causing `/api/dashboard/summary` (and others) to fail.
This file defines proper Django views.
"""

from datetime import datetime

from django.http import JsonResponse
from django.urls import path
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt

from .models import SystemMetrics, User, UserRole
from .service import DashboardService

dashboard_service = DashboardService()


@require_GET
def get_summary(request):
    """GET /api/dashboard/summary"""
    summary = dashboard_service.get_dashboard_summary()
    return JsonResponse({"success": True, "data": summary}, status=200)



@require_GET
def list_users(request):
    """GET /api/dashboard/users?role=..."""
    role = request.GET.get("role")
    users = dashboard_service.list_users(role=UserRole(role) if role else None)
    return JsonResponse(
        {"success": True, "data": [u.to_dict() for u in users]},
        status=200,
    )


@csrf_exempt
@require_POST
def create_user(request):
    import json

    payload = json.loads(request.body.decode("utf-8") or "{}")
    user = User(
        id=payload.get("id"),
        username=payload.get("username"),
        email=payload.get("email"),
        role=UserRole(payload.get("role", "user")),
        created_at=datetime.now(),
    )
    success = dashboard_service.add_user(user)
    return JsonResponse(
        {
            "success": success,
            "data": user.to_dict() if success else None,
            "message": "User created" if success else "User already exists",
        },
        status=201 if success else 400,
    )


urlpatterns = [
    path("summary", get_summary, name="dashboard-summary"),
    path("users", list_users, name="dashboard-users"),
    path("users", create_user, name="dashboard-create-user"),
]




