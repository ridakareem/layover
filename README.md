# Travel souvenir site

Next.js (App Router) + TypeScript + Tailwind + Supabase + react-konva.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` (note the leading dot) and fill in your Supabase
   Project URL and `anon` key (Project Settings > API). Restart `npm run dev` after editing it.
3. In the Supabase SQL Editor run `supabase/schema.sql` (skip if your tables already exist),
   then create the admin user under Authentication > Users and turn off signups.
4. Put your stamp images (`.svg`) in `public/stamps/`. They are listed by
   `scripts/stamps-manifest.mjs`, which runs automatically before `npm run dev` and
   `npm run build`. Restart `npm run dev` after adding a stamp.
5. `npm run dev`

## Pages

| Address | What |
| --- | --- |
| `/admin/login` | Admin sign in |
| `/admin` | Trips list and New trip form |
| `/admin/trips/[id]` | Photos, Blog and Postcards tabs |
| `/admin/trips/[id]/postcards/new` | Postcard editor |
| `/admin/trips/[id]/postcards/[pid]/edit` | Edit a saved postcard |
| `/t/[slug]` | Public trip page (the NFC link) |
| `/p/[id]` | Public postcard viewer with flip. `/p/sample` shows sample data |

## Notes

- Postcard positions are stored as 0-1 fractions of the 3:2 canvas (see `lib/postcard.ts`).
- The optional back photo's position is saved as an item of kind `"photo"` inside the
  `stamps` JSON; the picture itself is `back_image_url`.
- `PostcardRenderer` is the single component used by the editor and the viewer.
