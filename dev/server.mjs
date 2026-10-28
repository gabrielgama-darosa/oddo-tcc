import http from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = new URL("../", import.meta.url).pathname;
const PORT = Number(process.env.PORT || 4174);
const partners = [
  { id: "a", nome: "Ferragem Central", bairro: "Centro", tel: "5551999990001", email: "central@oddo.local", senha: "demo12345", entrega: true, retirada: true },
  { id: "b", nome: "Casa do Construtor", bairro: "Vila Nova", tel: "5551999990002", email: "casa@oddo.local", senha: "demo12345", entrega: false, retirada: true },
  { id: "c", nome: "Mundo da Obra", bairro: "Jardim Primavera", tel: "5551999990003", email: "mundo@oddo.local", senha: "demo12345", entrega: true, retirada: false }
];
let nextProduct = 8, nextListing = 20;
const products = [
  { id:"1", nome:"Cimento CP II 50 kg", cat:"Básicos" },
  { id:"2", nome:"Argamassa AC-II 20 kg", cat:"Básicos" },
  { id:"3", nome:"Trena 5 m", cat:"Ferramentas" },
  { id:"4", nome:"Furadeira de impacto 500 W", cat:"Ferramentas" },
  { id:"5", nome:'Torneira de jardim 1/2"', cat:"Hidráulica" },
  { id:"6", nome:"Disjuntor bipolar 40 A", cat:"Elétrica" },
  { id:"7", nome:"Tinta acrílica 18 L", cat:"Revestimentos" }
];
const listings = [];
const seed = {1:{a:36.9,b:34.5,c:38},2:{a:24.9,b:22.9,c:23.9},3:{a:19.9,b:17.5},4:{a:219,b:199,c:209},5:{a:17.9,b:14.9,c:15.5},6:{a:29.9,c:28.9},7:{a:299,b:279,c:289}};
for (const [pid, offers] of Object.entries(seed)) for (const [partnerId, price] of Object.entries(offers)) listings.push({id:String(nextListing++),partnerId,productId:pid,preco:price,imagem:null});
const sessions = new Map();

function send(res, status, body, headers={}) { res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}); res.end(JSON.stringify(body)); }
async function body(req) { const chunks=[]; for await (const c of req) chunks.push(c); const raw=Buffer.concat(chunks); if ((req.headers["content-type"]||"").startsWith("application/json")) { try{return JSON.parse(raw.toString("utf8")||"{}")}catch{return{}} } return raw; }
function cookies(req){return Object.fromEntries(String(req.headers.cookie||"").split(";").map(s=>s.trim()).filter(Boolean).map(x=>{const i=x.indexOf("=");return[x.slice(0,i),decodeURIComponent(x.slice(i+1))]}));}
function me(req){const id=sessions.get(cookies(req).oddo_session);return partners.find(p=>p.id===id)||null;}
function publicPartner(p){const {senha,...rest}=p;return rest;}
function catalog(){return {lojas:partners.map(publicPartner),produtos:products.map(p=>{const ls=listings.filter(l=>l.productId===p.id); const ofertas={}; ls.forEach(l=>ofertas[l.partnerId]=l.preco); return {...p,imagem:ls.find(l=>l.imagem)?.imagem||null,ofertas};}).filter(p=>Object.keys(p.ofertas).length)}};
function sessionPayload(p){return {parceiro:publicPartner(p),produtos:listings.filter(l=>l.partnerId===p.id).map(l=>{const pr=products.find(x=>x.id===l.productId);return{id:l.id,nome:pr.nome,cat:pr.cat,preco:l.preco,imagem:l.imagem}}),catalogo:products.map(p=>({...p}))};}
function norm(s){return String(s).trim().toLowerCase();}
function mime(path){return ({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[extname(path).toLowerCase()]||'application/octet-stream');}

async function api(req,res,url){
  if(url.pathname==='/api/catalog'&&req.method==='GET') return send(res,200,catalog());
  if(url.pathname==='/api/auth/me'&&req.method==='GET'){const p=me(req);return p?send(res,200,sessionPayload(p)):send(res,401,{error:'Sua sessão expirou. Entre novamente.'});}
  if(url.pathname==='/api/auth/register'&&req.method==='POST'){const b=await body(req); if(partners.some(p=>norm(p.email)===norm(b.email)))return send(res,409,{error:'Já existe um parceiro cadastrado com este e-mail.'}); const p={id:randomUUID(),nome:String(b.nome||'').trim(),bairro:String(b.bairro||'').trim(),tel:String(b.tel||''),email:norm(b.email),senha:String(b.senha||''),entrega:false,retirada:true};partners.push(p);const t=randomUUID();sessions.set(t,p.id);return send(res,201,{parceiro:publicPartner(p)},{'Set-Cookie':`oddo_session=${t}; Path=/; HttpOnly; SameSite=Lax`});}
  if(url.pathname==='/api/auth/login'&&req.method==='POST'){const b=await body(req);const p=partners.find(p=>norm(p.email)===norm(b.email)&&p.senha===String(b.senha||''));if(!p)return send(res,401,{error:'E-mail ou senha incorretos.'});const t=randomUUID();sessions.set(t,p.id);return send(res,200,{ok:true},{'Set-Cookie':`oddo_session=${t}; Path=/; HttpOnly; SameSite=Lax`});}
  if(url.pathname==='/api/auth/logout'&&req.method==='POST'){const t=cookies(req).oddo_session;sessions.delete(t);return send(res,200,{ok:true},{'Set-Cookie':'oddo_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'});}
  if(url.pathname==='/api/partner/profile'&&req.method==='PATCH'){const p=me(req);if(!p)return send(res,401,{error:'Sua sessão expirou. Entre novamente.'});const b=await body(req);p.entrega=!!b.entrega;p.retirada=!!b.retirada;p.tel=String(b.tel||p.tel);return send(res,200,{parceiro:publicPartner(p)});}
  if(url.pathname==='/api/products'&&req.method==='POST'){const p=me(req);if(!p)return send(res,401,{error:'Sua sessão expirou. Entre novamente.'});const b=await body(req);let pr=products.find(x=>norm(x.nome)===norm(b.nome)&&norm(x.cat)===norm(b.cat));if(!pr){pr={id:String(nextProduct++),nome:String(b.nome).trim(),cat:String(b.cat).trim()};products.push(pr);}let l=listings.find(x=>x.partnerId===p.id&&x.productId===pr.id);if(l){l.preco=Number(b.preco);if(b.imagem)l.imagem=b.imagem;}else{l={id:String(nextListing++),partnerId:p.id,productId:pr.id,preco:Number(b.preco),imagem:b.imagem||null};listings.push(l);}return send(res,201,{produto:{id:l.id,nome:pr.nome,cat:pr.cat,preco:l.preco,imagem:l.imagem}});}
  const productMatch=url.pathname.match(/^\/api\/products\/(\d+)$/);
  if(productMatch&&['PATCH','DELETE'].includes(req.method)){const p=me(req);if(!p)return send(res,401,{error:'Sua sessão expirou. Entre novamente.'});const idx=listings.findIndex(x=>x.id===productMatch[1]&&x.partnerId===p.id);if(idx<0)return send(res,404,{error:'Produto não encontrado.'});if(req.method==='DELETE'){listings.splice(idx,1);return send(res,200,{ok:true});}const b=await body(req);const l=listings[idx];let pr=products.find(x=>norm(x.nome)===norm(b.nome)&&norm(x.cat)===norm(b.cat));if(!pr){pr={id:String(nextProduct++),nome:String(b.nome).trim(),cat:String(b.cat).trim()};products.push(pr);}l.productId=pr.id;l.preco=Number(b.preco);l.imagem=b.imagem||l.imagem;return send(res,200,{produto:{id:l.id,nome:pr.nome,cat:pr.cat,preco:l.preco,imagem:l.imagem}});}
  if(url.pathname==='/api/upload'&&req.method==='POST'){const p=me(req);if(!p)return send(res,401,{error:'Sua sessão expirou. Entre novamente.'});const data=await body(req);const type=(req.headers['content-type']||'image/jpeg').split(';')[0];const ext=type==='image/png'?'png':type==='image/webp'?'webp':'jpg';await mkdir(join(ROOT,'dev','uploads'),{recursive:true});const name=`${randomUUID()}.${ext}`;await writeFile(join(ROOT,'dev','uploads',name),data);return send(res,201,{url:`/dev/uploads/${name}`});}
  return send(res,404,{error:'API não encontrada.'});
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host}`);
    if(url.pathname.startsWith('/api/'))return api(req,res,url);
    let rel=decodeURIComponent(url.pathname);
    if(rel==='/'||rel==='')rel='/index.html';
    if(rel==='/parceiro'||rel==='/parceiro/')rel='/parceiro/index.html';
    const full=normalize(join(ROOT,rel));
    if(!full.startsWith(normalize(ROOT))) {res.writeHead(403);return res.end('Forbidden');}
    const data=await readFile(full);res.writeHead(200,{'Content-Type':mime(full),'Cache-Control':'no-store'});res.end(data);
  }catch(e){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Não encontrado');}
});
server.listen(PORT,'127.0.0.1',()=>console.log(`ODDO mock em http://127.0.0.1:${PORT}`));
