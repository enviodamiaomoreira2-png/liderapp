
'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowRight,BadgeCheck,Check,CheckCircle2,ChevronLeft,ChevronRight,CloudUpload,Code2,ExternalLink,FileText,Globe2,Image as ImageIcon,LayoutTemplate,LoaderCircle,Monitor,Palette,Plus,RefreshCw,Rocket,Save,Search,Settings2,ShieldCheck,Smartphone,Trash2,UploadCloud,Wallet,X} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {type SiteBrief,initialSiteBrief,renderClientSite,slug} from '@/lib/delivery-site';

type SiteRecord={id:string;user_id:string;organization_id:string|null;client_name:string;project_slug:string;site_data:SiteBrief;media_urls:string[];status:'draft'|'publishing'|'published'|'needs_setup'|'error';github_repo:string|null;github_url:string|null;vercel_project_id:string|null;vercel_url:string|null;domain:string|null;domain_order_id:string|null;last_error:string|null;created_at:string;updated_at:string};
type Org={id:string;name:string};
type Quote={domain:string;available:boolean;price:number;renewalPrice:number|null;premium:boolean;currency:string;years:number;quoteId:string;expiresAt:string;note:string};
type Integrations={configured:{github:boolean;vercel:boolean;team:boolean;admin:boolean};missing:string[];settingsUrl:string};
type Contact={firstName:string;lastName:string;email:string;phone:string;address1:string;city:string;state:string;zip:string;country:string;companyName:string};
const blankContact:Contact={firstName:'',lastName:'',email:'',phone:'',address1:'',city:'',state:'',zip:'',country:'BR',companyName:''};
const styles:[SiteBrief['style'],string,string][]=[['premium','Elegante','Luxuoso e sofisticado'],['minimal','Minimalista','Leve e editorial'],['bold','Impactante','Contraste e presença']];
const clean=(s:string)=>s.trim();
const usd=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v);
const stateText:Record<SiteRecord['status'],string>={draft:'Rascunho',publishing:'Publicando',published:'Publicado',needs_setup:'Configurar acesso',error:'Atenção'};
function errMsg(e:unknown){return e instanceof Error?e.message:'Não foi possível concluir a operação.'}
export default function EntregaWorkspace({userId}:{userId:string}){
 const [subtab,setSubtab]=useState<'builder'|'projects'>('builder');
 const [brief,setBrief]=useState<SiteBrief>({...initialSiteBrief});
 const [sites,setSites]=useState<SiteRecord[]>([]);
 const [orgs,setOrgs]=useState<Org[]>([]);
 const [selectedOrg,setSelectedOrg]=useState('');
 const [activeSite,setActiveSite]=useState<SiteRecord|null>(null);
 const [device,setDevice]=useState<'desktop'|'mobile'>('desktop');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false);
 const [notice,setNotice]=useState(''),[query,setQuery]=useState('');
 const [integrations,setIntegrations]=useState<Integrations|null>(null);
 const [domainName,setDomainName]=useState(''),[quote,setQuote]=useState<Quote|null>(null),[domainLoading,setDomainLoading]=useState(false);
 const [checkout,setCheckout]=useState(false),[contact,setContact]=useState<Contact>({...blankContact}),[acceptCharge,setAcceptCharge]=useState(false);
 const [domainOrder,setDomainOrder]=useState('');
 const change=<K extends keyof SiteBrief>(key:K,val:SiteBrief[K])=>setBrief(old=>({...old,[key]:val}));
 const preview=useMemo(()=>renderClientSite(brief),[brief]);
 const refresh=useCallback(async()=>{
  if(!supabase)return;
  const [a,b]=await Promise.all([
   supabase.from('delivery_sites').select('*').eq('user_id',userId).order('updated_at',{ascending:false}),
   supabase.from('crm_organizations').select('id,name').eq('user_id',userId).order('name')
  ]);
  if(a.error||b.error)setNotice('Erro ao carregar entregas: '+(a.error||b.error)?.message);
  else{setSites((a.data||[]) as SiteRecord[]);setOrgs((b.data||[]) as Org[])}
  setLoading(false);
 },[userId]);
 const api=useCallback(async(path:string,method='GET',data?:unknown)=>{
  if(!supabase)throw new Error('O banco de dados não está conectado.');
  const {data:session,error}=await supabase.auth.getSession();
  if(error||!session.session)throw new Error('Sua sessão expirou. Entre novamente.');
  const res=await fetch(path,{method,headers:{Authorization:'Bearer '+session.session.access_token,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,cache:'no-store'});
  const payload=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(payload.error||'Erro '+res.status);
  return payload;
 },[]);
 useEffect(()=>{void refresh();void api('/api/entrega/config').then(setIntegrations).catch(()=>{})},[refresh,api]);
 const openSite=(site:SiteRecord)=>{
  setActiveSite(site);setBrief({...initialSiteBrief,...(site.site_data||{}),clientName:site.client_name});
  setSelectedOrg(site.organization_id||'');setDomainName(site.domain||'');setQuote(null);setCheckout(false);setDomainOrder('');
  setSubtab('builder');setNotice('');
 };
 const newSite=()=>{
  setBrief({...initialSiteBrief});setActiveSite(null);setSelectedOrg('');setQuote(null);setCheckout(false);setDomainName('');setDomainOrder('');
  setSubtab('builder');setNotice('');
 };
 const saveDraft=async(override?:SiteBrief)=>{
  if(!supabase)throw new Error('Supabase não conectado.');
  const current=override||brief;
  const company=clean(current.clientName);
  if(company.length<2)throw new Error('Informe o nome da empresa antes de salvar.');
  if(company.length>160)throw new Error('Nome da empresa muito longo.');
  const payload={client_name:company,organization_id:selectedOrg||null,site_data:current,
   media_urls:[...(current.imageUrls||[]),...(current.logoUrl?[current.logoUrl]:[])],updated_at:new Date().toISOString()};
  let saved:SiteRecord;
  if(activeSite){
   const status=activeSite.status==='published'?'draft':activeSite.status==='publishing'?'publishing':'draft';
   const {data,error}=await supabase.from('delivery_sites').update({...payload,status}).eq('id',activeSite.id).eq('user_id',userId).select('*').single();
   if(error)throw new Error(error.message);
   saved=data as SiteRecord;
  }else{
   const unique=slug(company)+'-'+crypto.randomUUID().slice(0,7);
   const {data,error}=await supabase.from('delivery_sites').insert({...payload,user_id:userId,project_slug:unique,status:'draft'}).select('*').single();
   if(error)throw new Error(error.message);
   saved=data as SiteRecord;
  }
  setActiveSite(saved);
  await refresh();
  return saved;
 };
 const handleSave=async()=>{setBusy(true);try{await saveDraft();setNotice('Rascunho salvo no Liderapp. Nenhum site foi publicado ainda.')}catch(e){setNotice(errMsg(e))}finally{setBusy(false)}};
 const filesUploaded=async(files:FileList|null,type:'photos'|'logo')=>{
  if(!files?.length||!supabase)return;
  if(!brief.clientName.trim()){setNotice('Informe o nome do cliente antes de subir fotos.');return}
  const arr=Array.from(files).slice(0,type==='logo'?1:10);
  for(const f of arr)if(f.size>10*1024*1024||!['image/jpeg','image/png','image/webp','image/avif'].includes(f.type)){setNotice('Aceitamos JPG, PNG, WebP ou AVIF com até 10 MB por arquivo.');return}
  setUploading(true);
  try{
   const saved=await saveDraft();
   const uploads:string[]=[];
   for(const file of arr){
    const ext=file.type.split('/')[1].replace('jpeg','jpg');
    const path=userId+'/'+saved.id+'/'+crypto.randomUUID()+'.'+ext;
    const {error}=await supabase.storage.from('delivery-media').upload(path,file,{upsert:false,contentType:file.type});
    if(error)throw new Error('Falha ao enviar '+file.name+': '+error.message);
    const {data}=supabase.storage.from('delivery-media').getPublicUrl(path);
    uploads.push(data.publicUrl);
   }
   const next:SiteBrief=type==='logo'?{...brief,logoUrl:uploads[0]}:{...brief,imageUrls:[...brief.imageUrls,...uploads].slice(0,10)};
   setBrief(next);
   // Save the new urls explicitly rather than relying on asynchronous React state.
   const {data,error}=await supabase.from('delivery_sites').update({
    site_data:next,media_urls:[...(next.imageUrls||[]),...(next.logoUrl?[next.logoUrl]:[])],status:'draft',
    updated_at:new Date().toISOString()
   }).eq('id',saved.id).eq('user_id',userId).select('*').single();
   if(error)throw new Error(error.message);
   setActiveSite(data as SiteRecord);await refresh();
   setNotice(uploads.length+' arquivo(s) recebido(s). As imagens têm URL pública para uso no site; não envie conteúdo confidencial.');
  }catch(e){setNotice(errMsg(e))}finally{setUploading(false)}
 };
 const publish=async()=>{
  if(!clean(brief.clientName)||(!clean(brief.segment)&&!clean(brief.services))){setNotice('Informe a empresa e pelo menos o segmento ou os serviços. O título principal pode ser gerado automaticamente.');return}
  setBusy(true);
  try{
   const saved=await saveDraft();
   if(!integrations?.configured.github||!integrations?.configured.vercel||!integrations?.configured.team||!integrations?.configured.admin){
    setNotice('O site foi salvo, mas a publicação automática exige configurar as integrações de servidor na Vercel. Confira o aviso abaixo.');
    return;
   }
   const result=await api('/api/entrega/publish','POST',{siteId:saved.id});
   setNotice(result.note||'Publicação iniciada.');
   await refresh();
  }catch(e){setNotice(errMsg(e));await refresh()}finally{setBusy(false)}
 };
 const checkDeploy=async()=>{
  if(!activeSite)return;
  setBusy(true);
  try{
   const data=await api('/api/entrega/status?siteId='+encodeURIComponent(activeSite.id));
   setNotice(data.note||data.error||(data.status==='published'?'Site publicado na Vercel!':'Status: '+data.status));
   await refresh();
   const {data:site}=await supabase!.from('delivery_sites').select('*').eq('id',activeSite.id).eq('user_id',userId).single();
   if(site)setActiveSite(site as SiteRecord);
  }catch(e){setNotice(errMsg(e))}finally{setBusy(false)}
 };
 const checkDomain=async()=>{
  if(!activeSite){setNotice('Salve o site antes de pesquisar domínio.');return}
  setDomainLoading(true);setQuote(null);setCheckout(false);setDomainOrder('');
  try{
   const result=await api('/api/entrega/domains/quote','POST',{siteId:activeSite.id,domain:domainName});
   setQuote(result as Quote);
   if(!result.available)setNotice(result.note||'Domínio indisponível.');
  }catch(e){setNotice(errMsg(e))}finally{setDomainLoading(false)}
 };
 const purchase=async()=>{
  if(!activeSite||!quote||!acceptCharge)return;
  const understood=window.confirm('CONFIRMAR COMPRA DE '+quote.domain.toUpperCase()+' POR '+usd(quote.price)+' / '+quote.years+' ANO(S)? A Vercel cobrará o pagamento da conta conectada. A compra pode ser irreversível.');
  if(!understood)return;
  setBusy(true);
  try{
   const response=await api('/api/entrega/domains/buy','POST',{
    siteId:activeSite.id,quoteId:quote.quoteId,confirm:true,confirmText:'COMPRAR '+quote.domain,contact
   });
   setDomainOrder(response.orderId);setCheckout(false);setQuote(null);
   setNotice(response.note||'Pedido enviado ao registrador.');
   await refresh();
  }catch(e){setNotice(errMsg(e));setQuote(null)}finally{setBusy(false)}
 };
 const checkOrder=async()=>{
  if(!activeSite)return;setDomainLoading(true);
  try{
   const result=await api('/api/entrega/domains/order?siteId='+encodeURIComponent(activeSite.id));
   setNotice(result.message||'Registro: '+result.status);
   await refresh();
   const {data}=await supabase!.from('delivery_sites').select('*').eq('id',activeSite.id).eq('user_id',userId).single();
   if(data)setActiveSite(data as SiteRecord);
  }catch(e){setNotice(errMsg(e))}finally{setDomainLoading(false)}
 };
 const chooseOrg=(id:string)=>{setSelectedOrg(id);const o=orgs.find(o=>o.id===id);if(o)change('clientName',o.name)};
 const siteStatus=(record:SiteRecord)=>record.status==='published'?'published':record.status;
 const integrationMissing=integrations?.missing||[];
 const filteredSites=sites.filter(s=>(s.client_name+' '+s.project_slug).toLowerCase().includes(query.toLowerCase()));
 return <div className="delivery-root">
  <header className="delivery-head"><div><div className="delivery-eyebrow">LIDERAPP / OPERAÇÕES / ENTREGA</div><h1>Entrega <span>de projetos</span></h1><p>Do briefing ao site publicado — organizado em um único lugar.</p></div><button className="delivery-primary" onClick={newSite}><Plus size={17}/> Novo site</button></header>
  <div className="delivery-tabs" role="tablist"><button role="tab" aria-selected={subtab==='builder'} className={subtab==='builder'?'active':''} onClick={()=>setSubtab('builder')}><LayoutTemplate size={17}/> Construtor de sites</button><button role="tab" aria-selected={subtab==='projects'} className={subtab==='projects'?'active':''} onClick={()=>setSubtab('projects')}><Globe2 size={17}/> Projetos e entregas <span>{sites.length}</span></button></div>
  {notice&&<div className="delivery-notice" role="status"><span>{notice}</span><button aria-label="Fechar aviso" onClick={()=>setNotice('')}><X size={17}/></button></div>}
  {subtab==='projects'?<>
   <div className="delivery-project-head"><div><h2>Seus sites</h2><p>Sites em construção, publicados e pendentes de configuração.</p></div><label className="delivery-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar empresa..."/></label></div>
   {loading?<p className="delivery-hint">Carregando projetos...</p>:filteredSites.length?<div className="delivery-project-grid">{filteredSites.map(s=><button key={s.id} onClick={()=>openSite(s)} className="delivery-project-card"><div className="delivery-project-top"><div className="delivery-avatar">{s.client_name.slice(0,1).toUpperCase()}</div><span className={'delivery-status '+siteStatus(s)}>{stateText[s.status]}</span></div><h3>{s.client_name}</h3><p>{s.site_data?.segment||'Site institucional'}</p><div className="delivery-project-links">{s.domain||s.vercel_url||'Aguardando publicação'}</div><div className="delivery-project-footer"><span>Atualizado em {new Date(s.updated_at).toLocaleDateString('pt-BR')}</span><ArrowRight size={16}/></div></button>)}</div>:<div className="delivery-empty"><Globe2 size={32}/><h3>Nenhum site por aqui</h3><p>Crie seu primeiro projeto usando o construtor.</p><button className="delivery-primary" onClick={newSite}><Plus size={16}/> Criar site</button></div>}
  </>:<>
   <div className="delivery-summary"><div><span className="delivery-step">01</span> Briefing e marca</div><div><span className="delivery-step">02</span> Fotos e conteúdo</div><div><span className="delivery-step">03</span> Prévia e publicação</div><div><span className="delivery-step">04</span> Domínio e entrega</div></div>
   <div className="delivery-builder-grid"><div className="delivery-edit">
    <section className="delivery-panel"><div className="delivery-section-head"><div><span className="delivery-tag">IDENTIDADE DO CLIENTE</span><h2>Vamos construir a presença digital.</h2></div><FileText size={22}/></div>
     <div className="delivery-fields">
      {orgs.length>0&&<label className="delivery-field full">Vincular cliente do CRM <select value={selectedOrg} onChange={e=>chooseOrg(e.target.value)}><option value="">Não vincular / cliente novo</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>}
      <label className="delivery-field full">Nome da empresa <input value={brief.clientName} maxLength={160} onChange={e=>change('clientName',e.target.value)} placeholder="Ex.: SuperAR Climatiza"/></label>
      <label className="delivery-field">Segmento de atuação <input value={brief.segment} onChange={e=>change('segment',e.target.value)} placeholder="Ex.: Climatização e manutenção"/></label>
      <label className="delivery-field">Cidade / região <input value={brief.city} onChange={e=>change('city',e.target.value)} placeholder="Ex.: Uberlândia, MG"/></label>
      <label className="delivery-field full">Título principal (opcional — gerado automaticamente) <textarea rows={2} maxLength={180} value={brief.headline} onChange={e=>change('headline',e.target.value)} placeholder="Ex.: Conforto e qualidade em climatização"/></label>
      <label className="delivery-field full">Texto de apoio <textarea rows={2} maxLength={320} value={brief.subheadline} onChange={e=>change('subheadline',e.target.value)} placeholder="O que a empresa oferece e por que escolher ela?"/></label>
      <label className="delivery-field full">Sobre a empresa <textarea rows={4} maxLength={2300} value={brief.description} onChange={e=>change('description',e.target.value)} placeholder="História, expertise, proposta de valor..."/></label>
      <label className="delivery-field full">Serviços ou produtos <textarea rows={5} value={brief.services} onChange={e=>change('services',e.target.value)} placeholder={'Instalação de ar-condicionado\nHigienização de sistemas\nManutenção preventiva'}/><small>Um item por linha. Apenas itens informados serão publicados.</small></label>
      <label className="delivery-field full">Diferenciais <textarea rows={3} value={brief.benefits} onChange={e=>change('benefits',e.target.value)} placeholder={'Atendimento personalizado\nEquipe especializada\nAgendamento facilitado'}/><small>Um item por linha. Não inventamos avaliações ou resultados.</small></label>
     </div>
    </section>
    <section className="delivery-panel"><div className="delivery-section-head"><div><span className="delivery-tag">IDENTIDADE VISUAL</span><h2>Um design com a cara da marca.</h2></div><Palette size={22}/></div>
     <div className="delivery-style-grid">{styles.map(([key,title,description])=><button key={key} type="button" className={'delivery-style '+(brief.style===key?'active':'')} onClick={()=>change('style',key)}><div className={'delivery-style-art '+key}><span/><i/><i/></div><b>{title}</b><small>{description}</small></button>)}</div>
     <label className="delivery-color-field"><span>Cor principal da marca</span><input type="color" value={brief.primaryColor} onChange={e=>change('primaryColor',e.target.value)}/><code>{brief.primaryColor}</code></label>
     <div className="delivery-upload-head"><b>Logotipo</b><small>PNG, JPG, WebP ou AVIF — até 10 MB.</small></div>
     <label className="delivery-dropzone"><ImageIcon size={20}/><span>{uploading?'Enviando arquivo...':'Clique para enviar a logo do cliente'}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={e=>{void filesUploaded(e.target.files,'logo');e.target.value=''}}/></label>
     {brief.logoUrl&&<div className="delivery-logo-preview"><img alt="Logo do cliente" src={brief.logoUrl}/><button onClick={()=>change('logoUrl','')} title="Remover logo da página"><X size={16}/></button></div>}
     <div className="delivery-upload-head"><b>Fotos do cliente</b><small>Adicione até 10 imagens. A primeira aparece no topo do site.</small></div>
     <label className="delivery-dropzone"><UploadCloud size={22}/><span>{uploading?'Enviando imagens...':'Selecionar fotos do ambiente, produtos ou equipe'}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={uploading} onChange={e=>{void filesUploaded(e.target.files,'photos');e.target.value=''}}/></label>
     {brief.imageUrls.length>0&&<div className="delivery-gallery">{brief.imageUrls.map((url,i)=><div key={url} className="delivery-thumb"><img src={url} alt={'Foto '+(i+1)}/><button aria-label="Remover da página" title="Remover da página" onClick={()=>change('imageUrls',brief.imageUrls.filter(x=>x!==url))}><X size={15}/></button></div>)}</div>}
    </section>
    <section className="delivery-panel"><div className="delivery-section-head"><div><span className="delivery-tag">CONTATO & CONVERSÃO</span><h2>Como o visitante vai falar com o cliente?</h2></div><Globe2 size={22}/></div>
     <div className="delivery-fields"><label className="delivery-field">WhatsApp com DDI <input value={brief.whatsapp} onChange={e=>change('whatsapp',e.target.value)} placeholder="Ex.: 55 34 99999-9999"/></label>
     <label className="delivery-field">E-mail <input type="email" value={brief.email} onChange={e=>change('email',e.target.value)} placeholder="contato@empresa.com.br"/></label>
     <label className="delivery-field">Instagram <input value={brief.instagram} onChange={e=>change('instagram',e.target.value)} placeholder="@empresa"/></label>
     <label className="delivery-field">Endereço ou região de atendimento <input value={brief.address} onChange={e=>change('address',e.target.value)} placeholder="Rua, cidade, estado"/></label></div>
    </section>
   </div>
   <aside className="delivery-preview-column">
    <section className="delivery-panel delivery-preview-panel"><div className="delivery-preview-bar"><div><span className="delivery-tag">PRÉ-VISUALIZAÇÃO</span><h2>Veja antes de publicar.</h2></div><div className="delivery-device"><button className={device==='desktop'?'active':''} title="Computador" onClick={()=>setDevice('desktop')}><Monitor size={18}/></button><button className={device==='mobile'?'active':''} title="Celular" onClick={()=>setDevice('mobile')}><Smartphone size={18}/></button></div></div>
     <div className={'delivery-preview-frame '+device}><div className="delivery-browser"><span/><span/><span/><div>{'Prévia local · site do cliente'}</div></div><iframe title="Prévia do site em construção" srcDoc={preview} sandbox="" loading="lazy"/></div>
     <div className="delivery-preview-actions"><button className="delivery-outline" disabled={busy||uploading} onClick={()=>void handleSave()}><Save size={17}/> {busy?'Salvando...':'Salvar rascunho'}</button><button className="delivery-primary" disabled={busy||uploading} onClick={()=>void publish()}><Rocket size={17}/> {busy?'Processando...':activeSite?.github_repo?'Atualizar publicação':'Criar site e publicar'}</button></div>
     {activeSite&&<div className="delivery-publish-summary"><span className={'delivery-status '+siteStatus(activeSite)}>{stateText[activeSite.status]}</span><strong>{activeSite.client_name}</strong>
       {activeSite.github_url&&<a href={activeSite.github_url} target="_blank" rel="noopener noreferrer"><Code2 size={15}/> Abrir repositório GitHub <ExternalLink size={14}/></a>}
       {activeSite.vercel_url&&<a href={activeSite.vercel_url} target="_blank" rel="noopener noreferrer"><Globe2 size={15}/> Abrir site publicado <ExternalLink size={14}/></a>}
       {activeSite.vercel_project_id&&<button className="delivery-inline-button" disabled={busy} onClick={()=>void checkDeploy()}><RefreshCw size={15}/> Verificar deploy na Vercel</button>}
       {activeSite.last_error&&<p className="delivery-error">{activeSite.last_error}</p>}
      </div>}
     {integrationMissing.length>0&&<div className="delivery-integration-warning"><Settings2 size={19}/><div><b>Ativação da publicação automática</b><p>Para o site criar repositórios e projetos sozinho, configure no ambiente seguro da Vercel: <strong>{integrationMissing.join(', ')}</strong>. A conexão do ChatGPT não transfere credenciais para o app.</p><a href={integrations?.settingsUrl||'https://vercel.com/dashboard'} target="_blank" rel="noopener noreferrer">Abrir configurações da Vercel <ExternalLink size={13}/></a></div></div>}
    </section>
    <section className="delivery-panel delivery-domain-panel"><div className="delivery-section-head"><div><span className="delivery-tag">REGISTRO DE DOMÍNIO</span><h2>Seu domínio, sem sair do Liderapp.</h2></div><Globe2 size={22}/></div>
     <p className="delivery-hint">Pesquise disponibilidade e consulte o preço real do registrador Vercel. A compra depende da sua confirmação e dos dados legais do titular.</p>
     <div className="delivery-domain-search"><input value={domainName} onChange={e=>{setDomainName(e.target.value.toLowerCase());setQuote(null);setCheckout(false)}} placeholder="nomedocliente.com.br" aria-label="Nome do domínio"/><button disabled={domainLoading||!activeSite} className="delivery-primary" onClick={()=>void checkDomain()}><Search size={16}/>{domainLoading?'Consultando...':'Pesquisar'}</button></div>
     {!activeSite&&<p className="delivery-hint">Salve o projeto para pesquisar um domínio.</p>}
     {quote?.available&&<div className="delivery-domain-offer"><div><span className="delivery-dot"/> <b>{quote.domain}</b> <small>Disponível</small></div><strong>{usd(quote.price)} <small>/{quote.years} ano(s)</small></strong><p>Renovação informada: {quote.renewalPrice?usd(quote.renewalPrice):'consulte o registrador'}. Valores em dólares (USD); câmbio e taxas do cartão podem variar.</p>
       <button className="delivery-outline" onClick={()=>{setCheckout(true);setAcceptCharge(false)}} disabled={!activeSite?.vercel_project_id}><Wallet size={16}/> Continuar compra segura</button>
       {!activeSite?.vercel_project_id&&<p>Publique primeiro o site para poder associar o domínio automaticamente.</p>}
      </div>}
     {(activeSite?.domain_order_id||domainOrder)&&<div className="delivery-domain-order"><BadgeCheck size={20}/><div><b>Pedido de domínio enviado</b><p>O registro pode levar algum tempo. Verifique o status antes de considerar a compra concluída.</p><button disabled={domainLoading} onClick={()=>void checkOrder()} className="delivery-inline-button"><RefreshCw size={15}/> Consultar pedido</button></div></div>}
     {activeSite?.domain&&<div className="delivery-domain-linked"><CheckCircle2 size={18}/> Domínio registrado: <strong>{activeSite.domain}</strong></div>}
    </section>
   </aside></div>
  </>}
  {checkout&&quote&&<div className="delivery-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setCheckout(false)}}><div className="delivery-dialog" role="dialog" aria-modal="true" aria-label="Confirmação de compra do domínio">
   <header><div><span className="delivery-tag">COMPRA COM CONFIRMAÇÃO</span><h2>Registrar {quote.domain}</h2><p>Preço cotado: <b>{usd(quote.price)} / {quote.years} ano(s)</b>, cobrado pela Vercel.</p></div><button aria-label="Fechar" onClick={()=>setCheckout(false)}><X size={18}/></button></header>
   <p className="delivery-hint">Preencha os dados verdadeiros do titular. Alguns domínios brasileiros exigem documentos adicionais e podem não ser oferecidos pela Vercel.</p>
   <div className="delivery-contact-grid">{([['firstName','Nome'],['lastName','Sobrenome'],['email','E-mail'],['phone','Telefone com DDI'],['address1','Endereço'],['city','Cidade'],['state','Estado (sigla)'],['zip','CEP'],['country','País (ISO)'],['companyName','Empresa (opcional)']] as [keyof Contact,string][]).map(([key,label])=><label className="delivery-field" key={key}>{label}<input value={contact[key]} onChange={e=>setContact(old=>({...old,[key]:e.target.value}))} placeholder={label}/></label>)}</div>
   <label className="delivery-confirm"><input type="checkbox" checked={acceptCharge} onChange={e=>setAcceptCharge(e.target.checked)}/><span>Confirmo que desejo comprar <strong>{quote.domain}</strong> por <strong>{usd(quote.price)}</strong> na minha conta Vercel. Sei que a cobrança poderá ser imediata e não reembolsável. Renovação automática desativada por padrão.</span></label>
   <div className="delivery-dialog-actions"><button className="delivery-outline" onClick={()=>setCheckout(false)}>Cancelar</button><button className="delivery-primary" disabled={busy||!acceptCharge} onClick={()=>void purchase()}><ShieldCheck size={16}/> {busy?'Processando...':'Confirmar compra'}</button></div>
  </div></div>}
 </div>;
}
