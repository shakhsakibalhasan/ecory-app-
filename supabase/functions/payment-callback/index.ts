import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async(req:Request)=>{
 const url=new URL(req.url);const id=url.searchParams.get('session');const origin=Deno.env.get('APP_ORIGIN')||'https://ecory.app';
 try{
 if(!id||!/^[0-9a-f-]{36}$/.test(id))return new Response('Invalid session',{status:400});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const {data:session}=await db.from('payment_sessions').select('*,orders(code)').eq('id',id).single();if(!session)return new Response('Session not found',{status:404});
 const content=req.method==='POST'?await req.formData():null;const valId=String(content?.get('val_id')||url.searchParams.get('val_id')||'');
 if(valId){
 const base=Deno.env.get('SSLCOMMERZ_LIVE')==='true'?'https://securepay.sslcommerz.com':'https://sandbox.sslcommerz.com';
 const query=new URLSearchParams({val_id:valId,store_id:Deno.env.get('SSLCOMMERZ_STORE_ID')||'',store_passwd:Deno.env.get('SSLCOMMERZ_STORE_PASSWORD')||'',v:'1',format:'json'});
 const response=await fetch(base+'/validator/api/validationserverAPI.php?'+query);const validated=await response.json();
 if(response.ok&&['VALID','VALIDATED'].includes(validated.status)&&validated.tran_id===session.transaction_id&&validated.currency==='BDT'&&Math.abs(Number(validated.amount)-Number(session.amount))<.01&&String(validated.risk_level||'0')==='0'){
 const {error}=await db.rpc('complete_gateway_payment',{_session_id:session.id,_transaction_id:validated.bank_tran_id||validated.tran_id});if(error)return new Response('Payment verification requires retry',{status:500});
 }else{return new Response('Payment not verified. Please contact Ecory support.',{status:400});}
 }else if(url.searchParams.get('result')==='success')return new Response('Payment confirmation pending. Check your Ecory order status.',{status:202});
 // IPN is acknowledged without relying on customer redirect or its claimed status.
 if(!url.searchParams.has('result'))return new Response('OK');
 const destination=new URL('/track',origin);destination.searchParams.set('code',session.orders.code);return Response.redirect(destination.href,303);
 }catch{return new Response('Payment verification unavailable. Contact Ecory support.',{status:500});}
});
