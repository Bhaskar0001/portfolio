/**
 * RBAC Permission Map
 * Maps permissions to the roles that have them.
 */
const PERMISSIONS = {
    // Client management
    'CLIENT:READ': ['Client', 'Staff', 'Reviewer', 'Partner', 'TenantAdmin', 'SuperAdmin'],
    'CLIENT:WRITE': ['Staff', 'Partner', 'TenantAdmin', 'SuperAdmin'],
    'CLIENT:DELETE': ['TenantAdmin', 'SuperAdmin'],

    // Notice management
    'NOTICE:READ': ['Client', 'Staff', 'Reviewer', 'Partner', 'TenantAdmin', 'SuperAdmin'],
    'NOTICE:WRITE': ['Staff', 'Partner', 'TenantAdmin', 'SuperAdmin'],
    'NOTICE:ASSIGN': ['Partner', 'TenantAdmin', 'SuperAdmin'],
    'NOTICE:DELETE': ['TenantAdmin', 'SuperAdmin'],

    // Response Studio
    'RESPONSE:READ': ['Client', 'Staff', 'Reviewer', 'Partner', 'TenantAdmin', 'SuperAdmin'],
    'RESPONSE:WRITE': ['Staff', 'Partner', 'TenantAdmin', 'SuperAdmin'],
    'RESPONSE:DRAFT': ['Staff', 'Partner', 'TenantAdmin'],
    'RESPONSE:REVIEW': ['Reviewer', 'Partner', 'TenantAdmin', 'SuperAdmin'],
    'RESPONSE:APPROVE': ['Partner', 'TenantAdmin'],

    // Documents
    'DOCUMENT:READ': ['Client', 'Staff', 'Reviewer', 'Partner', 'TenantAdmin', 'SuperAdmin'],
    'DOCUMENT:UPLOAD': ['Client', 'Staff', 'Partner', 'TenantAdmin', 'SuperAdmin'],
    'DOCUMENT:DELETE': ['Partner', 'TenantAdmin', 'SuperAdmin'],

    // Admin
    'ADMIN:USERS': ['TenantAdmin', 'SuperAdmin'],
    'ADMIN:TEMPLATES': ['TenantAdmin', 'SuperAdmin'],
    'ADMIN:SETTINGS': ['TenantAdmin', 'SuperAdmin'],
    'ADMIN:REPORTS': ['Partner', 'TenantAdmin', 'SuperAdmin'],

    // Super Admin
    'SUPER:TENANTS': ['SuperAdmin'],
    'SUPER:ALL': ['SuperAdmin'],
};

const ROLES = ['Client', 'Staff', 'Reviewer', 'Partner', 'TenantAdmin', 'SuperAdmin'];

/**
 * Check if any of the user's roles has the given permission
 */
const hasPermission = (userRoles, permission) => {
    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) return false;
    return userRoles.some(role => allowedRoles.includes(role));
};

module.exports = { PERMISSIONS, ROLES, hasPermission };
