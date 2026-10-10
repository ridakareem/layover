// Shown when no postcard matches the id in the link.
export default function PostcardNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl">Postcard not found</h1>
      <p className="mt-3 text-muted">This link doesn&apos;t match any postcard. Please check it and try again.</p>
    </main>
  );
}
