"""
Dashboard API Routes
"""
from django.urls import path
from flask import Blueprint, request, jsonify
from datetime import datetime
from .service import DashboardService
from .models import User, UserRole, ActivityType, SystemMetrics
from . import service  # Ensure your service.py/views.py is imported here

# Create blueprint
dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')
dashboard_service = DashboardService()
urlpatterns = [
    # Map the path (e.g., /api/dashboard/) to a function in your service
    path('', service.get_dashboard_data, name='dashboard-data'),
]


@dashboard_bp.route('/summary', methods=['GET'])
def get_summary():
    """Get dashboard summary"""
    try:
        summary = dashboard_service.get_dashboard_summary()
        return jsonify({
            'success': True,
            'data': summary
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@dashboard_bp.route('/users', methods=['GET'])
def list_users():
    """List all users"""
    try:
        role = request.args.get('role')
        users = dashboard_service.list_users(
            role=UserRole(role) if role else None
        )
        return jsonify({
            'success': True,
            'data': [u.to_dict() for u in users]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@dashboard_bp.route('/users', methods=['POST'])
def create_user():
    """Create new user"""
    try:
        data = request.get_json()
        user = User(
            id=data.get('id'),
            username=data.get('username'),
            email=data.get('email'),
            role=UserRole(data.get('role', 'user')),
            created_at=datetime.now()
        )
        success = dashboard_service.add_user(user)
        return jsonify({
            'success': success,
            'data': user.to_dict() if success else None,
            'message': 'User created' if success else 'User already exists'
        }), 201 if success else 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@dashboard_bp.route('/users/<user_id>', methods=['GET'])
def get_user(user_id):
    """Get user by ID"""
    try:
        user = dashboard_service.get_user(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        return jsonify({
            'success': True,
            'data': user.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@dashboard_bp.route('/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    """Update user"""
    try:
        data = request.get_json()
        success = dashboard_service.update_user(user_id, **data)
        if not success:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        user = dashboard_service.get_user(user_id)
        return jsonify({
            'success': True,
            'data': user.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@dashboard_bp.route('/users/<user_id>/deactivate', methods=['POST'])
def deactivate_user(user_id):
    """Deactivate user"""
    try:
        success = dashboard_service.deactivate_user(user_id)
        if not success:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        return jsonify({
            'success': True,
            'message': 'User deactivated'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@dashboard_bp.route('/activities', methods=['GET'])
def get_activities():
    """Get recent activities"""
    try:
        limit = request.args.get('limit', 10, type=int)
        activities = dashboard_service.get_recent_activities(limit)
        return jsonify({
            'success': True,
            'data': [a.to_dict() for a in activities]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@dashboard_bp.route('/activities/user/<user_id>', methods=['GET'])
def get_user_activities(user_id):
    """Get activities for specific user"""
    try:
        limit = request.args.get('limit', 50, type=int)
        activities = dashboard_service.get_activities_by_user(user_id, limit)
        return jsonify({
            'success': True,
            'data': [a.to_dict() for a in activities]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@dashboard_bp.route('/activities/summary', methods=['GET'])
def get_activity_summary():
    """Get activity summary"""
    try:
        days = request.args.get('days', 7, type=int)
        summary = dashboard_service.get_activity_summary(days)
        return jsonify({
            'success': True,
            'data': summary
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@dashboard_bp.route('/metrics', methods=['POST'])
def update_metrics():
    """Update system metrics"""
    try:
        data = request.get_json()
        metrics = SystemMetrics(
            total_users=data.get('total_users', 0),
            active_users=data.get('active_users', 0),
            total_documents=data.get('total_documents', 0),
            total_signatures=data.get('total_signatures', 0),
            documents_pending=data.get('documents_pending', 0),
            system_uptime_hours=data.get('system_uptime_hours', 0.0),
            avg_signature_time_seconds=data.get('avg_signature_time_seconds', 0.0),
            timestamp=datetime.now()
        )
        dashboard_service.update_metrics(metrics)
        return jsonify({
            'success': True,
            'data': metrics.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@dashboard_bp.route('/reports', methods=['POST'])
def generate_report():
    """Generate a report"""
    try:
        data = request.get_json()
        report = dashboard_service.generate_report(
            title=data.get('title'),
            report_type=data.get('report_type'),
            created_by=data.get('created_by'),
            data=data.get('data', {}),
            filters=data.get('filters')
        )
        return jsonify({
            'success': True,
            'data': report.to_dict()
        }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@dashboard_bp.route('/health', methods=['GET'])
def health_check():
    """System health check"""
    try:
        health = dashboard_service.get_system_health()
        return jsonify({
            'success': True,
            'data': health
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
