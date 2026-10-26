import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils.js";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-semibold transition-colors focus:outline-none select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30",
        secondary:
          "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700/60",
        outline:
          "border border-slate-200 text-slate-700 bg-white dark:border-white/[0.1] dark:text-slate-300 dark:bg-slate-900",
        destructive:
          "bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
        success:
          "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
        warning:
          "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
        purple:
          "bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
        sky:
          "bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px] rounded-md tracking-wider uppercase",
        md: "px-2.5 py-0.5 text-xs rounded-full font-medium",
        lg: "px-3 py-1 text-xs rounded-full font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
  dotPulse?: boolean;
  shimmer?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      dot = false,
      dotColor,
      dotPulse = false,
      shimmer = false,
      onDismiss,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();

    const getDotBgClass = () => {
      if (dotColor) return dotColor;
      switch (variant) {
        case "success":
          return "bg-emerald-500";
        case "destructive":
          return "bg-rose-500";
        case "warning":
          return "bg-amber-500";
        case "purple":
          return "bg-purple-500";
        case "sky":
          return "bg-sky-500";
        case "secondary":
          return "bg-slate-400";
        default:
          return "bg-primary";
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden shrink-0",
          badgeVariants({ variant, size, className })
        )}
        {...props}
      >
        {shimmer && !prefersReducedMotion && (
          <motion.span
            animate={{ x: ["-100%", "200%"] }}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              repeatDelay: 1.5,
              ease: "easeInOut",
            }}
          />
        )}
        {dot && (
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              getDotBgClass(),
              dotPulse && !prefersReducedMotion && "animate-pulse"
            )}
          />
        )}
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="truncate">{children}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }
);

Badge.displayName = "Badge";
export default Badge;
