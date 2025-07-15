/**
 * Fini AI Design System - Qatalog-Inspired Clean Theme
 * Professional, minimal, and business-focused aesthetic
 */

export const theme = {
  // Clean color palette inspired by Qatalog
  colors: {
    // Primary colors - Professional blues
    primary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617'
    },
    
    // Secondary colors - Clean accent blue
    secondary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    },
    
    // Success colors - Subtle green
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16'
    },
    
    // Warning colors - Professional amber
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03'
    },
    
    // Error colors - Subtle red
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a'
    },
    
    // Clean grays - Main palette
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
    
    // Background colors - Clean and simple
    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
      muted: '#f8fafc'
    },
    
    // Border colors - Subtle
    border: {
      light: '#f3f4f6',
      default: '#e5e7eb',
      medium: '#d1d5db',
      strong: '#9ca3af'
    },
    
    // Text colors - High contrast and readable
    text: {
      primary: '#111827',
      secondary: '#4b5563',
      tertiary: '#6b7280',
      muted: '#9ca3af',
      inverse: '#ffffff'
    }
  },
  
  // Clean typography system
  typography: {
    fontFamily: {
      sans: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Helvetica Neue',
        'Arial',
        'sans-serif'
      ],
      mono: [
        'SF Mono',
        'Monaco',
        'Menlo',
        'Consolas',
        'monospace'
      ]
    },
    
    fontSize: {
      xs: ['12px', { lineHeight: '16px', letterSpacing: '0.05em' }],
      sm: ['14px', { lineHeight: '20px', letterSpacing: '0.025em' }],
      base: ['16px', { lineHeight: '24px', letterSpacing: '0em' }],
      lg: ['18px', { lineHeight: '28px', letterSpacing: '-0.025em' }],
      xl: ['20px', { lineHeight: '28px', letterSpacing: '-0.025em' }],
      '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.025em' }],
      '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.025em' }],
      '4xl': ['36px', { lineHeight: '40px', letterSpacing: '-0.025em' }],
      '5xl': ['48px', { lineHeight: '1', letterSpacing: '-0.025em' }],
      '6xl': ['60px', { lineHeight: '1', letterSpacing: '-0.025em' }]
    },
    
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  },
  
  // Clean spacing system (8px base)
  spacing: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
    32: '128px',
    40: '160px',
    48: '192px',
    56: '224px',
    64: '256px'
  },
  
  // Simple border radius
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px'
  },
  
  // Clean shadows - Minimal and professional
  boxShadow: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    none: 'none',
    
    // Specific component shadows
    card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    button: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    'button-hover': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    dropdown: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    modal: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
  },
  
  // Responsive breakpoints
  screens: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  
  // Simple animations - Reduced motion
  animation: {
    'fade-in': 'fadeIn 0.2s ease-out',
    'fade-out': 'fadeOut 0.15s ease-in',
    'slide-up': 'slideUp 0.2s ease-out',
    'slide-down': 'slideDown 0.2s ease-out',
    'scale-in': 'scaleIn 0.15s ease-out',
    'scale-out': 'scaleOut 0.1s ease-in'
  },
  
  // Clean transitions
  transitionDuration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms'
  },
  
  transitionTimingFunction: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
} as const;

// Component styles - Qatalog-inspired
export const componentStyles = {
  // Clean buttons
  button: {
    base: 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    
    sizes: {
      sm: 'h-9 px-3 text-sm',
      md: 'h-10 px-4 py-2 text-sm',
      lg: 'h-11 px-8 text-base',
      xl: 'h-12 px-10 text-base'
    },
    
    variants: {
      primary: 'bg-primary-900 text-white hover:bg-primary-800 shadow-button hover:shadow-button-hover',
      secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 shadow-button hover:shadow-button-hover',
      outline: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 shadow-button hover:shadow-button-hover',
      ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      link: 'text-secondary-600 underline-offset-4 hover:underline'
    }
  },
  
  // Clean cards
  card: {
    base: 'rounded-lg border border-gray-200 bg-white shadow-card',
    hover: 'hover:shadow-card-hover transition-shadow duration-200',
    interactive: 'cursor-pointer hover:shadow-card-hover transition-shadow duration-200'
  },
  
  // Clean inputs
  input: {
    base: 'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    error: 'border-error-500 focus-visible:ring-error-500',
    success: 'border-success-500 focus-visible:ring-success-500'
  }
};

// Utility functions
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
    return `${spacing * 4}px`;
  }
  return (theme.spacing as Record<string, string>)[spacing] || spacing;
};

export type Theme = typeof theme;
export type ColorKey = keyof typeof theme.colors;
export type SpacingKey = keyof typeof theme.spacing; 