import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Photo } from "@/lib/types";
import PostcardEditor from "@/components/postcard/PostcardEditor";

// /admin/trips/[id]/postcards/new : the postcard editor with a blank card.
export default async function NewPostcardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: trip } = await supabase.from("trips").select("id").eq("id", id).maybeSingle();
  if (!trip) notFound();

  // The trip's gallery, so a front photo can be picked from it.
  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .eq("trip_id", id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-4 font-serif text-2xl">New postcard</h1>
      <PostcardEditor tripId={id} photos={(photos ?? []) as Photo[]} initial={null} postcardId={null} />
    </div>
  );
}
