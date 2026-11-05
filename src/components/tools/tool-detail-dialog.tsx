"use client";

import React, { useState } from "react";
import { PublicToolItem } from "@/features/tools/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AvailabilityBadge } from "@/components/ui/badge";
import { ToolImage } from "./tool-image";
import {
  ShieldCheck,
  LogIn,
  CalendarDays,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";

interface ToolDetailDialogProps {
  tool: PublicToolItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestSubmitted?: (toolName: string) => void;
}

export function ToolDetailDialog({
  tool,
  isOpen,
  onClose,
  onRequestSubmitted,
}: ToolDetailDialogProps) {
  const { isAuthenticated } = useConvexAuth();
  const createBorrowRequest = useMutation(api.borrowRequests.createRequest);

  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!tool) return null;

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);

    if (!startDate || !endDate) {
      setError("Please select both a start date and an expected return date.");
      return;
    }

    if (startDate < todayStr) {
      setError("Start date cannot be in the past.");
      return;
    }

    if (endDate <= startDate) {
      setError("Return date must be strictly after the start date.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createBorrowRequest({
        toolId: tool._id,
        startDate,
        endDate,
      });

      setSuccess(true);
      if (onRequestSubmitted) {
        onRequestSubmitted(tool.name);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to submit borrow request.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={tool.name}
      description={`Category: ${tool.category}`}
      className="max-w-md"
    >
      <div className="space-y-5 text-left">
        {/* Tool Visual */}
        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-[#E7E3D9]">
          <ToolImage alt={tool.name} category={tool.category} />
        </div>

        {/* Badges & Status */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E3D9]">
          <AvailabilityBadge availability="Available" />
          <span className="text-xs font-medium text-[#244B3C] bg-[#DCE7D9] px-2.5 py-0.5 rounded-full">
            {tool.category}
          </span>
        </div>

        {/* Privacy Note */}
        <div className="p-3.5 rounded-2xl bg-[#F7F5EF] border border-[#E7E3D9] flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#244B3C] shrink-0 mt-0.5" />
          <p className="text-xs text-[#777D76] leading-relaxed">
            Personal owner identities and loan histories are kept strictly private on the public discovery catalog.
          </p>
        </div>

        {/* Interaction Form or Auth Prompt */}
        {isAuthenticated ? (
          success ? (
            <div className="p-5 rounded-2xl bg-[#DCE7D9]/60 border border-[#9CAF91] space-y-3 text-center">
              <div className="w-10 h-10 rounded-full bg-[#244B3C] text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-editorial text-lg text-[#19372D]">
                  Request Submitted!
                </h4>
                <p className="text-xs text-[#777D76]">
                  Your request for <strong className="text-[#19372D]">&ldquo;{tool.name}&rdquo;</strong> from {startDate} to {endDate} has been sent to the lender.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <Link href="/my-requests">
                  <Button variant="primary" size="sm">
                    View My Requests
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white border border-[#E7E3D9] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#19372D]">
                <CalendarDays className="w-4 h-4 text-[#244B3C]" />
                <span>Request Borrowing Window</span>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div>
                  <label className="block text-xs font-medium text-[#19372D] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    min={todayStr}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setError(null);
                    }}
                    className="w-full rounded-xl border border-[#E7E3D9] bg-white px-3 py-2 text-sm text-[#292D2A] focus:border-[#244B3C] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#19372D] mb-1">
                    Return Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || todayStr}
                    disabled={isSubmitting}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setError(null);
                    }}
                    className="w-full rounded-xl border border-[#E7E3D9] bg-white px-3 py-2 text-sm text-[#292D2A] focus:border-[#244B3C] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#E7E3D9]">
                <span className="text-[11px] text-[#777D76]">
                  Sent to lender for approval
                </span>
                <Button
                  type="submit"
                  variant="coral"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Send Request"
                  )}
                </Button>
              </div>
            </form>
          )
        ) : (
          <div className="p-4 rounded-2xl bg-[#DCE7D9]/40 border border-[#9CAF91]/50 space-y-3 text-center">
            <p className="text-xs text-[#19372D] font-medium">
              Want to borrow equipment from neighbors?
            </p>
            <Link href="/sign-in" className="inline-block w-full">
              <Button variant="primary" size="sm" className="w-full justify-center">
                <LogIn className="w-4 h-4 mr-1.5" />
                Sign in to Borrow
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Dialog>
  );
}
