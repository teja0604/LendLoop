"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";
import { PublicToolItem } from "@/features/tools/types";
import { AvailabilityBadge } from "@/components/ui/badge";
import { ToolImage } from "./tool-image";

interface ToolCardProps {
  tool: PublicToolItem;
  onSelect?: (tool: PublicToolItem) => void;
}

export function ToolCard({ tool, onSelect }: ToolCardProps) {
  return (
    <div
      onClick={() => onSelect?.(tool)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(tool);
        }
      }}
      className="group relative flex flex-col justify-between rounded-3xl bg-white border border-[#E7E3D9] overflow-hidden transition-all duration-300 hover:border-[#9CAF91] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#244B3C] focus:ring-offset-2 text-left cursor-pointer"
    >
      <div>
        {/* Card Header & Category Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#E7E3D9]">
          <ToolImage alt={tool.name} category={tool.category} />
          {/* Top Badges overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            <AvailabilityBadge availability="Available" />
            <span className="text-[11px] font-medium tracking-wide bg-white/90 backdrop-blur-xs text-[#292D2A] px-2.5 py-1 rounded-full shadow-xs">
              {tool.category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-editorial text-xl font-normal text-[#19372D] leading-snug group-hover:text-[#244B3C] transition-colors line-clamp-1">
              {tool.name}
            </h3>
            <span className="p-1.5 rounded-full bg-[#F7F5EF] text-[#777D76] group-hover:bg-[#244B3C] group-hover:text-white transition-all duration-200 shrink-0">
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>

          <p className="text-xs text-[#777D76] font-sans">
            Listed in <span className="font-medium text-[#292D2A]">{tool.category}</span>
          </p>
        </div>
      </div>

      {/* Footer Meta */}
      <div className="px-5 pb-4 sm:px-6 sm:pb-5 pt-2 border-t border-[#E7E3D9]/60 flex items-center justify-between text-xs text-[#777D76]">
        <span className="text-[11px] text-[#244B3C] font-medium">
          Neighbourhood Sharing
        </span>
        <span className="text-[11px] text-[#777D76]">
          Active
        </span>
      </div>
    </div>
  );
}
