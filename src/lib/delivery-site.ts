export type SiteBrief={
 clientName:string;segment:string;city:string;headline:string;subheadline:string;description:string;
 services:string;benefits:string;whatsapp:string;email:string;address:string;instagram:string;
 primaryColor:string;style:'premium'|'minimal'|'bold';logoUrl:string;imageUrls:string[];
 phone:string;hours:string;ctaLabel:string;whatsappMessage:string;videoUrl:string;videoTitle:string;
 faq:string;testimonials:string;process:string;galleryTitle:string;
 showFloatingWhatsapp:boolean;showMobileCta:boolean;heroMedia:'photo'|'video';
};
export const initialSiteBrief:SiteBrief={
 clientName:'',segment:'',city:'',headline:'',subheadline:'',description:'',services:'',benefits:'',
 whatsapp:'',email:'',address:'',instagram:'',primaryColor:'#a37b5b',style:'premium',logoUrl:'',
 imageUrls:[],phone:'',hours:'',ctaLabel:'',whatsappMessage:'',videoUrl:'',videoTitle:'',
 faq:'',testimonials:'',process:'',galleryTitle:'',showFloatingWhatsapp:true,showMobileCta:true,heroMedia:'photo'
};
const html=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const lines=(s:string,max=18)=>String(s||'').split(/\r?\n/).map(t=>t.trim()).filter(Boolean).slice(0,max);
const brand=(s:string)=>/^#[0-9A-F]{6}$/i.test(s)?s:'#a37b5b';
const media=(src:string)=>{try{const u=new URL(src);return u.protocol==='https:'&&/^[a-z0-9.-]+$/.test(u.hostname)&&u.pathname.includes('/storage/v1/object/public/delivery-media/')?u.toString():''}catch{return ''}};
const digits=(s:string)=>String(s||'').replace(/\D/g,'').slice(0,15);
const phoneNumber=(s:string)=>{const n=digits(s);return n.length===10||n.length===11?'55'+n:n};
const validContactEmail=(s:string)=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)?s.trim():'';
const instagram=(s:string)=>{
 const t=String(s||'').trim().replace(/^@/,'');
 if(/^[a-zA-Z0-9._]{1,30}$/.test(t))return 'https://www.instagram.com/'+t+'/';
 if(/^https:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._]{1,30}\/?$/.test(t))return t;
 return '';
};
export const slug=(value:string)=>String(value||'site').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'site';
type VideoInfo={kind:'youtube'|'vimeo'|'file';src:string}|null;
function videoLink(value:string):VideoInfo{
 try{
  const u=new URL(value);
  if(u.protocol!=='https:')return null;
  if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtu.be','youtube-nocookie.com','www.youtube-nocookie.com'].includes(u.hostname)){
   const id=u.hostname.includes('youtu.be')?u.pathname.slice(1):u.pathname.startsWith('/shorts/')?u.pathname.split('/')[2]:u.pathname.startsWith('/embed/')?u.pathname.split('/')[2]:u.searchParams.get('v')||'';
   return /^[\w-]{11}$/.test(id)?{kind:'youtube',src:'https://www.youtube-nocookie.com/embed/'+id+'?rel=0'}:null;
  }
  if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(u.hostname)){
   const id=u.pathname.split('/').filter(Boolean).pop()||'';
   return /^\d{6,12}$/.test(id)?{kind:'vimeo',src:'https://player.vimeo.com/video/'+id+'?dnt=1'}:null;
  }
  if(media(value)&&/\.(mp4|webm)$/i.test(u.pathname))return{kind:'file',src:u.toString()};
  return null;
 }catch{return null}
}
const parsePair=(s:string,max=10)=>lines(s,max).map(t=>{
 const i=t.indexOf('|');
 return i<1?null:[t.slice(0,i).trim(),t.slice(i+1).trim()];
}).filter((pair):pair is string[]=>!!pair&&pair[0].length>0&&pair[1].length>0);
const waPath='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';
const waIcon='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="25" height="25" fill="currentColor"><path d="'+waPath+'"/></svg>';
function contrast(hex:string){
 const rgb=[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)].map(n=>{const x=n/255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)});
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.42?'#101820':'#ffffff';
}
export function renderClientSite(input:SiteBrief){
 const b:SiteBrief={...initialSiteBrief,...input};
 const title=html(b.clientName||'Sua empresa');
 const services=lines(b.services,16);
 const benefits=lines(b.benefits,12);
 const faq=parsePair(b.faq,12);
 const reviews=parsePair(b.testimonials,9);
 const steps=lines(b.process,7);
 const images=(Array.isArray(b.imageUrls)?b.imageUrls:[]).map(media).filter(Boolean).slice(0,12);
 const cover=images[0]||'';
 const sideImage=images[1]||images[0]||'';
 const logo=media(b.logoUrl);
 const accent=brand(b.primaryColor);
 const accentText=contrast(accent);
 const first=services[0]||b.segment;
 const headline=html(b.headline|| (first?first+' com qualidade e atenção em cada detalhe.':b.clientName||'Experiências que fazem a diferença.'));
 const subheadline=html(b.subheadline||b.description.slice(0,195)|| (b.segment?b.segment+' em '+(b.city||'sua região')+'.':'Atendimento pensado para você.'));
 const description=html(b.description);
 const location=html(b.city||'');
 const email=validContactEmail(b.email);
 const wh=phoneNumber(b.whatsapp);
 const tel=phoneNumber(b.phone||b.whatsapp);
 const waUrl=wh?'https://wa.me/'+wh+'?text='+encodeURIComponent(b.whatsappMessage||'Olá! Visitei o site de '+(b.clientName||'vocês')+' e gostaria de saber mais sobre os serviços.'):'';
 const insta=instagram(b.instagram);
 const contactLink=waUrl||(tel?'tel:+'+tel:email?'mailto:'+email:'#contato');
 const contactText=html(b.ctaLabel||(waUrl?'Solicitar orçamento':tel?'Ligar agora':email?'Enviar mensagem':'Fale com a equipe'));
 const contactAttr=waUrl?' target="_blank" rel="noopener noreferrer"':'';
 const contactButton='<a class="button button-primary" href="'+html(contactLink)+'"'+contactAttr+'>'+contactText+'<span aria-hidden="true">↗</span></a>';
 const subject=b.segment?html(b.segment):'Serviços e soluções';
 const video=videoLink(b.videoUrl);
 const videoTitle=html(b.videoTitle||'Conheça nosso trabalho de perto');
 const useHeroVideo=b.heroMedia==='video'&&video?.kind==='file';
 const coverVisual=useHeroVideo?
  '<video class="hero-video" src="'+html(video.src)+'" autoplay muted playsinline loop preload="metadata"'+(cover?' poster="'+html(cover)+'"':'')+' aria-label="Vídeo de apresentação"></video>':
  cover?'<img class="hero-photo" src="'+html(cover)+'" alt="Foto de apresentação de '+title+'" fetchpriority="high" decoding="async"/>':
  '<div class="hero-placeholder" aria-hidden="true"><span class="shaped-arc"></span><span class="shaped-dot"></span></div>';
 const navigation=[
  services.length?['#servicos','Serviços']:null,
  (description||benefits.length)?['#sobre','Sobre']:null,
  images.length?['#portfolio','Projetos']:null,
  video?['#video','Vídeo']:null,
  faq.length?['#perguntas','Dúvidas']:null
 ].filter((x):x is string[]=>!!x);
 const nav=navigation.map(([href,t])=>'<a href="'+href+'">'+t+'</a>').join('');
 const logoMarkup=logo?'<img src="'+html(logo)+'" alt="'+title+'" class="brand-image"/>':'<span class="brand-wordmark">'+title+'</span>';
 const secondButton=images.length?'<a class="button button-secondary" href="#portfolio">Ver nosso trabalho <span aria-hidden="true">↗</span></a>':
  services.length?'<a class="button button-secondary" href="#servicos">Conhecer serviços <span aria-hidden="true">↓</span></a>':'';
 const logoRow='<a href="#inicio" class="brand-link" aria-label="'+title+' — início">'+logoMarkup+'</a>';
 const servicesMarkup=services.length?'<section id="servicos" class="section services-section"><div class="container"><div class="section-heading split-heading"><div><div class="eyebrow">01 / O QUE FAZEMOS</div><h2>Soluções para o que você <em>realmente precisa.</em></h2></div><p>Conheça os serviços oferecidos pela nossa equipe e encontre a solução ideal para você.</p></div><div class="services-list">'+services.map((service,i)=>
  '<article class="service-line"><div class="service-number">'+String(i+1).padStart(2,'0')+'</div><div class="service-title">'+html(service)+'</div><span class="service-arrow" aria-hidden="true">↗</span></article>'
 ).join('')+'</div><div class="section-footer">'+contactButton+'</div></div></section>':'';
 const benefitMarkup=benefits.length?'<div class="benefit-list">'+benefits.map((benefit,i)=>
  '<div class="benefit"><span class="benefit-mark" aria-hidden="true">✦</span><span>'+html(benefit)+'</span></div>').join('')+'</div>':'';
 const aboutMarkup=(description||benefits.length)?'<section id="sobre" class="section about-section"><div class="container about-grid"><div class="about-copy"><div class="eyebrow">02 / QUEM SOMOS</div><h2>Por trás de cada projeto, <em>um compromisso.</em></h2>'+(description?'<p class="body-copy">'+description.replace(/\n/g,'<br>')+'</p>':'')+benefitMarkup+'</div><div class="about-media">'+(sideImage?'<img src="'+html(sideImage)+'" alt="Trabalho e experiência de '+title+'" loading="lazy" decoding="async" />':
  '<div class="about-art" aria-hidden="true"><span>QUALIDADE<br>&amp; ATENÇÃO</span></div>')+'<span class="image-label">'+title+'</span></div></div></section>':'';
 const galleryMarkup=images.length?'<section id="portfolio" class="section portfolio-section"><div class="container"><div class="section-heading split-heading"><div><div class="eyebrow">03 / PORTFÓLIO</div><h2>'+html(b.galleryTitle||'Nosso trabalho fala por si.')+'</h2></div><p>Alguns registros do que fazemos. Explore as imagens para ver os detalhes.</p></div><div class="portfolio-grid">'+images.map((u,i)=>
  '<a class="portfolio-item" href="'+html(u)+'" target="_blank" rel="noopener noreferrer" aria-label="Abrir foto '+(i+1)+' em tamanho maior"><img src="'+html(u)+'" loading="lazy" decoding="async" alt="Trabalho de '+title+' — imagem '+(i+1)+'"><span class="portfolio-index">'+String(i+1).padStart(2,'0')+' <b aria-hidden="true">↗</b></span></a>'
 ).join('')+'</div></div></section>':'';
 const videoMarkup=video?'<section id="video" class="section video-section"><div class="container"><div class="section-heading center-heading"><div class="eyebrow">APRESENTAÇÃO EM VÍDEO</div><h2>'+videoTitle+'</h2><p>Assista e conheça melhor nossa empresa, serviços e projetos.</p></div><div class="video-shell">'+(
  video.kind==='file'?'<video src="'+html(video.src)+'" controls playsinline preload="none"'+(cover?' poster="'+html(cover)+'"':'')+' aria-label="'+videoTitle+'">Seu navegador não suporta vídeo.</video>':
  '<iframe title="'+videoTitle+'" src="'+html(video.src)+'" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
 )+'</div></div></section>':'';
 const processMarkup=steps.length?'<section class="section process-section"><div class="container"><div class="eyebrow">NOSSO PROCESSO</div><div class="section-heading"><h2>Como trabalhamos.</h2></div><div class="process-grid">'+steps.map((step,i)=>
  '<article class="process-step"><div class="step-index">'+String(i+1).padStart(2,'0')+' <span aria-hidden="true">↗</span></div><h3>'+html(step)+'</h3></article>'
 ).join('')+'</div></div></section>':'';
 const reviewMarkup=reviews.length?'<section class="section reviews-section"><div class="container"><div class="eyebrow">A EXPERIÊNCIA DE QUEM CONTRATOU</div><div class="section-heading"><h2>O que dizem sobre nosso trabalho.</h2></div><div class="reviews-grid">'+reviews.map(([author,content])=>
  '<blockquote class="review"><p>“'+html(content)+'”</p><footer>'+html(author)+'</footer></blockquote>'
 ).join('')+'</div></div></section>':'';
 const faqMarkup=faq.length?'<section id="perguntas" class="section faq-section"><div class="container faq-grid"><div><div class="eyebrow">INFORMAÇÕES IMPORTANTES</div><h2>Perguntas <em>frequentes.</em></h2><p class="body-copy">Respostas para as principais dúvidas sobre nossos serviços.</p></div><div class="faq-list">'+faq.map(([question,answer],i)=>
  '<details class="faq"><summary><span>'+html(question)+'</span><b aria-hidden="true">+</b></summary><div class="faq-answer">'+html(answer)+'</div></details>'
 ).join('')+'</div></div></section>':'';
 const telLabel=tel?'<a href="tel:+'+tel+'">'+html(b.phone||b.whatsapp)+'</a>':'';
 const address=html(b.address||b.city);
 const map=b.address?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(b.address):'';
 const infoParts=[
  tel?'<div class="info-line"><small>Telefone</small>'+telLabel+'</div>':'',
  email?'<div class="info-line"><small>E-mail</small><a href="mailto:'+html(email)+'">'+html(email)+'</a></div>':'',
  address?'<div class="info-line"><small>Localização</small>'+(map?'<a href="'+html(map)+'" target="_blank" rel="noopener noreferrer">'+address+' ↗</a>':'<span>'+address+'</span>')+'</div>':'',
  b.hours?'<div class="info-line"><small>Horários</small><span>'+html(b.hours).replace(/\n/g,'<br>')+'</span></div>':''
 ].filter(Boolean).join('');
 const contactMarkup='<section id="contato" class="section contact-section"><div class="container"><div class="contact-panel"><div class="contact-main"><div class="eyebrow">FALE COM A GENTE</div><h2>Vamos tirar seu projeto <em>do papel?</em></h2><p>Conte o que você precisa. Nossa equipe está pronta para conversar sobre as melhores soluções.</p><div class="contact-buttons">'+contactButton+
  (tel&&!waUrl?'<a class="button button-line" href="tel:+'+tel+'">Ligar agora ↗</a>':'')+'</div></div><div class="contact-information">'+(infoParts||'<div class="contact-decor" aria-hidden="true">↗</div>')+'</div></div></div></section>';
 const socialLinks=[insta?'<a href="'+html(insta)+'" target="_blank" rel="noopener noreferrer">Instagram ↗</a>':'',waUrl?'<a href="'+html(waUrl)+'" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>':''].filter(Boolean).join('');
 const floatWhatsapp=wh&&b.showFloatingWhatsapp!==false?'<a class="wa-float" href="'+html(waUrl)+'" target="_blank" rel="noopener noreferrer" aria-label="Conversar com '+title+' pelo WhatsApp" title="Falar no WhatsApp">'+waIcon+'<span>Fale com a gente</span></a>':'';
 const mobileCta=b.showMobileCta!==false&&wh?'<div class="mobile-sticky-cta"><a href="'+html(waUrl)+'" target="_blank" rel="noopener noreferrer">'+waIcon+' <span>Solicitar orçamento pelo WhatsApp</span> ↗</a></div>':'';
 const structured={
  '@context':'https://schema.org','@type':'LocalBusiness',name:b.clientName,
  ...(b.description?{description:b.description.slice(0,400)}:{}),
  ...(tel?{telephone:'+'+tel}:{}),
  ...(email?{email}:{}),
  ...(b.address?{address:{'@type':'PostalAddress',streetAddress:b.address}}:{}),
  ...(images.length?{image:images[0]}:{})
 };
 const schema=JSON.stringify(structured).replace(/</g,'\\u003c');
 const css=[
 "*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-width:320px;font-family:'DM Sans',Arial,sans-serif;background:var(--page);color:var(--ink);font-weight:400;line-height:1.55}body.no-photo{background-image:radial-gradient(ellipse at 0 0,rgba(255,255,255,.015),transparent 60%)}",
 ":root{--accent:"+accent+";--on-accent:"+accentText+";--page:#f5f3ee;--ink:#202524;--muted:#66716b;--panel:#ffffff;--line:#e0e2dc;--soft:#eceae3;--dark:#151a1a;--dark-ink:#f8f7f3;--heading:'Manrope',Arial,sans-serif}",
 "body.theme-minimal{--page:#fff;--ink:#172020;--muted:#667174;--panel:#fff;--line:#e4e7e6;--soft:#f3f5f2;--dark:#172020}",
 "body.theme-bold{--page:#101419;--ink:#f6f5f4;--muted:#afafb5;--panel:#1b222a;--line:#33404a;--soft:#171e26;--dark:#0a1014}",
 "::selection{background:var(--accent);color:var(--on-accent)}a{color:inherit;text-decoration:none}img,video{display:block;max-width:100%}img{object-fit:cover}h1,h2,h3,p{margin-top:0}button,a,summary{-webkit-tap-highlight-color:transparent}a:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:5px}em{font-style:normal;color:var(--accent)}.container{width:min(1260px,calc(100% - 64px));margin:auto}",
 ".eyebrow{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2.4px;color:var(--accent);display:flex;gap:12px;align-items:center}.eyebrow:before{content:'';display:block;width:22px;height:1px;background:currentColor}",
 ".site-topline{background:var(--dark);color:#d6dddb}.topline-inner{min-height:36px;display:flex;align-items:center;justify-content:space-between;gap:20px;font-size:11px;letter-spacing:.3px}.topline-inner span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.topline-inner a{font-weight:700;color:#fff}",
 ".site-header{position:sticky;top:0;z-index:80;background:var(--page);border-bottom:1px solid var(--line);backdrop-filter:blur(14px)}.nav-inner{min-height:86px;display:flex;align-items:center;gap:30px}.brand-link{display:inline-flex;align-items:center;max-width:270px;min-width:0;margin-right:auto}.brand-image{width:auto;max-height:60px;max-width:min(235px,45vw);object-fit:contain}.brand-wordmark{font:850 22px/1.2 var(--heading);letter-spacing:-1px;overflow-wrap:anywhere}.desktop-nav{display:flex;align-items:center;gap:25px;font-size:12px;font-weight:800}.desktop-nav a:hover{color:var(--accent)}.nav-contact{display:inline-flex;align-items:center;justify-content:center;min-height:43px;border:1px solid var(--line);padding:0 17px;border-radius:5px;font-size:12px;font-weight:800;white-space:nowrap}.nav-contact:hover{border-color:var(--accent)}",
 ".mobile-nav{display:none;position:relative}.mobile-nav summary{list-style:none;border:1px solid var(--line);border-radius:5px;min-width:44px;min-height:44px;display:grid;place-items:center;font-size:23px;cursor:pointer}.mobile-nav summary::-webkit-details-marker{display:none}.mobile-nav-content{display:flex;flex-direction:column;gap:0;position:absolute;right:0;top:52px;width:245px;max-width:85vw;background:var(--panel);border:1px solid var(--line);box-shadow:0 22px 50px #0003;padding:12px;border-radius:6px}.mobile-nav-content a{display:block;padding:11px 9px;font-size:13px;font-weight:700;border-bottom:1px solid var(--line)}",
 ".button{display:inline-flex;align-items:center;justify-content:center;gap:24px;min-height:56px;padding:14px 24px;border-radius:5px;font-weight:800;font-size:13px;line-height:1.4;white-space:normal;text-align:center;transition:transform .2s,filter .2s,background .2s}.button span{font-size:18px;line-height:1}.button:hover{transform:translateY(-2px)}.button-primary{background:var(--accent);color:var(--on-accent)}.button-secondary{background:transparent;border:1px solid #ffffff77;color:#fff}.button-line{border:1px solid #ffffff55;color:#fff}",
 ".hero{background:var(--dark);color:var(--dark-ink)}.hero-stage{position:relative;min-height:640px;display:flex;align-items:center;overflow:hidden}.hero-background{position:absolute;inset:0;overflow:hidden}.hero-background::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#0d1417f2 0%,#10191dbd 43%,#11171838 100%),linear-gradient(0deg,#05080a88,transparent 55%)}.hero-photo,.hero-video{width:100%;height:100%;object-fit:cover}.hero-placeholder{height:100%;width:100%;background:radial-gradient(ellipse at 87% 35%,#55493c 0%,#232b2b 45%,#101c22 80%);position:relative}.shaped-arc{position:absolute;width:620px;height:620px;border:150px solid #ffffff16;right:-200px;top:-200px;border-radius:50%}.shaped-dot{position:absolute;background:var(--accent);height:240px;width:240px;right:11%;top:23%;border-radius:50%;filter:blur(95px);opacity:.5}.hero-content{position:relative;z-index:1;padding-top:94px;padding-bottom:108px;width:min(900px,100%)}.hero-tag{display:flex;gap:9px;align-items:center;color:#ffffffcc;font-size:11px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;margin-bottom:28px}.hero-tag:before{content:'';width:8px;height:8px;border-radius:50%;background:var(--accent)}.hero h1{font:850 clamp(43px,6.1vw,89px)/1.065 var(--heading);letter-spacing:-.057em;margin:0 0 30px;max-width:850px;overflow-wrap:anywhere}.hero p{font-size:clamp(16px,1.6vw,20px);line-height:1.75;max-width:600px;color:#e2e7e3;letter-spacing:.04px;margin-bottom:33px}.hero-actions{display:flex;align-items:center;gap:13px;flex-wrap:wrap}.hero-bottom{display:flex;align-items:center;justify-content:space-between;gap:15px;position:absolute;bottom:25px;left:0;right:0;color:#ffffffb8;font-size:11px;text-transform:uppercase;letter-spacing:1.1px;font-weight:700}",
 ".theme-minimal .hero{background:#f8faf8;color:#142022}.theme-minimal .hero-stage{min-height:600px}.theme-minimal .hero-background{left:52%;background:#e5e5dd}.theme-minimal .hero-background::after{background:linear-gradient(90deg,#f8faf8 0,transparent 14%)}.theme-minimal .hero-content{width:min(53%,640px)}.theme-minimal .hero h1{font-size:clamp(38px,4.8vw,74px)}.theme-minimal .hero p{color:#465350}.theme-minimal .hero-tag,.theme-minimal .hero-bottom{color:#56605c}.theme-minimal .button-secondary{color:#20332b;border-color:#91a099}.theme-minimal .hero-placeholder{background:radial-gradient(ellipse at 70% 30%,#d8c2aa 0%,#dce0dc 40%,#ebeeeb 100%)}",
 ".theme-bold .hero{background:#0c1019}.theme-bold .hero-background::after{background:linear-gradient(90deg,#0e1319f2,#11162690 60%,#15242b45)}.theme-bold .hero h1{font-size:clamp(47px,7vw,103px);font-weight:900}.theme-bold .services-list{border-color:var(--line)}",
 ".section{padding:108px 0}.section-heading{margin:0 0 45px}.section-heading h2,.about-copy h2,.faq-grid h2{font:850 clamp(34px,4.3vw,60px)/1.15 var(--heading);letter-spacing:-.052em;max-width:780px;margin:16px 0 0}.section-heading p,.body-copy{font-size:16px;line-height:1.9;color:var(--muted)}.split-heading{display:flex;align-items:end;justify-content:space-between;gap:40px}.split-heading>div{flex:1;min-width:0}.split-heading>p{max-width:290px;margin:0 0 4px}.section-footer{margin-top:34px}",
 ".services-section{background:var(--page)}.services-list{border-top:1px solid var(--line)}.service-line{display:grid;grid-template-columns:80px 1fr 55px;align-items:center;min-height:104px;border-bottom:1px solid var(--line);gap:15px;transition:padding-left .2s,background .2s}.service-line:hover{padding-left:12px;background:var(--soft)}.service-number{font-weight:800;color:var(--accent);font-size:12px}.service-title{font:750 clamp(20px,2.6vw,31px)/1.35 var(--heading);letter-spacing:-.035em}.service-arrow{font-size:30px;color:var(--accent);text-align:right}.services-section .button-primary{margin-top:2px}",
 ".about-section{background:var(--soft)}.about-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.9fr);gap:clamp(40px,7vw,125px);align-items:center}.about-copy h2{margin-bottom:30px}.about-copy .body-copy{max-width:635px;white-space:normal;margin-bottom:27px}.benefit-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:31px}.benefit{display:flex;align-items:flex-start;gap:9px;border-top:1px solid var(--line);padding:12px 0;color:var(--ink);font-size:13px;font-weight:700}.benefit-mark{color:var(--accent);font-size:17px;line-height:1.4}.about-media{min-height:480px;height:100%;max-height:690px;position:relative;overflow:hidden;background:var(--dark);border-radius:3px}.about-media img{height:100%;width:100%;object-fit:cover;position:absolute;inset:0}.about-art{height:100%;width:100%;background:radial-gradient(circle at 50% 60%,#51574c,#273638 56%,#182426);display:grid;place-items:center}.about-art span{font:900 clamp(26px,3vw,48px)/1.1 var(--heading);letter-spacing:-.04em;color:#fff;transform:rotate(-9deg)}.image-label{position:absolute;bottom:20px;left:22px;color:#fff;background:#15181dd0;padding:9px 13px;border-radius:3px;font-size:11px;font-weight:700}",
 ".portfolio-section{background:var(--page)}.portfolio-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-flow:dense;gap:13px}.portfolio-item{grid-column:span 4;aspect-ratio:1.13;position:relative;display:block;overflow:hidden;background:var(--soft);border-radius:3px}.portfolio-item:nth-child(6n + 1){grid-column:span 7;aspect-ratio:1.3}.portfolio-item:nth-child(6n + 2){grid-column:span 5;aspect-ratio:.91}.portfolio-item:nth-child(6n + 4){grid-column:span 5;aspect-ratio:1.18}.portfolio-item img{width:100%;height:100%;object-fit:cover;transition:transform .5s}.portfolio-item:hover img{transform:scale(1.055)}.portfolio-index{position:absolute;left:17px;bottom:17px;right:17px;display:flex;align-items:center;justify-content:space-between;color:#fff;background:#0b131970;backdrop-filter:blur(9px);border:1px solid #fff4;padding:10px 13px;font-size:12px;font-weight:700}.portfolio-index b{font-size:21px}",
 ".video-section{background:var(--dark);color:#fff}.video-section .eyebrow{justify-content:center}.center-heading{text-align:center}.center-heading h2{margin:16px auto}.center-heading p{color:#b5c1c1;margin:15px auto 0;max-width:580px}.video-shell{border:1px solid #ffffff22;background:#000;width:min(1080px,100%);aspect-ratio:16/9;margin:0 auto;box-shadow:0 34px 70px #0005;overflow:hidden;border-radius:7px}.video-shell iframe,.video-shell video{width:100%;height:100%;border:0;object-fit:contain}",
 ".process-section{background:var(--soft)}.process-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.process-step{background:var(--panel);border:1px solid var(--line);padding:27px;min-height:168px;display:flex;flex-direction:column;justify-content:space-between}.step-index{display:flex;align-items:center;justify-content:space-between;color:var(--accent);font-size:12px;font-weight:850}.step-index span{font-size:25px}.process-step h3{font:750 21px/1.4 var(--heading);letter-spacing:-.02em;margin:27px 0 0}",
 ".reviews-section{background:var(--page)}.reviews-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.review{background:var(--panel);border:1px solid var(--line);margin:0;padding:29px;display:flex;flex-direction:column;min-height:220px}.review:before{content:'“';font:800 55px/1 var(--heading);color:var(--accent)}.review p{font-size:15px;line-height:1.8;flex:1}.review footer{font-size:13px;font-weight:800;border-top:1px solid var(--line);padding-top:17px}",
 ".faq-section{background:var(--soft)}.faq-grid{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(35px,7vw,100px)}.faq-grid .body-copy{margin-top:21px}.faq-list{border-top:1px solid var(--line)}.faq{border-bottom:1px solid var(--line)}.faq summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:19px;align-items:center;min-height:83px;padding:15px 0;font-weight:750;font-size:16px}.faq summary::-webkit-details-marker{display:none}.faq summary b{display:grid;place-items:center;font-weight:400;font-size:26px;color:var(--accent)}.faq[open] summary b{transform:rotate(45deg)}.faq-answer{color:var(--muted);line-height:1.85;font-size:15px;padding:0 30px 24px 0}",
 ".contact-section{background:var(--page)}.contact-panel{background:var(--dark);color:#fff;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:60px;padding:clamp(33px,6vw,88px);border-radius:4px;position:relative;overflow:hidden}.contact-panel:before{content:'';position:absolute;width:360px;height:360px;right:-140px;top:-190px;background:var(--accent);filter:blur(110px);opacity:.22}.contact-main,.contact-information{position:relative}.contact-main h2{font:850 clamp(38px,5vw,73px)/1.09 var(--heading);letter-spacing:-.05em;margin:23px 0}.contact-main p{max-width:480px;color:#c4cecb;line-height:1.8}.contact-buttons{margin-top:28px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.contact-information{border-left:1px solid #ffffff33;padding-left:32px;display:flex;flex-direction:column;justify-content:center;gap:17px}.info-line{border-bottom:1px solid #ffffff25;padding-bottom:16px}.info-line small{color:#9baaa6;display:block;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:800;margin-bottom:7px}.info-line a,.info-line span{color:#fff;font-size:15px;overflow-wrap:anywhere}.contact-decor{font-size:200px;color:#ffffff16;text-align:center}",
 ".site-footer{background:var(--dark);color:#fff;border-top:1px solid #ffffff18;padding:35px 0}.footer-main{display:flex;justify-content:space-between;gap:20px;align-items:center;flex-wrap:wrap}.footer-main .brand-wordmark{font-size:20px}.footer-main img{max-height:43px}.footer-main nav{display:flex;gap:20px;flex-wrap:wrap;font-size:12px;color:#b9c2c0}.footer-sub{padding-top:23px;margin-top:23px;border-top:1px solid #ffffff26;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;font-size:11px;color:#aeb8b4}",
 ".wa-float{position:fixed;right:25px;bottom:28px;z-index:100;display:flex;align-items:center;gap:9px;border-radius:50px;background:#25D366;color:#08361b;padding:15px 19px;min-width:58px;min-height:58px;box-shadow:0 16px 35px #0b321c50;font-size:13px;font-weight:900;transition:transform .2s}.wa-float:hover{transform:translateY(-4px)}.wa-float svg{flex-shrink:0;width:28px;height:28px}.mobile-sticky-cta{display:none}",
 "@media(max-width:980px){.container{width:min(100% - 40px,1260px)}.desktop-nav{gap:14px}.hero-stage{min-height:600px}.hero h1{font-size:clamp(42px,7vw,76px)}.about-grid{gap:35px}.section{padding:80px 0}.contact-panel{gap:30px}}",
 "@media(max-width:750px){.container{width:calc(100% - 34px)}.topline-inner{min-height:32px}.topline-inner span:nth-child(2){display:none}.nav-inner{min-height:70px}.brand-image{max-height:46px}.brand-wordmark{font-size:20px}.desktop-nav{display:none}.mobile-nav{display:block}.nav-contact{min-height:42px;padding:0 11px;font-size:11px}.hero-stage{min-height:580px}.hero-content{padding:85px 0 100px}.hero h1{font-size:clamp(41px,10.3vw,71px)}.hero p{font-size:16px}.hero-bottom{font-size:9px}.theme-minimal .hero-stage{display:flex;align-items:end;padding-top:230px;min-height:660px}.theme-minimal .hero-background{left:0;bottom:auto;height:300px}.theme-minimal .hero-background::after{background:linear-gradient(0deg,#f8faf8 0,transparent 34%)}.theme-minimal .hero-content{width:100%;padding:48px 0 98px}.theme-minimal .hero-bottom{color:#56605c}.section{padding:68px 0}.section-heading{margin-bottom:32px}.section-heading h2,.about-copy h2,.faq-grid h2{font-size:clamp(31px,8.2vw,47px)}.split-heading{align-items:flex-start;flex-direction:column;gap:15px}.split-heading>p{max-width:600px}.service-line{grid-template-columns:37px 1fr 34px;min-height:91px;gap:7px}.service-title{font-size:clamp(17px,4.7vw,25px)}.about-grid{grid-template-columns:1fr}.about-media{height:360px;min-height:350px}.portfolio-item:nth-child(n){grid-column:span 6;aspect-ratio:1.07}.portfolio-item:first-child{grid-column:span 12;aspect-ratio:1.55}.process-grid,.reviews-grid{grid-template-columns:repeat(2,1fr)}.faq-grid{grid-template-columns:1fr;gap:22px}.contact-panel{grid-template-columns:1fr;gap:35px}.contact-information{border-left:0;border-top:1px solid #ffffff33;padding:27px 0 0}.wa-float{bottom:88px;right:16px;padding:14px;min-height:54px;min-width:54px}.wa-float span{display:none}.mobile-sticky-cta{display:block;position:fixed;bottom:0;left:0;right:0;background:var(--dark);z-index:99;padding:10px 16px calc(10px + env(safe-area-inset-bottom));border-top:1px solid #ffffff26}.mobile-sticky-cta a{background:#25D366;color:#093a1d;display:flex;gap:11px;justify-content:center;align-items:center;min-height:48px;border-radius:5px;font-weight:850;font-size:12px}.mobile-sticky-cta svg{width:20px;height:20px}.site-footer{padding-bottom:95px}}",
 "@media(max-width:460px){.nav-contact{display:none}.hero h1{font-size:clamp(39px,11vw,57px)}.hero-actions{flex-direction:column;align-items:stretch}.hero-actions .button{width:100%}.hero-stage{min-height:640px}.hero-bottom{flex-direction:column;align-items:flex-start;gap:3px}.theme-minimal .hero-stage{min-height:700px}.benefit-list{grid-template-columns:1fr}.portfolio-item:nth-child(n){grid-column:span 6;aspect-ratio:1}.portfolio-item:first-child{grid-column:span 12;aspect-ratio:1.4}.process-grid,.reviews-grid{grid-template-columns:1fr}.contact-panel{padding:34px 22px}.contact-main h2{font-size:40px}.contact-buttons .button{width:100%}.footer-main{align-items:flex-start}.footer-main nav{flex-direction:column;gap:10px}}",
 "@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}"
 ].join('\n');
 const navBottom='<a href="#inicio">Início</a>'+nav;
 const htmlDoc=[
 '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<title>'+title+(b.segment?' | '+html(b.segment):'')+'</title><meta name="description" content="'+html(b.subheadline||b.description||b.segment).slice(0,160)+'">',
 '<meta name="theme-color" content="'+accent+'"><meta property="og:type" content="website"><meta property="og:title" content="'+title+'"><meta property="og:description" content="'+subheadline+'">',
 (cover?'<meta property="og:image" content="'+html(cover)+'">':''),
 '<script type="application/ld+json">'+schema+'</script><style>'+css+'</style></head>',
 '<body class="theme-'+html(b.style)+' '+(cover?'has-photo':'no-photo')+'">',
 '<div class="site-topline"><div class="container topline-inner"><span>'+ (b.city?'Atendemos '+location:subject)+'</span><span>'+(b.hours?html(b.hours).replace(/\n/g,' · '):wh?'Entre em contato e solicite informações':'Conheça nossos serviços')+'</span></div></div>',
 '<header class="site-header"><div class="container nav-inner">'+logoRow+'<nav class="desktop-nav" aria-label="Navegação principal">'+navBottom+'</nav><a href="'+html(contactLink)+'"'+contactAttr+' class="nav-contact">'+contactText+' ↗</a><details class="mobile-nav"><summary aria-label="Abrir menu">☰</summary><nav class="mobile-nav-content" aria-label="Menu mobile">'+navBottom+'<a href="#contato">Contato</a></nav></details></div></header>',
 '<main><section class="hero" id="inicio"><div class="hero-stage"><div class="hero-background">'+coverVisual+'</div><div class="container"><div class="hero-content"><div class="hero-tag">'+subject+(b.city?' / '+location:'')+'</div><h1>'+headline+'</h1><p>'+subheadline+'</p><div class="hero-actions">'+contactButton+secondButton+'</div></div><div class="hero-bottom"><span>'+title+'</span><span>Conheça mais ↓</span></div></div></div></section>',
 servicesMarkup,aboutMarkup,galleryMarkup,videoMarkup,processMarkup,reviewMarkup,faqMarkup,contactMarkup,'</main>',
 '<footer class="site-footer"><div class="container"><div class="footer-main">'+logoRow+'<nav aria-label="Redes sociais">'+socialLinks+'</nav></div><div class="footer-sub"><span>© '+new Date().getFullYear()+' '+title+'. Todos os direitos reservados.</span><span>'+html(b.city||b.segment||'')+'</span></div></div></footer>',
 floatWhatsapp,mobileCta,'</body></html>'
 ].join('');
 return htmlDoc;
}
