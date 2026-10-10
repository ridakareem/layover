import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Shared shell for every admin page except /admin/login:
// a top bar with a link home and a Sign out button.
// (The folder name "(panel)" is a route group; it doesn't appear in the URL.)

// Server Action: ends the session, then sends the admin to the login page.
async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // Middleware already blocks signed-out visitors; this just gets the email to show.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="font-serif text-lg">
            Souvenir admin
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{user?.email}</span>
            <form action={signOut}>
              <button type="submit" className="btn-ghost">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
