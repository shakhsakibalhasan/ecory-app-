// WhatsApp click-to-chat accepts an international phone number, never a username.
export function whatsappNumber(value: string): string {
  let input = value.trim().replace(/[০-৯]/g, c => String("০১২৩৪৫৬৭৮৯".indexOf(c)));
  if (/^https?:\/\//i.test(input)) {
    try {
      const url = new URL(input);
      if (url.hostname === "wa.me") input = url.pathname.slice(1);
      else if (["api.whatsapp.com", "web.whatsapp.com"].includes(url.hostname) && url.pathname === "/send") input = url.searchParams.get("phone") || "";
      else return "";
    } catch { return ""; }
  }
  if (!/^[+\d\s().-]+$/.test(input)) return "";
  let number = input.replace(/\D/g, "");
  if (number.startsWith("00")) number = number.slice(2);
  if (/^01\d{9}$/.test(number)) number = "88" + number;
  else if (/^1\d{9}$/.test(number)) number = "880" + number;
  return /^[1-9]\d{7,14}$/.test(number) ? number : "";
}
export function whatsappLink(value: string, message?: string): string {
  const number = whatsappNumber(value);
  return number ? `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}` : "";
}
