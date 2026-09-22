export type AuditOutcome = string;

/**
 * Structured audit events for core mutations (create/join/start/answer/
 * finish/end). Plain `console.log` — identical under Node and the Workers
 * runtime, so this needs no `cloudflare:workers` import and no
 * dynamic-import workaround. Prefixed with the literal string "[AUDIT]"
 * (filterable via `wrangler tail | grep '\[AUDIT\]'`) and stamped with
 * `type: "audit"` so entries are also filterable/structured in the
 * dashboard's Logs search (`attributes.type == "audit"`).
 */
export function logAuditEvent(event: {
  action: string;
  actor: string;
  target: string;
  outcome: AuditOutcome;
  details?: Record<string, unknown>;
}): void {
  console.log(
    "[AUDIT]",
    JSON.stringify({
      type: "audit",
      timestamp: new Date().toISOString(),
      ...event,
    }),
  );
}
