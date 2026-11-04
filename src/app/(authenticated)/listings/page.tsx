import React from "react";
import { Wrench } from "lucide-react";

export default function ListingsPage() {
  return (
    <div className="space-y-6 text-left">
      <div className="space-y-2">
        <h1 className="font-editorial text-3xl text-[#19372D] font-normal tracking-tight">
          My Tool Listings
        </h1>
        <p className="text-sm text-[#777D76]">
          Manage your shared tools, update their conditions, or list new gear for neighbors.
        </p>
      </div>

      <div className="rounded-3xl border border-[#E7E3D9] bg-white p-12 text-center space-y-3 max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-[#DCE7D9] text-[#244B3C] flex items-center justify-center mx-auto">
          <Wrench className="w-6 h-6" />
        </div>
        <h3 className="font-editorial text-xl text-[#19372D] font-normal">
          Tool Management Module
        </h3>
        <p className="text-xs text-[#777D76] leading-relaxed">
          Full persistent CRUD operations, condition updates, and soft archival will be enabled in Phase 4.
        </p>
      </div>
    </div>
  );
}

