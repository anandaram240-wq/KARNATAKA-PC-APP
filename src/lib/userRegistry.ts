// src/lib/userRegistry.ts
// Tracks every user who logs in via Firestore — powers the admin analytics dashboard

import { db } from './firebase';
import {
  doc, setDoc, getDoc, collection, getDocs,
  serverTimestamp, increment, Timestamp,
} from 'firebase/firestore';

export interface RegistryUser {
  uid: string;          // email-based id
  name: string;
  email: string;
  avatar: string;
  registeredAt: Timestamp | null;
  lastActiveAt: Timestamp | null;
  totalSessions: number;
  todayActive: boolean; // computed client-side
  category?: string;
  region?: string;
  gender?: string;
}

const USERS_COL = 'ksp_users';

function todayStr() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function safeId(email: string) {
  return email.toLowerCase().replace(/[@.]/g, '_').replace(/[^a-z0-9_]/g, '').substring(0, 100);
}

/** Called on every login / app open — upserts user record */
export async function registerUserActivity(profile: {
  name: string; email: string; avatar: string;
}, settings?: { category?: string; region?: string; gender?: string }) {
  try {
    const id  = safeId(profile.email);
    const ref = doc(db, USERS_COL, id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // First-time registration
      await setDoc(ref, {
        uid:           id,
        name:          profile.name,
        email:         profile.email,
        avatar:        profile.avatar,
        registeredAt:  serverTimestamp(),
        lastActiveAt:  serverTimestamp(),
        totalSessions: 1,
        lastActiveDate: todayStr(),
        category:      settings?.category ?? 'General',
        region:        settings?.region   ?? 'NKK',
        gender:        settings?.gender   ?? 'M',
      });
    } else {
      // Update existing
      await setDoc(ref, {
        name:           profile.name,
        avatar:         profile.avatar,
        lastActiveAt:   serverTimestamp(),
        totalSessions:  increment(1),
        lastActiveDate: todayStr(),
        ...(settings?.category ? { category: settings.category } : {}),
        ...(settings?.region   ? { region:   settings.region   } : {}),
        ...(settings?.gender   ? { gender:   settings.gender   } : {}),
      }, { merge: true });
    }
  } catch (e) {
    console.warn('userRegistry: write failed', e);
  }
}

/** Admin only — fetch all users from Firestore */
export async function getAllUsersAdmin(): Promise<RegistryUser[]> {
  try {
    const snap = await getDocs(collection(db, USERS_COL));
    const today = todayStr();
    return snap.docs.map(d => {
      const data = d.data();
      return {
        uid:           data.uid,
        name:          data.name,
        email:         data.email,
        avatar:        data.avatar ?? '',
        registeredAt:  data.registeredAt ?? null,
        lastActiveAt:  data.lastActiveAt ?? null,
        totalSessions: data.totalSessions ?? 1,
        todayActive:   data.lastActiveDate === today,
        category:      data.category ?? 'General',
        region:        data.region   ?? 'NKK',
        gender:        data.gender   ?? 'M',
      } as RegistryUser;
    }).sort((a, b) => {
      const at = a.lastActiveAt?.toMillis() ?? 0;
      const bt = b.lastActiveAt?.toMillis() ?? 0;
      return bt - at;
    });
  } catch (e) {
    console.warn('userRegistry: read failed', e);
    return [];
  }
}
