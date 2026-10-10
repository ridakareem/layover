"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Text, Image as KonvaImage, Transformer } from "react-konva";
import type Konva from "konva";
import {
  ASPECT,
  FONT_FALLBACKS,
  FONT_VARS,
  type FontKey,
  type ImageItem,
  type PostcardData,
  type TextBlock,
} from "@/lib/postcard";

// ONE component draws a postcard side. The editor and the public viewer both use it,
// so what the admin designs is exactly what the recipient sees.
// It uses the browser canvas, so always import it with next/dynamic and ssr: false.
//
// All positions in `data` are fractions (0-1) of the canvas; here we multiply them
// by the real pixel width/height, which follows the width of the parent element.
//
// readOnly (viewer): nothing reacts to touches or the mouse.
// editable (editor): pass onChange. Then stamps, the back photo and text blocks can be
// selected, dragged, resized, rotated, and text can be edited by double-click / double-tap.

export type PostcardPatch = Partial<Pick<PostcardData, "stamps" | "text_blocks">>;

type Props = {
  data: PostcardData;
  side: "front" | "back";
  readOnly?: boolean;
  stageRef?: React.RefObject<Konva.Stage | null>; // lets the editor call toDataURL() for "Download PNG"
  selectedId?: string | null; // id of the selected stamp / photo / text block
  onSelect?: (id: string | null) => void;
  onChange?: (patch: PostcardPatch) => void;
};

const INK = "#2a2118";
const RULE = "#c9bda9";
const ACCENT = "#c4572f";

// ---------- helpers ----------

// Loads an image for Konva. crossOrigin lets stage.toDataURL() work later (Download PNG).
function useImage(src?: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    let cancelled = false;
    const el = new window.Image();
    el.crossOrigin = "anonymous";
    el.onload = () => !cancelled && setImg(el);
    el.onerror = () => !cancelled && setImg(null);
    el.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return img;
}

// Crop values so an image fills a box without stretching ("object-fit: cover").
function coverCrop(img: HTMLImageElement, boxW: number, boxH: number) {
  const boxRatio = boxW / boxH;
  const imgRatio = img.width / img.height;
  if (imgRatio > boxRatio) {
    const cropWidth = img.height * boxRatio;
    return { cropX: (img.width - cropWidth) / 2, cropY: 0, cropWidth, cropHeight: img.height };
  }
  const cropHeight = img.width / boxRatio;
  return { cropX: 0, cropY: (img.height - cropHeight) / 2, cropWidth: img.width, cropHeight };
}

// Reads the real font-family name that next/font registered for each font choice.
function resolveFamily(key: FontKey) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(FONT_VARS[key]).trim();
  return value || FONT_FALLBACKS[key];
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// ---------- small pieces ----------

// A picture drawn inside a box: the front photo, the back photo, or a stamp.
function PictureNode(props: {
  src?: string | null;
  cx: number; // center x in pixels
  cy: number; // center y in pixels
  w: number;
  h: number;
  rotation?: number;
  cover?: boolean; // true = fill and crop (photos); false = stretch to the box (stamps)
  editable?: boolean;
  nodeRef?: (node: Konva.Image | null) => void;
  onSelect?: () => void;
  onMove?: (x: number, y: number) => void; // new center, in pixels
  onTransform?: (node: Konva.Image) => void;
  onReady?: () => void; // called once the picture has loaded
}) {
  const { src, cx, cy, w, h, rotation = 0, cover = false, editable = false } = props;
  const img = useImage(src);

  useEffect(() => {
    if (img) props.onReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);

  if (!img) return null;

  return (
    <KonvaImage
      ref={props.nodeRef}
      image={img}
      x={cx}
      y={cy}
      width={w}
      height={h}
      offsetX={w / 2} // rotate and scale around the center
      offsetY={h / 2}
      rotation={rotation}
      listening={editable}
      draggable={editable}
      onMouseDown={props.onSelect}
      onTouchStart={props.onSelect}
      onDragEnd={(e) => props.onMove?.(e.target.x(), e.target.y())}
      onTransformEnd={(e) => props.onTransform?.(e.target as Konva.Image)}
      {...(cover ? coverCrop(img, w, h) : {})}
    />
  );
}

// Textarea laid over the canvas while a text block is being edited.
function InlineTextEditor(props: {
  block: TextBlock;
  W: number;
  H: number;
  family: string;
  onText: (text: string) => void;
  onDone: () => void;
}) {
  const { block, W, H, family } = props;
  const ref = useRef<HTMLTextAreaElement>(null);

  // Focus and select everything when editing starts.
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  // Grow with the text so nothing is hidden.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [block.text, W]);

  return (
    <textarea
      ref={ref}
      value={block.text}
      onChange={(e) => props.onText(e.target.value)}
      onBlur={props.onDone}
      onKeyDown={(e) => e.key === "Escape" && props.onDone()}
      rows={1}
      style={{
        position: "absolute",
        left: block.x * W,
        top: block.y * H,
        width: block.w * W,
        fontSize: block.size * H,
        fontFamily: family,
        color: block.color,
        lineHeight: 1.2,
        transform: `rotate(${block.rotation}deg)`,
        transformOrigin: "top left",
        background: "rgba(255,255,255,0.35)",
        outline: `2px dashed ${ACCENT}`,
        border: "none",
        padding: 0,
        margin: 0,
        resize: "none",
        overflow: "hidden",
      }}
    />
  );
}

// ---------- the renderer ----------

export default function PostcardRenderer({
  data,
  side,
  readOnly = false,
  stageRef,
  selectedId = null,
  onSelect,
  onChange,
}: Props) {
  const editable = !readOnly && !!onChange;

  const wrapRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Record<string, Konva.Node>>({}); // selectable nodes by id
  const [width, setWidth] = useState(0);
  const [fontTick, setFontTick] = useState(0); // bumps when web fonts finish loading
  const [readyTick, setReadyTick] = useState(0); // bumps when a picture finishes loading
  const [editingId, setEditingId] = useState<string | null>(null);

  // Follow the width of the parent so the card fills it. Height keeps the 3:2 shape.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(Math.round(el.clientWidth));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Canvas text needs the fonts loaded first, otherwise it draws in a fallback font.
  // Once they load, fontTick changes and the layer is redrawn.
  useEffect(() => {
    let cancelled = false;
    const families = (Object.keys(FONT_VARS) as FontKey[]).map(resolveFamily);
    Promise.all(families.map((f) => document.fonts.load(`24px ${f}`)))
      .catch(() => {}) // if a font fails, we simply keep the fallback
      .then(() => !cancelled && setFontTick((t) => t + 1));
    return () => {
      cancelled = true;
    };
  }, []);

  const W = width;
  const H = Math.round(width / ASPECT);

  const blocks = data.text_blocks.filter((b) => b.side === side);
  const stamps = side === "back" ? data.stamps : [];
  const selectedBlock = blocks.find((b) => b.id === selectedId);
  const selectedPicture = stamps.find((s) => s.id === selectedId);

  // Attach the resize/rotate handles to the selected node.
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = editable && editingId === null && selectedId ? nodeRefs.current[selectedId] : undefined;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [editable, editingId, selectedId, data, fontTick, readyTick, side, W]);

  // Leave text editing if the selection or side changes.
  useEffect(() => {
    if (editingId && editingId !== selectedId) setEditingId(null);
  }, [selectedId, editingId]);

  // ----- change helpers (positions are converted back to fractions here) -----

  const updateStamp = (id: string, patch: Partial<ImageItem>) =>
    onChange?.({ stamps: data.stamps.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  const updateBlock = (id: string, patch: Partial<TextBlock>) =>
    onChange?.({ text_blocks: data.text_blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) });

  // Remembers each selectable node so the Transformer can find it.
  const register = (id: string) => (node: Konva.Node | null) => {
    if (node) nodeRefs.current[id] = node;
    else delete nodeRefs.current[id];
  };

  // Called when editing a text block ends; an empty block is removed.
  function finishEditing(block: TextBlock) {
    setEditingId(null);
    if (block.text.trim() === "") {
      onChange?.({ text_blocks: data.text_blocks.filter((b) => b.id !== block.id) });
      onSelect?.(null);
    }
  }

  const editingBlock = blocks.find((b) => b.id === editingId);

  return (
    <div ref={wrapRef} className="relative w-full" style={{ aspectRatio: `${ASPECT}` }}>
      {W > 0 && (
        <Stage
          width={W}
          height={H}
          ref={stageRef}
          // Clicking empty canvas clears the selection (static shapes don't listen, so they hit the stage).
          onMouseDown={(e) => e.target === e.target.getStage() && onSelect?.(null)}
          onTouchStart={(e) => e.target === e.target.getStage() && onSelect?.(null)}
        >
          {/* key={fontTick} redraws everything once fonts are ready */}
          <Layer key={fontTick} listening={editable}>
            {side === "front" ? (
              <FrontSide data={data} W={W} H={H} />
            ) : (
              <BackBase data={data} W={W} H={H} font={resolveFamily("hand")} />
            )}

            {/* Back only: stamps and the back photo, in the order they were saved */}
            {stamps.map((item) => (
              <PictureNode
                key={item.id}
                src={item.kind === "photo" ? data.back_image_url : item.src}
                cx={item.x * W}
                cy={item.y * H}
                w={item.w * W}
                h={item.h * H}
                rotation={item.rotation}
                cover={item.kind === "photo"}
                editable={editable}
                nodeRef={register(item.id)}
                onReady={() => setReadyTick((t) => t + 1)}
                onSelect={() => onSelect?.(item.id)}
                onMove={(x, y) => updateStamp(item.id, { x: clamp(x / W, 0, 1), y: clamp(y / H, 0, 1) })}
                onTransform={(node) => {
                  // Konva resizes by scaling. Convert the scale into a new w/h and reset it.
                  const sx = node.scaleX();
                  const sy = node.scaleY();
                  node.scaleX(1);
                  node.scaleY(1);
                  updateStamp(item.id, {
                    x: node.x() / W,
                    y: node.y() / H,
                    w: Math.max(0.03, (node.width() * sx) / W),
                    h: Math.max(0.03, (node.height() * sy) / H),
                    rotation: node.rotation(),
                  });
                }}
              />
            ))}

            {/* Free text blocks for this side */}
            {blocks.map((block) => (
              <Text
                key={block.id}
                ref={register(block.id)}
                x={block.x * W}
                y={block.y * H}
                width={block.w * W}
                text={block.text}
                fontSize={block.size * H}
                fontFamily={resolveFamily(block.fontKey)}
                fill={block.color}
                rotation={block.rotation}
                lineHeight={1.2}
                visible={block.id !== editingId} // hidden while the textarea is shown
                listening={editable}
                draggable={editable}
                onMouseDown={() => onSelect?.(block.id)}
                onTouchStart={() => onSelect?.(block.id)}
                onDblClick={() => setEditingId(block.id)}
                onDblTap={() => setEditingId(block.id)}
                onDragEnd={(e) =>
                  updateBlock(block.id, { x: clamp(e.target.x() / W, 0, 0.98), y: clamp(e.target.y() / H, 0, 0.98) })
                }
                onTransformEnd={(e) => {
                  // Side handles change the wrap width; text size is set in the sidebar.
                  const node = e.target as Konva.Text;
                  const sx = node.scaleX();
                  node.scaleX(1);
                  node.scaleY(1);
                  updateBlock(block.id, {
                    x: node.x() / W,
                    y: node.y() / H,
                    w: Math.max(0.05, (node.width() * sx) / W),
                    rotation: node.rotation(),
                  });
                }}
              />
            ))}

            {/* Resize / rotate handles for the selected item (editor only) */}
            {editable && (
              <Transformer
                ref={trRef}
                rotateEnabled
                keepRatio={!selectedBlock}
                enabledAnchors={
                  selectedBlock
                    ? ["middle-left", "middle-right"]
                    : selectedPicture
                      ? ["top-left", "top-right", "bottom-left", "bottom-right"]
                      : []
                }
                anchorSize={14} // big enough for fingers
                borderStroke={ACCENT}
                anchorStroke={ACCENT}
                anchorFill="#ffffff"
                boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 20 ? oldBox : newBox)}
              />
            )}
          </Layer>
        </Stage>
      )}

      {/* Inline text editing */}
      {editable && editingBlock && W > 0 && (
        <InlineTextEditor
          block={editingBlock}
          W={W}
          H={H}
          family={resolveFamily(editingBlock.fontKey)}
          onText={(text) => updateBlock(editingBlock.id, { text })}
          onDone={() => finishEditing(editingBlock)}
        />
      )}
    </div>
  );
}

// ---------- front ----------

function FrontSide({ data, W, H }: { data: PostcardData; W: number; H: number }) {
  return (
    <>
      <Rect width={W} height={H} fill="#e9dfce" listening={false} />
      <PictureNode src={data.front_image_url} cx={W / 2} cy={H / 2} w={W} h={H} cover />
      {!data.front_image_url && (
        <Text
          width={W}
          height={H}
          align="center"
          verticalAlign="middle"
          text="No front photo yet"
          fontSize={H * 0.06}
          fill="#7a6c5d"
          listening={false}
        />
      )}
    </>
  );
}

// ---------- back (the fixed layout; stamps and text blocks are drawn on top) ----------
// Nothing here listens to touches, so taps on it reach the stage and clear the selection.

function BackBase({ data, W, H, font }: { data: PostcardData; W: number; H: number; font: string }) {
  // Heights (as a fraction of the card) of the lines in the address area.
  const rules = [0.43, 0.535, 0.635, 0.735];

  return (
    <>
      {/* Paper */}
      <Rect width={W} height={H} fill="#fffdf7" listening={false} />

      {/* Divider between message and address */}
      <Line points={[W * 0.5, H * 0.1, W * 0.5, H * 0.9]} stroke={RULE} strokeWidth={1} listening={false} />

      {/* Stamp corner (empty frame; stamps are placed on top of it) */}
      <Rect
        x={W * 0.78}
        y={H * 0.07}
        width={W * 0.16}
        height={H * 0.26}
        stroke={RULE}
        strokeWidth={1}
        dash={[6, 4]}
        listening={false}
      />

      {/* Message, left side */}
      {data.message && (
        <Text
          x={W * 0.05}
          y={H * 0.1}
          width={W * 0.4}
          height={H * 0.68}
          text={data.message}
          fontSize={H * 0.052}
          fontFamily={font}
          fill={INK}
          lineHeight={1.35}
          ellipsis
          listening={false}
        />
      )}
      {data.sender_name && (
        <Text
          x={W * 0.05}
          y={H * 0.84}
          width={W * 0.4}
          text={`- ${data.sender_name}`}
          fontSize={H * 0.055}
          fontFamily={font}
          fill="#5b4a3a"
          listening={false}
        />
      )}

      {/* Address area, right side */}
      {rules.map((y) => (
        <Line key={y} points={[W * 0.56, H * y, W * 0.93, H * y]} stroke={RULE} strokeWidth={1} listening={false} />
      ))}
      {data.recipient_name && (
        <Text
          x={W * 0.56}
          y={H * 0.36}
          width={W * 0.37}
          text={data.recipient_name}
          fontSize={H * 0.06}
          fontFamily={font}
          fill={INK}
          wrap="none"
          ellipsis
          listening={false}
        />
      )}
      {data.recipient_address && (
        <Text
          x={W * 0.56}
          y={H * 0.47}
          width={W * 0.37}
          height={H * 0.3}
          text={data.recipient_address}
          fontSize={H * 0.05}
          fontFamily={font}
          fill={INK}
          lineHeight={2}
          ellipsis
          listening={false}
        />
      )}
    </>
  );
}
