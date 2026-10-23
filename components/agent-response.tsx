"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createLibrary, defineComponent, Renderer } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { galleryProps, textProps, type AgentReply, type GalleryPhoto } from "@/lib/shared/gallery-contract";

const Photos = createContext<GalleryPhoto[]>([]);
function Photo({ photo, number }: { photo: GalleryPhoto; number: number }) {
  const [failed, setFailed] = useState(false);
  const [expired, setExpired] = useState(() => Date.parse(photo.expiresAt) <= Date.now());
  useEffect(() => { const timer = setTimeout(() => setExpired(true), Math.max(0, Date.parse(photo.expiresAt) - Date.now())); return () => clearTimeout(timer); }, [photo.expiresAt]);
  if (failed || expired) return <div className="photo-unavailable"><strong>Photo {number}</strong><p>{expired ? "Access expired." : "Photo unavailable."} Ask for four more photos to refresh.</p></div>;
  // Short-lived server-authorized URLs: no optimization cache, referrer, or third-party proxy.
  // eslint-disable-next-line @next/next/no-img-element
  return <a className="live-photo" href={photo.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><img src={photo.url} alt={`Randomly selected photo ${number}`} onError={() => setFailed(true)} referrerPolicy="no-referrer" /><span>Photo {number} <span>↗</span></span></a>;
}
function Gallery({ title, photoIds }: z.infer<typeof galleryProps>) {
  const photos = useContext(Photos);
  return <section className="collection"><div className="collection-heading"><h3>{title}</h3><span>4 RANDOM PHOTOS</span></div><div className="live-photo-grid">{photoIds.map((id, index) => { const photo = photos.find(item => item.id === id); return photo ? <Photo key={id} photo={photo} number={index + 1} /> : null; })}</div><p className="gallery-note">Selected at random · Temporary access expires after 5 minutes</p></section>;
}
const Text = defineComponent({ name: "Text", description: "Plain assistant text", props: textProps, component: ({ props }) => <p>{props.text}</p> });
const PhotoGallery = defineComponent({ name: "PhotoGallery", description: "Four authorized photos", props: galleryProps, component: ({ props }) => <Gallery {...props} /> });
const Response = defineComponent({ name: "Response", description: "Assistant response", props: z.object({ children: z.array(z.union([Text.ref, PhotoGallery.ref])) }), component: ({ props, renderNode }) => <div className="openui-response">{renderNode(props.children)}</div> });
const library = createLibrary({ root: "Response", components: [Response, Text, PhotoGallery] });

export function AgentResponse({ reply, showSource }: { reply: AgentReply; showSource: boolean }) {
  return <Photos.Provider value={reply.photos}><Renderer library={library} response={reply.source} isStreaming={false} />{showSource && <details className="source-code" open><summary>OpenUI Lang · agent response</summary><pre>{reply.source}</pre></details>}</Photos.Provider>;
}
