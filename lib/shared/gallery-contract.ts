import { z } from "zod/v4";

export const textProps = z.object({ text: z.string().min(1).max(4000) });
export const galleryProps = z.object({ title: z.string().min(1).max(120), photoIds: z.array(z.string().regex(/^photo-[1-4]$/)).length(4) });
export const photoSchema = z.object({ id: z.string().regex(/^photo-[1-4]$/), url: z.string().url(), expiresAt: z.string().datetime() });
export const agentReplySchema = z.object({ source: z.string().max(16000), photos: z.array(photoSchema).length(4) });
export type GalleryPhoto = z.infer<typeof photoSchema>;
export type AgentReply = z.infer<typeof agentReplySchema>;
