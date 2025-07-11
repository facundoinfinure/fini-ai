/**
 * Premium Button Component
 * Optimizado para móviles con micro-interactions y estados avanzados
 */

import React, { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { theme, componentStyles } from '@/lib/design-system/theme';
import { Loader2, Check, X, ArrowRight } from 'lucide-react';

export interface ButtonPremiumProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  rounded?: boolean;
  glow?: boolean;
  pulse?: boolean;
  children?: React.ReactNode;
}

const ButtonPremium = forwardRef<HTMLButtonElement, ButtonPremiumProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    success = false,
    error = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    rounded = false,
    glow = false,
    pulse = false,
    disabled,
    children,
    onClick,
    ...props
  }, ref) => {
    const [isPressed, setIsPressed] = useState(false);
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

    // Manejar efecto ripple
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newRipple = {
        id: Date.now(),
        x,
        y
      };

      setRipples(prev => [...prev, newRipple]);
      
      // Remover ripple después de la animación
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 600);

      onClick?.(e);
    };

    // Determinar estado visual
    const currentState = loading ? 'loading' : success ? 'success' : error ? 'error' : 'default';
    
    // Construir clases CSS
    const buttonClasses = cn(
      // Base styles
      componentStyles.button.base,
      componentStyles.button.sizes[size],
      componentStyles.button.variants[variant],
      
      // Estados especiales
      {
        'w-full': fullWidth,
        'rounded-full': rounded,
        'shadow-glow': glow && variant === 'primary',
        'animate-pulse-glow': pulse,
        'opacity-50 cursor-not-allowed': disabled || loading,
        'transform active:scale-95': !disabled && !loading,
        'transition-all duration-200 ease-smooth': true,
        'relative overflow-hidden': true, // Para el efecto ripple
        'select-none': true, // Evitar selección de texto en móviles
        'touch-manipulation': true, // Optimización táctil
      },
      
      // Estados de éxito/error
      {
        'bg-success-500 hover:bg-success-600': success && variant === 'primary',
        'bg-error-500 hover:bg-error-600': error && variant === 'primary',
        'border-success-500 text-success-500': success && variant === 'outline',
        'border-error-500 text-error-500': error && variant === 'outline',
      },
      
      className
    );

    // Icono del estado
    const StateIcon = () => {
      if (loading) return <Loader2 className="w-4 h-4 animate-spin" />;
      if (success) return <Check className="w-4 h-4" />;
      if (error) return <X className="w-4 h-4" />;
      return null;
    };

    // Renderizar contenido del botón
    const renderContent = () => {
      const stateIcon = <StateIcon />;
      const userIcon = icon;
      
      // Si está cargando, solo mostrar spinner
      if (loading) {
        return (
          <span className="flex items-center gap-2">
            {stateIcon}
            <span className="opacity-70">Cargando...</span>
          </span>
        );
      }

      // Si hay estado de éxito/error, mostrar con icono
      if (success || error) {
        return (
          <span className="flex items-center gap-2">
            {stateIcon}
            <span>{children}</span>
          </span>
        );
      }

      // Contenido normal con icono opcional
      if (userIcon) {
        return (
          <span className="flex items-center gap-2">
            {iconPosition === 'left' && userIcon}
            <span>{children}</span>
            {iconPosition === 'right' && userIcon}
          </span>
        );
      }

      return children;
    };

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        onClick={handleClick}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        {...props}
      >
        {/* Efecto ripple */}
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            className="absolute bg-white/30 rounded-full pointer-events-none animate-ping"
            style={{
              left: ripple.x - 10,
              top: ripple.y - 10,
              width: 20,
              height: 20,
              animationDuration: '0.6s',
              animationTimingFunction: 'ease-out'
            }}
          />
        ))}
        
        {/* Contenido del botón */}
        <span className="relative z-10 flex items-center justify-center">
          {renderContent()}
        </span>
        
        {/* Overlay para estados pressed */}
        {isPressed && (
          <div className="absolute inset-0 bg-black/10 rounded-lg pointer-events-none" />
        )}
      </button>
    );
  }
);

ButtonPremium.displayName = 'ButtonPremium';

export { ButtonPremium };

// Variantes específicas para casos de uso común
export const PrimaryButton = forwardRef<HTMLButtonElement, Omit<ButtonPremiumProps, 'variant'>>(
  (props, ref) => <ButtonPremium ref={ref} variant="primary" {...props} />
);

export const SecondaryButton = forwardRef<HTMLButtonElement, Omit<ButtonPremiumProps, 'variant'>>(
  (props, ref) => <ButtonPremium ref={ref} variant="secondary" {...props} />
);

export const OutlineButton = forwardRef<HTMLButtonElement, Omit<ButtonPremiumProps, 'variant'>>(
  (props, ref) => <ButtonPremium ref={ref} variant="outline" {...props} />
);

export const GhostButton = forwardRef<HTMLButtonElement, Omit<ButtonPremiumProps, 'variant'>>(
  (props, ref) => <ButtonPremium ref={ref} variant="ghost" {...props} />
);

export const DangerButton = forwardRef<HTMLButtonElement, Omit<ButtonPremiumProps, 'variant'>>(
  (props, ref) => <ButtonPremium ref={ref} variant="danger" {...props} />
);

// Botones especializados para móviles
export const MobileActionButton = forwardRef<HTMLButtonElement, ButtonPremiumProps>(
  (props, ref) => (
    <ButtonPremium 
      ref={ref} 
      size="lg" 
      fullWidth 
      rounded 
      glow 
      {...props} 
    />
  )
);

export const FloatingActionButton = forwardRef<HTMLButtonElement, ButtonPremiumProps>(
  ({ className, ...props }, ref) => (
    <ButtonPremium 
      ref={ref} 
      size="lg" 
      rounded 
      glow 
      className={cn(
        'fixed bottom-6 right-6 z-50 shadow-2xl',
        'w-14 h-14 p-0',
        'hover:scale-110 active:scale-95',
        'transition-all duration-300 ease-bounce',
        className
      )}
      {...props} 
    />
  )
);

PrimaryButton.displayName = 'PrimaryButton';
SecondaryButton.displayName = 'SecondaryButton';
OutlineButton.displayName = 'OutlineButton';
GhostButton.displayName = 'GhostButton';
DangerButton.displayName = 'DangerButton';
MobileActionButton.displayName = 'MobileActionButton';
FloatingActionButton.displayName = 'FloatingActionButton'; 