import * as React from "react";
import { cn } from "@/lib/utils.js";
import { X } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, clearable, onClear, value, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center shrink-0">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          className={cn(
            "flex h-9 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.1] dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus-visible:ring-primary/30",
            icon && "pl-9",
            clearable && value && "pr-8",
            className
          )}
          ref={ref}
          {...props}
        />
        {clearable && value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
            aria-label="Clear input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export default Input;
