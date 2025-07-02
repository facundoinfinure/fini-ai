/**
 * Enterprise Toast Notification System
 * Professional notifications with types, actions, and queue management
 */

"use client"

import * as React from "react"
import { Cross2Icon } from "@radix-ui/react-icons"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckCircle, AlertCircle, Info, AlertTriangle, X, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        success: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-100",
        error: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100",
        warning: "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-100",
        info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100",
        loading: "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900/20 dark:text-slate-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <Cross2Icon className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold [&+div]:text-xs", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

// Enhanced Toast Types
export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastNotification {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: ToastActionElement
  onClose?: () => void
  persistent?: boolean
  progress?: boolean
}

// Professional Toast Icons
const ToastIcon = ({ variant }: { variant: ToastVariant }) => {
  const iconClass = "h-5 w-5 flex-shrink-0"
  
  switch (variant) {
    case 'success':
      return <CheckCircle className={`${iconClass} text-green-600`} />
    case 'error':
      return <AlertCircle className={`${iconClass} text-red-600`} />
    case 'warning':
      return <AlertTriangle className={`${iconClass} text-yellow-600`} />
    case 'info':
      return <Info className={`${iconClass} text-blue-600`} />
    case 'loading':
      return <Loader2 className={`${iconClass} text-slate-600 animate-spin`} />
    default:
      return null
  }
}

// Enhanced Toast Component
export function EnhancedToast({
  title,
  description,
  variant = 'default',
  action,
  onClose,
  persistent = false,
  progress = false,
  ...props
}: ToastNotification & ToastProps) {
  return (
    <Toast variant={variant} {...props}>
      <div className="flex items-start space-x-3 w-full">
        <ToastIcon variant={variant} />
        <div className="flex-1 space-y-1">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
        </div>
        {action}
      </div>
      {!persistent && <ToastClose onClick={onClose} />}
      {progress && (
        <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 animate-pulse w-full" />
      )}
    </Toast>
  )
}

// Professional Toast Hook
export function useToast() {
  const [toasts, setToasts] = React.useState<ToastNotification[]>([])

  const addToast = React.useCallback((toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const newToast: ToastNotification = {
      id,
      duration: 5000,
      ...toast,
    }

    setToasts((_prevToasts) => [...prevToasts, newToast])

    // Auto remove if not persistent
    if (!newToast.persistent && newToast.duration) {
      setTimeout(() => {
        setToasts((_prevToasts) => prevToasts.filter((_toast) => toast.id !== id))
      }, newToast.duration)
    }

    return id
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((_prevToasts) => prevToasts.filter((_toast) => toast.id !== id))
  }, [])

  const removeAllToasts = React.useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods
  const success = React.useCallback((title: string, description?: string, options?: Partial<ToastNotification>) => {
    return addToast({
      variant: 'success',
      title,
      description,
      ...options,
    })
  }, [addToast])

  const error = React.useCallback((title: string, description?: string, options?: Partial<ToastNotification>) => {
    return addToast({
      variant: 'error',
      title,
      description,
      duration: 7000, // Longer for errors
      ...options,
    })
  }, [addToast])

  const warning = React.useCallback((title: string, description?: string, options?: Partial<ToastNotification>) => {
    return addToast({
      variant: 'warning',
      title,
      description,
      ...options,
    })
  }, [addToast])

  const info = React.useCallback((title: string, description?: string, options?: Partial<ToastNotification>) => {
    return addToast({
      variant: 'info',
      title,
      description,
      ...options,
    })
  }, [addToast])

  const loading = React.useCallback((title: string, description?: string, options?: Partial<ToastNotification>) => {
    return addToast({
      variant: 'loading',
      title,
      description,
      persistent: true, // Loading toasts should be manually dismissed
      progress: true,
      ...options,
    })
  }, [addToast])

  // Agent-specific toasts
  const agentSuccess = React.useCallback((agentType: string, message: string, duration?: number) => {
    return success(`Agente ${agentType}`, message, {
      duration: duration || 4000,
    })
  }, [success])

  const agentError = React.useCallback((agentType: string, errorMsg: string) => {
    return error(`Error en Agente ${agentType}`, errorMsg, {
      action: (
        <ToastAction altText="Reintentar">
          Reintentar
        </ToastAction>
      ),
    })
  }, [error])

  const agentProcessing = React.useCallback((agentType: string, operation: string) => {
    return loading(`Agente ${agentType}`, `Procesando: ${operation}`)
  }, [loading])

  return {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    success,
    error,
    warning,
    info,
    loading,
    agentSuccess,
    agentError,
    agentProcessing,
  }
}

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} 