/**
 * Premium Card Component
 * Optimizado para móviles con animaciones suaves y estados interactivos
 */

import React, { forwardRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { theme, componentStyles } from '@/lib/design-system/theme';
import { TrendingUp, TrendingDown, MoreVertical, ExternalLink } from 'lucide-react';

export interface CardPremiumProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'glass' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  loading?: boolean;
  error?: boolean;
  success?: boolean;
  hover?: boolean;
  glow?: boolean;
  children?: React.ReactNode;
  onCardClick?: () => void;
}

const CardPremium = forwardRef<HTMLDivElement, CardPremiumProps>(
  ({
    className,
    variant = 'default',
    size = 'md',
    interactive = false,
    loading = false,
    error = false,
    success = false,
    hover = true,
    glow = false,
    children,
    onCardClick,
    ...props
  }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    const cardClasses = cn(
      // Base styles
      componentStyles.card.base,
      
      // Tamaños
      {
        'p-3': size === 'sm',
        'p-4': size === 'md',
        'p-6': size === 'lg',
        'p-8': size === 'xl',
      },
      
      // Variantes
      {
        'border-0 shadow-lg': variant === 'elevated',
        'border-2': variant === 'bordered',
        'backdrop-blur-md bg-white/80': variant === 'glass',
        'bg-gradient-to-br from-primary-500 to-secondary-500 text-white': variant === 'gradient',
      },
      
      // Estados
      {
        'cursor-pointer': interactive || onCardClick,
        'shadow-glow': glow && variant !== 'gradient',
        'animate-pulse': loading,
        'border-error-500 bg-error-50': error,
        'border-success-500 bg-success-50': success,
      },
      
      // Interactividad
      {
        [componentStyles.card.hover]: hover && !loading,
        [componentStyles.card.interactive]: interactive || onCardClick,
        'transform active:scale-[0.98]': (interactive || onCardClick) && !loading,
        'transition-all duration-300 ease-smooth': true,
      },
      
      // Estados de hover/pressed
      {
        'scale-[1.02]': isHovered && hover && !loading,
        'scale-[0.98]': isPressed && !loading,
      },
      
      className
    );

    const handleClick = () => {
      if (loading) return;
      onCardClick?.();
    };

    return (
      <div
        ref={ref}
        className={cardClasses}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        onClick={handleClick}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        )}
        
        {children}
        
        {/* Overlay para estados pressed */}
        {isPressed && (interactive || onCardClick) && (
          <div className="absolute inset-0 bg-black/5 rounded-xl pointer-events-none" />
        )}
      </div>
    );
  }
);

CardPremium.displayName = 'CardPremium';

// Subcomponentes especializados
export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-lg font-semibold leading-none tracking-tight',
        'text-gray-900 dark:text-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
);

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        'text-sm text-gray-600 dark:text-gray-400',
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
);

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('space-y-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);

// Cards especializados para métricas
export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  description?: string;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  ({
    title,
    value,
    change,
    changeType = 'neutral',
    icon,
    description,
    loading = false,
    className,
    onClick,
    ...props
  }, ref) => {
    const formatChange = (change: number) => {
      const sign = change > 0 ? '+' : '';
      return `${sign}${change.toFixed(1)}%`;
    };

    return (
      <CardPremium
        ref={ref}
        className={cn('relative overflow-hidden', className)}
        interactive={!!onClick}
        loading={loading}
        onCardClick={onClick}
        {...props}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">
              {title}
            </CardTitle>
            {icon && (
              <div className="p-2 bg-primary-100 rounded-lg">
                {icon}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '---' : value}
            </div>
            
            {change !== undefined && !loading && (
              <div className={cn(
                'flex items-center text-sm font-medium',
                {
                  'text-success-600': changeType === 'positive',
                  'text-error-600': changeType === 'negative',
                  'text-gray-600': changeType === 'neutral',
                }
              )}>
                {changeType === 'positive' && <TrendingUp className="w-4 h-4 mr-1" />}
                {changeType === 'negative' && <TrendingDown className="w-4 h-4 mr-1" />}
                {formatChange(change)}
              </div>
            )}
          </div>
          
          {description && (
            <CardDescription className="mt-2">
              {description}
            </CardDescription>
          )}
        </CardContent>
        
        {/* Gradiente sutil para indicar interactividad */}
        {onClick && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-secondary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
      </CardPremium>
    );
  }
);

// Card para features/beneficios
export interface FeatureCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  badge?: string;
  href?: string;
  className?: string;
}

export const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({
    title,
    description,
    icon,
    badge,
    href,
    className,
    ...props
  }, ref) => {
    return (
      <CardPremium
        ref={ref}
        className={cn(
          'group relative overflow-hidden',
          'hover:shadow-xl hover:shadow-primary-500/10',
          'transition-all duration-300 ease-smooth',
          className
        )}
        interactive={!!href}
        hover={true}
        {...props}
      >
        {badge && (
          <div className="absolute top-4 right-4">
            <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
              {badge}
            </span>
          </div>
        )}
        
        <CardHeader>
          {icon && (
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              {icon}
            </div>
          )}
          <CardTitle className="group-hover:text-primary-600 transition-colors duration-300">
            {title}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <CardDescription className="text-base">
            {description}
          </CardDescription>
        </CardContent>
        
        {href && (
          <CardFooter>
            <div className="flex items-center text-primary-600 font-medium group-hover:text-primary-700 transition-colors duration-300">
              <span>Ver más</span>
              <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </CardFooter>
        )}
        
        {/* Gradiente animado en hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-secondary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </CardPremium>
    );
  }
);

CardHeader.displayName = 'CardHeader';
CardTitle.displayName = 'CardTitle';
CardDescription.displayName = 'CardDescription';
CardContent.displayName = 'CardContent';
CardFooter.displayName = 'CardFooter';
MetricCard.displayName = 'MetricCard';
FeatureCard.displayName = 'FeatureCard';

export { CardPremium }; 