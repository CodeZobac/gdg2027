import { z } from "zod/v4";

/** Last year's photo gallery: opaque IDs and short-lived signed URLs, never storage paths. */
export const GALLERY_SIZE = 12;
export const photoSchema = z.object({ id: z.string().regex(/^photo-(?:[1-9]|1[0-2])$/), url: z.string().url(), expiresAt: z.string().datetime() }).strict();
export const galleryRequestSchema = z.object({ mode: z.literal("gallery") }).strict();
export const galleryReplySchema = z.object({ mode: z.literal("gallery"), photos: z.array(photoSchema).min(1).max(GALLERY_SIZE) }).strict();
export type GalleryPhoto = z.infer<typeof photoSchema>;
export type GalleryReply = z.infer<typeof galleryReplySchema>;
