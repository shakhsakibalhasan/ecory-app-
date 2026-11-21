export function legacyPaymentUpdate(
  booking: { payment_status: string; fee: number | null },
  isLegacy: boolean,
  received: boolean,
) {
  return isLegacy && received && booking.payment_status === "unpaid" && (booking.fee ?? 0) > 0
    ? { payment_status: "paid" }
    : {};
}