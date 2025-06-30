import React from 'react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';

interface UpgradePromptProps {
  feature: string;
  message: string;
  planRequired?: 'basic' | 'pro';
  showCard?: boolean;
  onUpgrade?: () => void;
  className?: string;
}

export function UpgradePrompt({ 
  feature, 
  message, 
  planRequired = 'pro',
  showCard = true,
  onUpgrade,
  className = ""
}: UpgradePromptProps) {
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default: redirect to billing/upgrade page
      window.location.href = '/dashboard?tab=subscription';
    }
  };

  const content = (
    <>
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          {planRequired === 'pro' ? 'Plan Pro' : 'Plan Basic'}
        </Badge>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {feature}
      </h3>
      
      <p className="text-gray-600 mb-4">
        {message}
      </p>
      
      <Button onClick={handleUpgrade} className="w-full">
        Actualizar a Plan {planRequired === 'pro' ? 'Pro' : 'Basic'}
      </Button>
    </>
  );

  if (showCard) {
    return (
      <Card className={`border-blue-200 bg-blue-50/50 ${className}`}>
        <CardContent className="pt-6">
          {content}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`p-4 border border-blue-200 rounded-lg bg-blue-50/50 ${className}`}>
      {content}
    </div>
  );
}

/**
 * Compact upgrade prompt for inline use
 */
export function InlineUpgradePrompt({ 
  message, 
  planRequired = 'pro',
  onUpgrade,
  className = ""
}: Omit<UpgradePromptProps, 'feature' | 'showCard'>) {
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = '/dashboard?tab=subscription';
    }
  };

  return (
    <div className={`flex items-center justify-between p-3 border border-yellow-200 bg-yellow-50 rounded-lg ${className}`}>
      <div className="flex items-center space-x-2">
        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-sm text-gray-700">{message}</span>
      </div>
      <Button size="sm" variant="outline" onClick={handleUpgrade}>
        Actualizar
      </Button>
    </div>
  );
}

/**
 * Feature gate component that shows upgrade prompt or children based on plan access
 */
interface FeatureGateProps {
  hasAccess: boolean;
  feature: string;
  message: string;
  planRequired?: 'basic' | 'pro';
  fallback?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FeatureGate({ 
  hasAccess, 
  feature, 
  message, 
  planRequired = 'pro',
  fallback,
  children, 
  className = ""
}: FeatureGateProps) {
  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <UpgradePrompt 
      feature={feature}
      message={message}
      planRequired={planRequired}
      className={className}
    />
  );
} 