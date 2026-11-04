"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Wrench,
  Trees,
  UtensilsCrossed,
  Tent,
  Sparkles,
  Layers,
} from "lucide-react";
import { ToolCategory } from "@/features/tools/types";
import { cn } from "@/lib/utils";

interface ToolImageProps {
  src?: string;
  alt: string;
  category: ToolCategory;
  className?: string;
}

export function ToolImage({ src, alt, category, className }: ToolImageProps) {
  const [hasError, setHasError] = useState(false);

  // Category-specific fallback visuals
  const categoryFallbackConfig: Record<
    ToolCategory,
    { icon: React.ReactNode; bg: string; text: string }
  > = {
    "Power Tools": {
      icon: <Wrench className="w-12 h-12 stroke-[1.5]" />,
      bg: "bg-[#E7E3D9]",
      text: "text-[#244B3C]",
    },
    Garden: {
      icon: <Trees className="w-12 h-12 stroke-[1.5]" />,
      bg: "bg-[#DCE7D9]",
      text: "text-[#19372D]",
    },
    Kitchen: {
      icon: <UtensilsCrossed className="w-12 h-12 stroke-[1.5]" />,
      bg: "bg-[#F7EFE0]",
      text: "text-[#826a24]",
    },
    Camping: {
      icon: <Tent className="w-12 h-12 stroke-[1.5]" />,
      bg: "bg-[#E0E7DC]",
      text: "text-[#244B3C]",
    },
    Cleaning: {
      icon: <Sparkles className="w-12 h-12 stroke-[1.5]" />,
      bg: "bg-[#DCD4F0]/40",
      text: "text-[#4d3f6d]",
    },
    Other: {
      icon: <Layers className="w-12 h-12 stroke-[1.5]" />,
      bg: "bg-[#E7E3D9]",
      text: "text-[#777D76]",
    },
  };

  const fallback = categoryFallbackConfig[category] || categoryFallbackConfig.Other;

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "w-full h-full flex flex-col items-center justify-center relative overflow-hidden transition-colors",
          fallback.bg,
          fallback.text,
          className
        )}
      >
        <div className="p-4 rounded-full bg-white/40 shadow-sm backdrop-blur-xs">
          {fallback.icon}
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest mt-3 opacity-75">
          {category}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden bg-[#E7E3D9]", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
