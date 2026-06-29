import React, { useEffect, useState, useCallback } from 'react';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface LoginScreenProps {
  onLogin: (profile: { name: string; email: string; avatar: string }) => void;
  isDark?: boolean;
  onToggleDark?: () => void;
}

declare global {
  interface Window {
    google: any;
    __gsiReady?: boolean;
    __gsiReadyCallbacks?: Array<() => void>;
  }
}

const CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '473495647397-e1nkceovovamoud7bdfgk2jkg273ma6g.apps.googleusercontent.com';


// ── Global GSI readiness tracker ──────────────────────────────────────────────
if (typeof window !== 'undefined') {
  if (!window.__gsiReadyCallbacks) window.__gsiReadyCallbacks = [];
  if (!(window as any).onGoogleLibraryLoad) {
    (window as any).onGoogleLibraryLoad = () => {
      window.__gsiReady = true;
      window.__gsiReadyCallbacks?.forEach(fn => fn());
      window.__gsiReadyCallbacks = [];
    };
  }
}

function whenGoogleReady(fn: () => void) {
  if (window.__gsiReady || window.google) {
    fn();
  } else {
    window.__gsiReadyCallbacks?.push(fn);
    // Safety fallback: if callback never fires (e.g. ad blocker), poll briefly
    const start = Date.now();
    const poll = setInterval(() => {
      if (window.google || Date.now() - start > 5000) {
        clearInterval(poll);
        if (window.google) fn();
      }
    }, 100);
  }
}

export function LoginScreen({ onLogin, isDark, onToggleDark }: LoginScreenProps) {
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [loginLang, setLoginLang]   = useState<'en'|'kn'>(() => (localStorage.getItem('ksp_lang') || 'en') as 'en'|'kn');

  const L = {
    title:  loginLang === 'kn' ? 'ಕೆಎಸ್ಪಿ ತಯಾರಿ' : 'KSP Tayyari',
    sub:    loginLang === 'kn' ? 'ಕರ್ನಾಟಕ ಪೊಲೀಸ್ ಕಾನ್‌ಸ್ಟೇಬಲ್ ಪರೀಕ್ಷೆ ತಯಾರಿ' : 'Karnataka Police Constable Exam Prep',
    sync:   loginLang === 'kn' ? 'ಸಿಂಕ್‌ಗಾಗಿ ಸೈನ್ ಇನ್ ಮಾಡಿ' : 'Sign in to sync across devices',
    guest:  loginLang === 'kn' ? '👤 ಅತಿಥಿಯಾಗಿ ಮುಂದುವರಿಯಿರಿ' : '👤 Continue as Guest',
    guestSub: loginLang === 'kn' ? '(ಸೈನ್ ಇನ್ ಅಗತ್ಯವಿಲ್ಲ)' : '(no sign-in needed)',
    local:  loginLang === 'kn' ? '🔒 Google = ಕ್ಲೌಡ್ ಸಿಂಕ್ · ಅತಿಥಿ = ಸ್ಥಳೀಯ ಮಾತ್ರ' : '🔒 Google login = cloud sync · Guest = local only',
    signing: loginLang === 'kn' ? 'ಸೈನ್ ಇನ್ ಆಗುತ್ತಿದೆ…' : 'Signing you in…',
    entering: loginLang === 'kn' ? 'ಅತಿಥಿಯಾಗಿ ಪ್ರವೇಶಿಸುತ್ತಿದೆ…' : 'Entering as Guest…',
  };

  const switchLang = () => {
    const next = loginLang === 'en' ? 'kn' : 'en';
    setLoginLang(next);
    localStorage.setItem('ksp_lang', next);
  };

  const handleCredentialResponse = useCallback(async (response: any) => {
    setLoading(true);
    setError('');
    try {
      const credential = GoogleAuthProvider.credential(response.credential);
      const userCredential = await signInWithCredential(auth, credential);
      const fbUser = userCredential.user;
      onLogin({
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        email: fbUser.email || '',
        avatar:
          fbUser.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(fbUser.displayName || 'User')}&background=6366f1&color=fff`,
      });
    } catch (err) {
      setError('Login failed. Please try again.');
      setLoading(false);
      console.error('Failed to authenticate Google token with Firebase:', err);
    }
  }, [onLogin]);

  const handleGuestLogin = () => {
    setGuestLoading(true);
    // Enter immediately for blazing-fast speed
    onLogin({
      name: 'Guest',
      email: 'guest@local',
      avatar: `https://ui-avatars.com/api/?name=Guest&background=6366f1&color=fff`,
    });
  };

  const initGoogle = useCallback(() => {
    if (!window.google || !CLIENT_ID) return;
    try {
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      const container = document.getElementById('google-btn-container');
      if (container) {
        window.google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          width: 300,
          text: 'continue_with',
          shape: 'rectangular',
        });
        
        // Prevent flashing raw/unstyled Google iframe by delaying setting googleReady to true.
        // Google's button needs about 200ms to parse internal CSS inside its iframe.
        const timer = setTimeout(() => {
          setGoogleReady(true);
        }, 250);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('[GSI] Button render failed:', e);
    }
  }, [handleCredentialResponse]);

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;
    whenGoogleReady(() => {
      cleanupFn = initGoogle();
    });
    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [initGoogle]);

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg,#060614 0%,#0f0f2e 35%,#1a1040 65%,#0f172a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter',-apple-system,sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes floatUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes orbDrift { 0%,100%{transform:translate(0,0)} 33%{transform:translate(18px,-22px)} 66%{transform:translate(-14px,18px)} }
        @keyframes pulse3   { 0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(99,102,241,.5)} 50%{transform:scale(1.04);box-shadow:0 0 0 16px rgba(99,102,241,.0)} }
        @keyframes badgePop { 0%{opacity:0;transform:scale(.6)} 70%{transform:scale(1.1)} 100%{opacity:1;transform:scale(1)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes shimmer  { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        @keyframes guestPop { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
        .la1{animation:floatUp .55s cubic-bezier(.34,1.56,.64,1) .02s both}
        .la2{animation:floatUp .55s cubic-bezier(.34,1.56,.64,1) .12s both}
        .la3{animation:floatUp .55s cubic-bezier(.34,1.56,.64,1) .22s both}
        .la4{animation:floatUp .55s cubic-bezier(.34,1.56,.64,1) .32s both}
        .la5{animation:floatUp .55s cubic-bezier(.34,1.56,.64,1) .42s both}
        .lorb{animation:orbDrift 9s ease-in-out infinite}
        .lorb2{animation:orbDrift 11s ease-in-out 3s infinite reverse}
        .logo-pulse{animation:pulse3 2.8s ease-in-out infinite}
        .lbadge{animation:badgePop .55s cubic-bezier(.34,1.56,.64,1) .4s both}
        .guest-btn{
          display:flex; align-items:center; justify-content:center; gap:10px;
          width:100%; padding:14px 24px;
          background:linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
          border:2px solid #6366f1;
          border-radius:14px; color:#c7d2fe; font-size:15px; font-weight:700;
          cursor:pointer; transition:all .25s cubic-bezier(0.4, 0, 0.2, 1); font-family:inherit;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
          animation: guestPop .4s cubic-bezier(.34,1.56,.64,1) .2s both;
        }
        .guest-btn:hover{
          background:linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%);
          border-color:#818cf8;
          color:#fff;
          transform:translateY(-2px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.25);
        }
        .guest-btn:active{
          transform:translateY(0);
          box-shadow: 0 4px 10px rgba(99,102,241,0.15);
        }
        #google-btn-container iframe { border-radius: 12px !important; }
      `}</style>

      {/* Background orbs */}
      <div className="lorb" style={{ position: 'absolute', top: '8%', left: '12%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.22),transparent 70%)', pointerEvents: 'none' }} />
      <div className="lorb2" style={{ position: 'absolute', bottom: '12%', right: '10%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,.18),transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 600, height: 600, marginLeft: -300, marginTop: -300, borderRadius: '50%', border: '1px solid rgba(99,102,241,.1)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 420, textAlign: 'center' }}>

        {/* Logo */}
        <div className="la1" style={{ marginBottom: 24 }}>
          <div className="logo-pulse" style={{ width: 82, height: 82, margin: '0 auto 14px', borderRadius: 22, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, boxShadow: '0 0 0 10px rgba(99,102,241,.12),0 0 0 20px rgba(99,102,241,.06),0 20px 50px rgba(99,102,241,.4)' }}>
            📚
          </div>
          {/* Language toggle on login */}
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:8 }}>
            {(['en','kn'] as const).map(l => (
              <button key={l} onClick={() => { setLoginLang(l); localStorage.setItem('ksp_lang',l); }}
                style={{ padding:'5px 16px', borderRadius:20, border:'1.5px solid', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', transition:'all 0.2s',
                  borderColor: loginLang===l ? '#818cf8' : 'rgba(255,255,255,.15)',
                  background: loginLang===l ? 'rgba(99,102,241,.25)' : 'rgba(255,255,255,.04)',
                  color: loginLang===l ? '#c7d2fe' : 'rgba(165,180,252,.5)',
                }}>
                {l === 'en' ? '🇬🇧 English' : '🇮🇳 ಕನ್ನಡ'}
              </button>
            ))}
          </div>
          <div className="lbadge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.3)', borderRadius: 99, padding: '4px 14px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
            <span style={{ color: '#a5b4fc', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>KSP PC MASTERY</span>
          </div>
        </div>

        {/* Title */}
        <div className="la2" style={{ marginBottom: 6 }}>
          <h1 style={{ color: '#fff', fontSize: 30, fontWeight: 900, letterSpacing: -.5, margin: 0, lineHeight: 1.15 }}>
            {loginLang === 'kn' ? 'ಸ್ವಾಗತ — ' : 'Welcome to '}
            <span style={{ background: 'linear-gradient(90deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {L.title}
            </span>
          </h1>
        </div>
        <div className="la3" style={{ marginBottom: 28 }}>
          <p style={{ color: 'rgba(165,180,252,.6)', fontSize: 13, margin: 0 }}>{L.sub}</p>
        </div>

        {/* Card */}
        <div className="la4" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, padding: '28px 24px 24px', backdropFilter: 'blur(20px)', boxShadow: '0 24px 60px rgba(0,0,0,.4)', marginBottom: 16 }}>

          {loading || guestLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '24px 16px', color: '#a5b4fc', fontSize: 14, fontWeight: 600 }}>
              <div style={{ width: 18, height: 18, border: '2.5px solid rgba(165,180,252,.3)', borderTop: '2.5px solid #a5b4fc', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
              {guestLoading ? L.entering : L.signing}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <p style={{ color: 'rgba(165,180,252,.8)', fontSize: 13, fontWeight: 600, margin: '0 0 4px', textAlign: 'center' }}>
                {L.sync}
              </p>

              {error && (
                <div style={{ width: '100%', padding: '10px 14px', background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 12, color: '#fca5a5', fontSize: 13, textAlign: 'center' }}>
                  {error}
                </div>
              )}

              {/* Google Sign-In button */}
              <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', minHeight: 44 }}>
                {!googleReady && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,.03)', border: '1.5px dashed rgba(255,255,255,.12)',
                    borderRadius: 12, color: 'rgba(165,180,252,.6)', fontSize: 13, fontWeight: 600, gap: 8,
                    height: 44, width: 300,
                  }}>
                    <div style={{ width: 14, height: 14, border: '2px solid rgba(165,180,252,.3)', borderTop: '2px solid #a5b4fc', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                    Preparing Google Sign-In…
                  </div>
                )}
                <div style={{
                  position: 'relative',
                  zIndex: 1,
                  visibility: googleReady ? 'visible' : 'hidden',
                  opacity: googleReady ? 1 : 0,
                  transition: 'opacity 0.2s ease-in-out',
                }}>
                  <div style={{ position: 'absolute', inset: -2, borderRadius: 14, background: 'linear-gradient(135deg,rgba(99,102,241,.4),rgba(139,92,246,.4))', filter: 'blur(8px)', opacity: 0.7 }} />
                  <div id="google-btn-container" style={{ position: 'relative', zIndex: 1, borderRadius: 12, overflow: 'hidden', height: 44, width: 300 }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="la5" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { v: '2,499', l: loginLang==='kn' ? 'ಪ್ರಶ್ನೆಗಳು' : 'Real PYQs' },
            { v: '4', l: loginLang==='kn' ? 'ವಿಷಯಗಳು' : 'Subjects' },
            { v: '80+', l: loginLang==='kn' ? 'ವಿಷಯಾಂಶ' : 'Topics' },
          ].map(s => (
            <div key={s.l} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '10px 8px' }}>
              <p style={{ color: '#c7d2fe', fontWeight: 800, fontSize: 13, margin: '0 0 2px' }}>{s.v}</p>
              <p style={{ color: 'rgba(165,180,252,.5)', fontSize: 10, margin: 0 }}>{s.l}</p>
            </div>
          ))}
        </div>

        {/* Footer badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          {['📴 Works Offline', '🆓 100% Free', '🧠 AI Solutions', '🔒 Private'].map(f => (
            <span key={f} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 99, padding: '4px 10px', color: 'rgba(165,180,252,.55)', fontSize: 11, fontWeight: 600 }}>
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
