import type { PostcardData } from "@/lib/postcard";

// Seeded sample postcard, shown at /p/sample. It uses inline SVG pictures
// (data URIs) so it works without any uploaded files or Supabase rows.

function svgUri(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Front photo: a simple sunset over the sea.
const FRONT = svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6a35c"/><stop offset="0.55" stop-color="#f7d08a"/><stop offset="1" stop-color="#fbe9c6"/>
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2d7d9a"/><stop offset="1" stop-color="#14425c"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#sky)"/>
  <circle cx="820" cy="430" r="120" fill="#fff4d6"/>
  <rect y="480" width="1200" height="320" fill="url(#sea)"/>
  <path d="M0 520 Q150 490 300 520 T600 520 T900 520 T1200 520 V560 H0Z" fill="#3b93b0" opacity="0.6"/>
  <path d="M0 610 Q150 580 300 610 T600 610 T900 610 T1200 610 V650 H0Z" fill="#1d5f7b" opacity="0.7"/>
  <path d="M0 480 L180 360 L320 440 L470 330 L640 480Z" fill="#7a4a3a"/>
</svg>`);

// Photo for the back of the card: warm tiles.
const BACK_PHOTO = svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <rect width="600" height="400" fill="#f2e3c6"/>
  <rect x="30" y="30" width="250" height="160" fill="#c4572f"/>
  <rect x="320" y="30" width="250" height="160" fill="#2d7d9a"/>
  <rect x="30" y="210" width="250" height="160" fill="#e2b04a"/>
  <rect x="320" y="210" width="250" height="160" fill="#6b8f5e"/>
</svg>`);

// Stamp 1: a postage stamp with a sun.
const STAMP_SUN = svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="260" viewBox="0 0 200 260">
  <rect x="4" y="4" width="192" height="252" fill="#fffaf0" stroke="#c4572f" stroke-width="4" stroke-dasharray="10 6"/>
  <rect x="22" y="22" width="156" height="170" fill="#f7d08a"/>
  <circle cx="100" cy="95" r="38" fill="#c4572f"/>
  <path d="M22 160 Q61 130 100 160 T178 160 V192 H22Z" fill="#2d7d9a"/>
  <text x="100" y="228" font-family="Georgia, serif" font-size="22" text-anchor="middle" fill="#7a4a3a">POSTE 2026</text>
</svg>`);

// Stamp 2: a round postmark.
const STAMP_POSTMARK = svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260">
  <circle cx="130" cy="130" r="112" fill="none" stroke="#3a3a3a" stroke-width="5" opacity="0.7"/>
  <circle cx="130" cy="130" r="86" fill="none" stroke="#3a3a3a" stroke-width="3" opacity="0.7"/>
  <text x="130" y="122" font-family="Georgia, serif" font-size="30" text-anchor="middle" fill="#3a3a3a" opacity="0.8">LISBOA</text>
  <text x="130" y="156" font-family="Georgia, serif" font-size="22" text-anchor="middle" fill="#3a3a3a" opacity="0.8">12 AUG</text>
</svg>`);

export const SAMPLE_POSTCARD: PostcardData = {
  recipient_name: "Dear Amma",
  recipient_address: "12 Palm Street\nKozhikode, Kerala\nIndia",
  sender_name: "Priya",
  message:
    "Hello from Lisbon! The trams are tiny and yellow, the custard tarts are warm, and the sunsets look just like this one. Wish you were here to share it all. See you soon!",
  front_image_url: FRONT,
  back_image_url: BACK_PHOTO,
  stamps: [
    // Back photo (kind "photo" uses back_image_url). Small, tucked bottom-left.
    { id: "photo1", kind: "photo", x: 0.17, y: 0.66, w: 0.2, h: 0.2, rotation: -4 },
    // Stamps in the top-right corner.
    { id: "s1", kind: "stamp", src: STAMP_SUN, x: 0.86, y: 0.2, w: 0.12, h: 0.22, rotation: 4 },
    { id: "s2", kind: "stamp", src: STAMP_POSTMARK, x: 0.76, y: 0.2, w: 0.14, h: 0.2, rotation: -8 },
  ],
  text_blocks: [
    {
      id: "t1",
      side: "front",
      text: "Greetings from Lisbon!",
      x: 0.05,
      y: 0.08,
      w: 0.6,
      size: 0.11,
      fontKey: "script",
      color: "#ffffff",
      rotation: -3,
    },
    {
      id: "t2",
      side: "back",
      text: "xoxo",
      x: 0.36,
      y: 0.8,
      w: 0.1,
      size: 0.07,
      fontKey: "hand",
      color: "#c4572f",
      rotation: -6,
    },
  ],
};
