import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/admin-upload";
import {
  brandingClient,
  DEFAULT_BRANDING,
  originalLogo,
  useBranding,
  type Branding,
} from "@/lib/branding";

type ImageKey = "app_logo" | "menu_logo" | "admin_logo" | "favicon" | "android_icon";
const ASSETS: { key: ImageKey; label: string; hint: string }[] = [
  {
    key: "app_logo",
    label: "অ্যাপের হেডার লোগো",
    hint: "স্বচ্ছ PNG ভালো। ৮:৩ ratio • প্রস্তাবিত ৮০০×৩০০px; ছবি stretch হবে না।",
  },
  {
    key: "menu_logo",
    label: "মেনুর লোগো",
    hint: "৮:৩ • ৮০০×৩০০px PNG; খালি রাখলে অ্যাপের হেডার লোগো ব্যবহার হবে।",
  },
  { key: "admin_logo", label: "অ্যাডমিন লোগো / আইকন", hint: "১:১ • প্রস্তাবিত ৫১২×৫১২px PNG।" },
  {
    key: "favicon",
    label: "ব্রাউজার ট্যাবের আইকন",
    hint: "বর্গাকার PNG, অন্তত ৬৪×৬৪px; প্রস্তাবিত ২৫৬×২৫৬px।",
  },
  {
    key: "android_icon",
    label: "Android APK-এর আইকন",
    hint: "বর্গাকার PNG, অন্তত ১০২৪×১০২৪px। সেভ করা ছবিটি পরের APK build-এ ব্যবহার করতে হবে।",
  },
];
async function inspectImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("ছবি পড়া যাচ্ছে না"));
      img.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function AdminBranding() {
  const query = useBranding();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Branding | null>(null);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState<ImageKey | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (query.data && !dirty) setDraft(query.data);
  }, [query.data, dirty]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const set = (key: keyof Branding, value: string) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setDirty(true);
  };
  const upload = async (key: ImageKey, file?: File) => {
    if (!file) return;
    setUploading(key);
    try {
      if (!["image/png", "image/jpeg"].includes(file.type)) throw new Error("PNG বা JPG ছবি দিন");
      const { width, height } = await inspectImage(file);
      if (key === "android_icon" && (file.type !== "image/png" || width !== height || width < 1024))
        throw new Error("APK আইকন বর্গাকার PNG হতে হবে, অন্তত ১০২৪×১০২৪px");
      if (key === "favicon" && (width !== height || width < 64))
        throw new Error("ট্যাব আইকন বর্গাকার হতে হবে, অন্তত ৬৪×৬৪px");
      const { url } = await uploadMedia(file, `branding/${key}`);
      set(key, url);
      toast.success("ছবি আপলোড হয়েছে। এখন সেভ করুন।");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(null);
    }
  };
  const save = async () => {
    if (!draft || !draft.name_bn.trim() || !draft.name_en.trim() || !draft.admin_name.trim())
      return void toast.error("সব নাম লিখুন");
    setSaving(true);
    const { error } = await brandingClient.from("app_branding").upsert({ ...draft, id: 1 });
    setSaving(false);
    if (error) return void toast.error(error.message);
    qc.setQueryData(["branding"], draft);
    setDirty(false);
    toast.success("লোগো ও ব্র্যান্ডিং সেভ হয়েছে");
  };
  if (query.isError)
    return (
      <div className="rounded-2xl bg-card p-5">
        <p role="alert">
          ব্র্যান্ডিং সেটিংস লোড হয়নি। নতুন Branding.sql চালানো হয়েছে কি যাচাই করুন।
        </p>
        <button className="mt-3 underline" onClick={() => query.refetch()}>
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  if (!draft) return <p className="p-5">লোড হচ্ছে…</p>;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-2xl bg-card p-5 sm:grid-cols-2">
        {(
          [
            ["name_bn", "অ্যাপের বাংলা নাম"],
            ["name_en", "অ্যাপের ইংরেজি নাম"],
            ["admin_name", "অ্যাডমিন হেডারের নাম"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-sm font-semibold">
            {label}
            <input
              data-admin-translation-field={typeof key === "string" ? key : undefined}
              className="mt-2 w-full"
              maxLength={80}
              value={draft[key]}
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {ASSETS.map(({ key, label, hint }) => (
          <section key={key} className="min-w-0 rounded-2xl bg-card p-5">
            <h3 className="font-bold">{label}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
            <div className="my-4 flex h-28 items-center justify-center rounded-xl border bg-muted/30 p-3">
              <img
                src={
                  draft[key] ||
                  (key === "favicon"
                    ? "/favicon.png"
                    : key === "android_icon"
                      ? "/favicon.png"
                      : key === "menu_logo"
                        ? draft.app_logo || originalLogo
                        : originalLogo)
                }
                alt={label}
                className="h-full max-w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold">
                {uploading === key ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ImagePlus size={16} />
                )}
                ছবি আপলোড
                <input
                  type="file"
                  className="sr-only"
                  accept={key === "android_icon" ? "image/png" : "image/png,image/jpeg"}
                  disabled={!!uploading || saving}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    void upload(key, file);
                  }}
                />
              </label>
              <button
                type="button"
                className="text-sm underline"
                disabled={!!uploading || saving}
                onClick={() => set(key, DEFAULT_BRANDING[key])}
              >
                ডিফল্টে ফিরুন
              </button>
            </div>
          </section>
        ))}
      </div>
      <p className="rounded-xl bg-primary-soft p-4 text-sm">
        অ্যাপের ভেতরের লোগো ও ব্রাউজার আইকন সেভ করার পর হালনাগাদ হবে। ফোনের ইনস্টল করা অ্যাপের
        বাইরের icon ও নাম বদলাতে নতুন APK build এবং install করতে হবে।
      </p>
      <div className="flex flex-wrap gap-3 rounded-2xl bg-card p-4">
        <button
          type="button"
          className="rounded-xl bg-primary px-5 py-3 text-sm font-bold"
          disabled={!dirty || !!uploading || saving}
          onClick={save}
        >
          {saving ? "সেভ হচ্ছে…" : "ব্র্যান্ডিং সেভ করুন"}
        </button>
        <button
          type="button"
          className="rounded-xl bg-muted px-5 py-3 text-sm"
          disabled={!!uploading || saving}
          onClick={() => {
            if (!dirty || confirm("সেভ না করা পরিবর্তন বাতিল করবেন?")) {
              setDraft(query.data ?? DEFAULT_BRANDING);
              setDirty(false);
            }
          }}
        >
          বাতিল
        </button>
      </div>
    </div>
  );
}
