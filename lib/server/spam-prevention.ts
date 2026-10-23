import "server-only";
import { createHash, randomUUID } from "node:crypto";

type Visitor = { attempts: number[]; lastHash?: string; lastMessageAt?: number; expiresAt: number };
const visitors = new Map<string, Visitor>();
const lifetime = 600000;

/** Best-effort browser-session spam protection; not a bot identity or distributed quota. */
export function checkSpam(request: Request, message: string, now = Date.now()) {
  for (const [id, visitor] of visitors) if (visitor.expiresAt <= now) visitors.delete(id);
  const cookieId = request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith("chat_visitor="))?.slice("chat_visitor=".length);
  const id = cookieId && visitors.has(cookieId) ? cookieId : randomUUID();
  const visitor = visitors.get(id) ?? { attempts: [], expiresAt: now + lifetime };
  visitor.attempts = visitor.attempts.filter(time => time > now - 10000);
  const hash = createHash("sha256").update(message.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()).digest("hex");
  const duplicate = visitor.lastHash === hash && now - (visitor.lastMessageAt ?? 0) < 2000;
  const burst = visitor.attempts.length >= 10;
  const retryAfter = burst ? Math.max(1, Math.ceil((visitor.attempts[0] + 10000 - now) / 1000)) : 2;
  if (!burst) visitor.attempts.push(now);
  if (!duplicate && !burst) { visitor.lastHash = hash; visitor.lastMessageAt = now; }
  visitor.expiresAt = now + lifetime;
  // Bound memory without rejecting unrelated visitors.
  if (!visitors.has(id) && visitors.size >= 10000) visitors.delete(visitors.keys().next().value!);
  visitors.set(id, visitor);
  return {
    blocked: duplicate || burst,
    retryAfter,
    cookie: `chat_visitor=${id}; HttpOnly; SameSite=Strict; Path=/api/chat; Max-Age=600${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
  };
}
