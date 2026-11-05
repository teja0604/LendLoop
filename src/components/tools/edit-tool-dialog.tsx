"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import {
  TOOL_CATEGORIES,
  TOOL_CONDITIONS,
  ToolCategory,
  ToolCondition,
  MyToolItem,
} from "@/features/tools/types";
import { Loader2, AlertCircle, Save } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface EditToolDialogProps {
  tool: MyToolItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (toolName: string) => void;
}

interface EditToolFormProps {
  tool: MyToolItem;
  onClose: () => void;
  onSuccess?: (toolName: string) => void;
}

function EditToolForm({ tool, onClose, onSuccess }: EditToolFormProps) {
  const updateTool = useMutation(api.tools.updateTool);

  const [name, setName] = useState(tool.name);
  const [category, setCategory] = useState<ToolCategory>(tool.category);
  const [condition, setCondition] = useState<ToolCondition>(tool.condition);
  const [description, setDescription] = useState(tool.description);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      newErrors.name = "Tool name is required";
    } else if (trimmedName.length > 100) {
      newErrors.name = "Tool name must be 100 characters or fewer";
    }

    if (!trimmedDescription) {
      newErrors.description = "Short description is required";
    } else if (trimmedDescription.length > 2000) {
      newErrors.description = "Description must be 2000 characters or fewer";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setServerError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await updateTool({
        toolId: tool._id,
        name: name.trim(),
        category,
        condition,
        description: description.trim(),
      });

      const updatedName = name.trim();
      onClose();

      if (onSuccess) {
        onSuccess(updatedName);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update tool listing.";
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <Input
        label="Tool Name"
        placeholder="e.g. Cordless Impact Driver"
        value={name}
        disabled={isSubmitting}
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
          disabled={isSubmitting}
          onChange={(e) => setCategory(e.target.value as ToolCategory)}
          options={TOOL_CATEGORIES.map((c) => ({ label: c, value: c }))}
        />

        <Select
          label="Condition"
          value={condition}
          disabled={isSubmitting}
          onChange={(e) => setCondition(e.target.value as ToolCondition)}
          options={TOOL_CONDITIONS.map((c) => ({ label: c, value: c }))}
        />
      </div>

      <Textarea
        label="Description & Specifications"
        placeholder="Include details like motor power, battery type, accessories, or safety tips..."
        value={description}
        disabled={isSubmitting}
        onChange={(e) => {
          setDescription(e.target.value);
          if (errors.description)
            setErrors((prev) => ({ ...prev, description: "" }));
        }}
        error={errors.description}
      />

      <div className="pt-4 border-t border-[#E7E3D9] flex items-center justify-between gap-3">
        <p className="text-[11px] text-[#777D76]">
          Updates synced instantly to Convex
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function EditToolDialog({
  tool,
  isOpen,
  onClose,
  onSuccess,
}: EditToolDialogProps) {
  if (!tool) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Tool Listing"
      description="Update tool specifications, condition, or categorization."
      className="max-w-lg"
    >
      <EditToolForm
        key={tool._id}
        tool={tool}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}
