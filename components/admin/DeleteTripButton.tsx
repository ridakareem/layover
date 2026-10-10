"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteFilesByUrl } from "@/lib/storage";

// Deletes a trip, its cover and its photo files.
// (Photos/posts/postcards rows are expected to be removed by your foreign keys' ON DELETE CASCADE.)
export default function DeleteTripButton({ tripId, coverUrl }: { tripId: string; coverUrl: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this trip with all its photos, posts and postcards? This cannot be undone.")) return;
    setBusy(true);

    const supabase = createClient();

    // Collect the files to remove from Storage before the rows disappear.
    const { data: photos } = await supabase.from("photos").select("url").eq("trip_id", tripId);
    const { error } = await supabase.from("trips").delete().eq("id", tripId);

    if (error) {
      alert(error.message);
      setBusy(false);
      return;
    }

    await deleteFilesByUrl([coverUrl, ...(photos ?? []).map((p) => p.url)]);
    router.refresh();
  }

  return (
    <button onClick={handleDelete} disabled={busy} className="btn-ghost text-danger">
      {busy ? "Deleting..." : "Delete"}
    </button>
  );
}
