"""
Management Models for System Configuration and Permissions
"""
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
from enum import Enum


class PermissionType(Enum):
    """Available permissions"""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    EXECUTE = "execute"
    ADMIN = "admin"


@dataclass
class Permission:
    """Permission model"""
    id: str
    name: str
    description: str
    permission_type: PermissionType
    resource: str  # e.g., 'documents', 'users', 'reports'
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        data = asdict(self)
        data['permission_type'] = self.permission_type.value
        return data


@dataclass
class Role:
    """Role model with permissions"""
    id: str
    name: str
    description: str
    permissions: List[str]  # Permission IDs
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class Configuration:
    """System configuration model"""
    id: str
    key: str
    value: str
    category: str
    description: str
    is_secret: bool = False
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'key': self.key,
            'value': '***' if self.is_secret else self.value,
            'category': self.category,
            'description': self.description,
            'is_secret': self.is_secret
        }


@dataclass
class BackupConfig:
    """Backup configuration"""
    id: str
    name: str
    frequency: str  # 'hourly', 'daily', 'weekly', 'monthly'
    retention_days: int
    backup_location: str
    is_enabled: bool = True
    last_backup: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class SecurityPolicy:
    """Security policy configuration"""
    id: str
    name: str
    password_min_length: int = 8
    password_require_uppercase: bool = True
    password_require_numbers: bool = True
    password_require_special: bool = True
    password_expiry_days: int = 90
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    session_timeout_minutes: int = 30
    require_mfa: bool = False
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return asdict(self)
