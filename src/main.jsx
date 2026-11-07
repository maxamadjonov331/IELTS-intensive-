
import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
const S={tok:''};
const api=async(path,body)=>{const r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+S.tok},body:body?JSON.stringify(body):undefined});const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j.error||'Request failed');e.status=r.status;throw e}return j};
const post=(action,data)=>api('teacher',{action,...data}).catch(e=>{alert(e.message)});
const sendFile=async(f,cb)=>{if(!f)return;if(f.size>4e6)return alert('Files must be under 4 MB.');try{const r=await fetch('/api/upload?name='+encodeURIComponent(f.name),{method:'POST',headers:{'Content-Type':'application/octet-stream',Authorization:'Bearer '+S.tok},body:f});const j=await r.json();if(!r.ok)throw new Error(j.error);cb(j)}catch(e){alert(e.message||'Upload failed')}};
const later=(()=>{const t={};return(k,fn,ms=700)=>{clearTimeout(t[k]);t[k]=setTimeout(fn,ms)}})();
const fileUrl=f=>'/api/file?id='+f.id+'&t='+encodeURIComponent(S.tok);
const gp=(db,c,n)=>({r:null,l:null,art:false,wr:'',hl:[],notes:'',...(db.progress[c]||{})[n]});
const done=p=>p.r!=null&&p.l!=null&&p.art&&p.wr.trim().length>0;
const pts=(db,c)=>db.days.filter(d=>done(gp(db,c,d.n))).length;
const open=(db,c,d)=>d.published&&(d.n===1||done(gp(db,c,d.n-1)));
const P={upload:'M12 15V3M7 8l5-5 5 5M5 21h14',plus:'M12 5v14M5 12h14',trash:'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',check:'M5 12l5 5 9-11',lock:'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',out:'M9 4H5v16h4M16 8l4 4-4 4M20 12H9',book:'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5',head:'M4 15v-3a8 8 0 0116 0v3M4 15h3v5H4zM17 15h3v5h-3z',pen:'M4 20l1-4L16 5l3 3L8 19z',doc:'M7 3h8l4 4v14H7zM14 3v5h5',users:'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20a6 6 0 0112 0M17 11a2.5 2.5 0 100-5M21 20a5 5 0 00-4-4.8',layers:'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',back:'M15 5l-7 7 7 7'};
const I=({n,s=18})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={P[n]}/></svg>;

function readFile(f,cb){if(!f)return;if(f.size>3e6)return alert('File is larger than 3 MB. Browser storage cannot hold it.');
 const pdf=/\.pdf$/i.test(f.name),r=new FileReader();r.onload=()=>cb({name:f.name,type:pdf?'pdf':'text',data:r.result});pdf?r.readAsDataURL(f):r.readAsText(f)}
function Frame({f}){
 if(!f)return <div className="glass p-10 text-center muted">Your teacher has not uploaded this material yet.</div>;
 return f.type==='pdf'?<iframe title="pdf" src={fileUrl(f)} className="w-full h-[70vh] rounded-xl bg-white"/>:<iframe title="task" src={fileUrl(f)} sandbox="allow-scripts allow-forms" className="w-full h-[70vh] rounded-xl bg-white"/>}
function Upload({label,accept,onFile,file,remote}){return <label className="ghost cursor-pointer"><I n="upload" s={16}/>{file?file.name:label}<input type="file" accept={accept} className="sr-only" onChange={e=>{const f=e.target.files[0];e.target.value='';remote?sendFile(f,onFile):readFile(f,onFile)}}/></label>}

function Chart({db,code}){
 const rows=db.days.map(d=>({n:d.n,...gp(db,code,d.n)})).filter(x=>x.r!=null||x.l!=null);
 if(!rows.length)return <p className="muted text-sm">Scores will appear here once they are entered.</p>;
 const avg=k=>{const v=rows.map(x=>x[k]).filter(x=>x!=null);return v.length?(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):'–'};
 const dl=(k,i)=>{const pv=rows.slice(0,i).reverse().find(x=>x[k]!=null),c=rows[i][k];if(c==null||!pv)return null;const d=c-pv[k],rel=pv[k]?d/pv[k]*100:0;return {t:`${d>=0?'+':''}${d} (${rel>=0?'+':''}${rel.toFixed(1)}%)`,up:d>=0}};
 const bar=(k,i,g)=>{const v=rows[i][k],d=dl(k,i);return <div className="flex flex-col items-center justify-end w-9 sm:w-11 h-full">
  <span className="text-xs mb-1 muted">{v??'–'}</span><div className="w-full rounded-t-md" style={{height:`${(v||0)/40*100}%`,background:g,minHeight:v!=null?3:0,transition:'height .6s'}}/>
  </div>};
 return <div className="overflow-x-auto"><div className="flex gap-6 min-w-max items-end pt-2">
  {rows.map((x,i)=><div key={x.n} className="flex flex-col items-center"><div className="flex gap-1.5 h-36 items-end">
   {bar('r',i,'linear-gradient(#f6cf8a,#b8741f)')}{bar('l',i,'linear-gradient(#a9c0cc,#4d6573)')}</div>
   <div className="text-sm mt-2">Day {x.n}</div>
   {['r','l'].map(k=>{const d=dl(k,i);return <div key={k} className="text-[11px] h-4" style={{color:d?(d.up?'#9bd3a8':'#e19a8a'):'#a99a85'}}>{d?`${k==='r'?'R':'L'} ${d.t}`:'\u00a0'}</div>})}</div>)}
  <div className="text-xs muted self-start space-y-1 pl-2"><div><span className="inline-block w-2.5 h-2.5 rounded-sm mr-2" style={{background:'#d99a3d'}}/>Reading (R)</div><div><span className="inline-block w-2.5 h-2.5 rounded-sm mr-2" style={{background:'#7c97a6'}}/>Listening (L)</div><div>Average: R {avg('r')}, L {avg('l')}</div><div>Change vs. previous day, out of 40</div></div></div></div>}

function Shell({title,sub,onOut,children}){return <div className="min-h-screen" style={{background:'radial-gradient(900px 500px at 8% -5%,rgba(242,170,80,.16),transparent 60%)'}}>
 <header className="max-w-6xl mx-auto px-5 pt-6 flex items-center justify-between gap-4"><div><h1 className="serif text-2xl sm:text-3xl">{title}</h1><p className="muted text-sm mt-1">{sub}</p></div>
  <button className="ghost" onClick={onOut}><I n="out" s={16}/>Sign out</button></header><main className="max-w-6xl mx-auto px-5 py-6">{children}</main></div>}

function Login({db,onIn}){
 const [on,setOn]=useState(false),[pull,setPull]=useState(0),[role,setRole]=useState('student'),[code,setCode]=useState(''),[name,setName]=useState(''),[err,setErr]=useState('');
 const tug=()=>{setPull(26);setTimeout(()=>{setPull(0);setOn(o=>!o)},140)};
 const [busy,setBusy]=useState(false);
 const go=async e=>{e.preventDefault();setErr('');setBusy(true);try{onIn(await api('login',{role,code:code.trim(),name:name.trim()}))}catch(x){setErr(x.message)}setBusy(false)};
 const t='opacity 1.4s ease';
 return <div className="relative min-h-screen overflow-hidden" style={{background:'linear-gradient(160deg,#0b0908,#15100c 60%,#1d140c)'}}>
  <div className="absolute inset-0 pointer-events-none" style={{opacity:on?1:0,transition:t,background:'radial-gradient(700px 600px at 18% 40%,rgba(255,176,80,.28),transparent 65%),linear-gradient(115deg,rgba(60,36,14,.55),transparent 60%)'}}/>
  <svg className="absolute left-0 bottom-0 h-[78vh] sm:h-[92vh] w-auto pointer-events-none" viewBox="0 0 260 640">
   <defs><linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6b4a2a"/><stop offset="1" stopColor="#2a1c10"/></linearGradient>
   <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffc46b" stopOpacity=".5"/><stop offset="1" stopColor="#ffc46b" stopOpacity="0"/></linearGradient>
   <linearGradient id="po" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3a2a1a"/><stop offset="1" stopColor="#15100b"/></linearGradient></defs>
   <polygon points="70,170 190,170 330,640 -70,640" fill="url(#cone)" style={{opacity:on?1:0,transition:t}}/>
   <rect x="125" y="170" width="10" height="440" fill="url(#po)"/><ellipse cx="130" cy="612" rx="62" ry="10" fill="#1a130d"/>
   <ellipse cx="130" cy="170" rx="60" ry="9" fill="#ffd9a0" style={{opacity:on?1:.12,transition:t}}/>
   <path d="M78 170 L96 92 H164 L182 170 Z" fill="url(#sh)"/><path d="M96 92 H164 L182 170 Z" fill="rgba(255,200,120,.16)" style={{opacity:on?1:0,transition:t}}/>
   <g style={{transform:`translateY(${pull}px)`,transition:'transform .55s cubic-bezier(.3,2.1,.5,1)',cursor:'pointer',pointerEvents:'all'}} onClick={tug} role="button" tabIndex="0" aria-label="Pull cord to turn on the lamp" onKeyDown={e=>e.key==='Enter'&&tug()}>
    <line x1="172" y1="168" x2="172" y2="250" stroke="#b99461" strokeWidth="1.6"/><rect x="161" y="250" width="22" height="38" rx="11" fill="#f2c375"/><rect x="150" y="150" width="46" height="150" fill="transparent"/></g></svg>
  <p className="absolute left-5 bottom-5 text-sm muted" style={{opacity:on?0:.95,transition:t,color:'#e8c48a'}}>Pull the cord to turn on the light</p>
  <div className="relative min-h-screen flex items-center justify-center sm:justify-end px-5 sm:pr-[10vw] py-10 pointer-events-none">
   <form onSubmit={go} className="glass w-full max-w-md p-7 sm:p-8" style={{opacity:on?1:.28,transform:on?'none':'translateY(8px)',transition:'opacity 1.2s ease .25s,transform 1.2s ease .25s',pointerEvents:on?'auto':'none'}}>
    <h2 className="serif text-3xl">IELTS Intensive</h2><p className="muted text-sm mt-1 mb-6">Sign in to continue your daily practice.</p>
    <div className="flex p-1 rounded-xl mb-5" style={{background:'rgba(10,7,5,.5)'}}>{['student','teacher'].map(r=><button type="button" key={r} onClick={()=>{setRole(r);setErr('')}} className="flex-1 py-2 rounded-lg text-sm capitalize transition" style={role===r?{background:'linear-gradient(135deg,#f2c375,#c9812f)',color:'#1c1209',fontWeight:600}:{color:'#a99a85'}}>{r}</button>)}</div>
    <div className="space-y-3">
     <input className="inp" placeholder={role==='teacher'?'Teacher code':'Student code'} type={role==='teacher'?'password':'text'} value={code} onChange={e=>setCode(e.target.value)} autoComplete="off" required/>
     {role==='student'&&<input className="inp" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required/>}</div>
    <div className="h-6 mt-3 text-sm" style={{color:'#e8a08e'}} role="alert">{err}</div>
    <button className="btn w-full mt-1" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form></div></div>}

function Article({db,setP,code,d,p}){
 const [x,y]=[d.article.text,p.hl],add=()=>{const s=window.getSelection().toString().trim();if(s.length>2&&!s.includes('\n')&&!y.includes(s))setP({hl:[...y,s]})};
 const re=y.length?new RegExp('('+y.map(h=>h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','g'):null;
 const render=t=>re?t.split(re).map((s,i)=>y.includes(s)?<mark key={i} title="Click to remove" onClick={()=>setP({hl:y.filter(h=>h!==s)})}>{s}</mark>:s):t;
 if(!x)return <div className="glass p-10 text-center muted">No article has been added for this day.</div>;
 return <div className="grid lg:grid-cols-5 gap-5"><div className="glass p-6 lg:col-span-3">
  <h3 className="serif text-2xl mb-1">{d.article.title||'Article'}</h3><p className="muted text-xs mb-4">Select any phrase to highlight it. Click a highlight to remove it.</p>
  <div className="serif text-[1.08rem] leading-8 space-y-4 max-w-[68ch]" onMouseUp={add} onTouchEnd={add}>{x.split(/\n+/).map((t,i)=><p key={i}>{render(t)}</p>)}</div>
  <button className="btn mt-6" onClick={()=>setP({art:!p.art})}><I n="check" s={16}/>{p.art?'Marked as read':'Mark article as read'}</button></div>
  <div className="glass p-6 lg:col-span-2 flex flex-col"><h3 className="serif text-xl mb-1">Useful chunks</h3><p className="muted text-xs mb-3">Key vocabulary and phrases. Saved automatically.</p>
   <textarea className="inp flex-1 min-h-[260px] leading-7" value={p.notes} onChange={e=>setP({notes:e.target.value})} placeholder="Type phrases worth reusing…"/></div></div>}

function Score({v,onChange}){return <div className="glass p-5 mt-4 flex items-center justify-between flex-wrap gap-3"><div><div className="font-medium">Your score</div><div className="muted text-sm">Enter the result from this task.</div></div>
 <div className="flex items-center gap-2 text-lg"><span className="muted">[</span><input aria-label="Score out of 40" type="number" min="0" max="40" className="inp !w-20 text-center" value={v??''} onChange={e=>{const s=e.target.value;onChange(s===''?null:Math.max(0,Math.min(40,+s)))}}/><span className="muted">/ 40 ]</span></div></div>}

function DayView({db,code,d,setP,p,back}){
 const [tab,setTab]=useState('reading'),T=[['reading','Reading','book'],['listening','Listening','head'],['article','Article','doc'],['writing','Writing','pen']];
 const ok={reading:p.r!=null,listening:p.l!=null,article:p.art,writing:p.wr.trim().length>0};
 return <div><button className="ghost mb-4" onClick={back}><I n="back" s={16}/>All days</button>
  <div className="flex gap-2 flex-wrap mb-5">{T.map(([k,l,i])=><button key={k} onClick={()=>setTab(k)} className="ghost" style={tab===k?{background:'linear-gradient(135deg,#f2c375,#c9812f)',color:'#1c1209',fontWeight:600}:null}><I n={i} s={16}/>{l}{ok[k]&&<I n="check" s={14}/>}</button>)}</div>
  {tab==='reading'&&<><Frame f={d.reading}/><Score v={p.r} onChange={v=>setP({r:v})}/></>}
  {tab==='listening'&&<><Frame f={d.listening}/><Score v={p.l} onChange={v=>setP({l:v})}/></>}
  {tab==='article'&&<Article db={db} code={code} d={d} p={p} setP={setP}/>}
  {tab==='writing'&&<div className="glass p-6 max-w-3xl"><h3 className="serif text-2xl mb-2">Writing task</h3><p className="serif text-lg leading-8 mb-4">{d.writing||'No prompt has been set for this day.'}</p>
   <textarea className="inp min-h-[320px] leading-7" value={p.wr} onChange={e=>setP({wr:e.target.value})} placeholder="Write your response here…"/><p className="muted text-sm mt-2">{p.wr.trim()?p.wr.trim().split(/\s+/).length:0} words. Saved automatically.</p></div>}
  <p className="muted text-sm mt-5">A day is complete when both scores are entered, the article is marked as read and the writing is filled in.</p></div>}

function Student({db,setDb,code,out}){
 const [cur,setCur]=useState(null),me=db.roster.find(s=>s.code===code),total=pts(db,code);
 const setP=n=>patch=>{const nx={...gp(db,code,n),...patch};setDb(o=>({...o,progress:{...o.progress,[code]:{...o.progress[code],[n]:nx}}}));later('p'+n,()=>api('progress',{n,p:nx}).catch(e=>e.status===401?out():null))};
 const days=db.days.filter(d=>d.published),d=days.find(x=>x.n===cur);
 return <Shell title={me?me.name:'Student'} sub={`${total} ${total===1?'point':'points'} earned. One point for each completed day.`} onOut={out}>
  {d&&open(db,code,d)?<DayView db={db} code={code} d={d} p={gp(db,code,d.n)} setP={setP(d.n)} back={()=>setCur(null)}/>:<>
  <section className="glass p-6 mb-6"><h2 className="serif text-xl mb-4">Score progress</h2><Chart db={db} code={code}/></section>
  <h2 className="serif text-xl mb-3">Study days</h2>
  {!days.length&&<div className="glass p-8 muted">No days have been published yet.</div>}
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{days.map(x=>{const a=open(db,code,x),c=done(gp(db,code,x.n));return <button key={x.n} disabled={!a} onClick={()=>setCur(x.n)} className="glass p-5 text-left transition hover:brightness-125 disabled:opacity-50 disabled:hover:brightness-100">
   <div className="flex justify-between items-center"><span className="serif text-2xl">Day {x.n}</span>{c?<span style={{color:'#9bd3a8'}}><I n="check"/></span>:!a&&<span className="muted"><I n="lock"/></span>}</div>
   <p className="muted text-sm mt-2">{c?'Completed':a?'Ready to start':'Complete the previous day to unlock'}</p></button>})}</div></>}</Shell>}

const Card=({t,icon,children})=><section className="glass p-5"><h3 className="font-medium flex items-center gap-2 mb-3"><I n={icon} s={17}/>{t}</h3>{children}</section>;
function FileTools({f,clear}){const [v,setV]=useState(false);if(!f)return <p className="muted text-sm mt-2">Nothing uploaded yet.</p>;
 return <div className="mt-3"><div className="flex gap-2"><button className="ghost" onClick={()=>setV(!v)}>{v?'Hide preview':'Preview'}</button><button className="ghost" onClick={clear}><I n="trash" s={15}/>Remove</button></div>{v&&<div className="mt-3"><Frame f={f}/></div>}</div>}
function Teacher({db,setDb,out}){
 const [tab,setTab]=useState('modules'),[sel,setSel]=useState(1),[sc,setSc]=useState(''),[sn,setSn]=useState(''),[who,setWho]=useState(null),[tc,setTc]=useState('');
 const d=db.days.find(x=>x.n===sel)||db.days[0],upd=(n,p)=>{const nx={...db.days.find(x=>x.n===n),...p};setDb(o=>({...o,days:o.days.map(x=>x.n===n?nx:x)}));later('d'+n,()=>post('saveDay',{day:nx}))};
 const addDay=()=>{const n=db.days.length?Math.max(...db.days.map(x=>x.n))+1:1;const nd={n,published:false,reading:null,listening:null,article:{title:'',text:''},writing:''};setDb(o=>({...o,days:[...o.days,nd]}));post('saveDay',{day:nd});setSel(n)};
 const addStu=e=>{e.preventDefault();const c=sc.trim();if(!c||!sn.trim())return;if(db.roster.some(s=>s.code.toLowerCase()===c.toLowerCase()))return alert('That student code already exists.');post('addStudent',{code:c,name:sn.trim()}).then(r=>{if(r){setDb(o=>({...o,roster:[...o.roster,{code:c,name:sn.trim()}]}));setSc('');setSn('')}})};
 const stu=db.roster.find(s=>s.code===who);

 return <Shell title="Teacher dashboard" sub="Publish daily modules and review student progress." onOut={out}>
  <div className="grid grid-cols-3 gap-3 mb-6">{[['Students enrolled',db.roster.length],['Days published',db.days.filter(x=>x.published).length],['Days completed',db.roster.reduce((a,s)=>a+pts(db,s.code),0)]].map(([l,v])=><div key={l} className="glass px-5 py-4"><div className="serif text-3xl">{v}</div><div className="muted text-sm">{l}</div></div>)}</div>
  <div className="flex gap-2 mb-6">{[['modules','Modules','layers'],['students','Students','users']].map(([k,l,i])=><button key={k} className="ghost" onClick={()=>setTab(k)} style={tab===k?{background:'linear-gradient(135deg,#f2c375,#c9812f)',color:'#1c1209',fontWeight:600}:null}><I n={i} s={16}/>{l}</button>)}</div>
  {tab==='modules'&&<div className="grid md:grid-cols-4 gap-5"><aside className="space-y-2">{db.days.map(x=><button key={x.n} onClick={()=>setSel(x.n)} className="glass w-full px-4 py-3 text-left flex justify-between items-center" style={d&&x.n===d.n?{boxShadow:'inset 0 0 0 1px rgba(242,195,117,.5)'}:null}><span>Day {x.n}</span><span className="text-xs" style={{color:x.published?'#9bd3a8':'#a99a85'}}>{x.published?'Published':'Draft'}</span></button>)}
   <button className="btn w-full" onClick={addDay}><I n="plus" s={16}/>Add day</button></aside>
   {d?<div className="md:col-span-3 space-y-4"><div className="flex flex-wrap gap-3 items-center justify-between"><h2 className="serif text-2xl">Day {d.n}</h2><div className="flex gap-2">
     <button className="btn" onClick={()=>upd(d.n,{published:!d.published})}>{d.published?'Unpublish':'Publish day'}</button>
     {d.n===Math.max(...db.days.map(x=>x.n))&&<button className="ghost" onClick={()=>{if(confirm('Delete Day '+d.n+'?')){post('deleteDay',{n:d.n});setDb(o=>({...o,days:o.days.filter(x=>x.n!==d.n)}));setSel(1)}}}><I n="trash" s={16}/>Delete</button>}</div></div>
    <Card t="Reading" icon="book"><Upload remote label="Upload .html or .pdf" accept=".html,.htm,.pdf" file={d.reading} onFile={f=>upd(d.n,{reading:/\.pdf$/i.test(f.name)?f:{...f,type:'html'}})}/><FileTools f={d.reading} clear={()=>upd(d.n,{reading:null})}/></Card>
    <Card t="Listening" icon="head"><Upload remote label="Upload .html with audio" accept=".html,.htm" file={d.listening} onFile={f=>upd(d.n,{listening:{...f,type:'html'}})}/><FileTools f={d.listening} clear={()=>upd(d.n,{listening:null})}/></Card>
    <Card t="Article" icon="doc"><input className="inp mb-3" placeholder="Article title" value={d.article.title} onChange={e=>upd(d.n,{article:{...d.article,title:e.target.value}})}/>
     <textarea className="inp min-h-[140px] mb-3" placeholder="Paste article text, or upload a .txt or .md file" value={d.article.text} onChange={e=>upd(d.n,{article:{...d.article,text:e.target.value}})}/>
     <Upload label="Upload .txt, .md or .html" accept=".txt,.md,.html,.htm" onFile={f=>upd(d.n,{article:{title:d.article.title||f.name.replace(/\.\w+$/,''),text:/\.html?$/i.test(f.name)?new DOMParser().parseFromString(f.data,'text/html').body.textContent.trim():f.data}})}/></Card>
    <Card t="Writing prompt" icon="pen"><textarea className="inp min-h-[110px]" placeholder="Instructions for the writing task" value={d.writing} onChange={e=>upd(d.n,{writing:e.target.value})}/></Card></div>:<div className="md:col-span-3 glass p-8 muted">Add the first day to begin.</div>}</div>}
  {tab==='students'&&<div className="grid md:grid-cols-3 gap-5"><div className="space-y-4">
   <Card t="Enroll a student" icon="users"><form onSubmit={addStu} className="space-y-2"><input className="inp" placeholder="Student code" value={sc} onChange={e=>setSc(e.target.value)}/><input className="inp" placeholder="Full name" value={sn} onChange={e=>setSn(e.target.value)}/><button className="btn w-full">Add student</button></form></Card>
   <Card t="Roster" icon="layers"><div className="space-y-1">{db.roster.map(s=><div key={s.code} className="flex items-center justify-between rounded-lg px-2 py-1.5" style={who===s.code?{background:'rgba(242,195,117,.12)'}:null}><button className="text-left flex-1" onClick={()=>setWho(s.code)}><div className="text-sm">{s.name}</div><div className="muted text-xs">{s.code}, {pts(db,s.code)} pts</div></button>
    <button aria-label="Remove student" className="muted" onClick={()=>confirm('Remove '+s.name+'?')&&(post('removeStudent',{code:s.code}),setDb(o=>({...o,roster:o.roster.filter(x=>x.code!==s.code)})))}><I n="trash" s={15}/></button></div>)}</div></Card>
   <Card t="Teacher code" icon="lock"><div className="flex gap-2"><input className="inp" placeholder="New code" value={tc} onChange={e=>setTc(e.target.value)}/><button className="ghost" onClick={()=>{if(tc.trim().length>=6){post('setTeacherCode',{code:tc.trim()}).then(r=>{if(r){setTc('');alert('Teacher code updated.')}})}else alert('Use at least 6 characters.')}}>Save</button></div></Card></div>
   <div className="md:col-span-2">{stu?<div className="space-y-4"><section className="glass p-6"><h2 className="serif text-2xl">{stu.name}</h2><p className="muted text-sm mb-4">{pts(db,stu.code)} points from {db.days.length} days</p><Chart db={db} code={stu.code}/></section>
    <section className="glass p-4 overflow-x-auto"><table className="w-full text-sm"><thead className="muted text-left"><tr>{['Day','Reading','Listening','Article','Writing','Status'].map(h=><th key={h} className="p-2 font-normal">{h}</th>)}</tr></thead><tbody>{db.days.map(x=>{const p=gp(db,stu.code,x.n);return <tr key={x.n} className="border-t" style={{borderColor:'rgba(255,225,185,.06)'}}><td className="p-2">Day {x.n}</td><td className="p-2">{p.r!=null?p.r+'/40':'–'}</td><td className="p-2">{p.l!=null?p.l+'/40':'–'}</td><td className="p-2">{p.art?'Read':'–'}</td><td className="p-2">{p.wr.trim()?p.wr.trim().split(/\s+/).length+' words':'–'}</td><td className="p-2" style={{color:done(p)?'#9bd3a8':'#a99a85'}}>{done(p)?'Complete':'In progress'}</td></tr>})}</tbody></table></section>
    {db.days.map(x=>{const p=gp(db,stu.code,x.n);return p.wr.trim()||p.notes.trim()||p.hl.length?<section key={x.n} className="glass p-5 space-y-3"><div className="font-medium">Day {x.n}</div>{p.wr.trim()&&<div><div className="muted text-sm mb-1">Writing</div><p className="serif leading-7 whitespace-pre-wrap">{p.wr}</p></div>}{p.hl.length>0&&<div><div className="muted text-sm mb-1">Highlighted phrases</div><div className="flex flex-wrap gap-2">{p.hl.map(h=><mark key={h} className="px-1">{h}</mark>)}</div></div>}{p.notes.trim()&&<div><div className="muted text-sm mb-1">Useful chunks</div><p className="whitespace-pre-wrap text-sm leading-6">{p.notes}</p></div>}</section>:null})}<button className="ghost" onClick={()=>confirm('Reset all progress for '+stu.name+'?')&&(post('resetProgress',{code:stu.code}),setDb(o=>{const q={...o.progress};delete q[stu.code];return{...o,progress:q}}))}><I n="trash" s={15}/>Reset progress</button></div>:<div className="glass p-8 muted">Select a student to review scores, completion and writing.</div>}</div></div>}</Shell>}

function App(){
 const [ses,setSes]=useState(()=>{try{const x=JSON.parse(localStorage.getItem('ielts_session'));if(x)S.tok=x.token;return x}catch(e){return null}}),[db,setDb]=useState(null);
 const out=()=>{try{localStorage.removeItem('ielts_session')}catch(e){}S.tok='';setDb(null);setSes(null)};
 const onIn=r=>{S.tok=r.token;try{localStorage.setItem('ielts_session',JSON.stringify(r))}catch(e){}setSes(r)};
 useEffect(()=>{if(!ses)return;api('state').then(setDb).catch(e=>e.status===401?out():alert(e.message))},[ses]);
 useEffect(()=>{if(!ses)return;const i=setInterval(()=>api('state').then(n=>setDb(o=>o&&(ses.role==='teacher'?{...o,roster:n.roster,progress:n.progress}:{...o,days:n.days}))).catch(()=>{}),15000);return()=>clearInterval(i)},[ses]);
 if(!ses)return <Login onIn={onIn}/>;
 if(!db)return <div className="min-h-screen grid place-items-center muted">Loading…</div>;
 return ses.role==='teacher'?<Teacher db={db} setDb={setDb} out={out}/>:<Student db={db} setDb={setDb} code={ses.code} out={out}/>}
createRoot(document.getElementById('root')).render(<App/>);
