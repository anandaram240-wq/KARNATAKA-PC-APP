// merge_all_ksp.mjs — Complete bulletproof merge of all 25 KSP JSON files
// Reads exam_name directly from each question (most reliable source)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE_DIR = '/Users/ananda/Desktop/CIVIL CONSTABLE/CONSTABLE JSON';
const PYQS_PATH  = path.join(__dirname, '../src/data/pyqs.json');
const ORIG_BACKUP = path.join(__dirname, '../src/data/pyqs.backup.json'); // original 599 before any merge

const FILE_NUMS = [1,2,3,4,5,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25];

console.log('🚔 KSP Master — COMPLETE FRESH MERGE (All Papers)');
console.log('═══════════════════════════════════════════════════\n');

// Always start from the original 599 to avoid duplicates
let base = [];
if (fs.existsSync(ORIG_BACKUP)) {
  base = JSON.parse(fs.readFileSync(ORIG_BACKUP, 'utf8'));
  console.log(`✅ Starting from original backup: ${base.length} questions\n`);
} else {
  console.error('❌ pyqs.backup.json not found! Run merge_new_json.mjs first to generate it.');
  process.exit(1);
}

function parseOptions(optObj) {
  if (Array.isArray(optObj)) {
    return { options: optObj.map(o => typeof o === 'object' ? (o.en || String(o)) : String(o)),
             options_kn: optObj.map(o => typeof o === 'object' ? (o.kn || '') : '') };
  }
  if (typeof optObj === 'object' && optObj !== null) {
    const keys = ['a','b','c','d','e'].filter(k => optObj[k] !== undefined);
    const options    = keys.map(k => { const v = optObj[k]; return (v && typeof v==='object') ? (v.en||'') : String(v||''); });
    const options_kn = keys.map(k => { const v = optObj[k]; return (v && typeof v==='object') ? (v.kn||'') : ''; });
    return { options, options_kn };
  }
  return { options: [], options_kn: [] };
}

function parseAnswer(ans) {
  if (typeof ans === 'number') return ans;
  if (typeof ans === 'string') {
    const l = ans.trim().toLowerCase();
    const map = {a:0,b:1,c:2,d:3,e:4};
    if (map[l] !== undefined) return map[l];
    const n = parseInt(ans); if (!isNaN(n)) return n;
  }
  return 0;
}

let idCounter = 10001;
let allNew = [];
let grandTotal = 0;

for (const num of FILE_NUMS) {
  const filePath = path.join(SOURCE_DIR, `${num}.json`);
  if (!fs.existsSync(filePath)) { console.warn(`⚠️  ${num}.json missing`); continue; }

  let data;
  try {
    const raw = fs.readFileSync(filePath,'utf8').replace(/\\,/g,',');
    data = JSON.parse(raw);
  } catch(e) { console.error(`❌ ${num}.json: ${e.message.slice(0,80)}`); continue; }

  const questions = Array.isArray(data) ? data : (data.questions || []);
  let added = 0;

  for (const q of questions) {
    const questionEn = q.text?.en || q.question || q.Question || '';
    const questionKn = q.text?.kn || q.question_kn || '';
    if (!questionEn.trim() && !questionKn.trim()) continue;

    const { options, options_kn } = parseOptions(q.options);
    const answerIdx = parseAnswer(q.correct_option ?? q.answer ?? q.Answer ?? 0);
    const expRaw    = q.explanation;
    const explanation    = expRaw && typeof expRaw==='object' ? (expRaw.en||'') : (expRaw||'');
    const explanation_kn = expRaw && typeof expRaw==='object' ? (expRaw.kn||'') : (q.explanation_kn||'');

    // Use exam_name from question itself (most accurate for multi-paper files)
    const examEn = (q.exam_name && typeof q.exam_name==='object') ? (q.exam_name.en||q.exam_name_kn||'KSP PC') : (q.exam_name || '');
    const examKn = (q.exam_name_kn || (typeof q.exam_name==='object' ? q.exam_name?.kn : '') || '');
    const paperName = examEn || `Paper-${num}`;

    allNew.push({
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
      year: String(q.year || q.date || '2024'),
      paper_id: q.paper_id || num,
      paper: paperName,
      paper_kn: examKn,
      exam: 'KSP PC',
      explanation,
      explanation_kn,
    });

    idCounter++;
    added++;
  }

  grandTotal += added;
  // Show paper breakdown for multi-paper files
  if (added > 0) {
    const papers = [...new Set(questions.map(q => q.exam_name?.en || q.exam_name || '?'))];
    console.log(`✅ ${String(num).padStart(2,'0')}.json → ${added} qs | ${papers.join(' + ')}`);
  }
}

const final = [...base, ...allNew];
fs.writeFileSync(PYQS_PATH, JSON.stringify(final, null, 2));

// Summary by paper
const paperGroups = {};
for (const q of allNew) {
  const k = q.paper || 'Unknown';
  paperGroups[k] = (paperGroups[k] || 0) + 1;
}

console.log('\n══════ PAPER BREAKDOWN ══════');
Object.entries(paperGroups).sort((a,b) => b[1]-a[1]).forEach(([p,c]) => {
  console.log(`  ${c.toString().padStart(3)} qs | ${p}`);
});

console.log('\n═══════════════════════════════════════════════════');
console.log(`📊 Original (non-KSP) questions : ${base.length}`);
console.log(`📊 KSP paper questions added    : ${grandTotal}`);
console.log(`🎉 GRAND TOTAL in pyqs.json     : ${final.length}`);
console.log(`💾 Saved → src/data/pyqs.json`);
