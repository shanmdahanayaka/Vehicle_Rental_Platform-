import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";

// Permission action types
export type PermissionAction = "create" | "read" | "update" | "delete" | "manage";

// Resource types
export type Resource = "users" | "vehicles" | "bookings" | "reviews" | "payments" | "permissions" | "audit_logs";

// Permission string format: "resource:action"
export type PermissionString = `${Resource}:${PermissionAction}`;

// All available permissions
export const PERMISSIONS = {
  // User permissions
  USERS_CREATE: "users:create" as PermissionString,
  USERS_READ: "users:read" as PermissionString,
  USERS_UPDATE: "users:update" as PermissionString,
  USERS_DELETE: "users:delete" as PermissionString,
  USERS_MANAGE: "users:manage" as PermissionString,

  // Vehicle permissions
  VEHICLES_CREATE: "vehicles:create" as PermissionString,
  VEHICLES_READ: "vehicles:read" as PermissionString,
  VEHICLES_UPDATE: "vehicles:update" as PermissionString,
  VEHICLES_DELETE: "vehicles:delete" as PermissionString,
  VEHICLES_MANAGE: "vehicles:manage" as PermissionString,

  // Booking permissions
  BOOKINGS_CREATE: "bookings:create" as PermissionString,
  BOOKINGS_READ: "bookings:read" as PermissionString,
  BOOKINGS_UPDATE: "bookings:update" as PermissionString,
  BOOKINGS_DELETE: "bookings:delete" as PermissionString,
  BOOKINGS_MANAGE: "bookings:manage" as PermissionString,

  // Review permissions
  REVIEWS_CREATE: "reviews:create" as PermissionString,
  REVIEWS_READ: "reviews:read" as PermissionString,
  REVIEWS_UPDATE: "reviews:update" as PermissionString,
  REVIEWS_DELETE: "reviews:delete" as PermissionString,
  REVIEWS_MANAGE: "reviews:manage" as PermissionString,

  // Payment permissions
  PAYMENTS_READ: "payments:read" as PermissionString,
  PAYMENTS_UPDATE: "payments:update" as PermissionString,
  PAYMENTS_MANAGE: "payments:manage" as PermissionString,

  // Permission management
  PERMISSIONS_READ: "permissions:read" as PermissionString,
  PERMISSIONS_MANAGE: "permissions:manage" as PermissionString,

  // Audit log permissions
  AUDIT_LOGS_READ: "audit_logs:read" as PermissionString,
} as const;

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY: UserRole[] = ["USER", "MANAGER", "ADMIN", "SUPER_ADMIN"];

// Default permissions for each role
export const ROLE_PERMISSIONS: Record<UserRole, PermissionString[]> = {
  USER: [
    PERMISSIONS.VEHICLES_READ,
    PERMISSIONS.BOOKINGS_CREATE,
    PERMISSIONS.BOOKINGS_READ,
    PERMISSIONS.REVIEWS_CREATE,
    PERMISSIONS.REVIEWS_READ,
    PERMISSIONS.REVIEWS_UPDATE,
  ],
  MANAGER: [
    PERMISSIONS.VEHICLES_READ,
    PERMISSIONS.VEHICLES_UPDATE,
    PERMISSIONS.BOOKINGS_CREATE,
    PERMISSIONS.BOOKINGS_READ,
    PERMISSIONS.BOOKINGS_UPDATE,
    PERMISSIONS.REVIEWS_CREATE,
    PERMISSIONS.REVIEWS_READ,
    PERMISSIONS.REVIEWS_UPDATE,
    PERMISSIONS.REVIEWS_DELETE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.PAYMENTS_READ,
  ],
  ADMIN: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.VEHICLES_CREATE,
    PERMISSIONS.VEHICLES_READ,
    PERMISSIONS.VEHICLES_UPDATE,
    PERMISSIONS.VEHICLES_DELETE,
    PERMISSIONS.VEHICLES_MANAGE,
    PERMISSIONS.BOOKINGS_CREATE,
    PERMISSIONS.BOOKINGS_READ,
    PERMISSIONS.BOOKINGS_UPDATE,
    PERMISSIONS.BOOKINGS_DELETE,
    PERMISSIONS.BOOKINGS_MANAGE,
    PERMISSIONS.REVIEWS_CREATE,
    PERMISSIONS.REVIEWS_READ,
    PERMISSIONS.REVIEWS_UPDATE,
    PERMISSIONS.REVIEWS_DELETE,
    PERMISSIONS.REVIEWS_MANAGE,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.PAYMENTS_UPDATE,
    PERMISSIONS.PAYMENTS_MANAGE,
    PERMISSIONS.AUDIT_LOGS_READ,
  ],
  SUPER_ADMIN: [
    // All permissions
    ...Object.values(PERMISSIONS),
  ],
};

// Check if a role has a specific permission (static check)
export function roleHasPermission(role: UserRole, permission: PermissionString): boolean {
  // SUPER_ADMIN always has all permissions
  if (role === "SUPER_ADMIN") {
    return true;
  }

  const rolePerms = ROLE_PERMISSIONS[role];
  if (!rolePerms) return false;

  // Check direct permission
  if (rolePerms.includes(permission)) return true;

  // Check if role has "manage" permission for the resource (manage includes all actions)
  const [resource] = permission.split(":") as [Resource, PermissionAction];
  const managePermission = `${resource}:manage` as PermissionString;
  if (rolePerms.includes(managePermission)) return true;

  return false;
}

// Check if role A is higher or equal to role B in the hierarchy
export function isRoleHigherOrEqual(roleA: UserRole, roleB: UserRole): boolean {
  const indexA = ROLE_HIERARCHY.indexOf(roleA);
  const indexB = ROLE_HIERARCHY.indexOf(roleB);
  return indexA >= indexB;
}

// Check if role A is strictly higher than role B
export function isRoleHigher(roleA: UserRole, roleB: UserRole): boolean {
  const indexA = ROLE_HIERARCHY.indexOf(roleA);
  const indexB = ROLE_HIERARCHY.indexOf(roleB);
  return indexA > indexB;
}

// Get the role level (0 = USER, 3 = SUPER_ADMIN)
export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

// Check if user can manage another user (based on role hierarchy)
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  // SUPER_ADMIN can manage anyone
  if (managerRole === "SUPER_ADMIN") {
    return true;
  }
  // Only SUPER_ADMIN can manage other SUPER_ADMINs
  if (targetRole === "SUPER_ADMIN") {
    return false;
  }
  // Must have higher role to manage
  return isRoleHigher(managerRole, targetRole);
}

// Check if user can assign a specific role
export function canAssignRole(assignerRole: UserRole, roleToAssign: UserRole): boolean {
  // SUPER_ADMIN can assign any role
  if (assignerRole === "SUPER_ADMIN") return true;
  // Can only assign roles lower than own role
  return isRoleHigher(assignerRole, roleToAssign);
}

// Get all permissions for a role (including inherited from manage permissions)
export function getAllPermissionsForRole(role: UserRole): PermissionString[] {
  if (role === "SUPER_ADMIN") {
    return Object.values(PERMISSIONS);
  }
  return ROLE_PERMISSIONS[role] || [];
}

// Get roles that can be assigned by a specific role
export function getAssignableRoles(assignerRole: UserRole): UserRole[] {
  if (assignerRole === "SUPER_ADMIN") {
    return [...ROLE_HIERARCHY];
  }
  const assignerIndex = ROLE_HIERARCHY.indexOf(assignerRole);
  return ROLE_HIERARCHY.slice(0, assignerIndex);
}

// Permission check result type
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

// Synchronous permission check (for static role-based checks)
export function checkPermission(
  userRole: UserRole,
  permission: PermissionString,
  options?: {
    ownResource?: boolean;
    targetUserRole?: UserRole;
  }
): PermissionCheckResult {
  // SUPER_ADMIN always has full access
  if (userRole === "SUPER_ADMIN") {
    return { allowed: true };
  }

  // Check if managing another user - need to check hierarchy
  if (options?.targetUserRole && permission.startsWith("users:")) {
    if (!canManageUser(userRole, options.targetUserRole)) {
      return {
        allowed: false,
        reason: "Cannot manage users with equal or higher role",
      };
    }
  }

  // Users can always read/update their own basic info
  if (options?.ownResource) {
    const [resource, action] = permission.split(":") as [Resource, PermissionAction];
    if (resource === "users" && (action === "read" || action === "update")) {
      return { allowed: true };
    }
    if (resource === "bookings" && action === "read") {
      return { allowed: true };
    }
    if (resource === "reviews" && (action === "read" || action === "update" || action === "delete")) {
      return { allowed: true };
    }
  }

  // Check role permissions
  if (roleHasPermission(userRole, permission)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Role ${userRole} does not have permission ${permission}`,
  };
}

// Dynamic permission check - checks database for user-specific permissions
export async function checkPermissionDynamic(
  userId: string,
  userRole: UserRole,
  permission: PermissionString,
  options?: {
    ownResource?: boolean;
    targetUserRole?: UserRole;
  }
): Promise<PermissionCheckResult> {
  // SUPER_ADMIN always has full access
  if (userRole === "SUPER_ADMIN") {
    return { allowed: true };
  }

  // First check static role permissions
  const staticCheck = checkPermission(userRole, permission, options);
  if (staticCheck.allowed) {
    return staticCheck;
  }

  // Check for user-specific permissions in database
  try {
    const userPermission = await prisma.userPermission.findFirst({
      where: {
        userId,
        permission: {
          name: permission,
        },
      },
      include: {
        permission: true,
      },
    });

    // If user has explicit permission granted
    if (userPermission && userPermission.granted) {
      return { allowed: true };
    }

    // If user has explicit permission denied
    if (userPermission && !userPermission.granted) {
      return {
        allowed: false,
        reason: `Permission ${permission} explicitly denied for this user`,
      };
    }

    // Check for manage permission (if user has users:manage, they have all users:* permissions)
    const [resource] = permission.split(":") as [Resource, PermissionAction];
    const managePermission = `${resource}:manage` as PermissionString;

    const userManagePermission = await prisma.userPermission.findFirst({
      where: {
        userId,
        permission: {
          name: managePermission,
        },
        granted: true,
      },
    });

    if (userManagePermission) {
      return { allowed: true };
    }
  } catch (error) {
    console.error("Error checking dynamic permissions:", error);
  }

  return {
    allowed: false,
    reason: `User does not have permission ${permission}`,
  };
}

// Get user's effective permissions (role + individual)
export async function getUserEffectivePermissions(userId: string, userRole: UserRole): Promise<PermissionString[]> {
  // Start with role permissions
  const rolePerms = new Set<PermissionString>(getAllPermissionsForRole(userRole));

  // Get user-specific permissions from database
  try {
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    for (const up of userPermissions) {
      if (up.granted) {
        rolePerms.add(up.permission.name as PermissionString);
      } else {
        rolePerms.delete(up.permission.name as PermissionString);
      }
    }
  } catch (error) {
    console.error("Error fetching user permissions:", error);
  }

  return Array.from(rolePerms);
}

// Grant permission to a user
export async function grantUserPermission(userId: string, permissionName: PermissionString): Promise<boolean> {
  try {
    // Find or create the permission
    let permission = await prisma.permission.findUnique({
      where: { name: permissionName },
    });

    if (!permission) {
      const [resource, action] = permissionName.split(":");
      permission = await prisma.permission.create({
        data: {
          name: permissionName,
          resource,
          action,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
        },
      });
    }

    // Upsert user permission
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId: permission.id,
        },
      },
      update: { granted: true },
      create: {
        userId,
        permissionId: permission.id,
        granted: true,
      },
    });

    return true;
  } catch (error) {
    console.error("Error granting permission:", error);
    return false;
  }
}

// Revoke permission from a user
export async function revokeUserPermission(userId: string, permissionName: PermissionString): Promise<boolean> {
  try {
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName },
    });

    if (!permission) return false;

    await prisma.userPermission.deleteMany({
      where: {
        userId,
        permissionId: permission.id,
      },
    });

    return true;
  } catch (error) {
    console.error("Error revoking permission:", error);
    return false;
  }
}

// Role display names
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  USER: "User",
  MANAGER: "Manager",
  ADMIN: "Administrator",
  SUPER_ADMIN: "Super Administrator",
};

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  USER: "Regular user with booking and review capabilities",
  MANAGER: "Can manage bookings and reviews, view reports",
  ADMIN: "Full management access except user deletion and permissions",
  SUPER_ADMIN: "Complete system access including user management and permissions",
};

// Status display names and colors
export const USER_STATUS_CONFIG = {
  ACTIVE: {
    label: "Active",
    color: "bg-green-100 text-green-800",
  },
  SUSPENDED: {
    label: "Suspended",
    color: "bg-yellow-100 text-yellow-800",
  },
  BANNED: {
    label: "Banned",
    color: "bg-red-100 text-red-800",
  },
} as const;
