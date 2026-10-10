"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Post } from "@/lib/types";

// Blog tab: list posts, create a new one, edit or delete existing ones.
export default function BlogTab({ tripId, posts }: { tripId: string; posts: Post[] }) {
  const router = useRouter();
  // null = form closed, "new" = creating, otherwise the post being edited
  const [editing, setEditing] = useState<Post | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openForm(post: Post | "new") {
    setEditing(post);
    setTitle(post === "new" ? "" : post.title);
    setBody(post === "new" ? "" : post.body);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const fields = { title: title.trim(), body };
    const { error } =
      editing === "new"
        ? await supabase.from("posts").insert({ ...fields, trip_id: tripId })
        : await supabase.from("posts").update(fields).eq("id", (editing as Post).id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(post: Post) {
    if (!confirm(`Delete "${post.title}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) alert(error.message);
    else router.refresh();
  }

  return (
    <div className="space-y-4">
      {editing === null && (
        <button onClick={() => openForm("new")} className="btn">New post</button>
      )}

      {editing !== null && (
        <form onSubmit={handleSave} className="card space-y-4">
          <h2 className="font-serif text-xl">{editing === "new" ? "New post" : "Edit post"}</h2>
          <div>
            <label htmlFor="post-title" className="label">Title</label>
            <input id="post-title" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label htmlFor="post-body" className="label">Story</label>
            <textarea
              id="post-body"
              required
              rows={10}
              className="input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn">{saving ? "Saving..." : "Save post"}</button>
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {posts.length === 0 && editing === null && <p className="text-muted">No posts yet.</p>}

      <ul className="space-y-3">
        {posts.map((post) => (
          <li key={post.id} className="card flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-medium">{post.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{post.body}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => openForm(post)} className="btn-ghost">Edit</button>
              <button onClick={() => handleDelete(post)} className="btn-ghost text-danger">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
