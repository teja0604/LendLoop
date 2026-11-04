"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ShieldAlert, ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const viewer = useQuery(api.users.viewer);

  // Still loading user data
  if (viewer === undefined) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-[#777D76]">Verifying administrator credentials with backend...</p>
      </div>
    );
  }

  // Not an admin in the database
  if (!viewer || viewer.role !== "admin") {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#FFF7F5] border border-[#F0785B]/30 text-[#F0785B] flex items-center justify-center mx-auto">
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

  // Verified Admin View
  return (
    <div className="space-y-8 text-left">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#19372D] text-[#F7F5EF] text-xs font-semibold">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-[#E7E3D9] space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#19372D]">
            <ShieldAlert className="w-4 h-4 text-[#F0785B]" />
            <span>Trusted Lender Management</span>
          </div>
          <p className="text-xs text-[#777D76] leading-relaxed">
            Admin powers to award or revoke trusted lender badges will be implemented in Phase 6.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-[#E7E3D9] space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#19372D]">
            <ShieldCheck className="w-4 h-4 text-[#244B3C]" />
            <span>Listing Moderation</span>
          </div>
          <p className="text-xs text-[#777D76] leading-relaxed">
            Soft-archival of inappropriate tool listings across the entire neighborhood will be connected in Phase 6.
          </p>
        </div>
      </div>
    </div>
  );
}

