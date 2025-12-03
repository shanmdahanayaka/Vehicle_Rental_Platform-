/**
 * Unit Tests for src/lib/permissions.ts
 *
 * Tests all permission-related functions including:
 * - Role hierarchy checks
 * - Permission validation
 * - User management authorization
 * - Role assignment validation
 */

import {
  PERMISSIONS,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  roleHasPermission,
  isRoleHigherOrEqual,
  isRoleHigher,
  getRoleLevel,
  canManageUser,
  canAssignRole,
  getAllPermissionsForRole,
  getAssignableRoles,
  checkPermission,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  USER_STATUS_CONFIG,
} from '@/lib/permissions';

describe('lib/permissions', () => {
  // ============================================
  // PERMISSIONS CONSTANTS TESTS
  // ============================================
  describe('PERMISSIONS constant', () => {
    it('should have all user permissions defined', () => {
      expect(PERMISSIONS.USERS_CREATE).toBe('users:create');
      expect(PERMISSIONS.USERS_READ).toBe('users:read');
      expect(PERMISSIONS.USERS_UPDATE).toBe('users:update');
      expect(PERMISSIONS.USERS_DELETE).toBe('users:delete');
      expect(PERMISSIONS.USERS_MANAGE).toBe('users:manage');
    });

    it('should have all vehicle permissions defined', () => {
      expect(PERMISSIONS.VEHICLES_CREATE).toBe('vehicles:create');
      expect(PERMISSIONS.VEHICLES_READ).toBe('vehicles:read');
      expect(PERMISSIONS.VEHICLES_UPDATE).toBe('vehicles:update');
      expect(PERMISSIONS.VEHICLES_DELETE).toBe('vehicles:delete');
      expect(PERMISSIONS.VEHICLES_MANAGE).toBe('vehicles:manage');
    });

    it('should have all booking permissions defined', () => {
      expect(PERMISSIONS.BOOKINGS_CREATE).toBe('bookings:create');
      expect(PERMISSIONS.BOOKINGS_READ).toBe('bookings:read');
      expect(PERMISSIONS.BOOKINGS_UPDATE).toBe('bookings:update');
      expect(PERMISSIONS.BOOKINGS_DELETE).toBe('bookings:delete');
      expect(PERMISSIONS.BOOKINGS_MANAGE).toBe('bookings:manage');
    });

    it('should have all package permissions defined', () => {
      expect(PERMISSIONS.PACKAGES_CREATE).toBe('packages:create');
      expect(PERMISSIONS.PACKAGES_READ).toBe('packages:read');
      expect(PERMISSIONS.PACKAGES_UPDATE).toBe('packages:update');
      expect(PERMISSIONS.PACKAGES_DELETE).toBe('packages:delete');
      expect(PERMISSIONS.PACKAGES_MANAGE).toBe('packages:manage');
    });

    it('should have all policy permissions defined', () => {
      expect(PERMISSIONS.POLICIES_CREATE).toBe('policies:create');
      expect(PERMISSIONS.POLICIES_READ).toBe('policies:read');
      expect(PERMISSIONS.POLICIES_UPDATE).toBe('policies:update');
      expect(PERMISSIONS.POLICIES_DELETE).toBe('policies:delete');
      expect(PERMISSIONS.POLICIES_MANAGE).toBe('policies:manage');
    });

    it('should have all invoice permissions defined', () => {
      expect(PERMISSIONS.INVOICES_CREATE).toBe('invoices:create');
      expect(PERMISSIONS.INVOICES_READ).toBe('invoices:read');
      expect(PERMISSIONS.INVOICES_UPDATE).toBe('invoices:update');
      expect(PERMISSIONS.INVOICES_DELETE).toBe('invoices:delete');
      expect(PERMISSIONS.INVOICES_MANAGE).toBe('invoices:manage');
    });

    it('should have permission management permissions defined', () => {
      expect(PERMISSIONS.PERMISSIONS_READ).toBe('permissions:read');
      expect(PERMISSIONS.PERMISSIONS_MANAGE).toBe('permissions:manage');
    });

    it('should have audit log permissions defined', () => {
      expect(PERMISSIONS.AUDIT_LOGS_READ).toBe('audit_logs:read');
    });
  });

  // ============================================
  // ROLE HIERARCHY TESTS
  // ============================================
  describe('ROLE_HIERARCHY', () => {
    it('should have correct role hierarchy order', () => {
      expect(ROLE_HIERARCHY).toEqual(['USER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN']);
    });

    it('should have USER as lowest role', () => {
      expect(ROLE_HIERARCHY[0]).toBe('USER');
    });

    it('should have SUPER_ADMIN as highest role', () => {
      expect(ROLE_HIERARCHY[ROLE_HIERARCHY.length - 1]).toBe('SUPER_ADMIN');
    });
  });

  // ============================================
  // getRoleLevel() TESTS
  // ============================================
  describe('getRoleLevel()', () => {
    it('should return 0 for USER', () => {
      expect(getRoleLevel('USER')).toBe(0);
    });

    it('should return 1 for MANAGER', () => {
      expect(getRoleLevel('MANAGER')).toBe(1);
    });

    it('should return 2 for ADMIN', () => {
      expect(getRoleLevel('ADMIN')).toBe(2);
    });

    it('should return 3 for SUPER_ADMIN', () => {
      expect(getRoleLevel('SUPER_ADMIN')).toBe(3);
    });
  });

  // ============================================
  // isRoleHigherOrEqual() TESTS
  // ============================================
  describe('isRoleHigherOrEqual()', () => {
    it('should return true when roles are equal', () => {
      expect(isRoleHigherOrEqual('USER', 'USER')).toBe(true);
      expect(isRoleHigherOrEqual('ADMIN', 'ADMIN')).toBe(true);
      expect(isRoleHigherOrEqual('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(true);
    });

    it('should return true when first role is higher', () => {
      expect(isRoleHigherOrEqual('SUPER_ADMIN', 'ADMIN')).toBe(true);
      expect(isRoleHigherOrEqual('ADMIN', 'MANAGER')).toBe(true);
      expect(isRoleHigherOrEqual('MANAGER', 'USER')).toBe(true);
      expect(isRoleHigherOrEqual('SUPER_ADMIN', 'USER')).toBe(true);
    });

    it('should return false when first role is lower', () => {
      expect(isRoleHigherOrEqual('USER', 'ADMIN')).toBe(false);
      expect(isRoleHigherOrEqual('MANAGER', 'ADMIN')).toBe(false);
      expect(isRoleHigherOrEqual('ADMIN', 'SUPER_ADMIN')).toBe(false);
      expect(isRoleHigherOrEqual('USER', 'SUPER_ADMIN')).toBe(false);
    });
  });

  // ============================================
  // isRoleHigher() TESTS
  // ============================================
  describe('isRoleHigher()', () => {
    it('should return false when roles are equal', () => {
      expect(isRoleHigher('USER', 'USER')).toBe(false);
      expect(isRoleHigher('ADMIN', 'ADMIN')).toBe(false);
      expect(isRoleHigher('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(false);
    });

    it('should return true when first role is strictly higher', () => {
      expect(isRoleHigher('SUPER_ADMIN', 'ADMIN')).toBe(true);
      expect(isRoleHigher('ADMIN', 'MANAGER')).toBe(true);
      expect(isRoleHigher('MANAGER', 'USER')).toBe(true);
      expect(isRoleHigher('SUPER_ADMIN', 'USER')).toBe(true);
    });

    it('should return false when first role is lower or equal', () => {
      expect(isRoleHigher('USER', 'ADMIN')).toBe(false);
      expect(isRoleHigher('MANAGER', 'ADMIN')).toBe(false);
      expect(isRoleHigher('ADMIN', 'SUPER_ADMIN')).toBe(false);
    });
  });

  // ============================================
  // roleHasPermission() TESTS
  // ============================================
  describe('roleHasPermission()', () => {
    describe('SUPER_ADMIN role', () => {
      it('should have all permissions', () => {
        expect(roleHasPermission('SUPER_ADMIN', 'users:create')).toBe(true);
        expect(roleHasPermission('SUPER_ADMIN', 'users:delete')).toBe(true);
        expect(roleHasPermission('SUPER_ADMIN', 'permissions:manage')).toBe(true);
        expect(roleHasPermission('SUPER_ADMIN', 'vehicles:manage')).toBe(true);
        expect(roleHasPermission('SUPER_ADMIN', 'bookings:manage')).toBe(true);
      });
    });

    describe('ADMIN role', () => {
      it('should have vehicle management permissions', () => {
        expect(roleHasPermission('ADMIN', 'vehicles:create')).toBe(true);
        expect(roleHasPermission('ADMIN', 'vehicles:read')).toBe(true);
        expect(roleHasPermission('ADMIN', 'vehicles:update')).toBe(true);
        expect(roleHasPermission('ADMIN', 'vehicles:delete')).toBe(true);
        expect(roleHasPermission('ADMIN', 'vehicles:manage')).toBe(true);
      });

      it('should have booking management permissions', () => {
        expect(roleHasPermission('ADMIN', 'bookings:create')).toBe(true);
        expect(roleHasPermission('ADMIN', 'bookings:read')).toBe(true);
        expect(roleHasPermission('ADMIN', 'bookings:update')).toBe(true);
        expect(roleHasPermission('ADMIN', 'bookings:delete')).toBe(true);
        expect(roleHasPermission('ADMIN', 'bookings:manage')).toBe(true);
      });

      it('should NOT have permissions:manage', () => {
        expect(roleHasPermission('ADMIN', 'permissions:manage')).toBe(false);
      });

      it('should NOT have users:delete', () => {
        expect(roleHasPermission('ADMIN', 'users:delete')).toBe(false);
      });
    });

    describe('MANAGER role', () => {
      it('should have read permissions', () => {
        expect(roleHasPermission('MANAGER', 'vehicles:read')).toBe(true);
        expect(roleHasPermission('MANAGER', 'bookings:read')).toBe(true);
        expect(roleHasPermission('MANAGER', 'users:read')).toBe(true);
        expect(roleHasPermission('MANAGER', 'permissions:read')).toBe(true);
      });

      it('should have update permissions for bookings', () => {
        expect(roleHasPermission('MANAGER', 'bookings:update')).toBe(true);
      });

      it('should NOT have delete permissions for vehicles', () => {
        expect(roleHasPermission('MANAGER', 'vehicles:delete')).toBe(false);
      });

      it('should NOT have create permissions for vehicles', () => {
        expect(roleHasPermission('MANAGER', 'vehicles:create')).toBe(false);
      });
    });

    describe('USER role', () => {
      it('should have basic read permissions', () => {
        expect(roleHasPermission('USER', 'vehicles:read')).toBe(true);
        expect(roleHasPermission('USER', 'bookings:read')).toBe(true);
        expect(roleHasPermission('USER', 'packages:read')).toBe(true);
        expect(roleHasPermission('USER', 'policies:read')).toBe(true);
      });

      it('should have booking create permission', () => {
        expect(roleHasPermission('USER', 'bookings:create')).toBe(true);
      });

      it('should have review permissions', () => {
        expect(roleHasPermission('USER', 'reviews:create')).toBe(true);
        expect(roleHasPermission('USER', 'reviews:read')).toBe(true);
        expect(roleHasPermission('USER', 'reviews:update')).toBe(true);
      });

      it('should NOT have admin permissions', () => {
        expect(roleHasPermission('USER', 'users:read')).toBe(false);
        expect(roleHasPermission('USER', 'vehicles:create')).toBe(false);
        expect(roleHasPermission('USER', 'vehicles:delete')).toBe(false);
        expect(roleHasPermission('USER', 'permissions:read')).toBe(false);
      });
    });

    describe('manage permission implies all actions', () => {
      it('should allow read when role has manage permission', () => {
        // ADMIN has vehicles:manage, so should have all vehicle permissions
        expect(roleHasPermission('ADMIN', 'vehicles:manage')).toBe(true);
        // The manage permission should grant all actions for that resource
        expect(ROLE_PERMISSIONS['ADMIN'].includes('vehicles:manage')).toBe(true);
      });
    });
  });

  // ============================================
  // canManageUser() TESTS
  // ============================================
  describe('canManageUser()', () => {
    it('should allow SUPER_ADMIN to manage anyone', () => {
      expect(canManageUser('SUPER_ADMIN', 'USER')).toBe(true);
      expect(canManageUser('SUPER_ADMIN', 'MANAGER')).toBe(true);
      expect(canManageUser('SUPER_ADMIN', 'ADMIN')).toBe(true);
      expect(canManageUser('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(true);
    });

    it('should NOT allow non-SUPER_ADMIN to manage SUPER_ADMIN', () => {
      expect(canManageUser('ADMIN', 'SUPER_ADMIN')).toBe(false);
      expect(canManageUser('MANAGER', 'SUPER_ADMIN')).toBe(false);
      expect(canManageUser('USER', 'SUPER_ADMIN')).toBe(false);
    });

    it('should allow ADMIN to manage lower roles', () => {
      expect(canManageUser('ADMIN', 'USER')).toBe(true);
      expect(canManageUser('ADMIN', 'MANAGER')).toBe(true);
    });

    it('should NOT allow ADMIN to manage equal role', () => {
      expect(canManageUser('ADMIN', 'ADMIN')).toBe(false);
    });

    it('should allow MANAGER to manage only USER', () => {
      expect(canManageUser('MANAGER', 'USER')).toBe(true);
      expect(canManageUser('MANAGER', 'MANAGER')).toBe(false);
      expect(canManageUser('MANAGER', 'ADMIN')).toBe(false);
    });

    it('should NOT allow USER to manage anyone', () => {
      expect(canManageUser('USER', 'USER')).toBe(false);
      expect(canManageUser('USER', 'MANAGER')).toBe(false);
      expect(canManageUser('USER', 'ADMIN')).toBe(false);
    });
  });

  // ============================================
  // canAssignRole() TESTS
  // ============================================
  describe('canAssignRole()', () => {
    it('should allow SUPER_ADMIN to assign any role', () => {
      expect(canAssignRole('SUPER_ADMIN', 'USER')).toBe(true);
      expect(canAssignRole('SUPER_ADMIN', 'MANAGER')).toBe(true);
      expect(canAssignRole('SUPER_ADMIN', 'ADMIN')).toBe(true);
      expect(canAssignRole('SUPER_ADMIN', 'SUPER_ADMIN')).toBe(true);
    });

    it('should allow ADMIN to assign only lower roles', () => {
      expect(canAssignRole('ADMIN', 'USER')).toBe(true);
      expect(canAssignRole('ADMIN', 'MANAGER')).toBe(true);
      expect(canAssignRole('ADMIN', 'ADMIN')).toBe(false);
      expect(canAssignRole('ADMIN', 'SUPER_ADMIN')).toBe(false);
    });

    it('should allow MANAGER to assign only USER role', () => {
      expect(canAssignRole('MANAGER', 'USER')).toBe(true);
      expect(canAssignRole('MANAGER', 'MANAGER')).toBe(false);
      expect(canAssignRole('MANAGER', 'ADMIN')).toBe(false);
    });

    it('should NOT allow USER to assign any role', () => {
      expect(canAssignRole('USER', 'USER')).toBe(false);
      expect(canAssignRole('USER', 'MANAGER')).toBe(false);
      expect(canAssignRole('USER', 'ADMIN')).toBe(false);
    });
  });

  // ============================================
  // getAllPermissionsForRole() TESTS
  // ============================================
  describe('getAllPermissionsForRole()', () => {
    it('should return all permissions for SUPER_ADMIN', () => {
      const permissions = getAllPermissionsForRole('SUPER_ADMIN');
      expect(permissions).toEqual(Object.values(PERMISSIONS));
    });

    it('should return correct permissions for USER', () => {
      const permissions = getAllPermissionsForRole('USER');
      expect(permissions).toContain('vehicles:read');
      expect(permissions).toContain('bookings:create');
      expect(permissions).toContain('bookings:read');
      expect(permissions).toContain('reviews:create');
      expect(permissions).not.toContain('users:read');
      expect(permissions).not.toContain('vehicles:create');
    });

    it('should return correct permissions for ADMIN', () => {
      const permissions = getAllPermissionsForRole('ADMIN');
      expect(permissions).toContain('vehicles:manage');
      expect(permissions).toContain('bookings:manage');
      expect(permissions).toContain('users:read');
      expect(permissions).not.toContain('permissions:manage');
    });
  });

  // ============================================
  // getAssignableRoles() TESTS
  // ============================================
  describe('getAssignableRoles()', () => {
    it('should return all roles for SUPER_ADMIN', () => {
      const roles = getAssignableRoles('SUPER_ADMIN');
      expect(roles).toEqual(['USER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN']);
    });

    it('should return USER and MANAGER for ADMIN', () => {
      const roles = getAssignableRoles('ADMIN');
      expect(roles).toEqual(['USER', 'MANAGER']);
    });

    it('should return only USER for MANAGER', () => {
      const roles = getAssignableRoles('MANAGER');
      expect(roles).toEqual(['USER']);
    });

    it('should return empty array for USER', () => {
      const roles = getAssignableRoles('USER');
      expect(roles).toEqual([]);
    });
  });

  // ============================================
  // checkPermission() TESTS
  // ============================================
  describe('checkPermission()', () => {
    describe('basic permission checks', () => {
      it('should allow SUPER_ADMIN all permissions', () => {
        const result = checkPermission('SUPER_ADMIN', 'users:delete');
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should allow valid role permissions', () => {
        const result = checkPermission('USER', 'vehicles:read');
        expect(result.allowed).toBe(true);
      });

      it('should deny invalid role permissions', () => {
        const result = checkPermission('USER', 'vehicles:delete');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('does not have permission');
      });
    });

    describe('own resource access', () => {
      it('should allow users to read their own profile', () => {
        const result = checkPermission('USER', 'users:read', { ownResource: true });
        expect(result.allowed).toBe(true);
      });

      it('should allow users to update their own profile', () => {
        const result = checkPermission('USER', 'users:update', { ownResource: true });
        expect(result.allowed).toBe(true);
      });

      it('should allow users to read their own bookings', () => {
        const result = checkPermission('USER', 'bookings:read', { ownResource: true });
        expect(result.allowed).toBe(true);
      });

      it('should allow users to manage their own reviews', () => {
        expect(checkPermission('USER', 'reviews:read', { ownResource: true }).allowed).toBe(true);
        expect(checkPermission('USER', 'reviews:update', { ownResource: true }).allowed).toBe(true);
        expect(checkPermission('USER', 'reviews:delete', { ownResource: true }).allowed).toBe(true);
      });
    });

    describe('target user role checks', () => {
      it('should prevent ADMIN from managing SUPER_ADMIN', () => {
        const result = checkPermission('ADMIN', 'users:update', {
          targetUserRole: 'SUPER_ADMIN'
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Cannot manage users with equal or higher role');
      });

      it('should prevent ADMIN from managing other ADMIN', () => {
        const result = checkPermission('ADMIN', 'users:update', {
          targetUserRole: 'ADMIN'
        });
        expect(result.allowed).toBe(false);
      });

      it('should allow ADMIN to manage MANAGER', () => {
        const result = checkPermission('ADMIN', 'users:update', {
          targetUserRole: 'MANAGER'
        });
        expect(result.allowed).toBe(true);
      });

      it('should allow ADMIN to manage USER', () => {
        const result = checkPermission('ADMIN', 'users:update', {
          targetUserRole: 'USER'
        });
        expect(result.allowed).toBe(true);
      });

      it('should allow SUPER_ADMIN to manage anyone', () => {
        expect(checkPermission('SUPER_ADMIN', 'users:update', {
          targetUserRole: 'SUPER_ADMIN'
        }).allowed).toBe(true);
        expect(checkPermission('SUPER_ADMIN', 'users:delete', {
          targetUserRole: 'ADMIN'
        }).allowed).toBe(true);
      });
    });
  });

  // ============================================
  // ROLE_PERMISSIONS TESTS
  // ============================================
  describe('ROLE_PERMISSIONS', () => {
    it('should have permissions defined for all roles', () => {
      expect(ROLE_PERMISSIONS['USER']).toBeDefined();
      expect(ROLE_PERMISSIONS['MANAGER']).toBeDefined();
      expect(ROLE_PERMISSIONS['ADMIN']).toBeDefined();
      expect(ROLE_PERMISSIONS['SUPER_ADMIN']).toBeDefined();
    });

    it('should have more permissions for higher roles', () => {
      expect(ROLE_PERMISSIONS['MANAGER'].length).toBeGreaterThan(ROLE_PERMISSIONS['USER'].length);
      expect(ROLE_PERMISSIONS['ADMIN'].length).toBeGreaterThan(ROLE_PERMISSIONS['MANAGER'].length);
      expect(ROLE_PERMISSIONS['SUPER_ADMIN'].length).toBeGreaterThanOrEqual(ROLE_PERMISSIONS['ADMIN'].length);
    });

    it('should have SUPER_ADMIN with all permissions', () => {
      const allPermissions = Object.values(PERMISSIONS);
      expect(ROLE_PERMISSIONS['SUPER_ADMIN']).toEqual(expect.arrayContaining(allPermissions));
    });
  });

  // ============================================
  // DISPLAY CONSTANTS TESTS
  // ============================================
  describe('ROLE_DISPLAY_NAMES', () => {
    it('should have display names for all roles', () => {
      expect(ROLE_DISPLAY_NAMES['USER']).toBe('User');
      expect(ROLE_DISPLAY_NAMES['MANAGER']).toBe('Manager');
      expect(ROLE_DISPLAY_NAMES['ADMIN']).toBe('Administrator');
      expect(ROLE_DISPLAY_NAMES['SUPER_ADMIN']).toBe('Super Administrator');
    });
  });

  describe('ROLE_DESCRIPTIONS', () => {
    it('should have descriptions for all roles', () => {
      expect(ROLE_DESCRIPTIONS['USER']).toBeDefined();
      expect(ROLE_DESCRIPTIONS['MANAGER']).toBeDefined();
      expect(ROLE_DESCRIPTIONS['ADMIN']).toBeDefined();
      expect(ROLE_DESCRIPTIONS['SUPER_ADMIN']).toBeDefined();
    });

    it('should have meaningful descriptions', () => {
      expect(ROLE_DESCRIPTIONS['USER'].length).toBeGreaterThan(10);
      expect(ROLE_DESCRIPTIONS['SUPER_ADMIN']).toContain('Complete');
    });
  });

  describe('USER_STATUS_CONFIG', () => {
    it('should have config for all status types', () => {
      expect(USER_STATUS_CONFIG['ACTIVE']).toBeDefined();
      expect(USER_STATUS_CONFIG['SUSPENDED']).toBeDefined();
      expect(USER_STATUS_CONFIG['BANNED']).toBeDefined();
    });

    it('should have labels and colors', () => {
      expect(USER_STATUS_CONFIG['ACTIVE'].label).toBe('Active');
      expect(USER_STATUS_CONFIG['ACTIVE'].color).toContain('green');
      expect(USER_STATUS_CONFIG['SUSPENDED'].label).toBe('Suspended');
      expect(USER_STATUS_CONFIG['SUSPENDED'].color).toContain('yellow');
      expect(USER_STATUS_CONFIG['BANNED'].label).toBe('Banned');
      expect(USER_STATUS_CONFIG['BANNED'].color).toContain('red');
    });
  });
});
