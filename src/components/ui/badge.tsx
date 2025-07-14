import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gray-900 text-white shadow-sm hover:bg-gray-800",
        secondary:
          "bg-gray-100 text-gray-900 border border-gray-200 hover:bg-gray-200",
        destructive:
          "bg-red-100 text-red-800 border border-red-200 hover:bg-red-200",
        success:
          "bg-green-100 text-green-800 border border-green-200 hover:bg-green-200",
        warning:
          "bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-200",
        info:
          "bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200",
        outline: "text-gray-900 border border-gray-200 hover:bg-gray-100",
        premium:
          "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm hover:from-blue-700 hover:to-purple-700",
      },
      size: {
        default: "px-3 py-1.5 text-xs",
        sm: "px-2 py-1 text-xs",
        lg: "px-4 py-2 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
