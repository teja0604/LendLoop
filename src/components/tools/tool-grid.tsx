"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  ToolCategory,
  PublicToolItem,
} from "@/features/tools/types";
import { ToolCard } from "./tool-card";
import { ToolFilters } from "./tool-filters";
import { ToolDetailDialog } from "./tool-detail-dialog";
import { AddToolDialog } from "./add-tool-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastContainer, ToastMessage } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

interface ToolGridProps {
  isAddToolOpen: boolean;
  onCloseAddTool: () => void;
}

export function ToolGrid({
  isAddToolOpen,
  onCloseAddTool,
}: ToolGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | "All">("All");
  const [selectedTool, setSelectedTool] = useState<PublicToolItem | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Live Convex query with server-side category filtering
  const queryArgs = useMemo(() => {
    return selectedCategory === "All" ? {} : { category: selectedCategory };
  }, [selectedCategory]);

  const publicTools = useQuery(api.tools.getPublicAvailableTools, queryArgs) as
    | PublicToolItem[]
    | undefined;

  const addToast = (toast: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Filtered tools by search query
  const filteredTools = useMemo(() => {
    if (!publicTools) return [];
    if (!searchQuery.trim()) return publicTools;

    const query = searchQuery.toLowerCase().trim();
    return publicTools.filter((tool) =>
      tool.name.toLowerCase().includes(query)
    );
  }, [publicTools, searchQuery]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
  };

  return (
    <div id="discover" className="space-y-8 scroll-mt-24">
      {/* Filters Bar */}
      <ToolFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onClearFilters={clearFilters}
        totalResults={filteredTools.length}
      />

      {/* Loading State */}
      {publicTools === undefined ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-center">
          <Loader2 className="w-8 h-8 text-[#244B3C] animate-spin" />
          <p className="text-xs text-[#777D76]">
            Fetching neighborhood catalog from Convex...
          </p>
        </div>
      ) : filteredTools.length > 0 ? (
        /* Results Grid */
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredTools.map((tool) => (
              <motion.div
                key={tool._id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
              >
                <ToolCard tool={tool} onSelect={setSelectedTool} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : publicTools.length === 0 && selectedCategory === "All" && !searchQuery.trim() ? (
        /* Completely Empty Catalog */
        <EmptyState
          title="No tools listed in the community yet"
          description="Be the first neighbor to list equipment from your garage or shed and help start your local tool-sharing loop!"
          actionLabel="List a tool"
          onAction={onCloseAddTool}
        />
      ) : (
        /* Filtered Empty State */
        <EmptyState
          title="No tools match your search"
          description="Try adjusting your keywords, expanding your category selection, or clearing your filters to discover more items."
          actionLabel="Clear all filters"
          onAction={clearFilters}
        />
      )}

      {/* Detail Dialog */}
      <ToolDetailDialog
        tool={selectedTool}
        isOpen={Boolean(selectedTool)}
        onClose={() => setSelectedTool(null)}
        onRequestSubmitted={(toolName) => {
          addToast({
            type: "success",
            title: "Borrow Request Sent",
            message: `Your request for "${toolName}" has been sent to the lender.`,
          });
        }}
      />

      {/* Add Tool Dialog */}
      <AddToolDialog
        isOpen={isAddToolOpen}
        onClose={onCloseAddTool}
        onSuccess={(toolName) => {
          addToast({
            type: "success",
            title: "Tool Listed Successfully",
            message: `"${toolName}" has been added to the neighborhood pool.`,
          });
        }}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
