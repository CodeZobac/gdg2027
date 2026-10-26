"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Images, RefreshCw, Shuffle, X } from "lucide-react";
import { galleryReplySchema, GALLERY_SIZE, type GalleryPhoto } from "@/lib/shared/gallery-contract";

/** Last year's photos: a random sample of the private collection, signed for five minutes. */
export function PhotoGallery({ onClose }: { onClose: () => void }) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const dialog = useRef<HTMLElement>(null);
  const controller = useRef<AbortController | null>(null);

  /** Only sets state after the request resolves, so it is safe to start from an effect. */
  const load = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "gallery" }), signal: request.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The gallery is unavailable.");
      setPhotos(galleryReplySchema.parse(body).photos);
      setNow(Date.now());
    } catch (failure) {
      if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : "The gallery is unavailable.");
    } finally { if (!request.signal.aborted) setLoading(false); }
  }, []);
  const shuffle = () => { setLoading(true); setError(""); setOpen(null); setLoaded({}); return load(); };

  // load() only sets state after its request resolves (fetch on open), so no synchronous cascade.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); return () => controller.current?.abort(); }, [load]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    return () => previous?.focus();
  }, []);

  const expiresAt = photos[0] ? Date.parse(photos[0].expiresAt) : 0;
  const remaining = Math.max(0, Math.round((expiresAt - now) / 1000));
  const expired = photos.length > 0 && remaining === 0;
  const step = (delta: number) => setOpen(index => index === null ? null : (index + delta + photos.length) % photos.length);

  function onKey(event: React.KeyboardEvent) {
    if (event.key === "Escape") { event.stopPropagation(); if (open !== null) setOpen(null); else onClose(); }
    if (open !== null && event.key === "ArrowRight") step(1);
    if (open !== null && event.key === "ArrowLeft") step(-1);
    if (event.key === "Tab") {
      const controls = dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled)");
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }

  const current = open !== null ? photos[open] : null;
  return <div className="modal-backdrop gallery-backdrop" onClick={onClose}>
    <section ref={dialog} className="gallery-panel" role="dialog" aria-modal="true" aria-labelledby="gallery-title" onClick={event => event.stopPropagation()} onKeyDown={onKey}>
      <header className="gallery-header">
        <div>
          <div className="welcome-eyebrow gallery-eyebrow"><span /> GDG FARO · 2025</div>
          <h2 id="gallery-title">Last year&apos;s gallery</h2>
          <p>A random handful of moments from the community collection. Shuffle for another set.</p>
        </div>
        <div className="gallery-tools">
          <span className={`gallery-timer ${remaining < 60 ? "is-low" : ""}`} aria-live="off">{photos.length && !expired ? `Access ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : ""}</span>
          <button className="gallery-shuffle" onClick={() => void shuffle()} disabled={loading}>{expired ? <RefreshCw size={15} /> : <Shuffle size={15} />}{expired ? "Refresh access" : "Shuffle"}</button>
          <button className="icon-button" aria-label="Close gallery" onClick={onClose}><X size={20} /></button>
        </div>
      </header>

      {error ? <div className="gallery-empty" role="alert"><Images size={28} /><p>{error}</p><button className="gallery-shuffle" onClick={() => void shuffle()}><RefreshCw size={15} />Try again</button></div>
        : <div className={`gallery-grid ${expired ? "is-expired" : ""}`} aria-busy={loading}>
          {(loading ? Array.from({ length: GALLERY_SIZE }, (_, index) => ({ id: `skeleton-${index}` }) as GalleryPhoto) : photos).map((photo, index) => loading
            ? <div key={photo.id} className="gallery-tile is-skeleton" style={{ animationDelay: `${index * 40}ms` }} />
            : <button key={photo.id + photo.url} className={`gallery-tile ${loaded[photo.id] ? "is-loaded" : ""}`} style={{ animationDelay: `${index * 45}ms` }} onClick={() => setOpen(index)} disabled={expired} aria-label={`Open photo ${index + 1} of ${photos.length}`}>
              {/* Private signed image: no optimizer cache or third-party proxy. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={`GDG Faro community photo ${index + 1}`} loading="lazy" referrerPolicy="no-referrer" onLoad={() => setLoaded(previous => ({ ...previous, [photo.id]: true }))} />
              <span className="gallery-index">{String(index + 1).padStart(2, "0")}</span>
            </button>)}
          {expired && <div className="gallery-expired"><p>Temporary access expired.</p><button className="gallery-shuffle" onClick={() => void shuffle()}><RefreshCw size={15} />Refresh access</button></div>}
        </div>}
      <p className="gallery-note">Private collection · signed links expire after five minutes · photos never reach the AI model.</p>

      {current && !expired && <div className="gallery-lightbox" role="group" aria-label={`Photo ${open! + 1} of ${photos.length}`} onClick={() => setOpen(null)}>
        <button className="lightbox-nav lightbox-prev" aria-label="Previous photo" onClick={event => { event.stopPropagation(); step(-1); }}><ChevronLeft size={26} /></button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={current.id} src={current.url} alt={`GDG Faro community photo ${open! + 1}`} referrerPolicy="no-referrer" onClick={event => event.stopPropagation()} />
        <button className="lightbox-nav lightbox-next" aria-label="Next photo" onClick={event => { event.stopPropagation(); step(1); }}><ChevronRight size={26} /></button>
        <span className="lightbox-count">{open! + 1} / {photos.length} · ← → to browse · Esc to close</span>
      </div>}
    </section>
  </div>;
}
