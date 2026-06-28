// src/lib/physicalData.ts
// Official KSP CPC Physical Standards (2024 Notification)
import type { UserSettings } from './storage';

export interface PhysicalRequirements {
  heightCm: number;
  chestNormal?: number;     // male only
  chestExpanded?: number;   // male only
  weightKg?: number;        // female only
  eyesight: string;
  run: string;
  longJump: string;
  shotPut: string;
  notes: string[];
}

// Categorise into two groups for height lookup
function catGroup(cat: UserSettings['category']): 'SC_ST' | 'GEN_OBC' {
  return (cat === 'SC' || cat === 'ST') ? 'SC_ST' : 'GEN_OBC';
}

// Full lookup table — [region][catGroup][gender]
const TABLE: Record<string, Record<string, Record<string, PhysicalRequirements>>> = {
  NKK: {
    GEN_OBC: {
      M: {
        heightCm: 168,
        chestNormal: 81, chestExpanded: 86,
        eyesight: '6/6 in one eye, 6/9 in other (without glasses)',
        run: '1600m in 8 min 30 sec',
        longJump: '3.65 m (minimum)',
        shotPut: '7.26 kg shot — 5.60 m',
        notes: [
          'Flat foot / knock knee will disqualify',
          'No visible tattoo (except small wrist/forearm)',
          'Minimum age 18, maximum 25 (relaxation for reserved)',
        ],
      },
      F: {
        heightCm: 157,
        weightKg: 45,
        eyesight: '6/6 in one eye, 6/9 in other (without glasses)',
        run: '800m in 5 min 00 sec',
        longJump: '2.75 m (minimum)',
        shotPut: '4 kg shot — 3.75 m',
        notes: [
          'No visible tattoo (except small wrist/forearm)',
          'Minimum age 18, maximum 25 (relaxation for reserved)',
          'Pregnant candidates cannot appear for PET',
        ],
      },
    },
    SC_ST: {
      M: {
        heightCm: 165,
        chestNormal: 80, chestExpanded: 85,
        eyesight: '6/6 in one eye, 6/9 in other (without glasses)',
        run: '1600m in 8 min 30 sec',
        longJump: '3.50 m (minimum)',
        shotPut: '7.26 kg shot — 5.60 m',
        notes: [
          'Flat foot / knock knee will disqualify',
          'No visible tattoo (except small wrist/forearm)',
        ],
      },
      F: {
        heightCm: 155,
        weightKg: 43,
        eyesight: '6/6 in one eye, 6/9 in other (without glasses)',
        run: '800m in 5 min 00 sec',
        longJump: '2.75 m (minimum)',
        shotPut: '4 kg shot — 3.75 m',
        notes: [
          'No visible tattoo (except small wrist/forearm)',
          'Minimum age 18, maximum 25 (relaxation for reserved)',
        ],
      },
    },
  },
  KK: {
    GEN_OBC: {
      M: {
        heightCm: 165,
        chestNormal: 79, chestExpanded: 84,
        eyesight: '6/6 in one eye, 6/9 in other (without glasses)',
        run: '1600m in 8 min 30 sec',
        longJump: '3.50 m (minimum)',
        shotPut: '7.26 kg shot — 5.60 m',
        notes: [
          'KK region (Hyderabad-Karnataka) — 3 cm relaxation in height',
          'Flat foot / knock knee will disqualify',
        ],
      },
      F: {
        heightCm: 155,
        weightKg: 43,
        eyesight: '6/6 in one eye, 6/9 in other (without glasses)',
        run: '800m in 5 min 00 sec',
        longJump: '2.75 m (minimum)',
        shotPut: '4 kg shot — 3.75 m',
        notes: ['KK region — 2 cm height relaxation for female candidates'],
      },
    },
    SC_ST: {
      M: {
        heightCm: 162,
        chestNormal: 78, chestExpanded: 83,
        eyesight: '6/6 in one eye, 6/9 in other (without glasses)',
        run: '1600m in 8 min 30 sec',
        longJump: '3.35 m (minimum)',
        shotPut: '7.26 kg shot — 5.60 m',
        notes: ['KK region + SC/ST — combined height relaxation applies'],
      },
      F: {
        heightCm: 153,
        weightKg: 41,
        eyesight: '6/6 in one eye, 6/9 in other (without glasses)',
        run: '800m in 5 min 00 sec',
        longJump: '2.75 m (minimum)',
        shotPut: '4 kg shot — 3.75 m',
        notes: ['KK region + SC/ST — combined relaxation applies'],
      },
    },
  },
};

export function getPhysicalRequirements(settings: UserSettings): PhysicalRequirements {
  const group = catGroup(settings.category);
  return TABLE[settings.region]?.[group]?.[settings.gender]
    ?? TABLE.NKK.GEN_OBC.M; // safe fallback
}
