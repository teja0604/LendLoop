"use client";

import React from "react";
import { Search, X } from "lucide-react";
import {
  ToolCategory,
  ToolAvailability,
  TOOL_CATEGORIES,
  TOOL_AVAILABILITIES,
} from "@/features/tools/types";
import { cn } from "@/lib/utils";

interface ToolFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: ToolCategory | "All";
  onCategoryChange: (cat: ToolCategory | "All") => void;
  selectedAvailability: ToolAvailability | "All";
  onAvailabilityChange: (avail: ToolAvailability | "All") => void;
  onClearFilters: () => void;
  totalResults: number;
}

export function ToolFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedAvailability,
  onAvailabilityChange,
  onClearFilters,
  totalResults,
}: ToolFiltersProps) {
  const isFiltered =
    searchQuery.trim() !== "" ||
    selectedCategory !== "All" ||
    selectedAvailability !== "All";

  return (
    <div className="space-y-4">
      {/* Top Bar: Search Input & Availability Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#777D76]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tools by name, keyword or project..."
            className="w-full pl-11 pr-10 py-2.5 rounded-full border border-[#E7E3D9] bg-white text-sm text-[#292D2A] placeholder:text-[#777D76] focus:outline-none focus:border-[#244B3C] focus:ring-2 focus:ring-[#244B3C]/10 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777D76] hover:text-[#292D2A] p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Availability dropdown & quick stats */}
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 text-xs text-[#777D76] font-medium px-1">
            <span>Showing</span>
            <span className="font-semibold text-[#19372D]">{totalResults}</span>
            <span>{totalResults === 1 ? "tool" : "tools"}</span>
          </div>

          <div className="flex items-center gap-1 bg-white border border-[#E7E3D9] rounded-full p-1 shadow-xs text-xs">
            <span className="pl-2 pr-1 text-[#777D76] hidden md:inline">
              Status:
            </span>
            {(["All", ...TOOL_AVAILABILITIES] as (ToolAvailability | "All")[]).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => onAvailabilityChange(status)}
                  className={cn(
                    "px-3 py-1 rounded-full font-medium transition-all text-xs",
                    selectedAvailability === status
                      ? "bg-[#244B3C] text-[#F7F5EF] shadow-xs"
                      : "text-[#777D76] hover:text-[#292D2A]"
                  )}
                >
                  {status}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => onCategoryChange("All")}
          className={cn(
            "px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all duration-150 border shrink-0",
            selectedCategory === "All"
              ? "bg-[#19372D] text-[#F7F5EF] border-[#19372D] shadow-xs"
              : "bg-white text-[#292D2A] border-[#E7E3D9] hover:border-[#9CAF91]"
          )}
        >
          All Categories
        </button>

        {TOOL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={cn(
              "px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all duration-150 border shrink-0",
              selectedCategory === cat
                ? "bg-[#19372D] text-[#F7F5EF] border-[#19372D] shadow-xs"
                : "bg-white text-[#292D2A] border-[#E7E3D9] hover:border-[#9CAF91]"
            )}
          >
            {cat}
          </button>
        ))}

        {isFiltered && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-[#c24b2f] hover:underline whitespace-nowrap shrink-0 ml-auto"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
