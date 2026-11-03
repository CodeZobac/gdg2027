"use client";
import { ArrowUpRight } from "lucide-react";
export function PromptSuggestions({ prompts = ["Explain the four layers", "What should I trace?"], hidden, onSelect }: { prompts?: string[]; hidden: boolean; onSelect: (text: string) => void }) {
  if (hidden) return null;
  return <div aria-label="Suggested prompts" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>{prompts.map(prompt => <button key={prompt} type="button" onClick={() => onSelect(prompt)} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid var(--color-line)", borderRadius: 20, padding: "8px 12px", background: "var(--color-sidebar)", color: "var(--color-muted)", fontSize: 12, lineHeight: 1.4 }}><span>{prompt}</span><ArrowUpRight size={14} /></button>)}</div>;
}
