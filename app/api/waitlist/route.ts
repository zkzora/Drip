import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseInsert, SUPABASE_CONFIGURED } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Common headers — never cache this endpoint.
const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json",
};

const MAX_BODY_BYTES = 4 * 1024; // 4KB is plenty for { email, source, chainInterest }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(status: number, body: Record<string, unknown>) {
  return new NextResponse(JSON.stringify(body), { status, headers: NO_STORE });
}

function hashIp(ip: string): string {
  // Hash with a per-day salt so we don't store raw IPs but can still spot
  // burst sign-ups from the same source within a day.
  const salt = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

export async function POST(req: NextRequest) {
  // Body size guard — read as text so we can measure before parsing.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return json(400, { ok: false, message: "invalid_body" });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return json(413, { ok: false, message: "payload_too_large" });
  }

  let payload: any;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return json(400, { ok: false, message: "invalid_json" });
  }

  const emailInput = typeof payload?.email === "string" ? payload.email.trim() : "";
  const email = emailInput.toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json(400, { ok: false, message: "invalid_email" });
  }

  const source =
    typeof payload?.source === "string" && payload.source.length <= 64
      ? payload.source
      : "website";
  const chainInterest =
    typeof payload?.chainInterest === "string" && payload.chainInterest.length <= 64
      ? payload.chainInterest
      : null;

  if (!SUPABASE_CONFIGURED) {
    // Don't leak which side is misconfigured to the client.
    console.error("[waitlist] Supabase env vars missing");
    return json(500, { ok: false, message: "server_error" });
  }

  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 512);
  const ipHash = hashIp(clientIp(req));

  const result = await supabaseInsert("waitlist", {
    email,
    source,
    chain_interest: chainInterest,
    user_agent: userAgent,
    ip_hash: ipHash,
  });

  if (result.ok === false) {
    if (result.reason !== "duplicate") {
      console.error("[waitlist] insert failed:", result.reason, result.detail);
    }
    return json(500, { ok: false, message: "server_error" });
  }

  return json(200, { ok: true, status: result.status, message: result.status });
}

export async function GET() {
  return json(405, { ok: false, message: "method_not_allowed" });
}
