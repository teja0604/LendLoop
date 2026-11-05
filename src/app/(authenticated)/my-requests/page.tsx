"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { RequestStatus, BorrowRequestWithDetails } from "@/features/tools/types";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarDays, Loader2, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

export default function MyRequestsPage() {
  const router = useRouter();
  const requests = useQuery(api.borrowRequests.getMyRequests) as
    | BorrowRequestWithDetails[]
    | undefined;

  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    if (statusFilter === "all") return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  const pendingCount = requests ? requests.filter((r) => r.status === "pending").length : 0;
  const approvedCount = requests ? requests.filter((r) => r.status === "approved").length : 0;
  const declinedCount = requests ? requests.filter((r) => r.status === "declined").length : 0;
  const totalCount = requests ? requests.length : 0;

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="butter" size="sm">Pending Review</Badge>;
      case "approved":
        return <Badge variant="sage" size="sm">Approved</Badge>;
      case "declined":
        return <Badge variant="coral" size="sm">Declined</Badge>;
    }
  };

  return (
    <div className="space-y-8 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E7E3D9]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#DCE7D9] text-[#19372D] text-xs font-semibold">
            <CalendarDays className="w-3.5 h-3.5 text-[#244B3C]" />
            <span>Borrower Workspace</span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl text-[#19372D] font-normal tracking-tight">
            My Borrowing Requests
          </h1>
          <p className="text-sm text-[#777D76]">
            Track status updates for tools you have requested from neighborhood lenders.
          </p>
        </div>

        <Link href="/">
          <span className="text-xs font-medium text-[#244B3C] hover:underline flex items-center gap-1">
            Browse more tools <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </div>

      {/* Filter Tabs */}
      {requests && requests.length > 0 && (
        <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              statusFilter === "all"
                ? "bg-[#19372D] text-[#F7F5EF] shadow-xs"
                : "bg-white text-[#777D76] border border-[#E7E3D9] hover:text-[#19372D]"
            }`}
          >
            All Requests ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              statusFilter === "pending"
                ? "bg-[#19372D] text-[#F7F5EF] shadow-xs"
                : "bg-white text-[#777D76] border border-[#E7E3D9] hover:text-[#19372D]"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter("approved")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              statusFilter === "approved"
                ? "bg-[#19372D] text-[#F7F5EF] shadow-xs"
                : "bg-white text-[#777D76] border border-[#E7E3D9] hover:text-[#19372D]"
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter("declined")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              statusFilter === "declined"
                ? "bg-[#19372D] text-[#F7F5EF] shadow-xs"
                : "bg-white text-[#777D76] border border-[#E7E3D9] hover:text-[#19372D]"
            }`}
          >
            Declined ({declinedCount})
          </button>
        </div>
      )}

      {/* Query Content */}
      {requests === undefined ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-center">
          <Loader2 className="w-8 h-8 text-[#244B3C] animate-spin" />
          <p className="text-xs text-[#777D76]">Loading your borrowing requests from Convex...</p>
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          title="No borrowing requests yet"
          description="You haven't requested any tools from neighbors. Explore the neighborhood catalog and request what you need!"
          actionLabel="Discover Tools"
          onAction={() => router.push("/")}
        />
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          title="No requests match this filter"
          description="There are no borrowing requests with the selected status."
          actionLabel="Show all requests"
          onAction={() => setStatusFilter("all")}
        />
      ) : (
        <motion.div layout className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredRequests.map((req) => (
              <motion.div
                key={req._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E7E3D9] hover:border-[#9CAF91] transition-all shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E3D9]/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-editorial text-xl font-normal text-[#19372D]">
                        {req.tool?.name || "Shared Tool"}
                      </h3>
                      {req.tool?.category && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F7F5EF] text-[#777D76] border border-[#E7E3D9]">
                          {req.tool.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#777D76] flex items-center gap-1.5">
                      <span>Lender:</span>
                      <strong className="text-[#292D2A] font-medium">
                        {req.lender?.displayName || "Community Lender"}
                      </strong>
                      {req.lender?.isTrustedLender && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-[#244B3C] bg-[#DCE7D9] px-1.5 py-0.2 rounded-full">
                          <ShieldCheck className="w-3 h-3" /> Trusted Lender
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {getStatusBadge(req.status)}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-[#777D76]">
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-[#9CAF91] font-semibold">
                      Borrowing Window
                    </span>
                    <p className="font-medium text-[#292D2A] text-sm">
                      {req.startDate} <span className="text-[#9CAF91] font-normal">to</span> {req.endDate}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-[#9CAF91] font-semibold">
                      Requested On
                    </span>
                    <p className="font-medium text-[#292D2A] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#9CAF91]" />
                      {new Date(req.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  {req.status === "approved" && (
                    <div className="sm:col-span-2 lg:col-span-1 flex items-center justify-start lg:justify-end">
                      <Link href="/loans">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#DCE7D9] text-[#19372D] text-xs font-semibold hover:bg-[#244B3C] hover:text-white transition-colors">
                          View in Active Loans <ArrowRight className="w-3 h-3" />
                        </span>
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
