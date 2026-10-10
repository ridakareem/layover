import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Photo, Post, Trip } from "@/lib/types";
import PhotoGallery from "@/components/public/PhotoGallery";

// Public NFC landing page for a trip. No login needed: it reads with the
// anon key, and your RLS policies decide what visitors are allowed to see.

// cache() lets the page and generateMetadata share one database lookup.
const getTrip = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("trips").select("*").eq("slug", slug).maybeSingle<Trip>();
  return data;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const trip = await getTrip(slug);
  if (!trip) return { title: "Trip not found" };

  return {
    title: trip.title,
    description: `Photos and stories from ${trip.title}`,
    // Cover shows up when the link is shared in chat apps.
    openGraph: { title: trip.title, images: trip.cover_url ? [trip.cover_url] : [] },
  };
}

export default async function TripPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await getTrip(slug);
  if (!trip) notFound();

  const supabase = await createClient();

  // Fetch photos and posts at the same time.
  const [photosRes, postsRes] = await Promise.all([
    supabase.from("photos").select("*").eq("trip_id", trip.id).order("created_at", { ascending: true }),
    supabase.from("posts").select("*").eq("trip_id", trip.id).order("created_at", { ascending: false }),
  ]);
  const photos = (photosRes.data ?? []) as Photo[];
  const posts = (postsRes.data ?? []) as Post[];

  return (
    <main className="pb-16">
      {/* Cover / hero */}
      <header className="relative">
        {trip.cover_url ? (
          <div className="relative h-[55vh] min-h-72 w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={trip.cover_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <h1 className="absolute inset-x-0 bottom-0 mx-auto max-w-3xl px-5 pb-6 font-serif text-4xl text-white sm:text-5xl">
              {trip.title}
            </h1>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-5 pb-2 pt-14">
            <h1 className="font-serif text-4xl sm:text-5xl">{trip.title}</h1>
          </div>
        )}
      </header>

      <div className="mx-auto max-w-3xl space-y-12 px-4 pt-8">
        {/* Photos */}
        <section aria-labelledby="photos-heading">
          <h2 id="photos-heading" className="mb-4 font-serif text-2xl">Photos</h2>
          <PhotoGallery photos={photos} />
        </section>

        {/* Blog posts: each one opens and closes (plain <details>, no JavaScript needed) */}
        <section aria-labelledby="stories-heading">
          <h2 id="stories-heading" className="mb-4 font-serif text-2xl">Stories</h2>

          {posts.length === 0 && <p className="text-muted">No stories yet.</p>}

          <div className="space-y-3">
            {posts.map((post) => (
              <details key={post.id} className="card group">
                <summary className="cursor-pointer list-none">
                  <h3 className="font-serif text-xl group-open:text-accent">{post.title}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {new Date(post.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </summary>
                {/* whitespace-pre-line keeps the paragraph breaks you typed */}
                <p className="mt-4 whitespace-pre-line leading-relaxed">{post.body}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
