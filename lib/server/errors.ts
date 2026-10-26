export class AgentError extends Error {
  /** `detail` is server-only diagnostics (logs, repair prompts); never sent to the client. */
  constructor(public code: string, message: string, public status = 503, public detail?: string) { super(message); }
}
