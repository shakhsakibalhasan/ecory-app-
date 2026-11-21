import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { SocialLinks } from "@/components/SocialLinks";
import { useStore } from "@/lib/store";
import { useContacts } from "@/lib/contacts";
import { ImoContact } from "@/components/ImoContact";
export const Route=createFileRoute("/contact")({
  staticData: { sitemap: true },
  head: () => ({ meta: [{ title: "যোগাযোগ — ইকোরি" }, { name: "description", content: "ইকোরির সঙ্গে যোগাযোগ করুন—অর্ডার, পণ্য ও সেবা বিষয়ে সহায়তা নিন।" }, { property: "og:title", content: "যোগাযোগ — ইকোরি" }, { property: "og:description", content: "ইকোরির সঙ্গে যোগাযোগ করুন—অর্ডার, পণ্য ও সেবা বিষয়ে সহায়তা নিন।" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),component:Contact});
function Contact(){const {lang}=useStore();const bn=lang==="bn";const {support,imoNumber,email}=useContacts();return <Shell title={bn?"যোগাযোগ":"Contact"}><section className="ecory-section space-y-4"><a className="block font-semibold" href={support.callHref}>{bn?"কল করুন":"Call"}: {support.callDisplay}</a><a className="block font-semibold" href={support.whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp: {support.whatsappDisplay}</a>{imoNumber&&<ImoContact bn={bn} number={imoNumber} className="rounded-lg border px-4 py-3">IMO: {imoNumber}</ImoContact>}{email&&<a className="block" href={`mailto:${email}`}>{email}</a>}<a className="block underline" href="https://ecorybd.com/" target="_blank" rel="noopener noreferrer">ecorybd.com</a></section><SocialLinks bn={bn}/></Shell>;}
