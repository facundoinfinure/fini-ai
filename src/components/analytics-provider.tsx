'use client';

import { createContext, useContext, useEffect, ReactNode, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { segmentClientAnalytics } from '@/lib/analytics';

// Analytics Context
const AnalyticsContext = createContext<{
  initialized: boolean;
}>({
  initialized: false,
});

export const useAnalyticsContext = () => useContext(AnalyticsContext);

interface AnalyticsProviderProps {
  children: ReactNode;
}

// Helper function to get page section
function getPageSection(page: string): string {
  if (page.includes('/dashboard')) return 'dashboard';
  if (page.includes('/onboarding')) return 'onboarding';
  if (page.includes('/auth')) return 'auth';
  if (page.includes('/chat')) return 'chat';
  return 'home';
}

/**
 * Internal Analytics Component that uses useSearchParams
 * This is wrapped in Suspense to prevent SSR issues
 */
function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Track page views automatically on route changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const trackPageView = () => {
      const page = pathname || '/';
      const section = getPageSection(page);
      
      segmentClientAnalytics.trackPageView({
        page: document.title || page,
        url: window.location.href,
        referrer: document.referrer || '',
        section: section as "home" | "dashboard" | "onboarding" | "auth" | "chat",
        userAgent: navigator.userAgent,
      });
    };

    // Small delay to ensure page is fully loaded
    const timer = setTimeout(trackPageView, 100);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  // Track user identification when user logs in
  useEffect(() => {
    if (!user?.id) return;

    segmentClientAnalytics.identify(user.id, {
      email: user.email,
      firstName: user.user_metadata?.firstName,
      lastName: user.user_metadata?.lastName,
      createdAt: user.created_at,
      lastSeen: new Date().toISOString(),
    });

    console.log('[ANALYTICS] User identified:', user.id);
  }, [user]);

  // Track errors globally
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      segmentClientAnalytics.trackClientError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript_error',
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      segmentClientAnalytics.trackClientError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        {
          type: 'promise_rejection',
        }
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}

/**
 * Analytics Provider Component
 * Handles automatic Segment initialization and page view tracking
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  return (
    <AnalyticsContext.Provider value={{ initialized: true }}>
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      {children}
    </AnalyticsContext.Provider>
  );
}
