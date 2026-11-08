export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startLangfuse } = await import("./lib/server/langfuse");
  startLangfuse();
}
