"""
Management Service for System Administration
"""
from typing import Dict, List, Optional
from .models import Permission, Role, Configuration, BackupConfig, SecurityPolicy, PermissionType


class ManagementService:
    """Service for system management operations"""
    
    def __init__(self):
        """Initialize management service"""
        self.permissions: Dict[str, Permission] = {}
        self.roles: Dict[str, Role] = {}
        self.configurations: Dict[str, Configuration] = {}
        self.backup_configs: Dict[str, BackupConfig] = {}
        self.security_policies: Dict[str, SecurityPolicy] = {}
        self._initialize_default_roles()
    
    def _initialize_default_roles(self) -> None:
        """Initialize default system roles"""
        admin_perms = self._create_default_permissions()
        
        # Admin role - all permissions
        admin_role = Role(
            id="role_admin",
            name="Administrator",
            description="Full system access",
            permissions=[p for p in admin_perms.keys()]
        )
        self.roles[admin_role.id] = admin_role
        
        # Manager role - limited admin
        manager_role = Role(
            id="role_manager",
            name="Manager",
            description="User and document management",
            permissions=[p for p in admin_perms.keys() if p not in ["perm_system_config", "perm_security"]]
        )
        self.roles[manager_role.id] = manager_role
        
        # User role - basic operations
        user_role = Role(
            id="role_user",
            name="User",
            description="Basic user operations",
            permissions=["perm_read_documents", "perm_write_documents", "perm_sign"]
        )
        self.roles[user_role.id] = user_role
    
    def _create_default_permissions(self) -> Dict[str, Permission]:
        """Create default system permissions"""
        permissions = {
            "perm_read_documents": Permission(
                id="perm_read_documents",
                name="Read Documents",
                description="Read document contents",
                permission_type=PermissionType.READ,
                resource="documents"
            ),
            "perm_write_documents": Permission(
                id="perm_write_documents",
                name="Write Documents",
                description="Create and modify documents",
                permission_type=PermissionType.WRITE,
                resource="documents"
            ),
            "perm_delete_documents": Permission(
                id="perm_delete_documents",
                name="Delete Documents",
                description="Delete documents",
                permission_type=PermissionType.DELETE,
                resource="documents"
            ),
            "perm_sign": Permission(
                id="perm_sign",
                name="Sign Documents",
                description="Digitally sign documents",
                permission_type=PermissionType.EXECUTE,
                resource="documents"
            ),
            "perm_manage_users": Permission(
                id="perm_manage_users",
                name="Manage Users",
                description="Create, modify, delete users",
                permission_type=PermissionType.ADMIN,
                resource="users"
            ),
            "perm_system_config": Permission(
                id="perm_system_config",
                name="System Configuration",
                description="Modify system configuration",
                permission_type=PermissionType.ADMIN,
                resource="system"
            ),
            "perm_security": Permission(
                id="perm_security",
                name="Security Management",
                description="Manage security policies",
                permission_type=PermissionType.ADMIN,
                resource="security"
            ),
            "perm_view_reports": Permission(
                id="perm_view_reports",
                name="View Reports",
                description="Access system reports",
                permission_type=PermissionType.READ,
                resource="reports"
            ),
            "perm_manage_backups": Permission(
                id="perm_manage_backups",
                name="Manage Backups",
                description="Configure and execute backups",
                permission_type=PermissionType.ADMIN,
                resource="backups"
            )
        }
        self.permissions = permissions
        return permissions
    
    def get_role(self, role_id: str) -> Optional[Role]:
        """Get role by ID"""
        return self.roles.get(role_id)
    
    def list_roles(self) -> List[Role]:
        """List all roles"""
        return list(self.roles.values())
    
    def create_role(self, role: Role) -> bool:
        """Create new role"""
        if role.id in self.roles:
            return False
        self.roles[role.id] = role
        return True
    
    def update_role(self, role_id: str, **kwargs) -> bool:
        """Update role"""
        if role_id not in self.roles:
            return False
        
        role = self.roles[role_id]
        for key, value in kwargs.items():
            if hasattr(role, key):
                setattr(role, key, value)
        
        return True
    
    def delete_role(self, role_id: str) -> bool:
        """Delete role"""
        if role_id not in self.roles or role_id.startswith("role_"):
            # Prevent deletion of default roles
            return False
        del self.roles[role_id]
        return True
    
    def get_permission(self, permission_id: str) -> Optional[Permission]:
        """Get permission by ID"""
        return self.permissions.get(permission_id)
    
    def list_permissions(self) -> List[Permission]:
        """List all permissions"""
        return list(self.permissions.values())
    
    def set_configuration(self, config: Configuration) -> bool:
        """Set system configuration"""
        self.configurations[config.id] = config
        return True
    
    def get_configuration(self, config_id: str) -> Optional[Configuration]:
        """Get configuration"""
        return self.configurations.get(config_id)
    
    def list_configurations(self, category: Optional[str] = None) -> List[Configuration]:
        """List configurations with optional category filter"""
        configs = list(self.configurations.values())
        if category:
            configs = [c for c in configs if c.category == category]
        return configs
    
    def update_backup_config(self, backup_config: BackupConfig) -> bool:
        """Update backup configuration"""
        self.backup_configs[backup_config.id] = backup_config
        return True
    
    def get_backup_config(self, config_id: str) -> Optional[BackupConfig]:
        """Get backup configuration"""
        return self.backup_configs.get(config_id)
    
    def list_backup_configs(self) -> List[BackupConfig]:
        """List all backup configurations"""
        return list(self.backup_configs.values())
    
    def update_security_policy(self, policy: SecurityPolicy) -> bool:
        """Update security policy"""
        self.security_policies[policy.id] = policy
        return True
    
    def get_security_policy(self, policy_id: str) -> Optional[SecurityPolicy]:
        """Get security policy"""
        return self.security_policies.get(policy_id)
    
    def list_security_policies(self) -> List[SecurityPolicy]:
        """List all security policies"""
        return list(self.security_policies.values())
    
    def validate_password(self, password: str, policy: SecurityPolicy) -> tuple[bool, str]:
        """Validate password against security policy"""
        if len(password) < policy.password_min_length:
            return False, f"Password must be at least {policy.password_min_length} characters"
        
        if policy.password_require_uppercase and not any(c.isupper() for c in password):
            return False, "Password must contain uppercase letters"
        
        if policy.password_require_numbers and not any(c.isdigit() for c in password):
            return False, "Password must contain numbers"
        
        if policy.password_require_special and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            return False, "Password must contain special characters"
        
        return True, "Password is valid"
    
    def get_system_summary(self) -> Dict:
        """Get system management summary"""
        return {
            'total_roles': len(self.roles),
            'total_permissions': len(self.permissions),
            'total_configurations': len(self.configurations),
            'backup_configs': len(self.backup_configs),
            'security_policies': len(self.security_policies),
            'roles': [r.to_dict() for r in self.roles.values()],
            'permissions': [p.to_dict() for p in self.permissions.values()]
        }
