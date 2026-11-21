import { useQuery } from "@/lib/query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Product } from "@/lib/store";
export type Offer = Tables<"offers">;
export function useOffers() {
 return useQuery({queryKey:["offers"],refetchInterval:60000,refetchOnWindowFocus:true,queryFn:async()=>{
 const r=await supabase.from("offers").select("*").eq("visible",true).order("sort");
 if(r.error)throw r.error;return r.data;
 }});
}
// Offer is a fixed bundle, not an invented size of its linked product.
export function offerProduct(o:Offer, base?:Product):Product {
 return {...base, id:base?.id||o.id, name_bn:o.title_bn, name_en:o.title_en||o.title_bn,
 image:o.image, price:o.price??0, old_price:o.old_price, variants:[],
 desc_bn:o.description_bn||base?.desc_bn||"",desc_en:o.description_en||base?.desc_en||o.description_bn||"",
 purpose_bn:"",purpose_en:"",best_selling:false,active:o.visible,in_stock:o.price!=null&&o.price>0&&(!base||base.in_stock),
 badges:base?.badges||[],benefits_bn:base?.benefits_bn||"",benefits_en:base?.benefits_en||"",
 category:base?.category||"",category_key:base?.category_key||null,caution_bn:base?.caution_bn||"",caution_en:base?.caution_en||"",
 created_at:o.created_at,featured:false,gallery:[],ingredients_bn:base?.ingredients_bn||"",ingredients_en:base?.ingredients_en||"",
 manual_locked:true,offer_text_bn:"",offer_text_en:"",related:[],short_bn:"",short_en:"",sku:base?.sku||"",sort:o.sort,
 source_url:"",status:"published",usage_bn:base?.usage_bn||"",usage_en:base?.usage_en||""};
}
// Convert known Ecory web URLs into routes, never launch an external checkout.
export function appOfferTarget(value:string, offers:Offer[]) {
 if(value.startsWith("//"))return null;
 let u:URL;try{u=new URL(value,"https://ecory.app");}catch{return null;}
 if(u.protocol!=="https:")return null;
 const allowed=["ecory.app","ecorybd.com","www.ecorybd.com","https-ecory-lovable-app.lovable.app"];
 if(!value.startsWith("/")&&!allowed.includes(u.hostname))return null;
 const configured=offers.find(o=>o.link===value&&!!value);if(configured)return {offer:configured.id};
 if(u.pathname==="/offers") {
 const id=u.searchParams.get("offer");if(id&&offers.some(o=>o.id===id))return {offer:id};
 }
 if(u.pathname==="/checkout") {
 const id=u.searchParams.get("offer");if(id&&offers.some(o=>o.id===id))return {offer:id};
 const buy=u.searchParams.get("buy");if(buy)return {buy,variant:u.searchParams.get("variant")||undefined,qty:Math.max(1,Math.min(99,Number(u.searchParams.get("qty"))||1))};
 }
 const match=offers.find(o=>o.link===value||o.id===value||o.product_id===u.pathname.match(/^\/product\/([^/]+)$/)?.[1]);
 return match?{offer:match.id}:null;
}

