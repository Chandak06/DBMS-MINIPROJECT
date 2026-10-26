export function safeDiagnostic(error: unknown): string {
  const e = error as { name?: string; code?: string | number; sqlState?: string };
  // Never persist driver messages: they may include a URI, credentials, SQL or private data.
  return [e?.name || "Error", e?.code, e?.sqlState].filter(Boolean).join(": ").slice(0, 200);
}
