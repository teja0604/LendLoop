"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MyToolItem } from "@/features/tools/types";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface DeactivateToolDialogProps {
  tool: MyToolItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (toolName: string) => void;
}

export function DeactivateToolDialog({
  tool,
  isOpen,
  onClose,
  onSuccess,
}: DeactivateToolDialogProps) {
  const deactivateTool = useMutation(api.tools.deactivateTool);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!tool) return null;

  const handleDeactivate = async () => {
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await deactivateTool({ toolId: tool._id });
      onClose();
      if (onSuccess) {
        onSuccess(tool.name);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to deactivate tool.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Deactivate Tool Listing"
      description="Remove this tool from the public neighborhood discovery pool."
      className="max-w-md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F7EFE0] border border-[#E7D6BD] text-left">
          <AlertTriangle className="w-5 h-5 text-[#826a24] shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-[#826a24]">
            <p className="font-semibold">Soft Deactivation</p>
            <p className="leading-relaxed">
              Deactivating <strong className="font-medium text-[#19372D]">&ldquo;{tool.name}&rdquo;</strong> hides it immediately from public browsing. The tool will remain visible in your own archives, preserving loan history and record integrity.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-[#E7E3D9] flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Keep Active
          </Button>
          <Button
            type="button"
            variant="coral"
            size="sm"
            disabled={isSubmitting}
            onClick={handleDeactivate}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Deactivating...
              </>
            ) : (
              "Confirm Deactivation"
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
