"use client";

import { useState } from "react";

// Copies an absolute link to the clipboard. `path` is like "/p/123".
// Also reused by the postcard editor in Step 6.
export default function CopyLinkButton({ path, label = "Copy link" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for browsers that block the clipboard API: show the link to copy by hand.
      window.prompt("Copy this link:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button onClick={copy} className="btn-ghost">
      {copied ? "Copied!" : label}
    </button>
  );
}
