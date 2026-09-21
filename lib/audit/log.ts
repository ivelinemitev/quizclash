export type AuditOutcome = string;

/**
 * Structured audit events for core mutations (create/join/start/finish).
 * Plain `console.log` — identical under Node and the Workers runtime, so
 * this needs no `cloudflare:workers` import and no dynamic-import
 * workaround. Stamped with `type: "audit"` so entries are filterable in
 * `wrangler tail` (`wrangler tail | grep '"type":"audit"'`) or the
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
    JSON.stringify({
      type: "audit",
      timestamp: new Date().toISOString(),
      ...event,
    }),
  );
}
