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
} from "@/features/tools/types";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";

interface AddToolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (toolName: string) => void;
}

export function AddToolDialog({
  isOpen,
  onClose,
  onSuccess,
}: AddToolDialogProps) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const createTool = useMutation(api.tools.createTool);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<ToolCategory>("Power Tools");
  const [condition, setCondition] = useState<ToolCondition>("Excellent");
  const [description, setDescription] = useState("");
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
      await createTool({
        name: name.trim(),
        category,
        condition,
        description: description.trim(),
      });

      const submittedName = name.trim();
      // Reset form
      setName("");
      setCategory("Power Tools");
      setCondition("Excellent");
      setDescription("");
      setErrors({});
      onClose();

      if (onSuccess) {
        onSuccess(submittedName);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create tool listing.";
      setServerError(message);
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
      title="Lend a Tool"
      description="List equipment from your shed or garage to share with your neighbourhood."
      className="max-w-lg"
    >
      {!authLoading && !isAuthenticated ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#DCE7D9] text-[#244B3C] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-editorial text-lg text-[#19372D]">
              Authentication Required
            </h3>
            <p className="text-xs text-[#777D76] max-w-sm mx-auto">
              You must be signed in to list a tool on LendLoop. Create a free account or sign in to share equipment.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Link href="/sign-in" onClick={onClose}>
              <Button variant="primary" size="sm">
                Sign in to continue
              </Button>
            </Link>
          </div>
        </div>
      ) : (
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
              Stored directly in Convex
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
                    Listing...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    List Tool
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
}
