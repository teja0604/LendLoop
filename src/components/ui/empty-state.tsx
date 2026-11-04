import React from "react";
import { PackageSearch } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-[#DCE7D9] flex items-center justify-center text-[#244B3C] mb-4">
        <PackageSearch className="w-7 h-7" />
      </div>
      <h3 className="font-editorial text-2xl text-[#19372D] font-normal mb-2">
        {title}
      </h3>
      <p className="text-sm text-[#777D76] leading-relaxed mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
