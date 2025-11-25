"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

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

const RESOURCE_COLORS: Record<string, string> = {
  users: "bg-purple-100 text-purple-700",
  vehicles: "bg-blue-100 text-blue-700",
  bookings: "bg-green-100 text-green-700",
  reviews: "bg-yellow-100 text-yellow-700",
  payments: "bg-emerald-100 text-emerald-700",
  permissions: "bg-red-100 text-red-700",
  audit_logs: "bg-slate-100 text-slate-700",
};

const ACTION_ICONS: Record<string, string> = {
  create: "+",
  read: "?",
  update: "~",
  delete: "x",
  manage: "*",
};

export default function PermissionsPage() {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"roles" | "audit">("roles");
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [permRes, auditRes] = await Promise.all([
        fetch("/api/admin/permissions"),
        fetch("/api/admin/audit-logs?limit=20"),
      ]);

      if (permRes.ok) {
        const data = await permRes.json();
        setRoles(data.roles);
        setPermissions(data.permissions);
      }

      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleInitializePermissions = async () => {
    if (!confirm("This will initialize/update all permissions in the database. Continue?")) {
      return;
    }

    setInitializing(true);
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
      });

      if (res.ok) {
        alert("Permissions initialized successfully!");
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to initialize permissions");
      }
    } catch (error) {
      console.error("Error initializing permissions:", error);
      alert("Failed to initialize permissions");
    }
    setInitializing(false);
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

  const formatAction = (action: string): string => {
    const actionMap: Record<string, string> = {
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
    return actionMap[action] || action;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const groupedPermissions = groupPermissionsByResource();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Permissions & Audit</h1>
          <p className="text-slate-500">Manage roles, permissions, and view audit logs</p>
        </div>
        {session?.user?.role === "SUPER_ADMIN" && (
          <button
            onClick={handleInitializePermissions}
            disabled={initializing}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {initializing ? "Initializing..." : "Initialize Permissions"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            activeTab === "roles"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Roles & Permissions
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            activeTab === "audit"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Audit Logs
        </button>
      </div>

      {activeTab === "roles" && (
        <div className="space-y-6">
          {/* Roles Overview */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <div
                key={role.role}
                className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">{role.displayName}</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                    {role.permissions.length} perms
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-4">{role.description}</p>
                <div className="flex flex-wrap gap-1">
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
              </div>
            ))}
          </div>

          {/* Permission Matrix */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Permission Matrix</h2>
              <p className="text-sm text-slate-500">Overview of permissions by role and resource</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Resource / Action
                    </th>
                    {roles.map((role) => (
                      <th
                        key={role.role}
                        className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        {role.displayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(groupedPermissions).map(([resource, perms]) => (
                    <tr key={resource} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-2 text-sm font-medium ${RESOURCE_COLORS[resource]?.split(" ")[1] || "text-slate-700"}`}>
                          <span className={`px-2 py-0.5 rounded ${RESOURCE_COLORS[resource] || "bg-slate-100"}`}>
                            {resource}
                          </span>
                        </span>
                        <div className="flex gap-2 mt-1">
                          {perms.map((perm) => (
                            <span key={perm.key} className="text-xs text-slate-400" title={perm.name}>
                              {ACTION_ICONS[perm.action] || perm.action}
                            </span>
                          ))}
                        </div>
                      </td>
                      {roles.map((role) => (
                        <td key={role.role} className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            {perms.map((perm) => {
                              const hasPermission = role.permissions.includes(perm.name);
                              return (
                                <span
                                  key={perm.key}
                                  title={`${perm.action}: ${hasPermission ? "Yes" : "No"}`}
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-medium ${
                                    hasPermission
                                      ? "bg-green-100 text-green-700"
                                      : "bg-slate-100 text-slate-400"
                                  }`}
                                >
                                  {ACTION_ICONS[perm.action] || perm.action[0]}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Legend: + Create, ? Read, ~ Update, x Delete, * Manage (all)
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Activity</h2>
            <p className="text-sm text-slate-500">Audit log of administrative actions</p>
          </div>
          <div className="divide-y divide-slate-100">
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div key={log.id} className="px-6 py-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-medium text-white">
                        {log.user.name?.charAt(0) || log.user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {log.user.name || log.user.email}
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            ({log.user.role})
                          </span>
                        </p>
                        <p className="text-sm text-slate-600">{formatAction(log.action)}</p>
                        {log.resourceId && (
                          <p className="text-xs text-slate-400 mt-1">
                            {log.resource} ID: {log.resourceId.slice(0, 8)}...
                          </p>
                        )}
                        {log.details && (
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                              View details
                            </summary>
                            <pre className="mt-2 text-xs bg-slate-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(JSON.parse(log.details), null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-slate-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="mt-4 text-slate-500">No audit logs yet</p>
                <p className="text-sm text-slate-400">
                  Activity will appear here as actions are performed
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
