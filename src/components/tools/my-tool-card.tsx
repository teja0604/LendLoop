"use client";

import React from "react";
import { MyToolItem } from "@/features/tools/types";
import { ConditionBadge } from "@/components/ui/badge";
import { ToolImage } from "./tool-image";
import { Button } from "@/components/ui/button";
import { Edit3, EyeOff, Calendar } from "lucide-react";

interface MyToolCardProps {
  tool: MyToolItem;
  onEdit: (tool: MyToolItem) => void;
  onDeactivate: (tool: MyToolItem) => void;
}

export function MyToolCard({ tool, onEdit, onDeactivate }: MyToolCardProps) {
  const formattedDate = new Date(tool.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="group relative flex flex-col justify-between rounded-3xl bg-white border border-[#E7E3D9] overflow-hidden transition-all duration-300 hover:border-[#9CAF91] hover:shadow-lg text-left">
      <div>
        {/* Card Header & Visual */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#E7E3D9]">
          <ToolImage alt={tool.name} category={tool.category} />

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs ${
                tool.isActive
                  ? "bg-[#244B3C] text-[#F7F5EF]"
                  : "bg-[#777D76] text-white"
              }`}
            >
              {tool.isActive ? "Active Listing" : "Deactivated"}
            </span>
            <span className="text-[11px] font-medium tracking-wide bg-white/90 backdrop-blur-xs text-[#292D2A] px-2.5 py-1 rounded-full shadow-xs">
              {tool.category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-editorial text-xl font-normal text-[#19372D] leading-snug line-clamp-1">
              {tool.name}
            </h3>
          </div>

          <p className="text-sm text-[#777D76] line-clamp-2 leading-relaxed">
            {tool.description}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <ConditionBadge condition={tool.condition} />
            <span className="inline-flex items-center gap-1 text-[11px] text-[#777D76]">
              <Calendar className="w-3 h-3 text-[#9CAF91]" />
              <span>Added {formattedDate}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-[#F7F5EF]/60 border-t border-[#E7E3D9] flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(tool)}
          className="flex-1 justify-center"
        >
          <Edit3 className="w-3.5 h-3.5 mr-1" />
          Edit
        </Button>

        {tool.isActive ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeactivate(tool)}
            className="text-[#c24b2f] hover:bg-red-50 hover:text-red-700"
          >
            <EyeOff className="w-3.5 h-3.5 mr-1" />
            Deactivate
          </Button>
        ) : (
          <span className="text-xs text-[#777D76] italic px-2">
            Archived
          </span>
        )}
      </div>
    </div>
  );
}
