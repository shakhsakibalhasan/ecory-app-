import { NumberText } from "@/components/NumberText";
import { usePresentation } from "@/lib/presentation";
import { useContacts } from "@/lib/contacts";
export function AboutEcory({ bn }: { bn: boolean }) {
  const {data:ui}=usePresentation();
  const {support}=useContacts();
  const custom=bn?ui?.shortcuts["about"]?.bn:ui?.shortcuts["about"]?.en;
  return <section className="ecory-section mt-4 space-y-3">
    <h2 className="font-semibold">{bn?"আমাদের সম্পর্কে":"About us"}</h2>
    <p className="whitespace-pre-line leading-relaxed"><NumberText value={custom || (bn?"ইকোরি — প্রকৃতির সাথে সুস্থ থাকুন। প্রাকৃতিক খাবার, মধু ও হারবাল পণ্যের সংগ্রহ।\n\nউৎপাদন ও মোড়কজাতকারী: ইকোভেরা গ্লোবাল ইন্ডাস্ট্রিজ।\nবাজারজাতকারী: ইকোরি ফুড এন্ড কনজ্যুমার প্রোডাক্টস, শেখহাটি, সদর, যশোর, বাংলাদেশ।\n\nপ্রধান কার্যালয়: ১০/A, সেক্টর ৭, হোটেল আল-সাফার নিচে, নিউ মার্কেট বাসস্ট্যান্ড, সদর, যশোর ৭৪০০।":"Ecory — Stay healthy with nature. A collection of natural foods, honey and herbal products.\n\nManufactured and packed by: Ecovera Global Industries.\nMarketed by: Ecory Food and Consumer Products, Shekhati, Sadar, Jashore, Bangladesh.\n\nHead office: 10/A, Sector 7, below Hotel Al-Safa, New Market Bus Stand, Sadar, Jashore 7400.")} /></p>
    <a href="https://ecorybd.com/" target="_blank" rel="noopener noreferrer" className="block font-semibold underline">ecorybd.com ↗</a>
    <a href={support.callHref} className="block">{support.callDisplay}</a>
    <a href={support.whatsappHref} target="_blank" rel="noopener noreferrer" className="block">WhatsApp: {support.whatsappDisplay}</a>
  </section>;
}
