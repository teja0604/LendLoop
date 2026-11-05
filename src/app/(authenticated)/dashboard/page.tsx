"use client";

import React from "react";
import { Sparkles, ArrowRight, Wrench, CalendarDays, Inbox, Repeat } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MyToolItem, BorrowRequestWithDetails, LoanWithDetails } from "@/features/tools/types";

export default function DashboardPage() {
  const myTools = useQuery(api.tools.getMyTools) as MyToolItem[] | undefined;
  const myRequests = useQuery(api.borrowRequests.getMyRequests) as BorrowRequestWithDetails[] | undefined;
  const incomingRequests = useQuery(api.borrowRequests.getIncomingRequests) as BorrowRequestWithDetails[] | undefined;
  const myLoans = useQuery(api.loans.getMyLoans) as LoanWithDetails[] | undefined;

  const activeToolsCount = myTools ? myTools.filter((t) => t.isActive).length : 0;
  const pendingRequestsCount = myRequests ? myRequests.filter((r) => r.status === "pending").length : 0;
  const pendingIncomingCount = incomingRequests ? incomingRequests.filter((r) => r.status === "pending").length : 0;
  const activeLoansCount = myLoans ? myLoans.filter((l) => l.status === "active").length : 0;

  return (
    <div className="space-y-8 text-left">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCE7D9] text-[#19372D] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-[#244B3C]" />
          <span>Member Workspace</span>
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl text-[#19372D] font-normal tracking-tight">
          Neighborhood Dashboard
        </h1>
        <p className="text-sm text-[#777D76]">
          Welcome to your authenticated workspace. Here you can browse neighborhood tools, manage your listings, approve incoming requests, and track your active loans.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: My Tools */}
        <div className="p-6 rounded-3xl bg-white border border-[#E7E3D9] flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="p-2.5 rounded-2xl bg-[#DCE7D9] text-[#244B3C]">
                <Wrench className="w-5 h-5" />
              </span>
              {myTools !== undefined && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#DCE7D9] text-[#19372D]">
                  {activeToolsCount} active
                </span>
              )}
            </div>
            <h3 className="font-editorial text-xl text-[#19372D] font-normal">
              My Tools
            </h3>
            <p className="text-xs text-[#777D76] leading-relaxed">
              Manage equipment you are sharing from your garage with community members.
            </p>
          </div>
          <Link href="/listings" className="inline-block pt-2">
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span>View Listings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Card 2: My Borrow Requests */}
        <div className="p-6 rounded-3xl bg-white border border-[#E7E3D9] flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="p-2.5 rounded-2xl bg-[#F7EFE0] text-[#826a24]">
                <CalendarDays className="w-5 h-5" />
              </span>
              {myRequests !== undefined && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F7EFE0] text-[#826a24]">
                  {pendingRequestsCount} pending
                </span>
              )}
            </div>
            <h3 className="font-editorial text-xl text-[#19372D] font-normal">
              My Requests
            </h3>
            <p className="text-xs text-[#777D76] leading-relaxed">
              Track the status of tools you have requested to borrow from nearby lenders.
            </p>
          </div>
          <Link href="/my-requests" className="inline-block pt-2">
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span>Track Requests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Card 3: Incoming Requests */}
        <div className="p-6 rounded-3xl bg-white border border-[#E7E3D9] flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="p-2.5 rounded-2xl bg-[#DCD4F0] text-[#3e345e]">
                <Inbox className="w-5 h-5" />
              </span>
              {incomingRequests !== undefined && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pendingIncomingCount > 0 ? "bg-[#c24b2f] text-white" : "bg-[#E7E3D9] text-[#777D76]"}`}>
                  {pendingIncomingCount} new
                </span>
              )}
            </div>
            <h3 className="font-editorial text-xl text-[#19372D] font-normal">
              Incoming Requests
            </h3>
            <p className="text-xs text-[#777D76] leading-relaxed">
              Review and approve or decline borrowing requests from neighborhood borrowers.
            </p>
          </div>
          <Link href="/incoming-requests" className="inline-block pt-2">
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span>Review Requests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Card 4: My Loans */}
        <div className="p-6 rounded-3xl bg-white border border-[#E7E3D9] flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="p-2.5 rounded-2xl bg-[#DCE7D9] text-[#19372D]">
                <Repeat className="w-5 h-5" />
              </span>
              {myLoans !== undefined && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#DCE7D9] text-[#19372D]">
                  {activeLoansCount} active
                </span>
              )}
            </div>
            <h3 className="font-editorial text-xl text-[#19372D] font-normal">
              My Loans
            </h3>
            <p className="text-xs text-[#777D76] leading-relaxed">
              Manage active loan return dates and historical borrowing logs.
            </p>
          </div>
          <Link href="/loans" className="inline-block pt-2">
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span>View Loans</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
