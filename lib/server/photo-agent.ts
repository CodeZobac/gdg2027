import "server-only";
import { generateDeepSeek } from "./deepseek";
import { runPhotoAgent } from "./agent-loop";
import { getRandomPhotos } from "./supabase-photos";

export async function photoAgent(message: string, signal: AbortSignal) {
  return runPhotoAgent(message, "deepseek-flash", request => generateDeepSeek(request, signal), () => getRandomPhotos(signal), signal);
}
