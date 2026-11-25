
import {NextRequest,NextResponse} from 'next/server';
import {authorized,config,responseError,requiredKeys} from '@/lib/delivery-server';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 try{
  await authorized(request);
  return NextResponse.json({configured:config(),missing:requiredKeys(),domainSearch:true,siteBuilder:true,
   settingsUrl:'https://vercel.com/hengelvercel/liderapp/settings/environment-variables'});
 }catch(e){return responseError(e)}
}
