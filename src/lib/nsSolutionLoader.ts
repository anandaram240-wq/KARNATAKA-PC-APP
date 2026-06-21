// src/lib/nsSolutionLoader.ts
// Fetches Number System practice solutions from public/ns_solutions_batch*.json
// and returns a map of { id -> solution string } for use in SolutionDisplay.

const BATCH_COUNT = 15;
let cached: Map<number, string> | null = null;
let loadPromise: Promise<Map<number, string>> | null = null;

export async function loadNSSolutions(): Promise<Map<number, string>> {
  if (cached) return cached;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const map = new Map<number, string>();
    const fetches = Array.from({ length: BATCH_COUNT }, (_, i) =>
      fetch(`/ns_solutions_batch${i + 1}.json`)
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
    );
    const results = await Promise.all(fetches);
    for (const batch of results) {
      if (Array.isArray(batch)) {
        for (const q of batch) {
          if (q?.id && q?.solution) {
            map.set(q.id, q.solution);
          }
        }
      }
    }
    cached = map;
    return map;
  })();

  return loadPromise;
}

/** Sync lookup — returns null if not yet loaded or not found */
export function getNSSolution(id: number): string | null {
  return cached?.get(id) ?? null;
}

/** Returns true if the id is in the NS practice batch range */
export function isNSPracticeId(id: number): boolean {
  return id >= 5001 && id <= 5150;
}
