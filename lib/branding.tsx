import { useEffect, useState } from "react";
import { useQuery } from "@/lib/query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/ecory-logo.png.asset.json";

export type Branding = {
  id: number; name_bn: string; name_en: string; admin_name: string;
  app_logo: string; menu_logo: string; admin_logo: string; favicon: string; android_icon: string;
};
export const DEFAULT_BRANDING: Branding = {
  id: 1, name_bn: "ইকোরি", name_en: "Ecory", admin_name: "ইকোরি অ্যাডমিন",
  app_logo: "", menu_logo: "", admin_logo: "", favicon: "", android_icon: "",
};
export const brandingClient = supabase as unknown as SupabaseClient;
export const originalLogo = logo.url;
export function useBranding() {
  return useQuery({
    queryKey: ["branding"],
    queryFn: async (): Promise<Branding> => {
      const { data, error } = await brandingClient.from("app_branding").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return { ...DEFAULT_BRANDING, ...data };
    },
    refetchInterval: 60000, refetchOnWindowFocus: true, retry: 1,
  });
}
export function BrandImage({ src, fallback = originalLogo, alt, className }: {
  src?: string | undefined; fallback?: string; alt: string; className?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return <img src={src && !broken ? src : fallback} alt={alt} className={className}
    onError={() => setBroken(true)} />;
}
export function BrandingHead() {
  const { data } = useBranding();
  useEffect(() => {
    if (!data) return;
    const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')];
    const previous = links.map(link => ({ link, href: link.getAttribute("href"), type: link.getAttribute("type") }));
    const created = links.length ? null : document.createElement("link");
    if (created) { created.rel = "icon"; document.head.appendChild(created); links.push(created); }
    links.forEach(link => { link.href = data.favicon || "/favicon.png"; link.removeAttribute("type"); });
    return () => {
      created?.remove();
      previous.forEach(({ link, href, type }) => {
        if (href === null) link.removeAttribute("href"); else link.setAttribute("href", href);
        if (type === null) link.removeAttribute("type"); else link.setAttribute("type", type);
      });
    };
  }, [data?.favicon]);
  return null;
}

