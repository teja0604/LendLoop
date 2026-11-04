"use client";

import React, { useState } from "react";
import { ToolItem } from "@/features/tools/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AvailabilityBadge, ConditionBadge } from "@/components/ui/badge";
import { ToolImage } from "./tool-image";
import { CalendarDays, AlertCircle, Sparkles, MapPin } from "lucide-react";

interface ToolDetailDialogProps {
  tool: ToolItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestSubmit: (data: {
    tool: ToolItem;
    startDate: string;
    endDate: string;
  }) => void;
}

export function ToolDetailDialog({
  tool,
  isOpen,
  onClose,
  onRequestSubmit,
}: ToolDetailDialogProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!tool) return null;

  const isAvailable = tool.availability === "Available";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAvailable) return;

    if (!startDate || !endDate) {
      setError("Please select both a start date and an expected return date.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError("The return date cannot be earlier than the start date.");
      return;
    }

    setError(null);
    onRequestSubmit({
      tool,
      startDate,
      endDate,
    });
    // Reset and close
    setStartDate("");
    setEndDate("");
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={tool.name}
      description={`Category: ${tool.category}`}
      className="max-w-xl"
    >
      <div className="space-y-6">
        {/* Tool Visual */}
        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-[#E7E3D9]">
          <ToolImage
            src={tool.imageUrl}
            alt={tool.name}
            category={tool.category}
          />
        </div>

        {/* Badges & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E7E3D9]">
          <div className="flex items-center gap-2">
            <AvailabilityBadge availability={tool.availability} />
            <ConditionBadge condition={tool.condition} />
          </div>
          {tool.locationArea && (
            <span className="inline-flex items-center gap-1 text-xs text-[#777D76]">
              <MapPin className="w-3.5 h-3.5 text-[#9CAF91]" />
              {tool.locationArea}
            </span>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#19372D]">
            Description & Specifications
          </h4>
          <p className="text-sm text-[#292D2A] leading-relaxed">
            {tool.description}
          </p>
        </div>

        {/* Borrow Form / Availability Status Box */}
        {isAvailable ? (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl bg-[#DCE7D9]/40 border border-[#9CAF91]/50 p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-[#19372D]">
              <CalendarDays className="w-4 h-4 text-[#244B3C]" />
              <span>Select Borrowing Window</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div>
                <label className="block text-xs font-medium text-[#19372D] mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  min={new Date().toISOString().split("T")[0]}
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
                  min={startDate || new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setError(null);
                  }}
                  className="w-full rounded-xl border border-[#E7E3D9] bg-white px-3 py-2 text-sm text-[#292D2A] focus:border-[#244B3C] focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs font-medium text-[#c24b2f]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-3">
              <span className="text-[11px] text-[#777D76]">
                Demo Mode: Submits client-side test request
              </span>
              <Button type="submit" variant="coral" size="sm">
                <Sparkles className="w-4 h-4 mr-1.5" />
                Send Request
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl bg-[#E7E3D9]/60 border border-[#d6d0c2] p-4 text-center space-y-2">
            <p className="text-sm font-semibold text-[#19372D]">
              Tool is currently {tool.availability.toLowerCase()}
            </p>
            <p className="text-xs text-[#777D76]">
              This tool cannot accept new borrowing dates right now. Check back
              once it is returned to the neighborhood pool.
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
