import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
type Field = HTMLInputElement | HTMLTextAreaElement;
const selector = "input[data-admin-translation-field],textarea[data-admin-translation-field]";
function pair(source: Field): { target: Field; language: "bn" | "en" } | null {
  const key = source.dataset["adminTranslationField"] || "";
  if (
    !/(?:^|_)(bn|en)$/.test(key) ||
    (source instanceof HTMLInputElement && !["text", "search"].includes(source.type))
  )
    return null;
  const language = key.endsWith("bn") ? "en" : "bn";
  const opposite = key.replace(/(bn|en)$/, language);
  for (
    let parent = source.parentElement;
    parent && !parent.classList.contains("ecory-admin");
    parent = parent.parentElement
  ) {
    const targets = Array.from(parent.querySelectorAll<Field>(selector)).filter(
      (el) =>
        el !== source &&
        el.dataset["adminTranslationField"] === opposite &&
        !el.disabled &&
        !el.readOnly,
    );
    if (targets.length === 1) return { target: targets[0]!, language };
    if (targets.length > 1) return null; // Never guess between repeated rows.
  }
  return null;
}
export function AdminTranslation() {
  const [automatic, setAutomatic] = useState(() => {
    try {
      return localStorage.getItem("ecory-admin-translation-auto") === "1";
    } catch {
      return false;
    }
  });
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState("বাংলা বা English field বেছে অনুবাদ করুন");
  const sourceRef = useRef<Field | null>(null),
    autoRef = useRef(automatic),
    busyRef = useRef(false),
    generation = useRef(0);
  const lastAuto = useRef(new WeakMap<Field, string>());
  const runRef = useRef<(source: Field, manual: boolean) => Promise<void>>(async () => {});
  autoRef.current = automatic;
  runRef.current = async (source, manual) => {
    const found = pair(source);
    if (!found || !source.value.trim()) {
      if (manual) setStatus("পাশাপাশি থাকা বাংলা/English field-এ আগে লেখা দিন");
      return;
    }
    const { target, language } = found,
      text = source.value,
      targetBefore = target.value;
    if (busyRef.current) return;
    if (!manual && targetBefore.trim() && lastAuto.current.get(target) !== targetBefore) return;
    if (
      manual &&
      targetBefore.trim() &&
      !window.confirm("পাশের field-এর বর্তমান লেখা অনুবাদ দিয়ে বদলাবেন?")
    )
      return;
    setAnchor(source.parentElement);
    const request = ++generation.current;
    busyRef.current = true;
    setBusy(true);
    setStatus("অনুবাদ হচ্ছে…");
    try {
      const { data, error } = await supabase.functions.invoke("admin-translate", {
        body: { text, source: language === "en" ? "bn" : "en", target: language },
      });
      if (error) {
        let message = "অনুবাদ হয়নি। সংযোগ ও Translation service setup পরীক্ষা করুন।";
        try {
          const body = await (error as unknown as { context: Response }).context.json();
          if (body.code === "NOT_FOUND")
            message =
              "Translation function এখনও deploy হয়নি। setup-এর admin-translate function deploy করুন।";
          else if (body.code === "translation_budget_setup_required")
            message = "অনুবাদের SQL setup হয়নি। ADMIN-TRANSLATION.sql Run করুন।";
          else if (body.code === "translation_setup_required")
            message = "অনুবাদ চালাতে server-এ Google Translation API key বসাতে হবে।";
          else if (body.code === "translation_limit") message = "আজকের অনুবাদ সীমা শেষ হয়েছে।";
        } catch {}
        throw Error(message);
      }
      if (typeof data?.text !== "string" || !data.text.trim())
        throw Error("অনুবাদের উত্তর পাওয়া যায়নি।");
      if (
        request !== generation.current ||
        !source.isConnected ||
        !target.isConnected ||
        source.value !== text ||
        target.value !== targetBefore
      ) {
        setStatus("লেখা বদলেছে—পুরোনো অনুবাদ বসানো হয়নি। আবার অনুবাদ করুন।");
        return;
      }
      if (target.maxLength > 0 && data.text.length > target.maxLength)
        throw Error("অনুবাদ field-এর সর্বোচ্চ দৈর্ঘ্যের চেয়ে বড়; মূল লেখাটি ছোট করুন।");
      const prototype =
        target instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(target, data.text);
      target.dispatchEvent(new Event("input", { bubbles: true }));
      lastAuto.current.set(target, data.text);
      setStatus("অনুবাদ বসেছে। দেখে প্রয়োজন হলে edit করে সেভ করুন।");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "অনুবাদ হয়নি।");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    const root = document.querySelector(".ecory-admin");
    if (!root) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const focus = (event: Event) => {
      const field = event.target;
      if (
        (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) &&
        field.matches(selector)
      ) {
        sourceRef.current = field;
        if (pair(field)) setAnchor(field.parentElement);
        else setAnchor(null);
      }
    };
    const input = (event: Event) => {
      const field = event.target;
      if (
        !event.isTrusted ||
        !(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) ||
        !field.matches(selector)
      )
        return;
      sourceRef.current = field;
      clearTimeout(timer);
      if (autoRef.current) timer = setTimeout(() => void runRef.current(field, false), 1100);
    };
    root.addEventListener("focusin", focus);
    root.addEventListener("input", input);
    return () => {
      clearTimeout(timer);
      generation.current++;
      root.removeEventListener("focusin", focus);
      root.removeEventListener("input", input);
    };
  }, []);
  return (
    <>
      <div className="admin-translation-bar" data-label-manager>
        <Languages size={17} />
        <label>
          <input
            type="checkbox"
            checked={automatic}
            onChange={(e) => {
              setAutomatic(e.target.checked);
              try {
                localStorage.setItem("ecory-admin-translation-auto", e.target.checked ? "1" : "0");
              } catch {}
            }}
          />
          Auto বাংলা ↔ English
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            sourceRef.current
              ? void runRef.current(sourceRef.current, true)
              : setStatus("আগে বাংলা বা English field-এ click করুন")
          }
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : "অনুবাদ করুন"}
        </button>
        <small role="status" aria-live="polite">
          {status}
        </small>
      </div>
      {anchor?.isConnected &&
        createPortal(
          <div className="admin-inline-translation" data-label-manager>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (sourceRef.current) void runRef.current(sourceRef.current, true);
              }}
            >
              <Languages size={12} />
              {busy
                ? "অনুবাদ হচ্ছে…"
                : pair(sourceRef.current!)?.language === "en"
                  ? "English-এ অনুবাদ"
                  : "বাংলায় অনুবাদ"}
            </button>
            <small>
              {status === "বাংলা বা English field বেছে অনুবাদ করুন"
                ? automatic
                  ? "Auto translation চালু আছে"
                  : "Auto চালু করতে উপরের অনুবাদ menu খুলুন"
                : status}
            </small>
          </div>,
          anchor,
        )}
    </>
  );
}
