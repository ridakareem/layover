"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Text, Image as KonvaImage } from "react-konva";
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

type Props = {
  data: PostcardData;
  side: "front" | "back";
  readOnly?: boolean; // true = nothing on the canvas reacts to touches or mouse
  stageRef?: React.RefObject<Konva.Stage | null>; // lets the editor call toDataURL() for "Download PNG"
};

const INK = "#2a2118";
const RULE = "#c9bda9";

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
}) {
  const { src, cx, cy, w, h, rotation = 0, cover = false } = props;
  const img = useImage(src);
  if (!img) return null;

  return (
    <KonvaImage
      image={img}
      x={cx}
      y={cy}
      width={w}
      height={h}
      offsetX={w / 2} // rotate around the center
      offsetY={h / 2}
      rotation={rotation}
      {...(cover ? coverCrop(img, w, h) : {})}
    />
  );
}

function TextNode({ block, W, H, family }: { block: TextBlock; W: number; H: number; family: string }) {
  return (
    <Text
      x={block.x * W}
      y={block.y * H}
      width={block.w * W}
      text={block.text}
      fontSize={block.size * H}
      fontFamily={family}
      fill={block.color}
      rotation={block.rotation}
      lineHeight={1.2}
    />
  );
}

// ---------- the renderer ----------

export default function PostcardRenderer({ data, side, readOnly = false, stageRef }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [fontTick, setFontTick] = useState(0); // bumps when web fonts finish loading

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

  const family = (key: FontKey) => resolveFamily(key);
  const handFont = width > 0 ? family("hand") : FONT_FALLBACKS.hand;
  const blocks = data.text_blocks.filter((b) => b.side === side);

  return (
    <div ref={wrapRef} className="w-full" style={{ aspectRatio: `${ASPECT}` }}>
      {W > 0 && (
        <Stage width={W} height={H} ref={stageRef}>
          {/* key={fontTick} redraws everything once fonts are ready */}
          <Layer key={fontTick} listening={!readOnly}>
            {side === "front" ? (
              <FrontSide data={data} W={W} H={H} />
            ) : (
              <BackBase data={data} W={W} H={H} font={handFont} />
            )}

            {/* Back only: stamps and the back photo, in the order they were saved */}
            {side === "back" &&
              data.stamps.map((item: ImageItem) => (
                <PictureNode
                  key={item.id}
                  src={item.kind === "photo" ? data.back_image_url : item.src}
                  cx={item.x * W}
                  cy={item.y * H}
                  w={item.w * W}
                  h={item.h * H}
                  rotation={item.rotation}
                  cover={item.kind === "photo"}
                />
              ))}

            {/* Free text blocks for this side */}
            {blocks.map((block) => (
              <TextNode key={block.id} block={block} W={W} H={H} family={family(block.fontKey)} />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
}

// ---------- front ----------

function FrontSide({ data, W, H }: { data: PostcardData; W: number; H: number }) {
  return (
    <>
      <Rect width={W} height={H} fill="#e9dfce" />
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
        />
      )}
    </>
  );
}

// ---------- back (the fixed layout; stamps and text blocks are drawn on top) ----------

function BackBase({ data, W, H, font }: { data: PostcardData; W: number; H: number; font: string }) {
  // Pitch between the address lines, as a fraction of the height.
  const rules = [0.43, 0.535, 0.635, 0.735];

  return (
    <>
      {/* Paper */}
      <Rect width={W} height={H} fill="#fffdf7" />

      {/* Divider between message and address */}
      <Line points={[W * 0.5, H * 0.1, W * 0.5, H * 0.9]} stroke={RULE} strokeWidth={1} />

      {/* Stamp corner (empty frame; stamps are placed on top of it) */}
      <Rect
        x={W * 0.78}
        y={H * 0.07}
        width={W * 0.16}
        height={H * 0.26}
        stroke={RULE}
        strokeWidth={1}
        dash={[6, 4]}
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
        />
      )}

      {/* Address area, right side */}
      {rules.map((y) => (
        <Line key={y} points={[W * 0.56, H * y, W * 0.93, H * y]} stroke={RULE} strokeWidth={1} />
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
        />
      )}
    </>
  );
}
