"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
        className
      )}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-slate-900 transition-all dark:bg-slate-50"
        style={{
          transform: `translateX(-${100 - ((value || 0) / max) * 100}%)`,
        }}
      />
    </div>
  )
);
Progress.displayName = "Progress";

export { Progress }; 