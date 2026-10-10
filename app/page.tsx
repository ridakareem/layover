// Home page. Visitors normally arrive via an NFC tag at /t/[slug],
// so this is just a small landing note.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl">Travel Souvenirs</h1>
      <p className="mt-3 text-muted">Tap an NFC tag from a trip to see its photos and postcards.</p>
    </main>
  );
}
