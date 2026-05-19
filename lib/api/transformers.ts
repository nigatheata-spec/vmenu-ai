// =============================================================
// Vmenu.ai — Data Transformers
// Convert raw API DTOs → internal domain types.
// Centralising this here means if the API shape changes, only
// this file needs updating — not every component.
// =============================================================

import type { MenuItemDTO, CategoryDTO } from "@/types/api";
import type { MenuItem, Category } from "@/types";

// -------------------------------------------------------------
// MenuItemDTO → MenuItem
// -------------------------------------------------------------
export function toMenuItem(dto: MenuItemDTO): MenuItem {
  return {
    // Use the Supabase UUID directly — no hashing.
    // MenuItem.id is now string which matches the DB primary key.
    id: dto.id,

    categoryId: dto.category_id,

    emoji:   dto.emoji || deriveEmoji(dto.name_en),  // || catches "" too
    nameAr:  dto.name_ar,
    nameEn:  dto.name_en,
    descAr:  dto.description_ar ?? "",
    descEn:  dto.description_en ?? "",
    price:   dto.price,
    badge:   dto.badge ?? "",
    available: dto.available ?? true,

    // Put the CDN image first so it overrides the emoji fallback
    images:  dto.image_url ? [dto.image_url] : [],
  };
}

// -------------------------------------------------------------
// CategoryDTO → Category
// -------------------------------------------------------------
export function toCategory(dto: CategoryDTO): Category {
  return {
    id:      dto.id,
    emoji:   dto.emoji || "🍽️",  // || catches "" from DB
    nameAr:  dto.name_ar,
    nameEn:  dto.name_en,
    visible: dto.visible ?? true,
  };
}

// -------------------------------------------------------------
// Array helpers
// -------------------------------------------------------------
export const toMenuItems  = (dtos: MenuItemDTO[]): MenuItem[]  => dtos.map(toMenuItem);
export const toCategories = (dtos: CategoryDTO[]): Category[]  => dtos.map(toCategory);

// -------------------------------------------------------------
// Utilities
// -------------------------------------------------------------

/** Best-effort emoji guess from English name */
function deriveEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/burger|smash/.test(n))  return "🍔";
  if (/pizza/.test(n))         return "🍕";
  if (/chicken|دجاج/.test(n)) return "🍗";
  if (/salad|سلطة/.test(n))   return "🥗";
  if (/fries|بطاطس/.test(n))  return "🍟";
  if (/dessert|cake|كيك/.test(n)) return "🍰";
  if (/drink|juice|عصير/.test(n)) return "🥤";
  if (/pasta|معكرون/.test(n)) return "🍝";
  if (/soup|شوربة/.test(n))   return "🍲";
  if (/rice|أرز/.test(n))     return "🍚";
  return "🍽️";
}
