
import {NextRequest,NextResponse} from 'next/server';
import {ApiError,authorized,responseError,siteForOwner,teamQuery,vercelHeaders} from '@/lib/delivery-server';
export const runtime='nodejs';
export const maxDuration=30;
const acceptableContact=(c:Record<string,unknown>)=>{
 const required=['firstName','lastName','email','phone','address1','city','state','zip','country'] as const;
 for(const k of required)if(typeof c[k]!=='string'||!(c[k] as string).trim()||(c[k] as string).length>180)throw new ApiError(400,'Preencha todos os dados do titular do domínio.');
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email as string))throw new ApiError(400,'E-mail do titular inválido.');
 if(!/^[A-Z]{2}$/.test(c.country as string))throw new ApiError(400,'Use o país no formato ISO, como BR.');
 return Object.fromEntries([...required,'companyName'].filter(k=>typeof c[k]==='string'&&(c[k] as string).trim()).map(k=>[k,(c[k] as string).trim()]));
};
export async function POST(req:NextRequest){
 try{
  const {db,user}=await authorized(req);
  if(!process.env.DELIVERY_VERCEL_TOKEN||!process.env.DELIVERY_VERCEL_TEAM_ID||!process.env.DELIVERY_ADMIN_EMAIL)
   throw new ApiError(412,'Para comprar domínios, configure a integração privada da Vercel no Liderapp.');
  if(user.email?.toLowerCase()!==process.env.DELIVERY_ADMIN_EMAIL.toLowerCase())
   throw new ApiError(403,'Conta não autorizada a efetuar compras no registrador.');
  const input=await req.json().catch(()=>({}));
  const siteId=String(input.siteId||''),quoteId=String(input.quoteId||'');
  const site=await siteForOwner(db,user.id,siteId);
  if(!site.vercel_project_id)throw new ApiError(412,'Publique o projeto na Vercel antes de registrar um domínio.');
  const {data:quote,error}=await db.from('delivery_domain_quotes').select('*')
   .eq('id',quoteId).eq('site_id',siteId).eq('user_id',user.id).maybeSingle();
  if(error||!quote)throw new ApiError(404,'Cotação não encontrada.');
  if(quote.status!=='quoted')throw new ApiError(409,'Esta cotação já foi processada; consulte o histórico do domínio antes de tentar outra.');
  if(new Date(quote.expires_at).getTime()<=Date.now())throw new ApiError(409,'Cotação expirada. Consulte o preço novamente.');
  if(input.confirm!==true||input.confirmText!=='COMPRAR '+quote.domain)
   throw new ApiError(400,'Confirme explicitamente a compra e o domínio exibido.');
  const contact=acceptableContact(input.contact||{});
  const {data:locked,error:lockError}=await db.from('delivery_domain_quotes').update({status:'processing'})
    .eq('id',quoteId).eq('site_id',siteId).eq('user_id',user.id).eq('status','quoted')
    .select('id').maybeSingle();
  if(lockError||!locked)throw new ApiError(409,'Pedido já iniciado. Não tente uma segunda compra antes de verificar o registro.');
  const url='https://api.vercel.com/v1/registrar/domains/'+encodeURIComponent(quote.domain)+'/buy'+teamQuery();
  let res:Response;
  try{res=await fetch(url,{method:'POST',headers:vercelHeaders(),body:JSON.stringify({
    years:quote.years,expectedPrice:Number(quote.price),autoRenew:false,contactInformation:contact
   }),cache:'no-store'});}
  catch(_e){throw new ApiError(502,'Não foi possível confirmar a resposta do registrador. O pedido pode ter sido enviado: confira na Vercel antes de tentar novamente.')}
  const data=await res.json().catch(()=>({}));
  if(!res.ok){
   await db.from('delivery_domain_quotes').update({status:'failed'}).eq('id',quoteId).eq('user_id',user.id);
   throw new ApiError(502,'O registrador recusou a compra: '+String(data.message||data.error?.message||res.status)+'. Nenhuma nova compra será iniciada com esta cotação.');
  }
  const orderId=String(data.orderId||'');
  if(!orderId)throw new ApiError(502,'Resposta de compra sem número de pedido. Confira a Vercel antes de tentar novamente.');
  await db.from('delivery_domain_quotes').update({status:'ordered',order_id:orderId}).eq('id',quoteId).eq('user_id',user.id);
  await db.from('delivery_sites').update({domain_order_id:orderId,updated_at:new Date().toISOString()}).eq('id',site.id).eq('user_id',user.id);
  return NextResponse.json({ok:true,orderId,domain:quote.domain,status:'processing',note:'Pedido enviado à Vercel; a compra é cobrada na conta Vercel. Aguarde confirmação do registro antes de considerar o domínio ativo.'});
 }catch(e){return responseError(e)}
}
