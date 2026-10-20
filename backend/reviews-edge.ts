// All database operations use runtime-only credentials. No privileged key is shipped to the browser.
const PUBLIC_KEY = 'sb_publishable_iZakAF0HwDNE774ZX939fg_P5mtH8GC';
const allowedOrigins = new Set(['https://bodywork.world', 'https://www.bodywork.world']);
const publicFields = ['id', 'name', 'rating', 'body', 'created_at'];
Deno.serve(async (req: Request) => {
 const origin = req.headers.get('origin') || '';
 const headers: Record<string,string> = {'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if (allowedOrigins.has(origin)) headers['Access-Control-Allow-Origin']=origin;
 headers['Access-Control-Allow-Headers']='apikey, content-type';
 headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if (origin && !allowedOrigins.has(origin)) return reply({error:'ORIGIN_NOT_ALLOWED'},403);
 if (req.method==='OPTIONS') return new Response(null,{status:204,headers});
 if (req.headers.get('apikey')!==PUBLIC_KEY) return reply({error:'UNAUTHORIZED'},401);
 if (!['GET','POST'].includes(req.method)) return reply({error:'METHOD_NOT_ALLOWED'},405);
 const url=Deno.env.get('SUPABASE_URL'), secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if (!url||!secret) return reply({error:'SERVICE_UNAVAILABLE'},503);
 const rpc=async(name:string,body:unknown)=>{
  const response=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json',apikey:secret,Authorization:'Bearer '+secret},body:JSON.stringify(body)});
  const data=await response.json();
  return {ok:response.ok,data};
 };
 try {
  if (req.method==='GET') {
   const before=new URL(req.url).searchParams.get('before');
   if (before && !Number.isFinite(Date.parse(before))) return reply({error:'INVALID_CURSOR'},400);
   const result=await rpc('alexandra_reviews_page',{p_before:before});
   return result.ok?reply(result.data):reply({error:'SERVICE_UNAVAILABLE'},503);
  }
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return reply({error:'JSON_REQUIRED'},415);
  if (Number(req.headers.get('content-length')||0)>12000) return reply({error:'PAYLOAD_TOO_LARGE'},413);
  const raw=await req.text();
  if (raw.length>12000) return reply({error:'PAYLOAD_TOO_LARGE'},413);
  let data; try{data=JSON.parse(raw);}catch{return reply({error:'INVALID_JSON'},400);}
  if (!data||typeof data!=='object'||Array.isArray(data)) return reply({error:'INVALID_INPUT'},400);
  if (data.website) return reply({error:'INVALID_INPUT'},400);
  const name=typeof data.name==='string'?data.name.trim():'';
  const body=typeof data.body==='string'?data.body.trim():'';
  if (name.length<2||name.length>60||body.length<20||body.length>1500||!Number.isInteger(data.rating)||data.rating<1||data.rating>5||data.consent!==true||typeof data.submissionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.submissionId)) return reply({error:'INVALID_INPUT'},400);
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0].trim()||req.headers.get('cf-connecting-ip')||'unknown';
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret+':alexandra-reviews:'+ip));
  const fingerprint=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  const result=await rpc('alexandra_submit_review',{p_name:name,p_rating:data.rating,p_body:body,p_fingerprint:fingerprint,p_submission_id:data.submissionId});
  if (!result.ok) return reply({error:result.data?.message==='REVIEW_RATE_LIMIT'?'RATE_LIMIT':'SERVICE_UNAVAILABLE'},result.data?.message==='REVIEW_RATE_LIMIT'?429:503);
  const review=Object.fromEntries(publicFields.map(f=>[f,result.data[f]]));
  return reply({review},201);
 } catch {return reply({error:'SERVICE_UNAVAILABLE'},503);}
});
