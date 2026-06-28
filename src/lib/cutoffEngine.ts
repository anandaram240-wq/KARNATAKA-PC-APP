// src/lib/cutoffEngine.ts
// Derives personalised target cutoff from user's saved settings + historical data
import rawCutoffs from '../data/cutoffs.json';
import type { UserSettings } from './storage';

interface CutoffRow {
  year: number;
  region: string;
  cutoffs: Record<string, number> | null;
  topperScore?: number;
  rank500Score?: number;
}

const rows = rawCutoffs as unknown as CutoffRow[];

/** Build cutoff key from settings e.g. "General_M", "OBC_2A_F" */
export function cutoffKey(settings: UserSettings): string {
  const cat = settings.category.replace(/ /g, '_'); // already underscore-safe
  return `${cat}_${settings.gender}`;
}

/** Get the latest NKK cutoff for user's category */
export function getLatestCutoff(settings: UserSettings): {
  cutoff: number;
  target: number;
  safeZone: number;
  year: number;
  key: string;
} {
  const key = cutoffKey(settings);
  // Filter by region (use NKK as baseline for KK since KK is usually +2-3 marks lower)
  const sorted = [...rows]
    .filter(r => r.cutoffs != null)
    .sort((a, b) => b.year - a.year);

  const latest = sorted[0];
  let cutoff = latest?.cutoffs?.[key] ?? 68;

  // KK region has ~3 marks lower cutoff historically
  if (settings.region === 'KK') cutoff = Math.max(40, cutoff - 3);

  const target   = cutoff + 5;   // safe zone = cutoff + 5
  const safeZone = cutoff + 10;  // comfortable = cutoff + 10

  return { cutoff, target, safeZone, year: latest?.year ?? 2023, key };
}

/** Get trend across years for a category */
export function getCutoffTrend(settings: UserSettings): Array<{ year: number; cutoff: number }> {
  const key = cutoffKey(settings);
  return rows
    .filter(r => r.cutoffs != null)
    .sort((a, b) => a.year - b.year)
    .map(r => ({
      year: r.year,
      cutoff: settings.region === 'KK'
        ? Math.max(40, (r.cutoffs![key] ?? 65) - 3)
        : (r.cutoffs![key] ?? 65),
    }));
}

/** All categories with cutoffs for a given year */
export function getAllCutoffs(year?: number): Record<string, number> {
  const row = year
    ? rows.find(r => r.year === year && r.cutoffs)
    : rows.filter(r => r.cutoffs).sort((a, b) => b.year - a.year)[0];
  return row?.cutoffs ?? {};
}
