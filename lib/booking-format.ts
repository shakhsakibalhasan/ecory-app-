export function bookingTime(value: string | null | undefined): string {
  if (!value) return "—";
  const [h = "0", m = "00"] = value.split(":");
  const hour = Number(h);
  return `${hour % 12 || 12}:${m.padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}
export function bookingDate(value: string | null | undefined, bn: boolean): string {
  if (!value) return bn ? "নিশ্চিত করা হবে" : "To be confirmed";
  return new Intl.DateTimeFormat(bn ? "bn-BD" : "en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00+06:00`));
}
export function bookingTimestamp(value: string, bn: boolean): string {
  return new Intl.DateTimeFormat(bn ? "bn-BD" : "en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}
export function bookingStatus(status: string, bn: boolean): string {
  const labels: Record<string, [string, string]> = {
    requested: ["অনুরোধ জমা হয়েছে", "Request submitted"],
    confirmed: ["গ্রহণ করা হয়েছে", "Accepted"],
    completed: ["সম্পন্ন হয়েছে", "Completed"],
    cancelled: ["বাতিল করা হয়েছে", "Cancelled"],
    unpaid: ["ফি বাকি", "Unpaid"],
    paid: ["ফি দেওয়া হয়েছে", "Paid"],
    free: ["বিনামূল্যে", "Free"],
  };
  return labels[status]?.[bn ? 0 : 1] || status;
}
