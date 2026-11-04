import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-[#19372D]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full rounded-2xl border border-[#E7E3D9] bg-white px-4 py-2.5 text-sm text-[#292D2A] placeholder:text-[#777D76]/60 transition-all duration-150 focus:border-[#244B3C] focus:outline-none focus:ring-2 focus:ring-[#244B3C]/10 disabled:opacity-50",
            error && "border-[#F0785B] focus:border-[#F0785B] focus:ring-[#F0785B]/20",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-[#777D76]">{hint}</p>
        )}
        {error && (
          <p className="text-xs font-medium text-[#c24b2f]">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold uppercase tracking-wider text-[#19372D]"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={3}
          className={cn(
            "w-full rounded-2xl border border-[#E7E3D9] bg-white px-4 py-2.5 text-sm text-[#292D2A] placeholder:text-[#777D76]/60 transition-all duration-150 focus:border-[#244B3C] focus:outline-none focus:ring-2 focus:ring-[#244B3C]/10 disabled:opacity-50 resize-y",
            error && "border-[#F0785B] focus:border-[#F0785B] focus:ring-[#F0785B]/20",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs font-medium text-[#c24b2f]">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-[#19372D]"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            "w-full rounded-2xl border border-[#E7E3D9] bg-white px-4 py-2.5 text-sm text-[#292D2A] transition-all duration-150 focus:border-[#244B3C] focus:outline-none focus:ring-2 focus:ring-[#244B3C]/10 disabled:opacity-50 cursor-pointer",
            error && "border-[#F0785B] focus:border-[#F0785B] focus:ring-[#F0785B]/20",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs font-medium text-[#c24b2f]">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
