import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/admin-upload";
import { usePresentation, uiClient, UploadedIcon, UI_ICON_KEYS } from "@/lib/presentation";
import {
  NAV_DEFAULTS,
  PROFILE_DEFAULTS,
  MENU_PAGES,
  configuredMenu,
  validMenuTarget,
  type AppMenuItem,
} from "@/lib/app-menus";
import { Circle, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
export function AdminAppMenus({ section }: { section?: "nav_items" | "profile_items" }) {
  const { data, error, isLoading } = usePresentation();
  const client = useQueryClient();
  const [kind, setKind] = useState<"nav_items" | "profile_items">(section ?? "nav_items");
  const [draft, setDraft] = useState<AppMenuItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const profile = kind === "profile_items";
  const items =
    draft ?? configuredMenu(data?.[kind], profile ? PROFILE_DEFAULTS : NAV_DEFAULTS, profile);
  const update = (i: number, patch: Partial<AppMenuItem>) =>
    setDraft(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  function move(i: number, delta: number) {
    const a = [...items];
    const j = i + delta;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j]!, a[i]!];
    setDraft(a);
  }
  async function save() {
    if (items.some((x) => !x.bn.trim() || !x.en.trim() || !validMenuTarget(x.target, profile)))
      return void toast.error("প্রতিটি Item-এর বাংলা/ইংরেজি নাম ও সঠিক Page/https Link দিন।");
    if (!profile && !items.some((x) => x.visible))
      return void toast.error("অন্তত একটি Navigation Button রাখুন।");
    setBusy(true);
    try {
      const r = await uiClient.from("app_ui_settings").upsert({ id: 1, [kind]: items });
      if (r.error) throw r.error;
      await client.invalidateQueries({ queryKey: ["presentation"] });
      setDraft(null);
      toast.success("Menu সেভ হয়েছে");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(i: number, file: File) {
    setBusy(true);
    try {
      const { url } = await uploadMedia(file, "ui/menu");
      update(i, { icon: url });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Menu Settings লোড হয়নি।</p>;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        {profile ? "Profile Menu Editor" : "Navigation Editor"}
      </h2>
      <p className="text-sm">
        নাম, আইকন, ক্রম ও গন্তব্য বদলান। নতুন Menu Item বিদ্যমান Page বা https Link খুলবে। নতুন Page
        নিজে থেকে তৈরি হবে না।
      </p>
      {!section && (
        <div className="flex gap-2">
          {(["nav_items", "profile_items"] as const).map((x) => (
            <button
              key={x}
              disabled={busy}
              onClick={() => {
                if (draft && !confirm("সেভ না করা পরিবর্তন বাদ দেবেন?")) return;
                setKind(x);
                setDraft(null);
              }}
              className={`rounded-lg border px-4 py-2 ${kind === x ? "bg-primary text-primary-foreground" : ""}`}
            >
              {x === "nav_items" ? "নিচের Navigation" : "Profile Menu"}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-1 overflow-x-auto rounded-xl border bg-white p-3">
        {items
          .filter((x) => x.visible)
          .map((x) => (
            <span
              key={x.id}
              className="flex shrink-0 flex-col items-center gap-1 rounded-lg p-2 text-xs"
            >
              <UploadedIcon
                src={/^https:/.test(x.icon) ? x.icon : data?.icons[x.icon]}
                monochrome={!profile}
              >
                <Circle size={20} />
              </UploadedIcon>
              {x.bn}
            </span>
          ))}
      </div>
      {items.map((x, i) => (
        <div key={x.id} className="rounded-xl border bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <strong className="text-sm">
              {i + 1}. {x.bn}
            </strong>
            <div className="flex gap-2">
              <button disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                <ArrowUp size={17} />
              </button>
              <button
                disabled={busy || i === items.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Move down"
              >
                <ArrowDown size={17} />
              </button>
              <button
                disabled={busy}
                onClick={() => setDraft(items.filter((_, j) => i !== j))}
                aria-label="Remove menu item"
                className="admin-delete-button"
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs">
              বাংলা নাম
              <input
                data-admin-translation-field={"bn"}
                disabled={busy}
                value={x.bn}
                onChange={(e) => update(i, { bn: e.target.value })}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="text-xs">
              English name
              <input
                data-admin-translation-field={"en"}
                disabled={busy}
                value={x.en}
                onChange={(e) => update(i, { en: e.target.value })}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="text-xs">
              Page / Link
              <input
                disabled={busy}
                list="ecory-menu-targets"
                value={x.target}
                onChange={(e) => update(i, { target: e.target.value })}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="text-xs">
              বিদ্যমান Icon
              <select
                disabled={busy}
                value={UI_ICON_KEYS.includes(x.icon as never) ? x.icon : ""}
                onChange={(e) => update(i, { icon: e.target.value })}
                className="mt-1 w-full rounded-lg border p-2"
              >
                <option value="">নিজস্ব Icon / বেছে নিন</option>
                {UI_ICON_KEYS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              নিজস্ব Icon: 1:1 স্বচ্ছ PNG, 256×256
              <input
                disabled={busy}
                type="file"
                accept="image/png"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(i, f);
                }}
                className="mt-1 block w-full"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                disabled={busy}
                type="checkbox"
                checked={x.visible}
                onChange={(e) => update(i, { visible: e.target.checked })}
              />
              দেখাবে
            </label>
          </div>
        </div>
      ))}
      <datalist id="ecory-menu-targets">
        {[
          ...MENU_PAGES,
          ...(profile
            ? [
                "action:spin",
                "action:orders",
                "action:addresses",
                "action:language",
                "action:support",
                "action:rate",
                "action:share",
              ]
            : []),
        ].map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={() =>
            setDraft([
              ...items,
              {
                id: crypto.randomUUID(),
                bn: "নতুন অপশন",
                en: "New item",
                target: "/products",
                icon: "nav_products",
                visible: true,
              },
            ])
          }
          className="rounded-lg border px-4 py-2"
        >
          নতুন Item যোগ করুন
        </button>
        <button
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
        >
          {busy ? "অপেক্ষা করুন…" : "সেভ করুন"}
        </button>
        <button
          disabled={busy}
          onClick={() => {
            if (confirm("আগের মূল Menu ফিরিয়ে আনবেন?"))
              setDraft(profile ? PROFILE_DEFAULTS : NAV_DEFAULTS);
          }}
          className="rounded-lg border px-4 py-2"
        >
          মূল Menu ফিরিয়ে আনুন
        </button>
      </div>
    </section>
  );
}
