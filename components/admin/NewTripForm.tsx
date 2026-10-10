"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugify, uploadFile } from "@/lib/storage";

// "New Trip" form: title, slug and an optional cover image.
export default function NewTripForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false); // stop auto-filling once the admin edits the slug
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You are signed out. Please log in again.");

      // 1) Create the trip row first so we get its id.
      const { data: trip, error: insertError } = await supabase
        .from("trips")
        .insert({ title: title.trim(), slug: slugify(slug), user_id: auth.user.id })
        .select("id")
        .single();

      if (insertError) {
        // 23505 = unique violation (slug already used)
        throw new Error(insertError.code === "23505" ? "That slug is already taken." : insertError.message);
      }

      // 2) Upload the cover (if any) and save its URL on the trip.
      if (cover) {
        const url = await uploadFile(cover, `trips/${trip.id}/cover`);
        const { error: updateError } = await supabase.from("trips").update({ cover_url: url }).eq("id", trip.id);
        if (updateError) throw new Error(updateError.message);
      }

      // Reset the form and reload the trips list.
      setTitle("");
      setSlug("");
      setSlugTouched(false);
      setCover(null);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="font-serif text-xl">New trip</h2>

      <div>
        <label htmlFor="trip-title" className="label">Title</label>
        <input
          id="trip-title"
          required
          className="input"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Summer in Lisbon"
        />
      </div>

      <div>
        <label htmlFor="trip-slug" className="label">Slug (the link: /t/your-slug)</label>
        <input
          id="trip-slug"
          required
          className="input"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          placeholder="summer-in-lisbon"
        />
      </div>

      <div>
        <label htmlFor="trip-cover" className="label">Cover image</label>
        <input
          id="trip-cover"
          type="file"
          accept="image/*"
          className="text-sm"
          onChange={(e) => setCover(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button type="submit" disabled={saving} className="btn">
        {saving ? "Creating..." : "Create trip"}
      </button>
    </form>
  );
}
