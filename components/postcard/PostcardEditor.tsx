"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ASPECT, type ImageItem, type PostcardData, type TextBlock } from "@/lib/postcard";
import { randomId } from "@/lib/storage";
import type { Photo } from "@/lib/types";
import type { PostcardPatch } from "@/components/postcard/PostcardRenderer";
import EditorSidebar from "@/components/postcard/EditorSidebar";

// The canvas only exists in the browser, so the renderer is loaded with ssr: false.
const PostcardRenderer = dynamic(() => import("@/components/postcard/PostcardRenderer"), {
  ssr: false,
  loading: () => <div className="aspect-[3/2] w-full animate-pulse bg-line" />,
});

const EMPTY: PostcardData = {
  recipient_name: "",
  recipient_address: "",
  sender_name: "",
  message: "",
  front_image_url: null,
  back_image_url: null,
  stamps: [],
  text_blocks: [],
};

// Width/height of an image, used to give new pictures the right shape.
function imageRatio(src: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1);
    img.onerror = () => resolve(1);
    img.src = src;
  });
}

// Frees the memory of a temporary preview URL (made with URL.createObjectURL).
const revoke = (url: string | null) => url?.startsWith("blob:") && URL.revokeObjectURL(url);

type Props = {
  tripId: string;
  photos: Photo[]; // the trip's gallery
  initial: PostcardData | null; // null = a brand-new postcard
  postcardId: string | null; // set when editing a saved postcard (used by Save in Step 6)
};

export default function PostcardEditor({ tripId, photos, initial }: Props) {
  const [data, setData] = useState<PostcardData>(initial ?? EMPTY);
  const [side, setSide] = useState<"front" | "back">("front");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Photos chosen from the device are shown right away with a temporary preview URL.
  // The files themselves are kept here and uploaded when the postcard is saved.
  const [pendingFront, setPendingFront] = useState<File | null>(null);
  const [pendingBack, setPendingBack] = useState<File | null>(null);

  // Free the temporary preview URLs when leaving the page.
  const dataRef = useRef(data);
  dataRef.current = data;
  useEffect(() => {
    return () => {
      revoke(dataRef.current.front_image_url);
      revoke(dataRef.current.back_image_url);
    };
  }, []);

  const selectedBlock = data.text_blocks.find((b) => b.id === selectedId) ?? null;
  const selectedStamp = data.stamps.find((s) => s.id === selectedId) ?? null;

  // ----- small update helpers -----

  const patchData = (patch: Partial<PostcardData>) => setData((d) => ({ ...d, ...patch }));
  const onCanvasChange = (patch: PostcardPatch) => patchData(patch);

  const updateBlock = (id: string, patch: Partial<TextBlock>) =>
    setData((d) => ({ ...d, text_blocks: d.text_blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));

  // ----- front photo -----

  function setFrontFile(file: File) {
    revoke(data.front_image_url);
    setPendingFront(file);
    patchData({ front_image_url: URL.createObjectURL(file) });
  }

  function pickFront(url: string) {
    revoke(data.front_image_url);
    setPendingFront(null);
    patchData({ front_image_url: url });
  }

  // ----- back photo (stored as a "photo" item in `stamps`, see lib/postcard.ts) -----

  async function setBackFile(file: File) {
    revoke(data.back_image_url);
    const url = URL.createObjectURL(file);
    setPendingBack(file);

    const ratio = await imageRatio(url);
    const hasPhoto = dataRef.current.stamps.some((s) => s.kind === "photo");

    // Replacing an existing back photo keeps the place and size it already has.
    if (hasPhoto) {
      patchData({ back_image_url: url });
      return;
    }

    // New back photo: 20% of the card width, in the shape of the picture (max half the height).
    let w = 0.2;
    let h = (w * ASPECT) / ratio;
    if (h > 0.5) {
      h = 0.5;
      w = (h * ratio) / ASPECT;
    }
    const photo: ImageItem = { id: randomId(), kind: "photo", x: 0.17, y: 0.66, w, h, rotation: 0 };
    setData((d) => ({ ...d, back_image_url: url, stamps: [...d.stamps, photo] }));
    setSelectedId(photo.id);
  }

  function removeBackPhoto() {
    revoke(data.back_image_url);
    setPendingBack(null);
    setSelectedId(null);
    setData((d) => ({ ...d, back_image_url: null, stamps: d.stamps.filter((s) => s.kind !== "photo") }));
  }

  // ----- text blocks -----

  function addText() {
    const block: TextBlock = {
      id: randomId(),
      side,
      text: "Your text",
      x: 0.1,
      y: 0.1,
      w: 0.4,
      size: 0.07,
      fontKey: "hand",
      color: side === "front" ? "#ffffff" : "#2a2118",
      rotation: 0,
    };
    setData((d) => ({ ...d, text_blocks: [...d.text_blocks, block] }));
    setSelectedId(block.id);
  }

  // ----- delete the selected item -----

  function deleteSelected() {
    if (!selectedId) return;
    if (selectedStamp?.kind === "photo") {
      removeBackPhoto();
      return;
    }
    setData((d) => ({
      ...d,
      stamps: d.stamps.filter((s) => s.id !== selectedId),
      text_blocks: d.text_blocks.filter((b) => b.id !== selectedId),
    }));
    setSelectedId(null);
  }

  // Delete / Backspace removes the selected item (but not while typing in a field).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return;
      e.preventDefault();
      deleteSelected();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Switching sides clears the selection.
  function switchSide(next: "front" | "back") {
    setSide(next);
    setSelectedId(null);
  }

  return (
    <div className="pb-20 md:pb-0">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/trips/${tripId}?tab=postcards`} className="text-sm text-muted hover:text-accent">
          &larr; Postcards
        </Link>

        <div role="tablist" aria-label="Postcard side" className="inline-flex rounded-lg border border-line bg-card p-1">
          {(["front", "back"] as const).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={side === s}
              onClick={() => switchSide(s)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize ${
                side === s ? "bg-accent text-white" : "text-muted hover:text-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_300px]">
        {/* Canvas + details */}
        <div className="min-w-0 space-y-6">
          <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl shadow-xl">
            <PostcardRenderer
              data={data}
              side={side}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={onCanvasChange}
            />
          </div>

          <section className="card mx-auto max-w-2xl space-y-4">
            <h2 className="font-serif text-xl">Postcard details</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="pc-recipient">Recipient name</label>
                <input
                  id="pc-recipient"
                  className="input"
                  value={data.recipient_name ?? ""}
                  onChange={(e) => patchData({ recipient_name: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="pc-sender">Sender name</label>
                <input
                  id="pc-sender"
                  className="input"
                  value={data.sender_name ?? ""}
                  onChange={(e) => patchData({ sender_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="pc-address">Recipient address</label>
              <textarea
                id="pc-address"
                rows={3}
                className="input"
                value={data.recipient_address ?? ""}
                onChange={(e) => patchData({ recipient_address: e.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="pc-message">Message</label>
              <textarea
                id="pc-message"
                rows={5}
                className="input"
                value={data.message ?? ""}
                onChange={(e) => patchData({ message: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted">These show on the back of the card. Switch to Back to see them.</p>
            </div>
          </section>
        </div>

        <EditorSidebar
          side={side}
          data={data}
          photos={photos}
          selectedBlock={selectedBlock}
          hasSelection={!!selectedId}
          onFrontFile={setFrontFile}
          onPickFront={pickFront}
          onBackFile={setBackFile}
          onRemoveBack={removeBackPhoto}
          onAddText={addText}
          onUpdateBlock={updateBlock}
          onDeleteSelected={deleteSelected}
        />
      </div>
    </div>
  );
}
