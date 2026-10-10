"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type Konva from "konva";
import { ASPECT, type ImageItem, type PostcardData, type TextBlock } from "@/lib/postcard";
import { createClient } from "@/lib/supabase/client";
import { randomId, uploadFile } from "@/lib/storage";
import STAMPS from "@/lib/stamps.json"; // list of files in /public/stamps (made by scripts/stamps-manifest.mjs)
import type { Photo } from "@/lib/types";
import type { PostcardPatch } from "@/components/postcard/PostcardRenderer";
import EditorSidebar from "@/components/postcard/EditorSidebar";
import CopyLinkButton from "@/components/admin/CopyLinkButton";

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
  postcardId: string | null; // set when editing a saved postcard
};

export default function PostcardEditor({ tripId, photos, initial, postcardId }: Props) {
  const router = useRouter();
  const [data, setData] = useState<PostcardData>(initial ?? EMPTY);
  const [side, setSide] = useState<"front" | "back">("front");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Saving
  const [savedId, setSavedId] = useState<string | null>(postcardId); // becomes set after the first save
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedSnapshot = useRef(JSON.stringify(initial ?? EMPTY)); // what was last saved, to detect unsaved changes
  const stageRef = useRef<Konva.Stage | null>(null); // the canvas, for "Download PNG"
  const canvasRef = useRef<HTMLDivElement>(null); // used to turn a drop position into 0-1 fractions

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
  const dirty = JSON.stringify(data) !== savedSnapshot.current;

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

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

  // ----- stamps -----

  // Adds a stamp. `at` is a drop position (0-1); without it (tap-to-add) the stamp
  // goes to the stamp corner, nudged a little for each stamp already there.
  async function addStamp(src: string, at?: { x: number; y: number }) {
    const ratio = await imageRatio(src);
    const count = dataRef.current.stamps.filter((s) => s.kind === "stamp").length;
    const w = 0.13;
    const stamp: ImageItem = {
      id: randomId(),
      kind: "stamp",
      src,
      x: at?.x ?? Math.min(0.9, 0.86 - (count % 4) * 0.03),
      y: at?.y ?? 0.2 + (count % 4) * 0.03,
      w,
      h: (w * ASPECT) / ratio, // keep the stamp's own shape
      rotation: 0,
    };
    setSide("back"); // stamps live on the back
    setData((d) => ({ ...d, stamps: [...d.stamps, stamp] }));
    setSelectedId(stamp.id);
  }

  // Drag and drop from the stamp picker onto the canvas.
  function onDragOver(e: React.DragEvent) {
    if (side === "back" && e.dataTransfer.types.includes("application/x-stamp")) e.preventDefault();
  }
  function onDrop(e: React.DragEvent) {
    const src = e.dataTransfer.getData("application/x-stamp");
    const box = canvasRef.current?.getBoundingClientRect();
    if (!src || !box) return;
    e.preventDefault();
    addStamp(src, {
      x: Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)),
    });
  }

  // ----- save -----

  // 1) upload any new photos to Storage, 2) insert or update the postcards row.
  async function save() {
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      let front = data.front_image_url;
      let back = data.back_image_url;

      if (pendingFront) front = await uploadFile(pendingFront, `trips/${tripId}/postcards`);
      if (pendingBack) back = await uploadFile(pendingBack, `trips/${tripId}/postcards`);

      // A temporary preview URL must never reach the database.
      if (front?.startsWith("blob:")) front = null;
      if (back?.startsWith("blob:")) back = null;

      const row = {
        trip_id: tripId,
        recipient_name: data.recipient_name?.trim() || null,
        recipient_address: data.recipient_address?.trim() || null,
        sender_name: data.sender_name?.trim() || null,
        message: data.message?.trim() || null,
        front_image_url: front,
        back_image_url: back,
        stamps: data.stamps,
        text_blocks: data.text_blocks,
      };

      let id = savedId;
      if (id) {
        const { error } = await supabase.from("postcards").update(row).eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const { data: created, error } = await supabase.from("postcards").insert(row).select("id").single();
        if (error) throw new Error(error.message);
        id = created.id as string;
      }

      // Swap the temporary previews for the real uploaded URLs.
      revoke(data.front_image_url);
      revoke(data.back_image_url);
      const next = { ...data, front_image_url: front, back_image_url: back };
      savedSnapshot.current = JSON.stringify(next);
      setData(next);
      setPendingFront(null);
      setPendingBack(null);
      setSavedId(id);
      router.refresh(); // so the Postcards tab list is up to date
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the postcard.");
    } finally {
      setSaving(false);
    }
  }

  // ----- download the current side as a PNG -----

  async function downloadPng() {
    setError(null);
    setSelectedId(null); // so the resize handles are not in the picture
    await new Promise((resolve) => setTimeout(resolve, 120)); // let the canvas redraw

    const stage = stageRef.current;
    if (!stage) return;

    try {
      const url = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
      const link = document.createElement("a");
      link.href = url;
      link.download = `postcard-${side}.png`;
      link.click();
    } catch {
      // Happens when a picture comes from a server that doesn't allow canvas export.
      setError("Could not export the image. A picture on the card blocks it (CORS). Try re-uploading that photo.");
    }
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

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={downloadPng} className="btn-ghost">Download PNG ({side})</button>
          <button onClick={save} disabled={saving || (!dirty && !!savedId)} className="btn">
            {saving ? "Saving..." : savedId ? (dirty ? "Save changes" : "Saved") : "Save postcard"}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {/* After the first save: the public link to send to the recipient */}
      {savedId && (
        <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 !p-3">
          <p className="text-sm text-muted">
            Link for the recipient: <span className="font-medium text-ink">/p/{savedId}</span>
          </p>
          <div className="flex gap-2">
            <CopyLinkButton path={`/p/${savedId}`} />
            <Link href={`/p/${savedId}`} target="_blank" className="btn-ghost">Open</Link>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_300px]">
        {/* Canvas + details */}
        <div className="min-w-0 space-y-6">
          <div
            ref={canvasRef}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl shadow-xl"
          >
            <PostcardRenderer
              stageRef={stageRef}
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
          stamps={STAMPS}
          onAddStamp={(src) => addStamp(src)}
          onAddText={addText}
          onUpdateBlock={updateBlock}
          onDeleteSelected={deleteSelected}
        />
      </div>
    </div>
  );
}
