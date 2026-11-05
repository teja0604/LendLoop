"use client";

import React from "react";
import { PublicToolItem } from "@/features/tools/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AvailabilityBadge } from "@/components/ui/badge";
import { ToolImage } from "./tool-image";
import { ShieldCheck, LogIn, Sparkles } from "lucide-react";
import { useConvexAuth } from "convex/react";
import Link from "next/link";

interface ToolDetailDialogProps {
  tool: PublicToolItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ToolDetailDialog({
  tool,
  isOpen,
  onClose,
}: ToolDetailDialogProps) {
  const { isAuthenticated } = useConvexAuth();

  if (!tool) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
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
            Personal owner identities and loan history are kept strictly private on the public discovery catalog.
          </p>
        </div>

        {/* Call to action */}
        {isAuthenticated ? (
          <div className="p-4 rounded-2xl bg-[#DCE7D9]/40 border border-[#9CAF91]/50 space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#19372D]">
              <Sparkles className="w-3.5 h-3.5 text-[#244B3C]" />
              <span>Borrowing Window</span>
            </div>
            <p className="text-xs text-[#777D76]">
              Tool borrowing requests and scheduling will be enabled in Phase 5.
            </p>
          </div>
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
