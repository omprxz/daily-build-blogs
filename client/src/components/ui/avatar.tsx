import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { Slot } from "@radix-ui/react-slot";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils.js";

type AvatarSize = "default" | "sm" | "lg";
type TooltipSide = "top" | "bottom" | "left" | "right";
type AvatarBadgeVariant = "online" | "offline" | "busy" | "away";

export interface AvatarBadgeProps extends React.ComponentProps<"span"> {
  tooltip?: string;
  tooltipSide?: TooltipSide;
  tooltipDelay?: number;
  tooltipClassName?: string;
  variant?: AvatarBadgeVariant;
}

export interface AvatarProps extends AvatarPrimitive.Root.Props {
  size?: AvatarSize;
  name?: string;
  asChild?: boolean;
  tooltip?: string;
  tooltipSide?: TooltipSide;
  tooltipDelay?: number;
  tooltipClassName?: string;
}

function hasFallbackChildren(children: React.ReactNode) {
  if (children === undefined || children === null || children === false) {
    return false;
  }
  if (typeof children === "string") {
    return children.trim().length > 0;
  }
  if (Array.isArray(children)) {
    return children.some(hasFallbackChildren);
  }
  return true;
}

const AVATAR_IMAGE_SIZE: Record<AvatarSize, number> = {
  sm: 24,
  default: 32,
  lg: 40,
};

const BADGE_VARIANT_CLASSNAME: Record<AvatarBadgeVariant, string> = {
  online: "bg-emerald-500",
  offline: "bg-slate-400 dark:bg-slate-500",
  busy: "bg-rose-500",
  away: "bg-amber-500",
};

type AvatarContextValue = {
  name?: string;
  size: AvatarSize;
};

const AvatarContext = React.createContext<AvatarContextValue>({
  size: "default",
});

function useAvatarContext() {
  return React.useContext(AvatarContext);
}

function getAvatarInitials(fallback?: string, name?: string, alt?: string) {
  const normalized = (fallback || name || alt || "").trim();
  if (!normalized) return "?";
  const words = normalized.split(/[\s_-]+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return normalized.slice(0, 2).toUpperCase() || "?";
}

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      "aria-label": ariaLabel,
      asChild = false,
      className,
      name,
      render,
      size = "default",
      tabIndex,
      tooltip,
      tooltipClassName,
      tooltipDelay,
      tooltipSide,
      ...props
    },
    ref
  ) => {
    return (
      <AvatarContext.Provider value={{ name, size }}>
        <AvatarPrimitive.Root
          {...props}
          aria-label={ariaLabel || name}
          className={cn(
            "group/avatar relative flex size-8 shrink-0 select-none rounded-full after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
            className
          )}
          data-size={size}
          data-slot="avatar"
          ref={ref}
          render={render ?? (asChild ? <Slot /> : undefined)}
          tabIndex={tabIndex}
        />
      </AvatarContext.Provider>
    );
  }
);
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  AvatarPrimitive.Image.Props
>(({ className, height, width, ...props }, ref) => {
  const { size } = useAvatarContext();
  const dimension = AVATAR_IMAGE_SIZE[size];

  return (
    <AvatarPrimitive.Image
      className={cn(
        "aspect-square size-full overflow-hidden rounded-full object-cover",
        className
      )}
      data-slot="avatar-image"
      height={height ?? dimension}
      ref={ref}
      width={width ?? dimension}
      {...props}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  AvatarPrimitive.Fallback.Props
>(({ children, className, ...props }, ref) => {
  const { name } = useAvatarContext();
  const fallbackContent = hasFallbackChildren(children)
    ? children
    : getAvatarInitials(undefined, name);

  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "flex size-full items-center justify-center overflow-hidden rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold text-xs group-data-[size=lg]/avatar:text-sm group-data-[size=sm]/avatar:text-[10px]",
        className
      )}
      data-slot="avatar-fallback"
      ref={ref}
      {...props}
    >
      {fallbackContent}
    </AvatarPrimitive.Fallback>
  );
});
AvatarFallback.displayName = "AvatarFallback";

const AvatarBadge = React.forwardRef<HTMLSpanElement, AvatarBadgeProps>(
  (
    {
      "aria-label": ariaLabel,
      className,
      tabIndex,
      variant = "online",
      ...props
    },
    ref
  ) => {
    return (
      <span
        aria-label={ariaLabel}
        className={cn(
          "absolute right-0 bottom-0 z-10 inline-flex size-2.5 shrink-0 select-none items-center justify-center rounded-full ring-2 ring-background group-data-[size=default]/avatar:size-2.5 group-data-[size=lg]/avatar:size-3 group-data-[size=sm]/avatar:size-2",
          BADGE_VARIANT_CLASSNAME[variant],
          className
        )}
        data-slot="avatar-badge"
        role="img"
        tabIndex={tabIndex}
        {...props}
        ref={ref}
      />
    );
  }
);
AvatarBadge.displayName = "AvatarBadge";

export {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
  getAvatarInitials,
  type AvatarBadgeVariant,
  type AvatarSize,
};
export default Avatar;
