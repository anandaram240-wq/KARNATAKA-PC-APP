// src/lib/visitorTracker.ts
// Tracks EVERY visit via server-side API + Firestore client-side
// Called: (1) immediately on app load — anonymous, (2) again after login — with user info

import { doc, setDoc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// ── Session ID (persists for browser session) ─────────────────────────────────
export function getSessionId(): string {
  let sid = sessionStorage.getItem('rrb_sid');
  if (!sid) {
    sid = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('rrb_sid', sid);
  }
  return sid;
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const isTablet  = /iPad/i.test(ua);
  return {
    device:  isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
    browser: ua.includes('Edg/')     ? 'Edge'
           : ua.includes('OPR/')     ? 'Opera'
           : ua.includes('Chrome')   ? 'Chrome'
           : ua.includes('Firefox')  ? 'Firefox'
           : ua.includes('Safari')   ? 'Safari'
           : 'Other',
  };
}

// ── Server-side ping (fires on EVERY page load) ──────────────────────────────
export async function pingServer(options: {
  loginType?: 'google' | 'guest' | 'anonymous';
  email?:     string;
  name?:      string;
  page?:      string;
} = {}) {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getSessionId(),
        loginType: options.loginType ?? 'anonymous',
        email:     options.email     ?? null,
        name:      options.name      ?? null,
        page:      options.page      ?? window.location.pathname,
      }),
    });
  } catch {
    // never crash app
  }
}

// ── Firestore client-side visitor record ─────────────────────────────────────
export async function trackVisit(email: string, name: string, loginType: 'google' | 'guest') {
  try {
    const sessionId = getSessionId();
    const { device, browser } = getDeviceInfo();
    const isGuest   = loginType === 'guest';
    const docId     = isGuest ? `guest_${sessionId}` : email.replace(/[@.]/g, '_');

    // Upsert visitor record
    const visitorRef = doc(db, 'visitors', docId);
    const snap = await getDoc(visitorRef);

    if (!snap.exists()) {
      await setDoc(visitorRef, {
        email:      isGuest ? `guest_${sessionId}` : email,
        name:       isGuest ? 'Guest User' : name,
        loginType,
        device,
        browser,
        firstSeen:  serverTimestamp(),
        lastSeen:   serverTimestamp(),
        visitCount: 1,
        sessionIds: [sessionId],
        isGuest,
      });
    } else {
      const existing = snap.data();
      const sessions: string[] = existing.sessionIds ?? [];
      if (!sessions.includes(sessionId)) {
        sessions.push(sessionId);
        await updateDoc(visitorRef, {
          lastSeen:   serverTimestamp(),
          visitCount: increment(1),
          sessionIds: sessions,
          device, browser,
          name: isGuest ? existing.name : name,
        });
      } else {
        await updateDoc(visitorRef, { lastSeen: serverTimestamp() });
      }
    }

    // Global stats
    const statsRef  = doc(db, 'admin_stats', 'global');
    const statsSnap = await getDoc(statsRef);
    if (!statsSnap.exists()) {
      await setDoc(statsRef, {
        totalVisits:  1,
        guestVisits:  isGuest ? 1 : 0,
        googleVisits: isGuest ? 0 : 1,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(statsRef, {
        totalVisits:  increment(1),
        guestVisits:  increment(isGuest ? 1 : 0),
        googleVisits: increment(isGuest ? 0 : 1),
        updatedAt: serverTimestamp(),
      });
    }

    // Also ping server with login info
    await pingServer({ loginType, email, name });

  } catch (e) {
    console.warn('[Tracker]', e);
  }
}
