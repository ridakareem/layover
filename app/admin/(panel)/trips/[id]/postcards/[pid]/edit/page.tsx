import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toPostcardData } from "@/lib/postcard";
import type { Photo } from "@/lib/types";
import PostcardEditor from "@/components/postcard/PostcardEditor";

// /admin/trips/[id]/postcards/[pid]/edit : the postcard editor with an existing card.
export default async function EditPostcardPage({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id, pid } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase.from("postcards").select("*").eq("id", pid).eq("trip_id", id).maybeSingle();
  if (!row) notFound();

  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .eq("trip_id", id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-4 font-serif text-2xl">Edit postcard</h1>
      <PostcardEditor tripId={id} photos={(photos ?? []) as Photo[]} initial={toPostcardData(row)} postcardId={pid} />
    </div>
  );
}
