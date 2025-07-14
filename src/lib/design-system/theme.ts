/**
 * Fini AI Design System - Ultra Premium Theme
 * Inspirado en aplicaciones top tier con estética moderna y sofisticada
 */

export const theme = {
  // Paleta de colores ultra premium - Dark & Modern
  colors: {
    // Colores primarios - Negro sofisticado con acentos
    primary: {
      50: '#f8f9fa',
      100: '#f1f3f4',
      200: '#e8eaed',
      300: '#dadce0',
      400: '#9aa0a6',
      500: '#5f6368',
      600: '#3c4043',
      700: '#202124',
      800: '#171717',
      900: '#0d0d0d',
      950: '#000000'
    },
    
    // Colores secundarios - Azul eléctrico (tecnología premium)
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
    
    // Colores de acento - Verde premium (éxito, dinero)
    accent: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      950: '#022c22'
    },
    
    // Colores de warning - Naranja premium
    warning: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      950: '#431407'
    },
    
    // Grises ultra premium - Neutros sofisticados
    gray: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a'
    },
    
    // Colores de background premium
    background: {
      primary: '#ffffff',
      secondary: '#fafafa',
      tertiary: '#f5f5f5',
      dark: '#0a0a0a',
      darkSecondary: '#171717',
      darkTertiary: '#262626'
    },
    
    // Borders premium
    border: {
      light: '#e5e5e5',
      medium: '#d4d4d4',
      dark: '#a3a3a3'
    },
    
    // Estados semánticos premium
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      900: '#064e3b'
    },
    
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      900: '#7f1d1d'
    },
    
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      900: '#1e3a8a'
    },
    
    // Gradientes premium
    gradients: {
      primary: 'linear-gradient(135deg, #0a0a0a 0%, #262626 100%)',
      secondary: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      accent: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      warning: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
      rainbow: 'linear-gradient(135deg, #3b82f6 0%, #10b981 25%, #f97316 50%, #ef4444 75%, #8b5cf6 100%)',
      glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      dark: 'linear-gradient(135deg, #0a0a0a 0%, #171717 50%, #262626 100%)'
    }
  },
  
  // Tipografía ultra premium
  typography: {
    fontFamily: {
      sans: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Oxygen',
        'Ubuntu',
        'Cantarell',
        'Fira Sans',
        'Droid Sans',
        'Helvetica Neue',
        'sans-serif'
      ],
      mono: [
        'SF Mono',
        'Monaco',
        'Inconsolata',
        'Roboto Mono',
        'Source Code Pro',
        'Menlo',
        'Consolas',
        'Liberation Mono',
        'Courier New',
        'monospace'
      ],
      display: [
        'Inter',
        'SF Pro Display',
        'Helvetica Neue',
        'Arial',
        'sans-serif'
      ]
    },
    
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.01em' }],
      sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }],
      base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0.01em' }],
      lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '0.01em' }],
      xl: ['1.25rem', { lineHeight: '1.875rem', letterSpacing: '0.01em' }],
      '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '0.01em' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.01em' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
      '5xl': ['3rem', { lineHeight: '3rem', letterSpacing: '-0.03em' }],
      '6xl': ['3.75rem', { lineHeight: '3.75rem', letterSpacing: '-0.04em' }],
      '7xl': ['4.5rem', { lineHeight: '4.5rem', letterSpacing: '-0.05em' }],
      '8xl': ['6rem', { lineHeight: '6rem', letterSpacing: '-0.06em' }],
      '9xl': ['8rem', { lineHeight: '8rem', letterSpacing: '-0.07em' }]
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
  
  // Espaciado premium - Sistema de 4px/8px
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
  
  // Radios de borde ultra premium
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    DEFAULT: '0.375rem', // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
    full: '9999px'
  },
  
  // Sombras ultra premium - Profundidad y elegancia
  boxShadow: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '2xl': '0 50px 100px -20px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    none: 'none',
    
    // Sombras ultra premium específicas
    glow: '0 0 20px rgba(59, 130, 246, 0.3)',
    'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
    'glow-orange': '0 0 20px rgba(249, 115, 22, 0.3)',
    'glow-lg': '0 0 40px rgba(59, 130, 246, 0.4)',
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    'card-premium': '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
    modal: '0 50px 100px -20px rgba(0, 0, 0, 0.25)',
    dropdown: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    button: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    'button-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
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
  
  // Animaciones ultra premium
  animation: {
    // Animaciones básicas mejoradas
    'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    'fade-out': 'fadeOut 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    'slide-left': 'slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    'slide-right': 'slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    
    // Animaciones premium
    'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    'scale-out': 'scaleOut 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    'bounce-gentle': 'bounceGentle 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
    'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    'float': 'float 6s ease-in-out infinite',
    'shimmer': 'shimmer 2s linear infinite',
    'gradient-shift': 'gradientShift 3s ease-in-out infinite',
    
    // Loading states premium
    'spinner': 'spin 1s linear infinite',
    'dots': 'dots 1.4s ease-in-out infinite',
    'skeleton': 'skeleton 2s ease-in-out infinite alternate',
    'pulse-slow': 'pulse 3s ease-in-out infinite',
    
    // Micro-interactions premium
    'tap': 'tap 0.1s cubic-bezier(0.16, 1, 0.3, 1)',
    'wiggle': 'wiggle 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
    'rubber-band': 'rubberBand 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    'heart-beat': 'heartBeat 1s ease-in-out infinite',
    'jello': 'jello 0.9s ease-in-out'
  },
  
  // Transiciones ultra suaves
  transitionDuration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    400: '400ms',
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
    
    // Easing ultra premium
    'ease-premium': 'cubic-bezier(0.16, 1, 0.3, 1)',
    'ease-smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    'ease-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    'ease-elastic': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    'ease-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    'ease-anticipate': 'cubic-bezier(0.22, 1, 0.36, 1)'
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