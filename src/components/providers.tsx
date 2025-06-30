"use client";

import { ReactNode } from "react";
import { AnalyticsProvider } from './analytics-provider';
// import { SessionProvider } from "next-auth/react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AnalyticsProvider>
      {children}
    </AnalyticsProvider>
  );
} 