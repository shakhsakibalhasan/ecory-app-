import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const allowed = new Set([
  "https://ecory.app",
  "https://www.ecory.app",
  "https://https-ecory-lovable-app.lovable.app",
  "https://id-preview--aa11039f-48c0-54c3-b529-500302759ed4.lovable.app",
  ...(Deno.env.get("TRANSLATION_ALLOWED_ORIGINS") || "").split(",").filter(Boolean),
]);
Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  const headers = {
    "Access-Control-Allow-Origin": allowed.has(origin) ? origin : "https://ecory.app",
    "Access-Control-Allow-Headers": "authorization,apikey,x-client-info,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    Vary: "Origin",
    "Content-Type": "application/json",
  };
  const reply = (status: number, code: string, text?: string) =>
    new Response(JSON.stringify({ code, ...(text !== undefined ? { text } : {}) }), {
      status,
      headers,
    });
  if (origin && !allowed.has(origin)) return reply(403, "origin_denied");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply(405, "method_not_allowed");
  try {
    const auth = request.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return reply(401, "login_required");
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: user, error: userError } = await client.auth.getUser(auth.slice(7));
    if (userError || !user.user) return reply(401, "login_required");
    const { data: admin, error: roleError } = await client.rpc("has_role", {
      _user_id: user.user.id,
      _role: "admin",
    });
    if (roleError || admin !== true) return reply(403, "admin_required");
    const body = await request.text();
    if (body.length > 40000) return reply(413, "text_too_long");
    let input;
    try {
      input = JSON.parse(body);
    } catch {
      return reply(400, "invalid_json");
    }
    if (
      typeof input.text !== "string" ||
      !input.text.trim() ||
      input.text.length > 12000 ||
      !["bn", "en"].includes(input.source) ||
      !["bn", "en"].includes(input.target) ||
      input.source === input.target
    )
      return reply(400, "invalid_translation");
    const key = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
    if (!key) return reply(503, "translation_setup_required");
    const { data: budget, error: budgetError } = await client.rpc("admin_translation_claim", {
      _characters: input.text.length,
    });
    if (budgetError) return reply(503, "translation_budget_setup_required");
    if (budget !== true) return reply(429, "translation_limit");
    const protectedValues: string[] = [];
    const text = input.text.replace(
      /https?:\/\/[^\s<>]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|<[^>]+>|[০-৯0-9]+(?:[.,:/%৳+\-][০-৯0-9]+)*|\b[A-Z]{2,}[-_][A-Z0-9_-]+\b/g,
      (value: string) => {
        const token = `ECORYPROTECTED${String.fromCharCode(65 + Math.floor(protectedValues.length / 26))}${String.fromCharCode(65 + (protectedValues.length % 26))}TOKEN`;
        protectedValues.push(value);
        return token;
      },
    );
    const response = await fetch(
      "https://translation.googleapis.com/language/translate/v2?key=" + encodeURIComponent(key),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: input.source,
          target: input.target,
          format: "text",
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) return reply(502, "translation_provider_error");
    const result = await response.json();
    let translated = result?.data?.translations?.[0]?.translatedText;
    if (typeof translated !== "string") return reply(502, "translation_provider_error");
    translated = translated.replace(
      /&(?:amp|lt|gt|quot|#39|#x[0-9a-f]+|#[0-9]+);/gi,
      (entity: string) => {
        const named: Record<string, string> = {
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&quot;": '"',
          "&#39;": "'",
        };
        if (named[entity]) return named[entity];
        const n = entity.startsWith("&#x")
          ? parseInt(entity.slice(3, -1), 16)
          : parseInt(entity.slice(2, -1), 10);
        return Number.isFinite(n) && n <= 0x10ffff ? String.fromCodePoint(n) : entity;
      },
    );
    for (let i = 0; i < protectedValues.length; i++) {
      const token = `ECORYPROTECTED${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}TOKEN`;
      if (translated.split(token).length !== 2) return reply(502, "protected_text_changed");
      translated = translated.replace(token, protectedValues[i]);
    }
    return reply(200, "ok", translated);
  } catch {
    return reply(500, "translation_failed");
  }
});
