import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { uiClient, usePresentation } from "@/lib/presentation";
const EMPTY_NAMES: Record<string, string> = {};
export function AdminUiNames({ showControls = true }: { showControls?: boolean }) {
  const { data } = usePresentation();
  const qc = useQueryClient();
  const [mode, setMode] = useState(false),
    [selected, setSelected] = useState(""),
    [value, setValue] = useState(""),
    [busy, setBusy] = useState(false);
  const originals = useRef(new WeakMap<Text, { original: string; applied: string }>());
  useEffect(() => {
    if (!showControls) setMode(false);
  }, [showControls]);
  const names =
    (data as unknown as { admin_names?: Record<string, string> })?.admin_names || EMPTY_NAMES;
  useEffect(() => {
    const root = document.querySelector(".ecory-admin");
    if (!root) return;
    const apply = (subtree: Node = root) => {
      const walker = document.createTreeWalker(subtree, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const node = n as Text;
        const el = node.parentElement;
        if (
          !el ||
          el.closest("[data-label-manager],input,textarea,select,script,style,[contenteditable]")
        )
          continue;
        if (
          !el.closest(
            "h1,h2,h3,h4,label,summary,th,button,nav a,legend,.admin-eyebrow,.admin-menu-heading",
          )
        )
          continue;
        const old = originals.current.get(node);
        const original = old && node.data === old.applied ? old.original : node.data;
        const scope = el.closest("[data-admin-scope]")?.getAttribute("data-admin-scope") || "menu";
        const replacement = names[scope + "::" + original.trim()];
        const applied = replacement ? original.replace(original.trim(), replacement) : original;
        originals.current.set(node, { original, applied });
        if (node.data !== applied) node.data = applied;
      }
    };
    apply();
    let frame = 0;
    const pending = new Set<Node>();
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        pending.add(
          record.target.nodeType === Node.TEXT_NODE ? record.target.parentNode! : record.target,
        );
        record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) pending.add(node);
        });
      });
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          observer.disconnect();
          pending.forEach((node) => {
            if (root.contains(node)) apply(node);
          });
          pending.clear();
          observer.observe(root, { childList: true, characterData: true, subtree: true });
        });
    });
    observer.observe(root, { childList: true, characterData: true, subtree: true });
    const click = (e: Event) => {
      if (!mode || !showControls) return;
      const el = e.target as Element;
      if (el.closest("[data-label-manager]")) return;
      const target = el.closest(
        "h1,h2,h3,h4,label,summary,th,button,nav a,legend,.admin-eyebrow,.admin-menu-heading",
      );
      if (!target) return;
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.textContent?.trim() && !node.parentElement?.closest("input,textarea,select")) {
          const original =
            originals.current.get(node as Text)?.original.trim() || node.textContent.trim();
          const scope =
            target.closest("[data-admin-scope]")?.getAttribute("data-admin-scope") || "menu";
          const key = scope + "::" + original;
          if (key.length > 250) return;
          e.preventDefault();
          e.stopPropagation();
          setSelected(key);
          setValue(names[key] || original);
          return;
        }
      }
    };
    root.addEventListener("click", click, true);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      root.removeEventListener("click", click, true);
    };
  }, [names, mode, showControls]);
  async function save(reset = false) {
    setBusy(true);
    try {
      const updated = { ...names };
      if (reset) delete updated[selected];
      else updated[selected] = value.trim();
      const r = await uiClient
        .from("app_ui_settings")
        .update({ admin_names: updated })
        .eq("id", 1)
        .select("id");
      if (r.error) throw r.error;
      if (!r.data?.length) throw Error("Permission denied");
      await qc.invalidateQueries({ queryKey: ["presentation"] });
      setSelected("");
      toast.success("নাম সেভ হয়েছে");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!showControls) return null;
  return (
    <div data-label-manager className="mb-3 rounded-xl border bg-white p-3 text-sm">
      <button
        type="button"
        className={`rounded-lg px-3 py-2 ${mode ? "bg-primary text-white" : "border"}`}
        onClick={() => setMode(!mode)}
      >
        {mode ? "নাম পরিবর্তন শেষ করুন" : "Admin-এর নাম / Box label পরিবর্তন"}
      </button>
      {mode && (
        <p className="mt-2">
          মেনু, শিরোনাম, button বা field-এর নামের ওপর চাপুন। এই mode বন্ধ করলে স্বাভাবিক কাজ করতে
          পারবেন। Product/Customer-এর তথ্য এখানে বদলাবে না।
        </p>
      )}
      {selected && (
        <div className="mt-3 grid gap-2">
          <p>মূল নাম: {selected}</p>
          <input
            aria-label="নতুন নাম"
            value={value}
            maxLength={250}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-lg border p-2"
          />
          <div className="flex gap-2">
            <button
              disabled={busy || !value.trim()}
              onClick={() => void save()}
              className="rounded-lg bg-primary px-3 py-2 text-white"
            >
              সেভ
            </button>
            <button
              disabled={busy}
              onClick={() => void save(true)}
              className="rounded-lg border px-3 py-2"
            >
              মূল নাম ফিরিয়ে দিন
            </button>
            <button onClick={() => setSelected("")}>বাতিল</button>
          </div>
        </div>
      )}
    </div>
  );
}
