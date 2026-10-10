// Row types for the Supabase tables.
// ASSUMPTION: the trips/photos/posts column names below are my best guess,
// because only the postcards columns were listed. If yours differ, change
// them here and in the few places that insert/update rows (all in components/admin).

export type Trip = {
  id: string;
  user_id: string;        // owner (the admin)
  title: string;
  slug: string;
  cover_url: string | null;
  created_at: string;
};

export type Photo = {
  id: string;
  trip_id: string;
  url: string;
  caption: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  trip_id: string;
  title: string;
  body: string;
  created_at: string;
};

// A postcard as shown in the admin list. (Full shape is used from Step 4 on.)
export type PostcardSummary = {
  id: string;
  trip_id: string;
  recipient_name: string | null;
  created_at: string;
};
