import { createClient } from "npm:@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
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
    const bearer = req.headers.get("authorization")?.replace(/^Bearer /i, "");
    if (!bearer) return json({ error: "Sign in first" }, 401);
    const { data: user, error: authError } = await db.auth.getUser(bearer);
    if (authError || !user.user) return json({ error: "Sign in first" }, 401);
    const enabled = Deno.env.get("PAYMENT_ENABLED") === "true";
    const store = Deno.env.get("SSLCOMMERZ_STORE_ID"),
      password = Deno.env.get("SSLCOMMERZ_STORE_PASSWORD");
    if (!enabled || !store || !password)
      return json({ error: "Payment gateway is not configured" }, 503);
    const input = await req.json();
    if (input.action === "ready") return json({ ready: true });
    const { intent_id, email, method } = input;
    if (
      typeof intent_id !== "string" ||
      typeof email !== "string" ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      !["bkash", "online", "nagad"].includes(method)
    )
      return json({ error: "Invalid request" }, 400);
    const { data: i, error } = await db
      .from("doctor_booking_intents")
      .select("*")
      .eq("id", intent_id)
      .eq("user_id", user.user.id)
      .maybeSingle();
    if (error || !i || i.booking_id || i.amount <= 0)
      return json({ error: "Checkout not available" }, 404);
    const { data: settings } = await db
      .from("site_settings")
      .select("payments")
      .eq("id", 1)
      .single();
    if (settings?.payments?.[method] !== true)
      return json({ error: "Payment method disabled" }, 400);
    const { data: old } = await db
      .from("doctor_payment_sessions")
      .select("*")
      .eq("intent_id", i.id)
      .maybeSingle();
    if (old) {
      if (old.method !== method)
        return json(
          {
            error:
              "A payment is already pending with another method. Check My bookings or contact support.",
          },
          409,
        );
      if (old.status === "pending" && old.gateway_url) return json({ url: old.gateway_url });
      return json(
        { error: "Payment is processing. Check My bookings or contact support before retrying." },
        409,
      );
    }
    const session = {
      id: crypto.randomUUID(),
      intent_id: i.id,
      transaction_id: crypto.randomUUID().replaceAll("-", "").slice(0, 24),
      amount: i.amount,
      method,
      status: "creating",
    };
    const ins = await db.from("doctor_payment_sessions").insert(session);
    if (ins.error) return json({ error: "Payment already being prepared" }, 409);
    const base =
      Deno.env.get("SSLCOMMERZ_LIVE") === "true"
        ? "https://securepay.sslcommerz.com"
        : "https://sandbox.sslcommerz.com";
    const callback = `${Deno.env.get("SUPABASE_URL")}/functions/v1/doctor-payment-callback?session=${session.id}`;
    const form = new URLSearchParams({
      store_id: store,
      store_passwd: password,
      total_amount: String(i.amount),
      currency: "BDT",
      tran_id: session.transaction_id,
      success_url: callback + "&result=success",
      fail_url: callback + "&result=failed",
      cancel_url: callback + "&result=cancelled",
      ipn_url: callback,
      cus_name: i.patient.name,
      cus_email: email,
      cus_add1: i.patient.address,
      cus_city: "Bangladesh",
      cus_country: "Bangladesh",
      cus_phone: i.patient.phone,
      shipping_method: "NO",
      num_of_item: "1",
      product_name: "Ecory doctor consultation",
      product_category: "Consultation",
      product_profile: "general",
    });
    if (method !== "online") form.set("multi_card_name", method);
    const response = await fetch(base + "/gwprocess/v4/api.php", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(20000),
    });
    const gateway = await response.json();
    const target = new URL(gateway.GatewayPageURL || "https://invalid.invalid");
    if (
      !response.ok ||
      gateway.status !== "SUCCESS" ||
      target.protocol !== "https:" ||
      !(target.hostname === "sslcommerz.com" || target.hostname.endsWith(".sslcommerz.com"))
    )
      return json({ error: "Provider could not prepare checkout. Contact support." }, 502);
    const saved = await db
      .from("doctor_payment_sessions")
      .update({ status: "pending", gateway_url: target.href, provider_session: gateway.sessionkey })
      .eq("id", session.id);
    if (saved.error) return json({ error: "Could not save payment session" }, 500);
    return json({ url: target.href });
  } catch {
    return json({ error: "Payment service unavailable. Check My bookings before retrying." }, 500);
  }
});
