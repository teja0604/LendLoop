import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
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
          Welcome to your authenticated workspace. Here you can browse neighborhood tools, manage your listings, and track your active loans.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-[#E7E3D9] space-y-4">
          <h3 className="font-editorial text-xl text-[#19372D] font-normal">
            My Tool Listings
          </h3>
          <p className="text-xs text-[#777D76] leading-relaxed">
            View the tools you are currently sharing with neighbors and add new equipment from your garage.
          </p>
          <Link href="/listings" className="inline-block">
            <Button variant="outline" size="sm">
              <span>View Listings</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-[#E7E3D9] space-y-4">
          <h3 className="font-editorial text-xl text-[#19372D] font-normal">
            Borrowing Requests
          </h3>
          <p className="text-xs text-[#777D76] leading-relaxed">
            Check the status of tools you have requested from neighbors and view return dates for active loans.
          </p>
          <Link href="/my-requests" className="inline-block">
            <Button variant="outline" size="sm">
              <span>My Requests</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-[#E7E3D9] space-y-4">
          <h3 className="font-editorial text-xl text-[#19372D] font-normal">
            Incoming Requests
          </h3>
          <p className="text-xs text-[#777D76] leading-relaxed">
            Review borrowing requests sent by neighbors for your tools and approve or decline reservation dates.
          </p>
          <Link href="/incoming-requests" className="inline-block">
            <Button variant="outline" size="sm">
              <span>Review Requests</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
