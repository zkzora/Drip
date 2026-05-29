// Minimal server-side Supabase client. Uses fetch + PostgREST so we don't
// need @supabase/supabase-js as a dependency. Service-role only — never
// import this from a client component.

const RAW_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function normalizeUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const SUPABASE_URL = normalizeUrl(RAW_URL);
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SERVICE_KEY);

type InsertOk = { ok: true; status: "joined" | "already_joined" };
type InsertErr = { ok: false; reason: "duplicate" | "config" | "network" | "server"; detail?: string };
export type InsertResult = InsertOk | InsertErr;

/**
 * Insert a row into a Supabase table via PostgREST. On unique-constraint
 * conflict (Postgres 23505) returns `already_joined`. Any other failure
 * returns a structured error so the caller can decide what to surface.
 */
export async function supabaseInsert<T extends Record<string, unknown>>(
  table: string,
  row: T,
  opts: { signal?: AbortSignal } = {},
): Promise<InsertResult> {
  if (!SUPABASE_CONFIGURED) {
    return { ok: false, reason: "config" };
  }

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // PostgREST: skip return body, fail on conflict so we can detect 23505
        Prefer: "return=minimal",
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify(row),
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (e: any) {
    return { ok: false, reason: "network", detail: e?.message };
  }

  if (res.status === 201 || res.status === 204) {
    return { ok: true, status: "joined" };
  }

  // Postgres unique violation surfaces as 409 with code 23505
  if (res.status === 409) {
    return { ok: true, status: "already_joined" };
  }

  let detail = "";
  try {
    const body = await res.json();
    if (body?.code === "23505") return { ok: true, status: "already_joined" };
    detail = body?.message || body?.error || "";
  } catch {
    // ignore parse error
  }
  return { ok: false, reason: "server", detail };
}
