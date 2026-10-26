import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils.js";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  activeColor?: string;
  id?: string;
  "aria-label"?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  size = "md",
  className,
  activeColor = "bg-emerald-600 dark:bg-emerald-500",
  id,
  "aria-label": ariaLabel,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const sizeClasses = {
    sm: "w-8 h-4.5 p-0.5",
    md: "w-11 h-6 p-0.5",
    lg: "w-14 h-7.5 p-1",
  };

  const thumbSize = {
    sm: 14,
    md: 20,
    lg: 22,
  };

  const travel = {
    sm: 14,
    md: 20,
    lg: 26,
  };

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onCheckedChange(!checked);
      }}
      className={cn(
        "relative inline-flex items-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none shrink-0",
        sizeClasses[size],
        checked
          ? activeColor
          : "bg-slate-300 dark:bg-slate-700",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <motion.span
        className="rounded-full bg-white shadow-sm shrink-0 block pointer-events-none"
        style={{
          width: thumbSize[size],
          height: thumbSize[size],
        }}
        animate={{
          x: checked ? travel[size] : 0,
        }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 500, damping: 30 }
        }
      />
    </button>
  );
};

export default Switch;
