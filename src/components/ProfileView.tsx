// src/components/ProfileView.tsx
// Profile · Logout · App Download · Pattern Analysis · Admin (anandakiccha240@gmail.com ONLY)
import React, { useState, useEffect, useMemo } from 'react';
import { useT } from '../lib/i18n';
import { getOverallStats, getAllTests, getStreak, getSettings, saveSettings } from '../lib/storage';
import { getLatestCutoff, getCutoffTrend } from '../lib/cutoffEngine';
import type { UserSettings } from '../lib/storage';

interface UserProfile { name: string; email: string; avatar: string; }

const PROFILE_KEY  = 'ksp_user_profile';
// ★ ONLY this email sees admin — no one else, no exceptions
const ADMIN_EMAIL  = 'anandakiccha240@gmail.com';

function loadProfile(): UserProfile | null {
  try { const s = localStorage.getItem(PROFILE_KEY); return s ? JSON.parse(s) : null; }
  catch { return null; }
}

// ── PWA install deferred prompt ───────────────────────
let deferredInstallPrompt: Event | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

// ── Exam pattern data ─────────────────────────────────
const EXAM_PATTERN = [
  { subject: 'General Awareness', weight: 70, color: '#D97706', emoji: '🇮🇳',
    note: '70 Qs — History, Polity, Geography, Current Affairs, KA Specific' },
  { subject: 'General Science',   weight: 21, color: '#16A34A', emoji: '🔬',
    note: '21 Qs — Physics, Chemistry, Biology basics (10th standard)' },
  { subject: 'Reasoning',         weight: 7,  color: '#7C3AED', emoji: '🧩',
    note: '7 Qs — Series, Analogies, Directions, Coding-Decoding' },
  { subject: 'Mathematics',       weight: 2,  color: '#0EA5E9', emoji: '🔢',
    note: '2 Qs — Basic Arithmetic, Averages, Percentages' },
];

// ── Admin Panel — completely hidden unless ADMIN_EMAIL ──
function AdminPanel({ onBack, profile }: { onBack: () => void; profile: UserProfile | null }) {
  const [pin, setPin]         = useState('');
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('ksp_admin') === '1');
  const [tab, setTab]         = useState<'users' | 'data' | 'settings'>('users');
  const stats = getOverallStats();
  const tests = getAllTests();

  const tryUnlock = () => {
    if (pin === '2024ksp') {
      sessionStorage.setItem('ksp_admin', '1');
      setUnlocked(true);
    } else {
      setPin('');
      alert('Wrong PIN');
    }
  };

  if (!unlocked) {
    return (
      <div className="page page-gap">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-primary)', fontWeight: 700, fontSize: 14 }}>← Back</button>
          <div style={{ fontWeight: 800, fontSize: 18 }}>🔐 Admin</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Admin PIN</div>
          <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginBottom: 20 }}>
            Only <strong>{ADMIN_EMAIL}</strong>
          </div>
          <input type="password" value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tryUnlock()}
            placeholder="Enter PIN"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid var(--c-border)', fontSize: 18, textAlign: 'center', marginBottom: 12, letterSpacing: 6, outline: 'none' }}
            autoFocus
          />
          <button className="btn btn-primary btn-block" onClick={tryUnlock}>Unlock →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-gap">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-primary)', fontWeight: 700, fontSize: 14 }}>← Back</button>
        <div style={{ fontWeight: 800, fontSize: 18 }}>🛡️ Admin Panel</div>
        <span className="badge badge-new" style={{ marginLeft: 'auto' }}>ADMIN</span>
      </div>

      <div className="inner-tabs">
        {(['users', 'data', 'settings'] as const).map(t => (
          <button key={t} className={`inner-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'users' ? '👥 Users' : t === 'data' ? '📊 Data' : '⚙️ Settings'}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Logged-in User</div>
            {profile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {profile.avatar
                  ? <img src={profile.avatar} style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--c-primary)' }} alt="" />
                  : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 20 }}>{profile.name[0]}</div>
                }
                <div>
                  <div style={{ fontWeight: 700 }}>{profile.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text-3)' }}>{profile.email}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A' }}>✓ Admin</span>
                </div>
              </div>
            ) : <div style={{ color: 'var(--c-text-3)' }}>Guest</div>}
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Activity</div>
            {[
              { label: 'Questions Attempted', val: stats.total },
              { label: 'Correct Answers',     val: stats.correct },
              { label: 'Accuracy',            val: `${stats.accuracy}%` },
              { label: 'Tests Completed',     val: tests.length },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--c-border)', fontSize: 13 }}>
                <span style={{ color: 'var(--c-text-2)' }}>{label}</span>
                <strong>{val}</strong>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'data' && (
        <>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>App Data</div>
            {[
              { label: 'Total PYQs',      val: '2,499' },
              { label: 'Years Covered',   val: '2014–2024' },
              { label: 'Subjects',        val: '4' },
              { label: 'Topics',          val: '80+' },
              { label: 'With Kannada',    val: '100%' },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--c-border)', fontSize: 13 }}>
                <span style={{ color: 'var(--c-text-2)' }}>{label}</span>
                <strong style={{ color: 'var(--c-primary)' }}>{val}</strong>
              </div>
            ))}
          </div>
          <button className="btn btn-danger btn-block"
            onClick={() => { if (confirm('Reset ALL user data?')) { localStorage.clear(); window.location.reload(); } }}>
            🗑 Reset All User Data
          </button>
        </>
      )}

      {tab === 'settings' && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Admin Config</div>
          <div style={{ fontSize: 13, color: 'var(--c-text-3)', lineHeight: 1.8 }}>
            Admin email: <strong>{ADMIN_EMAIL}</strong><br />
            Admin PIN: <strong>2024ksp</strong>
          </div>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }}
            onClick={() => { sessionStorage.removeItem('ksp_admin'); setUnlocked(false); }}>
            🔒 Lock Admin Panel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Profile View ────────────────────────────────
interface Props { onLogout: () => void; }

export default function ProfileView({ onLogout }: Props) {
  const T        = useT();
  const profile  = useMemo(() => loadProfile(), []);
  const stats    = useMemo(() => getOverallStats(), []);
  const tests    = useMemo(() => getAllTests(), []);
  const streak   = useMemo(() => getStreak(), []);

  // ★ Admin check — strictly by email only
  const isAdmin = profile?.email === ADMIN_EMAIL;

  const [showAdmin,      setShowAdmin]      = useState(false);
  const [showLogoutConf, setShowLogoutConf] = useState(false);
  const [tab,            setTab]            = useState<'settings' | 'pattern' | 'progress'>('settings');
  const [pwaReady,       setPwaReady]       = useState(!!deferredInstallPrompt);

  const savedSettings = useMemo(() => getSettings(), []);
  const [cat,    setCat]    = useState<UserSettings['category']>(savedSettings.category);
  const [region, setRegion] = useState<UserSettings['region']>(savedSettings.region);
  const [gender, setGender] = useState<UserSettings['gender']>(savedSettings.gender);
  const [saved,  setSaved]  = useState(false);

  const cutoffInfo = useMemo(() => getLatestCutoff({ category: cat, region, gender }), [cat, region, gender]);
  const trend      = useMemo(() => getCutoffTrend({ category: cat, region, gender }),  [cat, region, gender]);

  useEffect(() => {
    const handler = () => setPwaReady(true);
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const saveUserSettings = () => {
    saveSettings({ category: cat, region, gender });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const installPWA = async () => {
    if (!deferredInstallPrompt) {
      alert('To install:\n• Chrome Android: ⋮ → Add to Home Screen\n• Safari iOS: Share → Add to Home Screen');
      return;
    }
    (deferredInstallPrompt as any).prompt();
    await (deferredInstallPrompt as any).userChoice;
    deferredInstallPrompt = null;
    setPwaReady(false);
  };

  // Show admin panel (only if isAdmin)
  if (showAdmin && isAdmin) {
    return <AdminPanel onBack={() => setShowAdmin(false)} profile={profile} />;
  }

  return (
    <>
      <div className="top-bar">
        <span className="top-bar-title">👤 Profile</span>
        {/* Admin button — STRICTLY only visible to ADMIN_EMAIL */}
        {isAdmin && (
          <button
            className="btn btn-sm"
            style={{ background: '#1E3A8A', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, padding: '5px 12px', borderRadius: 8, cursor: 'pointer' }}
            onClick={() => setShowAdmin(true)}
          >
            🛡️ Admin
          </button>
        )}
      </div>

      <div className="page page-gap">

        {/* ── User card ── */}
        <div className="card-primary" style={{ borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -15, top: -15, fontSize: 80, opacity: 0.07 }}>🚔</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {profile?.avatar
              ? <img src={profile.avatar} style={{ width: 60, height: 60, borderRadius: '50%', border: '3px solid rgba(255,255,255,.4)', boxShadow: '0 2px 8px rgba(0,0,0,.2)', flexShrink: 0 }} alt="" />
              : <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, flexShrink: 0 }}>
                  {profile?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.name ?? 'Guest User'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, color: '#fff', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.email ?? 'Not signed in'}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {isAdmin && (
                  <span style={{ background: 'rgba(255,255,255,.2)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#fff', fontWeight: 700 }}>🛡 Admin</span>
                )}
                <span style={{ background: 'rgba(255,255,255,.15)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#fff' }}>
                  {cat.replace(/_/g, ' ')} · {region}
                </span>
              </div>
            </div>
          </div>
          {/* Quick stats */}
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

        {/* ══════════════ SETTINGS TAB ══════════════ */}
        {tab === 'settings' && (
          <>
            {/* Exam profile + live cutoff preview */}
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Exam Profile</div>

              {/* Category */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
                <select value={cat} onChange={e => setCat(e.target.value as UserSettings['category'])}
                  style={{ width: '100%' }}>
                  {(['General', 'OBC_2A', 'OBC_2B', 'OBC_3A', 'OBC_3B', 'SC', 'ST', 'CAT01'] as UserSettings['category'][]).map(c => (
                    <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Region */}
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
                      {r === 'NKK' ? '🌆 NKK' : '🌾 KK (Hyderabad-K)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
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

              {/* Live cutoff preview */}
              <div style={{ background: 'var(--c-surface-2)', borderRadius: 10, padding: 12, marginBottom: 14, border: '1px solid var(--c-border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📊 Your Target (based on above)
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Cutoff',       val: cutoffInfo.cutoff,   color: '#DC2626', bg: '#FEF2F2' },
                    { label: 'Safe',         val: cutoffInfo.target,   color: '#D97706', bg: '#FFFBEB' },
                    { label: 'Comfortable',  val: cutoffInfo.safeZone, color: '#16A34A', bg: '#F0FDF4' },
                  ].map(({ label, val, color, bg }) => (
                    <div key={label} style={{ flex: 1, background: bg, borderRadius: 8, padding: '8px 6px', textAlign: 'center', border: `1px solid ${color}30` }}>
                      <div style={{ fontWeight: 900, fontSize: 22, color, lineHeight: 1 }}>{val}</div>
                      <div style={{ fontSize: 10, color, fontWeight: 700, marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--c-text-4)', marginTop: 8 }}>
                  Based on {cutoffInfo.year} · {cat.replace(/_/g, ' ')} · {region} · {gender === 'M' ? 'Male' : 'Female'}
                </div>
                {/* Trend */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {trend.map(({ year, cutoff }) => (
                    <span key={year} style={{ fontSize: 11, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 20, padding: '2px 8px', fontWeight: 700, color: 'var(--c-text-2)' }}>
                      {year}: {cutoff}
                    </span>
                  ))}
                  <span style={{ fontSize: 10, color: 'var(--c-text-4)', alignSelf: 'center' }}>↑ trend</span>
                </div>
              </div>

              <button className="btn btn-primary btn-block" onClick={saveUserSettings}
                style={{ position: 'relative', overflow: 'hidden' }}>
                {saved ? '✅ Saved!' : '💾 Save Settings'}
              </button>
            </div>

            {/* App Install */}
            <div className="card" style={{ background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border: '1px solid #BFDBFE' }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#1E3A8A' }}>📲 Install App</div>
              <div style={{ fontSize: 13, color: '#1D4ED8', marginBottom: 12 }}>
                Install KSP Tayyari on your phone — works fully offline after install!
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={installPWA}>
                  📥 Install on Phone
                </button>
                <a href="https://karnataka-pc-app.vercel.app" target="_blank" rel="noopener noreferrer"
                  className="btn btn-outline" style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  🌐 Open Website
                </a>
              </div>
              <div style={{ fontSize: 12, color: '#3B82F6', marginTop: 10, lineHeight: 1.7 }}>
                <strong>Android Chrome:</strong> ⋮ → Add to Home Screen<br />
                <strong>iPhone Safari:</strong> Share → Add to Home Screen
              </div>
            </div>

            {/* Logout */}
            <button className="btn btn-block btn-danger" onClick={() => setShowLogoutConf(true)}>
              🚪 Logout
            </button>
          </>
        )}

        {/* ══════════════ PATTERN TAB ══════════════ */}
        {tab === 'pattern' && (
          <>
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>📊 KSP CPC Exam Pattern</div>
              <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginBottom: 16 }}>
                100 marks · 90 minutes · −0.25 per wrong answer (negative marking)
              </div>
              {EXAM_PATTERN.map(({ subject, weight, color, emoji, note }) => (
                <div key={subject} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{emoji}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{subject}</div>
                        <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 1 }}>{note}</div>
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

            {/* Personalised cutoffs table */}
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🎯 Historical Cutoffs — {cat.replace(/_/g, ' ')} / {region} / {gender === 'M' ? 'Male' : 'Female'}</div>
              <table className="cutoff-table" style={{ width: '100%' }}>
                <thead>
                  <tr><th>Year</th><th>Cutoff</th><th>Safe Score</th></tr>
                </thead>
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
              <div style={{ fontSize: 11, color: 'var(--c-text-4)', marginTop: 8 }}>
                * KK region is ~3 marks lower than NKK. Change your profile settings above to update.
              </div>
            </div>

            {/* Strategy */}
            <div className="card" style={{ background: 'var(--c-surface-2)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>⚡ Exam Strategy</div>
              {[
                { tip: 'GA is 70 marks — master Karnataka-specific topics first',     icon: '🎯' },
                { tip: 'Science 21 marks — 10th standard level, all doable',          icon: '🔬' },
                { tip: 'Reasoning 7 marks — attempt all, easy points',                icon: '🧩' },
                { tip: 'Maths only 2 marks — skip if stuck, save time for GA',        icon: '📐' },
                { tip: `Your target: ${cutoffInfo.target}+ marks to be safe`,         icon: '🎯' },
                { tip: 'Attempt order: GA → Science → Reasoning → Maths → Review',   icon: '📋' },
              ].map(({ tip, icon }) => (
                <div key={tip} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--c-border)', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.5 }}>{tip}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══════════════ PROGRESS TAB ══════════════ */}
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
                : tests.slice(0, 6).map(t => {
                    const pct  = Math.round((t.score / t.total) * 100);
                    const date = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--c-border)' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          background: pct >= 70 ? 'var(--c-correct-bg)' : pct >= 50 ? '#FFFBEB' : 'var(--c-wrong-bg)',
                          border: `1.5px solid ${pct >= 70 ? 'var(--c-correct-border)' : pct >= 50 ? '#FDE68A' : 'var(--c-wrong-border)'}`,
                        }}>
                          <div style={{ fontSize: 14, fontWeight: 900, color: pct >= 70 ? 'var(--c-correct)' : pct >= 50 ? '#D97706' : 'var(--c-wrong)' }}>
                            {t.score.toFixed(0)}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 1 }}>{date} · {pct}%</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: pct >= cutoffInfo.cutoff ? 'var(--c-correct)' : 'var(--c-wrong)', flexShrink: 0 }}>
                          {pct >= cutoffInfo.cutoff ? '✅' : '❌'}
                        </div>
                      </div>
                    );
                  })
              }
            </div>

            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                🔥 {streak.current} Day Streak · Best: {streak.best}
              </div>
              <div className="heatmap-grid">
                {Array.from({ length: 52 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (51 - i));
                  const str   = d.toISOString().split('T')[0];
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
                Your study progress is saved locally and will remain intact. Only your account info will be cleared.
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
