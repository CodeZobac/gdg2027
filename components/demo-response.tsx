"use client";

import { createLibrary, defineComponent, Renderer } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { useState } from "react";
import { ArrowUpRight, MapPin, X } from "lucide-react";

const scenes = [
  { name: "The waterfront", detail: "An afternoon by the water", style: "waterfront" },
  { name: "Old town wanderings", detail: "A quiet corner of the city", style: "oldtown" },
  { name: "Golden hour", detail: "The last light of the day", style: "sunset" },
] as const;

function Collection({ title }: { title: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  return <div className="collection"><div className="collection-heading"><h3>{title}</h3><span>3 ILLUSTRATIONS</span></div><div className="photo-grid">{scenes.map((scene, index) => <button className="photo-card" key={scene.name} onClick={() => setSelected(index)}><div className={`scene ${scene.style}`} aria-hidden="true"><span className="scene-sun" /><span className="scene-land" /><span className="scene-building" /><span className="scene-water" /></div><strong>{scene.name}<ArrowUpRight size={14} /></strong><span><MapPin size={11} /> Faro · Demo illustration</span></button>)}</div>{selected !== null && <div className="photo-detail"><button className="icon-button" aria-label="Close illustration details" onClick={() => setSelected(null)}><X size={17} /></button><strong>{scenes[selected].name}</strong><p>{scenes[selected].detail}. This illustration demonstrates an interactive photo card. No personal photos have been accessed.</p></div>}</div>;
}

const Text = defineComponent({ name: "Text", description: "Plain assistant text. Never HTML.", props: z.object({ text: z.string().max(4000) }), component: ({ props }) => <p>{props.text}</p> });
const PhotoCollection = defineComponent({ name: "PhotoCollection", description: "An interactive collection of local demo illustrations.", props: z.object({ title: z.string().max(120) }), component: ({ props }) => <Collection title={props.title} /> });
const Response = defineComponent({ name: "Response", description: "Approved assistant response components.", props: z.object({ children: z.array(z.union([Text.ref, PhotoCollection.ref])) }), component: ({ props, renderNode }) => <div className="openui-response">{renderNode(props.children)}</div> });
export const demoLibrary = createLibrary({ root: "Response", components: [Response, Text, PhotoCollection] });

export function DemoResponse({ text, photos, showSource }: { text: string; photos: boolean; showSource: boolean }) {
  const source = `root = Response([message${photos ? ", collection" : ""}])\nmessage = Text(${JSON.stringify(text)})${photos ? '\ncollection = PhotoCollection("A day in Faro")' : ""}`;
  return <><Renderer library={demoLibrary} response={source} isStreaming={false} />{showSource && <details className="source-code" open><summary>OpenUI Lang · local fixture</summary><pre>{source}</pre></details>}</>;
}
