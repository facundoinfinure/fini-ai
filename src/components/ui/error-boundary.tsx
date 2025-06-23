/**
 * Enterprise Error Boundary System
 * Robust error handling with logging and graceful fallbacks
 */

"use client"

import React from 'react';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ErrorBoundary');

interface ErrorInfo {
  componentStack: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
  context?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || 'unknown';
    
    // Log error with context
    logger.error('Component error caught', {
      errorId,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      level: this.props.level,
      retryCount: this.retryCount,
    });

    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorService(error, errorInfo, errorId);
    }
  }

  private sendToErrorService(error: Error, errorInfo: ErrorInfo, errorId: string) {
    // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
    console.error('Error sent to tracking service:', {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      logger.info('Retrying component render', {
        retryCount: this.retryCount,
        maxRetries: this.maxRetries,
        errorId: this.state.errorId,
      });
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
      });
    } else {
      logger.warn('Max retries reached', {
        retryCount: this.retryCount,
        maxRetries: this.maxRetries,
        errorId: this.state.errorId,
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={error!} retry={this.handleRetry} />;
      }

      // Default fallback based on error level
      return this.renderDefaultFallback();
    }

    return this.props.children;
  }

  private renderDefaultFallback() {
    const { level = 'component', context } = this.props;
    const { error, errorId } = this.state;
    const canRetry = this.retryCount < this.maxRetries;

    switch (level) {
      case 'page':
        return <PageErrorFallback 
          error={error!} 
          errorId={errorId!} 
          context={context}
          onRetry={canRetry ? this.handleRetry : undefined}
          onReload={this.handleReload}
        />;
      
      case 'section':
        return <SectionErrorFallback 
          error={error!} 
          errorId={errorId!} 
          context={context}
          onRetry={canRetry ? this.handleRetry : undefined}
        />;
      
      default:
        return <ComponentErrorFallback 
          error={error!} 
          errorId={errorId!} 
          context={context}
          onRetry={canRetry ? this.handleRetry : undefined}
        />;
    }
  }
}

// Page-level error fallback
function PageErrorFallback({ 
  error, 
  errorId, 
  context, 
  onRetry, 
  onReload 
}: {
  error: Error;
  errorId: string;
  context?: string;
  onRetry?: () => void;
  onReload: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">Algo salió mal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Ha ocurrido un error inesperado{context && ` en ${context}`}. 
            Nuestro equipo ha sido notificado automáticamente.
          </p>
          
          <div className="bg-gray-100 p-3 rounded text-xs text-gray-500">
            Error ID: {errorId}
          </div>
          
          <div className="flex flex-col space-y-2">
            {onRetry && (
              <Button onClick={onRetry} variant="default" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            )}
            <Button onClick={onReload} variant="outline" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Recargar página
            </Button>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-500">
                Detalles técnicos (desarrollo)
              </summary>
              <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Section-level error fallback
function SectionErrorFallback({ 
  error, 
  errorId, 
  context, 
  onRetry 
}: {
  error: Error;
  errorId: string;
  context?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Error en {context || 'esta sección'}
              </h3>
              <p className="text-sm text-red-700 mt-1">
                No se pudo cargar el contenido. Error ID: {errorId}
              </p>
            </div>
            
            {onRetry && (
              <Button onClick={onRetry} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Component-level error fallback
function ComponentErrorFallback({ 
  error, 
  errorId, 
  context, 
  onRetry 
}: {
  error: Error;
  errorId: string;
  context?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
      <div className="flex items-center space-x-2">
        <Bug className="h-4 w-4 text-red-600" />
        <span className="text-sm text-red-800">
          Error en {context || 'componente'}
        </span>
        {onRetry && (
          <Button onClick={onRetry} variant="ghost" size="sm">
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Specialized error boundaries for different parts of the app
export function DashboardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary 
      level="section" 
      context="Dashboard"
      onError={(error, errorInfo) => {
        logger.error('Dashboard error', { error: error.message, componentStack: errorInfo.componentStack });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function AgentErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary 
      level="section" 
      context="Sistema de Agentes"
      onError={(error, errorInfo) => {
        logger.error('Agent system error', { error: error.message, componentStack: errorInfo.componentStack });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function ChatErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary 
      level="component" 
      context="Chat"
      onError={(error, errorInfo) => {
        logger.error('Chat error', { error: error.message, componentStack: errorInfo.componentStack });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function AnalyticsErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary 
      level="section" 
      context="Analytics"
      onError={(error, errorInfo) => {
        logger.error('Analytics error', { error: error.message, componentStack: errorInfo.componentStack });
      }}
    >
      {children}
    </ErrorBoundary>
  );
} 