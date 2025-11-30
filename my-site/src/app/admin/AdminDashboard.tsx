"use client";

import { useState, useEffect, useCallback, type JSX } from "react";
import Link from "next/link";
import {
  ArrowLeft,
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
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
  },
  user: {
    label: "User",
    icon: UserCheck,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
  },
  userPro: {
    label: "Pro",
    icon: Sparkles,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/20",
  },
  admin: {
    label: "Admin",
    icon: Crown,
    color: "text-rose-400",
    bgColor: "bg-rose-500/10 border-rose-500/20",
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
    <div className="min-h-dvh w-full bg-[#0a0a0b] text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 text-zinc-400 hover:text-white">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div className="h-6 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-rose-400" />
              <h1 className="text-lg font-semibold">Admin Panel</h1>
            </div>
          </div>
          <div className="text-sm text-zinc-500">{adminEmail}</div>
        </div>
      </header>

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
                    : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-sm text-zinc-400">{config.label}</span>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
              />
            </div>
            <Button type="submit" variant="secondary" className="bg-zinc-800 hover:bg-zinc-700">
              Search
            </Button>
          </form>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchUsers()}
            disabled={isLoading}
            className="border-zinc-800 hover:bg-zinc-800"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Users table */}
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/30">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                    User
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                    Joined
                  </th>
                  <th className="text-right text-xs font-medium text-zinc-400 uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
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
                      <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-white">{user.email}</span>
                            {user.name && (
                              <span className="text-sm text-zinc-500">{user.name}</span>
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
                        <td className="px-4 py-3 text-sm text-zinc-400">
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
                                        : "text-zinc-500 hover:text-white opacity-50 hover:opacity-100"
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-900/50">
              <div className="text-sm text-zinc-500">
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
                  className="border-zinc-800 hover:bg-zinc-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  className="border-zinc-800 hover:bg-zinc-800"
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

