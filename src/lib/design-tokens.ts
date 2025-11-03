/**
 * Design Tokens - Single Source of Truth
 * Centraliza todas as definições de estilo do projeto
 */

export const designTokens = {
  // CORES (todas em HSL via CSS vars)
  colors: {
    brand: {
      primary: 'hsl(var(--primary))',
      secondary: 'hsl(var(--secondary))',
      accent: 'hsl(var(--accent))', // Orange #FF6B35 → 16 100% 55%
      purple: 'hsl(var(--color-purple))',
      indigo: 'hsl(var(--color-indigo))',
    },
    semantic: {
      success: 'hsl(var(--success))',
      warning: 'hsl(var(--color-warning))',
      error: 'hsl(var(--destructive))',
      info: 'hsl(var(--color-info))',
    },
    neutral: {
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      muted: 'hsl(var(--muted))',
      border: 'hsl(var(--border))',
      // Tons de cinza para dark mode
      gray50: 'hsl(0 0% 95%)',
      gray100: 'hsl(0 0% 90%)',
      gray200: 'hsl(0 0% 85%)',
      gray700: 'hsl(0 0% 20%)',
      gray800: 'hsl(0 0% 10%)',
      gray900: 'hsl(0 0% 5%)',
    }
  },
  
  // ESPAÇAMENTOS (baseado em múltiplos de 4px)
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
    '3xl': '4rem',  // 64px
    '4xl': '6rem',  // 96px
  },
  
  // TIPOGRAFIA
  typography: {
    fontFamily: {
      display: "'Bebas Neue', 'Inter', sans-serif",
      body: "'Inter', system-ui, -apple-system, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      black: '900',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    }
  },
  
  // BRUTALIST SPECIFIC
  brutalist: {
    borderWidth: {
      thin: '2px',
      medium: '4px',
      thick: '6px',
      'extra-thick': '8px',
    },
    shadow: {
      sm: '4px 4px 0 0 hsl(var(--foreground))',
      md: '8px 8px 0 0 hsl(var(--foreground))',
      lg: '12px 12px 0 0 hsl(var(--foreground))',
      xl: '16px 16px 0 0 hsl(var(--foreground))',
      accent: '8px 8px 0 0 hsl(var(--accent))',
      purple: '8px 8px 0 0 hsl(var(--color-purple))',
    },
    transition: {
      fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
      base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
      slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
    }
  },
  
  // BORDER RADIUS
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.5rem',
    full: '9999px',
  },
} as const;

// Helper type para autocomplete
export type DesignTokens = typeof designTokens;
