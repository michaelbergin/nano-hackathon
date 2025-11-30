"use client";

import { useState, useEffect, useCallback, type JSX } from "react";
import {
  Search,
  Users,
  Crown,
  Clock,
  UserCheck,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type UserStatus = "waitlist" | "user" | "userPro" | "admin";

interface User {
  id: string;
  email: string;
  name: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminDashboardProps {
  adminEmail: string;
}

const STATUS_CONFIG: Record<
  UserStatus,
  { label: string; icon: typeof Users; color: string; bgColor: string }
> = {
  waitlist: {
    label: "Waitlist",
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
  },
  user: {
    label: "User",
    icon: UserCheck,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200",
  },
  userPro: {
    label: "Pro",
    icon: Sparkles,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
  },
  admin: {
    label: "Admin",
    icon: Crown,
    color: "text-rose-600",
    bgColor: "bg-rose-50 border-rose-200",
  },
};

/**
 * Admin dashboard client component for managing users
 */
export function AdminDashboard({ adminEmail }: AdminDashboardProps): JSX.Element {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { users: User[]; pagination: Pagination };
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleStatusChange = useCallback(
    async (userId: string, newStatus: UserStatus): Promise<void> => {
      setUpdatingUserId(userId);
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        if (res.ok) {
          setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
          );
        } else {
          const error = (await res.json()) as { error: string };
          alert(error.error || "Failed to update status");
        }
      } catch (error) {
        console.error("Error updating status:", error);
      } finally {
        setUpdatingUserId(null);
      }
    },
    []
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent): void => {
      e.preventDefault();
      setPagination((prev) => ({ ...prev, page: 1 }));
      void fetchUsers();
    },
    [fetchUsers]
  );

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="h-full w-full overflow-auto bg-background">
      {/* Page Header */}
      <div className="border-b bg-muted/30 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-rose-500" />
            <h1 className="text-lg font-semibold">Admin Panel</h1>
          </div>
          <div className="text-sm text-muted-foreground">{adminEmail}</div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {(["waitlist", "user", "userPro", "admin"] as const).map((status) => {
            const config = STATUS_CONFIG[status];
            const Icon = config.icon;
            const count = users.filter((u) => u.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? "" : status)}
                className={`p-4 rounded-xl border transition-all ${
                  statusFilter === status
                    ? `${config.bgColor} border-current`
                    : "bg-card border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-sm text-muted-foreground">{config.label}</span>
                </div>
                <div className="text-2xl font-semibold">{count}</div>
              </button>
            );
          })}
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchUsers()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Users table */}
        <div className="rounded-xl border overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    User
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Joined
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const config = STATUS_CONFIG[user.status];
                    const Icon = config.icon;
                    const isUpdating = updatingUserId === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{user.email}</span>
                            {user.name && (
                              <span className="text-sm text-muted-foreground">{user.name}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`${config.bgColor} ${config.color} border`}
                          >
                            <Icon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {(["waitlist", "user", "userPro", "admin"] as const).map(
                              (status) => {
                                const statusConfig = STATUS_CONFIG[status];
                                const StatusIcon = statusConfig.icon;
                                const isActive = user.status === status;
                                return (
                                  <Button
                                    key={status}
                                    variant="ghost"
                                    size="sm"
                                    disabled={isActive || isUpdating}
                                    onClick={() => handleStatusChange(user.id, status)}
                                    className={`h-8 px-2 ${
                                      isActive
                                        ? `${statusConfig.color} opacity-100`
                                        : "text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100"
                                    }`}
                                    title={`Set as ${statusConfig.label}`}
                                  >
                                    <StatusIcon className="w-4 h-4" />
                                  </Button>
                                );
                              }
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} users
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

