import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        arabic:  ["var(--fa)", "sans-serif"],
        latin:   ["var(--fe)", "sans-serif"],
        display: ["var(--fd)", "sans-serif"],
        mono:    ["var(--fc)", "monospace"],
      },
      colors: {
        // Background scale
        b0: "var(--b0)",
        b1: "var(--b1)",
        b2: "var(--b2)",
        b3: "var(--b3)",
        b4: "var(--b4)",
        // Text scale
        t0: "var(--c0)",
        t1: "var(--c1)",
        t2: "var(--c2)",
        t3: "var(--c3)",
        // Semantic
        accent:   "var(--ac)",
        accent2:  "var(--ac2)",
        success:  "var(--sc)",
        danger:   "var(--dg)",
        warning:  "var(--wr)",
        info:     "var(--in)",
        purple:   "var(--pp)",
        pink:     "var(--pk)",
        cyan:     "var(--cy)",
      },
      borderRadius: {
        DEFAULT: "var(--r)",
        sm:      "var(--rs)",
        xs:      "var(--rx)",
        full:    "var(--rf)",
      },
      boxShadow: {
        card: "var(--sh)",
      },
      backdropBlur: {
        nav: "16px",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" }, to: { opacity: "1" } },
        fadeUp:  { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        scaleIn: { from: { opacity: "0", transform: "scale(.94)" }, to: { opacity: "1", transform: "scale(1)" } },
        barGrow: { from: { transform: "scaleY(0)" }, to: { transform: "scaleY(1)" } },
        toastIn: { from: { opacity: "0", transform: "translateY(-20px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        pop:     { "0%,100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.15)" } },
        pulse:   { "0%,100%": { opacity: "1" }, "50%": { opacity: ".4" } },
      },
      animation: {
        fadeIn:  "fadeIn .2s ease both",
        fadeUp:  "fadeUp .7s cubic-bezier(.16,1,.3,1) both",
        scaleIn: "scaleIn .35s cubic-bezier(.34,1.56,.64,1) both",
        barGrow: "barGrow .8s cubic-bezier(.16,1,.3,1) both",
        toastIn: "toastIn .3s cubic-bezier(.16,1,.3,1) both",
        pop:     "pop .5s cubic-bezier(.34,1.56,.64,1) both",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(.34,1.56,.64,1)",
        ease:   "cubic-bezier(.16,1,.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;
