import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95 select-none touch-manipulation",
  {
    variants: {
      variant: {
        default:
          "bg-gray-900 text-white shadow-button hover:bg-gray-800 hover:shadow-button-hover hover:-translate-y-0.5",
        destructive:
          "bg-red-600 text-white shadow-button hover:bg-red-700 hover:shadow-button-hover hover:-translate-y-0.5",
        outline:
          "border-2 border-gray-200 bg-white text-gray-900 shadow-button hover:bg-gray-50 hover:border-gray-300 hover:shadow-button-hover",
        secondary:
          "bg-gray-100 text-gray-900 shadow-button hover:bg-gray-200 hover:shadow-button-hover",
        ghost: "hover:bg-gray-100 hover:text-gray-900",
        link: "text-blue-600 underline-offset-4 hover:underline",
        success:
          "bg-green-600 text-white shadow-button hover:bg-green-700 hover:shadow-button-hover hover:-translate-y-0.5",
        warning:
          "bg-orange-600 text-white shadow-button hover:bg-orange-700 hover:shadow-button-hover hover:-translate-y-0.5",
        premium:
          "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-button hover:from-blue-700 hover:to-purple-700 hover:shadow-button-hover hover:-translate-y-0.5",
        dark:
          "bg-gray-800 text-white shadow-button hover:bg-gray-900 hover:shadow-button-hover hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-6 py-3",
        xs: "h-8 px-3 py-1.5 text-xs",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-12 px-8 py-3 text-base",
        xl: "h-14 px-10 py-4 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
