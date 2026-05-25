"""
Dashboard Models for System Management
"""
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class UserRole(Enum):
    """User role types"""
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    VIEWER = "viewer"


class ActivityType(Enum):
    """Types of system activities"""
    USER_LOGIN = "user_login"
    DOCUMENT_UPLOAD = "document_upload"
    SIGNATURE_CREATED = "signature_created"
    SIGNATURE_VERIFIED = "signature_verified"
    SYSTEM_CONFIG = "system_config"
    USER_MANAGEMENT = "user_management"
    REPORT_GENERATED = "report_generated"


@dataclass
class User:
    """User model"""
    id: str
    username: str
    email: str
    role: UserRole
    created_at: datetime
    last_login: Optional[datetime] = None
    is_active: bool = True
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        data = asdict(self)
        data['role'] = self.role.value
        data['created_at'] = self.created_at.isoformat()
        data['last_login'] = self.last_login.isoformat() if self.last_login else None
        return data


@dataclass
class Activity:
    """Activity log model"""
    id: str
    user_id: str
    activity_type: ActivityType
    description: str
    timestamp: datetime
    metadata: Dict = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        data = asdict(self)
        data['activity_type'] = self.activity_type.value
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class SystemMetrics:
    """System metrics model"""
    total_users: int
    active_users: int
    total_documents: int
    total_signatures: int
    documents_pending: int
    system_uptime_hours: float
    avg_signature_time_seconds: float
    timestamp: datetime
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'total_users': self.total_users,
            'active_users': self.active_users,
            'total_documents': self.total_documents,
            'total_signatures': self.total_signatures,
            'documents_pending': self.documents_pending,
            'system_uptime_hours': self.system_uptime_hours,
            'avg_signature_time_seconds': self.avg_signature_time_seconds,
            'timestamp': self.timestamp.isoformat()
        }


@dataclass
class Report:
    """Report model"""
    id: str
    title: str
    report_type: str
    created_by: str
    created_at: datetime
    data: Dict
    filters: Dict = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'report_type': self.report_type,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat(),
            'data': self.data,
            'filters': self.filters
        }
