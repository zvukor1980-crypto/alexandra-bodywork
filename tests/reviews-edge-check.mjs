import assert from 'node:assert/strict';
// Network-free contract test: the real handler runs against a mocked database transport.
let handler,mode='success',calls=0;
globalThis.Deno={env:{get:name=>name==='SUPABASE_URL'?'https://database.invalid':name==='SUPABASE_SERVICE_ROLE_KEY'?'mock-server-only-key':undefined},serve:fn=>{handler=fn;}};
globalThis.fetch=async(url,options)=>{
 calls++;
 assert.equal(options.headers.apikey,'mock-server-only-key');
 if(url.endsWith('/alexandra_submit_review')){
  const args=JSON.parse(options.body);
  assert.equal(args.p_fingerprint.length,64);
  assert.equal(args.p_rating,5);
  assert.equal(args.p_name,'Contract test');
  if(mode==='limit')return Response.json({message:'REVIEW_RATE_LIMIT'},{status:400});
  return Response.json({id:'not-persisted',name:args.p_name,rating:5,body:args.p_body,created_at:'2026-10-20T00:00:00Z',fingerprint:'must-not-leak'});
 }
 return Response.json({reviews:[],total:0,average:null});
};
await import('../backend/reviews-edge.ts');
const headers={apikey:'sb_publishable_iZakAF0HwDNE774ZX939fg_P5mtH8GC','Content-Type':'application/json',Origin:'https://bodywork.world','x-forwarded-for':'192.0.2.123'};
const payload={name:'Contract test',rating:5,body:'This is a network-free test of the review handler.',consent:true,website:'',submissionId:crypto.randomUUID()};
const post=()=>new Request('https://function.invalid',{method:'POST',headers,body:JSON.stringify(payload)});
let r=await handler(post());assert.equal(r.status,201);const data=await r.json();assert.equal(data.review.name,payload.name);assert.equal(data.review.fingerprint,undefined);
mode='limit';r=await handler(post());assert.equal(r.status,429);
payload.consent=false;const before=calls;r=await handler(post());assert.equal(r.status,400);assert.equal(calls,before);
r=await handler(new Request('https://function.invalid',{headers:{...headers,apikey:'invalid'}}));assert.equal(r.status,401);
r=await handler(new Request('https://function.invalid',{method:'OPTIONS',headers:{Origin:'https://bodywork.world'}}));assert.equal(r.status,204);
console.log('Passed: valid submission, public field filtering, rate limit, validation, authentication and CORS. No network calls or persisted records.');
