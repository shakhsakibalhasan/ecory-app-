import { fetchWithTimeout } from "./request-timeout";

/** Fail before a signup can send SMS when the hosted auth config is still in OTP mode. */
export async function requirePhonePasswordSetup() {
  const url = import.meta.env["VITE_SUPABASE_URL"] || (typeof process !== "undefined" ? process.env["SUPABASE_URL"] : undefined);
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || (typeof process !== "undefined" ? process.env["SUPABASE_PUBLISHABLE_KEY"] : undefined);
  if (!url || !key) throw new Error("Account service configuration পাওয়া যায়নি।");
  const response = await fetchWithTimeout(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  if (!response.ok) throw new Error("Account service পাওয়া যায়নি। আবার চেষ্টা করুন।");
  const settings = await response.json() as { external?: { phone?: boolean }; phone_autoconfirm?: boolean };
  if (!settings.external?.phone || settings.phone_autoconfirm !== true)
    throw new Error("OTP ছাড়া নম্বর দিয়ে account খুলতে Cloud → Users → Auth settings → Phone-এ Auto-confirm SMS চালু করতে হবে। এখনই SMS পাঠানো হয়নি।");
}
