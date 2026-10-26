import "server-only";
import { createClient } from "@supabase/supabase-js";
import { AgentError } from "./errors";
import { selectPhotos } from "./storage-selection";
import { GALLERY_SIZE, type GalleryPhoto } from "../shared/gallery-contract";

function configuredStorage(signal?: AbortSignal) {
  const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: key, SUPABASE_PHOTO_BUCKET: bucket, SUPABASE_PHOTO_PREFIX: prefix = "" } = process.env;
  if (!url || !key || !bucket) throw new AgentError("STORAGE_NOT_CONFIGURED", "Photo storage is not configured on the server.");
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) throw new AgentError("STORAGE_NOT_CONFIGURED", "Configure the hosted Supabase project URL.");
  if (prefix.split("/").some(segment => segment === "." || segment === "..") || prefix.startsWith("/") || prefix.endsWith("/")) throw new AgentError("STORAGE_NOT_CONFIGURED", "The photo prefix is invalid.");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: signal ?? AbortSignal.timeout(20000), cache: "no-store" }) },
  });
  const storage = client.storage.from(bucket);
  return { storage, url, bucket, prefix };
}

/** Signs `count` randomly sampled photos for 5 minutes. IDs are opaque and positional. */
export async function getRandomPhotos(signal?: AbortSignal, count = GALLERY_SIZE): Promise<GalleryPhoto[]> {
  const { storage, url, bucket, prefix } = configuredStorage(signal);
  const paths = await selectPhotos(async (folder, offset, limit) => {
    const { data, error } = await storage.list(folder, { offset, limit, sortBy: { column: "name", order: "asc" } });
    if (error || !data) throw new AgentError("STORAGE_UNAVAILABLE", "The photo collection could not be listed. Check server storage permissions.");
    return data;
  }, prefix, undefined, count);
  const expiresAt = new Date(Date.now() + 300000).toISOString();
  const { data, error } = await storage.createSignedUrls(paths, 300);
  if (error || !data || data.length !== count || data.some(item => item.error || !item.signedUrl)) throw new AgentError("STORAGE_UNAVAILABLE", "Temporary photo access could not be created.");
  return paths.map((path, index) => {
    const match = data.find(item => item.path === path);
    if (!match?.signedUrl) throw new AgentError("STORAGE_UNAVAILABLE", "A selected photo is unavailable.");
    const signed = new URL(match.signedUrl);
    if (signed.origin !== url || !signed.pathname.startsWith(`/storage/v1/object/sign/${encodeURIComponent(bucket)}/`)) throw new AgentError("INVALID_PHOTO_URL", "Storage returned an unexpected photo URL.");
    return { id: `photo-${index + 1}`, url: signed.href, expiresAt };
  });
}

/** Fixed server-owned object: callers cannot choose paths or buckets. */
export async function getPresentationPhoto(signal?: AbortSignal) {
  const { storage, url, bucket, prefix } = configuredStorage(signal);
  const path = [prefix, "PXL_20250712_082655543.jpg"].filter(Boolean).join("/");
  const { data, error } = await storage.createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw new AgentError("STORAGE_UNAVAILABLE", "The presentation image is unavailable. Please retry.");
  const signed = new URL(data.signedUrl);
  const expectedPath = `/storage/v1/object/sign/${[bucket, ...path.split("/")].map(encodeURIComponent).join("/")}`;
  if (signed.origin !== url || signed.pathname !== expectedPath) throw new AgentError("INVALID_PHOTO_URL", "Storage returned an unexpected presentation image.");
  return { id: "presentation-opening" as const, url: signed.href, expiresAt: new Date(Date.now() + 300000).toISOString() };
}
