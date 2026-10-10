import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import NewTripForm from "@/components/admin/NewTripForm";
import DeleteTripButton from "@/components/admin/DeleteTripButton";

// /admin: the admin's trips plus the New Trip form.
export default async function AdminHomePage() {
  const supabase = await createClient();

  // RLS limits this to the admin's own trips; the filter is just explicit.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: trips, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .returns<Trip[]>();

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_340px]">
      <section>
        <h1 className="font-serif text-2xl">Your trips</h1>

        {error && <p className="mt-3 text-sm text-danger">Could not load trips: {error.message}</p>}
        {trips && trips.length === 0 && <p className="mt-3 text-muted">No trips yet. Create your first one.</p>}

        <ul className="mt-4 space-y-3">
          {trips?.map((trip) => (
            <li key={trip.id} className="card flex items-center gap-4 !p-3">
              {trip.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={trip.cover_url} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-16 w-24 shrink-0 rounded-lg bg-paper" />
              )}

              <div className="min-w-0 flex-1">
                <Link href={`/admin/trips/${trip.id}`} className="block truncate font-medium hover:text-accent">
                  {trip.title}
                </Link>
                <p className="truncate text-sm text-muted">/t/{trip.slug}</p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Link href={`/admin/trips/${trip.id}`} className="btn-ghost">Manage</Link>
                <DeleteTripButton tripId={trip.id} coverUrl={trip.cover_url} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <aside>
        <NewTripForm />
      </aside>
    </div>
  );
}
