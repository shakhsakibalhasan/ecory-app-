import { EditableIcon } from "@/lib/presentation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Mail, UserRound, MapPin, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requirePhonePasswordSetup } from "@/lib/phone-password-auth";
import { loginIdentity } from "@/lib/customer-identity";
import { useSettings, useStore } from "@/lib/store";
import { BrandImage, useBranding } from "@/lib/branding";

export function CustomerAuth({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const { lang } = useStore(),
    bn = lang === "bn";
  const { data: settings } = useSettings();
  const { data: branding } = useBranding();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [method, setMethod] = useState<"otp" | "password">("password");
  const [f, setF] = useState({
    name: "",
    identity: "",
    address: "",
    phone: "",
    password: "",
    confirm: "",
    terms: false,
  });
  const [show, setShow] = useState(false),
    [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [token, setToken] = useState("");
  const [destination, setDestination] = useState<ReturnType<typeof loginIdentity>>(null);
  const [verifyType, setVerifyType] = useState<"sms" | "email" | "signup">("email");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const changeMode = (m: "in" | "up") => {
    setMode(m);
    setSent(false);
    setToken("");
    setDestination(null);
  };
  const complete = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && mode === "up") {
      const phone = (user.phone || user.user_metadata?.["phone"] || f.phone).replace(/^\+88/, "");
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: f.name.trim(),
          email: user.email ?? "",
          phone,
          updated_at: new Date().toISOString(),
        });
      if (error)
        toast.error(
          bn
            ? "অ্যাকাউন্ট তৈরি হয়েছে, প্রোফাইল সেভ আবার চেষ্টা করুন"
            : "Account created; please retry saving your profile",
        );

    }
    await qc.invalidateQueries({ queryKey: ["profile"] });
    await qc.invalidateQueries({ queryKey: ["addresses"] });
    toast.success(bn ? "লগইন সফল" : "Logged in");
    onDone();
  };
  const submit = async () => {
    const identity = sent ? destination : loginIdentity(f.identity);
    if (!identity)
      return void toast.error(
        bn
          ? "সঠিক ইমেইল অথবা বাংলাদেশের ফোন নম্বর দিন"
          : "Enter a valid email or Bangladesh phone number",
      );
    if ("phone" in identity && method === "otp" && mode === "in" && !settings?.phone_auth_enabled)
      return void toast.error(
        bn
          ? "SMS OTP এখনো চালু হয়নি। নম্বর ও পাসওয়ার্ড দিয়ে লগইন করুন।"
          : "SMS OTP is not enabled yet. Use your phone number and password.",
      );
    if (sent && !/^\d{6,10}$/.test(token))
      return void toast.error(bn ? "পাঠানো OTP লিখুন" : "Enter the OTP you received");
    if (!sent && (mode === "up" || method === "password") && f.password.length < 6)
      return void toast.error(
        bn ? "কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন" : "Password must have at least 6 characters",
      );
    if (
      !sent &&
      mode === "up" &&
      (!f.name.trim() || f.address.trim().length < 5 || f.password !== f.confirm || !f.terms)
    )
      return void toast.error(
        bn
          ? "নাম, পূর্ণ ঠিকানা, মিল থাকা পাসওয়ার্ড ও শর্তে সম্মতি দিন"
          : "Enter name, address, matching passwords and accept the terms",
      );
    if (!sent && mode === "up" && f.phone && !/^01\d{9}$/.test(f.phone))
      return void toast.error(bn ? "সঠিক মোবাইল নম্বর দিন" : "Enter a valid mobile number");
    setBusy(true);
    try {
      if (!sent && "phone" in identity && mode === "up" && !settings?.phone_auth_enabled) await requirePhonePasswordSetup();
      if (sent) {
        const { error } = await supabase.auth.verifyOtp(
          "phone" in identity
            ? { phone: identity.phone, token, type: "sms" }
            : { email: identity.email, token, type: verifyType === "signup" ? "signup" : "email" },
        );
        if (error) throw error;
        await complete();
      } else if (mode === "up") {
        setDestination(identity);
        const options = {
          data: {
            phone_verification_mode: "phone" in identity ? (settings?.phone_auth_enabled ? "otp_requested" : "password_only_unverified") : "not_applicable",
            full_name: f.name.trim(),
            phone: "phone" in identity ? identity.phone : f.phone,
            address: f.address.trim(),
            terms_accepted_at: new Date().toISOString(),
          },
          emailRedirectTo: `${window.location.origin}/profile`,
        };
        const { data, error } = await supabase.auth.signUp({
          ...identity,
          password: f.password,
          options,
        });
        if (error) throw error;
        if (data.session) await complete();
        else {
          setVerifyType("phone" in identity ? "sms" : "signup");
          setSent(true);
          setCooldown(60);
          toast.info(
            bn
              ? "পাঠানো কোড অথবা ইমেইলের লিংক দিয়ে অ্যাকাউন্ট নিশ্চিত করুন"
              : "Use the code or email confirmation link to confirm your account",
          );
        }
      } else if (method === "password") {
        const { error } = await supabase.auth.signInWithPassword({
          ...identity,
          password: f.password,
        });
        if (error) throw error;
        await complete();
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          ...identity,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${window.location.origin}/profile`,
          },
        });
        if (error) throw error;
        setDestination(identity);
        setVerifyType("phone" in identity ? "sms" : "email");
        setSent(true);
        setCooldown(60);
        toast.success(bn ? "কোড / লগইন লিংক পাঠানো হয়েছে" : "Code / sign-in link sent");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const field = "ecory-auth-field flex min-h-12 items-center gap-3 border px-3";
  return (
    <div className={`customer-auth mx-auto max-w-sm pb-6 ${mode === "in" ? "ecory-auth-login" : "ecory-auth-signup"}`}>
      <div className="ecory-auth-logo mx-auto mb-6 flex h-20 w-44 items-center justify-center px-5 py-3">
      <BrandImage
        src={branding?.app_logo}
        alt={bn ? (branding?.name_bn ?? "ইকোরি") : (branding?.name_en ?? "Ecory")}
        className="h-full max-w-full object-contain"
      />
      </div>
      <h2 className="text-center text-[28px] font-bold leading-tight">
        {mode === "up"
          ? bn
            ? "অ্যাকাউন্ট খুলুন"
            : "Create Account"
          : bn
            ? "আবার স্বাগতম!"
            : "Welcome Back!"}
      </h2>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        {mode === "up"
          ? bn
            ? "কেনাকাটা শুরু করতে অ্যাকাউন্ট খুলুন"
            : "Sign up to start shopping"
          : bn
            ? "কেনাকাটা চালিয়ে যেতে লগইন করুন"
            : "Sign in to continue shopping"}
      </p>
      <form
        className="ecory-auth-form mt-7 space-y-3.5 bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {mode === "in" && !sent && (
          <div
            className="ecory-auth-tabs grid grid-cols-2 gap-1 bg-muted p-1"
            role="tablist"
            aria-label={bn ? "লগইন পদ্ধতি" : "Login method"}
          >
            {(["otp", "password"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={method === m}
                onClick={() => setMethod(m)}
                className={`ecory-auth-tab py-2.5 text-sm font-bold ${method === m ? "bg-primary text-ink" : ""}`}
              >
                {m === "otp" ? "OTP" : bn ? "পাসওয়ার্ড" : "Password"}
              </button>
            ))}
          </div>
        )}
        {sent ? (
          <>
            <p className="break-all text-xs text-muted-foreground">
              {bn ? "কোড / লিংক পাঠানো হয়েছে" : "Code / link sent to"}:{" "}
              {destination && ("phone" in destination ? destination.phone : destination.email)}
            </p>
            <label className={field}>
              <EditableIcon name="icon_mail"><Mail size={18} /></EditableIcon>
              <input
                aria-label="OTP"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                maxLength={10}
                autoComplete="one-time-code"
                placeholder={bn ? "OTP লিখুন" : "Enter OTP"}
                className="min-w-0 w-full bg-transparent py-3 text-sm outline-none"
              />
            </label>
            <button
              type="button"
              disabled={busy || cooldown > 0}
              onClick={() => {
                setSent(false);
                setToken("");
              }}
              className="text-xs underline disabled:opacity-50"
            >
              {cooldown
                ? `${bn ? "আবার চেষ্টা" : "Try again"} (${cooldown}s)`
                : bn
                  ? "নম্বর / ইমেইল বদলান বা আবার পাঠান"
                  : "Change email / phone or resend"}
            </button>
          </>
        ) : (
          <>
            {mode === "up" && (
              <label className={field}>
                <EditableIcon name="icon_user_round"><UserRound size={18} /></EditableIcon>
                <input
                  aria-label={bn ? "আপনার নাম" : "Full name"}
                  autoComplete="name"
                  maxLength={100}
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                  placeholder={bn ? "আপনার নাম" : "Full name"}
                  className="min-w-0 w-full bg-transparent py-3 text-sm outline-none"
                />
              </label>
            )}
            <label className={field}>
              <EditableIcon name="icon_mail"><Mail size={18} /></EditableIcon>
              <input
                aria-label={bn ? "ইমেইল অথবা ফোন" : "Email or phone"}
                autoComplete="username"
                maxLength={255}
                value={f.identity}
                onChange={(e) => setF({ ...f, identity: e.target.value })}
                placeholder={bn ? "ইমেইল অথবা ফোন" : "Email or Phone"}
                className="min-w-0 w-full bg-transparent py-3 text-sm outline-none"
              />
            </label>
            {mode === "up" && (
              <>
                <label className={field}>
                  <EditableIcon name="icon_map_pin"><MapPin size={18} /></EditableIcon>
                  <textarea
                    aria-label={bn ? "পূর্ণ ঠিকানা" : "Full address"}
                    autoComplete="street-address"
                    rows={2}
                    maxLength={500}
                    value={f.address}
                    onChange={(e) => setF({ ...f, address: e.target.value })}
                    placeholder={bn ? "পূর্ণ ঠিকানা" : "Address"}
                    className="min-w-0 w-full bg-transparent py-3 text-sm outline-none"
                  />
                </label>
                {!loginIdentity(f.identity) || !("phone" in (loginIdentity(f.identity) ?? {})) ? (
                  <label className={field}>
                    <input
                      aria-label={bn ? "ডেলিভারির মোবাইল (ঐচ্ছিক)" : "Delivery phone (optional)"}
                      inputMode="tel"
                      value={f.phone}
                      maxLength={11}
                      onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, "") })}
                      placeholder={bn ? "ডেলিভারির মোবাইল (ঐচ্ছিক)" : "Delivery phone (optional)"}
                      className="w-full bg-transparent py-3 text-sm outline-none"
                    />
                  </label>
                ) : null}
              </>
            )}
            {(mode === "up" || method === "password") && (
              <label className={field}>
                <EditableIcon name="icon_lock_keyhole"><LockKeyhole size={18} /></EditableIcon>
                <input
                  aria-label={bn ? "পাসওয়ার্ড" : "Password"}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  type={show ? "text" : "password"}
                  value={f.password}
                  onChange={(e) => setF({ ...f, password: e.target.value })}
                  placeholder={bn ? "পাসওয়ার্ড" : "Password"}
                  className="min-w-0 w-full bg-transparent py-3 text-sm outline-none"
                />
                <button
                  type="button"
                  aria-label={
                    bn
                      ? show
                        ? "পাসওয়ার্ড লুকান"
                        : "পাসওয়ার্ড দেখুন"
                      : show
                        ? "Hide password"
                        : "Show password"
                  }
                  onClick={() => setShow(!show)}
                >
                  {show ? <EditableIcon name="icon_eye_off"><EyeOff size={18} /></EditableIcon> : <EditableIcon name="icon_eye"><Eye size={18} /></EditableIcon>}
                </button>
              </label>
            )}
            {mode === "up" && (
              <>
                <label className={field}>
                  <EditableIcon name="icon_lock_keyhole"><LockKeyhole size={18} /></EditableIcon>
                  <input
                    aria-label={bn ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm Password"}
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={f.confirm}
                    onChange={(e) => setF({ ...f, confirm: e.target.value })}
                    placeholder={bn ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm Password"}
                    className="min-w-0 w-full bg-transparent py-3 text-sm outline-none"
                  />
                  <button
                    type="button"
                    aria-label={
                      bn ? "নিশ্চিত পাসওয়ার্ড দেখুন / লুকান" : "Show / hide confirm password"
                    }
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EditableIcon name="icon_eye_off"><EyeOff size={18} /></EditableIcon> : <EditableIcon name="icon_eye"><Eye size={18} /></EditableIcon>}
                  </button>
                </label>
                <label className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={f.terms}
                    onChange={(e) => setF({ ...f, terms: e.target.checked })}
                  />
                  <span>
                    {bn ? "আমি সম্মত" : "I agree to the"}{" "}
                    <Link to="/privacy" className="font-bold text-accent-foreground underline">
                      {bn ? "শর্তাবলি" : "Terms and Conditions"}
                    </Link>
                  </span>
                </label>
              </>
            )}
          </>
        )}
        <button
          disabled={busy}
          className="ecory-auth-submit flex min-h-12 w-full items-center justify-center gap-2 bg-primary px-3 py-3 text-sm font-bold text-ink disabled:opacity-60"
        >
          {busy && <EditableIcon name="icon_loader2"><Loader2 size={16} className="animate-spin" /></EditableIcon>}
          {sent
            ? bn
              ? "OTP নিশ্চিত করুন"
              : "Verify OTP"
            : mode === "up"
              ? bn
                ? "অ্যাকাউন্ট খুলুন"
                : "Create Account"
              : method === "otp"
                ? bn
                  ? "OTP পাঠান"
                  : "Send OTP"
                : bn
                  ? "লগইন"
                  : "Log in"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm">
        {mode === "in"
          ? bn
            ? "অ্যাকাউন্ট নেই?"
            : "Don't have an account?"
          : bn
            ? "আগেই অ্যাকাউন্ট আছে?"
            : "Already have an account?"}{" "}
        <button
          type="button"
          disabled={busy}
          onClick={() => changeMode(mode === "in" ? "up" : "in")}
          className="font-bold text-accent-foreground"
        >
          {mode === "in" ? (bn ? "অ্যাকাউন্ট খুলুন" : "Sign Up") : bn ? "লগইন" : "Log In"}
        </button>
      </p>
    </div>
  );
}

