import React,{useState,useEffect,useRef} from 'react';
import {AppearanceEditor} from './AppearanceEditor.jsx';
import {PixelPlayer} from './PixelPlayer.jsx';
import {randomAppearance} from './appearance.js';
import {decisionPlayer} from './game.js';
import './network.css';
const sessionKey=code=>`monopoly-room:${code}`;
function readIdentity(code){try{return JSON.parse(localStorage.getItem(sessionKey(code)));}catch{return null;}}
function useRoom(identity){
 const [snapshot,setSnapshot]=useState(null),[status,setStatus]=useState('connecting'),[error,setError]=useState(''),[pending,setPending]=useState(false),[clock,setClock]=useState(Date.now());
 const socket=useRef(null),latest=useRef(null),request=useRef(null),reset=useRef(0),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const t=setInterval(()=>setClock(Date.now()),250);return()=>clearInterval(t);},[]);
 useEffect(()=>{
  if(!identity)return;
  let stopped=false,timer,heartbeat,watchdog,tries=0;
  latest.current=null;setSnapshot(null);request.current=null;setPending(false);
  function connect(){
   if(stopped)return;setStatus('connecting');
   const url=new URL(`/api/rooms/${identity.code}/ws`,location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
   const ws=new WebSocket(url);socket.current=ws;let last=Date.now();
   watchdog=setTimeout(()=>ws.close(),12000);
   ws.onopen=()=>{ws.send(JSON.stringify({type:'auth',token:identity.token}));};
   ws.onmessage=e=>{
    last=Date.now();if(e.data==='pong')return;
    let data;try{data=JSON.parse(e.data);}catch{return;}
    if(data.type==='error'){setError(data.error);request.current=null;setPending(false);if(data.fatal)setStatus('invalid');return;}
    if(data.type!=='snapshot')return;
    clearTimeout(watchdog);tries=0;setStatus('connected');
    if(data.reset){reset.current++;if(request.current)ws.send(JSON.stringify(request.current));}
    if(data.receipt===request.current?.id){request.current=null;setPending(false);}
    latest.current=data;
    setSnapshot({...data,resetKey:reset.current});
   };
   ws.onclose=e=>{
    clearTimeout(watchdog);clearInterval(heartbeat);if(stopped)return;
    if([4001,4002,4004].includes(e.code)){setStatus('invalid');setError(e.reason||'连接已关闭');return;}
    setStatus('reconnecting');timer=setTimeout(connect,Math.min(1000*2**tries++,15000));
   };
   ws.onerror=()=>ws.close();
   heartbeat=setInterval(()=>{if(Date.now()-last>55000)ws.close();else if(ws.readyState===WebSocket.OPEN)ws.send('ping');},20000);
  }
  connect();
  const wake=()=>{if(socket.current?.readyState===WebSocket.OPEN)socket.current.send('ping');};
  window.addEventListener('online',wake);
  return()=>{stopped=true;clearTimeout(timer);clearTimeout(watchdog);clearInterval(heartbeat);socket.current?.close();window.removeEventListener('online',wake);};
 },[identity?.code,identity?.token,attempt]);
 function send(command){
  if(socket.current?.readyState!==WebSocket.OPEN||status!=='connected'||request.current||!latest.current)return;
  setError('');const message={...command,id:crypto.randomUUID(),version:latest.current.room.version};request.current=message;setPending(true);socket.current.send(JSON.stringify(message));
 }
 return {...snapshot,status,error,pending,send,clock,blocked:status!=='connected'||pending||clock<(snapshot?.room.readyAt||0),retry:()=>setAttempt(x=>x+1)};
}
export function NetworkApp({Game}){
 const query=new URLSearchParams(location.search),initialCode=(query.get('room')||'').toUpperCase();
 const [view,setView]=useState(query.has('local')?'local':'home'),[code,setCode]=useState(initialCode),[name,setName]=useState(''),[identity,setIdentity]=useState(()=>readIdentity(initialCode)),[working,setWorking]=useState(false),[error,setError]=useState(''),[editing,setEditing]=useState(false),[copied,setCopied]=useState(false);
 const net=useRoom(identity),room=net.room,host=room?.host===net.seat;
 const [settings,setSettings]=useState(null);
 useEffect(()=>{if(room)setSettings(room.settings);},[room?.settings.aiCount,room?.settings.kind,room?.settings.size,room?.settings.rounds]);
 useEffect(()=>{if(room?.status==='playing')setView('game');},[room?.status]);
 function leave(){setIdentity(null);setView('home');setError('');history.replaceState(null,'',location.pathname);}
 async function enter(create){
  setWorking(true);setError('');
  try{
   const target=code.trim().toUpperCase();
   if(!create&&!/^[A-F0-9]{12}$/.test(target))throw new Error('请输入 12 位房间号');
   const stored=!create&&readIdentity(target);
   if(stored){setIdentity(stored);history.replaceState(null,'',`?room=${target}`);return;}
   if(!name.trim())throw new Error('请输入昵称');
   const response=await fetch(create?'/api/rooms':`/api/rooms/${target}/join`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim(),appearance:randomAppearance()})});
   let data;try{data=await response.json();}catch{throw new Error('联机服务未就绪，请通过部署地址或联机开发服务访问');}
   if(!response.ok)throw new Error(data.error||'房间请求失败');
   // Save before opening the socket, so refresh never silently claims another seat.
   localStorage.setItem(sessionKey(data.code),JSON.stringify(data));setIdentity(data);setCode(data.code);history.replaceState(null,'',`?room=${data.code}`);
  }catch(e){setError(e.message);}finally{setWorking(false);}
 }
 async function copy(){try{await navigator.clipboard.writeText(`${location.origin}/?room=${room.code}`);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setError('请复制地址栏中的邀请链接');}}
 if(view==='local')return <Game key="local" onHome={()=>{setView('home');history.replaceState(null,'',location.pathname);}}/>;
 const banner=identity&&<div className="network-bar" role="status"><span>房间 <b>{identity.code}</b> · {net.status==='connected'?'已连接':net.status==='invalid'?'连接已关闭':'正在重连…'}{room&&` · ${room.seats[net.seat]?.name||''}`}</span>{room?.status==='playing'&&<span>{room.seats[decisionPlayer(room.game)]?.name} 决策 · {Math.max(0,Math.ceil((room.deadline-net.clock)/1000))} 秒</span>}<button onClick={copy} disabled={!room}>{copied?'已复制':'邀请链接'}</button><button onClick={()=>setView(v=>v==='game'?'lobby':'game')} disabled={!room?.game}>{view==='game'?'房间信息':'返回对局'}</button></div>;
 if(identity&&room?.game&&view==='game')return <><div className="network-active">{banner}{(net.error||net.status!=='connected')&&<div className="network-error" role="alert">{net.error||'连接恢复后可继续操作'} <button onClick={net.retry}>重新连接</button><button onClick={()=>setView('lobby')}>房间信息</button></div>}</div><Game key={identity.code} online={net} onHome={()=>setView('lobby')}/></>;
 return <main className="network-page"><section className="network-panel"><h1>monopoly</h1>{banner}{(error||net.error)&&<p className="network-error" role="alert">{error||net.error}</p>}
 {!identity?<><h2>联机大厅</h2><label>昵称<input value={name} maxLength={12} onChange={e=>setName(e.target.value)} autoComplete="nickname" placeholder="最多 12 个字"/></label><button className="primary wide" disabled={working} onClick={()=>enter(true)}>创建房间</button><div className="network-join"><label>房间号<input value={code} maxLength={12} onChange={e=>setCode(e.target.value.toUpperCase())} autoCapitalize="characters" spellCheck={false} placeholder="12 位房间号"/></label><button className="primary" disabled={working} onClick={()=>enter(false)}>加入房间</button></div><p>2～20 个角色，支持真人与 AI 混合。邀请链接可以直接分享。</p><button className="text-button wide" onClick={()=>setView('local')}>单机游玩</button></>:!room?<><div className="network-reconnect"><p role="status"><span className="network-connection-dot"/>正在连接房间…</p><div className="network-reconnect-actions"><button className="primary" onClick={net.retry}>重新连接</button><button className="text-button" onClick={leave}>返回大厅</button></div></div></>:<>
 <h2>{room.status==='lobby'?'准备大厅':room.status==='finished'?'对局结束':'房间信息'}</h2><ul className="network-seats">{room.seats.map((seat,i)=><li key={i}><PixelPlayer player={seat} id={i}/><b>{seat.name}{i===net.seat?'（你）':''}</b><span>{i===room.host?'房主 · ':''}{seat.kind==='ai'?'AI':seat.online?'在线':'离线'}{room.status==='lobby'?(seat.ready?' · 已准备':' · 未准备'):''}</span>{host&&i!==net.seat&&room.status==='lobby'&&<button disabled={net.pending} onClick={()=>net.send({type:'kick',seat:i})}>移除</button>}</li>)}</ul>
 {room.status==='lobby'&&settings&&<><fieldset disabled={!host||net.pending||net.status!=='connected'} className="network-settings"><legend>房间设置</legend><label>AI 人数<input type="number" min="0" max={20-room.seats.length} value={settings.aiCount} onChange={e=>setSettings({...settings,aiCount:Number(e.target.value)})}/></label><label>地图<select value={settings.kind} onChange={e=>setSettings({...settings,kind:e.target.value,size:e.target.value==='classic'?20:settings.size})}><option value="classic">经典地图</option><option value="china">中国城市</option><option value="world">世界城市</option><option value="mixed">混合城市</option></select></label><label>格数<select disabled={settings.kind==='classic'} value={settings.size} onChange={e=>setSettings({...settings,size:Number(e.target.value)})}>{[20,28,36].map(n=><option key={n}>{n}</option>)}</select></label><label>轮数（0 为无限）<input type="number" min="0" max="999" value={settings.rounds??0} onChange={e=>setSettings({...settings,rounds:Number(e.target.value)||null})}/></label>{host&&<button className="text-button" onClick={()=>net.send({type:'settings',settings})}>保存设置</button>}</fieldset><div className="network-buttons"><button onClick={()=>setEditing(true)} disabled={net.pending}>修改昵称与外观</button><button className="primary" disabled={net.pending||net.status!=='connected'} onClick={()=>net.send({type:'ready',ready:!room.seats[net.seat].ready})}>{room.seats[net.seat].ready?'取消准备':'准备'}</button>{host&&<button className="primary" disabled={net.pending||net.status!=='connected'||!room.seats.every(s=>s.ready)||room.seats.length+room.settings.aiCount<2} onClick={()=>net.send({type:'start'})}>开始对局</button>}</div></>}
 {room.game&&<button className="primary wide" onClick={()=>setView('game')}>返回对局</button>}{room.status==='finished'&&host&&<button className="text-button wide" onClick={()=>net.send({type:'lobby'})}>回到准备大厅</button>}
 <p>每次决策限时 120 秒，超时由 AI 代为操作；重连后恢复控制。所有人离线时暂停推进。房间保留至最后一次操作后 7 天。</p><p>身份保存在当前浏览器。清除浏览器数据将失去原座位；在其他设备打开邀请链接会加入新角色。</p><button className="text-button" onClick={leave}>断开连接</button><button className="text-button" onClick={net.retry}>重新连接</button>
 {editing&&<div className="modal-backdrop"><section className="modal appearance-modal" role="dialog" aria-modal="true" aria-label="修改昵称与外观"><AppearanceEditor player={room.seats[net.seat]} id={net.seat} onCancel={()=>setEditing(false)} onSave={(appearance,name)=>{net.send({type:'profile',appearance,name});setEditing(false);}}/></section></div>}
 </>}
 </section></main>;
}
