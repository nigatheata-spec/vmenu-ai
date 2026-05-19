import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Lang } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtTime(iso: string, lang: Lang = "ar") {
  return new Date(iso).toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtNumber(n: number) {
  return n.toLocaleString();
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "restaurant";
}
