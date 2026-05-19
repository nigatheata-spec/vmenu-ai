// =============================================================
// Vmenu.ai — API Contract Types
// Wire shapes returned by the backend. Keep these separate from
// the app-internal domain types so the two can evolve
// independently and the transform layer is explicit.
// =============================================================

// -------------------------------------------------------------
// GET /api/menu/items
// Returns an array of MenuItemDTO
// -------------------------------------------------------------
export interface MenuItemDTO {
  /** Opaque server-side identifier (UUID or CUID) */
  id: string;

  /** Arabic display name */
  name_ar: string;

  /** English display name */
  name_en: string;

  /** Price in the venue's local currency (e.g. SAR) */
  price: number;

  /** Absolute or CDN-relative URL for the hero image */
  image_url: string;

  /** Foreign key → Category.id */
  category_id: string;

  // ------ optional fields the backend MAY include ------

  /** Arabic description */
  description_ar?: string;

  /** English description */
  description_en?: string;

  /** Decorative label: "🔥" | "جديد" | "" */
  badge?: string;

  /** Whether the item can be ordered right now */
  available?: boolean;

  /** Emoji shorthand used when no image is uploaded */
  emoji?: string;
}

// -------------------------------------------------------------
// GET /api/menu/categories
// Returns an array of CategoryDTO
// -------------------------------------------------------------
export interface CategoryDTO {
  /** Opaque server-side identifier */
  id: string;

  /** Arabic display name */
  name_ar: string;

  /** English display name */
  name_en: string;

  /** Emoji prefix shown next to the category pill */
  emoji?: string;

  /** Whether this category is shown to guests */
  visible?: boolean;

  /** Ordering hint; lower = shown first */
  sort_order?: number;
}

// -------------------------------------------------------------
// Generic API envelope
// The backend wraps every response in this shape so callers
// can distinguish domain errors from HTTP errors.
// -------------------------------------------------------------
export interface ApiEnvelope<T> {
  data: T;
  /** ISO 8601 timestamp of the response */
  timestamp: string;
  /** Optional pagination cursor for list endpoints */
  next_cursor?: string | null;
}

// -------------------------------------------------------------
// Error shape returned by the backend on 4xx / 5xx
// -------------------------------------------------------------
export interface ApiError {
  code: string;           // e.g. "NOT_FOUND" | "VALIDATION_ERROR"
  message: string;        // Human-readable, English
  message_ar?: string;    // Human-readable, Arabic (optional)
  details?: unknown;      // Validation field errors, etc.
}

// -------------------------------------------------------------
// Example JSON responses (for documentation / tests)
// -------------------------------------------------------------

/**
 * Example: GET /api/menu/items
 *
 * HTTP 200
 * {
 *   "data": [
 *     {
 *       "id": "item_01hwz4r9k",
 *       "name_ar": "سماش برقر واجيو",
 *       "name_en": "Wagyu Smash Burger",
 *       "price": 59,
 *       "image_url": "https://cdn.vmenu.ai/items/wagyu-smash.jpg",
 *       "category_id": "cat_burgers",
 *       "description_ar": "لحم واجيو وجبنة شيدر مع صلصة خاصة",
 *       "description_en": "Wagyu beef patty, cheddar, house sauce",
 *       "badge": "🔥",
 *       "available": true,
 *       "emoji": "🍔"
 *     }
 *   ],
 *   "timestamp": "2025-04-27T10:00:00Z",
 *   "next_cursor": null
 * }
 *
 * HTTP 401
 * {
 *   "code": "UNAUTHORIZED",
 *   "message": "Missing or invalid Authorization header"
 * }
 */

/**
 * Example: GET /api/menu/categories
 *
 * HTTP 200
 * {
 *   "data": [
 *     {
 *       "id": "cat_burgers",
 *       "name_ar": "برقر",
 *       "name_en": "Burgers",
 *       "emoji": "🍔",
 *       "visible": true,
 *       "sort_order": 1
 *     }
 *   ],
 *   "timestamp": "2025-04-27T10:00:00Z"
 * }
 */
