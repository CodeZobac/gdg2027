import { randomInt } from "node:crypto";
import { AgentError } from "./errors";

export type StorageEntry = { name: string; id: string | null; metadata?: { mimetype?: string } | null };
export type ListPage = (prefix: string, offset: number, limit: number) => Promise<StorageEntry[]>;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

/** Reservoir sampling across every page and folder: never bias toward the first page. */
export async function selectPhotos(list: ListPage, root = "", draw = randomInt, count = 4): Promise<string[]> {
  const selected: string[] = [];
  const pending = [root];
  const encountered = new Set<string>();
  let seen = 0;
  let visited = 0;
  while (pending.length) {
    const prefix = pending.shift()!;
    for (let offset = 0; ; offset += 100) {
      const entries = await list(prefix, offset, 100);
      for (const entry of entries) {
        if (++visited > 10000) throw new AgentError("BUCKET_TOO_LARGE", "The photo collection exceeds the demo scan limit. Configure a smaller prefix.");
        if (!entry.name || entry.name.includes("/") || entry.name === "." || entry.name === "..") throw new AgentError("INVALID_STORAGE_ENTRY", "The storage listing contains an invalid entry.");
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (encountered.has(path)) continue;
        encountered.add(path);
        if (!entry.id) { pending.push(path); continue; }
        if (!/\.(jpe?g|png|webp|avif|gif)$/i.test(entry.name)) continue;
        if (entry.metadata?.mimetype && !imageTypes.has(entry.metadata.mimetype)) continue;
        seen++;
        if (selected.length < count) selected.push(path);
        else { const index = draw(seen); if (index < count) selected[index] = path; }
      }
      if (entries.length < 100) break;
    }
  }
  if (selected.length < count) throw new AgentError("NOT_ENOUGH_PHOTOS", `Upload at least ${count} supported images to the configured photo bucket.`, 422);
  return selected;
}
export const selectFourPhotos = (list: ListPage, root = "", draw = randomInt) => selectPhotos(list, root, draw, 4);
