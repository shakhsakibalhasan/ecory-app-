export type DoctorSchedule = {
  date_enabled: boolean;
  time_enabled: boolean;
  dates: string[];
  times: string[];
};
export function doctorSchedule(value: unknown): DoctorSchedule {
  const s = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    date_enabled: s["date_enabled"] === true,
    time_enabled: s["time_enabled"] === true,
    dates: Array.isArray(s["dates"])
      ? s["dates"].filter((x): x is string => typeof x === "string")
      : [],
    times: Array.isArray(s["times"])
      ? s["times"].filter((x): x is string => typeof x === "string")
      : [],
  };
}
export const dhakaToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
// Date/time are independent customer choices; no Admin slot list is required.
export function scheduleError(_value: unknown): string | null {
  return null;
}
export function shiftBookingDay(value: string, days: number): string {
  const d = new Date(value + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function validBookingChoice(config: unknown, date: string, time: string): boolean {
  const s = doctorSchedule(config);
  if (
    s.date_enabled &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date + "T12:00:00Z")) ||
      new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date ||
      date < dhakaToday())
  )
    return false;
  if (s.time_enabled && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return false;
  if (
    s.date_enabled &&
    s.time_enabled &&
    new Date(`${date}T${time}:00+06:00`).getTime() <= Date.now()
  )
    return false;
  return true;
}
