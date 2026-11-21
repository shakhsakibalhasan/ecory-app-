export function loginIdentity(raw: string): { email: string } | { phone: string } | null {
  const value = raw.trim().replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  if (/^\S+@\S+\.\S+$/.test(value)) return { email: value };
  const digits = value.replace(/[\s()+-]/g, "");
  if (/^01\d{9}$/.test(digits)) return { phone: "+88" + digits };
  if (/^8801\d{9}$/.test(digits)) return { phone: "+" + digits };
  return null;
}
