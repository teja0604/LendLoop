"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MyToolItem } from "@/features/tools/types";
import { MyToolCard } from "@/components/tools/my-tool-card";
import { AddToolDialog } from "@/components/tools/add-tool-dialog";
import { EditToolDialog } from "@/components/tools/edit-tool-dialog";
import { DeactivateToolDialog } from "@/components/tools/deactivate-tool-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ToastContainer, ToastMessage } from "@/components/ui/toast";
import { Plus, Wrench, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function MyToolsPage() {
  const myTools = useQuery(api.tools.getMyTools);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<MyToolItem | null>(null);
  const [deactivatingTool, setDeactivatingTool] = useState<MyToolItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Status-filtered tools
  const filteredTools = useMemo(() => {
    if (!myTools) return [];
    if (statusFilter === "active") {
      return myTools.filter((t) => t.isActive);
    }
    if (statusFilter === "inactive") {
      return myTools.filter((t) => !t.isActive);
    }
    return myTools;
  }, [myTools, statusFilter]);

  const activeCount = myTools ? myTools.filter((t) => t.isActive).length : 0;
  const inactiveCount = myTools ? myTools.filter((t) => !t.isActive).length : 0;
  const totalCount = myTools ? myTools.length : 0;

  return (
    <div className="space-y-8 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E7E3D9]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#DCE7D9] text-[#19372D] text-xs font-semibold">
            <Wrench className="w-3.5 h-3.5 text-[#244B3C]" />
            <span>Owner Dashboard</span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl text-[#19372D] font-normal tracking-tight">
            My Tools
          </h1>
          <p className="text-sm text-[#777D76]">
            Manage equipment you lend to neighbors. Update details or deactivate tools at any time.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsAddOpen(true)}
          className="self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          List a New Tool
        </Button>
      </div>

      {/* Filter Tabs */}
      {myTools && myTools.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              statusFilter === "all"
                ? "bg-[#19372D] text-[#F7F5EF] shadow-xs"
                : "bg-white text-[#777D76] border border-[#E7E3D9] hover:text-[#19372D]"
            }`}
          >
            All Listings ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              statusFilter === "active"
                ? "bg-[#19372D] text-[#F7F5EF] shadow-xs"
                : "bg-white text-[#777D76] border border-[#E7E3D9] hover:text-[#19372D]"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              statusFilter === "inactive"
                ? "bg-[#19372D] text-[#F7F5EF] shadow-xs"
                : "bg-white text-[#777D76] border border-[#E7E3D9] hover:text-[#19372D]"
            }`}
          >
            Deactivated ({inactiveCount})
          </button>
        </div>
      )}

      {/* Query Content */}
      {myTools === undefined ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-center">
          <Loader2 className="w-8 h-8 text-[#244B3C] animate-spin" />
          <p className="text-xs text-[#777D76]">Loading your tool listings from Convex...</p>
        </div>
      ) : myTools.length === 0 ? (
        <EmptyState
          title="No tools listed yet"
          description="You haven't added any tools to the neighborhood pool yet. Share equipment from your shed or garage to help your community!"
          actionLabel="List your first tool"
          onAction={() => setIsAddOpen(true)}
        />
      ) : filteredTools.length === 0 ? (
        <EmptyState
          title="No tools match this filter"
          description="There are no listings matching the selected status."
          actionLabel="Show all listings"
          onAction={() => setStatusFilter("all")}
        />
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredTools.map((tool) => (
              <motion.div
                key={tool._id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <MyToolCard
                  tool={tool}
                  onEdit={(t) => setEditingTool(t)}
                  onDeactivate={(t) => setDeactivatingTool(t)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add Tool Dialog */}
      <AddToolDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={(name) => {
          addToast({
            type: "success",
            title: "Tool Listed",
            message: `"${name}" was successfully added to your listings.`,
          });
        }}
      />

      {/* Edit Tool Dialog */}
      <EditToolDialog
        tool={editingTool}
        isOpen={Boolean(editingTool)}
        onClose={() => setEditingTool(null)}
        onSuccess={(name) => {
          addToast({
            type: "success",
            title: "Tool Updated",
            message: `Changes to "${name}" have been saved.`,
          });
        }}
      />

      {/* Deactivate Tool Dialog */}
      <DeactivateToolDialog
        tool={deactivatingTool}
        isOpen={Boolean(deactivatingTool)}
        onClose={() => setDeactivatingTool(null)}
        onSuccess={(name) => {
          addToast({
            type: "info",
            title: "Tool Deactivated",
            message: `"${name}" has been deactivated and hidden from public discovery.`,
          });
        }}
      />

      {/* Toast Feedback */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
