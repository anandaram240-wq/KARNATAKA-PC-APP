import { db } from './firebase';
import {
  doc, setDoc, getDoc, collection, getDocs, writeBatch,
  serverTimestamp, increment, Timestamp, query, orderBy, limit, onSnapshot
} from 'firebase/firestore';
import type { AnsweredQuestion, TestResult, StreakData, UserSettings } from './storage';

const USERS_COL = 'ksp_users';

function safeId(email: string): string {
  return email.toLowerCase().replace(/[@.]/g, '_').replace(/[^a-z0-9_]/g, '').substring(0, 100);
}

// Helper to get client info for user updates
function getClientDetails() {
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

// Fetch IP + Location
async function getIPInfo(): Promise<{ ip: string; country: string; city: string }> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    const d = await res.json();
    return { ip: d.ip || '?', country: d.country_name || '?', city: d.city || '?' };
  } catch {
    try {
      const r2 = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
      const d2 = await r2.json();
      return { ip: d2.ip || '?', country: '?', city: '?' };
    } catch {
      return { ip: '?', country: '?', city: '?' };
    }
  }
}

/**
 * Pushes all current local data (settings, streak, answers, tests) to Firestore.
 * Used upon Google login to sync the user's progress.
 */
export async function pushLocalToFirestore(email: string, profile: { name: string; avatar: string }) {
  try {
    const uid = safeId(email);
    const userRef = doc(db, USERS_COL, uid);

    // Read local cache
    const localSettings: UserSettings = JSON.parse(localStorage.getItem('ksp_settings') || '{"category":"General","region":"NKK","gender":"M"}');
    const localStreak: StreakData = JSON.parse(localStorage.getItem('ksp_streak') || '{"current":0,"best":0,"lastDate":"","days":[]}');
    const localAnswered: Record<string, AnsweredQuestion> = JSON.parse(localStorage.getItem('ksp_answered') || '{}');
    const localTests: TestResult[] = JSON.parse(localStorage.getItem('ksp_tests') || '[]');

    // Calculate aggregated stats
    const answersList = Object.values(localAnswered);
    const totalAttempted = answersList.length;
    const totalCorrect = answersList.filter(a => a.correct).length;
    const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    const client = getClientDetails();
    const geo = await getIPInfo();

    const userSnap = await getDoc(userRef);
    const sessionCount = userSnap.exists() ? (userSnap.data().sessionCount || 0) + 1 : 1;

    const userData = {
      uid,
      name: profile.name,
      email,
      avatar: profile.avatar,
      category: localSettings.category,
      region: localSettings.region,
      gender: localSettings.gender,
      totalAttempted,
      totalCorrect,
      accuracy,
      streakCurrent: localStreak.current,
      streakBest: localStreak.best,
      activityDays: localStreak.days,
      testsCount: localTests.length,
      avgTestScore: localTests.length ? Math.round(localTests.reduce((acc, t) => acc + (t.score / t.total) * 100, 0) / localTests.length) : 0,
      ip: geo.ip,
      country: geo.country,
      city: geo.city,
      ...client,
      lastSeen: serverTimestamp(),
      sessionCount,
      type: 'google'
    };

    if (!userSnap.exists()) {
      (userData as any).firstSeen = serverTimestamp();
    }

    await setDoc(userRef, userData, { merge: true });

    // Sync all answered questions in batches
    if (totalAttempted > 0) {
      const batch = writeBatch(db);
      Object.entries(localAnswered).forEach(([qid, ans]) => {
        const ansRef = doc(db, USERS_COL, uid, 'answered', qid);
        batch.set(ansRef, {
          qid: parseInt(qid),
          correct: ans.correct,
          ts: ans.ts,
          timeSec: ans.timeSec || 0
        });
      });
      await batch.commit();
    }

    // Sync all tests in batches
    if (localTests.length > 0) {
      const batch = writeBatch(db);
      localTests.forEach(test => {
        const testRef = doc(db, USERS_COL, uid, 'tests', test.id);
        batch.set(testRef, {
          id: test.id,
          type: test.type,
          label: test.label,
          date: test.date,
          score: test.score,
          total: test.total,
          timeSec: test.timeSec,
          breakdown: test.breakdown
        });
      });
      await batch.commit();
    }

  } catch (e) {
    console.error('pushLocalToFirestore error:', e);
  }
}

/**
 * Pulls all user data from Firestore and updates localStorage.
 * Used upon login to restore progress on a new device.
 */
export async function pullUserDataFromFirestore(email: string) {
  try {
    const uid = safeId(email);
    
    // 1. Get user profile & stats
    const userRef = doc(db, USERS_COL, uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      
      const settings: UserSettings = {
        category: data.category || 'General',
        region: data.region || 'NKK',
        gender: data.gender || 'M'
      };
      localStorage.setItem('ksp_settings', JSON.stringify(settings));

      const streak: StreakData = {
        current: data.streakCurrent || 0,
        best: data.streakBest || 0,
        lastDate: data.activityDays?.[data.activityDays.length - 1] || '',
        days: data.activityDays || []
      };
      localStorage.setItem('ksp_streak', JSON.stringify(streak));
    }

    // 2. Fetch all answered questions
    const answersSnap = await getDocs(collection(db, USERS_COL, uid, 'answered'));
    const answered: Record<number, AnsweredQuestion> = {};
    answersSnap.forEach(d => {
      const data = d.data();
      answered[data.qid] = {
        correct: data.correct,
        ts: data.ts || Date.now(),
        timeSec: data.timeSec || 0
      };
    });
    localStorage.setItem('ksp_answered', JSON.stringify(answered));

    // 3. Fetch all tests (max 50)
    const q = query(collection(db, USERS_COL, uid, 'tests'), orderBy('date', 'desc'), limit(50));
    const testsSnap = await getDocs(q);
    const tests: TestResult[] = [];
    testsSnap.forEach(d => {
      const data = d.data();
      tests.push({
        id: data.id,
        type: data.type,
        label: data.label,
        date: data.date,
        score: data.score,
        total: data.total,
        timeSec: data.timeSec,
        breakdown: data.breakdown || {},
        answers: {} // omit answers list to save storage/bandwidth
      });
    });
    localStorage.setItem('ksp_tests', JSON.stringify(tests));

  } catch (e) {
    console.error('pullUserDataFromFirestore error:', e);
  }
}

/**
 * Real-time updates for answering a question.
 * Writes to both local cache and Firestore.
 */
export async function syncAnswer(email: string, qid: number, correct: boolean, timeSec: number, subject: string) {
  try {
    const uid = safeId(email);
    const userRef = doc(db, USERS_COL, uid);

    // Save answer doc
    const ansRef = doc(db, USERS_COL, uid, 'answered', qid.toString());
    await setDoc(ansRef, {
      qid,
      correct,
      ts: Date.now(),
      timeSec,
      subject
    });

    // Update aggregate counts
    const updatePayload: Record<string, any> = {
      totalAttempted: increment(1),
      totalCorrect: correct ? increment(1) : increment(0),
      lastSeen: serverTimestamp()
    };

    if (subject) {
      const safeSubj = subject.replace(/\./g, '_');
      updatePayload[`subjectStats.${safeSubj}.attempted`] = increment(1);
      if (correct) {
        updatePayload[`subjectStats.${safeSubj}.correct`] = increment(1);
      }
    }

    await setDoc(userRef, updatePayload, { merge: true });

    // Read user stats to update accuracy field
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const uData = userSnap.data();
      const attempted = uData.totalAttempted || 0;
      const cor = uData.totalCorrect || 0;
      const acc = attempted > 0 ? Math.round((cor / attempted) * 100) : 0;
      await setDoc(userRef, { accuracy: acc }, { merge: true });
    }

  } catch (e) {
    console.warn('syncAnswer failed:', e);
  }
}

/**
 * Real-time updates for saving a test result.
 */
export async function syncTest(email: string, test: TestResult) {
  try {
    const uid = safeId(email);
    const testRef = doc(db, USERS_COL, uid, 'tests', test.id);
    await setDoc(testRef, {
      id: test.id,
      type: test.type,
      label: test.label,
      date: test.date,
      score: test.score,
      total: test.total,
      timeSec: test.timeSec,
      breakdown: test.breakdown
    });

    // Update user stats
    const userRef = doc(db, USERS_COL, uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const uData = userSnap.data();
      const newCount = (uData.testsCount || 0) + 1;
      const currentAvg = uData.avgTestScore || 0;
      // Recalculate average test score
      const newAvg = Math.round(((currentAvg * (newCount - 1)) + ((test.score / test.total) * 100)) / newCount);
      await setDoc(userRef, {
        testsCount: newCount,
        avgTestScore: newAvg,
        lastSeen: serverTimestamp()
      }, { merge: true });
    }
  } catch (e) {
    console.warn('syncTest failed:', e);
  }
}

/**
 * Real-time updates for streak data.
 */
export async function syncStreak(email: string, streak: StreakData) {
  try {
    const uid = safeId(email);
    const userRef = doc(db, USERS_COL, uid);
    await setDoc(userRef, {
      streakCurrent: streak.current,
      streakBest: streak.best,
      activityDays: streak.days,
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn('syncStreak failed:', e);
  }
}

/**
 * Real-time updates for user settings.
 */
export async function syncSettings(email: string, settings: UserSettings) {
  try {
    const uid = safeId(email);
    const userRef = doc(db, USERS_COL, uid);
    await setDoc(userRef, {
      category: settings.category,
      region: settings.region,
      gender: settings.gender,
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn('syncSettings failed:', e);
  }
}

/**
 * Global Real-time Visitor Tracking merged with profile information
 */
export async function trackVisitorLive(profile: { name: string; email: string; avatar: string }) {
  try {
    const uid = safeId(profile.email);
    const userRef = doc(db, USERS_COL, uid);
    const client = getClientDetails();
    const geo = await getIPInfo();
    const todayStr = new Date().toISOString().split('T')[0];

    const userSnap = await getDoc(userRef);
    const sessionCount = userSnap.exists() ? (userSnap.data().sessionCount || 0) + 1 : 1;

    const payload = {
      uid,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar,
      ip: geo.ip,
      country: geo.country,
      city: geo.city,
      ...client,
      lastSeen: serverTimestamp(),
      lastActiveDate: todayStr,
      sessionCount,
      type: 'google'
    };

    const update: any = { ...payload };
    if (!userSnap.exists()) {
      update.firstSeen = serverTimestamp();
      update.totalAttempted = 0;
      update.totalCorrect = 0;
      update.accuracy = 0;
      update.streakCurrent = 0;
      update.streakBest = 0;
      update.activityDays = [];
      update.testsCount = 0;
      update.avgTestScore = 0;
    }

    await setDoc(userRef, update, { merge: true });

    // Update global stats
    try {
      const statsRef = doc(db, 'ksp_stats', 'global');
      const statsSnap = await getDoc(statsRef);
      if (!statsSnap.exists()) {
        await setDoc(statsRef, { totalVisitors: 1, lastUpdated: serverTimestamp() });
      } else {
        await setDoc(statsRef, { totalVisitors: increment(1), lastUpdated: serverTimestamp() }, { merge: true });
      }
    } catch {}

  } catch (e) {
    console.warn('trackVisitorLive error:', e);
  }
}

export function subscribeUsersLive(
  callback: (users: any[]) => void
): () => void {
  const today = new Date().toISOString().split('T')[0];
  const unsubscribe = onSnapshot(
    collection(db, USERS_COL),
    (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          todayActive: data.lastActiveDate === today,
        };
      }).sort((a: any, b: any) => {
        const at = (a.lastSeen as Timestamp)?.toMillis?.() ?? 0;
        const bt = (b.lastSeen as Timestamp)?.toMillis?.() ?? 0;
        return bt - at;
      });
      callback(list);
    },
    (err) => console.warn('subscribeUsersLive error:', err)
  );
  return unsubscribe;
}
