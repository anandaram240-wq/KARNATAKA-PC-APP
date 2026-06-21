// merge_new_json.mjs — Fixed for {exam_details, questions} structure with bilingual text
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NEW_JSON_DIR = '/Users/ananda/Desktop/CIVIL CONSTABLE/CONSTABLE JSON/NEW PYQS PC/NEW JSON';
const PYQS_PATH    = path.join(__dirname, '../src/data/pyqs.json');
const BACKUP_PATH  = path.join(__dirname, '../src/data/pyqs.backup.json');

const FILES = ['17.json','18.json','19.json','20.json','21.json','22.json','23.json','24.json','25.json'];

console.log('🚔 KSP Master — JSON Merge (Bilingual)');
console.log('═══════════════════════════════════════\n');

// Load existing
let existing = [];
try {
  existing = JSON.parse(fs.readFileSync(PYQS_PATH, 'utf8'));
  console.log(`✅ Loaded pyqs.json — ${existing.length} questions`);
} catch(e) {
  console.error('❌ Cannot read pyqs.json:', e.message);
  process.exit(1);
}

// Backup
fs.writeFileSync(BACKUP_PATH, JSON.stringify(existing, null, 2));
console.log(`💾 Backup → pyqs.backup.json\n`);

// Max existing ID
const maxId = existing.reduce((max, q) => {
  const raw = q.id;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? '0').replace(/\D/g,'') || '0');
  return n > max ? n : max;
}, 0);
console.log(`📌 Max existing ID: ${maxId}\n`);

let idCounter = maxId + 1;
let totalAdded = 0;

// Helper: convert new-format options → array of EN strings + array of KN strings
function parseOptions(optObj) {
  if (Array.isArray(optObj)) {
    // Already an array (old format)
    return { options: optObj, options_kn: [] };
  }
  if (typeof optObj === 'object' && optObj !== null) {
    const keys = ['a','b','c','d','e'];
    const options    = keys.filter(k => optObj[k]).map(k => optObj[k]?.en || optObj[k] || '');
    const options_kn = keys.filter(k => optObj[k]).map(k => optObj[k]?.kn || '');
    return { options, options_kn };
  }
  return { options: [], options_kn: [] };
}

// Helper: correct answer — convert letter (a/b/c/d) to index (0/1/2/3)
function parseAnswer(ans) {
  if (typeof ans === 'number') return ans;
  if (typeof ans === 'string') {
    const letter = ans.trim().toLowerCase();
    const map = { a: 0, b: 1, c: 2, d: 3, e: 4 };
    if (map[letter] !== undefined) return map[letter];
    const n = parseInt(ans);
    if (!isNaN(n)) return n;
  }
  return 0;
}

for (const file of FILES) {
  const filePath = path.join(NEW_JSON_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  ${file} not found — skip`);
    continue;
  }

  let raw = fs.readFileSync(filePath, 'utf8').replace(/\\,/g, ',');
  let data;
  try {
    data = JSON.parse(raw);
  } catch(e) {
    console.error(`❌ Parse error in ${file}:`, e.message);
    continue;
  }

  // Unwrap: could be array or {exam_details, questions}
  const questions  = Array.isArray(data) ? data : (data.questions || []);
  const examDetail = data.exam_details || {};
  const paperName  = examDetail.paper_name || file.replace('.json','');
  const examName   = (typeof examDetail.exam_name === 'object') 
    ? (examDetail.exam_name.en || 'KSP PC') 
    : (examDetail.exam_name || 'KSP PC');
  const years = (examDetail.years || []).join('/') || '2024';

  let added = 0;
  for (const q of questions) {
    // Extract bilingual text
    const questionEn = q.text?.en || q.question || q.Question || '';
    const questionKn = q.text?.kn || q.question_kn || '';

    if (!questionEn.trim() && !questionKn.trim()) continue;

    const { options, options_kn } = parseOptions(q.options);
    const correctLetter = q.correct_option || q.answer || q.Answer || 0;
    const answerIdx = parseAnswer(correctLetter);

    // Explanation
    const explanation    = (typeof q.explanation === 'object') ? (q.explanation?.en || '') : (q.explanation || q.Explanation || '');
    const explanation_kn = (typeof q.explanation === 'object') ? (q.explanation?.kn || '') : (q.explanation_kn || '');

    existing.push({
      id: idCounter,
      question: questionEn,
      question_kn: questionKn,
      options,
      options_kn,
      answer: answerIdx,
      subject: q.subject || 'General Knowledge',
      topic: q.topic || '',
      subtopic: q.subtopic || q.sub_topic || '',
      difficulty: q.difficulty || 'medium',
      year: q.year || years,
      paper: paperName,
      exam: examName,
      explanation,
      explanation_kn,
    });

    idCounter++;
    added++;
  }

  totalAdded += added;
  console.log(`✅ ${file} — ${added} questions added (${examName} | ${paperName} | ${years})`);
}

fs.writeFileSync(PYQS_PATH, JSON.stringify(existing, null, 2));

console.log('\n═══════════════════════════════════════');
console.log(`🎉 Total questions now: ${existing.length}`);
console.log(`📊 Added this run:      ${totalAdded}`);
console.log(`💾 Saved: src/data/pyqs.json`);
