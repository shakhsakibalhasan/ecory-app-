import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
 const enabled=Deno.env.get('PAYMENT_ENABLED')==='true';const storeId=Deno.env.get('SSLCOMMERZ_STORE_ID'),password=Deno.env.get('SSLCOMMERZ_STORE_PASSWORD');const ready=enabled&&!!storeId&&!!password;
 const body=await req.json();if(body.action==='ready')return json({ready});if(!ready)return json({error:'Gateway not configured'},503);
 const {code,phone,email,method}=body;if(typeof code!=='string'||typeof phone!=='string'||!/^01\d{9}$/.test(phone)||typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||!['bkash','online','nagad'].includes(method))return json({error:'Invalid request'},400);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const {data:order,error}=await db.from('orders').select('id,code,total,paid_amount,customer_name,phone,address,payment_method,status,payment_status,items').eq('code',code).eq('phone',phone).maybeSingle();if(error||!order||order.status==='cancelled'||order.payment_method!==method)return json({error:'Order unavailable'},404);
 const {data:settings}=await db.from('site_settings').select('payments').eq('id',1).single();if(settings?.payments?.[method]!==true)return json({error:'Payment disabled'},400);
 if(order.payment_status==='paid')return json({error:'Order already paid'},409);
 const amount=order.total-(order.paid_amount||0);if(amount<10)return json({error:'Invalid amount'},400);
 const {data:existing}=await db.from('payment_sessions').select('gateway_url,status').eq('order_id',order.id).maybeSingle();if(existing){if(existing.status==='pending'&&existing.gateway_url)return json({url:existing.gateway_url});return json({error:'Payment already started. Check order status or contact support.'},409);}
 const session={id:crypto.randomUUID(),order_id:order.id,transaction_id:crypto.randomUUID().replaceAll('-','').slice(0,24),amount,method,status:'creating'};
 const {error:insert}=await db.from('payment_sessions').insert(session);if(insert)return json({error:'Payment is already being prepared'},409);
 const live=Deno.env.get('SSLCOMMERZ_LIVE')==='true';const base=live?'https://securepay.sslcommerz.com':'https://sandbox.sslcommerz.com';const callback=`${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-callback?session=${session.id}`;
 const form=new URLSearchParams({store_id:storeId!,store_passwd:password!,total_amount:String(amount),currency:'BDT',tran_id:session.transaction_id,success_url:callback+'&result=success',fail_url:callback+'&result=failed',cancel_url:callback+'&result=cancelled',ipn_url:callback,cus_name:order.customer_name,cus_email:email,cus_add1:order.address,cus_city:'Bangladesh',cus_country:'Bangladesh',cus_phone:phone,shipping_method:'NO',num_of_item:String(order.items.length),product_name:'Ecory order '+order.code,product_category:'General',product_profile:'general'});
 if(method==='bkash')form.set('multi_card_name','bkash');if(method==='nagad')form.set('multi_card_name','nagad');
 const response=await fetch(base+'/gwprocess/v4/api.php',{method:'POST',body:form});const gateway=await response.json();const url=typeof gateway.GatewayPageURL==='string'?gateway.GatewayPageURL:'';const host=url?new URL(url):null;
 if(!response.ok||gateway.status!=='SUCCESS'||!host||host.protocol!=='https:'||!(host.hostname==='sslcommerz.com'||host.hostname.endsWith('.sslcommerz.com'))){await db.from('payment_sessions').update({status:'failed'}).eq('id',session.id);return json({error:'Provider could not create a payment session'},502);}
 const {error:save}=await db.from('payment_sessions').update({status:'pending',gateway_url:url,provider_session:gateway.sessionkey}).eq('id',session.id);if(save)return json({error:'Could not save payment session'},500);
 return json({url});
 }catch{return json({error:'Payment service unavailable'},500);}
});
