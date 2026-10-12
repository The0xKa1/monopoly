export async function onRequest({request,env}) {
 const url=new URL(request.url),origin=request.headers.get('Origin');
 const json=(body,status)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(origin&&origin!==url.origin)return json({error:'不允许跨站请求'},403);
 if(url.pathname==='/api/health')return json({ok:true},200);
 let code,op;
 if(url.pathname==='/api/rooms'&&request.method==='POST'){
  code=crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase();op='create';
 }else{
  const match=url.pathname.match(/^\/api\/rooms\/([A-F0-9]{12})\/(join|ws)$/);if(!match)return json({error:'接口不存在'},404);
  [,code,op]=match;
 }
 if(op==='ws'&&request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'需要 WebSocket 连接'},426);
 if(op!=='ws'&&request.method!=='POST')return json({error:'请求方法无效'},405);
 const address=request.headers.get('CF-Connecting-IP')||'local';
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(address));
 const source=Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
 const allowance=await env.TRAFFIC.get(env.TRAFFIC.idFromName(source)).fetch(`https://limit.internal/${op}`);
 if(allowance.status===429)return json({error:'请求过于频繁，请稍后重试'},429);
 let body;
 if(op!=='ws'){
  if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'需要 JSON 请求'},415);
  // Bound the stream as well as Content-Length (which can be absent).
  const reader=request.body?.getReader();let size=0;const chunks=[];
  if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return json({error:'请求过大'},413);}chunks.push(value);}}
  try{const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}const data=JSON.parse(new TextDecoder().decode(bytes));body=JSON.stringify({...data,code});}catch{return json({error:'请求无效'},400);}
 }
 const stub=env.ROOMS.get(env.ROOMS.idFromName(code));
 return stub.fetch(new Request(`https://room.internal/${op}`,{method:request.method,headers:request.headers,...(body?{body}:{})}));
}
