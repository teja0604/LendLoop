"use client";

import React, { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { LoanWithDetails } from "@/features/tools/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ToastContainer, ToastMessage } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  User,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

export default function MyLoansPage() {
  const router = useRouter();
  const loans = useQuery(api.loans.getMyLoans) as LoanWithDetails[] | undefined;
  const markReturned = useMutation(api.loans.markReturned);

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "returned" | "overdue">("all");
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

  const filteredLoans = useMemo(() => {
    if (!loans) return [];
    if (statusFilter === "active") return loans.filter((l) => l.status === "active");
    if (statusFilter === "returned") return loans.filter((l) => l.status === "returned");
    if (statusFilter === "overdue") return loans.filter((l) => l.isOverdue);
    return loans;
  }, [loans, statusFilter]);

  const activeCount = loans ? loans.filter((l) => l.status === "active").length : 0;
  const returnedCount = loans ? loans.filter((l) => l.status === "returned").length : 0;
  const overdueCount = loans ? loans.filter((l) => l.isOverdue).length : 0;
  const totalCount = loans ? loans.length : 0;

  const handleReturn = async (loan: LoanWithDetails) => {
    if (processingId) return;
    setProcessingId(loan._id);
    try {
      await markReturned({ loanId: loan._id });
      addToast({
        type: "success",
        title: "Tool Return Confirmed",
        message: `"${loan.tool?.name || "Tool"}" marked as returned. Record safely archived in loan history.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to confirm tool return.";
      addToast({
        type: "error",
        title: "Return Failed",
        message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E7E3D9]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#DCE7D9] text-[#19372D] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#244B3C]" />
            <span>Active & Historic Loans</span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl text-[#19372D] font-normal tracking-tight">
            My Loans & Borrows
          </h1>
          <p className="text-sm text-[#777D76]">
            Track tools currently out on loan from your shed or borrowed from neighborhood lenders.
          </p>
        </div>

        <Link href="/">
          <span className="text-xs font-medium text-[#244B3C] hover:underline flex items-center gap-1">
            Discover tools <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </div>

      {/* Filter Tabs */}
      {loans && loans.length > 0 && (
        <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              statusFilter === "all"
                ? "bg-[#19372D] text-[#F7F5EF] shadow-xs"
                : "bg-white text-[#777D76] border border-[#E7E3D9] hover:text-[#19372D]"
            }`}
          >
            All Loans ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              statusFilter === "active"
                ? "bg-[#19372D] text-[#F7F5EF] shadow-xs"
                : "bg-white text-[#777D76] border border-[#E7E3D9] hover:text-[#19372D]"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("returned")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              statusFilter === "returned"
                ? "bg-[#19372D] text-[#F7F5EF] shadow-xs"
                : "bg-white text-[#777D76] border border-[#E7E3D9] hover:text-[#19372D]"
            }`}
          >
            Returned ({returnedCount})
          </button>
          {overdueCount > 0 && (
            <button
              onClick={() => setStatusFilter("overdue")}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
                statusFilter === "overdue"
                  ? "bg-[#c24b2f] text-white shadow-xs"
                  : "bg-red-50 text-[#c24b2f] border border-red-200 hover:bg-red-100"
              }`}
            >
              Overdue ({overdueCount})
            </button>
          )}
        </div>
      )}

      {/* Query Content */}
      {loans === undefined ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-center">
          <Loader2 className="w-8 h-8 text-[#244B3C] animate-spin" />
          <p className="text-xs text-[#777D76]">Loading active and past loans from Convex...</p>
        </div>
      ) : loans.length === 0 ? (
        <EmptyState
          title="No loans yet"
          description="When borrowing requests are approved by you or a lender, active loans will appear here with scheduled return dates."
          actionLabel="Discover Community Tools"
          onAction={() => router.push("/")}
        />
      ) : filteredLoans.length === 0 ? (
        <EmptyState
          title="No loans match this filter"
          description="There are no loans matching the selected filter option."
          actionLabel="Show all loans"
          onAction={() => setStatusFilter("all")}
        />
      ) : (
        <motion.div layout className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredLoans.map((loan) => {
              const isBusy = processingId === loan._id;
              const isActive = loan.status === "active";
              const isLender = loan.role === "lender";

              return (
                <motion.div
                  key={loan._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`p-5 sm:p-6 rounded-3xl bg-white border transition-all shadow-xs space-y-4 ${
                    loan.isOverdue
                      ? "border-red-300 ring-1 ring-red-200"
                      : "border-[#E7E3D9] hover:border-[#9CAF91]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E3D9]/60">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-editorial text-xl font-normal text-[#19372D]">
                          {loan.tool?.name || "Shared Tool"}
                        </h3>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isLender
                              ? "bg-[#DCE7D9] text-[#19372D]"
                              : "bg-[#F7EFE0] text-[#826a24]"
                          }`}
                        >
                          {isLender ? "You are lending" : "You are borrowing"}
                        </span>
                        {loan.tool?.category && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F7F5EF] text-[#777D76] border border-[#E7E3D9]">
                            {loan.tool.category}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#777D76] flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#9CAF91]" />
                        <span>{isLender ? "Borrower:" : "Lender:"}</span>
                        <strong className="text-[#292D2A] font-medium">
                          {loan.otherParticipant?.displayName || "Community Member"}
                        </strong>
                        {loan.otherParticipant?.isTrustedLender && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-[#244B3C] bg-[#DCE7D9] px-1.5 py-0.2 rounded-full">
                            <ShieldCheck className="w-3 h-3" /> Trusted Lender
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {loan.isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-[#c24b2f]">
                          <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                        </span>
                      ) : isActive ? (
                        <Badge variant="sage" size="sm">Active Loan</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Returned</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-[#777D76] items-center">
                    <div className="space-y-1">
                      <span className="text-[11px] uppercase tracking-wider text-[#9CAF91] font-semibold">
                        Loan Window
                      </span>
                      <p className="font-medium text-[#292D2A] text-sm">
                        {loan.startDate} <span className="text-[#9CAF91] font-normal">to</span> {loan.dueDate}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] uppercase tracking-wider text-[#9CAF91] font-semibold">
                        Due Date
                      </span>
                      <p className={`font-medium flex items-center gap-1 text-sm ${loan.isOverdue ? "text-[#c24b2f] font-semibold" : "text-[#292D2A]"}`}>
                        <Calendar className="w-3.5 h-3.5 text-[#9CAF91]" />
                        Due {loan.dueDate}
                        {loan.isOverdue && " (Action required)"}
                      </p>
                    </div>

                    {/* Return Action */}
                    <div className="sm:col-span-2 lg:col-span-1 flex items-center justify-start lg:justify-end gap-2 pt-2 lg:pt-0">
                      {isActive ? (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleReturn(loan)}
                        >
                          {isBusy ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          )}
                          Confirm Return
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-[#244B3C] font-medium bg-[#DCE7D9]/50 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#244B3C]" />
                          Returned {loan.returnedAt ? new Date(loan.returnedAt).toLocaleDateString() : ""}
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
