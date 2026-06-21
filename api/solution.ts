// api/solution.ts — Beast Solution Engine
// Maths: GIVEN + FORMULA + STEPS + SPEED TRICK + EXAM TIP
// Reasoning: 6 sub-types (Direction, Blood, Coding, Series, Syllogism, Puzzle)
// GK + Science: Direct answer — no energy wasted

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama3-70b-8192',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

// ── Subject / reasoning sub-type detection ────────────────────────────────────
type SolutionType = 'maths' | 'direction' | 'blood' | 'coding' | 'series' | 'syllogism' | 'puzzle' | 'reasoning' | 'simple';

function detectType(subject = '', topic = ''): SolutionType {
  const s = subject.toLowerCase();
  const t = topic.toLowerCase();

  if (/math|arithmetic|algebra|geometry|mensuration|trigonometry|number system|percentage|profit|loss|interest|ratio|proportion|lcm|hcf|speed|distance|time|work/i.test(s + ' ' + t)) return 'maths';

  if (/direction|compass|north|south|east|west|displacement/i.test(t)) return 'direction';
  if (/blood|relation|family/i.test(t)) return 'blood';
  if (/cod(ing|e)|decod/i.test(t)) return 'coding';
  if (/series|sequence|pattern|next term|missing number|missing letter/i.test(t)) return 'series';
  if (/syllogism|statement|conclusion|venn/i.test(t)) return 'syllogism';
  if (/seating|sitting|arrangement|rank|position|puzzle|order/i.test(t)) return 'puzzle';
  if (/reasoning|logic/i.test(s)) return 'reasoning';

  return 'simple'; // GK + Science
}

// ── PROMPT BUILDERS ───────────────────────────────────────────────────────────

function optList(options: string[]) {
  return options.map((o, i) => `${['A','B','C','D'][i]}) ${o}`).join('\n');
}

// ── 1. MATHS ──────────────────────────────────────────────────────────────────
function mathsPrompt(q: string, options: string[], ans: number, topic: string): string {
  const L = ['A','B','C','D'];
  const correct = options[ans] ?? '';
  return `You are an expert RRB Group D maths teacher. PLAIN TEXT ONLY — no asterisks, no markdown bold.

Question: ${q}
Options:
${optList(options)}
Correct Answer: ${L[ans]}) ${correct}
Topic: ${topic}

Write EXACTLY in this format:

━━━ GIVEN ━━━
[List every value from the question with its label — one per line]
[e.g. Principal (P) = 5000, Rate (R) = 8%, Time (T) = 3 years]

━━━ FORMULA ━━━
[Write the formula name and the formula]
[e.g. Simple Interest = (P × R × T) / 100]

━━━ SOLUTION ━━━
STEP 1 | [Action name]
[Show calculation with ACTUAL NUMBERS. Max 15 words.]

STEP 2 | [Action name]
[Show calculation with ACTUAL NUMBERS. Max 15 words.]

STEP 3 | [Final step — only if needed]
[Final calculation and result. Max 15 words.]

∴ ANSWER: ${correct} (Option ${L[ans]})

━━━ SPEED TRICK ━━━
⚡ [Show the fastest 1-line shortcut calculation using actual numbers. Max 20 words.]

━━━ EXAM TIP ━━━
[One line tip for RRB Group D — how this topic appears in exam. Max 20 words.]

STRICT RULES:
1. No *, no **, no bold, no markdown.
2. Every step must show actual numbers.
3. Keep all text extremely short. Do not write paragraphs or repeating explanations.`;
}

// ── 2. DIRECTION SENSE ────────────────────────────────────────────────────────
function directionPrompt(q: string, options: string[], ans: number, topic: string): string {
  const L = ['A','B','C','D'];
  const correct = options[ans] ?? '';
  return `You are an RS Aggarwal-style reasoning expert for RRB Group D. PLAIN TEXT ONLY.

Question: ${q}
Options:
${optList(options)}
Correct Answer: ${L[ans]}) ${correct}
Topic: ${topic}

Write EXACTLY in this format:

━━━ MOVEMENT TRACE ━━━
MOVE 1 | [direction and distance] → reach Point [X]
MOVE 2 | [direction and distance] → reach Point [Y]
[Continue for all moves. Max 15 words per line.]

━━━ PATH CHAIN ━━━
[Represent the path as a simple chain on one line, e.g. Start ──(5m North)──> A ──(10m East)──> End (B)]

━━━ CALCULATION ━━━
[Show the calculation steps for distance/direction. Max 20 words.]

∴ ANSWER: ${correct} (Option ${L[ans]})

━━━ SPEED TRICK ━━━
⚡ [Show the net displacement/coordinate shortcut. Max 20 words.]

STRICT RULES:
1. No *, no **, no bold, no markdown.
2. Keep everything extremely concise. Do not repeat sentences or write long explanations.`;
}

// ── 3. BLOOD RELATIONS ────────────────────────────────────────────────────────
function bloodPrompt(q: string, options: string[], ans: number, topic: string): string {
  const L = ['A','B','C','D'];
  const correct = options[ans] ?? '';
  return `You are an RS Aggarwal-style reasoning expert for RRB Group D. PLAIN TEXT ONLY.

Question: ${q}
Options:
${optList(options)}
Correct Answer: ${L[ans]}) ${correct}
Topic: ${topic}

Write EXACTLY in this format:

━━━ DECODE CLUES ━━━
Clue 1: "[exact quote]" → [Person A] is [relation] of [Person B]
Clue 2: "[exact quote]" → [Person C] is [relation] of [Person D]
[Continue for all clues. Max 15 words per line.]

━━━ FAMILY TREE ━━━
[Show the family tree as a clean nested text list with indentation using ├── and └──, e.g.:
Grandparent
 └── Parent (Male) ══ Spouse (Female)
      └── Child (Male)]

━━━ CHAIN REASONING ━━━
STEP 1: [First deduction from clues. Max 15 words.]
STEP 2: [Second deduction. Max 15 words.]
STEP 3: [Final relationship conclusion. Max 15 words.]

∴ ANSWER: ${correct} (Option ${L[ans]})

STRICT RULES:
1. No *, no **, no bold, no markdown.
2. Keep explanations very short. Never repeat sentences or write long paragraphs.`;
}

// ── 4. CODING-DECODING ────────────────────────────────────────────────────────
function codingPrompt(q: string, options: string[], ans: number, topic: string): string {
  const L = ['A','B','C','D'];
  const correct = options[ans] ?? '';
  return `You are an RS Aggarwal-style reasoning expert for RRB Group D. PLAIN TEXT ONLY.

Question: ${q}
Options:
${optList(options)}
Correct Answer: ${L[ans]}) ${correct}
Topic: ${topic}

Write EXACTLY in this format:

━━━ PATTERN ANALYSIS ━━━
Letter:   [Show original letters separated by spaces, e.g. C  A  T]
Position: [Show original positions separated by spaces, e.g. 3  1  20]
Rule:     [Show the transformation, e.g. +2 to each position]
Pattern confirmed: [State rule in 1 sentence]

━━━ APPLY TO TARGET ━━━
[Show the transformation letter by letter, e.g.:
D(4) + 2 → F(6)
O(15) + 2 → Q(17)
G(7) + 2 → I(9)]
Result: [WORD] → [CODED WORD]

∴ ANSWER: ${correct} (Option ${L[ans]})

STRICT RULES:
1. No *, no **, no bold, no markdown.
2. Do not write the full A-Z alphabet chart in your response. Keep explanations extremely short.`;
}

// ── 5. NUMBER/LETTER SERIES ───────────────────────────────────────────────────
function seriesPrompt(q: string, options: string[], ans: number, topic: string): string {
  const L = ['A','B','C','D'];
  const correct = options[ans] ?? '';
  return `You are an RS Aggarwal-style reasoning expert for RRB Group D. PLAIN TEXT ONLY.

Question: ${q}
Options:
${optList(options)}
Correct Answer: ${L[ans]}) ${correct}
Topic: ${topic}

Write EXACTLY in this format:

━━━ SERIES ━━━
[Show the series, e.g. 5, 10, 17, 26, ?]

━━━ PATTERN ANALYSIS ━━━
Terms: [t1]  [t2]  [t3]  [t4]  [t5]
Differences: [d1]  [d2]  [d3]  [d4] (e.g. +5, +7, +9, +11)
Pattern: [Describe the mathematical rule, e.g. consecutive odd numbers. Max 15 words.]

━━━ FIND MISSING TERM ━━━
STEP 1: [Calculate the next difference or step. Max 15 words.]
STEP 2: [Apply it to get the final term. Max 15 words.]

∴ ANSWER: ${correct} (Option ${L[ans]})

━━━ SPEED TRICK ━━━
⚡ [Short mathematical formula or pattern rule if applicable. Max 20 words.]

STRICT RULES:
1. No *, no **, no bold, no markdown.
2. Keep explanations extremely short. Do not repeat sentences.`;
}

// ── 6. SYLLOGISM ──────────────────────────────────────────────────────────────
function syllogismPrompt(q: string, options: string[], ans: number, topic: string): string {
  const L = ['A','B','C','D'];
  const correct = options[ans] ?? '';
  return `You are an RS Aggarwal-style reasoning expert for RRB Group D. PLAIN TEXT ONLY.

Question: ${q}
Options:
${optList(options)}
Correct Answer: ${L[ans]}) ${correct}
Topic: ${topic}

Write EXACTLY in this format:

━━━ STATEMENTS ━━━
1. [Statement 1]
2. [Statement 2]
[List all statements]

━━━ SET RELATIONSHIPS ━━━
[Represent statements using clean set notation:
e.g.
All Dogs are Animals → [Dogs] ⊂ [Animals]
Some Cats are Animals → [Cats] ∩ [Animals] ≠ ∅
No Dogs are Cats → [Dogs] ∩ [Cats] = ∅]

━━━ CHECK EACH CONCLUSION ━━━
Conclusion I: "[text]" → [True/False] because [1-sentence reason]
Conclusion II: "[text]" → [True/False] because [1-sentence reason]

∴ ANSWER: ${correct} (Option ${L[ans]})

━━━ GOLDEN RULES ━━━
⚡ [1-sentence logical syllogism rule. Max 20 words.]

STRICT RULES:
1. No *, no **, no bold, no markdown.
2. Keep everything extremely short. Max 15 words per conclusion check.`;
}

// ── 7. SEATING/RANKING/PUZZLE ─────────────────────────────────────────────────
function puzzlePrompt(q: string, options: string[], ans: number, topic: string): string {
  const L = ['A','B','C','D'];
  const correct = options[ans] ?? '';
  return `You are an RS Aggarwal-style reasoning expert for RRB Group D. PLAIN TEXT ONLY.

Question: ${q}
Options:
${optList(options)}
Correct Answer: ${L[ans]}) ${correct}
Topic: ${topic}

Write EXACTLY in this format:

━━━ ARRANGEMENT STEPS ━━━
STEP 1: [First clue applied. Max 15 words.]
STEP 2: [Second clue applied. Max 15 words.]
STEP 3: [Third clue applied. Max 15 words.]
[Continue for all clues]

━━━ FINAL ARRANGEMENT ━━━
[Show the final positions, e.g.:
1: A | 2: B | 3: C | 4: D | 5: E]

∴ ANSWER: ${correct} (Option ${L[ans]})

━━━ STRATEGY ━━━
⚡ [Show the solving strategy. Max 15 words.]

STRICT RULES:
1. No *, no **, no bold, no markdown.
2. Keep everything extremely short. Never repeat sentences.`;
}

// ── 8. DEFAULT REASONING ─────────────────────────────────────────────────────
function reasoningDefaultPrompt(q: string, options: string[], ans: number, topic: string): string {
  const L = ['A','B','C','D'];
  const correct = options[ans] ?? '';
  return `You are an RS Aggarwal-style reasoning expert for RRB Group D. PLAIN TEXT ONLY.

Question: ${q}
Options:
${optList(options)}
Correct Answer: ${L[ans]}) ${correct}
Topic: ${topic}

Write EXACTLY in this format:

━━━ LOGIC RULE ━━━
[State the rule or pattern. Max 15 words.]

━━━ SOLUTION ━━━
STEP 1 | [Action. Max 15 words.]
STEP 2 | [Deduction. Max 15 words.]

∴ ANSWER: ${correct} (Option ${L[ans]})

━━━ SPEED TRICK ━━━
⚡ [Shortcut tip. Max 15 words.]

STRICT RULES:
1. No *, no **, no bold, no markdown.
2. Keep all sentences extremely concise. No filler or repetition.`;
}

// ── 9. SIMPLE — GK + SCIENCE ─────────────────────────────────────────────────
function simplePrompt(q: string, options: string[], ans: number): string {
  const L = ['A','B','C','D'];
  const correct = options[ans] ?? '';
  return `You are a concise RRB Group D teacher. PLAIN TEXT ONLY. No markdown.

Question: ${q}
Correct Answer: ${L[ans]}) ${correct}

Write in EXACTLY this format:

━━━ ANSWER ━━━
${L[ans]}) ${correct}

━━━ WHY ━━━
[1-2 lines only. Direct fact. No essays. No bullet points.]

STRICT RULES: Maximum 2 lines total in the WHY section. Factual and direct only.`;
}

// ── Local fallback ─────────────────────────────────────────────────────────────
function buildLocal(q: string, options: string[], ans: number, topic: string, solutionType: SolutionType): string {
  const L = ['A','B','C','D'];
  const correct = options[ans] ?? '';
  const nums = [...q.matchAll(/-?\d+\.?\d*/g)].map(m => parseFloat(m[0])).filter(n => !isNaN(n));

  if (solutionType === 'simple') {
    return `━━━ ANSWER ━━━\n${L[ans]}) ${correct}\n\n━━━ WHY ━━━\n${correct} is the correct answer for this ${topic} question.`;
  }

  if (solutionType === 'maths') {
    let steps = `STEP 1 | Identify values\n${nums.slice(0,4).map((n,i) => `Value ${i+1} = ${n}`).join('\n')}\n\nSTEP 2 | Apply formula\nAnswer = ${correct}`;
    return `━━━ GIVEN ━━━\n${nums.slice(0,4).map((n,i) => `Value ${i+1} = ${n}`).join('\n') || 'See question'}\n\n━━━ FORMULA ━━━\n${topic} formula\n\n━━━ SOLUTION ━━━\n${steps}\n\n∴ ANSWER: ${correct} (Option ${L[ans]})\n\n━━━ SPEED TRICK ━━━\n⚡ Identify given values first, then apply formula directly\n\n━━━ EXAM TIP ━━━\n${topic} is frequently tested in RRB Group D`;
  }

  if (solutionType === 'direction') {
    return `━━━ COMPASS ━━━\n         N\n         ↑\n    W ←──┼──→ E\n         ↓\n         S\n\n━━━ MOVEMENT TRACE ━━━\nTrace each movement from the question one by one\n\n━━━ CALCULATION ━━━\nShortest distance using Pythagoras theorem\n\n∴ ANSWER: ${correct} (Option ${L[ans]})`;
  }

  if (solutionType === 'blood') {
    return `━━━ DECODE CLUES ━━━\nBreak each sentence into relationship pairs\n\n━━━ FAMILY TREE ━━━\n[Build from the clues given]\n\n━━━ CHAIN REASONING ━━━\nSTEP 1: Identify direct relationships\nSTEP 2: Connect through family tree\nSTEP 3: Find the asked relationship\n\n∴ ANSWER: ${correct} (Option ${L[ans]})\n\n━━━ GENDER RULE ━━━\n⚠️ Never assume gender from Indian names`;
  }

  if (solutionType === 'coding') {
    return `━━━ ALPHABET CHART ━━━\nA=1 B=2 C=3 D=4 E=5 F=6 G=7 H=8 I=9 J=10\nK=11 L=12 M=13 N=14 O=15 P=16 Q=17 R=18 S=19 T=20\nU=21 V=22 W=23 X=24 Y=25 Z=26\nEJOTY: E=5, J=10, O=15, T=20, Y=25\n\n━━━ PATTERN ANALYSIS ━━━\nFind the rule from the given example, then apply to target\n\n∴ ANSWER: ${correct} (Option ${L[ans]})`;
  }

  return `━━━ LOGIC RULE ━━━\n${topic} reasoning\n\n━━━ SOLUTION ━━━\nSTEP 1 | Analyze the question\nApply ${topic} logic\n\nSTEP 2 | Conclude\nAnswer = ${correct}\n\n∴ ANSWER: ${correct} (Option ${L[ans]})`;
}

// ── HTTP helpers ───────────────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, opts: RequestInit, ms = 25000): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(id); }
}

async function callGroq(key: string, prompt: string): Promise<{ solution: string; model: string } | null> {
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetchWithTimeout(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model, temperature: 0.15, max_tokens: 1400,
          messages: [
            { role: 'system', content: 'You are an expert RRB Group D exam teacher. Use PLAIN TEXT ONLY — no markdown asterisks (*), no bold (**), no underscores. Follow the format given exactly.' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!res.ok) { console.log(`Groq ${model}: ${res.status}`); continue; }
      const d = await res.json();
      const sol = d?.choices?.[0]?.message?.content?.trim();
      if (sol) return { solution: sol, model: `groq-${model}` };
    } catch (e: any) { console.log(`Groq ${model}:`, e?.message); }
  }
  return null;
}

async function callGemini(key: string, prompt: string): Promise<{ solution: string; model: string } | null> {
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetchWithTimeout(`${GEMINI_URL}/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'PLAIN TEXT ONLY — no markdown asterisks or bold.\n\n' + prompt }] }],
          generationConfig: { maxOutputTokens: 1400, temperature: 0.15 },
        }),
      });
      if (!res.ok) { console.log(`Gemini ${model}: ${res.status}`); continue; }
      const d = await res.json();
      const sol = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (sol) return { solution: sol, model: `gemini-${model}` };
    } catch (e: any) { console.log(`Gemini ${model}:`, e?.message); }
  }
  return null;
}

// ── Main handler ───────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { questionId, question, options, correctAnswer, topic, subject } = req.body ?? {};
  if (!question || !options || correctAnswer === undefined) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const solutionType = detectType(subject ?? '', topic ?? '');

  let prompt: string;
  switch (solutionType) {
    case 'maths':     prompt = mathsPrompt(question, options, correctAnswer, topic ?? ''); break;
    case 'direction': prompt = directionPrompt(question, options, correctAnswer, topic ?? ''); break;
    case 'blood':     prompt = bloodPrompt(question, options, correctAnswer, topic ?? ''); break;
    case 'coding':    prompt = codingPrompt(question, options, correctAnswer, topic ?? ''); break;
    case 'series':    prompt = seriesPrompt(question, options, correctAnswer, topic ?? ''); break;
    case 'syllogism': prompt = syllogismPrompt(question, options, correctAnswer, topic ?? ''); break;
    case 'puzzle':    prompt = puzzlePrompt(question, options, correctAnswer, topic ?? ''); break;
    case 'reasoning': prompt = reasoningDefaultPrompt(question, options, correctAnswer, topic ?? ''); break;
    default:          prompt = simplePrompt(question, options, correctAnswer); break;
  }

  let result: { solution: string; model: string } | null = null;

  // 1. Groq
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) result = await callGroq(groqKey, prompt);

  // 2. Gemini
  if (!result) {
    const gemKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (gemKey) result = await callGemini(gemKey, prompt);
  }

  // 3. Local fallback
  if (!result) {
    result = { solution: buildLocal(question, options, correctAnswer, topic ?? '', solutionType), model: 'local-solver' };
  }

  return res.status(200).json({
    solution: result.solution,
    source: result.model,
    solutionType,
    questionId,
  });
}
