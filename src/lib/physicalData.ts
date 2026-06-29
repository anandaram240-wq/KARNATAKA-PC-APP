// src/lib/physicalData.ts
// Official KSP CPC Physical Standards (As per latest KSP/KEA 2026 Notification Circular)
import type { UserSettings } from './storage';

export interface PhysicalRequirements {
  heightCm: number;
  chestNormal?: number;     // male only
  chestExpanded?: number;   // male only
  weightKg?: number;        // female only
  eyesight: string;
  run: string;
  longJump: string;
  highJump: string;
  shotPut: string;
  notes: string[];
}

export function getPhysicalRequirements(settings: UserSettings): PhysicalRequirements {
  const isMale = settings.gender === 'M';

  if (isMale) {
    return {
      heightCm: 168,
      chestNormal: 81,
      chestExpanded: 86,
      eyesight: '6/6 in one eye, 6/9 in other (without glasses)',
      run: '1600 meters in 6 minutes 30 seconds',
      longJump: 'Minimum 3.80 meters (max 3 attempts)',
      highJump: 'Minimum 1.20 meters (max 3 attempts)',
      shotPut: '7.26 kg shot — 5.60 meters (max 3 attempts)',
      notes: [
        'Height standard of 168 cm applies to General, OBC, SC, and ST candidates alike.',
        'Special height relaxation of 155 cm is applicable ONLY to tribal forest candidates of Karnataka.',
        'Special chest relaxation (75 cm normal / 80 cm expanded) is applicable ONLY to tribal forest candidates.',
        'Flat foot, knock knee, or squint eye will lead to disqualification in medical test.',
        'No visible tattoo permitted except small religious/traditional symbols on inner forearm/wrist.'
      ]
    };
  } else {
    return {
      heightCm: 157,
      weightKg: 45,
      eyesight: '6/6 in one eye, 6/9 in other (without glasses)',
      run: '400 meters in 2 minutes 00 seconds',
      longJump: 'Minimum 2.50 meters (max 3 attempts)',
      highJump: 'Minimum 0.90 meters (max 3 attempts)',
      shotPut: '4 kg shot — 3.75 meters (max 3 attempts)',
      notes: [
        'Height standard of 157 cm and weight of 45 kg apply to General, OBC, SC, and ST candidates alike.',
        'Special height relaxation of 150 cm is applicable ONLY to tribal forest candidates of Karnataka.',
        'Pregnant candidates are not permitted to participate in the physical endurance tests (PET).',
        'No visible tattoo permitted except small religious/traditional symbols on inner forearm/wrist.'
      ]
    };
  }
}
