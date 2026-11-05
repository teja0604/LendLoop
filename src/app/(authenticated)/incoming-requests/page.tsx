"use client";

import React, { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { RequestStatus, BorrowRequestWithDetails } from "@/features/tools/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ToastContainer, ToastMessage } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import {
  Inbox,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

export default function IncomingRequestsPage() {
  const router = useRouter();
  const incomingRequests = useQuery(api.borrowRequests.getIncomingRequests) as
    | BorrowRequestWithDetails[]
    | undefined;

  const approveRequest = useMutation(api.borrowRequests.approveRequest);
  const declineRequest = useMutation(api.borrowRequests.declineRequest);

  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
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

  const filteredRequests = useMemo(() => {
    if (!incomingRequests) return [];
    if (statusFilter === "all") return incomingRequests;
    return incomingRequests.filter((r) => r.status === statusFilter);
  }, [incomingRequests, statusFilter]);

  const pendingCount = incomingRequests
    ? incomingRequests.filter((r) => r.status === "pending").length
    : 0;
  const approvedCount = incomingRequests
    ? incomingRequests.filter((r) => r.status === "approved").length
    : 0;
  const declinedCount = incomingRequests
    ? incomingRequests.filter((r) => r.status === "declined").length
    : 0;
  const totalCount = incomingRequests ? incomingRequests.length : 0;

  const handleApprove = async (req: BorrowRequestWithDetails) => {
    if (processingId) return;
    setProcessingId(req._id);
    try {
      await approveRequest({ requestId: req._id });
      addToast({
        type: "success",
        title: "Request Approved",
        message: `Loan created for "${req.tool?.name || "tool"}"! The borrower can pick it up on ${req.startDate}.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to approve request.";
      addToast({
        type: "error",
        title: "Approval Failed",
        message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (req: BorrowRequestWithDetails) => {
    if (processingId) return;
    setProcessingId(req._id);
    try {
      await declineRequest({ requestId: req._id });
      addToast({
        type: "info",
        title: "Request Declined",
        message: `Request for "${req.tool?.name || "tool"}" has been declined.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to decline request.";
      addToast({
        type: "error",
        title: "Decline Failed",
        message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="butter" size="sm">Pending Your Action</Badge>;
      case "approved":
        return <Badge variant="sage" size="sm">Approved (Active Loan)</Badge>;
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
            <Inbox className="w-3.5 h-3.5 text-[#244B3C]" />
            <span>Lender Management</span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl text-[#19372D] font-normal tracking-tight">
            Incoming Borrowing Requests
          </h1>
          <p className="text-sm text-[#777D76]">
            Review, approve or decline requests from community neighbors wanting to borrow your equipment.
          </p>
        </div>

        <Link href="/listings">
          <span className="text-xs font-medium text-[#244B3C] hover:underline flex items-center gap-1">
            Manage your tools <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </div>

      {/* Filter Tabs */}
      {incomingRequests && incomingRequests.length > 0 && (
        <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              statusFilter === "all"
                ? "bg-[#19372D] text-[#F7F5EF] shadow-xs"
                : "bg-white text-[#777D76] border border-[#E7E3D9] hover:text-[#19372D]"
            }`}
          >
            All Incoming ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              statusFilter === "pending"
                ? "bg-[#19372D] text-[#F7F5EF] shadow-xs"
                : "bg-white text-[#777D76] border border-[#E7E3D9] hover:text-[#19372D]"
            }`}
          >
            Action Required ({pendingCount})
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
      {incomingRequests === undefined ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-center">
          <Loader2 className="w-8 h-8 text-[#244B3C] animate-spin" />
          <p className="text-xs text-[#777D76]">Loading incoming borrowing requests from Convex...</p>
        </div>
      ) : incomingRequests.length === 0 ? (
        <EmptyState
          title="No incoming requests yet"
          description="When neighbors request to borrow one of your listed tools, their requests will appear here for your review and approval."
          actionLabel="View My Tools"
          onAction={() => router.push("/listings")}
        />
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          title="No requests match this filter"
          description="There are no incoming requests with the selected status."
          actionLabel="Show all incoming"
          onAction={() => setStatusFilter("all")}
        />
      ) : (
        <motion.div layout className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredRequests.map((req) => {
              const isBusy = processingId === req._id;
              const isPending = req.status === "pending";

              return (
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
                        <User className="w-3.5 h-3.5 text-[#9CAF91]" />
                        <span>Requested by neighbor:</span>
                        <strong className="text-[#292D2A] font-medium">
                          {req.borrower?.displayName || "Community Neighbor"}
                        </strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {getStatusBadge(req.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-[#777D76] items-center">
                    <div className="space-y-1">
                      <span className="text-[11px] uppercase tracking-wider text-[#9CAF91] font-semibold">
                        Requested Window
                      </span>
                      <p className="font-medium text-[#292D2A] text-sm">
                        {req.startDate} <span className="text-[#9CAF91] font-normal">to</span> {req.endDate}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] uppercase tracking-wider text-[#9CAF91] font-semibold">
                        Received On
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

                    {/* Actions */}
                    <div className="sm:col-span-2 lg:col-span-1 flex items-center justify-start lg:justify-end gap-2 pt-2 lg:pt-0">
                      {isPending ? (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleApprove(req)}
                          >
                            {isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            )}
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleDecline(req)}
                            className="text-[#c24b2f] hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Decline
                          </Button>
                        </>
                      ) : req.status === "approved" ? (
                        <Link href="/loans">
                          <span className="inline-flex items-center gap-1 text-xs text-[#244B3C] font-semibold hover:underline">
                            View in Loans <ArrowRight className="w-3 h-3" />
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-[#777D76] italic">
                          Declined
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Toast Feedback */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
