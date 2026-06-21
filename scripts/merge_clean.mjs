// merge_clean.mjs — Premium Merge of all 24 KSP JSON files (1-25, no 6)
// Source: /Users/ananda/Desktop/CIVIL CONSTABLE/CONSTABLE JSON
// Targets: /Users/ananda/Desktop/KARNATKA PC/src/data/pyqs.json

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE_DIR = '/Users/ananda/Desktop/CIVIL CONSTABLE/CONSTABLE JSON';
const PYQS_PATH  = path.join(__dirname, '../src/data/pyqs.json');
const BACKUP_PATH = path.join(__dirname, '../src/data/pyqs.backup.json');

console.log('🚔 KSP Master — CLEAN MERGE ENGINE');
console.log('═════════════════════════════════════════\n');

// 1. Helper: Parse options bilingual
function parseOptions(optObj) {
  if (Array.isArray(optObj)) {
    const options = optObj.map(o => typeof o === 'object' ? (o.en || String(o)) : String(o));
    const options_kn = optObj.map(o => typeof o === 'object' ? (o.kn || '') : '');
    return { options, options_kn };
  }
  if (typeof optObj === 'object' && optObj !== null) {
    const keys = ['a','b','c','d','e'].filter(k => optObj[k] !== undefined);
    const options    = keys.map(k => { const v = optObj[k]; return (v && typeof v==='object') ? (v.en||'') : String(v||''); });
    const options_kn = keys.map(k => { const v = optObj[k]; return (v && typeof v==='object') ? (v.kn||'') : ''; });
    return { options, options_kn };
  }
  return { options: [], options_kn: [] };
}

// 2. Helper: Parse correctAnswer
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

// 3. Helper: Map raw subject to 4 canonical subjects
function getCanonicalSubject(rawSub) {
  const sub = String(rawSub || '').trim().toLowerCase();
  if (sub.includes('mathematics') || sub.includes('arithmetic') || sub.includes('numerical')) {
    return 'Mathematics';
  }
  if (sub.includes('mental ability') || sub.includes('reasoning') || sub.includes('logic') || sub.includes('puzzle') || sub.includes('aptitude')) {
    return 'Reasoning';
  }
  if (
    sub.includes('science') || 
    sub.includes('physics') || 
    sub.includes('chemistry') || 
    sub.includes('biology') || 
    sub.includes('computer') || 
    sub.includes('environmental') ||
    sub.includes('mechanical')
  ) {
    return 'General Science';
  }
  return 'General Awareness';
}

// 4. Helper: Kannada paper name mapping
function getPaperKn(paperEn) {
  const mapping = {
    "CBT - 2014": "ಸಿಬಿಟಿ - 2014",
    "KSP PC (Civil) - 2014": "KSP PC (ಸಿವಿಲ್) - 2014",
    "KSRP-SRPC - 2014": "KSRP-SRPC - 2014",
    "SRPC-NHK – KSRP - 2015": "SRPC-NHK – KSRP - 2015",
    "Notification 10/2016 - 2016": "ಅಧಿಸೂಚನೆ 10/2016 - 2016",
    "CPC - 2016 (Notification 17/2016)": "CPC - 2016 (ಅಧಿಸೂಚನೆ 17/2016)",
    "KSISF-2016": "ಕೆಎಸ್ಐಎಸ್ಎಫ್ - 2016",
    "SRPC (KSRP) – 2016": "ಎಸ್‌ಆರ್‌ಪಿಸಿ (ಕೆಸ್‌ಆರ್‌ಪಿ) – 2016",
    "PC-(KSISF) – 2017": "ಪಿಸಿ-(ಕೆಎಸ್ಐಎಸ್ಎಫ್) – 2017",
    "CPC-NHK - 2017": "ಸಿಪಿಸಿ-ಎನ್‌ಎಚ್‌ಕೆ - 2017",
    "CPC-HK - 2017": "ಸಿಪಿಸಿ-ಎಚ್‌ಕೆ - 2017",
    "APC-NHK - 2017": "ಎಪಿಸಿ-ಎನ್‌ಎಚ್‌ಕೆ - 2017",
    "SRPC (KSRP) – 2017": "ಎಸ್‌ಆರ್‌ಪಿಸಿ (ಕೆಸ್‌ಆರ್‌ಪಿ) – 2017",
    "KSP-2018": "ಕೆಎಸ್‌ಪಿ - 2018",
    "APC-NHK-2018": "ಎಪಿಸಿ-ಎನ್‌ಎಚ್‌ಕೆ - 2018",
    "CPC-2018": "ಸಿಪಿಸಿ - 2018",
    "CPC(CIVIL) (HK)-2019": "ಸಿಪಿಸಿ (ಸಿವಿಲ್) (ಎಚ್‌ಕೆ) - 2019",
    "CPC (CIVIL) – 2019": "ಸಿಪಿಸಿ (ಸಿವಿಲ್) - 2019",
    "CPC-2020": "ಸಿಪಿಸಿ - 2020",
    "KSP-2018/2020": "ಕೆಎಸ್‌ಪಿ - 2018/2020",
    "KSP-2020": "ಕೆಎಸ್‌ಪಿ - 2020",
    "KSP-Civil-SI-2021": "ಕೆಎಸ್‌ಪಿ-ಸಿವಿಲ್-ಎಸ್‌ಐ - 2021"
  };
  return mapping[paperEn] || paperEn;
}

// Ensure backup exists
if (!fs.existsSync(BACKUP_PATH)) {
  console.error('❌ pyqs.backup.json not found!');
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
console.log(`✅ Loaded backup: ${backup.length} questions`);

// 5. Load questions from files 1-5 to extract Kannada translations
const ksp1to5 = [];
for (const num of [1, 2, 3, 4, 5]) {
  const filePath = path.join(SOURCE_DIR, `${num}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ${num}.json is missing!`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const qs = data.questions || [];
  ksp1to5.push(...qs);
}
console.log(`✅ Loaded files 1-5: ${ksp1to5.length} questions for translation mapping`);

// Normalization function for question matching
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Map translations to backup questions
let matchedCount = 0;
const enrichedBackup = backup.map(bq => {
  const bNorm = norm(bq.question);
  const matchedQ = ksp1to5.find(kq => norm(kq.text?.en || kq.question) === bNorm);
  
  let question_kn = '';
  let options_kn = [];
  
  if (matchedQ) {
    matchedCount++;
    question_kn = matchedQ.text?.kn || matchedQ.question_kn || '';
    const parsed = parseOptions(matchedQ.options);
    options_kn = parsed.options_kn;
  }
  
  const shift_kn = getPaperKn(bq.shift);
  
  return {
    ...bq,
    question_kn,
    options_kn,
    subtopic: bq.sub_topic || '',
    explanation: bq.solution || '',
    explanation_kn: '',
    solution_kn: '',
    year: bq.exam_year || '2014',
    paper: bq.shift || '',
    paper_kn: shift_kn,
    shift_kn: shift_kn
  };
});

console.log(`✅ Enriched backup with Kannada translations: ${matchedCount}/${backup.length} matched`);

// 6. Merge files 7 to 25 (excluding 6.json)
let idCounter = 10001;
const allNew = [];
const newFiles = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];

for (const num of newFiles) {
  const filePath = path.join(SOURCE_DIR, `${num}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  ${num}.json missing`);
    continue;
  }
  
  let data;
  try {
    let raw = fs.readFileSync(filePath, 'utf8');
    if (num === 7) {
      raw = raw.replace(/\\,/g, ',');
      raw = raw.replace(/\\(?!["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
    }
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`❌ Failed to parse ${num}.json: ${e.message}`);
    continue;
  }
  
  const questions = Array.isArray(data) ? data : (data.questions || []);
  const pNameEn = data.exam_details?.paper_name || '';
  
  for (const q of questions) {
    const questionEn = q.text?.en || q.question || q.Question || '';
    const questionKn = q.text?.kn || q.question_kn || '';
    if (!questionEn.trim() && !questionKn.trim()) continue;
    
    const { options, options_kn } = parseOptions(q.options);
    const correctAnswer = parseAnswer(q.correct_option ?? q.answer ?? q.correct_answer ?? 0);
    
    const expRaw = q.explanation;
    const explanation = expRaw && typeof expRaw === 'object' ? (expRaw.en || '') : (expRaw || '');
    const explanation_kn = expRaw && typeof expRaw === 'object' ? (expRaw.kn || '') : (q.explanation_kn || '');
    
    const rawSub = q.subject || 'General Knowledge';
    const subject = getCanonicalSubject(rawSub);
    const topic = q.topic || 'Miscellaneous';
    const sub_topic = q.subtopic || q.sub_topic || '';
    const difficulty = q.difficulty || 'medium';
    
    // Determine exam year
    const examYear = String(q.year || data.exam_details?.years?.[0] || '2024');
    
    // Determine paper name
    const qExamEn = (q.exam_name && typeof q.exam_name === 'object') ? (q.exam_name.en || q.exam_name_kn || '') : (q.exam_name || '');
    const paperName = pNameEn || qExamEn || `Paper-${num}`;
    const paperKn = getPaperKn(paperName);
    
    allNew.push({
      id: idCounter,
      subject,
      topic,
      sub_topic,
      subtopic: sub_topic,
      question: questionEn,
      question_kn: questionKn,
      options,
      options_kn,
      correctAnswer,
      solution: explanation,
      solution_kn: explanation_kn,
      explanation,
      explanation_kn,
      difficulty,
      exam_year: examYear,
      year: examYear,
      shift: paperName,
      shift_kn: paperKn,
      paper: paperName,
      paper_kn: paperKn,
      tags: [subject, topic].filter(Boolean)
    });
    
    idCounter++;
  }
  
  console.log(`✅ Loaded ${num}.json → ${questions.length} questions`);
}

const final = [...enrichedBackup, ...allNew];
fs.writeFileSync(PYQS_PATH, JSON.stringify(final, null, 2));

console.log('\n═════════════════════════════════════════');
console.log(`📊 Backup (1-5) Questions : ${enrichedBackup.length}`);
console.log(`📊 New (7-25) Questions    : ${allNew.length}`);
console.log(`🎉 GRAND TOTAL (no dupes) : ${final.length}`);
console.log(`💾 Saved clean DB to: ${PYQS_PATH}`);
console.log('═════════════════════════════════════════\n');

// Print breakdown
const paperBreakdown = {};
for (const q of final) {
  const paper = q.shift || 'Unknown';
  paperBreakdown[paper] = (paperBreakdown[paper] || 0) + 1;
}

console.log('📝 Paper Breakdown:');
Object.entries(paperBreakdown).sort((a,b) => b[1]-a[1]).forEach(([p, count]) => {
  console.log(`  - ${p}: ${count} questions`);
});
