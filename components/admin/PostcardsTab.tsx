import Link from "next/link";
import type { PostcardSummary } from "@/lib/types";
import CopyLinkButton from "@/components/admin/CopyLinkButton";

// Postcards tab: list of this trip's postcards with Copy Link and Edit.
// The editor pages themselves are built in Steps 5 and 6, so the
// "New postcard" / "Edit" links lead to a 404 until then.
export default function PostcardsTab({ tripId, postcards }: { tripId: string; postcards: PostcardSummary[] }) {
  return (
    <div className="space-y-4">
      <Link href={`/admin/trips/${tripId}/postcards/new`} className="btn">New postcard</Link>

      {postcards.length === 0 && <p className="text-muted">No postcards yet.</p>}

      <ul className="space-y-3">
        {postcards.map((card) => (
          <li key={card.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">To: {card.recipient_name || "(no recipient)"}</p>
              <p className="text-sm text-muted">{new Date(card.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/trips/${tripId}/postcards/${card.id}/edit`} className="btn-ghost">Edit</Link>
              <CopyLinkButton path={`/p/${card.id}`} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
