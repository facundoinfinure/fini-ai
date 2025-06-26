import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[#1a1a1a] text-white shadow-sm hover:bg-[#333333]",
        secondary:
          "bg-[#f8f9fa] text-[#1a1a1a] border border-[#e5e7eb] hover:bg-[#f3f4f6]",
        destructive:
          "bg-[#fef2f2] text-[#ef4444] border border-[#fecaca] hover:bg-[#fee2e2]",
        success:
          "bg-[#d1fae5] text-[#10b981] border border-[#a7f3d0] hover:bg-[#ecfdf5]",
        warning:
          "bg-[#fef3c7] text-[#f59e0b] border border-[#fde68a] hover:bg-[#fffbeb]",
        outline: "text-[#1a1a1a] border border-[#e5e7eb] hover:bg-[#f3f4f6]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
