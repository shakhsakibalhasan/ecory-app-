import { createClient } from "npm:@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info,x-cron-secret",
};
const json = (x: unknown, s = 200) =>
  new Response(JSON.stringify(x), {
    status: s,
    headers: { ...cors, "Content-Type": "application/json" },
  });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const body = await req.json().catch(() => ({}));
    const secret = Deno.env.get("NOTIFICATION_CRON_SECRET");
    let trusted = !!secret && req.headers.get("x-cron-secret") === secret;
    const bearer = req.headers.get("authorization")?.replace(/^Bearer /i, "");
    if (!trusted && bearer) {
      const user = await db.auth.getUser(bearer);
      if (user.data.user) {
        const role = await db.rpc("has_role", { _user_id: user.data.user.id, _role: "admin" });
        trusted = role.data === true;
      }
    }
    let orderId: string | null = null;
    if (!trusted) {
      if (
        typeof body.order_code !== "string" ||
        typeof body.phone !== "string" ||
        !/^01\d{9}$/.test(body.phone)
      )
        return json({ error: "Unauthorized" }, 401);
      const order = await db
        .from("orders")
        .select("id")
        .eq("code", body.order_code)
        .eq("phone", body.phone)
        .gte("created_at", new Date(Date.now() - 86400000).toISOString())
        .maybeSingle();
      if (!order.data) return json({ error: "Order not found" }, 404);
      orderId = order.data.id;
    }
    const cfg = await db
      .from("customer_communication_settings")
      .select("sms_enabled")
      .eq("id", 1)
      .single();
    if (cfg.error) throw cfg.error;
    if (!cfg.data.sms_enabled) return json({ accepted: 0, reason: "Customer SMS disabled" });
    const endpoint = Deno.env.get("SMS_BRIDGE_URL"),
      token = Deno.env.get("SMS_BRIDGE_TOKEN");
    if (!endpoint || !token) return json({ error: "SMS provider adapter not configured" }, 503);
    const target = new URL(endpoint);
    if (target.protocol !== "https:") return json({ error: "Invalid SMS provider endpoint" }, 503);
    const claimed = await db.rpc("claim_customer_sms", { _order: orderId });
    if (claimed.error) throw claimed.error;
    let accepted = 0,
      failed = 0,
      unknown = 0;
    const rows = claimed.data || [];
    for (let offset = 0; offset < rows.length; offset += 4) {
      await Promise.all(
        rows.slice(offset, offset + 4).map(async (row: any) => {
          let status = "unknown";
          try {
            const r = await fetch(target.href, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "Idempotency-Key": row.id,
              },
              body: JSON.stringify({ id: row.id, to: row.phone, text: row.body }),
              signal: AbortSignal.timeout(10000),
            });
            const result = await r.json();
            if (r.ok && result.accepted === true && typeof result.message_id === "string") {
              status = "accepted";
              accepted++;
            } else if (result.accepted === false) {
              status = "failed";
              failed++;
            } else {
              unknown++;
            }
          } catch {
            unknown++;
          }
          const log = await db
            .from("customer_sms_queue")
            .update({
              status,
              error:
                status === "accepted"
                  ? ""
                  : status === "failed"
                    ? "Provider rejected SMS"
                    : "Delivery result unknown; verify provider before retrying",
              sent_at: status === "accepted" ? new Date().toISOString() : null,
            })
            .eq("id", row.id);
          if (log.error) throw log.error;
        }),
      );
    }
    return json({ accepted, failed, unknown });
  } catch {
    return json({ error: "SMS processing failed; inspect server logs" }, 500);
  }
});
