import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';

// Web research for agents (Schritt 5): read one public web page as text. The Studio server fetches it, so the page
// must never reach anything that is not the public internet: only HTTPS on port 443, every address the name resolves
// to must be public, the connection goes to exactly the checked address, redirects are checked again, size and time
// are limited. The text is untrusted data for the model, never instructions.

const fail=(status,message)=>Object.assign(new Error(message),{status});
export const WEB_LIMITS=Object.freeze({bytes:1_000_000,text:12000,timeoutMs:10000,redirects:3});

/** True only for addresses on the public internet (no loopback, private, link-local, CGNAT, multicast, reserved). */
export function publicAddress(address){
 if(net.isIPv4(address)){
  const [a,b]=address.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||a===100&&b>=64&&b<=127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168
   ||a===192&&b===0||a===198&&(b===18||b===19)||a===198&&b===51||a===203&&b===0);
 }
 if(net.isIPv6(address)){
  const x=address.toLowerCase();
  const mapped=x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);if(mapped)return publicAddress(mapped[1]);
  if(x==='::'||x==='::1')return false;
  const first=parseInt(x.split(':')[0]||'0',16);
  // Only global unicast (2000::/3); never documentation (2001:db8::/32) or the NAT64/6to4/Teredo ranges.
  if((first&0xe000)!==0x2000)return false;
  return !(x.startsWith('2001:db8:')||x.startsWith('2001:0db8:')||x.startsWith('2002:')||/^2001:0?:/.test(x)||x.startsWith('64:ff9b:'));
 }
 return false;
}

/** The URL an agent may read: https, default port, a host name (no IP literal), no credentials. */
export function checkWebUrl(value){
 let url;try{url=new URL(value);}catch{throw fail(400,'Keine gültige Adresse.');}
 if(url.protocol!=='https:')throw fail(400,'Nur https-Adressen.');
 if(url.username||url.password)throw fail(400,'Adressen mit Zugangsdaten sind nicht erlaubt.');
 if(url.port&&url.port!=='443')throw fail(400,'Nur der normale https-Port.');
 const host=url.hostname.toLowerCase();
 if(net.isIP(host.replace(/^\[|\]$/g,''))||!host.includes('.')||host.endsWith('.local')||host.endsWith('.internal')||host==='localhost')throw fail(400,'Nur öffentliche Webseiten mit Namen.');
 url.hash='';return url;
}

/** Resolve and check every address; the request then connects to the first checked one, nothing else. */
async function resolvePublic(host,lookup){
 const addresses=await new Promise((resolve,reject)=>lookup(host,{all:true},(e,list)=>e?reject(fail(502,'Seite nicht gefunden.')):resolve(list)));
 if(!addresses.length||!addresses.every(a=>publicAddress(a.address)))throw fail(403,'Diese Adresse zeigt nicht ins öffentliche Internet.');
 return addresses[0];
}

/** Readable text from HTML: no scripts, styles or tags, entities for the common cases. */
export function pageText(html){
 const title=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()??'';
 const body=html.replace(/<(script|style|noscript|svg|template|title)[\s\S]*?<\/\1>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ')
  .replace(/<(br|p|div|li|h[1-6]|tr|section|article)[^>]*>/gi,'\n').replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
  .replace(/[ \t\f\v]+/g,' ').replace(/\n\s*\n+/g,'\n\n').trim();
 return {title:title.replace(/\s+/g,' ').slice(0,200),text:body};
}

function fetchOnce(url,address,{timeoutMs,bytes}){
 return new Promise((resolve,reject)=>{
  const req=https.request({host:address.address,family:address.family,port:443,servername:url.hostname,path:url.pathname+url.search,method:'GET',
   headers:{Host:url.host,'User-Agent':'SCHMAQQ-Studio-Agent/1 (web research)','Accept':'text/html,text/plain,application/json;q=0.9','Accept-Encoding':'identity'},
   timeout:timeoutMs,agent:false},res=>{
   if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();return resolve({redirect:res.headers.location});}
   if(res.statusCode!==200){res.resume();return reject(fail(502,'Die Seite antwortet mit '+res.statusCode+'.'));}
   const type=String(res.headers['content-type']??'').toLowerCase();
   if(!/^(text\/html|text\/plain|application\/json|application\/xhtml\+xml)/.test(type)){res.resume();return reject(fail(415,'Nur Textseiten (keine Dateien oder Bilder).'));}
   let size=0;const parts=[];
   res.on('data',chunk=>{size+=chunk.length;if(size>bytes){req.destroy();resolve({body:Buffer.concat(parts).toString('utf8'),type,cut:true});return;}parts.push(chunk);});
   res.on('end',()=>resolve({body:Buffer.concat(parts).toString('utf8'),type,cut:false}));
  });
  req.on('timeout',()=>req.destroy(fail(504,'Die Seite antwortet zu langsam.')));
  req.on('error',e=>reject(e.status?e:fail(502,'Seite nicht erreichbar.')));
  req.end();
 });
}

/** Read one public page as text for an agent. */
export async function readWebPage(value,{lookup=dns.lookup,limits=WEB_LIMITS,request=fetchOnce}={}){
 let url=checkWebUrl(value);
 for(let hop=0;hop<=limits.redirects;hop++){
  const address=await resolvePublic(url.hostname,lookup);
  const r=await request(url,address,limits);
  if(r.redirect){url=checkWebUrl(new URL(r.redirect,url).toString());continue;}
  const {title,text}=r.type.includes('html')?pageText(r.body):{title:'',text:r.body.trim()};
  return {url:url.toString(),title,text:text.slice(0,limits.text),truncated:r.cut||text.length>limits.text,trust:'untrusted-web-content'};
 }
 throw fail(508,'Zu viele Weiterleitungen.');
}
