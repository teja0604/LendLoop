import React from "react";
import { CalendarDays } from "lucide-react";

export default function MyRequestsPage() {
  return (
    <div className="space-y-6 text-left">
      <div className="space-y-2">
        <h1 className="font-editorial text-3xl text-[#19372D] font-normal tracking-tight">
          My Borrowing Requests
        </h1>
        <p className="text-sm text-[#777D76]">
          Track your requests to borrow tools from neighborhood lenders.
        </p>
      </div>

      <div className="rounded-3xl border border-[#E7E3D9] bg-white p-12 text-center space-y-3 max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-[#DCE7D9] text-[#244B3C] flex items-center justify-center mx-auto">
          <CalendarDays className="w-6 h-6" />
        </div>
        <h3 className="font-editorial text-xl text-[#19372D] font-normal">
          Borrowing Lifecycle Module
        </h3>
        <p className="text-xs text-[#777D76] leading-relaxed">
          Request history, owner approval states, and return handling will be connected in Phase 5.
        </p>
      </div>
    </div>
  );
}

