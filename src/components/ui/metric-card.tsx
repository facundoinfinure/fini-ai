/**
 * Ultra Premium Metric Card Component
 * Diseñado para aplicaciones de analytics top tier
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, MoreVertical, ExternalLink } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
    timeframe?: string;
  };
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  description?: string;
  loading?: boolean;
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onMenuClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  trend,
  icon,
  description,
  loading = false,
  className,
  variant = 'default',
  size = 'md',
  onClick,
  onMenuClick,
}) => {
  const isClickable = !!onClick;
  
  // Determine trend from change if not explicitly provided
  const effectiveTrend = trend || (change ? (change.value > 0 ? 'up' : change.value < 0 ? 'down' : 'neutral') : 'neutral');

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const formatChange = (changeValue: number) => {
    const sign = changeValue > 0 ? '+' : '';
    return `${sign}${changeValue.toFixed(1)}%`;
  };

  const variantStyles = {
    default: 'bg-white border-gray-200 hover:border-gray-300',
    primary: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:border-blue-300',
    success: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:border-green-300',
    warning: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:border-orange-300',
    error: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:border-red-300',
  };

  const sizeStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const textSizes = {
    sm: {
      title: 'text-sm',
      value: 'text-2xl',
      change: 'text-xs',
      description: 'text-xs',
    },
    md: {
      title: 'text-sm',
      value: 'text-3xl',
      change: 'text-sm',
      description: 'text-sm',
    },
    lg: {
      title: 'text-base',
      value: 'text-4xl',
      change: 'text-base',
      description: 'text-base',
    },
  };

  const trendStyles = {
    up: 'text-green-600 bg-green-100',
    down: 'text-red-600 bg-red-100',
    neutral: 'text-gray-600 bg-gray-100',
  };

  const TrendIcon = effectiveTrend === 'up' ? TrendingUp : effectiveTrend === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        'relative rounded-xl border shadow-card transition-all duration-300',
        variantStyles[variant],
        sizeStyles[size],
        {
          'cursor-pointer hover:shadow-card-hover hover:-translate-y-1 active:scale-95': isClickable,
          'hover:shadow-card-hover': !isClickable,
        },
        className
      )}
      onClick={onClick}
    >
      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {icon && (
            <div className="p-2 bg-gray-100 rounded-lg">
              {icon}
            </div>
          )}
          <div>
            <h3 className={cn(
              'font-semibold text-gray-900',
              textSizes[size].title
            )}>
              {title}
            </h3>
            {description && (
              <p className={cn(
                'text-gray-600 mt-1',
                textSizes[size].description
              )}>
                {description}
              </p>
            )}
          </div>
        </div>
        
        {onMenuClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMenuClick();
            }}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Value */}
      <div className="mb-4">
        <div className={cn(
          'font-bold text-gray-900',
          textSizes[size].value
        )}>
          {loading ? (
            <div className="shimmer-bg rounded h-8 w-24"></div>
          ) : (
            formatValue(value)
          )}
        </div>
      </div>

      {/* Change Indicator */}
      {change && !loading && (
        <div className="flex items-center space-x-2">
          <div className={cn(
            'flex items-center space-x-1 px-2 py-1 rounded-full',
            trendStyles[effectiveTrend]
          )}>
            <TrendIcon className="h-3 w-3" />
            <span className={cn(
              'font-medium',
              textSizes[size].change
            )}>
              {formatChange(change.value)}
            </span>
          </div>
          
          <span className={cn(
            'text-gray-500',
            textSizes[size].change
          )}>
            {change.label || 'vs anterior'}
            {change.timeframe && (
              <span className="ml-1">({change.timeframe})</span>
            )}
          </span>
        </div>
      )}

      {/* Clickable Indicator */}
      {isClickable && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ExternalLink className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Gradient Overlay for Interactive Cards */}
      {isClickable && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/0 to-blue-50/20 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
      )}
    </div>
  );
};

export { MetricCard };
export type { MetricCardProps }; 