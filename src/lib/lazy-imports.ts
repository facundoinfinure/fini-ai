/**
 * Lazy Import System
 * Optimizes bundle size by loading components only when needed
 */

import { lazy } from 'react';

// Dashboard Components
export const AnalyticsOverview = lazy(() => 
  import('@/components/dashboard/analytics-overview')
    .then(module => ({ default: module.AnalyticsOverview }))
);

export const StoreManagement = lazy(() => 
  import('@/components/dashboard/store-management')
    .then(module => ({ default: module.StoreManagement }))
);

export const WhatsAppManagement = lazy(() => 
  import('@/components/dashboard/whatsapp-management')
    .then(module => ({ default: module.WhatsAppManagement }))
);

export const ConfigurationManagement = lazy(() => 
  import('@/components/dashboard/configuration-management')
    .then(module => ({ default: module.ConfigurationManagement }))
);

export const SubscriptionManagement = lazy(() => 
  import('@/components/dashboard/subscription-management')
    .then(module => ({ default: module.SubscriptionManagement }))
);

export const ChatPreview = lazy(() => 
  import('@/components/chat/chat-dashboard-wrapper')
    .then(module => ({ default: module.ChatDashboardWrapper }))
);

export const ChatMetrics = lazy(() => 
  import('@/components/chat/chat-metrics')
    .then(module => ({ default: module.ChatMetrics }))
);

// Future components will be added here as they are implemented
// Agent Components, RAG Components, Analytics Components, etc.

// Loading Components for Suspense
export { 
  DashboardSkeleton,
  AnalyticsSkeleton,
  ChatSkeleton,
  StoreManagementSkeleton,
  WhatsAppConfigSkeleton,
  AgentProcessingSkeleton
} from '@/components/ui/skeleton'; 