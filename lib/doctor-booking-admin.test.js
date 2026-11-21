import { test, expect, beforeAll, afterAll } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { legacyPaymentUpdate } from "./doctor-booking-admin.ts";

const db = new PGlite();
const id = "00000000-0000-0000-0000-000000000001";
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${id}'::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated'::text $$;
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.is_admin', true), '') = 'yes' $$;
    CREATE TABLE public.doctor_bookings(id uuid, status text, payment_status text, fee integer, preferred_date date, preferred_time time, serial_number text);
    CREATE TABLE public.doctor_booking_intents(id uuid, booking_id uuid);`);
  await db.exec(await readFile(new URL("../../drizzle/migrations/0001_repair_legacy_doctor_booking_payment.sql", import.meta.url), "utf8"));
  await db.exec(`CREATE TRIGGER guard BEFORE INSERT OR UPDATE ON doctor_bookings FOR EACH ROW EXECUTE FUNCTION guard_doctor_confirmation();`);
});
afterAll(() => db.close());

async function scenario({ admin = true, linked = false, status = "requested" } = {}, run) {
  await db.exec("BEGIN");
  try {
    await db.exec(`SET LOCAL test.is_admin = '${admin ? "yes" : "no"}';
      INSERT INTO doctor_bookings VALUES ('${id}', 'requested', 'unpaid', 500, '2026-11-05', '10:00', '');`);
    if (status === "confirmed") {
      await db.exec("ALTER TABLE doctor_bookings DISABLE TRIGGER guard");
      await db.exec("UPDATE doctor_bookings SET status = 'confirmed'");
      await db.exec("ALTER TABLE doctor_bookings ENABLE TRIGGER guard");
    }
    if (linked) await db.exec(`INSERT INTO doctor_booking_intents VALUES ('${id}', '${id}')`);
    await run();
  } finally { await db.exec("ROLLBACK"); }
}

test("an admin can record a legacy fee receipt and confirm atomically", async () => {
  await scenario({}, async () => {
    await db.exec("UPDATE doctor_bookings SET payment_status='paid', status='confirmed', serial_number='17'");
    expect((await db.query("SELECT payment_status,status,serial_number FROM doctor_bookings")).rows[0]).toEqual({payment_status:"paid",status:"confirmed",serial_number:"17"});
    await db.exec("UPDATE doctor_bookings SET status='completed'");
  });
});
test("an already confirmed unpaid booking can be rescheduled without declaring payment", async () => {
  await scenario({status:"confirmed"}, async () => {
    await db.exec("UPDATE doctor_bookings SET serial_number='18', preferred_date='2026-11-06'");
    expect((await db.query("SELECT payment_status,serial_number,preferred_date::text FROM doctor_bookings")).rows[0]).toEqual({payment_status:"unpaid",serial_number:"18",preferred_date:"2026-11-06"});
  });
});
test("unpaid bookings cannot newly confirm or complete", async () => {
  for (const status of ["confirmed", "completed"]) await scenario({}, async () => {
    await expect(db.exec(`UPDATE doctor_bookings SET status='${status}'`)).rejects.toThrow("Verify payment before confirming");
  });
});
test("customers cannot record legacy payment receipts", async () => {
  await scenario({admin:false}, async () => {
    await expect(db.exec("UPDATE doctor_bookings SET payment_status='paid'")).rejects.toThrow("Only an admin");
  });
});
test("admins cannot manually mark gateway-linked bookings paid", async () => {
  await scenario({linked:true}, async () => {
    await expect(db.exec("UPDATE doctor_bookings SET payment_status='paid'")).rejects.toThrow("online payments require gateway verification");
  });
});
test("confirmation still requires an appointment date and time", async () => {
  await scenario({}, async () => {
    await expect(db.exec("UPDATE doctor_bookings SET payment_status='paid',status='confirmed',preferred_time=NULL")).rejects.toThrow("Set appointment date and time");
  });
});
test("saving logistics omits payment status unless a legacy receipt is explicitly checked", () => {
  const booking = {payment_status:"unpaid",fee:500};
  expect(legacyPaymentUpdate(booking,true,true)).toEqual({payment_status:"paid"});
  expect(legacyPaymentUpdate(booking,true,false)).toEqual({});
  expect(legacyPaymentUpdate(booking,false,true)).toEqual({});
});