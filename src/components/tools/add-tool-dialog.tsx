"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import {
  AddToolInput,
  TOOL_CATEGORIES,
  TOOL_CONDITIONS,
  ToolCategory,
  ToolCondition,
} from "@/features/tools/types";
import { Plus } from "lucide-react";

interface AddToolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTool: (tool: AddToolInput) => void;
}

export function AddToolDialog({
  isOpen,
  onClose,
  onAddTool,
}: AddToolDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ToolCategory>("Power Tools");
  const [condition, setCondition] = useState<ToolCondition>("Excellent");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Tool name is required";
    if (!description.trim()) newErrors.description = "Short description is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onAddTool({
      name: name.trim(),
      category,
      condition,
      description: description.trim(),
      imageUrl: imageUrl.trim() || undefined,
    });

    // Reset form
    setName("");
    setCategory("Power Tools");
    setCondition("Excellent");
    setDescription("");
    setImageUrl("");
    setErrors({});
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Lend a Tool"
      description="List a tool from your shed or garage to share with your neighbourhood."
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tool Name"
          placeholder="e.g. Cordless Impact Driver"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
          }}
          error={errors.name}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ToolCategory)}
            options={TOOL_CATEGORIES.map((c) => ({ label: c, value: c }))}
          />

          <Select
            label="Condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value as ToolCondition)}
            options={TOOL_CONDITIONS.map((c) => ({ label: c, value: c }))}
          />
        </div>

        <Textarea
          label="Description & Specifications"
          placeholder="Include details like motor power, battery type, accessories, or safety tips..."
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description)
              setErrors((prev) => ({ ...prev, description: "" }));
          }}
          error={errors.description}
        />

        <Input
          label="Image URL (Optional)"
          placeholder="https://example.com/tool-photo.jpg"
          value={imageUrl}
          hint="Leave empty to use our category-specific editorial badge"
          onChange={(e) => setImageUrl(e.target.value)}
        />

        <div className="pt-4 border-t border-[#E7E3D9] flex items-center justify-between gap-3">
          <p className="text-[11px] text-[#777D76]">
            Frontend demo: Added to local memory
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              List Tool
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
