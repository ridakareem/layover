// Postcard data shape shared by the renderer, the viewer (/p/[id]) and, later, the editor.
//
// LAYOUT RULE: every position and size is a fraction (0 to 1) of the canvas,
// so a postcard looks identical on a phone and on a big monitor.
//   x, w  -> fraction of the canvas WIDTH
//   y, h  -> fraction of the canvas HEIGHT
//   size  -> text size as a fraction of the canvas HEIGHT

// Postcards are 3:2 landscape.
export const ASPECT = 3 / 2;

// The three font choices for text. The values are the CSS variables that
// app/layout.tsx defines with next/font; the renderer reads them at runtime.
export type FontKey = "hand" | "script" | "serif";
export const FONT_VARS: Record<FontKey, string> = {
  hand: "--font-hand-face",
  script: "--font-script-face",
  serif: "--font-serif-face",
};
export const FONT_FALLBACKS: Record<FontKey, string> = {
  hand: "Caveat, cursive",
  script: "'Dancing Script', cursive",
  serif: "'Playfair Display', Georgia, serif",
};
export const FONT_LABELS: Record<FontKey, string> = {
  hand: "Handwriting",
  script: "Script",
  serif: "Serif",
};

// An image placed on the BACK of the card (a stamp or the optional back photo).
// x, y are the CENTER of the image, so rotating it keeps it in place.
//   kind "stamp": src is the image URL (for example "/stamps/eiffel.svg")
//   kind "photo": the picture is the postcard's back_image_url (src is ignored).
//     The photo's position is saved here too, so the postcards table needs no extra column.
export type ImageItem = {
  id: string;
  kind: "stamp" | "photo";
  src?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // degrees
};

// A free text block. x, y are the TOP-LEFT corner; w is the wrap width.
export type TextBlock = {
  id: string;
  side: "front" | "back";
  text: string;
  x: number;
  y: number;
  w: number;
  size: number;
  fontKey: FontKey;
  color: string; // "#rrggbb"
  rotation: number; // degrees
};

// Everything needed to draw a postcard. Field names match the postcards table.
export type PostcardData = {
  recipient_name: string | null;
  recipient_address: string | null;
  sender_name: string | null;
  message: string | null;
  front_image_url: string | null;
  back_image_url: string | null;
  stamps: ImageItem[];
  text_blocks: TextBlock[];
};

// Turns a database row into safe PostcardData (jsonb columns might be null or malformed).
export function toPostcardData(row: Record<string, unknown>): PostcardData {
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  return {
    recipient_name: str(row.recipient_name),
    recipient_address: str(row.recipient_address),
    sender_name: str(row.sender_name),
    message: str(row.message),
    front_image_url: str(row.front_image_url),
    back_image_url: str(row.back_image_url),
    stamps: Array.isArray(row.stamps) ? (row.stamps as ImageItem[]) : [],
    text_blocks: Array.isArray(row.text_blocks) ? (row.text_blocks as TextBlock[]) : [],
  };
}
