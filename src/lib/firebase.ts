/**
 * Firebase — Cross-Device Performance Sync
 * Project: rrb-group-d-mastery
 * 
 * Uses email as the Firestore document key.
 * No Firebase Auth required — works immediately.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            "AIzaSyAsKw4a1W3S2V_8C3Cht2f7pRRe5K7ZoCo",
  authDomain:        "kps-pc-70582.firebaseapp.com",
  projectId:         "kps-pc-70582",
  storageBucket:     "kps-pc-70582.firebasestorage.app",
  messagingSenderId: "286522403445",
  appId:             "1:286522403445:web:3d95f890524e7dd06a663c",
  measurementId:     "G-QQ375LGX9W",
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * Convert email to a safe Firestore document ID.
 * e.g. ananda@gmail.com → ananda_gmail_com
 */
export function emailToDocId(email: string): string {
  return email.toLowerCase()
    .replace(/[@.]/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 100);
}
