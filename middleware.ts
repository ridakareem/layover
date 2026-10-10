import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  return updateSession(request);
}

// Only run on admin pages. Public pages (/t/..., /p/...) stay open to everyone.
export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
