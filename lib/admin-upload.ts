import { supabase } from "@/integrations/supabase/client";

const OK = ["image/jpeg", "image/png", "application/pdf"];
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

function dims(file: File): Promise<{ w: number; h: number } | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      res({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      res(null);
    };
    img.src = URL.createObjectURL(file);
  });
}

/** Keep PNG transparency/labels; resize only oversized images, never upscale. */
async function optimizedImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
      image.src = url;
    });
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    if (scale === 1 && file.type === "image/png") return file;
    if (scale === 1 && file.size < 500 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type, 0.92),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
/** Upload JPEG/PNG/PDF; retain originals when optimization would not reduce size. */
export async function uploadMedia(
  file: File,
  folder: string,
): Promise<{ url: string; warning?: string | undefined }> {
  if (!OK.includes(file.type)) throw new Error("শুধু JPG, JPEG, PNG বা PDF ফাইল দিন");
  if (file.size > 10 * 1024 * 1024) throw new Error("ফাইল ১০MB এর বেশি");
  file = await optimizedImage(file);
  const d = await dims(file);
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  const { data, error: e2 } = await supabase.storage.from("media").createSignedUrl(path, TEN_YEARS);
  if (e2 || !data) throw new Error(e2?.message ?? "লিংক তৈরি হয়নি");
  const warning =
    d && Math.min(d.w, d.h) < 600 ? `কম রেজোলিউশন (${d.w}×${d.h})। অন্তত ৮০০px দিন।` : undefined;
  return { url: data.signedUrl, warning };
}
