"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { UserRole, UserStatus } from "@prisma/client";

interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  image: string | null;
  emailVerified: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  _count: {
    bookings: number;
    reviews: number;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLE_BADGES: Record<UserRole, string> = {
  USER: "bg-slate-100 text-slate-700",
  MANAGER: "bg-blue-100 text-blue-700",
  ADMIN: "bg-purple-100 text-purple-700",
  SUPER_ADMIN: "bg-red-100 text-red-700",
};

const STATUS_BADGES: Record<UserStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-yellow-100 text-yellow-700",
  BANNED: "bg-red-100 text-red-700",
};

export default function UserTable() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();

      if (res.ok) {
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  }, [pagination.page, pagination.limit, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  const handleUpdateUser = async (userId: string, data: Partial<User>) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        fetchUsers();
        setEditingUser(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user");
    }
    setActionLoading(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
    setActionLoading(null);
  };

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    await handleUpdateUser(userId, { status: newStatus } as Partial<User>);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    await handleUpdateUser(userId, { role: newRole } as Partial<User>);
  };

  const canManageUser = (targetRole: UserRole) => {
    const roleHierarchy: UserRole[] = ["USER", "MANAGER", "ADMIN", "SUPER_ADMIN"];
    const currentIndex = roleHierarchy.indexOf(session?.user?.role as UserRole);
    const targetIndex = roleHierarchy.indexOf(targetRole);
    return currentIndex > targetIndex || session?.user?.role === "SUPER_ADMIN";
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="USER">User</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BANNED">Banned</option>
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
          >
            + Add User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Activity
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Last Login
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="group hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-medium text-white">
                          {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {user.name || "No name"}
                          </p>
                          <p className="text-xs text-slate-500">ID: {user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">{user.email}</p>
                      {user.phone && (
                        <p className="text-xs text-slate-500">{user.phone}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {canManageUser(user.role) && session?.user?.id !== user.id ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          disabled={actionLoading === user.id}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer ${ROLE_BADGES[user.role]}`}
                        >
                          <option value="USER">USER</option>
                          <option value="MANAGER">MANAGER</option>
                          {(session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") && (
                            <option value="ADMIN">ADMIN</option>
                          )}
                          {session?.user?.role === "SUPER_ADMIN" && (
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          )}
                        </select>
                      ) : (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_BADGES[user.role]}`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {canManageUser(user.role) && session?.user?.id !== user.id ? (
                        <select
                          value={user.status}
                          onChange={(e) => handleStatusChange(user.id, e.target.value as UserStatus)}
                          disabled={actionLoading === user.id}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer ${STATUS_BADGES[user.status]}`}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="SUSPENDED">SUSPENDED</option>
                          <option value="BANNED">BANNED</option>
                        </select>
                      ) : (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGES[user.status]}`}>
                          {user.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-slate-700">{user._count.bookings} bookings</p>
                        <p className="text-xs text-slate-500">{user._count.reviews} reviews</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-500">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : "Never"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
                        >
                          Edit
                        </button>
                        {session?.user?.role === "SUPER_ADMIN" && session?.user?.id !== user.id && (
                          <button
                            onClick={() => setPermissionsUser(user)}
                            className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200 transition"
                          >
                            Perms
                          </button>
                        )}
                        {canManageUser(user.role) && session?.user?.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={actionLoading === user.id}
                            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="mt-4 text-slate-500">No users found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <p className="text-sm text-slate-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={(data) => handleUpdateUser(editingUser.id, data)}
          loading={actionLoading === editingUser.id}
          currentUserRole={session?.user?.role as UserRole}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
          currentUserRole={session?.user?.role as UserRole}
        />
      )}

      {/* Permissions Modal */}
      {permissionsUser && (
        <PermissionsModal
          user={permissionsUser}
          onClose={() => setPermissionsUser(null)}
        />
      )}
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({
  user,
  onClose,
  onSave,
  loading,
  currentUserRole,
}: {
  user: User;
  onClose: () => void;
  onSave: (data: Partial<User>) => void;
  loading: boolean;
  currentUserRole: UserRole;
}) {
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    status: user.status,
    password: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      status: formData.status,
    };
    if (formData.password) {
      data.password = formData.password;
    }
    onSave(data as Partial<User>);
  };

  const roleOptions: UserRole[] = ["USER", "MANAGER"];
  if (currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN") {
    roleOptions.push("ADMIN");
  }
  if (currentUserRole === "SUPER_ADMIN") {
    roleOptions.push("SUPER_ADMIN");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Edit User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Password <span className="text-slate-400">(leave blank to keep current)</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter new password"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Create User Modal Component
function CreateUserModal({
  onClose,
  onSuccess,
  currentUserRole,
}: {
  onClose: () => void;
  onSuccess: () => void;
  currentUserRole: UserRole;
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "USER" as UserRole,
    status: "ACTIVE" as UserStatus,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create user");
      }
    } catch (err) {
      console.error("Error creating user:", err);
      setError("Failed to create user");
    }
    setLoading(false);
  };

  const roleOptions: UserRole[] = ["USER", "MANAGER"];
  if (currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN") {
    roleOptions.push("ADMIN");
  }
  if (currentUserRole === "SUPER_ADMIN") {
    roleOptions.push("SUPER_ADMIN");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Create New User</h2>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Minimum 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Permissions Modal Component
interface Permission {
  key: string;
  name: string;
  resource: string;
  action: string;
}

interface UserPermissionData {
  user: { id: string; name: string | null; email: string; role: UserRole };
  effectivePermissions: string[];
  userSpecificPermissions: { permission: string; granted: boolean }[];
  allPermissions: Permission[];
}

function PermissionsModal({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const [data, setData] = useState<UserPermissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, [user.id]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/permissions`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    }
    setLoading(false);
  };

  const handleGrantPermission = async (permission: string) => {
    setActionLoading(permission);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission }),
      });

      if (res.ok) {
        fetchPermissions();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to grant permission");
      }
    } catch (error) {
      console.error("Error granting permission:", error);
      alert("Failed to grant permission");
    }
    setActionLoading(null);
  };

  const handleRevokePermission = async (permission: string) => {
    setActionLoading(permission);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/permissions?permission=${encodeURIComponent(permission)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchPermissions();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to revoke permission");
      }
    } catch (error) {
      console.error("Error revoking permission:", error);
      alert("Failed to revoke permission");
    }
    setActionLoading(null);
  };

  const groupPermissionsByResource = () => {
    if (!data) return {};
    const grouped: Record<string, Permission[]> = {};
    data.allPermissions.forEach((perm) => {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = [];
      }
      grouped[perm.resource].push(perm);
    });
    return grouped;
  };

  const isPermissionGranted = (permName: string) => {
    return data?.effectivePermissions.includes(permName) || false;
  };

  const isUserSpecificPermission = (permName: string) => {
    return data?.userSpecificPermissions.some((up) => up.permission === permName && up.granted) || false;
  };

  const groupedPermissions = groupPermissionsByResource();

  const RESOURCE_COLORS: Record<string, string> = {
    users: "border-purple-200 bg-purple-50",
    vehicles: "border-blue-200 bg-blue-50",
    bookings: "border-green-200 bg-green-50",
    reviews: "border-yellow-200 bg-yellow-50",
    payments: "border-emerald-200 bg-emerald-50",
    permissions: "border-red-200 bg-red-50",
    audit_logs: "border-slate-200 bg-slate-50",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            Manage Permissions: {user.name || user.email}
          </h2>
          <p className="text-sm text-slate-500">
            Role: <span className="font-medium">{user.role}</span> - Grant or revoke individual permissions
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([resource, perms]) => (
                <div key={resource} className={`rounded-xl border p-4 ${RESOURCE_COLORS[resource] || "border-slate-200 bg-slate-50"}`}>
                  <h3 className="font-semibold text-slate-900 capitalize mb-3">{resource}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {perms.map((perm) => {
                      const isGranted = isPermissionGranted(perm.name);
                      const isUserSpecific = isUserSpecificPermission(perm.name);
                      const isLoading = actionLoading === perm.name;

                      return (
                        <button
                          key={perm.key}
                          onClick={() => {
                            if (isUserSpecific) {
                              handleRevokePermission(perm.name);
                            } else if (!isGranted) {
                              handleGrantPermission(perm.name);
                            }
                          }}
                          disabled={isLoading || (isGranted && !isUserSpecific)}
                          className={`relative rounded-lg px-3 py-2 text-xs font-medium transition ${
                            isGranted
                              ? isUserSpecific
                                ? "bg-purple-600 text-white hover:bg-purple-700"
                                : "bg-green-100 text-green-700 cursor-not-allowed"
                              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                          } ${isLoading ? "opacity-50" : ""}`}
                          title={
                            isUserSpecific
                              ? "Click to revoke (user-specific)"
                              : isGranted
                              ? "Granted by role"
                              : "Click to grant"
                          }
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            </span>
                          ) : (
                            <>
                              {perm.action}
                              {isUserSpecific && (
                                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-purple-400" />
                              )}
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-green-100 border border-green-300" /> From role
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-purple-600" /> User-specific
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-white border border-slate-300" /> Not granted
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
