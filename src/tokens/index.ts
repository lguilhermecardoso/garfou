// Design System Tokens — chamou.delivery

export const colors = {
  // Brand
  primary: {
    50: "#fff1f1",
    100: "#ffe1e1",
    200: "#ffc7c7",
    300: "#ffa0a0",
    400: "#ff6b6b",
    500: "#f83b3b", // Main red
    600: "#e51d1d",
    700: "#c21414",
    800: "#a01414",
    900: "#841818",
    950: "#480707",
  },
  accent: {
    50: "#fffbeb",
    100: "#fff3c4",
    200: "#ffe585",
    300: "#ffd147",
    400: "#ffbc1f",
    500: "#f59b05", // Warm yellow
    600: "#d97707",
    700: "#b45309",
    800: "#923f0d",
    900: "#78340f",
  },
  // Neutrals
  neutral: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
    950: "#030712",
  },
  // Semantic
  success: {
    light: "#d1fae5",
    DEFAULT: "#10b981",
    dark: "#065f46",
  },
  warning: {
    light: "#fef3c7",
    DEFAULT: "#f59e0b",
    dark: "#78350f",
  },
  error: {
    light: "#fee2e2",
    DEFAULT: "#ef4444",
    dark: "#7f1d1d",
  },
  info: {
    light: "#dbeafe",
    DEFAULT: "#3b82f6",
    dark: "#1e3a8a",
  },
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
  "3xl": "64px",
  "4xl": "96px",
} as const;

export const typography = {
  fontFamily: {
    sans: ["Inter", "system-ui", "sans-serif"],
    mono: ["JetBrains Mono", "monospace"],
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

export const shadows = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  card: "0 2px 8px 0 rgb(0 0 0 / 0.08)",
  elevated: "0 8px 24px 0 rgb(0 0 0 / 0.12)",
} as const;

export const radius = {
  none: "0",
  sm: "0.25rem",
  DEFAULT: "0.5rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.5rem",
  full: "9999px",
} as const;
