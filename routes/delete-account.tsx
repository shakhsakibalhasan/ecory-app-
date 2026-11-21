import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Shell } from "@/components/Shell";
import { useStore } from "@/lib/store";
import { deletionEmail, PRIVACY_CONTACT } from "@/lib/privacy-content";

export const Route = createFileRoute("/delete-account")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:title", content: "Delete account and data — Ecory" }, { property: "og:description", content: "Request deletion of your Ecory account and personal data. No app installation required." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
      { title: "Delete account and data — Ecory" },
      {
        name: "description",
        content:
          "Request deletion of your Ecory account and personal data. No app installation required.",
      },
    ],
  }),
  component: DeleteAccount,
});

function DeleteAccount() {
  const { lang } = useStore();
  const bn = lang === "bn";
  const [name, setName] = useState("");
  const [identity, setIdentity] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const email = deletionEmail(name, identity, notes);
  const input =
    "mt-1 w-full rounded-xl border border-border bg-white px-3 py-3 text-black outline-none focus:ring-2 focus:ring-primary";
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identity.trim() || !confirmed) return;
    setPrepared(true);
    setCopyState("idle");
  }
  return (
    <Shell title={bn ? "অ্যাকাউন্ট মুছে দেওয়ার আবেদন" : "Delete account request"}>
      <article className="space-y-4 rounded-2xl bg-white p-4 text-sm leading-7 text-black">
        <h1 className="text-xl font-bold">
          {bn ? "Ecory অ্যাকাউন্ট ও তথ্য মুছে দিন" : "Delete your Ecory account and data"}
        </h1>
        <p>
          {bn
            ? "অ্যাপ install বা login ছাড়াই এই পেজ থেকে ইমেইলে আবেদন করতে পারেন। Ecory support মালিকানা যাচাই করে আবেদন প্রক্রিয়া করবে।"
            : "Request deletion by email without installing the app or logging in. Ecory support verifies ownership and processes the request."}
        </p>
        <section>
          <h2 className="font-semibold">
            {bn ? "আবেদনে কী অন্তর্ভুক্ত হবে" : "What the request covers"}
          </h2>
          <p>
            {bn
              ? "Login account, profile, সংরক্ষিত ঠিকানা, favourites এবং সংশ্লিষ্ট ব্যক্তিগত তথ্য। Booking বা spin-এ অন্য নম্বর ব্যবহার করলে সেটিও উল্লেখ করুন, যাতে সংশ্লিষ্ট তথ্য খুঁজে পাওয়া যায়।"
              : "Your login account, profile, saved addresses, favourites and associated personal information. Mention other phone numbers used for bookings or spins so related records can be identified."}
          </p>
          <p className="mt-2">
            {bn
              ? "চলমান লেনদেন, হিসাব, বিরোধ, নিরাপত্তা বা আইনগত কারণে সীমিত রেকর্ড রাখতে হলে support কারণ ও প্রযোজ্য সময় জানাবে। Uninstall করলে account মুছে যায় না।"
              : "If limited records must be retained for ongoing transactions, accounting, disputes, security or legal requirements, support explains why and the applicable period. Uninstalling does not delete your account."}
          </p>
        </section>
        <form onSubmit={prepare} className="space-y-3">
          <label className="block">
            {bn ? "নাম (ঐচ্ছিক)" : "Name (optional)"}
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setPrepared(false);
              }}
              maxLength={120}
              autoComplete="name"
              className={input}
            />
          </label>
          <label className="block">
            {bn ? "অ্যাকাউন্টে ব্যবহৃত ইমেইল বা ফোন নম্বর" : "Registered email or phone number"}
            <input
              required
              value={identity}
              onChange={(e) => {
                setIdentity(e.target.value);
                setPrepared(false);
              }}
              maxLength={254}
              autoComplete="username"
              className={input}
            />
          </label>
          <label className="block">
            {bn
              ? "অতিরিক্ত তথ্য (ঐচ্ছিক; password, PIN বা OTP দেবেন না)"
              : "Additional details (optional; never include passwords, PINs or OTPs)"}
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setPrepared(false);
              }}
              maxLength={1500}
              rows={3}
              className={input}
            />
          </label>
          <label className="flex items-start gap-2">
            <input
              required
              type="checkbox"
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked);
                setPrepared(false);
              }}
              className="mt-2 shrink-0"
            />
            <span>
              {bn
                ? "আমি account ও সংশ্লিষ্ট ব্যক্তিগত তথ্য মুছে দেওয়ার আবেদন করছি। সম্পন্ন হলে account access ও সংরক্ষিত সুবিধা হারাতে পারি।"
                : "I request deletion of this account and associated personal data. Once completed, account access and saved benefits may be lost."}
            </span>
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"
          >
            {bn ? "আবেদনের ইমেইল তৈরি করুন" : "Prepare request email"}
          </button>
        </form>
        {prepared && confirmed && (
          <section aria-live="polite" className="space-y-3 rounded-xl border border-primary/30 p-3">
            <p className="font-semibold">
              {bn
                ? "ইমেইল অ্যাপে গিয়ে Send চাপতে হবে। এখনো আবেদন পাঠানো বা account মুছে দেওয়া হয়নি।"
                : "Press Send in your email app. The request has not been sent and the account has not been deleted."}
            </p>
            <a
              href={email.href}
              className="block rounded-xl bg-primary px-4 py-3 text-center font-semibold text-primary-foreground"
            >
              {bn ? "ইমেইল অ্যাপ খুলুন" : "Open email app"}
            </a>
            <p>
              {bn
                ? "ইমেইল অ্যাপ না খুললে লেখাটি কপি করে নিজে পাঠান:"
                : "If no email app opens, copy the message and send it yourself:"}{" "}
              <a className="break-all underline" href={`mailto:${PRIVACY_CONTACT.email}`}>
                {PRIVACY_CONTACT.email}
              </a>
            </p>
            <textarea
              aria-label={bn ? "আবেদনের লেখা" : "Request text"}
              readOnly
              value={email.body}
              rows={8}
              className={input}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              className="underline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(email.body);
                  setCopyState("copied");
                } catch {
                  setCopyState("manual");
                }
              }}
            >
              {copyState === "copied"
                ? bn
                  ? "কপি হয়েছে"
                  : "Copied"
                : bn
                  ? "লেখা কপি করুন"
                  : "Copy message"}
            </button>
            {copyState === "manual" && (
              <p>
                {bn
                  ? "উপরের লেখা চেপে ধরে Select all → Copy করুন।"
                  : "Select the text above and use Select all → Copy."}
              </p>
            )}
          </section>
        )}
        <p>
          {bn
            ? "ইমেইল পাওয়ার পর support মালিকানা যাচাই, পরবর্তী ধাপ ও completion জানাবে। Password, PIN বা OTP পাঠাবেন না।"
            : "After receiving your email, support explains ownership verification, next steps and completion. Never send passwords, PINs or OTPs."}
        </p>
        <p>{bn ? PRIVACY_CONTACT.addressBn : PRIVACY_CONTACT.address}</p>
        <a className="block break-all underline" href={`mailto:${PRIVACY_CONTACT.email}`}>
          {PRIVACY_CONTACT.email}
        </a>
        <Link to="/privacy" className="block underline">
          {bn ? "গোপনীয়তা নীতি পড়ুন" : "Read Privacy Policy"}
        </Link>
      </article>
    </Shell>
  );
}
