import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Photo, Post, PostcardSummary, Trip } from "@/lib/types";
import PhotosTab from "@/components/admin/PhotosTab";
import BlogTab from "@/components/admin/BlogTab";
import PostcardsTab from "@/components/admin/PostcardsTab";

const TABS = [
  { key: "photos", label: "Photos" },
  { key: "blog", label: "Blog" },
  { key: "postcards", label: "Postcards" },
] as const;

// /admin/trips/[id]?tab=photos|blog|postcards
// The active tab lives in the URL so it survives refreshes and can be linked to.
export default async function TripAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam! : "photos";

  const supabase = await createClient();

  const { data: trip } = await supabase.from("trips").select("*").eq("id", id).maybeSingle<Trip>();
  if (!trip) notFound();

  // Only fetch what the active tab needs.
  let photos: Photo[] = [];
  let posts: Post[] = [];
  let postcards: PostcardSummary[] = [];

  if (tab === "photos") {
    const res = await supabase.from("photos").select("*").eq("trip_id", id).order("created_at", { ascending: false });
    photos = (res.data ?? []) as Photo[];
  } else if (tab === "blog") {
    const res = await supabase.from("posts").select("*").eq("trip_id", id).order("created_at", { ascending: false });
    posts = (res.data ?? []) as Post[];
  } else {
    const res = await supabase
      .from("postcards")
      .select("id, trip_id, recipient_name, created_at")
      .eq("trip_id", id)
      .order("created_at", { ascending: false });
    postcards = (res.data ?? []) as PostcardSummary[];
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-muted hover:text-accent">&larr; All trips</Link>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-2xl">{trip.title}</h1>
        <Link href={`/t/${trip.slug}`} target="_blank" className="text-sm text-accent hover:underline">
          View public page (/t/{trip.slug})
        </Link>
      </div>

      <nav className="mt-5 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/trips/${id}?tab=${t.key}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "photos" && <PhotosTab tripId={id} photos={photos} />}
        {tab === "blog" && <BlogTab tripId={id} posts={posts} />}
        {tab === "postcards" && <PostcardsTab tripId={id} postcards={postcards} />}
      </div>
    </div>
  );
}
