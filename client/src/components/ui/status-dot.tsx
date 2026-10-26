import React, {
  type CSSProperties,
  createElement,
  forwardRef,
  type HTMLAttributes,
  useLayoutEffect,
} from "react";
import { cn } from "@/lib/utils.js";

const STYLE_ID = "iconiq-status-dot-styles";
const RIPPLE_DELAYS = [0, 0.75, 1.5] as const;

const STATUS_DOT_CSS = `
@keyframes iconiq-status-dot-ripple {
  0% {
    box-shadow: 0 0 0 0 var(--status-dot-ripple-mid);
  }
  70% {
    box-shadow: 0 0 0 var(--status-dot-ripple-spread) var(--status-dot-ripple-end);
  }
  100% {
    box-shadow: 0 0 0 0 var(--status-dot-ripple-end);
  }
}

.iconiq-status-dot-ripple {
  --status-dot-ripple-mid: color-mix(in srgb, var(--status-dot-color) 48%, transparent);
  --status-dot-ripple-end: transparent;
  animation: iconiq-status-dot-ripple 2.25s ease-out infinite;
}

.dark .iconiq-status-dot-ripple {
  --status-dot-ripple-mid: color-mix(in srgb, var(--status-dot-color) 58%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .iconiq-status-dot-ripple {
    animation: none;
  }
}
`;

export type StatusDotTone = "neutral" | "active" | "success" | "warning" | "error";
export type StatusDotState = "QUEUED" | "BUILDING" | "ERROR" | "READY" | "CANCELED";
export type StatusDotSize = "xs" | "sm" | "md" | "lg" | "xl";

const statusDotToneConfig: Record<StatusDotTone, { colorVar: string; label: string }> = {
  neutral: { colorVar: "var(--status-dot-neutral, #94a3b8)", label: "Neutral" },
  active: { colorVar: "var(--status-dot-active, #4f46e5)", label: "Active" },
  success: { colorVar: "var(--status-dot-success, #10b981)", label: "Success" },
  warning: { colorVar: "var(--status-dot-warning, #f59e0b)", label: "Warning" },
  error: { colorVar: "var(--status-dot-error, #ef4444)", label: "Error" },
};

const statusDotStateConfig: Record<
  StatusDotState,
  { tone: StatusDotTone; label: string; animate: boolean; colorVar?: string }
> = {
  QUEUED: { tone: "neutral", label: "Queued", animate: false, colorVar: "var(--status-dot-queued, #64748b)" },
  BUILDING: { tone: "warning", label: "Building", animate: true },
  ERROR: { tone: "error", label: "Error", animate: false },
  READY: { tone: "success", label: "Ready", animate: false },
  CANCELED: { tone: "neutral", label: "Canceled", animate: false, colorVar: "var(--status-dot-canceled, #94a3b8)" },
};

const statusDotSizeConfig: Record<string, { dot: number; container: number; rippleSpread: string }> = {
  xs: { dot: 5, container: 12, rippleSpread: "5px" },
  sm: { dot: 6, container: 14, rippleSpread: "7px" },
  md: { dot: 8, container: 20, rippleSpread: "9px" },
  lg: { dot: 10, container: 26, rippleSpread: "11px" },
  xl: { dot: 12, container: 32, rippleSpread: "13px" },
};

export type StatusDotProps = {
  animate?: boolean;
  pulse?: boolean;
  inline?: boolean;
  label?: string;
  labelClassName?: string;
  showLabel?: boolean;
  size?: StatusDotSize | string;
  state?: StatusDotState;
  tone?: StatusDotTone;
  status?: string;
} & HTMLAttributes<HTMLElement>;

function ensureStatusDotStyles() {
  if (typeof document === "undefined") return;
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = STATUS_DOT_CSS;
}

export const StatusDot = forwardRef<HTMLElement, StatusDotProps>(function StatusDot(
  {
    animate,
    pulse,
    className,
    inline = true,
    label,
    labelClassName,
    showLabel = false,
    size = "sm",
    state,
    style,
    tone = "neutral",
    status,
    ...props
  },
  ref
) {
  let finalTone = tone;
  if (status) {
    const s = status.toLowerCase();
    if (s === "active" || s === "running") finalTone = "active";
    else if (s === "error" || s === "failed" || s === "rejected") finalTone = "error";
    else if (s === "success" || s === "ready" || s === "published") finalTone = "success";
    else if (s === "pending" || s === "warning" || s === "scheduled" || s === "building") finalTone = "warning";
    else finalTone = "neutral";
  }

  const toneConfig = statusDotToneConfig[finalTone] || statusDotToneConfig.neutral;
  let colorVar = toneConfig.colorVar;
  let defaultLabel = toneConfig.label;
  let finalAnimate = animate ?? pulse;

  if (state && statusDotStateConfig[state]) {
    const s = statusDotStateConfig[state];
    finalTone = s.tone;
    colorVar = s.colorVar || statusDotToneConfig[s.tone]?.colorVar || colorVar;
    if (finalAnimate === undefined) {
      finalAnimate = s.animate;
    }
    defaultLabel = s.label;
  } else if (finalAnimate === undefined) {
    finalAnimate = finalTone === "active";
  }

  const sizeKey = typeof size === "string" ? size.toLowerCase() : "sm";
  const sizeConfig = statusDotSizeConfig[sizeKey] || statusDotSizeConfig.sm;
  const displayLabel = showLabel ? (label || defaultLabel) : null;
  const accessibleName = label || defaultLabel;

  useLayoutEffect(() => {
    ensureStatusDotStyles();
  }, []);

  const colorStyle = {
    "--status-dot-color": colorVar,
  } as CSSProperties;

  const rootStyle = {
    ...style,
    ...colorStyle,
  } as CSSProperties;

  const Root = inline ? "span" : "div";

  return createElement(
    Root,
    {
      className: cn(
        inline ? "inline-flex" : "flex",
        "items-center gap-1.5 select-none",
        className
      ),
      ref,
      style: rootStyle,
      "aria-label": !displayLabel ? accessibleName : undefined,
      role: "status",
      ...props,
    },
    <span
      aria-hidden
      className="relative shrink-0 overflow-visible inline-flex items-center justify-center"
      style={{
        width: sizeConfig.container,
        height: sizeConfig.container,
        ...colorStyle,
      }}
    >
      {finalAnimate
        ? RIPPLE_DELAYS.map((delay) => (
            <span
              key={delay}
              aria-hidden
              className="iconiq-status-dot-ripple pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: sizeConfig.dot,
                height: sizeConfig.dot,
                animationDelay: `${delay}s`,
                "--status-dot-ripple-spread": sizeConfig.rippleSpread,
              } as CSSProperties}
            />
          ))
        : null}
      <span
        aria-hidden
        className="relative rounded-full z-10 transition-transform duration-200"
        style={{
          width: sizeConfig.dot,
          height: sizeConfig.dot,
          backgroundColor: colorVar,
        }}
      />
    </span>,
    displayLabel ? (
      <span
        className={cn(
          "text-xs font-medium text-slate-700 dark:text-slate-300",
          labelClassName
        )}
      >
        {displayLabel}
      </span>
    ) : null
  );
});

StatusDot.displayName = "StatusDot";
export default StatusDot;
