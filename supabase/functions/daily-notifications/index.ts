import { createClient } from "npm:@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info, x-cron-secret",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const b64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
const enc = (value: unknown) => b64(new TextEncoder().encode(JSON.stringify(value)));
async function firebaseAccess(account: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const content =
    enc({ alg: "RS256", typ: "JWT" }) +
    "." +
    enc({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    });
  const pem = account.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = b64(
    new Uint8Array(
      await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(content)),
    ),
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: content + "." + signature,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Firebase authentication failed");
  return data.access_token as string;
}
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const cronSecret = Deno.env.get("NOTIFICATION_CRON_SECRET");
    const cron = !!cronSecret && request.headers.get("x-cron-secret") === cronSecret;
    if (!cron) {
      const bearer = request.headers.get("authorization")?.replace(/^Bearer /i, "");
      if (!bearer) return json({ error: "Unauthorized" }, 401);
      const { data, error } = await db.auth.getUser(bearer);
      if (error || !data.user) return json({ error: "Unauthorized" }, 401);
      const { data: admin, error: roleError } = await db.rpc("has_role", {
        _user_id: data.user.id,
        _role: "admin",
      });
      if (roleError || !admin) return json({ error: "Admin access required" }, 403);
    }
    // The existing minute cron also drains the customer SMS outbox. No duplicate job needed.
    if (cron && cronSecret) {
      try {
        await fetch(`${url}/functions/v1/customer-sms`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-cron-secret": cronSecret },
          body: "{}",
          signal: AbortSignal.timeout(20000),
        });
      } catch {
        /* SMS records stay in the private outbox for inspection. */
      }
    }
    const input = await request.json().catch(() => ({}));
    const requestedId = input.message_id;
    if (
      requestedId !== undefined &&
      (typeof requestedId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedId))
    )
      return json({ error: "Invalid message id" }, 400);
    if (cron && requestedId) return json({ error: "Manual send requires admin access" }, 403);
    const { data: settings, error: settingError } = await db
      .from("notification_settings")
      .select("daily_enabled")
      .eq("id", 1)
      .single();
    if (settingError) throw settingError;
    if (!requestedId && !settings.daily_enabled)
      return json({
        sent: 0,
        failed: 0,
        reason: "Daily notifications disabled",
      });
    const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    if (!raw) return json({ error: "Firebase credentials not configured" }, 503);
    const account = JSON.parse(raw);
    if (!account.project_id || !account.client_email || !account.private_key)
      return json({ error: "Invalid Firebase configuration" }, 503);
    const now = new Date().toISOString();
    let occurrence = "once";
    let targetId = requestedId;
    if (!targetId) {
      const { data: due, error } = await db.rpc("next_due_notification_push");
      if (error) throw error;
      const next = due?.[0];
      if (!next) return json({ sent: 0, failed: 0, reason: "No scheduled message is due" });
      targetId = next.message_id;
      occurrence = next.occurrence_key;
    }
    const { data: message, error: messageError } = await db
      .from("notification_messages")
      .select("*")
      .eq("id", targetId)
      .eq("published", true)
      .lte("starts_at", now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle();
    if (messageError) throw messageError;
    if (!message) return json({ error: "Message is not active or published" }, 400);
    if (requestedId && message.schedule_mode === "daily") {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Dhaka",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      const value = (name: string) => parts.find((p) => p.type === name)?.value;
      occurrence = `${value("year")}-${value("month")}-${value("day")}`;
    }
    // Obtain a valid FCM access token before claiming the daily device slots.
    const access = await firebaseAccess(account);
    let sent = 0,
      failed = 0,
      attempted = 0,
      finished = false;
    const deadline = Date.now() + 45000;
    do {
      const { data: devices, error: claimError } = await db.rpc(
        "claim_notification_occurrence_devices",
        { _message_id: message.id, _occurrence_key: occurrence },
      );
      if (claimError) throw claimError;
      if (!devices?.length) {
        finished = true;
        break;
      }
      attempted += devices.length;
      for (let offset = 0; offset < (devices?.length ?? 0); offset += 20) {
        await Promise.all(
          devices.slice(offset, offset + 20).map(async (device: { id: string; token: string }) => {
            let status = "failed",
              reason = "";
            try {
              const response = await fetch(
                `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${access}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    message: {
                      token: device.token,
                      notification: {
                        title: message.title_bn,
                        body: message.body_bn.slice(0, 180),
                      },
                      data: {
                        link: message.link || "/",
                        notification_id: message.id,
                      },
                      android: {
                        priority: "high",
                        notification: { channel_id: "ecory_offers" },
                      },
                    },
                  }),
                  signal: AbortSignal.timeout(15000),
                },
              );
              const result = await response.json();
              if (response.ok) {
                sent++;
                status = "sent";
              } else {
                failed++;
                reason = result.error?.status || "FCM error";
                if (
                  result.error?.details?.some(
                    (d: { errorCode?: string }) => d.errorCode === "UNREGISTERED",
                  )
                )
                  await db.from("push_devices").update({ enabled: false }).eq("id", device.id);
              }
            } catch {
              failed++;
              reason = "Network timeout or transport error";
            }
            await db.from("notification_delivery_log").insert({
              device_id: device.id,
              message_id: message.id,
              status,
              error: reason,
            });
          }),
        );
      }
    } while (Date.now() < deadline);
    if (finished) {
      const daily = message.schedule_mode === "daily";
      const { error } = await db
        .from("notification_messages")
        .update(daily ? { last_daily_dispatch: occurrence } : { dispatched_at: now })
        .eq("id", message.id)
        .eq("schedule_mode", daily ? "daily" : "once");
      if (error) throw error;
    }
    return json({
      sent,
      failed,
      attempted,
      message_id: message.id,
      occurrence,
      ...(!attempted
        ? {
            reason:
              message.schedule_mode === "daily"
                ? "আজ এই মেসেজের জন্য নতুন eligible device নেই; একই ফোনে দিনে একবার যাবে।"
                : "এই মেসেজের জন্য নতুন eligible device নেই; একই মেসেজ আবার পাঠানো হয় না।",
          }
        : {}),
    });
  } catch {
    return json(
      {
        error: "Notification delivery failed; inspect server configuration and logs",
      },
      500,
    );
  }
});
