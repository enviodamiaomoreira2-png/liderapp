
export type SiteBrief={
 clientName:string; segment:string; city:string; headline:string; subheadline:string; description:string;
 services:string; benefits:string; whatsapp:string; email:string; address:string; instagram:string;
 primaryColor:string; style:'premium'|'minimal'|'bold'; logoUrl:string; imageUrls:string[];
};
export const initialSiteBrief:SiteBrief={
 clientName:'',segment:'',city:'',headline:'',subheadline:'',description:'',services:'',benefits:'',
 whatsapp:'',email:'',address:'',instagram:'',primaryColor:'#9364ef',style:'premium',logoUrl:'',imageUrls:[]
};
const escape=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const words=(x:string)=>String(x||'').split('\n').map(s=>s.trim()).filter(Boolean).slice(0,12);
const safeImg=(url:string)=>/^https:\/\/[a-zA-Z0-9.-]+\/storage\/v1\/object\/public\/delivery-media\//.test(url)?url:'';
const color=(value:string)=>/^#[0-9a-f]{6}$/i.test(value)?value:'#9364ef';
const phone=(value:string)=>value.replace(/\D/g,'').slice(0,15);
const safeInsta=(v:string)=>{const x=v.replace(/^@/,'').trim();return /^[a-zA-Z0-9._]{1,30}$/.test(x)?'https://instagram.com/'+x:/^https:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._/]+\/?$/.test(x)?x:''};
export const slug=(value:string)=>String(value||'site').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'site';
export function renderClientSite(brief:SiteBrief){
 const b={...initialSiteBrief,...brief};
 const title=escape(b.clientName||'Seu negócio');
 const headline=escape(b.headline||b.clientName||'Uma nova experiência começa aqui');
 const sub=escape(b.subheadline||b.segment||'Soluções para você');
 const desc=escape(b.description||'');
 const location=escape(b.city||'');
 const accent=color(b.primaryColor);
 const images=b.imageUrls.filter(safeImg).slice(0,9);
 const heroImage=images[0]||'';
 const logo=safeImg(b.logoUrl);
 const services=words(b.services),benefits=words(b.benefits);
 const ph=phone(b.whatsapp);
 const whatsapp=ph?'https://wa.me/'+ph+'?text='+encodeURIComponent('Olá! Gostaria de saber mais sobre '+b.clientName):'';
 const email=/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)?b.email.trim():'';
 const insta=safeInsta(b.instagram);
 const font="'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
 const isLight=b.style==='minimal';
 const logoMarkup=logo?'<img class="logo-img" src="'+escape(logo)+'" alt="Logo de '+title+'" />':'<span class="text-logo">'+title+'</span>';
 const ctaText=ph?'Falar no WhatsApp':email?'Entrar em contato':'Conhecer serviços';
 const ctaHref=whatsapp|| (email?'mailto:'+encodeURIComponent(email):'#servicos');
 const cta='<a class="btn btn-primary" href="'+escape(ctaHref)+'" '+(whatsapp?'target="_blank" rel="noopener noreferrer"':'')+'>'+ctaText+' <span aria-hidden="true">↗</span></a>';
 const serviceCards=services.map((t,i)=>'<article class="service-card"><div class="s-index">'+String(i+1).padStart(2,'0')+'</div><h3>'+escape(t)+'</h3><div class="service-end">Conheça nossa solução <span>↗</span></div></article>').join('');
 const badges=benefits.map(x=>'<li><span class="tick">✓</span>'+escape(x)+'</li>').join('');
 const photos=images.map((url,i)=>'<figure class="gallery-photo'+(i===0?' featured':'')+'"><img src="'+escape(url)+'" alt="Foto '+(i+1)+' de '+title+'" loading="lazy"/></figure>').join('');
 const socials=[whatsapp?'<a href="'+escape(whatsapp)+'" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>':'',email?'<a href="mailto:'+escape(email)+'">E-mail ↗</a>':'',insta?'<a href="'+escape(insta)+'" target="_blank" rel="noopener noreferrer">Instagram ↗</a>':''].filter(Boolean).join('');
 const css=[
 "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');",
 "*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--txt);line-height:1.6}::selection{background:var(--brand);color:#fff}",
 ":root{--brand:"+accent+";--bg:"+(isLight?'#f7f6f3':'#0e1018')+";--txt:"+(isLight?'#19212c':'#f6f5f8')+";--muted:"+(isLight?'#5a6875':'#adb2c2')+";--card:"+(isLight?'#ffffff':'#171b26')+";--border:"+(isLight?'#e1e2e7':'#2b3140')+"}",
 "a{text-decoration:none;color:inherit}button,a{-webkit-tap-highlight-color:transparent}img{max-width:100%;display:block}h1,h2,h3,p{margin-top:0}.wrap{width:min(1150px,calc(100% - 44px));margin:auto}",
 ".site-nav{height:86px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid var(--border)}.logo{max-width:240px;display:flex;align-items:center}.logo-img{max-height:54px;max-width:215px;object-fit:contain}.text-logo{font:800 25px 'Manrope',sans-serif;letter-spacing:-.8px}.nav-links{display:flex;align-items:center;gap:29px;font-size:13px;font-weight:700;color:var(--muted)}.nav-links a:hover{color:var(--txt)}",
 ".btn{display:inline-flex;align-items:center;justify-content:center;gap:18px;min-height:53px;padding:0 23px;border-radius:8px;font-size:13px;font-weight:800;transition:transform .2s,filter .2s}.btn:hover{transform:translateY(-2px);filter:brightness(1.15)}.btn-primary{background:var(--brand);color:white}.btn-ghost{border:1px solid var(--border)}",
 ".hero{position:relative;overflow:hidden}.hero:after{content:'';position:absolute;pointer-events:none;width:450px;height:450px;right:-250px;top:-170px;background:var(--brand);filter:blur(140px);opacity:.2}.hero-grid{min-height:590px;display:grid;grid-template-columns:"+(heroImage?'1.1fr .9fr':'1fr')+";gap:50px;align-items:center;padding:70px 0 80px}.eyebrow{display:flex;gap:10px;align-items:center;color:var(--brand);font:800 12px 'Manrope',sans-serif;letter-spacing:2px;text-transform:uppercase;margin-bottom:23px}.eyebrow:before{content:'';width:22px;height:2px;background:currentColor}",
 ".hero h1{font-family:'Manrope',sans-serif;font-weight:800;font-size:clamp(43px,5vw,75px);letter-spacing:-3.4px;line-height:1.08;max-width:780px;margin:0 0 25px;overflow-wrap:break-word}.hero-sub{font-size:clamp(16px,1.7vw,20px);max-width:545px;color:var(--muted);line-height:1.75;margin-bottom:31px}.hero-btns{display:flex;gap:11px;flex-wrap:wrap}.hero-pic{position:relative;aspect-ratio:4/5;border-radius:13px;overflow:hidden;background:var(--card);border:1px solid var(--border)}.hero-pic img{height:100%;width:100%;object-fit:cover}.hero-pic:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 70%,#0d102b66)}",
 ".meta-strip{display:flex;gap:18px;align-items:center;flex-wrap:wrap;padding:20px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);font-size:12px;font-weight:800;letter-spacing:1px;color:var(--muted);text-transform:uppercase}.meta-strip span:before{content:'✦';color:var(--brand);margin-right:10px}",
 ".section{padding:110px 0}.section-header{margin-bottom:35px}.section-header h2{font:800 clamp(34px,3.4vw,53px)/1.12 'Manrope',sans-serif;letter-spacing:-1.9px;margin:13px 0 0;max-width:780px}.section-label{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--brand)}",
 ".services-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.service-card{padding:28px;background:var(--card);border:1px solid var(--border);border-radius:11px;min-height:225px;display:flex;flex-direction:column;transition:border .2s,transform .2s}.service-card:hover{transform:translateY(-3px);border-color:var(--brand)}.s-index{font-size:12px;color:var(--brand);font-weight:800;margin-bottom:30px}.service-card h3{font:800 20px/1.35 'Manrope',sans-serif;overflow-wrap:break-word}.service-end{margin-top:auto;display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--muted)}.service-end span{color:var(--brand)}",
 ".about-layout{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start}.about-description{font-size:19px;line-height:1.9;color:var(--muted);white-space:pre-line}.benefits{padding:0;list-style:none;display:flex;flex-direction:column;gap:15px}.benefits li{display:flex;gap:14px;align-items:flex-start;border-bottom:1px solid var(--border);padding-bottom:14px;font-size:15px;font-weight:700}.tick{color:var(--brand)}",
 ".gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.gallery-photo{margin:0;aspect-ratio:1.12;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--card)}.gallery-photo img{height:100%;width:100%;object-fit:cover;transition:transform .4s}.gallery-photo:hover img{transform:scale(1.045)}",
 ".cta-panel{padding:75px;border-radius:15px;background:linear-gradient(135deg,var(--brand),#1b1d35);color:#fff;position:relative;overflow:hidden}.cta-panel:after{content:'↗';position:absolute;right:45px;top:0;font-size:230px;opacity:.09;line-height:1}.cta-panel h2{font:800 clamp(32px,4vw,55px)/1.13 'Manrope',sans-serif;letter-spacing:-1.4px;max-width:670px;margin:10px 0 24px}.cta-panel p{max-width:640px;opacity:.85}.cta-panel .btn-primary{background:#fff;color:#161827}",
 ".site-footer{padding:50px 0;border-top:1px solid var(--border)}.footer-grid{display:flex;justify-content:space-between;gap:30px;flex-wrap:wrap;align-items:center}.footer-grid small{display:block;color:var(--muted);margin-top:8px}.footer-socials{display:flex;gap:22px;flex-wrap:wrap;font-size:13px;font-weight:700;color:var(--muted)}",
 "body.bold .hero{background:linear-gradient(135deg,#1b0f39,#0c1121)}body.bold .hero h1{font-size:clamp(48px,6vw,85px)}body.bold .service-card{border-radius:2px}body.minimal .hero{background:#f3f1ec}body.minimal .cta-panel{background:linear-gradient(120deg,var(--brand),#2b3459)}",
 "@media(max-width:900px){.hero-grid{grid-template-columns:1fr;min-height:0;gap:32px;padding:60px 0}.hero-pic{max-height:430px;aspect-ratio:16/10}.services-grid{grid-template-columns:repeat(2,1fr)}.about-layout{grid-template-columns:1fr;gap:20px}.nav-links a:not(.btn){display:none}.section{padding:75px 0}}",
 "@media(max-width:600px){.wrap{width:min(100% - 30px,1150px)}.site-nav{height:72px}.nav-links .btn{min-height:41px;padding:0 12px;font-size:11px}.hero-grid{padding:58px 0}.hero h1{letter-spacing:-1.6px;font-size:clamp(38px,12vw,62px)}.hero-sub{font-size:16px}.hero-pic{aspect-ratio:4/3}.services-grid{grid-template-columns:1fr}.section{padding:65px 0}.gallery{grid-template-columns:repeat(2,1fr);gap:8px}.cta-panel{padding:37px 25px}.footer-grid{align-items:flex-start}.meta-strip{font-size:10px;gap:9px}.section-header h2{letter-spacing:-1px}}"
 ].join('\n');
 const servicesSection=services.length?'<section id="servicos" class="section"><div class="wrap"><div class="section-header"><span class="section-label">O que fazemos</span><h2>Soluções pensadas para você.</h2></div><div class="services-grid">'+serviceCards+'</div></div></section>':'';
 const aboutSection=(desc||benefits.length)?'<section id="sobre" class="section"><div class="wrap"><div class="about-layout"><div><span class="section-label">Quem somos</span><div class="section-header"><h2>Conheça '+title+'.</h2></div><p class="about-description">'+desc+'</p></div><div><span class="section-label">Nossos diferenciais</span><ul class="benefits">'+badges+'</ul></div></div></div></section>':'';
 const gallerySection=photos?'<section id="galeria" class="section"><div class="wrap"><div class="section-header"><span class="section-label">Nosso trabalho</span><h2>Conheça de perto.</h2></div><div class="gallery">'+photos+'</div></div></section>':'';
 return [
 '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<title>'+title+(b.segment?' | '+escape(b.segment):'')+'</title><meta name="description" content="'+escape(b.subheadline||b.description||b.segment).slice(0,155)+'">',
 '<meta name="theme-color" content="'+accent+'"><meta property="og:type" content="website"><meta property="og:title" content="'+title+'"><meta property="og:description" content="'+sub+'">',
 '<style>'+css+'</style></head><body class="'+escape(b.style)+'">',
 '<header class="wrap site-nav"><a class="logo" href="#inicio">'+logoMarkup+'</a><nav aria-label="Navegação principal" class="nav-links"><a href="#sobre">Sobre</a><a href="#servicos">Serviços</a>'+ (whatsapp?'<a class="btn btn-primary" href="'+escape(whatsapp)+'" target="_blank" rel="noopener noreferrer">Entrar em contato ↗</a>':'')+'</nav></header>',
 '<main><section id="inicio" class="hero"><div class="wrap hero-grid"><div class="hero-content"><div class="eyebrow">'+escape(b.segment||b.city||'Bem-vindo')+'</div><h1>'+headline+'</h1><p class="hero-sub">'+sub+'</p><div class="hero-btns">'+cta+'<a class="btn btn-ghost" href="#servicos">Explorar serviços</a></div></div>',
 (heroImage?'<div class="hero-pic"><img src="'+escape(heroImage)+'" alt="Apresentação de '+title+'" loading="eager"/></div>':''),
 '</div></section><div class="wrap"><div class="meta-strip"><span>'+escape(b.segment||'Atendimento profissional')+'</span>'+(location?'<span>'+location+'</span>':'')+'</div></div>',
 servicesSection,aboutSection,gallerySection,
 '<section class="section"><div class="wrap"><div class="cta-panel"><span class="section-label" style="color:#fff">Vamos conversar?</span><h2>Seu próximo passo começa com uma conversa.</h2><p>Entre em contato para saber mais sobre '+title+' e nossas soluções.</p>'+cta+'</div></div></section></main>',
 '<footer class="site-footer"><div class="wrap footer-grid"><div><div class="text-logo">'+title+'</div><small>'+escape(b.address||b.city||'')+'</small></div><div class="footer-socials">'+socials+'</div></div></footer>',
 '</body></html>'
 ].join('');
}
