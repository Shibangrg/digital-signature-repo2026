"""
Dashboard Service for Business Logic
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from .models import User, Activity, SystemMetrics, Report, UserRole, ActivityType


class DashboardService:
    """Service for dashboard operations"""
    
    def __init__(self):
        """Initialize dashboard service"""
        self.users: Dict[str, User] = {}
        self.activities: List[Activity] = []
        self.metrics: Optional[SystemMetrics] = None
    
    def get_dashboard_summary(self) -> Dict:
        """Get dashboard summary data"""
        return {
            'metrics': self.metrics.to_dict() if self.metrics else None,
            'recent_activities': [a.to_dict() for a in self.get_recent_activities(10)],
            'user_stats': self.get_user_stats(),
            'system_health': self.get_system_health()
        }
    
    def get_user_stats(self) -> Dict:
        """Get user statistics"""
        total_users = len(self.users)
        active_users = sum(1 for u in self.users.values() if u.is_active)
        
        roles_count = {}
        for user in self.users.values():
            role = user.role.value
            roles_count[role] = roles_count.get(role, 0) + 1
        
        return {
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': total_users - active_users,
            'by_role': roles_count
        }
    
    def get_system_health(self) -> Dict:
        """Get system health status"""
        return {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'checks': {
                'database': 'connected',
                'authentication': 'operational',
                'file_storage': 'operational',
                'api': 'operational'
            }
        }
    
    def add_user(self, user: User) -> bool:
        """Add new user"""
        if user.id in self.users:
            return False
        self.users[user.id] = user
        self.log_activity(
            user_id=user.id,
            activity_type=ActivityType.USER_MANAGEMENT,
            description=f"User {user.username} created with role {user.role.value}"
        )
        return True
    
    def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.users.get(user_id)
    
    def update_user(self, user_id: str, **kwargs) -> bool:
        """Update user information"""
        if user_id not in self.users:
            return False
        
        user = self.users[user_id]
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        return True
    
    def deactivate_user(self, user_id: str) -> bool:
        """Deactivate user"""
        if user_id not in self.users:
            return False
        self.users[user_id].is_active = False
        self.log_activity(
            user_id=user_id,
            activity_type=ActivityType.USER_MANAGEMENT,
            description=f"User {user_id} deactivated"
        )
        return True
    
    def list_users(self, role: Optional[UserRole] = None) -> List[User]:
        """List users with optional role filter"""
        users = list(self.users.values())
        if role:
            users = [u for u in users if u.role == role]
        return users
    
    def log_activity(self, user_id: str, activity_type: ActivityType, 
                    description: str, metadata: Dict = None) -> Activity:
        """Log system activity"""
        activity = Activity(
            id=f"act_{len(self.activities) + 1}",
            user_id=user_id,
            activity_type=activity_type,
            description=description,
            timestamp=datetime.now(),
            metadata=metadata or {}
        )
        self.activities.append(activity)
        return activity
    
    def get_recent_activities(self, limit: int = 10) -> List[Activity]:
        """Get recent activities"""
        return sorted(
            self.activities,
            key=lambda a: a.timestamp,
            reverse=True
        )[:limit]
    
    def get_activities_by_user(self, user_id: str, limit: int = 50) -> List[Activity]:
        """Get activities for specific user"""
        user_activities = [a for a in self.activities if a.user_id == user_id]
        return sorted(
            user_activities,
            key=lambda a: a.timestamp,
            reverse=True
        )[:limit]
    
    def get_activities_by_type(self, activity_type: ActivityType) -> List[Activity]:
        """Get activities by type"""
        return [a for a in self.activities if a.activity_type == activity_type]
    
    def update_metrics(self, metrics: SystemMetrics) -> None:
        """Update system metrics"""
        self.metrics = metrics
    
    def generate_report(self, title: str, report_type: str, 
                       created_by: str, data: Dict, 
                       filters: Dict = None) -> Report:
        """Generate a report"""
        report = Report(
            id=f"rpt_{len(self.activities) + 1}",
            title=title,
            report_type=report_type,
            created_by=created_by,
            created_at=datetime.now(),
            data=data,
            filters=filters
        )
        self.log_activity(
            user_id=created_by,
            activity_type=ActivityType.REPORT_GENERATED,
            description=f"Report '{title}' generated",
            metadata={'report_id': report.id}
        )
        return report
    
    def get_activity_summary(self, days: int = 7) -> Dict:
        """Get activity summary for last N days"""
        cutoff_date = datetime.now() - timedelta(days=days)
        recent_activities = [a for a in self.activities if a.timestamp >= cutoff_date]
        
        summary = {}
        for activity in recent_activities:
            activity_type = activity.activity_type.value
            summary[activity_type] = summary.get(activity_type, 0) + 1
        
        return summary
