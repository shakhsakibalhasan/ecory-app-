import {createFileRoute,useNavigate} from "@tanstack/react-router";
import {Shell} from "@/components/Shell";
import {ProductCard} from "@/components/ProductCard";
import {ProductDetails} from "@/routes/product.$id";
import {useProducts,useStore} from "@/lib/store";
import {offerProduct,useOffers} from "@/lib/offers";
export const Route=createFileRoute("/offers")({
  staticData: { sitemap: true },
  head: () => ({ meta: [{ title: "পণ্য অফার — ইকোরি" }, { name: "description", content: "ইকোরির বর্তমানে প্রকাশিত পণ্য অফার ও বিশেষ মূল্য দেখুন।" }, { property: "og:title", content: "পণ্য অফার — ইকোরি" }, { property: "og:description", content: "ইকোরির বর্তমানে প্রকাশিত পণ্য অফার ও বিশেষ মূল্য দেখুন।" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),validateSearch:(s:Record<string,unknown>)=>({offer:typeof s["offer"]==="string"?s["offer"]:undefined}),component:Offers});
function Offers(){
 const {lang,favourites,toggleFavourite}=useStore();const {offer}=Route.useSearch();const nav=useNavigate();
 const {data=[],isLoading,error}=useOffers();const {data:products=[]}=useProducts();const selected=data.find(o=>o.id===offer);
 if(selected){const base=products.find(p=>p.id===selected.product_id);const p=offerProduct(selected,base);return <ProductDetails key={selected.id} id={p.id} productOverride={p} offerId={selected.id} linkedProduct={!!base}/>;}
 return <Shell title={lang==="bn"?"সব অফার":"All offers"} commerceActions>
 {isLoading?<p>{lang==="bn"?"লোড হচ্ছে…":"Loading…"}</p>:error?<p>{lang==="bn"?"অফার লোড হয়নি। পরে চেষ্টা করুন।":"Unable to load offers."}</p>:offer?<p>{lang==="bn"?"অফারটি আর পাওয়া যাচ্ছে না":"Offer unavailable"}</p>:!data.length?<p>{lang==="bn"?"এখন কোনো অফার নেই":"No offers are published"}</p>:<div className="grid grid-cols-2 gap-4">{data.map(o=>{const p=offerProduct(o,products.find(x=>x.id===o.product_id));return <ProductCard key={o.id} product={p} lang={lang} appearance="home" offerId={o.id} favourite={favourites.includes(p.id)} onFavourite={()=>toggleFavourite(p.id)} onAdd={()=>void nav({to:"/checkout",search:{offer:o.id,qty:1}})}/>;})}</div>}
 </Shell>;
}
