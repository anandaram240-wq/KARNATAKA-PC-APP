// src/components/ProfileView.tsx
// Profile, Logout, App Download, Pattern Analysis, Admin Access
import React, { useState, useEffect } from 'react';
import { useT } from '../lib/i18n';
import { getOverallStats, getAllTests, getStreak, getSettings, saveSettings } from '../lib/storage';
import type { UserSettings } from '../lib/storage';

interface UserProfile { name: string; email: string; avatar: string; }
const PROFILE_KEY  = 'ksp_user_profile';
const ADMIN_EMAILS = ['anandakiccha240@gmail.com'];

function loadProfile(): UserProfile | null {
  try { const s = localStorage.getItem(PROFILE_KEY); return s ? JSON.parse(s) : null; }
  catch { return null; }
}

// ── PWA Install Hook ──────────────────────────────────
let deferredPrompt: Event | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

// ── Pattern Analysis Data ─────────────────────────────
const EXAM_PATTERN = [
  { subject: 'General Awareness', weight: 70, color: '#D97706', emoji: '🇮🇳', note: '70 Qs — History, Polity, Geography, Current Affairs, KA Specific' },
  { subject: 'General Science',   weight: 21, color: '#16A34A', emoji: '🔬', note: '21 Qs — Physics, Chemistry, Biology basics' },
  { subject: 'Reasoning',         weight: 7,  color: '#7C3AED', emoji: '🧩', note: '7 Qs — Series, Analogies, Directions, Coding' },
  { subject: 'Mathematics',       weight: 2,  color: '#0EA5E9', emoji: '🔢', note: '2 Qs — Basic Arithmetic, Averages' },
];

const CUTOFF_CATS = [
  { cat: 'General (M)', marks: 75 }, { cat: 'General (F)', marks: 72 },
  { cat: 'OBC 2A (M)',  marks: 68 }, { cat: 'OBC 2A (F)',  marks: 65 },
  { cat: 'SC (M)',      marks: 60 }, { cat: 'SC (F)',       marks: 57 },
  { cat: 'ST (M)',      marks: 55 }, { cat: 'ST (F)',       marks: 52 },
];

// ── Admin Panel ───────────────────────────────────────
function AdminPanel({ onBack }: { onBack: () => void }) {
  const [pin,     setPin]     = useState('');
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('ksp_admin') === '1');
  const [tab,     setTab]     = useState<'users'|'data'|'settings'>('users');

  const stats   = getOverallStats();
  const tests   = getAllTests();
  const profile = loadProfile();

  const tryUnlock = () => {
    if (pin === '2024ksp' || pin === 'admin123') {
      sessionStorage.setItem('ksp_admin', '1');
      setUnlocked(true);
    } else {
      alert('Wrong PIN');
      setPin('');
    }
  };

  if (!unlocked) {
    return (
      <div className="page page-gap">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button onClick={onBack} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--c-primary)',fontWeight:700,fontSize:14 }}>← Back</button>
          <div style={{ fontWeight:800,fontSize:18 }}>🔐 Admin Access</div>
        </div>
        <div className="card" style={{ textAlign:'center',padding:32 }}>
          <div style={{ fontSize:48,marginBottom:12 }}>🛡️</div>
          <div style={{ fontWeight:700,fontSize:16,marginBottom:4 }}>Admin Login</div>
          <div style={{ fontSize:13,color:'var(--c-text-3)',marginBottom:20 }}>Enter admin PIN to continue</div>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tryUnlock()}
            placeholder="Enter PIN"
            style={{ width:'100%',padding:'12px 16px',borderRadius:10,border:'1.5px solid var(--c-border)',fontSize:16,textAlign:'center',marginBottom:12,outline:'none',letterSpacing:4 }}
            autoFocus
          />
          <button className="btn btn-primary btn-block" onClick={tryUnlock}>Unlock →</button>
          <div style={{ fontSize:11,color:'var(--c-text-4)',marginTop:12 }}>Admin: anandaram240@gmail.com only</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-gap">
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:4 }}>
        <button onClick={onBack} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--c-primary)',fontWeight:700,fontSize:14 }}>← Back</button>
        <div style={{ fontWeight:800,fontSize:18 }}>🛡️ Admin Panel</div>
        <span className="badge badge-new" style={{ marginLeft:'auto' }}>ADMIN</span>
      </div>

      <div className="inner-tabs">
        {(['users','data','settings'] as const).map(t => (
          <button key={t} className={`inner-tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
            {t === 'users' ? '👥 Users' : t === 'data' ? '📊 Data' : '⚙️ Settings'}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontWeight:700,fontSize:14,marginBottom:10 }}>Logged In User</div>
            {profile ? (
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                {profile.avatar
                  ? <img src={profile.avatar} style={{ width:48,height:48,borderRadius:'50%',border:'2px solid var(--c-primary)' }} alt="avatar"/>
                  : <div style={{ width:48,height:48,borderRadius:'50%',background:'var(--c-primary)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:20 }}>{profile.name[0]}</div>
                }
                <div>
                  <div style={{ fontWeight:700 }}>{profile.name}</div>
                  <div style={{ fontSize:12,color:'var(--c-text-3)' }}>{profile.email}</div>
                  <div style={{ fontSize:11,marginTop:2 }}>
                    {ADMIN_EMAILS.includes(profile.email)
                      ? <span style={{ color:'#16A34A',fontWeight:700 }}>✓ Admin</span>
                      : <span style={{ color:'var(--c-text-4)' }}>Student</span>}
                  </div>
                </div>
              </div>
            ) : <div style={{ color:'var(--c-text-3)' }}>Guest user</div>}
          </div>
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontWeight:700,fontSize:14,marginBottom:10 }}>User Activity</div>
            {[
              { label:'Questions Attempted', val: stats.total },
              { label:'Correct Answers',     val: stats.correct },
              { label:'Accuracy',            val: `${stats.accuracy}%` },
              { label:'Tests Completed',     val: tests.length },
            ].map(({ label, val }) => (
              <div key={label} style={{ display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--c-border)' }}>
                <span style={{ fontSize:13,color:'var(--c-text-2)' }}>{label}</span>
                <span style={{ fontWeight:700,fontSize:13 }}>{val}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'data' && (
        <>
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontWeight:700,fontSize:14,marginBottom:10 }}>App Data Stats</div>
            {[
              { label:'Total Questions', val:'2,499' },
              { label:'Years Covered',   val:'2014–2024' },
              { label:'Subjects',        val:'4' },
              { label:'Topics',          val:'80+' },
              { label:'With Kannada',    val:'2,499 (100%)' },
            ].map(({ label, val }) => (
              <div key={label} style={{ display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--c-border)' }}>
                <span style={{ fontSize:13,color:'var(--c-text-2)' }}>{label}</span>
                <span style={{ fontWeight:700,fontSize:13,color:'var(--c-primary)' }}>{val}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-danger btn-block" style={{ marginTop:4 }}
            onClick={() => { if(confirm('Reset ALL user data? This cannot be undone.')) { localStorage.clear(); window.location.reload(); } }}>
            🗑 Reset All User Data
          </button>
        </>
      )}

      {tab === 'settings' && (
        <div className="card" style={{ padding:14 }}>
          <div style={{ fontWeight:700,fontSize:14,marginBottom:10 }}>Admin Settings</div>
          <div style={{ fontSize:13,color:'var(--c-text-3)',marginBottom:16 }}>
            Admin PIN: <strong>2024ksp</strong><br/>
            To add admin emails, edit <code>ADMIN_EMAILS</code> in ProfileView.tsx
          </div>
          <button className="btn btn-ghost btn-block" onClick={() => { sessionStorage.removeItem('ksp_admin'); setUnlocked(false); }}>
            Lock Admin Panel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Profile View ─────────────────────────────────
interface Props { onLogout: () => void; }

export default function ProfileView({ onLogout }: Props) {
  const T        = useT();
  const profile  = loadProfile();
  const stats    = getOverallStats();
  const tests    = getAllTests();
  const streak   = getStreak();
  const settings = getSettings();
  const [pwaInstallable, setPwaInstallable] = useState(false);
  const [showAdmin,       setShowAdmin]      = useState(false);
  const [showLogoutConf,  setShowLogoutConf] = useState(false);
  const [tab,             setTab]            = useState<'profile'|'pattern'|'progress'>('profile');
  const [cat,             setCat]            = useState<UserSettings['category']>(settings.category);
  const [region,          setRegion]         = useState<UserSettings['region']>(settings.region);
  const [gender,          setGender]         = useState<UserSettings['gender']>(settings.gender);

  const isAdmin = profile && ADMIN_EMAILS.includes(profile.email);

  useEffect(() => {
    if (deferredPrompt) setPwaInstallable(true);
    window.addEventListener('beforeinstallprompt', () => setPwaInstallable(true));
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) {
      alert('To install: open in Chrome → tap ⋮ menu → "Add to Home Screen"');
      return;
    }
    (deferredPrompt as any).prompt();
    const { outcome } = await (deferredPrompt as any).userChoice;
    if (outcome === 'accepted') { deferredPrompt = null; setPwaInstallable(false); }
  };

  const saveUserSettings = () => {
    saveSettings({ category: cat, region, gender });
    alert(T('save') + '!');
  };

  if (showAdmin) return <AdminPanel onBack={() => setShowAdmin(false)} />;

  return (
    <>
      <div className="top-bar">
        <span className="top-bar-title">👤 Account</span>
        {isAdmin && (
          <button className="badge badge-high" style={{ cursor:'pointer',border:'none',padding:'4px 10px',fontSize:11 }}
            onClick={() => setShowAdmin(true)}>
            🛡 Admin
          </button>
        )}
      </div>

      <div className="page page-gap">

        {/* ── User card ── */}
        <div className="card-primary" style={{ borderRadius:16,padding:20,position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',right:-15,top:-15,fontSize:80,opacity:0.08 }}>🚔</div>
          <div style={{ display:'flex',alignItems:'center',gap:14 }}>
            {profile?.avatar
              ? <img src={profile.avatar} style={{ width:60,height:60,borderRadius:'50%',border:'3px solid rgba(255,255,255,.4)',boxShadow:'0 2px 8px rgba(0,0,0,.2)',flexShrink:0 }} alt={profile.name} />
              : <div style={{ width:60,height:60,borderRadius:'50%',background:'rgba(255,255,255,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:900,flexShrink:0 }}>
                  {profile?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
            }
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:800,fontSize:20,color:'#fff',lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                {profile?.name ?? 'Guest User'}
              </div>
              <div style={{ fontSize:12,opacity:.8,color:'#fff',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                {profile?.email ?? 'Not signed in'}
              </div>
              <div style={{ display:'flex',gap:8,marginTop:6,flexWrap:'wrap' }}>
                {isAdmin && <span style={{ background:'rgba(255,255,255,.2)',borderRadius:6,padding:'2px 8px',fontSize:11,color:'#fff',fontWeight:700 }}>🛡 Admin</span>}
                <span style={{ background:'rgba(255,255,255,.15)',borderRadius:6,padding:'2px 8px',fontSize:11,color:'#fff' }}>
                  {settings.category} · {settings.region}
                </span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:16 }}>
            {[
              { val: stats.total,      label:'Questions' },
              { val: `${stats.accuracy}%`, label:'Accuracy' },
              { val: `${streak.current}🔥`, label:'Streak' },
            ].map(({ val, label }) => (
              <div key={label} style={{ background:'rgba(255,255,255,.15)',borderRadius:10,padding:'10px 8px',textAlign:'center' }}>
                <div style={{ fontWeight:900,fontSize:18,color:'#fff',lineHeight:1 }}>{val}</div>
                <div style={{ fontSize:10,color:'rgba(255,255,255,.75)',marginTop:3,fontWeight:600 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="inner-tabs">
          {(['profile','pattern','progress'] as const).map(t => (
            <button key={t} className={`inner-tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
              {t==='profile' ? '⚙️ Settings' : t==='pattern' ? '📊 Pattern' : '📈 Progress'}
            </button>
          ))}
        </div>

        {/* ═══ SETTINGS TAB ═══ */}
        {tab === 'profile' && (
          <>
            {/* Profile settings */}
            <div className="card">
              <div style={{ fontWeight:700,fontSize:14,marginBottom:12 }}>Exam Profile</div>
              <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                <div>
                  <label style={{ fontSize:12,fontWeight:600,color:'var(--c-text-3)',display:'block',marginBottom:4 }}>CATEGORY</label>
                  <select value={cat} onChange={e => setCat(e.target.value as UserSettings['category'])}>
                    {(['General','OBC_2A','OBC_2B','OBC_3A','OBC_3B','SC','ST','CAT01'] as UserSettings['category'][]).map(c => (
                      <option key={c} value={c}>{c.replace(/_/g,' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12,fontWeight:600,color:'var(--c-text-3)',display:'block',marginBottom:4 }}>REGION</label>
                  <div style={{ display:'flex',gap:8 }}>
                    {(['NKK','KK'] as UserSettings['region'][]).map(r => (
                      <button key={r} onClick={() => setRegion(r)}
                        style={{ flex:1,padding:'10px 0',borderRadius:10,border:`2px solid ${region===r?'var(--c-primary)':'var(--c-border)'}`,background:region===r?'var(--c-primary-light)':'none',fontWeight:700,fontSize:14,cursor:'pointer',color:region===r?'var(--c-primary)':'var(--c-text-2)',transition:'var(--t-base)' }}>
                        {r === 'NKK' ? '🌆 NKK' : '🌾 KK (Hyderabad-K)'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:12,fontWeight:600,color:'var(--c-text-3)',display:'block',marginBottom:4 }}>GENDER</label>
                  <div style={{ display:'flex',gap:8 }}>
                    {([['M','Male'],['F','Female']] as [UserSettings['gender'],string][]).map(([g,l]) => (
                      <button key={g} onClick={() => setGender(g)}
                        style={{ flex:1,padding:'10px 0',borderRadius:10,border:`2px solid ${gender===g?'var(--c-primary)':'var(--c-border)'}`,background:gender===g?'var(--c-primary-light)':'none',fontWeight:700,fontSize:14,cursor:'pointer',color:gender===g?'var(--c-primary)':'var(--c-text-2)',transition:'var(--t-base)' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary btn-block" onClick={saveUserSettings}>Save Settings</button>
              </div>
            </div>

            {/* Download / Install */}
            <div className="card" style={{ background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)',border:'1px solid #BFDBFE' }}>
              <div style={{ fontWeight:700,fontSize:15,marginBottom:4,color:'#1E3A8A' }}>📲 Install App</div>
              <div style={{ fontSize:13,color:'#1D4ED8',marginBottom:12 }}>
                Install KSP Tayyari on your phone for offline use — no internet needed after install!
              </div>
              <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={installPWA}>
                  📥 Install on Android/iOS
                </button>
                <a
                  href="https://karnataka-pc-app.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  style={{ flex:1,textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}
                >
                  🌐 Open Website
                </a>
              </div>
              <div style={{ fontSize:12,color:'#3B82F6',marginTop:10 }}>
                <strong>Chrome:</strong> ⋮ menu → Add to Home Screen<br/>
                <strong>Safari:</strong> Share → Add to Home Screen
              </div>
            </div>

            {/* Admin access */}
            <button
              className="card card-hover"
              style={{ border:'1px solid var(--c-border)',cursor:'pointer',textAlign:'left',padding:14,width:'100%',background:'none',display:'flex',alignItems:'center',gap:12 }}
              onClick={() => setShowAdmin(true)}
            >
              <span style={{ fontSize:28 }}>🛡️</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700,fontSize:14 }}>Admin Panel</div>
                <div style={{ fontSize:12,color:'var(--c-text-3)',marginTop:1 }}>
                  {isAdmin ? '✅ You have admin access' : 'Requires admin PIN'}
                </div>
              </div>
              <svg style={{ width:16,color:'var(--c-text-4)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>

            {/* Logout */}
            <button
              className="btn btn-block"
              style={{ background:'var(--c-wrong-bg)',color:'var(--c-wrong)',border:'1.5px solid var(--c-wrong-border)',fontWeight:700 }}
              onClick={() => setShowLogoutConf(true)}
            >
              🚪 Logout
            </button>
          </>
        )}

        {/* ═══ PATTERN ANALYSIS TAB ═══ */}
        {tab === 'pattern' && (
          <>
            <div className="card">
              <div style={{ fontWeight:700,fontSize:15,marginBottom:4 }}>📊 KSP CPC Exam Pattern</div>
              <div style={{ fontSize:12,color:'var(--c-text-3)',marginBottom:16 }}>
                100 marks · 90 minutes · −0.25 per wrong answer
              </div>

              {EXAM_PATTERN.map(({ subject, weight, color, emoji, note }) => (
                <div key={subject} style={{ marginBottom:16 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                      <span style={{ fontSize:20 }}>{emoji}</span>
                      <div>
                        <div style={{ fontWeight:700,fontSize:14 }}>{subject}</div>
                        <div style={{ fontSize:11,color:'var(--c-text-3)' }}>{note}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right',flexShrink:0 }}>
                      <div style={{ fontWeight:900,fontSize:22,color,lineHeight:1 }}>{weight}</div>
                      <div style={{ fontSize:10,color:'var(--c-text-4)',fontWeight:600 }}>marks</div>
                    </div>
                  </div>
                  <div className="progress-bar" style={{ height:8 }}>
                    <div className="progress-fill" style={{ width:`${weight}%`,background:color }} />
                  </div>
                </div>
              ))}

              {/* Pie chart visual */}
              <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginTop:16,padding:'12px 0',borderTop:'1px solid var(--c-border)' }}>
                {EXAM_PATTERN.map(({ subject, weight, color }) => (
                  <div key={subject} style={{ display:'flex',alignItems:'center',gap:4,fontSize:12 }}>
                    <div style={{ width:10,height:10,borderRadius:2,background:color,flexShrink:0 }}/>
                    <span style={{ color:'var(--c-text-2)' }}>{subject.split(' ')[1] ?? subject.split(' ')[0]}: <strong>{weight}%</strong></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category cutoffs */}
            <div className="card">
              <div style={{ fontWeight:700,fontSize:14,marginBottom:10 }}>🎯 Typical Cutoffs (Marks/100)</div>
              <table className="cutoff-table" style={{ width:'100%' }}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Est. Cutoff</th>
                    <th>Safe Score</th>
                  </tr>
                </thead>
                <tbody>
                  {CUTOFF_CATS.map(({ cat, marks }) => (
                    <tr key={cat}>
                      <td style={{ textAlign:'left',fontWeight:600 }}>{cat}</td>
                      <td style={{ color:'var(--c-wrong)',fontWeight:700 }}>{marks}</td>
                      <td style={{ color:'var(--c-correct)',fontWeight:700 }}>{marks + 5}+</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize:11,color:'var(--c-text-4)',marginTop:8 }}>
                * Based on 2022–2024 data. Actual cutoffs vary per cycle.
              </div>
            </div>

            {/* Exam strategy */}
            <div className="card" style={{ background:'var(--c-surface-2)' }}>
              <div style={{ fontWeight:700,fontSize:14,marginBottom:10 }}>⚡ Smart Strategy</div>
              {[
                { tip:'GA is 70% of paper — master Karnataka History, Polity, Geography', icon:'🎯' },
                { tip:'Science 21 Qs — focus on 10th level Physics/Chemistry/Biology', icon:'🔬' },
                { tip:'Reasoning 7 Qs — all doable with basic practice, easy marks', icon:'🧩' },
                { tip:'Maths only 2 Qs — do not spend more than 5 min studying', icon:'📐' },
                { tip:'Attempt: GA first → Science → Reasoning → Maths → review', icon:'📋' },
              ].map(({ tip, icon }) => (
                <div key={tip} style={{ display:'flex',gap:8,padding:'6px 0',borderBottom:'1px solid var(--c-border)',alignItems:'flex-start' }}>
                  <span style={{ fontSize:16,flexShrink:0,marginTop:1 }}>{icon}</span>
                  <div style={{ fontSize:13,color:'var(--c-text-2)',lineHeight:1.5 }}>{tip}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══ PROGRESS TAB ═══ */}
        {tab === 'progress' && (
          <>
            <div className="stats-grid">
              {[
                { val: stats.total,            label:'Qs Done',  color:'var(--c-primary)' },
                { val: `${stats.accuracy}%`,    label:'Accuracy', color: stats.accuracy>=70?'var(--c-correct)':stats.accuracy>=50?'var(--c-warn)':'var(--c-wrong)' },
                { val: tests.length,            label:'Tests',    color:'#7C3AED' },
                { val: `${streak.current}🔥`,   label:'Streak',   color:'#EA580C' },
              ].map(({ val, label, color }) => (
                <div key={label} className="stat-card">
                  <div className="stat-value" style={{ color }}>{val}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Recent tests */}
            <div className="card">
              <div style={{ fontWeight:700,fontSize:14,marginBottom:10 }}>Recent Tests</div>
              {tests.length === 0
                ? <div className="empty-state" style={{ padding:'20px 0' }}><div>No tests yet</div></div>
                : tests.slice(0,5).map(t => {
                    const pct = Math.round((t.score/t.total)*100);
                    const date = new Date(t.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
                    return (
                      <div key={t.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--c-border)' }}>
                        <div style={{ width:42,height:42,borderRadius:10,flexShrink:0,background:pct>=70?'var(--c-correct-bg)':pct>=50?'var(--c-warn-bg)':'var(--c-wrong-bg)',border:`1.5px solid ${pct>=70?'var(--c-correct-border)':pct>=50?'#FDE68A':'var(--c-wrong-border)'}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
                          <div style={{ fontSize:14,fontWeight:900,color:pct>=70?'var(--c-correct)':pct>=50?'var(--c-warn)':'var(--c-wrong)' }}>{t.score.toFixed(0)}</div>
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{t.label}</div>
                          <div style={{ fontSize:11,color:'var(--c-text-3)' }}>{date} · {pct}%</div>
                        </div>
                      </div>
                    );
                  })
              }
            </div>

            {/* Study heatmap preview */}
            <div className="card">
              <div style={{ fontWeight:700,fontSize:14,marginBottom:10 }}>🔥 {streak.current} Day Streak · Best: {streak.best}</div>
              <div className="heatmap-grid">
                {Array.from({ length: 52 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (51 - i));
                  const str = d.toISOString().split('T')[0];
                  const today = str === new Date().toISOString().split('T')[0];
                  const active = streak.days?.includes(str);
                  return <div key={str} className={`heatmap-cell${active?' active':''}${today?' today':''}`} title={str}/>;
                })}
              </div>
            </div>
          </>
        )}

      </div>

      {/* Logout confirm sheet */}
      {showLogoutConf && (
        <div className="bottom-sheet-overlay" onClick={() => setShowLogoutConf(false)}>
          <div style={{ position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:540 }}>
            <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
              <div className="sheet-handle"/>
              <div style={{ fontWeight:800,fontSize:18,marginBottom:6 }}>Logout?</div>
              <div style={{ fontSize:14,color:'var(--c-text-2)',marginBottom:20 }}>
                Your progress is saved locally. Logging out will only clear your account info.
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setShowLogoutConf(false)}>Cancel</button>
                <button className="btn btn-danger" style={{ flex:1 }} onClick={onLogout}>🚪 Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
