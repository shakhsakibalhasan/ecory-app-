import { createClient } from "npm:@supabase/supabase-js@2";
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("session");
  try {
    if (!id || !/^[0-9a-f-]{36}$/i.test(id))
      return new Response("Invalid session", { status: 400 });
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: session } = await db
      .from("doctor_payment_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!session) return new Response("Session not found", { status: 404 });
    const fields = req.method === "POST" ? await req.formData() : null;
    const valId = String(fields?.get("val_id") || url.searchParams.get("val_id") || "");
    let bookingId: string | undefined;
    if (valId) {
      const base =
        Deno.env.get("SSLCOMMERZ_LIVE") === "true"
          ? "https://securepay.sslcommerz.com"
          : "https://sandbox.sslcommerz.com";
      const q = new URLSearchParams({
        val_id: valId,
        store_id: Deno.env.get("SSLCOMMERZ_STORE_ID") || "",
        store_passwd: Deno.env.get("SSLCOMMERZ_STORE_PASSWORD") || "",
        v: "1",
        format: "json",
      });
      const r = await fetch(base + "/validator/api/validationserverAPI.php?" + q, {
        signal: AbortSignal.timeout(20000),
      });
      const v = await r.json();
      if (
        !r.ok ||
        !["VALID", "VALIDATED"].includes(v.status) ||
        v.tran_id !== session.transaction_id ||
        v.currency !== "BDT" ||
        !Number.isFinite(Number(v.amount)) ||
        Math.abs(Number(v.amount) - session.amount) >= 0.01 ||
        String(v.risk_level ?? "1") !== "0"
      )
        return new Response("Payment not verified. Contact Ecory support.", { status: 400 });
      const done = await db.rpc("complete_doctor_gateway_payment", {
        _session_id: session.id,
        _transaction_id: String(v.bank_tran_id || v.tran_id),
      });
      if (done.error) return new Response("Payment verification requires retry", { status: 500 });
      bookingId = done.data;
    } else if (url.searchParams.get("result") === "success")
      return new Response("Payment verification pending. Check My bookings.", { status: 202 });
    if (!url.searchParams.has("result")) return new Response("OK");
    const path = bookingId ? "/doctor-booking/" + bookingId : "/doctor-bookings";
    return Response.redirect("https://ecory.app" + path, 303);
  } catch {
    return new Response("Payment verification unavailable. Contact Ecory support.", {
      status: 500,
    });
  }
});
