"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useUI } from "@/components/ui/UIProvider";

interface Permission {
  key: string;
  name: string;
  resource: string;
  action: string;
}

interface Role {
  role: string;
  displayName: string;
  description: string;
  permissions: string[];
}

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

interface UserWithPermissions {
  id: string;
  name: string | null;
  email: string;
  role: string;
  customPermissionsCount?: number;
  customPermissions?: {
    id: string;
    permissionId: string;
    permissionName: string;
    granted: boolean;
  }[];
}

const RESOURCE_COLORS: Record<string, string> = {
  users: "bg-purple-100 text-purple-700",
  vehicles: "bg-blue-100 text-blue-700",
  bookings: "bg-green-100 text-green-700",
  reviews: "bg-yellow-100 text-yellow-700",
  payments: "bg-emerald-100 text-emerald-700",
  packages: "bg-orange-100 text-orange-700",
  policies: "bg-pink-100 text-pink-700",
  invoices: "bg-cyan-100 text-cyan-700",
  permissions: "bg-red-100 text-red-700",
  audit_logs: "bg-slate-100 text-slate-700",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Create",
  read: "Read",
  update: "Update",
  delete: "Delete",
  manage: "Full Access",
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "user.create": "Created user",
  "user.update": "Updated user",
  "user.delete": "Deleted user",
  "user.suspend": "Suspended user",
  "user.activate": "Activated user",
  "user.ban": "Banned user",
  "user.role_change": "Changed user role",
  "user.login": "User logged in",
  "vehicle.create": "Created vehicle",
  "vehicle.update": "Updated vehicle",
  "vehicle.delete": "Deleted vehicle",
  "booking.create": "Created booking",
  "booking.update": "Updated booking",
  "booking.cancel": "Cancelled booking",
  "permission.grant": "Granted permission",
  "permission.revoke": "Revoked permission",
};

export default function PermissionsPage() {
  const { data: session } = useSession();
  const { confirm, toast } = useUI();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"roles" | "users" | "audit">("roles");
  const [initializing, setInitializing] = useState(false);

  // Role editing state
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<Set<string>>(new Set());
  const [savingRole, setSavingRole] = useState(false);

  // User permissions state
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserWithPermissions[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [loadingUserPerms, setLoadingUserPerms] = useState(false);

  // Audit log filters
  const [auditFilters, setAuditFilters] = useState({
    action: "",
    resource: "",
    startDate: "",
    endDate: "",
  });
  const [auditPagination, setAuditPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
  });
  const [loadingAudit, setLoadingAudit] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const permRes = await fetch("/api/admin/permissions");
      if (permRes.ok) {
        const data = await permRes.json();
        setRoles(data.roles);
        setPermissions(data.permissions);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", auditPagination.limit.toString());
      params.set("offset", auditPagination.offset.toString());
      if (auditFilters.action) params.set("action", auditFilters.action);
      if (auditFilters.resource) params.set("resource", auditFilters.resource);
      if (auditFilters.startDate) params.set("startDate", auditFilters.startDate);
      if (auditFilters.endDate) params.set("endDate", auditFilters.endDate);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs);
        setAuditPagination((prev) => ({ ...prev, total: data.pagination.total }));
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    }
    setLoadingAudit(false);
  }, [auditFilters, auditPagination.limit, auditPagination.offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "audit") {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  const handleInitializePermissions = async () => {
    const confirmed = await confirm({
      title: "Initialize Permissions",
      message: "This will initialize/update all permissions in the database. Continue?",
      confirmText: "Initialize",
      variant: "warning",
    });
    if (!confirmed) return;

    setInitializing(true);
    try {
      const res = await fetch("/api/admin/permissions", { method: "POST" });
      if (res.ok) {
        toast({ message: "Permissions initialized successfully!", type: "success" });
        fetchData();
      } else {
        const error = await res.json();
        toast({ message: error.error || "Failed to initialize permissions", type: "error" });
      }
    } catch (error) {
      console.error("Error initializing permissions:", error);
      toast({ message: "Failed to initialize permissions", type: "error" });
    }
    setInitializing(false);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role.role);
    setEditedPermissions(new Set(role.permissions));
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setEditedPermissions(new Set());
  };

  const handleTogglePermission = (permName: string) => {
    const newSet = new Set(editedPermissions);
    if (newSet.has(permName)) {
      newSet.delete(permName);
    } else {
      newSet.add(permName);
    }
    setEditedPermissions(newSet);
  };

  const handleSaveRolePermissions = async () => {
    if (!editingRole) return;

    setSavingRole(true);
    try {
      const res = await fetch("/api/admin/permissions/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editingRole,
          permissions: Array.from(editedPermissions),
        }),
      });

      if (res.ok) {
        toast({ message: "Role permissions updated successfully!", type: "success" });
        setEditingRole(null);
        fetchData();
      } else {
        const error = await res.json();
        toast({ message: error.error || "Failed to update permissions", type: "error" });
      }
    } catch (error) {
      console.error("Error saving role permissions:", error);
      toast({ message: "Failed to update permissions", type: "error" });
    }
    setSavingRole(false);
  };

  const handleSearchUsers = async () => {
    if (!userSearch.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const res = await fetch(`/api/admin/permissions/users?search=${encodeURIComponent(userSearch)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    }
    setSearchingUsers(false);
  };

  const handleSelectUser = async (user: UserWithPermissions) => {
    setLoadingUserPerms(true);
    try {
      const res = await fetch(`/api/admin/permissions/users?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data.user);
      }
    } catch (error) {
      console.error("Error fetching user permissions:", error);
    }
    setLoadingUserPerms(false);
  };

  const handleUserPermissionAction = async (
    permissionName: string,
    action: "grant" | "revoke" | "deny"
  ) => {
    if (!selectedUser) return;

    try {
      const res = await fetch("/api/admin/permissions/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          permissionName,
          action,
        }),
      });

      if (res.ok) {
        toast({
          message: `Permission ${action === "grant" ? "granted" : action === "deny" ? "denied" : "revoked"} successfully!`,
          type: "success",
        });
        // Refresh user permissions
        handleSelectUser(selectedUser);
      } else {
        const error = await res.json();
        toast({ message: error.error || "Failed to update permission", type: "error" });
      }
    } catch (error) {
      console.error("Error updating user permission:", error);
      toast({ message: "Failed to update permission", type: "error" });
    }
  };

  const groupPermissionsByResource = () => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach((perm) => {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = [];
      }
      grouped[perm.resource].push(perm);
    });
    return grouped;
  };

  const getRolePermissions = (roleName: string): Set<string> => {
    const role = roles.find((r) => r.role === roleName);
    return new Set(role?.permissions || []);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const groupedPermissions = groupPermissionsByResource();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Permissions Management</h1>
          <p className="text-slate-500">Manage roles, user permissions, and view audit logs</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={handleInitializePermissions}
            disabled={initializing}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {initializing ? "Initializing..." : "Sync Permissions"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { key: "roles", label: "Role Permissions", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
          { key: "users", label: "User Permissions", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
          { key: "audit", label: "Audit Logs", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Role Permissions Tab */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          {/* Role Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <div
                key={role.role}
                className={`rounded-2xl bg-white p-5 shadow-sm ring-1 transition ${
                  editingRole === role.role ? "ring-blue-500 ring-2" : "ring-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">{role.displayName}</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                    {role.permissions.length} perms
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-4">{role.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {Object.keys(groupedPermissions).map((resource) => {
                    const hasAny = role.permissions.some((p) => p.startsWith(`${resource}:`));
                    return hasAny ? (
                      <span
                        key={resource}
                        className={`text-xs px-2 py-0.5 rounded-full ${RESOURCE_COLORS[resource] || "bg-slate-100 text-slate-700"}`}
                      >
                        {resource}
                      </span>
                    ) : null;
                  })}
                </div>
                {isSuperAdmin && role.role !== "SUPER_ADMIN" && (
                  <button
                    onClick={() => editingRole === role.role ? handleCancelEdit() : handleEditRole(role)}
                    className={`w-full text-sm font-medium py-2 rounded-lg transition ${
                      editingRole === role.role
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    }`}
                  >
                    {editingRole === role.role ? "Cancel" : "Edit Permissions"}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Permission Matrix */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Permission Matrix</h2>
                <p className="text-sm text-slate-500">
                  {editingRole ? `Editing ${roles.find((r) => r.role === editingRole)?.displayName} permissions` : "Overview of permissions by role and resource"}
                </p>
              </div>
              {editingRole && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRolePermissions}
                    disabled={savingRole}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {savingRole ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sticky left-0 bg-slate-50">
                      Resource
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Action
                    </th>
                    {roles.map((role) => (
                      <th
                        key={role.role}
                        className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${
                          editingRole === role.role ? "text-blue-600 bg-blue-50" : "text-slate-500"
                        }`}
                      >
                        {role.displayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(groupedPermissions).map(([resource, perms]) => (
                    perms.map((perm, permIndex) => (
                      <tr key={perm.key} className="hover:bg-slate-50">
                        {permIndex === 0 && (
                          <td
                            rowSpan={perms.length}
                            className={`px-6 py-3 align-top sticky left-0 bg-white ${
                              permIndex === 0 ? "" : "border-t-0"
                            }`}
                          >
                            <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-medium ${RESOURCE_COLORS[resource] || "bg-slate-100 text-slate-700"}`}>
                              {resource}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">
                            {ACTION_LABELS[perm.action] || perm.action}
                          </span>
                        </td>
                        {roles.map((role) => {
                          const rolePerms = editingRole === role.role ? editedPermissions : getRolePermissions(role.role);
                          const hasPermission = rolePerms.has(perm.name);
                          const isEditing = editingRole === role.role;
                          const canEdit = isEditing && role.role !== "SUPER_ADMIN";

                          return (
                            <td key={role.role} className={`px-4 py-3 text-center ${isEditing ? "bg-blue-50/50" : ""}`}>
                              {canEdit ? (
                                <button
                                  onClick={() => handleTogglePermission(perm.name)}
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                                    hasPermission
                                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                                      : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                  }`}
                                >
                                  {hasPermission ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  )}
                                </button>
                              ) : (
                                <span
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
                                    hasPermission
                                      ? "bg-green-100 text-green-700"
                                      : "bg-slate-100 text-slate-400"
                                  }`}
                                >
                                  {hasPermission ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  )}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Permissions Tab */}
      {activeTab === "users" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* User Search */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Find User</h2>
              <p className="text-sm text-slate-500">Search for a user to manage their permissions</p>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchUsers()}
                  placeholder="Search by name or email..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearchUsers}
                  disabled={searchingUsers}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {searchingUsers ? "..." : "Search"}
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`w-full text-left p-3 rounded-xl transition ${
                      selectedUser?.id === user.id
                        ? "bg-blue-50 ring-2 ring-blue-500"
                        : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-medium text-white">
                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{user.name || "Unknown"}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          user.role === "SUPER_ADMIN" ? "bg-red-100 text-red-700" :
                          user.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                          user.role === "MANAGER" ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {user.role}
                        </span>
                        {user.customPermissionsCount ? (
                          <p className="text-xs text-slate-400 mt-1">
                            +{user.customPermissionsCount} custom
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
                {searchResults.length === 0 && userSearch && !searchingUsers && (
                  <p className="text-center text-slate-500 py-8">No users found</p>
                )}
              </div>
            </div>
          </div>

          {/* User Permission Details */}
          <div className="lg:col-span-2 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">
                {selectedUser ? `${selectedUser.name || selectedUser.email}'s Permissions` : "User Permissions"}
              </h2>
              <p className="text-sm text-slate-500">
                {selectedUser
                  ? `Role: ${selectedUser.role} - Grant or revoke individual permissions`
                  : "Select a user to view and manage their permissions"}
              </p>
            </div>
            {loadingUserPerms ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : selectedUser ? (
              <div className="p-4">
                {/* Custom Permissions */}
                {selectedUser.customPermissions && selectedUser.customPermissions.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-3">Custom Permission Overrides</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.customPermissions.map((cp) => (
                        <div
                          key={cp.id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                            cp.granted
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          <span>{cp.permissionName}</span>
                          <button
                            onClick={() => handleUserPermissionAction(cp.permissionName, "revoke")}
                            className="hover:opacity-70"
                            title="Remove override"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Permissions */}
                <h3 className="text-sm font-medium text-slate-700 mb-3">All Permissions</h3>
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([resource, perms]) => {
                    const rolePerms = getRolePermissions(selectedUser.role);
                    const customPerms = new Map(
                      selectedUser.customPermissions?.map((cp) => [cp.permissionName, cp.granted]) || []
                    );

                    return (
                      <div key={resource} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className={`px-4 py-2 ${RESOURCE_COLORS[resource] || "bg-slate-100"}`}>
                          <span className="font-medium capitalize">{resource}</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {perms.map((perm) => {
                            const hasRolePerm = rolePerms.has(perm.name);
                            const customOverride = customPerms.get(perm.name);
                            const effectiveAccess = customOverride !== undefined ? customOverride : hasRolePerm;

                            return (
                              <div key={perm.key} className="flex items-center justify-between px-4 py-2 hover:bg-slate-50">
                                <div>
                                  <span className="text-sm text-slate-700">{ACTION_LABELS[perm.action] || perm.action}</span>
                                  {customOverride !== undefined && (
                                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                      customOverride ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    }`}>
                                      {customOverride ? "Granted" : "Denied"}
                                    </span>
                                  )}
                                  {hasRolePerm && customOverride === undefined && (
                                    <span className="ml-2 text-xs text-slate-400">(from role)</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 flex items-center justify-center rounded-full ${
                                    effectiveAccess ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                                  }`}>
                                    {effectiveAccess ? (
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    )}
                                  </span>
                                  {isSuperAdmin && selectedUser.role !== "SUPER_ADMIN" && (
                                    <div className="flex gap-1">
                                      {!effectiveAccess && (
                                        <button
                                          onClick={() => handleUserPermissionAction(perm.name, "grant")}
                                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                                          title="Grant permission"
                                        >
                                          Grant
                                        </button>
                                      )}
                                      {effectiveAccess && !hasRolePerm && (
                                        <button
                                          onClick={() => handleUserPermissionAction(perm.name, "revoke")}
                                          className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition"
                                          title="Remove override"
                                        >
                                          Remove
                                        </button>
                                      )}
                                      {hasRolePerm && customOverride === undefined && (
                                        <button
                                          onClick={() => handleUserPermissionAction(perm.name, "deny")}
                                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                                          title="Deny permission"
                                        >
                                          Deny
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>Search and select a user to manage permissions</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Action</label>
                <select
                  value={auditFilters.action}
                  onChange={(e) => {
                    setAuditFilters((prev) => ({ ...prev, action: e.target.value }));
                    setAuditPagination((prev) => ({ ...prev, offset: 0 }));
                  }}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Resource</label>
                <select
                  value={auditFilters.resource}
                  onChange={(e) => {
                    setAuditFilters((prev) => ({ ...prev, resource: e.target.value }));
                    setAuditPagination((prev) => ({ ...prev, offset: 0 }));
                  }}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Resources</option>
                  <option value="User">User</option>
                  <option value="Vehicle">Vehicle</option>
                  <option value="Booking">Booking</option>
                  <option value="Permission">Permission</option>
                  <option value="UserPermission">User Permission</option>
                  <option value="RolePermission">Role Permission</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={auditFilters.startDate}
                  onChange={(e) => {
                    setAuditFilters((prev) => ({ ...prev, startDate: e.target.value }));
                    setAuditPagination((prev) => ({ ...prev, offset: 0 }));
                  }}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={auditFilters.endDate}
                  onChange={(e) => {
                    setAuditFilters((prev) => ({ ...prev, endDate: e.target.value }));
                    setAuditPagination((prev) => ({ ...prev, offset: 0 }));
                  }}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setAuditFilters({ action: "", resource: "", startDate: "", endDate: "" });
                    setAuditPagination((prev) => ({ ...prev, offset: 0 }));
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Activity Log</h2>
                <p className="text-sm text-slate-500">
                  {auditPagination.total} total entries
                </p>
              </div>
            </div>
            {loadingAudit ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : auditLogs.length > 0 ? (
              <>
                <div className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="px-6 py-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-medium text-white flex-shrink-0">
                            {log.user.name?.charAt(0) || log.user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {log.user.name || log.user.email}
                              <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                {log.user.role}
                              </span>
                            </p>
                            <p className="text-sm text-slate-600 mt-0.5">
                              {AUDIT_ACTION_LABELS[log.action] || log.action}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                RESOURCE_COLORS[log.resource.toLowerCase()] || "bg-slate-100 text-slate-600"
                              }`}>
                                {log.resource}
                              </span>
                              {log.resourceId && (
                                <span className="text-xs text-slate-400">
                                  ID: {log.resourceId.slice(0, 8)}...
                                </span>
                              )}
                            </div>
                            {log.details && (
                              <details className="mt-2">
                                <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                                  View details
                                </summary>
                                <pre className="mt-2 text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto max-w-xl">
                                  {JSON.stringify(JSON.parse(log.details), null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 flex-shrink-0">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Showing {auditPagination.offset + 1} to {Math.min(auditPagination.offset + auditPagination.limit, auditPagination.total)} of {auditPagination.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAuditPagination((prev) => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                      disabled={auditPagination.offset === 0}
                      className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setAuditPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }))}
                      disabled={auditPagination.offset + auditPagination.limit >= auditPagination.total}
                      className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>No audit logs found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
