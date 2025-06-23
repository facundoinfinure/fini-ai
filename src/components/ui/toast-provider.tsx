/**
 * Toast Provider Component
 * Simple provider for toast notifications
 */

"use client"

import * as React from "react"
import { ToastProvider, ToastViewport } from "./toast"

export function ToastProviderComponent({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider swipeDirection="right">
      {children}
      <ToastViewport />
    </ToastProvider>
  )
} 