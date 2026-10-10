import { createClient } from "@/lib/supabase/client";

// Helpers for the public "trip-media" Storage bucket. Browser-side only.
export const BUCKET = "trip-media";

// "My Trip!" -> "my-trip"  (used for the /t/[slug] URL)
export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Uploads a file under the given folder and returns its public URL.
// A random prefix keeps file names unique.
export async function uploadFile(file: File, folder: string): Promise<string> {
  const supabase = createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) throw new Error(error.message);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Deletes files given their public URLs. Ignores URLs from other places.
export async function deleteFilesByUrl(urls: (string | null | undefined)[]) {
  const marker = `/${BUCKET}/`;
  const paths = urls
    .filter((u): u is string => !!u && u.includes(marker))
    .map((u) => decodeURIComponent(u.split(marker)[1].split("?")[0]));
  if (paths.length === 0) return;

  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove(paths);
}
