// src/components/ProfileView.tsx
// Profile · Logout · App Download · Pattern Analysis · Admin ONLY for anandakiccha240@gmail.com
import React, { useState, useEffect, useMemo } from 'react';
import { useT } from '../lib/i18n';
import { getOverallStats, getAllTests, getStreak, getSettings, saveSettings, getAllAnswered } from '../lib/storage';
import { getLatestCutoff, getCutoffTrend } from '../lib/cutoffEngine';
import { getPhysicalRequirements } from '../lib/physicalData';
import { subscribeVisitors } from '../lib/visitorTracker';
import type { VisitorRecord } from '../lib/visitorTracker';
import type { UserSettings } from '../lib/storage';

interface UserProfile { name: string; email: string; avatar: string; }
const PROFILE_KEY = 'ksp_user_profile';
const ADMIN_EMAIL = 'anandakiccha240@gmail.com';
const SETTINGS_FILLED_KEY = 'ksp_profile_filled';

function loadProfile(): UserProfile | null {
  try { const s = localStorage.getItem(PROFILE_KEY); return s ? JSON.parse(s) : null; }
  catch { return null; }
}

let deferredInstallPrompt: Event | null = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstallPrompt = e; });

const EXAM_PATTERN = [
  { subject: 'General Awareness', weight: 70, color: '#D97706', emoji: '🇮🇳', note: '70 Qs — History, Polity, Geography, Current Affairs, KA Specific' },
  { subject: 'General Science',   weight: 21, color: '#16A34A', emoji: '🔬', note: '21 Qs — Physics, Chemistry, Biology (10th standard)' },
  { subject: 'Reasoning',         weight: 7,  color: '#7C3AED', emoji: '🧩', note: '7 Qs — Series, Analogies, Directions, Coding-Decoding' },
  { subject: 'Mathematics',       weight: 2,  color: '#0EA5E9', emoji: '🔢', note: '2 Qs — Basic Arithmetic, Averages, Percentages' },
];

// ─────────────────────────────────────────────────────────────────────────────
// WORLD-CLASS ADMIN ANALYTICS DASHBOARD
// Dark theme · Glassmorphism · Real-time · Premium design
// ─────────────────────────────────────────────────────────────────────────────
const D = {
  bg:      '#0A0F1E',
  bg2:     '#0F1629',
  card:    'rgba(255,255,255,0.05)',
  border:  'rgba(255,255,255,0.10)',
  text:    '#F1F5F9',
  text2:   '#94A3B8',
  text3:   '#475569',
  primary: '#3B82F6',
  green:   '#10B981',
  yellow:  '#F59E0B',
  red:     '#EF4444',
  purple:  '#8B5CF6',
  pink:    '#EC4899',
};

function StatCard({ icon, value, label, color, sub }: { icon: string; value: any; label: string; color: string; sub?: string }) {
  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: '16px 14px', backdropFilter: 'blur(12px)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '50%', background: color, opacity: 0.08, transform: 'translate(20px,-20px)' }} />
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 900, fontSize: 28, color, lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 11, color: D.text2, fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: D.text3, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: D.text2, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 800 }}>{value}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)`, borderRadius: 6, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
      </div>
    </div>
  );
}

function AdminDashboard({ onBack, profile }: { onBack: () => void; profile: UserProfile | null }) {
  const [pin,        setPin]        = useState('');
  const [unlocked,   setUnlocked]   = useState(() => sessionStorage.getItem('ksp_admin') === '1');
  const [tab,        setTab]        = useState<'overview'|'users'|'analytics'|'content'|'config'>('overview');
  const [visitors,   setVisitors]   = useState<VisitorRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [pulse,      setPulse]      = useState(false);

  const stats    = useMemo(() => getOverallStats(), []);
  const tests    = useMemo(() => getAllTests(), []);
  const streak   = useMemo(() => getStreak(), []);
  const settings = useMemo(() => getSettings(), []);
  const answered = useMemo(() => getAllAnswered(), []);

  useEffect(() => {
    if (!unlocked) return;
    setLoading(true);
    const unsub = subscribeVisitors((data) => {
      setVisitors(data);
      setLoading(false);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    });
    return unsub;
  }, [unlocked]);

  const today       = new Date().toISOString().split('T')[0];
  const week        = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
  const todayActive = visitors.filter(u => u.todayActive).length;
  const newThisWeek = visitors.filter(u => {
    const ts = (u.firstSeen as any)?.toMillis?.();
    return ts && new Date(ts).toISOString().split('T')[0] >= week;
  }).length;
  const totalUsers  = visitors.length;
  const googleUsers = visitors.filter(u => u.type === 'google').length;
  const guestUsers  = visitors.filter(u => u.type === 'guest').length;
  const avgTestScore = tests.length ? Math.round(tests.reduce((s,t) => s+(t.score/t.total)*100,0)/tests.length) : 0;

  const deviceDist = useMemo(() => {
    const m: Record<string,number> = {};
    visitors.forEach(v => { m[v.device||'unknown'] = (m[v.device||'unknown']||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [visitors]);

  const osDist = useMemo(() => {
    const m: Record<string,number> = {};
    visitors.forEach(v => { m[v.os||'Unknown'] = (m[v.os||'Unknown']||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [visitors]);

  const browserDist = useMemo(() => {
    const m: Record<string,number> = {};
    visitors.forEach(v => { m[v.browser||'Unknown'] = (m[v.browser||'Unknown']||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [visitors]);

  const countryDist = useMemo(() => {
    const m: Record<string,number> = {};
    visitors.forEach(v => { m[v.country||'Unknown'] = (m[v.country||'Unknown']||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [visitors]);

  const subjBreakdown = useMemo(() => {
    const map: Record<string,{total:number;correct:number}> = {};
    Object.values(answered).forEach((a:any) => {
      const subj = a.subject||'Unknown';
      if (!map[subj]) map[subj]={total:0,correct:0};
      map[subj].total++;
      if (a.correct) map[subj].correct++;
    });
    return Object.entries(map).map(([subj,d]) => ({ subj, total:d.total, acc:d.total>0?Math.round((d.correct/d.total)*100):0 })).sort((a,b)=>b.total-a.total);
  }, [answered]);

  const tryUnlock = () => {
    if (pin === '2024ksp') { sessionStorage.setItem('ksp_admin','1'); setUnlocked(true); }
    else { setPin(''); alert('❌ Wrong PIN'); }
  };

  // ── PIN screen ────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div style={{ minHeight:'100dvh', background:`linear-gradient(135deg, ${D.bg} 0%, #0D1B3E 100%)`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ width:'100%', maxWidth:360, textAlign:'center' }}>
          <button onClick={onBack} style={{ background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', borderRadius:10, padding:'8px 16px', color:D.text2, fontWeight:700, fontSize:13, cursor:'pointer', marginBottom:32 }}>← Back</button>

          <div style={{ width:88, height:88, borderRadius:24, background:'linear-gradient(135deg,#1D4ED8,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:40, boxShadow:'0 0 40px rgba(99,102,241,.4)' }}>🛡️</div>
          <div style={{ fontWeight:900, fontSize:24, color:D.text, marginBottom:6, letterSpacing:'-0.5px' }}>Admin Console</div>
          <div style={{ fontSize:13, color:D.text3, marginBottom:28 }}>Restricted access · {ADMIN_EMAIL}</div>

          <input type="password" value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key==='Enter' && tryUnlock()}
            placeholder="Enter PIN"
            style={{ width:'100%', padding:'16px', borderRadius:14, border:`2px solid rgba(99,102,241,.4)`, background:'rgba(255,255,255,.05)', color:D.text, fontSize:20, textAlign:'center', marginBottom:14, letterSpacing:10, outline:'none', fontFamily:'monospace', boxSizing:'border-box' }}
            autoFocus
          />
          <button onClick={tryUnlock}
            style={{ width:'100%', padding:'14px', borderRadius:14, background:'linear-gradient(135deg,#1D4ED8,#7C3AED)', border:'none', color:'#fff', fontWeight:800, fontSize:15, cursor:'pointer', letterSpacing:'0.02em', boxShadow:'0 8px 32px rgba(99,102,241,.4)' }}>
            🔓 Unlock Dashboard
          </button>
        </div>
      </div>
    );
  }

  const filteredUsers = userSearch.trim()
    ? visitors.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()) || (u.ip||'').includes(userSearch))
    : visitors;

  const TABS = [
    ['overview','📊','Overview'],
    ['users','👥','Users'],
    ['analytics','📈','Analytics'],
    ['content','📚','Content'],
    ['config','⚙️','Config'],
  ] as const;

  return (
    <div style={{ minHeight:'100dvh', background:`linear-gradient(160deg, ${D.bg} 0%, #0D1B3E 60%, #0A0F1E 100%)`, color:D.text }}>

      {/* ── Sticky Header ── */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(10,15,30,0.85)', backdropFilter:'blur(20px)', borderBottom:`1px solid ${D.border}`, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,.08)', border:`1px solid ${D.border}`, borderRadius:10, padding:'6px 12px', color:D.text2, fontWeight:700, fontSize:12, cursor:'pointer' }}>← Back</button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:15, color:D.text, display:'flex', alignItems:'center', gap:8 }}>
            🛡️ Admin Console
            <span style={{ fontSize:10, fontWeight:700, background: pulse ? 'rgba(16,185,129,.3)' : 'rgba(16,185,129,.15)', color:D.green, borderRadius:20, padding:'2px 8px', border:`1px solid ${D.green}40`, transition:'background .3s' }}>
              ● {loading ? 'CONNECTING' : 'LIVE'}
            </span>
          </div>
          <div style={{ fontSize:10, color:D.text3, marginTop:1 }}>{totalUsers} visitors tracked · real-time</div>
        </div>
        <button onClick={() => { sessionStorage.removeItem('ksp_admin'); setUnlocked(false); }}
          style={{ background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.3)', borderRadius:10, padding:'6px 10px', color:'#FCA5A5', fontSize:11, cursor:'pointer', fontWeight:700 }}>🔒 Lock</button>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display:'flex', gap:4, overflowX:'auto', padding:'12px 16px', borderBottom:`1px solid ${D.border}` }}>
        {TABS.map(([t, icon, label]) => (
          <button key={t} onClick={() => setTab(t as any)}
            style={{ whiteSpace:'nowrap', padding:'7px 14px', borderRadius:20, border:`1px solid ${tab===t ? D.primary : D.border}`, background: tab===t ? 'rgba(59,130,246,.2)' : 'rgba(255,255,255,.04)', color: tab===t ? '#93C5FD' : D.text2, fontWeight:700, fontSize:12, cursor:'pointer', flexShrink:0, transition:'all .2s' }}>
            {icon} {label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px 16px 120px' }}>

        {/* ════════════════ OVERVIEW ════════════════ */}
        {tab === 'overview' && (
          <>
            {/* 6 KPI Cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16 }}>
              <StatCard icon="👥" value={loading?'…':totalUsers}   label="Total Visitors" color={D.primary}  sub={`${googleUsers}G + ${guestUsers} guests`} />
              <StatCard icon="🟢" value={loading?'…':todayActive}  label="Active Today"   color={D.green}   sub="unique devices" />
              <StatCard icon="🆕" value={loading?'…':newThisWeek}  label="New This Week"  color={D.yellow}  sub="first-time visitors" />
              <StatCard icon="🔥" value={streak.current}           label="Your Streak"    color="#F97316"   sub={`best ${streak.best}d`} />
              <StatCard icon="🎯" value={`${stats.accuracy}%`}     label="Your Accuracy"  color={D.purple}  sub={`${stats.total} Qs`} />
              <StatCard icon="📝" value={tests.length}             label="Tests Done"     color={D.pink}    sub={avgTestScore?`avg ${avgTestScore}%`:'no tests'} />
            </div>

            {/* Test Score Bars */}
            {tests.length > 0 && (
              <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:16, marginBottom:12, backdropFilter:'blur(12px)' }}>
                <div style={{ fontWeight:700, fontSize:13, color:D.text, marginBottom:14, display:'flex', justifyContent:'space-between' }}>
                  <span>📈 Test Score Trend</span>
                  <span style={{ fontSize:11, color:D.text3 }}>last {Math.min(8,tests.length)} tests</span>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:80 }}>
                  {tests.slice(0,8).reverse().map((t,i) => {
                    const pct = Math.round((t.score/t.total)*100);
                    const c   = pct>=70?D.green:pct>=50?D.yellow:D.red;
                    return (
                      <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                        <div style={{ fontSize:9, fontWeight:800, color:c }}>{pct}%</div>
                        <div style={{ width:'100%', height:`${Math.max(8,pct*0.7)}px`, borderRadius:6, background:`linear-gradient(180deg,${c},${c}80)`, boxShadow:`0 0 8px ${c}60` }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display:'flex', gap:12, marginTop:12 }}>
                  {[
                    { label:'Best',   val:`${Math.max(...tests.map(t=>Math.round((t.score/t.total)*100)))}%`, c:D.green },
                    { label:'Avg',    val:`${avgTestScore}%`, c:D.primary },
                    { label:'Latest', val:`${Math.round((tests[0].score/tests[0].total)*100)}%`, c:D.purple },
                  ].map(({label,val,c}) => (
                    <div key={label} style={{ flex:1, textAlign:'center', background:'rgba(255,255,255,.04)', borderRadius:10, padding:'8px 4px', border:`1px solid ${D.border}` }}>
                      <div style={{ fontWeight:900, fontSize:18, color:c }}>{val}</div>
                      <div style={{ fontSize:9, color:D.text3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subject Accuracy */}
            {subjBreakdown.length > 0 && (
              <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:16, marginBottom:12, backdropFilter:'blur(12px)' }}>
                <div style={{ fontWeight:700, fontSize:13, color:D.text, marginBottom:14 }}>🎯 Subject Performance</div>
                {subjBreakdown.slice(0,4).map(({subj,total,acc}) => (
                  <MiniBar key={subj} label={subj} value={acc} max={100} color={acc>=70?D.green:acc>=50?D.yellow:D.red} />
                ))}
              </div>
            )}

            {/* Activity Heatmap */}
            <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:16, backdropFilter:'blur(12px)' }}>
              <div style={{ fontWeight:700, fontSize:13, color:D.text, marginBottom:12 }}>📅 Activity Heatmap (52 days)</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {Array.from({length:52},(_,i) => {
                  const d = new Date(); d.setDate(d.getDate()-(51-i));
                  const str    = d.toISOString().split('T')[0];
                  const isToday = str===today;
                  const active  = streak.days?.includes(str);
                  return (
                    <div key={str} title={str} style={{ width:14, height:14, borderRadius:3, background: isToday ? D.primary : active ? D.green : 'rgba(255,255,255,0.06)', border: isToday ? `1px solid ${D.primary}` : '1px solid transparent', boxShadow: active ? `0 0 4px ${D.green}60` : 'none', transition:'all .2s' }} />
                  );
                })}
              </div>
              <div style={{ display:'flex', gap:16, marginTop:12, fontSize:11, color:D.text3 }}>
                <span>🔥 Streak: <strong style={{ color:D.yellow }}>{streak.current}d</strong></span>
                <span>🏆 Best: <strong style={{ color:D.green }}>{streak.best}d</strong></span>
                <span>📚 Total: <strong style={{ color:D.primary }}>{stats.total}Qs</strong></span>
              </div>
            </div>
          </>
        )}

        {/* ════════════════ USERS TAB ════════════════ */}
        {tab === 'users' && (
          <>
            {/* Summary Chips */}
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
              {[
                {val:totalUsers,  label:'Total',  c:D.primary,  bg:'rgba(59,130,246,.15)'},
                {val:todayActive, label:'Today',  c:D.green,   bg:'rgba(16,185,129,.15)'},
                {val:googleUsers, label:'Google', c:'#60A5FA', bg:'rgba(96,165,250,.15)'},
                {val:guestUsers,  label:'Guest',  c:D.purple,  bg:'rgba(139,92,246,.15)'},
                {val:newThisWeek, label:'New 7d', c:D.yellow,  bg:'rgba(245,158,11,.15)'},
              ].map(({val,label,c,bg}) => (
                <div key={label} style={{ background:bg, border:`1px solid ${c}30`, borderRadius:20, padding:'6px 14px', textAlign:'center' }}>
                  <span style={{ fontWeight:900, fontSize:18, color:c }}>{loading?'…':val}</span>
                  <span style={{ fontSize:10, color:D.text3, fontWeight:700, marginLeft:5, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Search */}
            <input type="search" value={userSearch} onChange={e => setUserSearch(e.target.value)}
              placeholder="🔍 Search name, email, IP…"
              style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:`1px solid ${D.border}`, background:'rgba(255,255,255,.05)', color:D.text, fontSize:13, outline:'none', marginBottom:12, boxSizing:'border-box' }}
            />

            {/* Visitor Cards */}
            {loading && (
              <div style={{ textAlign:'center', padding:'40px 0', color:D.text3, fontSize:13 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>
                Connecting to Firestore real-time…
              </div>
            )}
            {!loading && filteredUsers.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 0', color:D.text3, fontSize:13 }}>No visitors yet</div>
            )}
            {filteredUsers.map((u, i) => {
              const lastSeen  = (u.lastSeen  as any)?.toDate?.()?.toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) ?? 'Never';
              const firstSeen = (u.firstSeen as any)?.toDate?.()?.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) ?? '?';
              const isGoogle  = u.type === 'google';
              return (
                <div key={u.vid} style={{ background:D.card, border:`1px solid ${u.todayActive ? D.green+'40' : D.border}`, borderRadius:16, padding:14, marginBottom:10, backdropFilter:'blur(12px)', position:'relative', overflow:'hidden' }}>
                  {u.todayActive && <div style={{ position:'absolute', top:0, right:0, width:3, height:'100%', background:`linear-gradient(180deg,${D.green},transparent)` }} />}

                  {/* Header row */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    {u.avatar
                      ? <img src={u.avatar} style={{ width:44, height:44, borderRadius:'50%', border:`2px solid ${u.todayActive?D.green:isGoogle?D.primary:D.purple}`, flexShrink:0 }} alt="" />
                      : <div style={{ width:44, height:44, borderRadius:'50%', background:isGoogle?`linear-gradient(135deg,#1D4ED8,#06B6D4)`:`linear-gradient(135deg,#7C3AED,#EC4899)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:18, flexShrink:0 }}>{u.name[0]?.toUpperCase()}</div>
                    }
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                        <span style={{ fontWeight:800, fontSize:14, color:D.text }}>{u.name}</span>
                        {u.todayActive && <span style={{ fontSize:9, background:'rgba(16,185,129,.2)', color:D.green, borderRadius:20, padding:'2px 8px', fontWeight:800, border:`1px solid ${D.green}40` }}>● LIVE</span>}
                        <span style={{ fontSize:9, background:isGoogle?'rgba(59,130,246,.2)':'rgba(139,92,246,.2)', color:isGoogle?'#93C5FD':D.purple, borderRadius:20, padding:'2px 8px', fontWeight:800 }}>{isGoogle?'🔵 Google':'👤 Guest'}</span>
                        {u.email===ADMIN_EMAIL && <span style={{ fontSize:9, background:'rgba(245,158,11,.2)', color:D.yellow, borderRadius:20, padding:'2px 8px', fontWeight:800 }}>🛡️ Admin</span>}
                      </div>
                      <div style={{ fontSize:11, color:D.text3, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</div>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 12px', fontSize:11, background:'rgba(255,255,255,.03)', borderRadius:10, padding:'10px 12px', border:`1px solid ${D.border}` }}>
                    <div style={{ color:D.text3 }}>🌐 IP: <strong style={{ color:D.text }}>{u.ip||'?'}</strong></div>
                    <div style={{ color:D.text3 }}>📍 {u.city||'?'}, {u.country||'?'}</div>
                    <div style={{ color:D.text3 }}>📱 {u.device||'?'} · {u.os||'?'}</div>
                    <div style={{ color:D.text3 }}>🔭 {u.browser||'?'}</div>
                    <div style={{ color:D.text3 }}>📅 First: <strong style={{ color:D.text2 }}>{firstSeen}</strong></div>
                    <div style={{ color:D.text3 }}>⏰ Last: <strong style={{ color:D.text2 }}>{lastSeen}</strong></div>
                    <div style={{ color:D.text3 }}>🔄 Sessions: <strong style={{ color:D.yellow }}>{u.sessionCount||1}</strong></div>
                    <div style={{ color:D.text3 }}>🖥 {u.screen||'?'}</div>
                  </div>

                  {/* Visitor ID */}
                  <div style={{ marginTop:8, fontSize:9, color:D.text3, fontFamily:'monospace', background:'rgba(255,255,255,.03)', borderRadius:6, padding:'4px 8px', border:`1px solid ${D.border}`, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    VID: {u.vid}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ════════════════ ANALYTICS TAB ════════════════ */}
        {tab === 'analytics' && (
          <>
            {/* Device Distribution */}
            <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:16, marginBottom:12, backdropFilter:'blur(12px)' }}>
              <div style={{ fontWeight:700, fontSize:13, color:D.text, marginBottom:14 }}>📱 Device Types</div>
              {deviceDist.length===0 ? <div style={{ color:D.text3, fontSize:13 }}>No data yet</div> :
                deviceDist.map(([d,c]) => <MiniBar key={d} label={d.charAt(0).toUpperCase()+d.slice(1)} value={c} max={totalUsers} color={D.primary} />)
              }
            </div>

            {/* OS Distribution */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:14, backdropFilter:'blur(12px)' }}>
                <div style={{ fontWeight:700, fontSize:12, color:D.text, marginBottom:12 }}>💻 OS</div>
                {osDist.slice(0,5).map(([os,c]) => (
                  <div key={os} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${D.border}`, fontSize:11 }}>
                    <span style={{ color:D.text2 }}>{os}</span>
                    <strong style={{ color:D.green }}>{c}</strong>
                  </div>
                ))}
              </div>
              <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:14, backdropFilter:'blur(12px)' }}>
                <div style={{ fontWeight:700, fontSize:12, color:D.text, marginBottom:12 }}>🔭 Browser</div>
                {browserDist.slice(0,5).map(([b,c]) => (
                  <div key={b} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${D.border}`, fontSize:11 }}>
                    <span style={{ color:D.text2 }}>{b}</span>
                    <strong style={{ color:D.purple }}>{c}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Country */}
            <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:16, marginBottom:12, backdropFilter:'blur(12px)' }}>
              <div style={{ fontWeight:700, fontSize:13, color:D.text, marginBottom:14 }}>🌍 Top Countries</div>
              {countryDist.slice(0,6).map(([country,c]) => (
                <MiniBar key={country} label={country} value={c} max={totalUsers} color={D.yellow} />
              ))}
            </div>

            {/* Engagement */}
            <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:16, backdropFilter:'blur(12px)' }}>
              <div style={{ fontWeight:700, fontSize:13, color:D.text, marginBottom:14 }}>📊 Engagement</div>
              {[
                { label:'Avg sessions/user', val: totalUsers>0?(visitors.reduce((s,u)=>s+u.sessionCount,0)/totalUsers).toFixed(1):'—', c:D.primary },
                { label:'Daily active rate',  val: totalUsers>0?`${Math.round((todayActive/totalUsers)*100)}%`:'—', c:D.green },
                { label:'Google vs Guest',    val: totalUsers>0?`${Math.round((googleUsers/totalUsers)*100)}%G`:'—', c:'#60A5FA' },
                { label:'New user rate (7d)', val: totalUsers>0?`${Math.round((newThisWeek/totalUsers)*100)}%`:'—', c:D.yellow },
              ].map(({label,val,c}) => (
                <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${D.border}` }}>
                  <span style={{ fontSize:12, color:D.text2 }}>{label}</span>
                  <strong style={{ fontSize:14, color:c }}>{val}</strong>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ════════════════ CONTENT TAB ════════════════ */}
        {tab === 'content' && (
          <>
            <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:16, marginBottom:12, backdropFilter:'blur(12px)' }}>
              <div style={{ fontWeight:700, fontSize:13, color:D.text, marginBottom:14 }}>📦 Database</div>
              {[
                {label:'Total PYQ Questions', val:'2,499', icon:'📚', c:D.primary},
                {label:'Kannada Translation', val:'100%',  icon:'🇮🇳', c:D.green},
                {label:'Years Covered',       val:'2014–2024', icon:'📅', c:D.purple},
                {label:'Subjects',            val:'4',     icon:'🔬', c:D.yellow},
                {label:'Topics',              val:'80+',   icon:'📖', c:'#F97316'},
                {label:'Mock Test Types',     val:'5',     icon:'📝', c:D.pink},
              ].map(({label,val,icon,c}) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:`1px solid ${D.border}` }}>
                  <span style={{ fontSize:18 }}>{icon}</span>
                  <span style={{ flex:1, fontSize:12, color:D.text2 }}>{label}</span>
                  <strong style={{ color:c, fontSize:13 }}>{val}</strong>
                </div>
              ))}
            </div>
            <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:16, backdropFilter:'blur(12px)' }}>
              <div style={{ fontWeight:700, fontSize:13, color:D.text, marginBottom:14 }}>🛠 Tech Stack</div>
              {[
                {label:'Framework',  val:'React 18 + Vite + PWA'},
                {label:'Database',   val:'Firestore (kps-pc-70582)'},
                {label:'Auth',       val:'Google Sign-In (GIS)'},
                {label:'Hosting',    val:'Vercel Edge Network'},
                {label:'Analytics',  val:'Vercel Analytics + Firestore'},
                {label:'Tracking',   val:'IP · Device · OS · Browser'},
                {label:'Developer',  val:'Ananda Valmiki'},
              ].map(({label,val}) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${D.border}`, fontSize:12 }}>
                  <span style={{ color:D.text3 }}>{label}</span>
                  <strong style={{ color:D.text2 }}>{val}</strong>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ════════════════ CONFIG TAB ════════════════ */}
        {tab === 'config' && (
          <>
            <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:16, marginBottom:12, backdropFilter:'blur(12px)' }}>
              <div style={{ fontWeight:700, fontSize:13, color:D.text, marginBottom:14 }}>⚙️ Admin Config</div>
              {[
                {label:'Admin Email',    val:ADMIN_EMAIL,     c:D.primary},
                {label:'Admin PIN',      val:'2024ksp',       c:D.yellow},
                {label:'Firestore DB',   val:'kps-pc-70582',  c:D.green},
                {label:'Collection',     val:'ksp_visitors',  c:D.purple},
                {label:'Session Status', val:'🟢 Active',     c:D.green},
              ].map(({label,val,c}) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${D.border}`, fontSize:12 }}>
                  <span style={{ color:D.text3 }}>{label}</span>
                  <strong style={{ color:c, fontFamily:label.includes('PIN')||label.includes('DB')?'monospace':'inherit' }}>{val}</strong>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button onClick={() => { const d=JSON.stringify({...localStorage}); const a=document.createElement('a'); a.href='data:text/json,'+encodeURIComponent(d); a.download='ksp_admin_export.json'; a.click(); }}
                style={{ padding:'13px', borderRadius:12, border:`1px solid ${D.border}`, background:'rgba(255,255,255,.06)', color:D.text, fontWeight:700, fontSize:13, cursor:'pointer' }}>
                📥 Export My Data (JSON)
              </button>
              <button onClick={() => { if(confirm('⚠️ DELETE all local data?')) { localStorage.clear(); window.location.reload(); } }}
                style={{ padding:'13px', borderRadius:12, border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.1)', color:'#FCA5A5', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                🗑️ Reset Local Data
              </button>
              <button onClick={() => { sessionStorage.removeItem('ksp_admin'); setUnlocked(false); }}
                style={{ padding:'13px', borderRadius:12, border:`1px solid ${D.border}`, background:'rgba(255,255,255,.04)', color:D.text3, fontWeight:700, fontSize:13, cursor:'pointer' }}>
                🔒 Lock Admin Panel
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// MAIN PROFILE VIEW
// ─────────────────────────────────────────────────────
interface Props { onLogout: () => void; }

export default function ProfileView({ onLogout }: Props) {
  const profile  = useMemo(() => loadProfile(), []);
  const stats    = useMemo(() => getOverallStats(), []);
  const tests    = useMemo(() => getAllTests(), []);
  const streak   = useMemo(() => getStreak(), []);

  const isAdmin = profile?.email === ADMIN_EMAIL;

  const [showAdmin,      setShowAdmin]      = useState(false);
  const [showLogoutConf, setShowLogoutConf] = useState(false);
  const [tab,            setTab]            = useState<'settings' | 'pattern' | 'progress'>('settings');

  // Profile filled / collapsed state
  const [profileFilled, setProfileFilled]   = useState(() => localStorage.getItem(SETTINGS_FILLED_KEY) === '1');
  const [editMode,      setEditMode]         = useState(!localStorage.getItem(SETTINGS_FILLED_KEY));

  const savedSettings = useMemo(() => getSettings(), []);
  const [cat,    setCat]    = useState<UserSettings['category']>(savedSettings.category);
  const [region, setRegion] = useState<UserSettings['region']>(savedSettings.region);
  const [gender, setGender] = useState<UserSettings['gender']>(savedSettings.gender);
  const [saved,  setSaved]  = useState(false);

  const cutoffInfo = useMemo(() => getLatestCutoff({ category: cat, region, gender }), [cat, region, gender]);
  const trend      = useMemo(() => getCutoffTrend({ category: cat, region, gender }),  [cat, region, gender]);
  const physReqs   = useMemo(() => getPhysicalRequirements({ category: cat, region, gender }), [cat, region, gender]);

  const saveUserSettings = () => {
    saveSettings({ category: cat, region, gender });
    localStorage.setItem(SETTINGS_FILLED_KEY, '1');
    setProfileFilled(true);
    setEditMode(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const resetProfile = () => {
    localStorage.removeItem(SETTINGS_FILLED_KEY);
    setProfileFilled(false);
    setEditMode(true);
  };

  const installPWA = async () => {
    if (!deferredInstallPrompt) {
      alert('To install:\n• Android Chrome: ⋮ → Add to Home Screen\n• iPhone Safari: Share → Add to Home Screen');
      return;
    }
    (deferredInstallPrompt as any).prompt();
    await (deferredInstallPrompt as any).userChoice;
    deferredInstallPrompt = null;
  };

  if (showAdmin && isAdmin) {
    return <AdminDashboard onBack={() => setShowAdmin(false)} profile={profile} />;
  }

  return (
    <>
      <div className="top-bar">
        <span className="top-bar-title">👤 Profile</span>
        {isAdmin && (
          <button
            style={{ background: 'linear-gradient(135deg,#0D47A1,#1565C0)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(21,101,192,.4)' }}
            onClick={() => setShowAdmin(true)}>
            🛡️ Admin Dashboard
          </button>
        )}
      </div>

      <div className="page page-gap">

        {/* ── User card — shows Google name + avatar ── */}
        <div className="card-primary" style={{ borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -15, top: -15, fontSize: 80, opacity: 0.07 }}>🚔</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {profile?.avatar
              ? <img src={profile.avatar} style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid rgba(255,255,255,.5)', boxShadow: '0 4px 12px rgba(0,0,0,.25)', flexShrink: 0 }} alt="" />
              : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900, flexShrink: 0, color: '#fff' }}>
                  {profile?.name?.[0]?.toUpperCase() ?? '👤'}
                </div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Google account name — prominently shown */}
              <div style={{ fontWeight: 900, fontSize: 22, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.name ?? 'Guest User'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, color: '#fff', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.email === 'guest@local' ? '🔓 Guest mode — sign in for sync' : profile?.email ?? ''}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {isAdmin && (
                  <span style={{ background: 'rgba(255,255,255,.25)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#fff', fontWeight: 800 }}>🛡️ Admin</span>
                )}
                <span style={{ background: 'rgba(255,255,255,.15)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#fff', fontWeight: 600 }}>
                  {savedSettings.category.replace(/_/g, ' ')} · {savedSettings.region}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 16 }}>
            {[
              { val: stats.total,           label: 'Questions' },
              { val: `${stats.accuracy}%`,   label: 'Accuracy' },
              { val: `${streak.current}🔥`,  label: 'Streak' },
            ].map(({ val, label }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,.15)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: '#fff', lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', marginTop: 3, fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="inner-tabs">
          {(['settings', 'pattern', 'progress'] as const).map(t => (
            <button key={t} className={`inner-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t === 'settings' ? '⚙️ Settings' : t === 'pattern' ? '📊 Pattern' : '📈 Progress'}
            </button>
          ))}
        </div>

        {/* ══ SETTINGS TAB ══ */}
        {tab === 'settings' && (
          <>
            {/* ── Profile filled → collapsed summary card ── */}
            {profileFilled && !editMode ? (
              <div className="card" style={{ border: '2px solid var(--c-primary)', background: 'var(--c-primary-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 32 }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--c-primary)' }}>Exam Profile Saved</div>
                    <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 2 }}>
                      {cat.replace(/_/g, ' ')} · {region} · {gender === 'M' ? 'Male' : 'Female'}
                    </div>
                  </div>
                  <button onClick={() => setEditMode(true)}
                    style={{ background: 'none', border: '1.5px solid var(--c-primary)', borderRadius: 8, padding: '6px 12px', color: 'var(--c-primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Edit
                  </button>
                </div>
                {/* Cutoff summary */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {[
                    { label: 'Cutoff',      val: cutoffInfo.cutoff,   color: '#DC2626', bg: '#FEF2F2' },
                    { label: 'Safe',        val: cutoffInfo.target,   color: '#D97706', bg: '#FFFBEB' },
                    { label: 'Comfortable', val: cutoffInfo.safeZone, color: '#16A34A', bg: '#F0FDF4' },
                  ].map(({ label, val, color, bg }) => (
                    <div key={label} style={{ flex: 1, background: bg, borderRadius: 8, padding: '8px 4px', textAlign: 'center', border: `1px solid ${color}30` }}>
                      <div style={{ fontWeight: 900, fontSize: 20, color, lineHeight: 1 }}>{val}</div>
                      <div style={{ fontSize: 10, color, fontWeight: 700, marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
                <button onClick={resetProfile}
                  style={{ marginTop: 10, width: '100%', background: 'none', border: '1px dashed var(--c-border)', borderRadius: 8, padding: '7px', color: 'var(--c-text-3)', fontSize: 12, cursor: 'pointer' }}>
                  🔄 Reset Exam Profile
                </button>
              </div>
            ) : (
              /* ── Edit form ── */
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Exam Profile</div>
                  {profileFilled && (
                    <button onClick={() => setEditMode(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--c-text-3)', fontSize: 12, cursor: 'pointer' }}>✕ Cancel</button>
                  )}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
                  <select value={cat} onChange={e => setCat(e.target.value as UserSettings['category'])} style={{ width: '100%' }}>
                    {(['General', 'OBC_2A', 'OBC_2B', 'OBC_3A', 'OBC_3B', 'SC', 'ST', 'CAT01'] as UserSettings['category'][]).map(c => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Region</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['NKK', 'KK'] as UserSettings['region'][]).map(r => (
                      <button key={r} onClick={() => setRegion(r)}
                        style={{ flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, transition: 'var(--t-base)',
                          border: `2px solid ${region === r ? 'var(--c-primary)' : 'var(--c-border)'}`,
                          background: region === r ? 'var(--c-primary-light)' : 'none',
                          color: region === r ? 'var(--c-primary)' : 'var(--c-text-2)',
                        }}>
                        {r === 'NKK' ? '🌆 NKK' : '🌾 KK'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([['M', 'Male'], ['F', 'Female']] as [UserSettings['gender'], string][]).map(([g, l]) => (
                      <button key={g} onClick={() => setGender(g)}
                        style={{ flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, transition: 'var(--t-base)',
                          border: `2px solid ${gender === g ? 'var(--c-primary)' : 'var(--c-border)'}`,
                          background: gender === g ? 'var(--c-primary-light)' : 'none',
                          color: gender === g ? 'var(--c-primary)' : 'var(--c-text-2)',
                        }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live preview */}
                <div style={{ background: 'var(--c-surface-2)', borderRadius: 10, padding: 12, marginBottom: 14, border: '1px solid var(--c-border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', marginBottom: 8, textTransform: 'uppercase' }}>📊 Target Preview</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { label: 'Cutoff',      val: cutoffInfo.cutoff,   color: '#DC2626', bg: '#FEF2F2' },
                      { label: 'Safe',        val: cutoffInfo.target,   color: '#D97706', bg: '#FFFBEB' },
                      { label: 'Comfortable', val: cutoffInfo.safeZone, color: '#16A34A', bg: '#F0FDF4' },
                    ].map(({ label, val, color, bg }) => (
                      <div key={label} style={{ flex: 1, background: bg, borderRadius: 8, padding: '8px 6px', textAlign: 'center', border: `1px solid ${color}30` }}>
                        <div style={{ fontWeight: 900, fontSize: 22, color, lineHeight: 1 }}>{val}</div>
                        <div style={{ fontSize: 10, color, fontWeight: 700, marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {trend.map(({ year, cutoff }) => (
                      <span key={year} style={{ fontSize: 11, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>
                        {year}: {cutoff}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="btn btn-primary btn-block" onClick={saveUserSettings}>
                  {saved ? '✅ Profile Saved!' : '💾 Save & Continue →'}
                </button>
              </div>
            )}

            {/* Physical Requirements */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg,#1B5E20,#2E7D32)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>🏃</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>Physical Requirements</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>{cat.replace(/_/g, ' ')} · {region} · {gender === 'M' ? 'Male' : 'Female'}</div>
                </div>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: gender === 'M' ? 'repeat(3,1fr)' : '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 26, marginBottom: 4 }}>📏</div>
                    <div style={{ fontWeight: 900, fontSize: 22, color: '#16A34A' }}>{physReqs.heightCm}</div>
                    <div style={{ fontSize: 10, color: '#15803D', fontWeight: 700, marginTop: 2 }}>cm HEIGHT</div>
                  </div>
                  {gender === 'M' && physReqs.chestNormal && (
                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 26, marginBottom: 4 }}>👕</div>
                      <div style={{ fontWeight: 900, fontSize: 17, color: '#1565C0' }}>{physReqs.chestNormal}–{physReqs.chestExpanded}</div>
                      <div style={{ fontSize: 10, color: '#1D4ED8', fontWeight: 700, marginTop: 2 }}>cm CHEST</div>
                      <div style={{ fontSize: 9, color: 'var(--c-text-3)', marginTop: 1 }}>Normal–Expanded</div>
                    </div>
                  )}
                  {gender === 'F' && physReqs.weightKg && (
                    <div style={{ background: '#FDF4FF', border: '1px solid #E9D5FF', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 26, marginBottom: 4 }}>⚖️</div>
                      <div style={{ fontWeight: 900, fontSize: 22, color: '#7C3AED' }}>{physReqs.weightKg}+</div>
                      <div style={{ fontSize: 10, color: '#6D28D9', fontWeight: 700, marginTop: 2 }}>kg WEIGHT</div>
                    </div>
                  )}
                  <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 26, marginBottom: 4 }}>👁️</div>
                    <div style={{ fontWeight: 700, fontSize: 11, color: '#C2410C' }}>6/6 & 6/9</div>
                    <div style={{ fontSize: 10, color: '#EA580C', fontWeight: 700, marginTop: 2 }}>EYESIGHT</div>
                    <div style={{ fontSize: 9, color: 'var(--c-text-3)' }}>No glasses</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', textTransform: 'uppercase', marginBottom: 8 }}>PET Events</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { icon: '🏃', label: 'Running',   val: physReqs.run },
                    { icon: '🦘', label: 'Long Jump', val: physReqs.longJump },
                    { icon: '⚾', label: 'Shot Put',  val: physReqs.shotPut },
                  ].map(({ icon, label, val }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--c-surface-2)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--c-border)' }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginTop: 2 }}>{val}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {physReqs.notes.map((note, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', marginTop: i === 0 ? 10 : 0 }}>
                    <span style={{ color: '#D97706', flexShrink: 0, fontWeight: 700 }}>⚠</span>
                    <div style={{ fontSize: 12, color: 'var(--c-text-2)', lineHeight: 1.5 }}>{note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* App Install */}
            <div className="card" style={{ background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border: '1px solid #BFDBFE' }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#1E3A8A' }}>📲 Install App</div>
              <div style={{ fontSize: 13, color: '#1D4ED8', marginBottom: 12 }}>Works fully offline after install!</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={installPWA}>📥 Install</button>
                <a href="https://karnataka-pc-app.vercel.app" target="_blank" rel="noopener noreferrer"
                  className="btn btn-outline" style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🌐 Website</a>
              </div>
              <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 8 }}>Chrome: ⋮ → Add to Home Screen · Safari: Share → Add to Home Screen</div>
            </div>

            <button className="btn btn-block btn-danger" onClick={() => setShowLogoutConf(true)}>🚪 Logout</button>

            {/* Developer credit */}
            <div style={{ textAlign: 'center', padding: '16px 0 8px', fontSize: 12, color: 'var(--c-text-4)', lineHeight: 2 }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>🚔</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--c-text-3)' }}>KSP Tayyari</div>
              <div>Developed by <strong style={{ color: 'var(--c-primary)', fontSize: 13 }}>Ananda Valmiki</strong></div>
              <div style={{ fontSize: 11 }}>2,499 PYQs · EN + ಕನ್ನಡ · Offline PWA · v2.0</div>
            </div>
          </>
        )}

        {/* ══ PATTERN TAB ══ */}
        {tab === 'pattern' && (
          <>
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>📊 KSP CPC Exam Pattern</div>
              <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginBottom: 16 }}>100 marks · 90 minutes · −0.25 negative marking</div>
              {EXAM_PATTERN.map(({ subject, weight, color, emoji, note }) => (
                <div key={subject} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{emoji}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{subject}</div>
                        <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{note}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                      <div style={{ fontWeight: 900, fontSize: 24, color, lineHeight: 1 }}>{weight}</div>
                      <div style={{ fontSize: 10, color: 'var(--c-text-4)', fontWeight: 600 }}>marks</div>
                    </div>
                  </div>
                  <div className="progress-bar" style={{ height: 8 }}>
                    <div className="progress-fill" style={{ width: `${weight}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🎯 Your Cutoffs — {cat.replace(/_/g, ' ')} / {region} / {gender === 'M' ? 'Male' : 'Female'}</div>
              <table className="cutoff-table" style={{ width: '100%' }}>
                <thead><tr><th>Year</th><th>Cutoff</th><th>Safe Score</th></tr></thead>
                <tbody>
                  {trend.map(({ year, cutoff }) => (
                    <tr key={year}>
                      <td style={{ fontWeight: 700 }}>{year}</td>
                      <td style={{ color: 'var(--c-wrong)', fontWeight: 700 }}>{cutoff}</td>
                      <td style={{ color: 'var(--c-correct)', fontWeight: 700 }}>{cutoff + 5}+</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══ PROGRESS TAB ══ */}
        {tab === 'progress' && (
          <>
            <div className="stats-grid">
              {[
                { val: stats.total,           label: 'Qs Done',  color: 'var(--c-primary)' },
                { val: `${stats.accuracy}%`,   label: 'Accuracy', color: stats.accuracy >= 70 ? 'var(--c-correct)' : stats.accuracy >= 50 ? 'var(--c-warn)' : 'var(--c-wrong)' },
                { val: tests.length,           label: 'Tests',    color: '#7C3AED' },
                { val: `${streak.current}🔥`,  label: 'Streak',   color: '#EA580C' },
              ].map(({ val, label, color }) => (
                <div key={label} className="stat-card">
                  <div className="stat-value" style={{ color }}>{val}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Recent Tests</div>
              {tests.length === 0
                ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--c-text-3)', fontSize: 13 }}>No tests yet — take your first mock!</div>
                : tests.slice(0, 6).map((t, i) => {
                    const pct  = Math.round((t.score / t.total) * 100);
                    const date = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--c-border)' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14,
                          background: pct >= 70 ? '#DCFCE7' : pct >= 50 ? '#FFFBEB' : '#FEF2F2',
                          color:      pct >= 70 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626',
                        }}>{t.score.toFixed(0)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{date} · {pct}%</div>
                        </div>
                        <span style={{ fontSize: 16 }}>{pct >= cutoffInfo.cutoff ? '✅' : '❌'}</span>
                      </div>
                    );
                  })
              }
            </div>
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🔥 {streak.current} Day Streak · Best: {streak.best}</div>
              <div className="heatmap-grid">
                {Array.from({ length: 52 }, (_, i) => {
                  const d = new Date(); d.setDate(d.getDate() - (51 - i));
                  const str = d.toISOString().split('T')[0];
                  const today = str === new Date().toISOString().split('T')[0];
                  const active = streak.days?.includes(str);
                  return <div key={str} className={`heatmap-cell${active ? ' active' : ''}${today ? ' today' : ''}`} title={str} />;
                })}
              </div>
            </div>
          </>
        )}

      </div>

      {/* Logout confirm */}
      {showLogoutConf && (
        <div className="bottom-sheet-overlay" onClick={() => setShowLogoutConf(false)}>
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 540 }}>
            <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
              <div className="sheet-handle" />
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Logout?</div>
              <div style={{ fontSize: 14, color: 'var(--c-text-2)', marginBottom: 20 }}>
                Study progress is saved locally and will remain. Only your Google account info will be cleared.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowLogoutConf(false)}>Cancel</button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={onLogout}>🚪 Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
