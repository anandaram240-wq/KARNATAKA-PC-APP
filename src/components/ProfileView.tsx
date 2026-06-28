// src/components/ProfileView.tsx
// Profile · Logout · App Download · Pattern Analysis · Admin ONLY for anandakiccha240@gmail.com
import React, { useState, useEffect, useMemo } from 'react';
import { useT } from '../lib/i18n';
import { getOverallStats, getAllTests, getStreak, getSettings, saveSettings } from '../lib/storage';
import { getLatestCutoff, getCutoffTrend } from '../lib/cutoffEngine';
import { getPhysicalRequirements } from '../lib/physicalData';
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

// ─────────────────────────────────────────────────────
// ADVANCED ADMIN DASHBOARD
// ─────────────────────────────────────────────────────
function AdminDashboard({ onBack, profile }: { onBack: () => void; profile: UserProfile | null }) {
  const [pin,      setPin]      = useState('');
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('ksp_admin') === '1');
  const [tab,      setTab]      = useState<'overview'|'users'|'content'|'settings'>('overview');

  const stats = useMemo(() => getOverallStats(), []);
  const tests = useMemo(() => getAllTests(), []);
  const streak = useMemo(() => getStreak(), []);
  const settings = useMemo(() => getSettings(), []);

  // Simulated platform stats from real local data
  const avgTestScore = tests.length
    ? Math.round(tests.reduce((s, t) => s + (t.score / t.total) * 100, 0) / tests.length)
    : 0;

  const subjectBreakdown = useMemo(() => {
    const map: Record<string, { total: number; correct: number }> = {};
    try {
      const raw = JSON.parse(localStorage.getItem('ksp_answers') || '{}');
      Object.entries(raw).forEach(([, v]: [string, any]) => {
        const subj = v.subject || 'Unknown';
        if (!map[subj]) map[subj] = { total: 0, correct: 0 };
        map[subj].total++;
        if (v.correct) map[subj].correct++;
      });
    } catch { /* */ }
    return Object.entries(map).map(([subj, d]) => ({
      subj,
      total: d.total,
      acc: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, []);

  const tryUnlock = () => {
    if (pin === '2024ksp') { sessionStorage.setItem('ksp_admin', '1'); setUnlocked(true); }
    else { setPin(''); alert('❌ Wrong PIN'); }
  };

  if (!unlocked) {
    return (
      <div className="page" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-primary)', fontWeight: 700, fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Back
          </button>
          <div style={{ textAlign: 'center', padding: '32px 24px', background: 'var(--c-surface)', border: '1.5px solid var(--c-border)', borderRadius: 20, boxShadow: 'var(--shadow-md)' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#1565C0,#0D47A1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 34, boxShadow: '0 8px 24px rgba(21,101,192,.35)' }}>🛡️</div>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Admin Dashboard</div>
            <div style={{ fontSize: 13, color: 'var(--c-text-3)', marginBottom: 20 }}>Access restricted to <strong>{ADMIN_EMAIL}</strong></div>
            <input type="password" value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && tryUnlock()}
              placeholder="Enter Admin PIN"
              style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '2px solid var(--c-border)', fontSize: 18, textAlign: 'center', marginBottom: 12, letterSpacing: 8, outline: 'none', fontFamily: 'monospace' }}
              autoFocus
            />
            <button className="btn btn-primary btn-block" onClick={tryUnlock} style={{ fontSize: 15, padding: '13px' }}>
              🔓 Unlock Admin Panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Admin topbar */}
      <div style={{
        background: 'linear-gradient(135deg,#0D47A1,#1565C0)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button onClick={onBack}
          style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>🛡️ Admin Dashboard</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>{ADMIN_EMAIL}</div>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem('ksp_admin'); setUnlocked(false); }}
          style={{ background: 'rgba(255,0,0,.2)', border: '1px solid rgba(255,0,0,.4)', borderRadius: 8, padding: '5px 10px', color: '#FECACA', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
          Lock
        </button>
      </div>

      <div className="page page-gap">

        {/* ── Overview cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '📚', val: stats.total,          label: 'Qs Attempted', color: '#1565C0', bg: '#EFF6FF' },
            { icon: '🎯', val: `${stats.accuracy}%`,  label: 'Avg Accuracy',  color: '#16A34A', bg: '#F0FDF4' },
            { icon: '📝', val: tests.length,          label: 'Tests Taken',   color: '#7C3AED', bg: '#FAF5FF' },
            { icon: '🔥', val: streak.current,        label: 'Day Streak',    color: '#EA580C', bg: '#FFF7ED' },
          ].map(({ icon, val, label, color, bg }) => (
            <div key={label} style={{ background: bg, border: `1.5px solid ${color}30`, borderRadius: 14, padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 26 }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 900, fontSize: 22, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 11, color, fontWeight: 700, marginTop: 2, opacity: 0.8 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab nav ── */}
        <div className="inner-tabs">
          {([
            ['overview', '📊 Overview'],
            ['users',    '👤 User'],
            ['content',  '📚 Content'],
            ['settings', '⚙️ Config'],
          ] as const).map(([t, l]) => (
            <button key={t} className={`inner-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{l}</button>
          ))}
        </div>

        {/* ══ OVERVIEW TAB ══ */}
        {tab === 'overview' && (
          <>
            {/* Score analysis */}
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📈 Test Score Analysis</div>
              {tests.length === 0
                ? <div style={{ textAlign: 'center', color: 'var(--c-text-3)', padding: '20px 0', fontSize: 13 }}>No tests taken yet</div>
                : (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      {[
                        { label: 'Best Score',  val: `${Math.max(...tests.map(t => Math.round((t.score/t.total)*100)))}%`, color: '#16A34A' },
                        { label: 'Avg Score',   val: `${avgTestScore}%`,  color: '#1565C0' },
                        { label: 'Latest',      val: `${Math.round((tests[0].score/tests[0].total)*100)}%`, color: '#7C3AED' },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ flex: 1, textAlign: 'center', background: 'var(--c-surface-2)', borderRadius: 10, padding: '10px 6px' }}>
                          <div style={{ fontWeight: 900, fontSize: 20, color }}>{val}</div>
                          <div style={{ fontSize: 10, color: 'var(--c-text-3)', fontWeight: 700, marginTop: 2 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    {/* Mini bar chart of last 5 tests */}
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', marginBottom: 6 }}>LAST 5 TESTS</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
                      {tests.slice(0, 5).reverse().map((t, i) => {
                        const pct = Math.round((t.score / t.total) * 100);
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: pct >= 70 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626' }}>{pct}%</div>
                            <div style={{ width: '100%', height: `${Math.max(8, pct * 0.44)}px`, borderRadius: 4, background: pct >= 70 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626', transition: 'height .3s ease' }} />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
            </div>

            {/* Subject performance */}
            {subjectBreakdown.length > 0 && (
              <div className="card">
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🎯 Subject-wise Performance</div>
                {subjectBreakdown.map(({ subj, total, acc }) => (
                  <div key={subj} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{subj}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: acc >= 70 ? '#16A34A' : acc >= 50 ? '#D97706' : '#DC2626' }}>{acc}% · {total} Qs</span>
                    </div>
                    <div className="progress-bar" style={{ height: 6 }}>
                      <div className="progress-fill" style={{ width: `${acc}%`, background: acc >= 70 ? '#16A34A' : acc >= 50 ? '#D97706' : '#DC2626' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Activity heatmap */}
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📅 Study Activity (Last 52 days)</div>
              <div className="heatmap-grid">
                {Array.from({ length: 52 }, (_, i) => {
                  const d = new Date(); d.setDate(d.getDate() - (51 - i));
                  const str   = d.toISOString().split('T')[0];
                  const today = str === new Date().toISOString().split('T')[0];
                  const active = streak.days?.includes(str);
                  return <div key={str} className={`heatmap-cell${active ? ' active' : ''}${today ? ' today' : ''}`} title={str} />;
                })}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--c-text-3)' }}>
                <span>🔥 Current streak: <strong style={{ color: 'var(--c-primary)' }}>{streak.current} days</strong></span>
                <span>🏆 Best: <strong>{streak.best} days</strong></span>
              </div>
            </div>
          </>
        )}

        {/* ══ USER TAB ══ */}
        {tab === 'users' && (
          <>
            {/* Logged-in user card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg,#1565C0,#0D47A1)', padding: '16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.7)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active User</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {profile?.avatar
                    ? <img src={profile.avatar} style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid rgba(255,255,255,.4)' }} alt="" />
                    : <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff' }}>{profile?.name?.[0] ?? '?'}</div>
                  }
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>{profile?.name ?? 'Guest'}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)' }}>{profile?.email ?? 'Not signed in'}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#86EFAC', marginTop: 4, display: 'inline-block' }}>✓ Admin Access</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Exam Profile Saved</div>
                {[
                  { label: 'Category', val: settings.category.replace(/_/g, ' ') },
                  { label: 'Region',   val: settings.region },
                  { label: 'Gender',   val: settings.gender === 'M' ? 'Male' : 'Female' },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--c-border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--c-text-3)' }}>{label}</span>
                    <strong style={{ color: 'var(--c-primary)' }}>{val}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* User stats detailed */}
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📊 Detailed Stats</div>
              {[
                { label: 'Total Questions Attempted', val: stats.total,     icon: '📚' },
                { label: 'Correct Answers',           val: stats.correct,   icon: '✅' },
                { label: 'Wrong Answers',             val: stats.wrong,     icon: '❌' },
                { label: 'Accuracy Rate',             val: `${stats.accuracy}%`, icon: '🎯' },
                { label: 'Tests Completed',           val: tests.length,    icon: '📝' },
                { label: 'Study Streak',              val: `${streak.current} days`, icon: '🔥' },
                { label: 'Best Streak',               val: `${streak.best} days`,    icon: '🏆' },
              ].map(({ label, val, icon }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--c-border)' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--c-text-2)' }}>{label}</span>
                  <strong style={{ fontSize: 14 }}>{val}</strong>
                </div>
              ))}
            </div>

            {/* Recent tests */}
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Recent Mock Tests</div>
              {tests.length === 0
                ? <div style={{ textAlign: 'center', color: 'var(--c-text-3)', padding: '16px 0', fontSize: 13 }}>No tests yet</div>
                : tests.slice(0, 8).map((t, i) => {
                    const pct  = Math.round((t.score / t.total) * 100);
                    const date = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--c-border)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14,
                          background: pct >= 70 ? '#DCFCE7' : pct >= 50 ? '#FFFBEB' : '#FEF2F2',
                          color:      pct >= 70 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626',
                        }}>
                          {pct}%
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{date} · Score: {t.score.toFixed(0)}/{t.total}</div>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </>
        )}

        {/* ══ CONTENT TAB ══ */}
        {tab === 'content' && (
          <>
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📦 Database Stats</div>
              {[
                { label: 'Total PYQ Questions', val: '2,499', icon: '📚', color: '#1565C0' },
                { label: 'With Kannada Trans.',  val: '2,499 (100%)', icon: '🇮🇳', color: '#16A34A' },
                { label: 'Years Covered',        val: '2014–2024',    icon: '📅', color: '#7C3AED' },
                { label: 'Subjects',             val: '4',            icon: '🔬', color: '#D97706' },
                { label: 'Topics / Chapters',    val: '80+',          icon: '📖', color: '#EA580C' },
                { label: 'Mock Test Templates',  val: '5 types',      icon: '📝', color: '#0EA5E9' },
              ].map(({ label, val, icon, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--c-border)' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--c-text-2)' }}>{label}</span>
                  <strong style={{ color, fontSize: 13 }}>{val}</strong>
                </div>
              ))}
            </div>

            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📊 Subject Distribution</div>
              {EXAM_PATTERN.map(({ subject, weight, color, emoji }) => (
                <div key={subject} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{emoji} {subject}</span>
                    <span style={{ fontWeight: 800, color, fontSize: 14 }}>{weight} marks</span>
                  </div>
                  <div className="progress-bar" style={{ height: 8 }}>
                    <div className="progress-fill" style={{ width: `${weight}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ background: 'var(--c-surface-2)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🌐 App Info</div>
              {[
                { label: 'Version',     val: 'v2.0 (2025)' },
                { label: 'Framework',  val: 'React + Vite PWA' },
                { label: 'Deployment', val: 'Vercel (karnataka-pc-app.vercel.app)' },
                { label: 'Offline',    val: 'Yes — Service Worker cached' },
                { label: 'Languages',  val: 'English + ಕನ್ನಡ' },
                { label: 'Developer',  val: 'Ananda Valmiki' },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--c-border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--c-text-3)' }}>{label}</span>
                  <strong>{val}</strong>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══ SETTINGS TAB ══ */}
        {tab === 'settings' && (
          <>
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>⚙️ Admin Configuration</div>
              <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 2 }}>
                <div>Admin Email: <strong style={{ color: 'var(--c-primary)' }}>{ADMIN_EMAIL}</strong></div>
                <div>Admin PIN: <strong style={{ fontFamily: 'monospace', background: 'var(--c-surface-2)', padding: '1px 8px', borderRadius: 4 }}>2024ksp</strong></div>
                <div>Session: <strong style={{ color: '#16A34A' }}>Active</strong></div>
              </div>
            </div>

            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🗑️ Data Management</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn-outline btn-block"
                  onClick={() => { const d = JSON.stringify(localStorage); const a = document.createElement('a'); a.href = 'data:text/json,' + encodeURIComponent(d); a.download = 'ksp_backup.json'; a.click(); }}>
                  📥 Export All Data (JSON)
                </button>
                <button className="btn btn-danger btn-block"
                  onClick={() => { if (confirm('⚠️ This will DELETE all user data permanently. Are you sure?')) { localStorage.clear(); window.location.reload(); } }}>
                  🗑️ Reset All User Data
                </button>
              </div>
            </div>

            <button className="btn btn-ghost btn-block"
              onClick={() => { sessionStorage.removeItem('ksp_admin'); setUnlocked(false); }}>
              🔒 Lock Admin Panel
            </button>
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
