import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toPostcardData, type PostcardData } from "@/lib/postcard";
import { SAMPLE_POSTCARD } from "@/lib/postcard-sample";
import PostcardFlip from "@/components/postcard/PostcardFlip";

// Public, read-only postcard viewer. /p/sample shows built-in sample data
// (handy for checking the design); any other id is loaded from the postcards table.

type Loaded = { data: PostcardData; trip: { slug: string; title: string } | null };

async function loadPostcard(id: string): Promise<Loaded | null> {
  if (id === "sample") return { data: SAMPLE_POSTCARD, trip: null };

  const supabase = await createClient();
  const { data: row } = await supabase.from("postcards").select("*").eq("id", id).maybeSingle();
  if (!row) return null; // unknown id (or not a valid uuid)

  // The trip is only needed for the "more from this trip" link.
  const { data: trip } = await supabase
    .from("trips")
    .select("slug, title")
    .eq("id", row.trip_id)
    .maybeSingle<{ slug: string; title: string }>();

  return { data: toPostcardData(row), trip };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const loaded = await loadPostcard(id);
  if (!loaded) return { title: "Postcard not found" };

  const to = loaded.data.recipient_name;
  return { title: to ? `A postcard for ${to}` : "A postcard for you" };
}

export default async function PostcardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadPostcard(id);
  if (!loaded) notFound();

  const { data, trip } = loaded;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-10">
      <PostcardFlip data={data} />

      {trip && (
        <Link href={`/t/${trip.slug}`} className="mt-8 text-accent hover:underline">
          See more from {trip.title} &rarr;
        </Link>
      )}
    </main>
  );
}
