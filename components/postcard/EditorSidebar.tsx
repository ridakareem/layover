"use client";

import { useState } from "react";
import { FONT_LABELS, type FontKey, type PostcardData, type TextBlock } from "@/lib/postcard";
import type { Photo } from "@/lib/types";

// Tools panel for the postcard editor.
// Desktop: a column on the right. Phone: a bottom sheet that opens and closes.

type Props = {
  side: "front" | "back";
  data: PostcardData;
  photos: Photo[]; // the trip's gallery, for picking the front photo
  selectedBlock: TextBlock | null; // the selected text block, if any
  hasSelection: boolean; // anything selected (text, stamp or back photo)
  onFrontFile: (file: File) => void;
  onPickFront: (url: string) => void;
  onBackFile: (file: File) => void;
  onRemoveBack: () => void;
  onAddText: () => void;
  onUpdateBlock: (id: string, patch: Partial<TextBlock>) => void;
  onDeleteSelected: () => void;
};

export default function EditorSidebar(props: Props) {
  const { side, data, photos, selectedBlock } = props;
  const [open, setOpen] = useState(false); // phone bottom sheet

  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-line bg-card shadow-[0_-4px_20px_rgba(0,0,0,0.12)] md:static md:z-auto md:self-start md:rounded-[var(--radius-card)] md:border md:shadow-sm">
      {/* Phone only: handle that opens and closes the sheet */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium md:hidden"
        aria-expanded={open}
      >
        <span>Tools ({side})</span>
        <span aria-hidden>{open ? "▾" : "▴"}</span>
      </button>

      <div className={`${open ? "block" : "hidden"} max-h-[50vh] space-y-6 overflow-y-auto p-4 pt-1 md:block md:max-h-none md:pt-4`}>
        {/* ---------- FRONT: photo ---------- */}
        {side === "front" && (
          <section>
            <h3 className="mb-2 font-serif text-lg">Front photo</h3>
            <label className="btn-ghost w-full cursor-pointer">
              Upload a photo
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) props.onFrontFile(file);
                  e.target.value = "";
                }}
              />
            </label>

            <p className="mb-2 mt-4 text-sm text-muted">Or pick one from this trip&apos;s gallery:</p>
            {photos.length === 0 ? (
              <p className="text-sm text-muted">No photos in the gallery yet.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <li key={photo.id}>
                    <button
                      type="button"
                      onClick={() => props.onPickFront(photo.url)}
                      className={`block aspect-square w-full overflow-hidden rounded-md border-2 ${
                        data.front_image_url === photo.url ? "border-accent" : "border-transparent"
                      }`}
                      aria-label="Use this photo on the front"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.caption ?? ""} className="h-full w-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ---------- BACK: optional photo ---------- */}
        {side === "back" && (
          <section>
            <h3 className="mb-2 font-serif text-lg">Back photo (optional)</h3>
            <div className="flex gap-2">
              <label className="btn-ghost flex-1 cursor-pointer">
                {data.back_image_url ? "Replace" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) props.onBackFile(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {data.back_image_url && (
                <button type="button" onClick={props.onRemoveBack} className="btn-ghost text-danger">
                  Remove
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">Tap the photo on the card to move or resize it.</p>
          </section>
        )}

        {/* ---------- TEXT (both sides) ---------- */}
        <section>
          <h3 className="mb-2 font-serif text-lg">Text</h3>
          <button type="button" onClick={props.onAddText} className="btn w-full">
            Add text
          </button>
          <p className="mt-2 text-xs text-muted">Double-click or double-tap text on the card to edit it. Drag to move.</p>

          {selectedBlock && (
            <div className="mt-4 space-y-3 rounded-lg border border-line p-3">
              <div>
                <label className="label" htmlFor="tb-text">Text</label>
                <textarea
                  id="tb-text"
                  rows={3}
                  className="input"
                  value={selectedBlock.text}
                  onChange={(e) => props.onUpdateBlock(selectedBlock.id, { text: e.target.value })}
                />
              </div>

              <div>
                <label className="label" htmlFor="tb-font">Font</label>
                <select
                  id="tb-font"
                  className="input"
                  value={selectedBlock.fontKey}
                  onChange={(e) => props.onUpdateBlock(selectedBlock.id, { fontKey: e.target.value as FontKey })}
                >
                  {(Object.keys(FONT_LABELS) as FontKey[]).map((key) => (
                    <option key={key} value={key}>{FONT_LABELS[key]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="tb-size">Size</label>
                <input
                  id="tb-size"
                  type="range"
                  min={0.03}
                  max={0.2}
                  step={0.005}
                  className="w-full"
                  value={selectedBlock.size}
                  onChange={(e) => props.onUpdateBlock(selectedBlock.id, { size: Number(e.target.value) })}
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="label !mb-0" htmlFor="tb-color">Color</label>
                <input
                  id="tb-color"
                  type="color"
                  className="h-9 w-14 cursor-pointer rounded border border-line bg-card"
                  value={selectedBlock.color}
                  onChange={(e) => props.onUpdateBlock(selectedBlock.id, { color: e.target.value })}
                />
              </div>
            </div>
          )}
        </section>

        {/* ---------- Delete whatever is selected ---------- */}
        {props.hasSelection && (
          <button type="button" onClick={props.onDeleteSelected} className="btn-ghost w-full text-danger">
            Delete selected
          </button>
        )}
      </div>
    </aside>
  );
}
