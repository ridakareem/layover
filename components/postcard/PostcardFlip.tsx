"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { PostcardData } from "@/lib/postcard";

// The renderer draws on a canvas, which only exists in the browser,
// so it is loaded on the client only (ssr: false). Until then a grey placeholder shows.
const PostcardRenderer = dynamic(() => import("@/components/postcard/PostcardRenderer"), {
  ssr: false,
  loading: () => <div className="aspect-[3/2] w-full animate-pulse bg-line" />,
});

// Read-only postcard that flips between front and back with a 3D CSS animation.
// Tap or click the card (or press Enter / Space when it is focused) to flip it.
export default function PostcardFlip({ data }: { data: PostcardData }) {
  const [flipped, setFlipped] = useState(false);

  // Both faces share these styles. backface-visibility hides whichever face points away.
  const face: React.CSSProperties = {
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
  };

  return (
    <div className="mx-auto w-full max-w-2xl" style={{ perspective: "1400px" }}>
      <div
        role="button"
        tabIndex={0}
        aria-label={flipped ? "Postcard back. Tap to see the front" : "Postcard front. Tap to see the back"}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
        className="relative aspect-[3/2] w-full cursor-pointer select-none transition-transform duration-700 ease-in-out motion-reduce:duration-0"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front */}
        <div className="absolute inset-0 overflow-hidden rounded-xl shadow-xl" style={face}>
          <PostcardRenderer data={data} side="front" readOnly />
        </div>

        {/* Back: pre-rotated 180deg so it faces forward once the card has flipped */}
        <div
          className="absolute inset-0 overflow-hidden rounded-xl shadow-xl"
          style={{ ...face, transform: "rotateY(180deg)" }}
        >
          <PostcardRenderer data={data} side="back" readOnly />
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-muted">Tap the card to flip it</p>
    </div>
  );
}
