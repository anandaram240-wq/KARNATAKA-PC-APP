// src/lib/visitorTracker.ts
// World-class analytics: tracks EVERY visitor (guest + Google) with UUID, IP, device info
// Writes to Firestore ksp_visitors collection (real-time readable by admin)

import { db } from './firebase';
import {
  doc, setDoc, getDoc, collection, getDocs, onSnapshot,
  serverTimestamp, increment, Timestamp, query, orderBy, limit,
} from 'firebase/firestore';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface VisitorRecord {
  vid: string;           // unique visitor ID (UUID, permanent)
  type: 'google' | 'guest';
  name: string;
  email: string;
  avatar: string;
  ip: string;
  country: string;
  city: string;
  device: string;        // 'mobile' | 'tablet' | 'desktop'
  os: string;
  browser: string;
  screen: string;        // e.g. "390x844"
  lang: string;
  firstSeen: Timestamp | null;
  lastSeen: Timestamp | null;
  sessionCount: number;
  todayActive: boolean;
  lastActiveDate: string;
  category?: string;
  region?: string;
  gender?: string;
  // computed client-side
  isOnline?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const VID_KEY     = 'ksp_visitor_id';
const COL         = 'ksp_visitors';
const STATS_DOC   = 'ksp_stats/global';
const TODAY       = () => new Date().toISOString().split('T')[0];

// ── Generate / retrieve persistent visitor UUID ────────────────────────────────
export function getOrCreateVid(): string {
  let vid = localStorage.getItem(VID_KEY);
  if (!vid) {
    vid = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(VID_KEY, vid);
  }
  return vid;
}

// ── Detect device info ─────────────────────────────────────────────────────────
function getDeviceInfo() {
  const ua = navigator.userAgent;
  const device = /Mobi|Android/i.test(ua) ? 'mobile' : /Tablet|iPad/i.test(ua) ? 'tablet' : 'desktop';
  const os = /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
    : /Windows/i.test(ua) ? 'Windows'
    : /Mac/i.test(ua) ? 'macOS'
    : /Linux/i.test(ua) ? 'Linux' : 'Unknown';
  const browser = /Chrome/i.test(ua) && !/Edge/i.test(ua) ? 'Chrome'
    : /Safari/i.test(ua) && !/Chrome/i.test(ua) ? 'Safari'
    : /Firefox/i.test(ua) ? 'Firefox'
    : /Edge/i.test(ua) ? 'Edge'
    : /Opera|OPR/i.test(ua) ? 'Opera' : 'Unknown';
  const screen = `${window.screen.width}x${window.screen.height}`;
  const lang = navigator.language || 'en';
  return { device, os, browser, screen, lang };
}

// ── Fetch IP + geo info ────────────────────────────────────────────────────────
async function getIPInfo(): Promise<{ ip: string; country: string; city: string }> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    const d   = await res.json();
    return { ip: d.ip || '?', country: d.country_name || '?', city: d.city || '?' };
  } catch {
    try {
      const r2  = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
      const d2  = await r2.json();
      return { ip: d2.ip || '?', country: '?', city: '?' };
    } catch {
      return { ip: '?', country: '?', city: '?' };
    }
  }
}

// ── Main track function — call on every app load ───────────────────────────────
export async function trackVisitor(profile?: {
  name: string; email: string; avatar: string;
  type?: 'google' | 'guest';
}, settings?: { category?: string; region?: string; gender?: string }) {
  try {
    const vid     = getOrCreateVid();
    const { device, os, browser, screen, lang } = getDeviceInfo();
    const geo     = await getIPInfo();
    const todayStr = TODAY();
    const isGuest = !profile || profile.type === 'guest' || profile.email === 'guest@local';

    const ref  = doc(db, COL, vid);
    const snap = await getDoc(ref);

    const base = {
      vid,
      type:           isGuest ? 'guest' : 'google',
      name:           profile?.name  || 'Guest',
      email:          profile?.email || 'guest@local',
      avatar:         profile?.avatar || '',
      ip:             geo.ip,
      country:        geo.country,
      city:           geo.city,
      device,
      os,
      browser,
      screen,
      lang,
      lastSeen:       serverTimestamp(),
      lastActiveDate: todayStr,
      ...(settings?.category ? { category: settings.category } : {}),
      ...(settings?.region   ? { region:   settings.region   } : {}),
      ...(settings?.gender   ? { gender:   settings.gender   } : {}),
    };

    if (!snap.exists()) {
      await setDoc(ref, {
        ...base,
        firstSeen:    serverTimestamp(),
        sessionCount: 1,
      });
    } else {
      await setDoc(ref, {
        ...base,
        sessionCount: increment(1),
      }, { merge: true });
    }

    // Update global stats counter
    try {
      const statsRef = doc(db, 'ksp_stats', 'global');
      const statsSnap = await getDoc(statsRef);
      if (!statsSnap.exists()) {
        await setDoc(statsRef, { totalVisitors: 1, lastUpdated: serverTimestamp() });
      } else {
        await setDoc(statsRef, { totalVisitors: increment(1), lastUpdated: serverTimestamp() }, { merge: true });
      }
    } catch { /* silent */ }

  } catch (e) {
    console.warn('trackVisitor failed:', e);
  }
}

// ── Admin: fetch ALL visitors (one-time) ──────────────────────────────────────
export async function getAllVisitors(): Promise<VisitorRecord[]> {
  try {
    const snap = await getDocs(collection(db, COL));
    const today = TODAY();
    return snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        todayActive: data.lastActiveDate === today,
      } as VisitorRecord;
    }).sort((a, b) => {
      const at = (a.lastSeen as Timestamp)?.toMillis?.() ?? 0;
      const bt = (b.lastSeen as Timestamp)?.toMillis?.() ?? 0;
      return bt - at;
    });
  } catch (e) {
    console.warn('getAllVisitors failed:', e);
    return [];
  }
}

// ── Admin: real-time listener (onSnapshot) ─────────────────────────────────────
export function subscribeVisitors(
  callback: (visitors: VisitorRecord[]) => void
): () => void {
  const today = TODAY();
  const unsubscribe = onSnapshot(
    collection(db, COL),
    (snap) => {
      const visitors = snap.docs.map(d => ({
        ...d.data(),
        todayActive: d.data().lastActiveDate === today,
      }) as VisitorRecord).sort((a, b) => {
        const at = (a.lastSeen as Timestamp)?.toMillis?.() ?? 0;
        const bt = (b.lastSeen as Timestamp)?.toMillis?.() ?? 0;
        return bt - at;
      });
      callback(visitors);
    },
    (err) => console.warn('subscribeVisitors error:', err)
  );
  return unsubscribe;
}
