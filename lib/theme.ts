// ============================================================
// Vmenu.ai — Design Tokens (extracted from HTML prototype)
// ============================================================

export const fonts = {
  arabic: "'Tajawal', sans-serif",
  latin: "'Outfit', sans-serif",
  display: "'Syne', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

export const radius = {
  DEFAULT: "14px",   // --r
  sm: "10px",        // --rs
  xs: "6px",         // --rx
  full: "100px",     // --rf
};

export const easing = {
  ease: "cubic-bezier(.16,1,.3,1)",   // --ez
  spring: "cubic-bezier(.34,1.56,.64,1)", // --sp
};

export const darkTokens = {
  bg0: "#07070c",
  bg1: "#0e0e18",
  bg2: "#161624",
  bg3: "#1e1e32",
  bg4: "#282840",
  bgBlur: "rgba(14,14,24,.92)",
  border: "rgba(255,255,255,.06)",
  border2: "rgba(255,255,255,.1)",
  borderAccent: "rgba(255,180,50,.2)",

  text0: "#f0f0f8",
  text1: "#b0b0c8",
  text2: "#6e6e88",
  text3: "#3e3e52",

  accent: "#ffb432",
  accent2: "#ff9500",
  accentSubtle: "rgba(255,180,50,.08)",

  success: "#34d399",
  successSubtle: "rgba(52,211,153,.08)",

  danger: "#f87171",
  dangerSubtle: "rgba(248,113,113,.08)",

  warning: "#fbbf24",
  warningSubtle: "rgba(251,191,36,.08)",

  info: "#60a5fa",
  infoSubtle: "rgba(96,165,250,.08)",

  purple: "#a78bfa",
  purpleSubtle: "rgba(167,139,250,.08)",

  pink: "#f472b6",
  cyan: "#22d3ee",

  shadow: "0 2px 16px rgba(0,0,0,.25)",
  overlay: "rgba(0,0,0,.75)",
};

export const lightTokens = {
  bg0: "#f6f4f0",
  bg1: "#fff",
  bg2: "#f0ede6",
  bg3: "#e4e0d6",
  bg4: "#d8d4c8",
  bgBlur: "rgba(255,255,255,.92)",
  border: "rgba(0,0,0,.06)",
  border2: "rgba(0,0,0,.1)",
  borderAccent: "rgba(180,120,0,.15)",

  text0: "#1a1816",
  text1: "#50504a",
  text2: "#8a8880",
  text3: "#b8b4a8",

  accent: "#c07800",
  accent2: "#a06000",
  accentSubtle: "rgba(192,120,0,.06)",

  success: "#059669",
  successSubtle: "rgba(5,150,105,.06)",

  danger: "#dc2626",
  dangerSubtle: "rgba(220,38,38,.06)",

  warning: "#d97706",
  warningSubtle: "rgba(217,119,6,.06)",

  info: "#2563eb",
  infoSubtle: "rgba(37,99,235,.06)",

  purple: "#7c3aed",
  purpleSubtle: "rgba(124,58,237,.06)",

  shadow: "0 2px 16px rgba(0,0,0,.04)",
  overlay: "rgba(0,0,0,.5)",
};

// Menu themes (guest-facing)
export const menuThemes = [
  {
    id: "luxury_dark",
    nameAr: "فخم مظلم",
    nameEn: "Luxury Dark",
    bg: "#0a0a0f",
    titleColor: "#f0f0f0",
    textDim: "#666680",
    accent: "#c9a96e",
    accentText: "#000",
    cardBg: "#111118",
    border: "#1a1a2a",
  },
  {
    id: "fresh_light",
    nameAr: "منعش مضيء",
    nameEn: "Fresh Light",
    bg: "#fafaf6",
    titleColor: "#1a1a16",
    textDim: "#6a6a60",
    accent: "#2d9b4e",
    accentText: "#fff",
    cardBg: "#ffffff",
    border: "#e4e4da",
  },
  {
    id: "street_bold",
    nameAr: "شارع جريء",
    nameEn: "Street Bold",
    bg: "#111",
    titleColor: "#fff",
    textDim: "#888",
    accent: "#ff4444",
    accentText: "#fff",
    cardBg: "#1a1a1a",
    border: "#2a2a2a",
  },
  {
    id: "soft_pastel",
    nameAr: "ناعم باستيل",
    nameEn: "Soft Pastel",
    bg: "#fdf5f3",
    titleColor: "#3a2a2a",
    textDim: "#9a8a80",
    accent: "#d4849a",
    accentText: "#fff",
    cardBg: "#fff",
    border: "#f0e0d8",
  },
  {
    id: "saudi_modern",
    nameAr: "سعودي مودرن",
    nameEn: "Saudi Modern",
    bg: "#f5f0e8",
    titleColor: "#2c2418",
    textDim: "#8a7a60",
    accent: "#8b6914",
    accentText: "#fff",
    cardBg: "#fff",
    border: "#e0d8c8",
  },
];
