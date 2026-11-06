"use client";

import React, { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  AdminPlatformStats,
  AdminUserItem,
  AdminLoanItem,
  AdminToolItem,
  TOOL_CATEGORIES,
} from "@/features/tools/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ToastContainer, ToastMessage } from "@/components/ui/toast";
import {
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Users,
  Wrench,
  Repeat,
  Inbox,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  UserCheck,
  UserX,
  Power,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const viewer = useQuery(api.users.viewer);
  const isAdmin = viewer?.role === "admin";

  // Admin Data Queries (invoked conditionally on verified admin)
  const stats = useQuery(
    api.admin.getPlatformStats,
    isAdmin ? {} : "skip"
  ) as AdminPlatformStats | undefined;

  const usersList = useQuery(
    api.admin.listUsers,
    isAdmin ? {} : "skip"
  ) as AdminUserItem[] | undefined;

  const loansList = useQuery(
    api.admin.listAllLoans,
    isAdmin ? {} : "skip"
  ) as AdminLoanItem[] | undefined;

  const toolsList = useQuery(
    api.admin.listAllTools,
    isAdmin ? {} : "skip"
  ) as AdminToolItem[] | undefined;

  // Mutations
  const setTrustedLender = useMutation(api.admin.setTrustedLender);
  const deactivateTool = useMutation(api.admin.deactivateToolAdmin);
  const reactivateTool = useMutation(api.admin.reactivateToolAdmin);

  // Local State
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "loans" | "tools">("overview");

  // Users Tab Filters
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "trusted" | "regular" | "admin">("all");

  // Loans Tab Filters
  const [loanStatusFilter, setLoanStatusFilter] = useState<"all" | "active" | "overdue" | "returned">("all");

  // Tools Tab Filters
  const [toolSearch, setToolSearch] = useState("");
  const [toolCategoryFilter, setToolCategoryFilter] = useState<string>("all");
  const [toolStatusFilter, setToolStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Action / Confirmation Dialog States
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toolToDeactivate, setToolToDeactivate] = useState<AdminToolItem | null>(null);
  const [toolToReactivate, setToolToReactivate] = useState<AdminToolItem | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastCountRef = useRef(0);

  const addToast = (toast: Omit<ToastMessage, "id">) => {
    toastCountRef.current += 1;
    const id = `toast-${toastCountRef.current}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    if (!usersList) return [];
    let list = usersList;

    if (userFilter === "trusted") {
      list = list.filter((u) => u.isTrustedLender);
    } else if (userFilter === "regular") {
      list = list.filter((u) => !u.isTrustedLender && u.role === "user");
    } else if (userFilter === "admin") {
      list = list.filter((u) => u.role === "admin");
    }

    if (userSearch.trim()) {
      const q = userSearch.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.clerkUserId.toLowerCase().includes(q)
      );
    }

    return list;
  }, [usersList, userFilter, userSearch]);

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    if (!loansList) return [];
    if (loanStatusFilter === "active") return loansList.filter((l) => l.status === "active");
    if (loanStatusFilter === "overdue") return loansList.filter((l) => l.isOverdue);
    if (loanStatusFilter === "returned") return loansList.filter((l) => l.status === "returned");
    return loansList;
  }, [loansList, loanStatusFilter]);

  // Filtered Tools
  const filteredTools = useMemo(() => {
    if (!toolsList) return [];
    let list = toolsList;

    if (toolStatusFilter === "active") {
      list = list.filter((t) => t.isActive);
    } else if (toolStatusFilter === "inactive") {
      list = list.filter((t) => !t.isActive);
    }

    if (toolCategoryFilter !== "all") {
      list = list.filter((t) => t.category === toolCategoryFilter);
    }

    if (toolSearch.trim()) {
      const q = toolSearch.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.owner && t.owner.displayName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [toolsList, toolStatusFilter, toolCategoryFilter, toolSearch]);

  // Handlers: Trusted Lender Status
  const handleToggleTrustedLender = async (user: AdminUserItem) => {
    if (processingId) return;
    setProcessingId(user._id);

    const newStatus = !user.isTrustedLender;
    try {
      await setTrustedLender({
        userId: user._id,
        isTrusted: newStatus,
      });

      addToast({
        type: "success",
        title: newStatus ? "Trusted Lender Awarded" : "Trusted Lender Revoked",
        message: `${user.displayName} is ${
          newStatus ? "now recognized as a Trusted Lender" : "no longer marked as a Trusted Lender"
        }.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update user status.";
      addToast({
        type: "error",
        title: "Action Failed",
        message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Handlers: Tool Deactivation
  const handleConfirmDeactivate = async () => {
    if (!toolToDeactivate || processingId) return;
    setProcessingId(toolToDeactivate._id);

    try {
      await deactivateTool({ toolId: toolToDeactivate._id });
      addToast({
        type: "success",
        title: "Listing Deactivated",
        message: `"${toolToDeactivate.name}" has been removed from discovery. Historical loan records remain intact.`,
      });
      setToolToDeactivate(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to deactivate listing.";
      addToast({
        type: "error",
        title: "Deactivation Failed",
        message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Handlers: Tool Reactivation
  const handleConfirmReactivate = async () => {
    if (!toolToReactivate || processingId) return;
    setProcessingId(toolToReactivate._id);

    try {
      await reactivateTool({ toolId: toolToReactivate._id });
      addToast({
        type: "success",
        title: "Listing Reactivated",
        message: `"${toolToReactivate.name}" is once again discoverable in the neighborhood pool.`,
      });
      setToolToReactivate(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reactivate listing.";
      addToast({
        type: "error",
        title: "Reactivation Failed",
        message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  // 1. Loading State
  if (viewer === undefined) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#244B3C] mx-auto" />
        <p className="text-sm text-[#777D76]">Verifying administrator credentials with backend...</p>
      </div>
    );
  }

  // 2. Unauthorized View
  if (!viewer || viewer.role !== "admin") {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#FFF7F5] border border-[#F0785B]/30 text-[#F0785B] flex items-center justify-center mx-auto shadow-xs">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="font-editorial text-2xl text-[#19372D] font-normal">
          Access Restricted
        </h2>
        <p className="text-xs text-[#777D76] leading-relaxed">
          The LendLoop Admin Console requires authorized administrator privileges confirmed by the Convex backend. Your current role is &ldquo;{viewer?.role || "unprovisioned"}&rdquo;.
        </p>
        <div className="pt-2">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Return to Member Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Verified Administrator View
  return (
    <div className="space-y-8 text-left">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#19372D] text-[#F7F5EF] text-xs font-semibold shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#9CAF91]" />
            <span>Verified Administrator Session</span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl text-[#19372D] font-normal tracking-tight">
            Admin Control Console
          </h1>
          <p className="text-sm text-[#777D76]">
            Global moderation, trusted lender verification, and community activity oversight.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Member Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Platform KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Community Members */}
        <div className="p-5 rounded-3xl bg-white border border-[#E7E3D9] flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="p-2.5 rounded-2xl bg-[#DCE7D9] text-[#244B3C]">
              <Users className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#DCE7D9] text-[#19372D]">
              {stats ? `${stats.trustedLendersCount} trusted` : "..."}
            </span>
          </div>
          <div>
            <span className="text-2xl font-editorial font-normal text-[#19372D]">
              {stats ? stats.totalUsers : "—"}
            </span>
            <p className="text-xs text-[#777D76] mt-0.5">Community Members</p>
          </div>
        </div>

        {/* Metric 2: Tools Catalog */}
        <div className="p-5 rounded-3xl bg-white border border-[#E7E3D9] flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="p-2.5 rounded-2xl bg-[#DCE7D9] text-[#244B3C]">
              <Wrench className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#DCE7D9] text-[#19372D]">
              {stats ? `${stats.activeToolsCount} active` : "..."}
            </span>
          </div>
          <div>
            <span className="text-2xl font-editorial font-normal text-[#19372D]">
              {stats ? stats.totalTools : "—"}
            </span>
            <p className="text-xs text-[#777D76] mt-0.5">Tools in Catalog</p>
          </div>
        </div>

        {/* Metric 3: Active Loans */}
        <div className="p-5 rounded-3xl bg-white border border-[#E7E3D9] flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="p-2.5 rounded-2xl bg-[#F0785B]/15 text-[#F0785B]">
              <Repeat className="w-5 h-5" />
            </span>
            {stats && stats.overdueLoansCount > 0 ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F0785B]/20 text-[#c24b2f]">
                {stats.overdueLoansCount} overdue
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#DCE7D9] text-[#19372D]">
                0 overdue
              </span>
            )}
          </div>
          <div>
            <span className="text-2xl font-editorial font-normal text-[#19372D]">
              {stats ? stats.activeLoansCount : "—"}
            </span>
            <p className="text-xs text-[#777D76] mt-0.5">Active Loans On Foot</p>
          </div>
        </div>

        {/* Metric 4: Transactions & Requests */}
        <div className="p-5 rounded-3xl bg-white border border-[#E7E3D9] flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="p-2.5 rounded-2xl bg-[#DCD4F0] text-[#3e345e]">
              <Inbox className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#DCD4F0] text-[#3e345e]">
              {stats ? `${stats.pendingRequestsCount} pending` : "..."}
            </span>
          </div>
          <div>
            <span className="text-2xl font-editorial font-normal text-[#19372D]">
              {stats ? stats.totalRequests : "—"}
            </span>
            <p className="text-xs text-[#777D76] mt-0.5">Total Borrow Requests</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[#E7E3D9] flex gap-2 sm:gap-6 overflow-x-auto pb-1 text-sm font-medium">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-1 transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "overview"
              ? "border-[#19372D] text-[#19372D] font-semibold"
              : "border-transparent text-[#777D76] hover:text-[#292D2A]"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Platform Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 px-1 transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "users"
              ? "border-[#19372D] text-[#19372D] font-semibold"
              : "border-transparent text-[#777D76] hover:text-[#292D2A]"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users & Trusted Lenders</span>
          {usersList && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#E7E3D9] text-[#19372D]">
              {usersList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("loans")}
          className={`pb-3 px-1 transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "loans"
              ? "border-[#19372D] text-[#19372D] font-semibold"
              : "border-transparent text-[#777D76] hover:text-[#292D2A]"
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>All Platform Loans</span>
          {loansList && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#E7E3D9] text-[#19372D]">
              {loansList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("tools")}
          className={`pb-3 px-1 transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "tools"
              ? "border-[#19372D] text-[#19372D] font-semibold"
              : "border-transparent text-[#777D76] hover:text-[#292D2A]"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Tool Moderation</span>
          {toolsList && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#E7E3D9] text-[#19372D]">
              {toolsList.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: OVERVIEW & HEALTH */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Health Card 1: Lending Status */}
            <div className="p-6 rounded-3xl bg-white border border-[#E7E3D9] space-y-4">
              <div className="flex items-center gap-2 text-base font-editorial text-[#19372D]">
                <ShieldCheck className="w-5 h-5 text-[#244B3C]" />
                <span>Lending & Trust Health</span>
              </div>
              <p className="text-xs text-[#777D76] leading-relaxed">
                LendLoop operates on reciprocal trust. Verified administrators have the authority to grant or revoke the <strong>Trusted Lender</strong> badge, which gives community members added confidence when borrowing higher-value tools.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs">
                <div className="px-3.5 py-2 rounded-2xl bg-[#F7F5EF] border border-[#E7E3D9]">
                  <span className="text-[#777D76]">Trusted Ratio: </span>
                  <strong className="text-[#19372D]">
                    {stats && stats.totalUsers > 0
                      ? `${Math.round((stats.trustedLendersCount / stats.totalUsers) * 100)}%`
                      : "—"}
                  </strong>
                </div>
                <div className="px-3.5 py-2 rounded-2xl bg-[#F7F5EF] border border-[#E7E3D9]">
                  <span className="text-[#777D76]">Returned Loans: </span>
                  <strong className="text-[#244B3C]">
                    {stats ? stats.returnedLoansCount : "—"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Health Card 2: Catalog Status */}
            <div className="p-6 rounded-3xl bg-white border border-[#E7E3D9] space-y-4">
              <div className="flex items-center gap-2 text-base font-editorial text-[#19372D]">
                <ShieldAlert className="w-5 h-5 text-[#F0785B]" />
                <span>Moderation Policy</span>
              </div>
              <p className="text-xs text-[#777D76] leading-relaxed">
                Tool listings that are inappropriate, hazardous, or no longer available can be soft-deactivated by an administrator. This immediately hides the tool from public discovery while preserving historical borrow requests and audit history.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs">
                <div className="px-3.5 py-2 rounded-2xl bg-[#F7F5EF] border border-[#E7E3D9]">
                  <span className="text-[#777D76]">Deactivated Tools: </span>
                  <strong className="text-[#F0785B]">
                    {stats ? stats.inactiveToolsCount : "—"}
                  </strong>
                </div>
                <div className="px-3.5 py-2 rounded-2xl bg-[#F7F5EF] border border-[#E7E3D9]">
                  <span className="text-[#777D76]">Active Catalogs: </span>
                  <strong className="text-[#244B3C]">
                    {stats ? stats.activeToolsCount : "—"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Overdue Alert Banner if any overdue loans exist */}
          {stats && stats.overdueLoansCount > 0 && (
            <div className="p-5 rounded-3xl bg-[#FFF7F5] border border-[#F0785B]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#F0785B] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-[#19372D]">
                    {stats.overdueLoansCount} Active Loan{stats.overdueLoansCount === 1 ? " is" : "s are"} Overdue
                  </h4>
                  <p className="text-xs text-[#777D76]">
                    Loans past their exclusive return date require attention. Review them in the Loans tab.
                  </p>
                </div>
              </div>
              <Button
                variant="coral"
                size="sm"
                onClick={() => {
                  setActiveTab("loans");
                  setLoanStatusFilter("overdue");
                }}
              >
                Inspect Overdue Loans
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USERS & TRUSTED LENDERS */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* Controls: Search and Role Filter */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777D76]" />
              <input
                type="text"
                placeholder="Search member name or Clerk ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-[#E7E3D9] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#244B3C]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(["all", "trusted", "regular", "admin"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setUserFilter(filter)}
                  className={`text-xs px-3 py-1.5 rounded-full capitalize transition-colors ${
                    userFilter === filter
                      ? "bg-[#19372D] text-white font-semibold"
                      : "bg-white border border-[#E7E3D9] text-[#777D76] hover:text-[#19372D]"
                  }`}
                >
                  {filter === "all" ? "All Members" : filter}
                </button>
              ))}
            </div>
          </div>

          {/* User List */}
          {usersList === undefined ? (
            <div className="py-16 text-center text-xs text-[#777D76] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#244B3C]" />
              <span>Loading member registry from database...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              title="No Members Found"
              description="No community members match your current search or filter criteria."
            />
          ) : (
            <div className="bg-white rounded-3xl border border-[#E7E3D9] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F5EF] border-b border-[#E7E3D9] text-[#777D76] font-semibold">
                    <tr>
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Trusted Status</th>
                      <th className="py-3 px-4">Tools & Activity</th>
                      <th className="py-3 px-4">Joined</th>
                      <th className="py-3 px-4 text-right">Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E3D9]/60">
                    {filteredUsers.map((u) => {
                      const isCurrentUser = u.clerkUserId === viewer.clerkUserId;
                      return (
                        <tr key={u._id} className="hover:bg-[#F7F5EF]/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-[#19372D] text-sm">
                                {u.displayName}
                              </span>
                              {isCurrentUser && (
                                <span className="text-[10px] font-semibold text-[#244B3C] bg-[#DCE7D9] px-1.5 py-0.5 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#777D76] font-mono">
                              {u.clerkUserId}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {u.role === "admin" ? (
                              <Badge variant="coral" size="sm">
                                <ShieldCheck className="w-3 h-3 mr-0.5" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">
                                Member
                              </Badge>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {u.isTrustedLender ? (
                              <Badge variant="sage" size="sm">
                                <CheckCircle2 className="w-3 h-3 text-[#244B3C]" />
                                Trusted Lender
                              </Badge>
                            ) : (
                              <span className="text-[#777D76] text-xs">Standard</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-[#777D76]">
                            <div>{u.toolsCount} listed ({u.activeToolsCount} active)</div>
                            <div className="text-[11px]">
                              Loans: {u.activeLoansAsLenderCount} lender / {u.activeLoansAsBorrowerCount} borrower
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-[#777D76]">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant={u.isTrustedLender ? "outline" : "secondary"}
                              size="sm"
                              disabled={processingId === u._id}
                              onClick={() => handleToggleTrustedLender(u)}
                            >
                              {processingId === u._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : u.isTrustedLender ? (
                                <>
                                  <UserX className="w-3.5 h-3.5 mr-1 text-[#F0785B]" />
                                  <span>Revoke Badge</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 mr-1 text-[#244B3C]" />
                                  <span>Award Trusted</span>
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALL PLATFORM LOANS */}
      {activeTab === "loans" && (
        <div className="space-y-6">
          {/* Controls: Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(["all", "active", "overdue", "returned"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setLoanStatusFilter(filter)}
                className={`text-xs px-3.5 py-1.5 rounded-full capitalize transition-colors ${
                  loanStatusFilter === filter
                    ? "bg-[#19372D] text-white font-semibold"
                    : "bg-white border border-[#E7E3D9] text-[#777D76] hover:text-[#19372D]"
                }`}
              >
                {filter === "all" ? "All Loans" : filter}
              </button>
            ))}
          </div>

          {/* Loans Table */}
          {loansList === undefined ? (
            <div className="py-16 text-center text-xs text-[#777D76] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#244B3C]" />
              <span>Loading platform loans...</span>
            </div>
          ) : filteredLoans.length === 0 ? (
            <EmptyState
              title="No Loans Found"
              description="No loans currently match the selected status filter."
            />
          ) : (
            <div className="bg-white rounded-3xl border border-[#E7E3D9] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F5EF] border-b border-[#E7E3D9] text-[#777D76] font-semibold">
                    <tr>
                      <th className="py-3 px-4">Tool</th>
                      <th className="py-3 px-4">Lender</th>
                      <th className="py-3 px-4">Borrower</th>
                      <th className="py-3 px-4">Loan Dates [Start, Due)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E3D9]/60">
                    {filteredLoans.map((loan) => (
                      <tr key={loan._id} className="hover:bg-[#F7F5EF]/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#19372D] text-sm">
                            {loan.tool?.name || "Removed Tool"}
                          </div>
                          <div className="text-[11px] text-[#777D76]">
                            {loan.tool?.category || "Other"} • {loan.tool?.condition || "Good"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#19372D]">
                            {loan.lender?.displayName || "Unknown Lender"}
                          </div>
                          {loan.lender?.isTrustedLender && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#244B3C] font-semibold">
                              <ShieldCheck className="w-3 h-3" /> Trusted
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-[#19372D]">
                          {loan.borrower?.displayName || "Unknown Borrower"}
                        </td>

                        <td className="py-3.5 px-4 text-[#777D76]">
                          <div className="font-mono text-[11px]">
                            {loan.startDate} → {loan.dueDate}
                          </div>
                          {loan.isOverdue && (
                            <div className="inline-flex items-center gap-1 text-[10px] text-[#c24b2f] font-semibold mt-0.5">
                              <AlertTriangle className="w-3 h-3" /> Overdue
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {loan.status === "active" ? (
                            loan.isOverdue ? (
                              <Badge variant="coral" size="sm">
                                Overdue
                              </Badge>
                            ) : (
                              <Badge variant="sage" size="sm">
                                Active Loan
                              </Badge>
                            )
                          ) : (
                            <Badge variant="neutral" size="sm">
                              Returned {loan.returnedAt ? `(${new Date(loan.returnedAt).toLocaleDateString()})` : ""}
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[#777D76]">
                          {new Date(loan.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TOOL CATALOG MODERATION */}
      {activeTab === "tools" && (
        <div className="space-y-6">
          {/* Controls: Search, Category, Status */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777D76]" />
              <input
                type="text"
                placeholder="Search tool name, description or owner..."
                value={toolSearch}
                onChange={(e) => setToolSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-[#E7E3D9] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#244B3C]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Category selector */}
              <select
                value={toolCategoryFilter}
                onChange={(e) => setToolCategoryFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-2xl bg-white border border-[#E7E3D9] text-[#19372D] focus:outline-none focus:ring-2 focus:ring-[#244B3C]"
              >
                <option value="all">All Categories</option>
                {TOOL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Status pills */}
              {(["all", "active", "inactive"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setToolStatusFilter(filter)}
                  className={`text-xs px-3 py-1.5 rounded-full capitalize transition-colors ${
                    toolStatusFilter === filter
                      ? "bg-[#19372D] text-white font-semibold"
                      : "bg-white border border-[#E7E3D9] text-[#777D76] hover:text-[#19372D]"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Tools Table */}
          {toolsList === undefined ? (
            <div className="py-16 text-center text-xs text-[#777D76] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#244B3C]" />
              <span>Loading tool catalog...</span>
            </div>
          ) : filteredTools.length === 0 ? (
            <EmptyState
              title="No Tools Found"
              description="No tools match the selected filters."
            />
          ) : (
            <div className="bg-white rounded-3xl border border-[#E7E3D9] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F5EF] border-b border-[#E7E3D9] text-[#777D76] font-semibold">
                    <tr>
                      <th className="py-3 px-4">Tool</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Owner</th>
                      <th className="py-3 px-4">Availability</th>
                      <th className="py-3 px-4">Historical Loans</th>
                      <th className="py-3 px-4 text-right">Moderation Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E3D9]/60">
                    {filteredTools.map((tool) => (
                      <tr key={tool._id} className="hover:bg-[#F7F5EF]/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#19372D] text-sm">
                            {tool.name}
                          </div>
                          <div className="text-[11px] text-[#777D76] max-w-xs truncate">
                            {tool.description}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[#777D76]">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#E7E3D9]/60 text-[#19372D] text-[11px]">
                            {tool.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#19372D]">
                            {tool.owner?.displayName || "Unknown Owner"}
                          </div>
                          {tool.owner?.isTrustedLender && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#244B3C] font-semibold">
                              <ShieldCheck className="w-3 h-3" /> Trusted
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {!tool.isActive ? (
                            <Badge variant="coral" size="sm">
                              Deactivated
                            </Badge>
                          ) : tool.hasActiveLoan ? (
                            <Badge variant="butter" size="sm">
                              On Loan
                            </Badge>
                          ) : (
                            <Badge variant="sage" size="sm">
                              Active / Available
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[#777D76]">
                          {tool.totalLoansCount} loan{tool.totalLoansCount === 1 ? "" : "s"} recorded
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {tool.isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[#c24b2f] border-[#F0785B]/30 hover:bg-[#FFF7F5]"
                              onClick={() => setToolToDeactivate(tool)}
                            >
                              <Power className="w-3.5 h-3.5 mr-1" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[#244B3C] border-[#244B3C]/30 hover:bg-[#DCE7D9]/20"
                              onClick={() => setToolToReactivate(tool)}
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              Reactivate
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION DIALOG: DEACTIVATE TOOL */}
      <Dialog
        isOpen={toolToDeactivate !== null}
        onClose={() => setToolToDeactivate(null)}
        title="Confirm Tool Deactivation"
        description="Are you sure you want to remove this tool from community discovery?"
      >
        <div className="space-y-4 text-left">
          <div className="p-4 rounded-2xl bg-[#FFF7F5] border border-[#F0785B]/30 text-xs text-[#777D76] space-y-2">
            <p className="font-semibold text-[#19372D]">
              Tool: &ldquo;{toolToDeactivate?.name}&rdquo;
            </p>
            <p>
              Owner: {toolToDeactivate?.owner?.displayName || "Unknown"}
            </p>
            <p className="text-[11px] leading-relaxed text-[#c24b2f]">
              <strong>Soft-Deactivation Notice:</strong> The tool will immediately disappear from public search and borrowing pools. However, past borrow requests and completed loan records will NOT be damaged or deleted.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setToolToDeactivate(null)}
              disabled={processingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="coral"
              size="sm"
              onClick={handleConfirmDeactivate}
              disabled={processingId !== null}
            >
              {processingId !== null ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Deactivate Listing"
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* CONFIRMATION DIALOG: REACTIVATE TOOL */}
      <Dialog
        isOpen={toolToReactivate !== null}
        onClose={() => setToolToReactivate(null)}
        title="Reactivate Tool Listing"
        description="Restore this tool to public neighborhood discovery?"
      >
        <div className="space-y-4 text-left">
          <div className="p-4 rounded-2xl bg-[#DCE7D9]/40 border border-[#9CAF91]/40 text-xs text-[#19372D] space-y-2">
            <p className="font-semibold">
              Tool: &ldquo;{toolToReactivate?.name}&rdquo;
            </p>
            <p className="text-xs text-[#777D76]">
              Owner: {toolToReactivate?.owner?.displayName || "Unknown"}
            </p>
            <p className="text-[11px] leading-relaxed text-[#244B3C]">
              This tool will become visible again to neighbors looking for tools in the {toolToReactivate?.category} category.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setToolToReactivate(null)}
              disabled={processingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleConfirmReactivate}
              disabled={processingId !== null}
            >
              {processingId !== null ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Reactivate Listing"
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
