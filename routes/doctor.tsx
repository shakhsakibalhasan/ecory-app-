import { DoctorReviews, useDoctorRating } from "@/components/DoctorReviews";
import { DoctorCertificates } from "@/components/DoctorCertificates";
import { DoctorProfileFacts, DoctorServiceList } from "@/components/DoctorProfileCopy";
import "@/doctor.css";
import {
  Star,
  MessageSquare,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  GraduationCap,
  Users,
  BadgeCheck,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, ChevronRight, Stethoscope, Share2, Heart, ShieldCheck, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { DoctorBooking } from "@/components/DoctorBooking";
import { BDT, contentText, pick, useStore, useTable } from "@/lib/store";
import { uiClient } from "@/lib/presentation";
import { useSession } from "@/lib/auth";
import { useQuery } from "@/lib/query";
export const Route = createFileRoute("/doctor")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "ডাক্তারের পরামর্শ — ইকোরি" },
      { name: "description", content: "ইকোরির ডাক্তারদের পরিচিতি ও পরামর্শ-সংক্রান্ত তথ্য দেখুন।" },
      { property: "og:title", content: "ডাক্তারের পরামর্শ — ইকোরি" },
      {
        property: "og:description",
        content: "ইকোরির ডাক্তারদের পরিচিতি ও পরামর্শ-সংক্রান্ত তথ্য দেখুন।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    doctor: typeof s["doctor"] === "string" ? s["doctor"] : undefined,
  }),
  component: Doctor,
});
function Doctor() {
  const { doctor: id } = Route.useSearch();
  const { lang } = useStore(),
    bn = lang === "bn";
  const { user } = useSession();
  const doctorRating = useDoctorRating(id);
  const { data: doctors = [], isLoading, error, refetch } = useTable("doctors");
  const [mode, setMode] = useState<"phone" | "in_person">("phone"),
    [tab, setTab] = useState<"info" | "experience" | "reviews">("info"),
    [open, setOpen] = useState(0),
    [calling, setCalling] = useState(false),
    [saved, setSaved] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [filterOpen, setFilterOpen] = useState(false),
    [specialty, setSpecialty] = useState("");
  useEffect(() => {
    setMode("phone");
    setTab("info");
    setOpen(0);
  }, [id]);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem("ecory-saved-doctors") || "[]");
      setSaved(Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
    } catch {}
  }, []);
  const d = doctors.find((x) => x.id === id);
  const extra = d as unknown as Record<string, unknown> | undefined;
  const text = (key: string) =>
    String(extra?.[bn ? `${key}_bn` : `${key}_en`] || extra?.[key] || extra?.[`${key}_bn`] || "");
  const position = (row: unknown) => {
    const v = String((row as Record<string, unknown>)["profile_position"] || "center top");
    return ["center top", "center center", "center bottom"].includes(v) ? v : "center top";
  };
  const existing = useQuery({
    queryKey: ["my-doctor-bookings-exists", user?.id, id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      let request = uiClient
        .from("doctor_bookings")
        .select(
          "id,doctor_id,preferred_date,preferred_time,status,payment_status,consultation_mode",
        )
        .eq("user_id", user!.id);
      if (id) request = request.eq("doctor_id", id);
      const q = await request.order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (q.error) throw q.error;
      return q.data as {
        id: string;
        doctor_id: string;
        preferred_date: string | null;
        preferred_time: string | null;
        status: string;
        payment_status: string;
        consultation_mode: string;
      } | null;
    },
  });
  const fee = d ? (mode === "phone" ? d.consultation_fee : d.in_person_fee) : null;
  const free = (!!d && (mode === "phone" ? d.consultation_free : d.in_person_free)) || fee === 0;
  const price = (v: number | null, f: boolean) =>
    f || v === 0
      ? bn
        ? "বিনামূল্যে"
        : "Free"
      : v == null
        ? bn
          ? "এখন উপলব্ধ নয়"
          : "Unavailable"
        : BDT(v);
  const title = (row: (typeof doctors)[number]) => contentText(row, "name", lang) || row.name;
  function start() {
    setTab("info");
    setOpen((x) => x + 1);
    requestAnimationFrame(() =>
      document
        .getElementById("doctor-checkout")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }
  function choose(m: "phone" | "in_person") {
    setMode(m);
    setOpen(0);
  }
  async function call() {
    if (!d || calling) return;
    setCalling(true);
    try {
      const q = await uiClient.rpc("doctor_call_access", { _doctor: d.id });
      if (q.error || !q.data) {
        toast.info(
          bn
            ? "আগে বুকিং করুন। ফি থাকলে পেমেন্টের পরে কল করতে পারবেন।"
            : "Book first. Paid consultations require verified payment.",
        );
        choose("phone");
        setOpen((x) => x + 1);
        setTab("info");
        requestAnimationFrame(() =>
          document
            .getElementById("doctor-checkout")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
        return;
      }
      window.location.href = "tel:" + String(q.data).replace(/[^+\d]/g, "");
    } catch {
      toast.error(
        bn ? "কলের অনুমতি যাচাই হয়নি। আবার চেষ্টা করুন।" : "Could not verify call access.",
      );
    } finally {
      setCalling(false);
    }
  }
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({ title: d ? title(d) : "Ecory", url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        toast.success(bn ? "লিংক কপি হয়েছে" : "Link copied");
      }
    } catch {}
  }
  function saveDoctor() {
    if (!d) return;
    const a = saved.includes(d.id) ? saved.filter((x) => x !== d.id) : [...saved, d.id];
    setSaved(a);
    localStorage.setItem("ecory-saved-doctors", JSON.stringify(a));
  }
  const specialties = [...new Set(doctors.map((x) => pick(x, "specialty", lang)).filter(Boolean))];
  const filtered = doctors.filter(
    (x) =>
      (!specialty || pick(x, "specialty", lang) === specialty) &&
      (!search.trim() ||
        `${title(x)} ${x.name_en} ${pick(x, "specialty", lang)} ${x.degree}`
          .toLocaleLowerCase()
          .includes(search.trim().toLocaleLowerCase())),
  );
  const footer = d ? (
    <div className="ecory-doctor-footer">
      <div>
        <span>{bn ? "পরামর্শ ফি" : "Consultation fee"}</span>
        <strong>{price(fee, free)}</strong>
      </div>
      <button
        type="button"
        disabled={fee == null && !free}
        onClick={start}
        className="ecory-doctor-book-cta"
      >
        {bn ? "বুক করুন" : "Book consultation"}
        <ArrowUpRight size={18} />
      </button>
    </div>
  ) : undefined;
  return (
    <Shell
      title={bn ? "ডাক্তার" : "Doctor"}
      onBack={open ? () => setOpen(0) : undefined}
      hideNavigation={!!d}
      bottomBar={footer}
      headerAction={
        d ? (
          <div className="ecory-doctor-header-actions">
            <button
              type="button"
              aria-label={bn ? "ডাক্তার সেভ করুন" : "Save doctor"}
              aria-pressed={saved.includes(d.id)}
              onClick={saveDoctor}
            >
              <Heart size={19} fill={saved.includes(d.id) ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              aria-label={bn ? "ডাক্তার শেয়ার করুন" : "Share doctor"}
              onClick={() => void share()}
            >
              <Share2 size={19} />
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="ecory-doctors">
        {isLoading && <p role="status">{bn ? "ডাক্তারদের তথ্য লোড হচ্ছে…" : "Loading doctors…"}</p>}
        {error && (
          <p role="alert">
            {bn ? "তথ্য লোড হয়নি।" : "Could not load doctors."}
            <button type="button" onClick={() => void refetch()}>
              {bn ? "আবার চেষ্টা করুন" : "Retry"}
            </button>
          </p>
        )}
        {!id && !isLoading && !error && (
          <>
            <div className="doctor-directory-heading">
              <div>
                <span>ECORY · CARE</span>
                <h2>{bn ? "সুস্থতার সঙ্গী" : "Care, with a personal touch"}</h2>
              </div>
              <span className="doctor-count">
                <Stethoscope size={17} />
                {doctors.length.toLocaleString(bn ? "bn-BD" : "en-US")}
              </span>
            </div>
            <div className="doctor-search">
              <Search size={18} />
              <input
                aria-label={bn ? "ডাক্তার খুঁজুন" : "Search doctors"}
                placeholder={bn ? "নাম বা বিশেষজ্ঞতা দিয়ে খুঁজুন" : "Search name or specialty"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                type="button"
                aria-label={bn ? "ডাক্তার ফিল্টার" : "Filter doctors"}
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen((x) => !x)}
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
            {filterOpen && (
              <label className="doctor-filter">
                {bn ? "বিশেষজ্ঞতা" : "Specialty"}
                <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                  <option value="">{bn ? "সব বিশেষজ্ঞতা" : "All specialties"}</option>
                  {specialties.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="doctor-directory-grid">
              {filtered.map((x, i) => (
                <article key={x.id} className={`doctor-portrait-card ${i % 2 ? "is-sage" : ""}`}>
                  <Link to="/doctor" search={{ doctor: x.id }} className="doctor-card-profile-link">
                    <div className="doctor-card-photo">
                      {x.photo ? (
                        <img
                          src={x.photo}
                          alt={title(x)}
                          loading="lazy"
                          style={{ objectPosition: position(x) }}
                        />
                      ) : (
                        <Stethoscope size={50} />
                      )}
                    </div>
                    <div className="doctor-card-caption">
                      <h3>{title(x)}</h3>
                      <p>{pick(x, "specialty", lang) || contentText(x, "degree", lang)}</p>
                      <div className="doctor-card-bottom">
                        <div>
                          <span>{bn ? "ফোনে পরামর্শ" : "Phone consultation"}</span>
                          <strong>{price(x.consultation_fee, x.consultation_free)}</strong>
                        </div>
                        <span className="doctor-open-arrow" aria-hidden>
                          <ArrowUpRight size={18} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
            {!filtered.length && (
              <p className="doctor-empty">
                {bn
                  ? "এই নামে বা বিশেষজ্ঞতায় ডাক্তার পাওয়া যায়নি।"
                  : "No doctors match your search."}
              </p>
            )}
            {existing.data && (
              <Link
                to="/doctor-bookings"
                search={{ doctor: undefined }}
                className="doctor-my-booking doctor-directory-bookings doctor-bookings-entry"
              >
                <span className="doctor-booking-icon">
                  <CalendarDays size={23} />
                </span>
                <span>
                  <strong>{bn ? "আমার বুকিং" : "My bookings"}</strong>
                  <small>
                    {bn
                      ? "আপনার পরামর্শের বুকিং ও আপডেট দেখুন"
                      : "View your consultations and updates"}
                  </small>
                </span>
                <ArrowUpRight size={20} />
              </Link>
            )}
            <section className="doctor-directory-services">
              <span className="doctor-panel-grip" aria-hidden />
              <h2>{bn ? "আপনার যত্ন, আপনার সুবিধায়" : "Choose your way to consult"}</h2>
              <p>
                {bn
                  ? "প্রোফাইল খুলে ফি ও বিস্তারিত দেখুন"
                  : "Open a doctor's profile for fees and details"}
              </p>
              <div>
                <article>
                  <Phone size={25} />
                  <h3>{bn ? "ফোনে পরামর্শ" : "Phone consultation"}</h3>
                  <p>{bn ? "যেখান থেকেই কথা বলুন" : "Consult from wherever you are"}</p>
                </article>
                <article className="is-deep">
                  <MapPin size={25} />
                  <h3>{bn ? "সরাসরি দেখান" : "In-person visit"}</h3>
                  <p>{bn ? "চেম্বারে পরামর্শ নিন" : "Meet your doctor at the chamber"}</p>
                </article>
              </div>
            </section>
          </>
        )}
        {id && !isLoading && !d && !error && (
          <p>{bn ? "ডাক্তার পাওয়া যায়নি" : "Doctor not found"}</p>
        )}
        {d && (
          <>
            <section className="doctor-profile-hero">
              {d.photo && <div className="doctor-hero-atmosphere" aria-hidden="true"><img src={d.photo} alt="" /></div>}
              <div className="doctor-hero-photo">
                {d.photo ? (
                  <img src={d.photo} alt={title(d)} style={{ objectPosition: position(d) }} />
                ) : (
                  <Stethoscope size={80} />
                )}
              </div>
              <div className="doctor-hero-copy">
                <span className="doctor-profile-kicker">ECORY CARE</span>
                <h2>{title(d)}</h2>
                {text("designation") ? (
                  <p className="doctor-hero-designation">{text("designation")}</p>
                ) : (
                  <p className="doctor-hero-designation">{contentText(d, "degree", lang)}</p>
                )}
                <p className="doctor-specialty">{pick(d, "specialty", lang)}</p>
              </div>
              <div className="doctor-hero-actions">
                <button
                  type="button"
                  className="doctor-info-chip"
                  onClick={() =>
                    document
                      .getElementById("doctor-profile-info")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <BadgeCheck size={16} />
                  {bn ? "ডাক্তারের তথ্য" : "Doctor details"}
                </button>
                <button
                  type="button"
                  aria-label={bn ? "ফোনে পরামর্শ" : "Phone consultation"}
                  disabled={calling}
                  onClick={() => void call()}
                >
                  <Phone size={19} />
                </button>
                <button
                  type="button"
                  aria-label={bn ? "সরাসরি দেখান" : "In-person visit"}
                  onClick={() => choose("in_person")}
                >
                  <MapPin size={19} />
                </button>
              </div>
            </section>
            <div className="doctor-profile-stat-panel doctor-reference-stats">
              <div>
                <Users size={21} />
                <strong>
                  {d.patients_seen == null
                    ? "—"
                    : d.patients_seen.toLocaleString(bn ? "bn-BD" : "en-US")}
                </strong>
                <span>{bn ? "রোগী" : "Patients"}</span>
              </div>
              <div>
                <GraduationCap size={21} />
                <strong>{text("experience") || "—"}</strong>
                <span>{bn ? "অভিজ্ঞতা" : "Experience"}</span>
              </div>
              <div>
                <Star size={21} />
                <strong>
                  {doctorRating.data?.rating == null
                    ? "—"
                    : doctorRating.data.rating.toLocaleString(bn ? "bn-BD" : "en-US", {
                        maximumFractionDigits: 1,
                      })}
                </strong>
                <span>{bn ? "রেটিং" : "Rating"}</span>
              </div>
              <div>
                <MessageSquare size={21} />
                <strong>
                  {(doctorRating.data?.count ?? 0).toLocaleString(bn ? "bn-BD" : "en-US")}
                </strong>
                <span>{bn ? "রিভিউ" : "Reviews"}</span>
              </div>
            </div>
            <section className="doctor-profile-sheet" id="doctor-profile-info">
              <span className="doctor-panel-grip" aria-hidden />
              <div
                className="doctor-profile-tabs"
                role="tablist"
                aria-label={bn ? "ডাক্তারের বিস্তারিত" : "Doctor information"}
              >
                {(["info", "experience", "reviews"] as const).map((t) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    key={t}
                    onClick={() => setTab(t)}
                  >
                    {t === "reviews"
                      ? bn
                        ? "রিভিউ"
                        : "Reviews"
                      : t === "info"
                        ? bn
                          ? "পরিচিতি"
                          : "About"
                        : bn
                          ? "যোগ্যতা ও অভিজ্ঞতা"
                          : "Qualifications"}
                  </button>
                ))}
              </div>
              {tab === "reviews" ? (
                <DoctorReviews key={d.id} id={d.id} bn={bn} />
              ) : tab === "info" ? (
                <>
                  <div className="doctor-profile-text">
                    {pick(d, "bio", lang) && (
                      <section className="doctor-detail-card">
                        <span className="doctor-detail-icon">
                          <Stethoscope size={19} />
                        </span>
                        <div>
                          <h3>{bn ? "পেশাগত পরিচিতি" : "Professional profile"}</h3>
                          <DoctorProfileFacts value={pick(d, "bio", lang)} variant="bio" bn={bn} />
                        </div>
                      </section>
                    )}
                    {text("services") && (
                      <section className="doctor-detail-card">
                        <span className="doctor-detail-icon">
                          <ShieldCheck size={19} />
                        </span>
                        <div>
                          <h3>{bn ? "যেসব বিষয়ে পরামর্শ" : "Consultation areas"}</h3>
                          <DoctorServiceList value={bn ? text("services") : String(extra?.["services_en"] || extra?.["services_bn"] || "")} />
                        </div>
                      </section>
                    )}
                    {contentText(d, "workplace", lang) && (
                      <div className="doctor-location">
                        <MapPin size={18} />
                        <p>{contentText(d, "workplace", lang)}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="doctor-profile-text">
                  {[
                    [bn ? "অভিজ্ঞতা" : "Experience", text("experience")],
                    [
                      bn ? "শিক্ষাগত যোগ্যতা" : "Education",
                      text("education") || contentText(d, "degree", lang),
                    ],
                    [
                      bn ? "প্রশিক্ষণ" : "Training",
                      String(
                        extra?.[bn ? "training_bn" : "training_en"] || extra?.["training_bn"] || "",
                      ),
                    ],
                    [bn ? "অর্জন" : "Achievements", text("achievements")],
                    [
                      bn ? "ভাষা" : "Languages",
                      String(
                        extra?.[bn ? "languages_bn" : "languages_en"] ||
                          extra?.["languages_bn"] ||
                          "",
                      ),
                    ],
                    [bn ? "পেশাগত সনদ" : "Certification", text("certification")],
                  ]
                    .filter((x) => x[1])
                    .map(([label, value]) => (
                      <section key={label} className="doctor-detail-card">
                        <span className="doctor-detail-icon">
                          <GraduationCap size={19} />
                        </span>
                        <div>
                          <h3>{label}</h3>
                          <DoctorProfileFacts value={value || ""} bn={bn} variant={label === (bn ? "অভিজ্ঞতা" : "Experience") ? "experience" : label === (bn ? "শিক্ষাগত যোগ্যতা" : "Education") ? "education" : label === (bn ? "পেশাগত সনদ" : "Certification") ? "certification" : "list"} />
                        </div>
                      </section>
                    ))}
                  <DoctorCertificates images={extra?.["certification_image"]} bn={bn} />
                </div>
              )}
              <div className="doctor-consultation-panel">
                <h3>{bn ? "পরামর্শের ধরন" : "Consultation type"}</h3>
                <div className="doctor-mode-grid">
                  {(["phone", "in_person"] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      aria-pressed={mode === m}
                      onClick={() => choose(m)}
                    >
                      {m === "phone" ? <Phone size={22} /> : <MapPin size={22} />}
                      <span>
                        {m === "phone"
                          ? bn
                            ? "ফোনে পরামর্শ"
                            : "Phone consultation"
                          : bn
                            ? "সরাসরি দেখা"
                            : "In-person visit"}
                      </span>
                      <strong>
                        {m === "phone"
                          ? price(d.consultation_fee, d.consultation_free)
                          : price(d.in_person_fee, d.in_person_free)}
                      </strong>
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
              </div>
              {text("consultation_note") && (
                <p className="doctor-admin-note">{text("consultation_note")}</p>
              )}
              {mode === "phone" && (
                <button
                  type="button"
                  className="doctor-call-action"
                  disabled={calling}
                  onClick={() => void call()}
                >
                  <Phone size={17} />
                  {calling
                    ? bn
                      ? "যাচাই হচ্ছে…"
                      : "Checking…"
                    : bn
                      ? "ডাক্তারের সঙ্গে কথা বলুন"
                      : "Call doctor"}
                  <ArrowUpRight size={17} />
                </button>
              )}
              <div id="doctor-checkout">
                <DoctorBooking
                  key={d.id + mode}
                  doctor={d}
                  bn={bn}
                  mode={mode}
                  openRequest={open}
                  hideTrigger
                />
              </div>
            </section>
          </>
        )}
      </div>
    </Shell>
  );
}

