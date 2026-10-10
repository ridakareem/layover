// Shown when no trip matches the slug in the link.
export default function TripNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl">Trip not found</h1>
      <p className="mt-3 text-muted">This link doesn&apos;t match any trip. Try tapping the tag again.</p>
    </main>
  );
}
