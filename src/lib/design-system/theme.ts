/**
 * Fini AI Design System - Premium Theme
 * Optimizado para LATAM y mobile-first
 */

export const theme = {
  // Paleta de colores premium inspirada en fintech LATAM
  colors: {
    // Colores primarios - Verde vibrante (confianza, crecimiento)
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Principal
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16'
    },
    
    // Colores secundarios - Azul confianza (tecnología, profesionalismo)
    secondary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Principal
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    },
    
    // Colores de acento - Naranja energético (acción, conversión)
    accent: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316', // Principal
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      950: '#431407'
    },
    
    // Grises premium - Neutros sofisticados
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712'
    },
    
    // Estados semánticos
    success: {
      50: '#f0fdf4',
      500: '#10b981',
      600: '#059669',
      700: '#047857'
    },
    
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309'
    },
    
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c'
    },
    
    info: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8'
    }
  },
  
  // Tipografía premium - Optimizada para legibilidad móvil
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'] // Para títulos principales
    },
    
    fontSize: {
      // Mobile-first sizes
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
      '7xl': ['4.5rem', { lineHeight: '1' }],
      '8xl': ['6rem', { lineHeight: '1' }],
      '9xl': ['8rem', { lineHeight: '1' }]
    },
    
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900'
    }
  },
  
  // Espaciado premium - Sistema de 8px
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem', // 2px
    1: '0.25rem',    // 4px
    1.5: '0.375rem', // 6px
    2: '0.5rem',     // 8px
    2.5: '0.625rem', // 10px
    3: '0.75rem',    // 12px
    3.5: '0.875rem', // 14px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    7: '1.75rem',    // 28px
    8: '2rem',       // 32px
    9: '2.25rem',    // 36px
    10: '2.5rem',    // 40px
    11: '2.75rem',   // 44px
    12: '3rem',      // 48px
    14: '3.5rem',    // 56px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
    28: '7rem',      // 112px
    32: '8rem',      // 128px
    36: '9rem',      // 144px
    40: '10rem',     // 160px
    44: '11rem',     // 176px
    48: '12rem',     // 192px
    52: '13rem',     // 208px
    56: '14rem',     // 224px
    60: '15rem',     // 240px
    64: '16rem',     // 256px
    72: '18rem',     // 288px
    80: '20rem',     // 320px
    96: '24rem'      // 384px
  },
  
  // Radios de borde premium
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px'
  },
  
  // Sombras premium - Depth y elevación
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none',
    
    // Sombras premium específicas
    glow: '0 0 20px rgb(34 197 94 / 0.3)',
    'glow-lg': '0 0 40px rgb(34 197 94 / 0.4)',
    card: '0 4px 12px rgb(0 0 0 / 0.08)',
    'card-hover': '0 8px 25px rgb(0 0 0 / 0.12)',
    modal: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    dropdown: '0 10px 25px rgb(0 0 0 / 0.15)'
  },
  
  // Breakpoints mobile-first
  screens: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  
  // Animaciones y transiciones premium
  animation: {
    // Animaciones básicas
    'fade-in': 'fadeIn 0.5s ease-in-out',
    'fade-out': 'fadeOut 0.5s ease-in-out',
    'slide-up': 'slideUp 0.4s ease-out',
    'slide-down': 'slideDown 0.4s ease-out',
    'slide-left': 'slideLeft 0.4s ease-out',
    'slide-right': 'slideRight 0.4s ease-out',
    
    // Animaciones premium
    'bounce-gentle': 'bounceGentle 0.6s ease-in-out',
    'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
    'float': 'float 3s ease-in-out infinite',
    'shimmer': 'shimmer 2s linear infinite',
    
    // Loading states
    'spinner': 'spin 1s linear infinite',
    'dots': 'dots 1.4s ease-in-out infinite',
    'skeleton': 'skeleton 1.5s ease-in-out infinite alternate',
    
    // Micro-interactions
    'tap': 'tap 0.1s ease-in-out',
    'wiggle': 'wiggle 0.5s ease-in-out',
    'rubber-band': 'rubberBand 0.8s ease-in-out'
  },
  
  // Transiciones suaves
  transitionDuration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms'
  },
  
  transitionTimingFunction: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    
    // Easing premium
    'ease-smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    'ease-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    'ease-elastic': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  }
} as const;

// Utilidades del tema
export const getColorValue = (color: string, shade: number = 500) => {
  const colorPath = color.split('.');
  let value = theme.colors as any;
  
  for (const path of colorPath) {
    value = value[path];
  }
  
  return value[shade] || value;
};

export const getSpacingValue = (spacing: string | number) => {
  if (typeof spacing === 'number') {
    return `${spacing * 0.25}rem`;
  }
  return theme.spacing[spacing as keyof typeof theme.spacing] || spacing;
};

// Breakpoint utilities
export const breakpoints = {
  up: (size: keyof typeof theme.screens) => `@media (min-width: ${theme.screens[size]})`,
  down: (size: keyof typeof theme.screens) => {
    const sizes = Object.values(theme.screens);
    const index = Object.keys(theme.screens).indexOf(size);
    const prevSize = sizes[index - 1];
    return prevSize ? `@media (max-width: ${prevSize})` : '';
  },
  between: (min: keyof typeof theme.screens, max: keyof typeof theme.screens) => 
    `@media (min-width: ${theme.screens[min]}) and (max-width: ${theme.screens[max]})`
};

// Componentes base del sistema de diseño
export const componentStyles = {
  // Botones premium
  button: {
    base: 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    
    sizes: {
      xs: 'px-2.5 py-1.5 text-xs',
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg'
    },
    
    variants: {
      primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-md hover:shadow-lg',
      secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-secondary-500 shadow-md hover:shadow-lg',
      outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 focus:ring-primary-500',
      ghost: 'text-primary-500 hover:bg-primary-50 focus:ring-primary-500',
      danger: 'bg-error-500 text-white hover:bg-error-600 focus:ring-error-500 shadow-md hover:shadow-lg'
    }
  },
  
  // Cards premium
  card: {
    base: 'bg-white rounded-xl shadow-card border border-gray-200 transition-all duration-200',
    hover: 'hover:shadow-card-hover hover:-translate-y-0.5',
    interactive: 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.98]'
  },
  
  // Inputs premium
  input: {
    base: 'block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors duration-200',
    error: 'border-error-500 focus:border-error-500 focus:ring-error-500',
    success: 'border-success-500 focus:border-success-500 focus:ring-success-500'
  }
};

export type Theme = typeof theme;
export type ColorKey = keyof typeof theme.colors;
export type SpacingKey = keyof typeof theme.spacing; 