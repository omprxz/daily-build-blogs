import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils.js";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "xs" | "sm" | "md" | "lg";
}

const sizeMap = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-7 h-7",
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  className,
  ...props
}) => {
  return (
    <span
      className={cn("inline-flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400", className)}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <Loader2 className={cn("animate-spin", sizeMap[size])} />
    </span>
  );
};

export default Spinner;
