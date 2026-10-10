"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadFile, deleteFilesByUrl } from "@/lib/storage";
import type { Photo } from "@/lib/types";

// Photos tab: upload one or many photos, edit captions, delete.
export default function PhotosTab({ tripId, photos }: { tripId: string; photos: Photo[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      // One at a time keeps things simple and avoids hammering the connection on mobile.
      for (const file of files) {
        const url = await uploadFile(file, `trips/${tripId}/photos`);
        const { error } = await supabase.from("photos").insert({ trip_id: tripId, url });
        if (error) throw new Error(error.message);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = ""; // allow re-selecting the same files
    }
  }

  // Saves the caption when the admin leaves the field (only if it changed).
  async function saveCaption(photo: Photo, caption: string) {
    if (caption === (photo.caption ?? "")) return;
    const supabase = createClient();
    const { error } = await supabase.from("photos").update({ caption }).eq("id", photo.id);
    if (error) setError(error.message);
    else router.refresh();
  }

  async function handleDelete(photo: Photo) {
    if (!confirm("Delete this photo?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("photos").delete().eq("id", photo.id);
    if (error) {
      setError(error.message);
      return;
    }
    await deleteFilesByUrl([photo.url]);
    router.refresh();
  }

  return (
    <div>
      <div className="card flex flex-wrap items-center gap-3">
        <label className="btn cursor-pointer">
          {uploading ? "Uploading..." : "Upload photos"}
          <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={handleUpload} />
        </label>
        <span className="text-sm text-muted">{photos.length} photo{photos.length === 1 ? "" : "s"}</span>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => (
          <li key={photo.id} className="card !p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={photo.caption ?? ""} className="aspect-square w-full rounded-lg object-cover" />
            <input
              className="input mt-2"
              placeholder="Add a caption"
              defaultValue={photo.caption ?? ""}
              onBlur={(e) => saveCaption(photo, e.target.value)}
            />
            <button onClick={() => handleDelete(photo)} className="mt-2 text-sm text-danger hover:underline">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
