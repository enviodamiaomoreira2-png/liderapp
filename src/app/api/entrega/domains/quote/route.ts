
import {NextRequest,NextResponse} from 'next/server';
import {ApiError,authorized,responseError,siteForOwner,validDomain} from '@/lib/delivery-server';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 try{
  const{db,user}=await authorized(req);
  const input=await req.json().catch(()=>({}));
  const domain=String(input.domain||'').toLowerCase().trim();
  const siteId=String(input.siteId||'');
  await siteForOwner(db,user.id,siteId);
  if(!validDomain(domain))throw new ApiError(400,'Digite um domínio completo e válido, como empresa.com.br.');
  const res=await fetch('https://api.vercel.com/v1/registrar/domains/search',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({domains:[domain]}),cache:'no-store'
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new ApiError(502,String(data.message||data.error?.message||'Falha na consulta do registrador.'));
  const match=(data.results||[]).find((r:{domain:string})=>r.domain===domain);
  if(!match)throw new ApiError(502,'O registrador não retornou esta extensão de domínio.');
  const available=match.available===true;
  const price=Number(match.price);
  if(!available||!Number.isFinite(price)||price<=0){
   return NextResponse.json({domain,available:false,note:!available?'Domínio indisponível ou extensão não oferecida pelo registrador.':'Preço indisponível para esta extensão.'});
  }
  const years=Number(match.years)||1;
  if(years<1||years>10)throw new ApiError(502,'Prazo de registro não suportado pelo construtor.');
  const{data:quote,error}=await db.from('delivery_domain_quotes').insert({user_id:user.id,site_id:siteId,domain,price,years})
   .select('id,expires_at').single();
  if(error)throw new ApiError(500,error.message);
  return NextResponse.json({domain,available:true,price,renewalPrice:Number(match.renewalPrice)||null,
   years,currency:'USD',premium:!!match.premium,quoteId:quote.id,expiresAt:quote.expires_at,
   note:'Preço informado pelo registrador Vercel em USD. Não inclui eventual IOF ou conversão do cartão.'});
 }catch(e){return responseError(e)}
}
