"use client";

import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { PresentationHeading } from "./presentation-heading";
import { Check, Copy, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { z } from "zod/v4";
import { closingLinks, closingLinksProps } from "@/lib/shared/presentation-contract";

const QUIET = 4;
/** Builds SVG paths from the QR matrix: finder patterns are drawn separately so they can carry brand colour. */
function qrPaths(url: string) {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
  const size = modules.size;
  const inFinder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
  let data = "";
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (modules.get(r, c) && !inFinder(r, c)) data += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
  const finders = [[0, 0], [0, size - 7], [size - 7, 0]].map(([r, c]) => {
    const x = c + QUIET, y = r + QUIET;
    return `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;
  }).join("");
  return { data, finders, box: size + QUIET * 2 };
}

function QrCode({ url, label }: { url: string; label: string }) {
  const { data, finders, box } = useMemo(() => qrPaths(url), [url]);
  return <svg className="qr-svg" viewBox={`0 0 ${box} ${box}`} role="img" aria-label={`QR code: ${label}`} shapeRendering="crispEdges">
    <rect width={box} height={box} fill="#fff" />
    <path className="qr-data" d={data} />
    <path className="qr-finders" d={finders} fillRule="evenodd" />
  </svg>;
}

/** Trusted QR codes and URLs; the AI supplies only the thank-you line and card captions. */
export function ClosingLinksCanvas(props: z.infer<typeof closingLinksProps>) {
  const [focused, setFocused] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(key: string, url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(key); setTimeout(() => setCopied(current => current === key ? null : current), 1600); } catch { /* clipboard unavailable */ }
  }
  return <section className="closing" aria-label="Closing links">
    <PresentationHeading title="Thank you" punctuation="!" subtitle={<>Scan, star and <span className="presentation-highlight">explore</span></>} />
    <p className="session-summary">{props.thanks}</p>
    <div className={`closing-cards ${focused ? "has-focus" : ""}`}>
      {closingLinks.map((link, index) => {
        const isFocused = focused === link.key;
        if (focused && !isFocused) return null;
        return <article key={link.key} className={`closing-card card-${link.key} ${isFocused ? "is-focused" : ""}`} style={{ animationDelay: `${index * .15}s` }}>
          <div className="closing-qr">
            <QrCode url={link.url} label={link.title} />
            <i className="qr-scanline" aria-hidden="true" />
          </div>
          <div className="closing-meta">
            <span className="session-block-label">{String(index + 1).padStart(2, "0")} · {link.title}</span>
            <strong>{link.handle}</strong>
            <p>{props[link.key]}</p>
            <div className="closing-actions">
              <button className="session-proxy-toggle" aria-pressed={isFocused} onClick={() => setFocused(isFocused ? null : link.key)}>{isFocused ? <Minimize2 size={13} aria-hidden="true" /> : <Maximize2 size={13} aria-hidden="true" />}{isFocused ? "Show both" : "Enlarge to scan"}</button>
              <button className="session-proxy-toggle" onClick={() => copy(link.key, link.url)}>{copied === link.key ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}{copied === link.key ? "Copied" : "Copy link"}</button>
              <a className="session-proxy-toggle" href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} aria-hidden="true" />Open</a>
            </div>
          </div>
        </article>;
      })}
    </div>
    <p className="closing-url" aria-live="polite">{(closingLinks.find(link => link.key === focused) ?? null)?.url.replace("https://", "") ?? "github.com/CodeZobac"}</p>
  </section>;
}
