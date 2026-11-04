"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ToolItem,
  ToolCategory,
  ToolAvailability,
  AddToolInput,
} from "@/features/tools/types";
import { ToolCard } from "./tool-card";
import { ToolFilters } from "./tool-filters";
import { ToolDetailDialog } from "./tool-detail-dialog";
import { AddToolDialog } from "./add-tool-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastContainer, ToastMessage } from "@/components/ui/toast";

interface ToolGridProps {
  initialTools: ToolItem[];
  isAddToolOpen: boolean;
  onCloseAddTool: () => void;
}

export function ToolGrid({
  initialTools,
  isAddToolOpen,
  onCloseAddTool,
}: ToolGridProps) {
  const [tools, setTools] = useState<ToolItem[]>(initialTools);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    ToolCategory | "All"
  >("All");
  const [selectedAvailability, setSelectedAvailability] = useState<
    ToolAvailability | "All"
  >("All");

  const [selectedTool, setSelectedTool] = useState<ToolItem | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Filtered tools
  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      // Search query (name or category or description)
      const matchesSearch =
        searchQuery.trim() === "" ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Category
      const matchesCategory =
        selectedCategory === "All" || tool.category === selectedCategory;

      // Availability
      const matchesAvailability =
        selectedAvailability === "All" ||
        tool.availability === selectedAvailability;

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [tools, searchQuery, selectedCategory, selectedAvailability]);

  // Handle borrow request demo
  const handleBorrowRequest = ({
    tool,
    startDate,
    endDate,
  }: {
    tool: ToolItem;
    startDate: string;
    endDate: string;
  }) => {
    addToast({
      type: "success",
      title: "Borrow request submitted (Demo)",
      message: `Your test request for ${tool.name} (${startDate} to ${endDate}) was logged locally.`,
    });
  };

  // Handle add tool demo
  const handleAddTool = (newToolInput: AddToolInput) => {
    const newTool: ToolItem = {
      id: `tool-${Date.now()}`,
      name: newToolInput.name,
      category: newToolInput.category,
      condition: newToolInput.condition,
      availability: "Available",
      description: newToolInput.description,
      imageUrl: newToolInput.imageUrl,
      locationArea: "Just listed nearby",
    };

    setTools((prev) => [newTool, ...prev]);
    addToast({
      type: "success",
      title: "Tool listed successfully (Demo)",
      message: `"${newTool.name}" is now listed in your local session discovery grid.`,
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedAvailability("All");
  };

  return (
    <div id="discover" className="space-y-8 scroll-mt-24">
      {/* Filters Bar */}
      <ToolFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedAvailability={selectedAvailability}
        onAvailabilityChange={setSelectedAvailability}
        onClearFilters={clearFilters}
        totalResults={filteredTools.length}
      />

      {/* Grid or Empty State */}
      {filteredTools.length > 0 ? (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredTools.map((tool) => (
              <motion.div
                key={tool.id}
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
      ) : (
        <EmptyState
          title="No tools match your search"
          description="Try adjusting your keywords, expanding your category selection, or resetting status filters to discover more items."
          actionLabel="Clear all filters"
          onAction={clearFilters}
        />
      )}

      {/* Detail Dialog */}
      <ToolDetailDialog
        tool={selectedTool}
        isOpen={Boolean(selectedTool)}
        onClose={() => setSelectedTool(null)}
        onRequestSubmit={handleBorrowRequest}
      />

      {/* Add Tool Dialog */}
      <AddToolDialog
        isOpen={isAddToolOpen}
        onClose={onCloseAddTool}
        onAddTool={handleAddTool}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
