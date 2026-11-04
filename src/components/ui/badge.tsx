import React from "react";
import { cn } from "@/lib/utils";
import { ToolAvailability, ToolCondition } from "@/features/tools/types";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "sage" | "coral" | "lavender" | "butter" | "neutral";
  size?: "sm" | "md";
}

export function Badge({
  variant = "default",
  size = "md",
  className,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-[#244B3C]/10 text-[#244B3C] border border-[#244B3C]/20",
    sage: "bg-[#DCE7D9] text-[#19372D] border border-[#9CAF91]/40",
    coral: "bg-[#F0785B]/15 text-[#c24b2f] border border-[#F0785B]/30",
    lavender: "bg-[#DCD4F0] text-[#3e345e] border border-[#c4b9e2]",
    butter: "bg-[#F2D98D] text-[#5c4a16] border border-[#dfc36e]",
    neutral: "bg-[#E7E3D9] text-[#292D2A] border border-[#d6d0c2]",
  };

  const sizeStyles = {
    sm: "text-[11px] font-medium px-2 py-0.5 rounded-full tracking-wide",
    md: "text-xs font-medium px-2.5 py-1 rounded-full",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 transition-colors select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function AvailabilityBadge({
  availability,
}: {
  availability: ToolAvailability;
}) {
  if (availability === "Available") {
    return (
      <Badge variant="sage" size="sm">
        <span className="w-1.5 h-1.5 rounded-full bg-[#244B3C]" />
        Available
      </Badge>
    );
  }
  if (availability === "On loan") {
    return (
      <Badge variant="coral" size="sm">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F0785B]" />
        On loan
      </Badge>
    );
  }
  return (
    <Badge variant="butter" size="sm">
      <span className="w-1.5 h-1.5 rounded-full bg-[#826a24]" />
      Reserved
    </Badge>
  );
}

export function ConditionBadge({ condition }: { condition: ToolCondition }) {
  return (
    <Badge variant="neutral" size="sm">
      {condition}
    </Badge>
  );
}
