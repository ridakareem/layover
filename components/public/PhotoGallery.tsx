"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Photo } from "@/lib/types";

// Photo grid with a full-screen lightbox.
// Lightbox controls: arrow buttons, left/right arrow keys, Esc to close,
// and swipe left/right on touch screens.
export default function PhotoGallery({ photos }: { photos: Photo[] }) {
  // Index of the photo currently open, or null when the lightbox is closed.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length)),
    [photos.length]
  );
  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length)),
    [photos.length]
  );

  // While the lightbox is open: listen for keys and stop the page behind it from scrolling.
  useEffect(() => {
    if (openIndex === null) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [openIndex, close, next, prev]);

  if (photos.length === 0) {
    return <p className="text-muted">No photos yet.</p>;
  }

  const current = openIndex === null ? null : photos[openIndex];

  return (
    <>
      {/* Grid: 2 columns on phones, more on wider screens */}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <button
              onClick={() => setOpenIndex(i)}
              className="block aspect-square w-full overflow-hidden rounded-lg bg-line"
              aria-label={photo.caption ? `Open photo: ${photo.caption}` : "Open photo"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption ?? ""}
                loading="lazy"
                className="h-full w-full object-cover transition hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      {/* Lightbox */}
      {current && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={close} // tapping the dark background closes it
          onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(dx) > 50) (dx < 0 ? next : prev)(); // swipe left = next
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white/80">
            <span className="text-sm">{openIndex! + 1} / {photos.length}</span>
            <button
              onClick={close}
              className="rounded-full px-3 py-1 text-2xl leading-none hover:bg-white/10"
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={current.caption ?? ""}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()} // tapping the photo itself keeps it open
            />

            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prev(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-2xl text-white hover:bg-black/70"
                  aria-label="Previous photo"
                >
                  &lsaquo;
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); next(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-2xl text-white hover:bg-black/70"
                  aria-label="Next photo"
                >
                  &rsaquo;
                </button>
              </>
            )}
          </div>

          <p className="min-h-12 px-4 py-3 text-center text-sm text-white/90">{current.caption}</p>
        </div>
      )}
    </>
  );
}
