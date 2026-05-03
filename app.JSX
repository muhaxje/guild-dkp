import { useState, useEffect, useCallback, useRef } from “react”;

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const BASE_DKP = 10;
const ACTIVITIES = [
{ id: “pvp_roam”,  label: “PVP Roaming”,       weight: 1.5, icon: “⚔️”,  color: “#e05252” },
{ id: “ava_raid”,  label: “PVE Ava Raids”,      weight: 1.0, icon: “🏰”,  color: “#6ab0e8” },
{ id: “pvp_scrim”, label: “PVP Scrims”,          weight: 1.5, icon: “🛡️”,  color: “#e07a52” },
{ id: “transport”, label: “Guildovní Převoz”,   weight: 2.0, icon: “🚢”,  color: “#c4a843” },
];
const KEY_BASE_DKP = 2;
const KEY_UNIT     = 100000;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const actDKP   = (id)   => { const a = ACTIVITIES.find(x=>x.id===id); return a ? Math.round(BASE_DKP*a.weight) : 0; };
const keysDKP  = (keys) => Math.floor(keys/KEY_UNIT)*KEY_BASE_DKP;
const fmtNum   = (n)    => Number(n).toLocaleString(“cs-CZ”);
const fmtDate  = (ts)   => new Date(ts).toLocaleString(“cs-CZ”,{day:“2-digit”,month:“2-digit”,hour:“2-digit”,minute:“2-digit”});
const calcDKP  = (events, pid) => events
.filter(e=>(e.participants||[]).includes(pid)||e.playerId===pid)
.reduce((s,e)=>{ if(e.type===“activity”) return s+actDKP(e.activityId); if(e.type===“keys”) return s+keysDKP(e.keys); return s; },0);

const RANKS = [
{ min:0,    label:“Novic”,    color:”#6a6a6a” },
{ min:50,   label:“Člen”,     color:”#5a9a5a” },
{ min:200,  label:“Bojovník”, color:”#6ab0e8” },
{ min:500,  label:“Rytíř”,    color:”#c4a843” },
{ min:1000, label:“Šampion”,  color:”#e05252” },
{ min:2000, label:“Legenda”,  color:”#c47aff” },
];
const getRank = (dkp) => […RANKS].reverse().find(r=>dkp>=r.min)||RANKS[0];

// ─── STORAGE ─────────────────────────────────────────────────────────────────
const STORE_DATA = “dkp_v2_data”;
const STORE_AUTH = “dkp_v2_auth”;
const emptyData  = () => ({ players:[], events:[], nextPlayerId:1, nextEventId:1 });

async function loadData()  { try { const r=await window.storage.get(STORE_DATA); return r?.value ? JSON.parse(r.value) : emptyData(); } catch { return emptyData(); } }
async function saveData(d) { try { await window.storage.set(STORE_DATA, JSON.stringify(d)); } catch {} }
async function loadAuth()  { try { const r=await window.storage.get(STORE_AUTH); return r?.value ? JSON.parse(r.value) : null; } catch { return null; } }
async function saveAuth(a) { try { await window.storage.set(STORE_AUTH, JSON.stringify(a)); } catch {} }

// ════════════════════════════════════════════════════════════════════════════
export default function App() {
const [data,    setData]    = useState(null);
const [auth,    setAuth]    = useState(null);   // { adminHash } | null
const [role,    setRole]    = useState(“member”); // “admin” | “member”
const [tab,     setTab]     = useState(“leaderboard”);
const [toast,   setToast]   = useState(null);
const [toastOk, setToastOk] = useState(true);
const fileRef = useRef();

useEffect(()=>{ loadData().then(setData); loadAuth().then(setAuth); },[]);
useEffect(()=>{ if(data) saveData(data); },[data]);

const showToast = (msg, ok=true) => { setToast(msg); setToastOk(ok); setTimeout(()=>setToast(null),2800); };
const update = useCallback((fn)=>setData(p=>fn({…p})),[]);
const isAdmin = role===“admin”;

// ── EXPORT ────────────────────────────────────────────────────────────────
const exportJSON = () => {
const blob = new Blob([JSON.stringify({…data, exportedAt: Date.now()},null,2)],{type:“application/json”});
const url  = URL.createObjectURL(blob);
const a    = document.createElement(“a”); a.href=url; a.download=“guild_dkp_export.json”; a.click();
URL.revokeObjectURL(url);
showToast(“✅ Export stažen — sdílej soubor v Discordu!”);
};

// ── IMPORT ────────────────────────────────────────────────────────────────
const importJSON = (e) => {
const file = e.target.files[0]; if(!file) return;
const reader = new FileReader();
reader.onload = (ev) => {
try {
const parsed = JSON.parse(ev.target.result);
if(!parsed.players || !parsed.events) throw new Error(“Neplatný formát”);
setData({ players: parsed.players, events: parsed.events, nextPlayerId: parsed.nextPlayerId||1, nextEventId: parsed.nextEventId||1 });
showToast(`✅ Importováno: ${parsed.players.length} hráčů, ${parsed.events.length} událostí`);
} catch { showToast(“❌ Chyba při importu — neplatný soubor”,false); }
};
reader.readAsText(file);
e.target.value=””;
};

if (!data) return <Loading />;

return (
<div style={{minHeight:“100vh”,background:”#0a0908”,color:”#e0d8c8”,fontFamily:”‘Georgia’,serif”,position:“relative”}}>
<BgTexture />

```
  {/* ── HEADER ── */}
  <header style={{position:"relative",zIndex:2,padding:"22px 28px 0",borderBottom:"1px solid #2e2510",background:"linear-gradient(180deg,#120e06 0%,transparent 100%)"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px",marginBottom:"4px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        <span style={{fontSize:"1.9rem"}}>⚜️</span>
        <div>
          <h1 style={{margin:0,fontSize:"1.4rem",fontWeight:"normal",letterSpacing:".25em",color:"#c4a843",textTransform:"uppercase",textShadow:"0 0 20px #c4a84366"}}>
            Guild DKP
          </h1>
          <p style={{margin:0,fontSize:".65rem",color:"#6a5a32",letterSpacing:".4em",textTransform:"uppercase"}}>
            Albion Online · Dragon Kill Points
          </p>
        </div>
      </div>
      {/* ROLE BADGE + LOGIN */}
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <RoleBadge role={role} />
        <AuthButton role={role} auth={auth} setAuth={setAuth} setRole={setRole} showToast={showToast} saveAuth={saveAuth} />
      </div>
    </div>

    {/* EXPORT / IMPORT STRIP */}
    <div style={{display:"flex",gap:"8px",padding:"10px 0 0",flexWrap:"wrap"}}>
      {isAdmin && (
        <ActionBtn onClick={exportJSON} color="#c4a843" icon="💾">Exportovat JSON</ActionBtn>
      )}
      <ActionBtn onClick={()=>fileRef.current.click()} color={isAdmin?"#6ab0e8":"#c4a843"} icon="📂">
        {isAdmin ? "Importovat JSON" : "Načíst data (JSON)"}
      </ActionBtn>
      <input ref={fileRef} type="file" accept=".json" onChange={importJSON} style={{display:"none"}} />
      {!isAdmin && (
        <span style={{fontSize:".7rem",color:"#4a4030",alignSelf:"center",letterSpacing:".1em"}}>
          Přihlás se jako admin pro správu DKP
        </span>
      )}
    </div>

    {/* TABS */}
    <nav style={{display:"flex",gap:0,marginTop:"16px",overflowX:"auto"}}>
      {[
        {id:"leaderboard",label:"Žebříček",icon:"🏆"},
        ...(isAdmin ? [
          {id:"log_event",label:"Zaznamenat",icon:"📋"},
          {id:"players",  label:"Hráči",    icon:"👥"},
          {id:"history",  label:"Historie", icon:"📜"},
        ] : [
          {id:"players",  label:"Hráči",    icon:"👥"},
        ]),
      ].map(t=>(
        <TabBtn key={t.id} active={tab===t.id} onClick={()=>setTab(t.id)}>{t.icon} {t.label}</TabBtn>
      ))}
    </nav>
  </header>

  {/* ── BODY ── */}
  <main style={{position:"relative",zIndex:2,padding:"26px 28px",maxWidth:"960px",margin:"0 auto"}}>
    {tab==="leaderboard" && <Leaderboard data={data} />}
    {tab==="log_event"   && isAdmin && <LogEvent data={data} update={update} showToast={showToast} />}
    {tab==="players"     && (isAdmin
      ? <Players data={data} update={update} showToast={showToast} />
      : <PlayersReadOnly data={data} />
    )}
    {tab==="history"     && isAdmin && <History data={data} update={update} showToast={showToast} />}
  </main>

  {/* TOAST */}
  {toast && (
    <div style={{
      position:"fixed",bottom:"28px",left:"50%",transform:"translateX(-50%)",
      background: toastOk ? "#c4a843" : "#e05252",
      color:"#0a0908",padding:"10px 24px",borderRadius:"2px",
      fontWeight:"bold",fontSize:".82rem",letterSpacing:".1em",zIndex:999,
      boxShadow:`0 4px 28px ${toastOk?"#c4a84344":"#e0525244"}`,
      animation:"slideUp .25s ease",whiteSpace:"nowrap",
    }}>
      {toast}
    </div>
  )}
  <style>{`@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}} ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:#0a0908} ::-webkit-scrollbar-thumb{background:#3a3020;border-radius:3px}`}</style>
</div>
```

);
}

// ── AUTH COMPONENTS ──────────────────────────────────────────────────────────
function AuthButton({ role, auth, setAuth, setRole, showToast, saveAuth }) {
const [open,  setOpen]  = useState(false);
const [mode,  setMode]  = useState(“login”);   // login | setup | change
const [pw,    setPw]    = useState(””);
const [pw2,   setPw2]   = useState(””);
const [oldPw, setOldPw] = useState(””);

const hashPw = (s) => btoa(encodeURIComponent(s + “dkp_guild_salt_2024”));

const setup = () => {
if(pw.length<4)  return showToast(“❌ Heslo musí mít alespoň 4 znaky”,false);
if(pw!==pw2)     return showToast(“❌ Hesla se neshodují”,false);
const a = { adminHash: hashPw(pw) };
setAuth(a); saveAuth(a); setRole(“admin”); setOpen(false); setPw(””); setPw2(””);
showToast(“✅ Admin heslo nastaveno! Přihlášen.”);
};

const login = () => {
if(!auth) return showToast(“❌ Nejdříve nastav admin heslo”,false);
if(hashPw(pw)!==auth.adminHash) return showToast(“❌ Špatné heslo”,false);
setRole(“admin”); setOpen(false); setPw(””); showToast(“✅ Přihlášen jako admin”);
};

const changePassword = () => {
if(!auth) return;
if(hashPw(oldPw)!==auth.adminHash) return showToast(“❌ Původní heslo je špatně”,false);
if(pw.length<4)  return showToast(“❌ Nové heslo musí mít alespoň 4 znaky”,false);
if(pw!==pw2)     return showToast(“❌ Hesla se neshodují”,false);
const a = { adminHash: hashPw(pw) };
setAuth(a); saveAuth(a); setOpen(false); setPw(””); setPw2(””); setOldPw(””);
showToast(“✅ Heslo změněno”);
};

const logout = () => { setRole(“member”); showToast(“Odhlášen”); };

if (role===“admin”) return (
<div style={{position:“relative”}}>
<button onClick={()=>setOpen(o=>!o)} style={ghostBtn(”#e05252”)}>🔓 Odhlásit / Změnit heslo</button>
{open && (
<Popover onClose={()=>setOpen(false)}>
<PopTitle>Admin nastavení</PopTitle>
<div style={{display:“flex”,flexDirection:“column”,gap:“8px”}}>
<SLabel>Původní heslo</SLabel>
<SInput value={oldPw} onChange={e=>setOldPw(e.target.value)} type=“password” placeholder=”••••” />
<SLabel>Nové heslo (min. 4 znaky)</SLabel>
<SInput value={pw}  onChange={e=>setPw(e.target.value)}  type=“password” placeholder=”••••” />
<SLabel>Potvrdit nové heslo</SLabel>
<SInput value={pw2} onChange={e=>setPw2(e.target.value)} type=“password” placeholder=”••••” />
<div style={{display:“flex”,gap:“8px”,marginTop:“4px”}}>
<GoldBtn onClick={changePassword}>Změnit heslo</GoldBtn>
<button onClick={logout} style={{…ghostBtn(”#e05252”),padding:“7px 14px”,fontSize:”.78rem”}}>Odhlásit</button>
</div>
</div>
</Popover>
)}
</div>
);

return (
<div style={{position:“relative”}}>
<button onClick={()=>setOpen(o=>!o)} style={ghostBtn(”#c4a843”)}>🔐 Admin přihlášení</button>
{open && (
<Popover onClose={()=>setOpen(false)}>
{!auth ? (
<>
<PopTitle>⚙️ Nastavit admin heslo</PopTitle>
<p style={{margin:“0 0 12px”,fontSize:”.75rem”,color:”#7a6a42”,lineHeight:“1.5”}}>První spuštění — nastav heslo pro admin přístup.</p>
<SLabel>Heslo (min. 4 znaky)</SLabel>
<SInput value={pw}  onChange={e=>setPw(e.target.value)}  type=“password” placeholder=”••••” />
<SLabel style={{marginTop:“8px”}}>Potvrdit heslo</SLabel>
<SInput value={pw2} onChange={e=>setPw2(e.target.value)} type=“password” placeholder=”••••” />
<GoldBtn style={{marginTop:“12px”}} onClick={setup}>Nastavit a přihlásit</GoldBtn>
</>
) : (
<>
<PopTitle>🔐 Admin přihlášení</PopTitle>
<SLabel>Heslo</SLabel>
<SInput value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key===“Enter”&&login()} type=“password” placeholder=”••••” autoFocus />
<GoldBtn style={{marginTop:“12px”}} onClick={login}>Přihlásit</GoldBtn>
</>
)}
</Popover>
)}
</div>
);
}

// ── LEADERBOARD ──────────────────────────────────────────────────────────────
function Leaderboard({ data }) {
const { players, events } = data;
const medal = [”#FFD700”,”#C0C0C0”,”#CD7F32”];

const summary = players.map(p=>({
…p,
dkp: calcDKP(events,p.id),
parts: events.filter(e=>e.type===“activity”&&(e.participants||[]).includes(p.id)).length,
})).sort((a,b)=>b.dkp-a.dkp);

const actTotals = ACTIVITIES.map(a=>({
…a,
count:    events.filter(e=>e.type===“activity”&&e.activityId===a.id).length,
dkpTotal: events.filter(e=>e.type===“activity”&&e.activityId===a.id)
.reduce((s,e)=>s+(e.participants?.length||0)*actDKP(a.id),0),
}));

const totalDKP = events.reduce((s,e)=>{
if(e.type===“activity”) return s+(e.participants?.length||0)*actDKP(e.activityId);
if(e.type===“keys”)     return s+keysDKP(e.keys);
return s;
},0);

return (
<div>
{/* STATS */}
<div style={{display:“grid”,gridTemplateColumns:“repeat(auto-fit,minmax(140px,1fr))”,gap:“12px”,marginBottom:“28px”}}>
{[
{icon:“👥”,val:players.length,     lbl:“Hráčů”},
{icon:“⚔️”,val:events.filter(e=>e.type===“activity”).length, lbl:“Událostí”},
{icon:“💎”,val:fmtNum(totalDKP),   lbl:“DKP celkem”},
].map(c=>(
<div key={c.lbl} style={{background:“linear-gradient(135deg,#1a1408,#120e08)”,border:“1px solid #2e2510”,padding:“14px 18px”,borderRadius:“2px”}}>
<div style={{fontSize:“1.5rem”}}>{c.icon}</div>
<div style={{fontSize:“1.35rem”,color:”#c4a843”,marginTop:“2px”}}>{c.val}</div>
<div style={{fontSize:”.65rem”,color:”#5a4a28”,letterSpacing:”.2em”,textTransform:“uppercase”}}>{c.lbl}</div>
</div>
))}
</div>

```
  <H2>⚜ Žebříček DKP</H2>
  {summary.length===0
    ? <Empty text="Žádná data. Admin musí přidat hráče a exportovat JSON." />
    : (
      <div style={{border:"1px solid #2e2510",borderRadius:"2px",overflow:"hidden",marginBottom:"32px"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#160f06",borderBottom:"1px solid #2e2510"}}>
              {["#","Hráč","DKP","Účasti","Rank"].map(h=>(
                <th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:".65rem",letterSpacing:".2em",textTransform:"uppercase",color:"#6a5a32",fontWeight:"normal"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((p,i)=>{
              const r = getRank(p.dkp);
              return (
                <tr key={p.id} style={{background:i%2===0?"#0e0c08":"#110f09",borderBottom:"1px solid #1a1508"}}>
                  <td style={{padding:"11px 14px",color:i<3?medal[i]:"#4a4028",fontWeight:"bold"}}>{i+1}</td>
                  <td style={{padding:"11px 14px",color:"#e0d8c8",fontWeight:i===0?"bold":"normal"}}>{p.name}</td>
                  <td style={{padding:"11px 14px"}}>
                    <span style={{color:"#c4a843",fontWeight:"bold"}}>{fmtNum(p.dkp)}</span>
                    <span style={{color:"#4a4028",fontSize:".72rem",marginLeft:"3px"}}>DKP</span>
                  </td>
                  <td style={{padding:"11px 14px",color:"#7a6a42"}}>{p.parts}×</td>
                  <td style={{padding:"11px 14px"}}><RankTag rank={r} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )
  }

  <H2>📊 Statistiky aktivit</H2>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(195px,1fr))",gap:"10px"}}>
    {actTotals.map(a=>(
      <div key={a.id} style={{background:"#0e0c08",border:`1px solid ${a.color}2a`,borderLeft:`3px solid ${a.color}`,padding:"13px 16px",borderRadius:"2px"}}>
        <div style={{fontSize:"1.1rem",marginBottom:"4px"}}>{a.icon} <span style={{color:a.color,fontSize:".75rem",letterSpacing:".12em",textTransform:"uppercase"}}>{a.label}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:"8px"}}>
          <div><div style={{color:"#e0d8c8",fontWeight:"bold"}}>{a.count}</div><div style={{color:"#4a4028",fontSize:".65rem",textTransform:"uppercase",letterSpacing:".1em"}}>Událostí</div></div>
          <div style={{textAlign:"right"}}><div style={{color:"#c4a843",fontWeight:"bold"}}>{fmtNum(a.dkpTotal)}</div><div style={{color:"#4a4028",fontSize:".65rem",textTransform:"uppercase",letterSpacing:".1em"}}>DKP</div></div>
        </div>
        <div style={{marginTop:"8px",fontSize:".68rem",color:"#6a5a32",borderTop:"1px solid #1e1a0e",paddingTop:"6px"}}>
          Váha <span style={{color:a.color}}>{a.weight*100}%</span> → <span style={{color:"#c4a843",fontWeight:"bold"}}>{Math.round(BASE_DKP*a.weight)} DKP</span> / účast
        </div>
      </div>
    ))}
  </div>
</div>
```

);
}

// ── PLAYERS READ-ONLY ────────────────────────────────────────────────────────
function PlayersReadOnly({ data }) {
return (
<div>
<H2>👥 Členové guildy</H2>
<InfoBox>Zobrazení v režimu člen — správu hráčů má admin.</InfoBox>
<div style={{display:“grid”,gap:“8px”,marginTop:“16px”}}>
{data.players.length===0
? <Empty text="Žádní hráči. Načti aktuální JSON od admina." />
: data.players.map(p=>{
const dkp = calcDKP(data.events,p.id);
const r   = getRank(dkp);
return (
<div key={p.id} style={{background:”#0e0c08”,border:“1px solid #2e2510”,padding:“11px 16px”,borderRadius:“2px”,display:“flex”,alignItems:“center”,justifyContent:“space-between”,gap:“12px”,flexWrap:“wrap”}}>
<div style={{display:“flex”,alignItems:“center”,gap:“12px”}}>
<Avatar name={p.name} />
<span style={{color:”#e0d8c8”}}>{p.name}</span>
</div>
<div style={{display:“flex”,alignItems:“center”,gap:“14px”}}>
<span style={{color:”#c4a843”,fontWeight:“bold”}}>{fmtNum(dkp)} DKP</span>
<RankTag rank={r} />
</div>
</div>
);
})
}
</div>
</div>
);
}

// ── PLAYERS ADMIN ────────────────────────────────────────────────────────────
function Players({ data, update, showToast }) {
const [name, setName] = useState(””);

const add = () => {
const n = name.trim();
if(!n) return showToast(“❌ Zadej jméno”,false);
if(data.players.find(p=>p.name.toLowerCase()===n.toLowerCase())) return showToast(“❌ Hráč už existuje”,false);
update(d=>{ d.players.push({id:d.nextPlayerId++,name:n,joinedAt:Date.now()}); return d; });
showToast(`✅ Hráč "${n}" přidán`); setName(””);
};

const remove = (id,n) => {
if(!confirm(`Odebrat "${n}"? Přijde o všechny záznamy.`)) return;
update(d=>{ d.players=d.players.filter(p=>p.id!==id); d.events=d.events.filter(e=>!((e.participants||[]).includes(id)||e.playerId===id)); return d; });
showToast(`Hráč "${n}" odebrán`);
};

return (
<div>
<H2>👥 Správa hráčů</H2>
<div style={{display:“flex”,gap:“10px”,marginBottom:“24px”,flexWrap:“wrap”}}>
<input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key===“Enter”&&add()}
placeholder=“Jméno hráče v Albionu…” style={{…inp(),flex:1,minWidth:“180px”,maxWidth:“300px”}} />
<GoldBtn onClick={add}>+ Přidat</GoldBtn>
</div>

```
  {data.players.length===0
    ? <Empty text="Žádní hráči." />
    : <div style={{display:"grid",gap:"8px"}}>
        {data.players.map(p=>{
          const dkp = calcDKP(data.events,p.id);
          return (
            <div key={p.id} style={{background:"#0e0c08",border:"1px solid #2e2510",padding:"11px 16px",borderRadius:"2px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <Avatar name={p.name} />
                <div>
                  <div style={{color:"#e0d8c8",fontWeight:"bold"}}>{p.name}</div>
                  <div style={{fontSize:".68rem",color:"#4a4028"}}>od {new Date(p.joinedAt).toLocaleDateString("cs-CZ")}</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                <span style={{color:"#c4a843",fontWeight:"bold"}}>{fmtNum(dkp)} DKP</span>
                <RankTag rank={getRank(dkp)} />
                <button onClick={()=>remove(p.id,p.name)} style={{background:"transparent",border:"1px solid #3a1a1a",color:"#7a4040",padding:"4px 9px",borderRadius:"2px",cursor:"pointer",fontFamily:"inherit",fontSize:".72rem"}}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
  }
</div>
```

);
}

// ── LOG EVENT ────────────────────────────────────────────────────────────────
function LogEvent({ data, update, showToast }) {
const [actType, setActType] = useState(“activity”);
const [selAct,  setSelAct]  = useState(ACTIVITIES[0].id);
const [selPl,   setSelPl]   = useState([]);
const [keyPl,   setKeyPl]   = useState(””);
const [keyAmt,  setKeyAmt]  = useState(””);
const [note,    setNote]    = useState(””);

const toggle = (id) => setSelPl(s=>s.includes(id)?s.filter(x=>x!==id):[…s,id]);
const preview = actType===“activity” ? actDKP(selAct) : keysDKP(Number(keyAmt)||0);

const submit = () => {
if(actType===“activity”) {
if(selPl.length===0) return showToast(“❌ Vyber alespoň jednoho hráče”,false);
update(d=>{ d.events.push({id:d.nextEventId++,type:“activity”,activityId:selAct,participants:[…selPl],note,ts:Date.now()}); return d; });
showToast(`✅ ${selPl.length} hráčů × ${fmtNum(preview)} DKP zapsáno`);
setSelPl([]); setNote(””);
} else {
if(!keyPl) return showToast(“❌ Vyber hráče”,false);
const keys = Number(keyAmt);
if(!keys||keys<1) return showToast(“❌ Zadej počet klíčků”,false);
if(keysDKP(keys)===0) return showToast(“❌ Minimum 100 000 klíčků pro DKP”,false);
update(d=>{ d.events.push({id:d.nextEventId++,type:“keys”,playerId:Number(keyPl),keys,note,ts:Date.now()}); return d; });
showToast(`✅ ${fmtNum(keys)} klíčků → +${keysDKP(keys)} DKP`);
setKeyPl(””); setKeyAmt(””); setNote(””);
}
};

return (
<div>
<H2>📋 Zaznamenat aktivitu</H2>
<div style={{display:“flex”,gap:“8px”,marginBottom:“22px”}}>
{[{v:“activity”,l:“Aktivita guildy”},{v:“keys”,l:“🗝️ Klíčky sezóny”}].map(t=>(
<button key={t.v} onClick={()=>setActType(t.v)} style={{background:actType===t.v?”#c4a843”:“transparent”,border:`1px solid ${actType===t.v?"#c4a843":"#2e2510"}`,color:actType===t.v?”#0a0908”:”#7a6a42”,padding:“7px 18px”,borderRadius:“2px”,cursor:“pointer”,fontFamily:“inherit”,fontSize:”.78rem”,letterSpacing:”.12em”,textTransform:“uppercase”,fontWeight:actType===t.v?“bold”:“normal”}}>
{t.l}
</button>
))}
</div>

```
  {actType==="activity" ? (
    <>
      <SLabel>Typ aktivity</SLabel>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:"9px",marginBottom:"20px"}}>
        {ACTIVITIES.map(a=>(
          <button key={a.id} onClick={()=>setSelAct(a.id)} style={{background:selAct===a.id?`${a.color}18`:"#0e0c08",border:`1px solid ${selAct===a.id?a.color:"#2e2510"}`,color:selAct===a.id?a.color:"#6a5a42",padding:"11px 14px",borderRadius:"2px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .15s"}}>
            <div style={{fontSize:"1.1rem"}}>{a.icon}</div>
            <div style={{fontSize:".75rem",letterSpacing:".1em",textTransform:"uppercase",marginTop:"3px"}}>{a.label}</div>
            <div style={{fontSize:".68rem",marginTop:"3px",opacity:.75}}>Váha {a.weight*100}% → <b>{Math.round(BASE_DKP*a.weight)} DKP</b></div>
          </button>
        ))}
      </div>
      <SLabel>Účastníci ({selPl.length} vybráno)</SLabel>
      {data.players.length===0
        ? <Empty text="Nejdříve přidej hráče." />
        : <div style={{display:"flex",flexWrap:"wrap",gap:"7px",marginBottom:"20px"}}>
            <SmallChip col="#c4a843" onClick={()=>setSelPl(data.players.map(p=>p.id))}>Vybrat vše</SmallChip>
            <SmallChip col="#6a5a42" onClick={()=>setSelPl([])}>Zrušit</SmallChip>
            {data.players.map(p=>{
              const on=selPl.includes(p.id);
              return <button key={p.id} onClick={()=>toggle(p.id)} style={{background:on?"#c4a84318":"#0e0c08",border:`1px solid ${on?"#c4a843":"#2e2510"}`,color:on?"#c4a843":"#6a5a42",padding:"5px 13px",borderRadius:"2px",cursor:"pointer",fontFamily:"inherit",fontSize:".82rem",transition:"all .15s"}}>
                {on?"✓ ":""}{p.name}
              </button>;
            })}
          </div>
      }
    </>
  ) : (
    <div style={{display:"grid",gap:"16px",maxWidth:"380px",marginBottom:"20px"}}>
      <div>
        <SLabel>Hráč</SLabel>
        <select value={keyPl} onChange={e=>setKeyPl(e.target.value)} style={inp()}>
          <option value="">— Vyber hráče —</option>
          {data.players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <SLabel>Počet klíčků v sezóně</SLabel>
        <input type="number" min="0" placeholder="350000" value={keyAmt} onChange={e=>setKeyAmt(e.target.value)} style={inp()} />
        {keyAmt&&Number(keyAmt)>0 && (
          <div style={{marginTop:"5px",fontSize:".75rem",color:"#c4a843"}}>
            {Math.floor(Number(keyAmt)/KEY_UNIT)} × 100k → <b>+{keysDKP(Number(keyAmt))} DKP</b>
          </div>
        )}
      </div>
    </div>
  )}

  <SLabel>Poznámka (volitelné)</SLabel>
  <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Popis…" style={{...inp(),maxWidth:"380px",marginBottom:"22px"}} />

  <div style={{display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap"}}>
    {actType==="activity"&&selPl.length>0 && (
      <div style={{background:"#140f08",border:"1px solid #c4a84330",padding:"9px 16px",borderRadius:"2px",fontSize:".82rem"}}>
        <span style={{color:"#6a5a32"}}>Celkem: </span>
        <span style={{color:"#c4a843",fontWeight:"bold"}}>{fmtNum(selPl.length*preview)} DKP</span>
        <span style={{color:"#4a3a18"}}> ({selPl.length}×{preview})</span>
      </div>
    )}
    <GoldBtn onClick={submit}>⚜ Uložit</GoldBtn>
  </div>
</div>
```

);
}

// ── HISTORY ──────────────────────────────────────────────────────────────────
function History({ data, update, showToast }) {
const sorted = […data.events].sort((a,b)=>b.ts-a.ts);
const getName = (id) => data.players.find(p=>p.id===id)?.name||”?”;
const del = (id) => { if(!confirm(“Smazat záznam?”)) return; update(d=>{ d.events=d.events.filter(e=>e.id!==id); return d; }); showToast(“Smazáno”); };

return (
<div>
<H2>📜 Historie <span style={{color:”#4a4028”,fontSize:”.75rem”,fontWeight:“normal”}}>({sorted.length})</span></H2>
{sorted.length===0 ? <Empty text="Žádné záznamy." /> : (
<div style={{display:“grid”,gap:“7px”}}>
{sorted.map(e=>{
const act = ACTIVITIES.find(a=>a.id===e.activityId);
const isAct = e.type===“activity”;
return (
<div key={e.id} style={{background:”#0e0c08”,border:“1px solid #2e2510”,borderLeft:`3px solid ${isAct?(act?.color||"#c4a843"):"#c4a843"}`,padding:“11px 14px”,borderRadius:“2px”,display:“flex”,alignItems:“flex-start”,justifyContent:“space-between”,gap:“10px”,flexWrap:“wrap”}}>
<div>
<div style={{display:“flex”,alignItems:“center”,gap:“7px”,flexWrap:“wrap”,marginBottom:“3px”}}>
<span>{isAct?(act?.icon||“⚔️”):“🗝️”}</span>
<span style={{color:isAct?(act?.color||”#c4a843”):”#c4a843”,fontSize:”.72rem”,letterSpacing:”.12em”,textTransform:“uppercase”}}>{isAct?(act?.label||”?”):“Klíčky sezóny”}</span>
<span style={{color:”#4a4028”,fontSize:”.68rem”}}>{fmtDate(e.ts)}</span>
</div>
<div style={{fontSize:”.8rem”,color:”#7a6a42”}}>
{isAct
? <>{e.participants?.map(id=>getName(id)).join(”, “)} <span style={{color:”#c4a843”}}>+{fmtNum(actDKP(e.activityId))} DKP/os.</span></>
: <>{getName(e.playerId)} · {fmtNum(e.keys)} klíčků <span style={{color:”#c4a843”}}>→ +{keysDKP(e.keys)} DKP</span></>
}
</div>
{e.note && <div style={{fontSize:”.7rem”,color:”#4a4028”,marginTop:“2px”,fontStyle:“italic”}}>{e.note}</div>}
</div>
<button onClick={()=>del(e.id)} style={{background:“transparent”,border:“1px solid #3a1a1a”,color:”#6a3a3a”,padding:“3px 8px”,borderRadius:“2px”,cursor:“pointer”,fontFamily:“inherit”,fontSize:”.68rem”,flexShrink:0}}>smazat</button>
</div>
);
})}
</div>
)}
</div>
);
}

// ── MICRO COMPONENTS ─────────────────────────────────────────────────────────
const BgTexture = () => (

  <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
    backgroundImage:"radial-gradient(ellipse at 15% 5%,#1e1508 0%,transparent 50%),radial-gradient(ellipse at 85% 95%,#0e1020 0%,transparent 50%)"}} />
);
const Loading = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0a0908",color:"#c4a843",fontFamily:"serif",fontSize:"1.2rem",letterSpacing:".2em"}}>
    Načítám…
  </div>
);
const H2 = ({children,style={}}) => (
  <h2 style={{fontSize:".9rem",fontWeight:"normal",letterSpacing:".25em",textTransform:"uppercase",color:"#c4a843",borderBottom:"1px solid #2e2510",paddingBottom:"9px",marginBottom:"18px",marginTop:0,...style}}>{children}</h2>
);
const SLabel = ({children,style={}}) => (
  <div style={{fontSize:".65rem",color:"#6a5a32",letterSpacing:".2em",textTransform:"uppercase",marginBottom:"7px",...style}}>{children}</div>
);
const inp = () => ({background:"#0e0c08",border:"1px solid #2e2510",color:"#e0d8c8",padding:"8px 13px",borderRadius:"2px",fontFamily:"'Georgia',serif",fontSize:".85rem",outline:"none",width:"100%",boxSizing:"border-box"});
const ghostBtn = (col) => ({background:"transparent",border:`1px solid ${col}55`,color:col,padding:"7px 16px",borderRadius:"2px",cursor:"pointer",fontFamily:"inherit",fontSize:".75rem",letterSpacing:".12em",textTransform:"uppercase"});
const GoldBtn = ({children,onClick,style={}}) => (
  <button onClick={onClick} style={{background:"#c4a843",border:"none",color:"#0a0908",padding:"9px 22px",borderRadius:"2px",cursor:"pointer",fontFamily:"'Georgia',serif",fontSize:".8rem",fontWeight:"bold",letterSpacing:".15em",textTransform:"uppercase",...style}}>{children}</button>
);
const ActionBtn = ({children,onClick,color,icon}) => (
  <button onClick={onClick} style={{background:"transparent",border:`1px solid ${color}44`,color,padding:"5px 14px",borderRadius:"2px",cursor:"pointer",fontFamily:"inherit",fontSize:".72rem",letterSpacing:".1em"}}>
    {icon} {children}
  </button>
);
const TabBtn = ({active,onClick,children}) => (
  <button onClick={onClick} style={{background:active?"linear-gradient(180deg,#201808,#140e06)":"transparent",border:"none",borderTop:active?"2px solid #c4a843":"2px solid transparent",color:active?"#c4a843":"#6a5a32",padding:"9px 20px",cursor:"pointer",fontFamily:"inherit",fontSize:".78rem",letterSpacing:".15em",textTransform:"uppercase",whiteSpace:"nowrap",transition:"all .15s"}}>{children}</button>
);
const RoleBadge = ({role}) => (
  <span style={{background:role==="admin"?"#c4a84322":"#1a1810",border:`1px solid ${role==="admin"?"#c4a84366":"#2e2510"}`,color:role==="admin"?"#c4a843":"#6a5a32",padding:"4px 12px",borderRadius:"2px",fontSize:".7rem",letterSpacing:".15em",textTransform:"uppercase"}}>
    {role==="admin"?"👑 Admin":"👁 Člen"}
  </span>
);
const RankTag = ({rank}) => (
  <span style={{background:`${rank.color}18`,border:`1px solid ${rank.color}44`,color:rank.color,padding:"2px 9px",borderRadius:"2px",fontSize:".65rem",letterSpacing:".15em",textTransform:"uppercase"}}>{rank.label}</span>
);
const Avatar = ({name}) => (
  <div style={{width:"32px",height:"32px",background:"#c4a84318",border:"1px solid #c4a84330",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#c4a843",fontWeight:"bold",fontSize:".85rem",flexShrink:0}}>
    {name.charAt(0).toUpperCase()}
  </div>
);
const Empty = ({text}) => (
  <div style={{color:"#3a3020",fontSize:".82rem",padding:"22px",border:"1px dashed #2e2510",borderRadius:"2px",textAlign:"center",fontStyle:"italic"}}>{text}</div>
);
const InfoBox = ({children}) => (
  <div style={{background:"#0e1018",border:"1px solid #2a3040",color:"#6ab0e8",padding:"9px 16px",borderRadius:"2px",fontSize:".78rem",letterSpacing:".08em"}}>{children}</div>
);
const SmallChip = ({children,col,onClick}) => (
  <button onClick={onClick} style={{background:"transparent",border:`1px solid ${col}44`,color:col,padding:"4px 11px",borderRadius:"2px",cursor:"pointer",fontFamily:"inherit",fontSize:".72rem",letterSpacing:".1em"}}>{children}</button>
);
const Popover = ({children,onClose}) => (
  <div style={{position:"absolute",right:0,top:"calc(100% + 8px)",background:"#160f06",border:"1px solid #3a3010",padding:"18px 20px",borderRadius:"2px",zIndex:100,minWidth:"260px",boxShadow:"0 8px 32px #00000088"}}>
    <button onClick={onClose} style={{position:"absolute",top:"8px",right:"10px",background:"none",border:"none",color:"#6a5a32",cursor:"pointer",fontSize:"1rem"}}>✕</button>
    {children}
  </div>
);
const PopTitle = ({children}) => (
  <h3 style={{margin:"0 0 14px",fontSize:".85rem",fontWeight:"normal",letterSpacing:".2em",textTransform:"uppercase",color:"#c4a843"}}>{children}</h3>
);
const SInput = ({...props}) => (
  <input {...props} style={{background:"#0a0908",border:"1px solid #3a3010",color:"#e0d8c8",padding:"8px 12px",borderRadius:"2px",fontFamily:"'Georgia',serif",fontSize:".85rem",outline:"none",width:"100%",boxSizing:"border-box"}} />
);