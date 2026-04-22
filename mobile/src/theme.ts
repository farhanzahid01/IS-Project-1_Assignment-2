export const theme = {
  colors: {
    bg: '#0b1020',
    surface: '#141a2e',
    surfaceAlt: '#1c2440',
    border: '#252d4a',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    textFaint: '#64748b',
    accent: '#38bdf8',
    accentDim: '#0ea5e9',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    protein: '#f472b6',
    carbs: '#fbbf24',
    fat: '#a78bfa',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 20,
    pill: 999,
  },
  spacing: (n: number) => n * 4,
};

export type Theme = typeof theme;
