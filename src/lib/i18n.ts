// src/lib/i18n.ts — Complete EN/KN translation for all UI strings
export type Lang = 'en' | 'kn';

const T = {
  // ── Nav ──────────────────────────────────────────────
  nav_home:      { en: 'Home',     kn: 'ಮುಖಪುಟ' },
  nav_pyqs:      { en: 'PYQs',     kn: 'ಪ್ರಶ್ನೆ' },
  nav_test:      { en: 'Test',     kn: 'ಪರೀಕ್ಷೆ' },
  nav_insights:  { en: 'Insights', kn: 'ವಿಶ್ಲೇಷಣೆ' },
  nav_progress:  { en: 'Progress', kn: 'ಪ್ರಗತಿ' },

  // ── Login ────────────────────────────────────────────
  login_title:   { en: 'KSP Tayyari', kn: 'ಕೆಎಸ್ಪಿ ತಯಾರಿ' },
  login_sub:     { en: 'Karnataka Police Constable Exam Prep', kn: 'ಕರ್ನಾಟಕ ಪೊಲೀಸ್ ಕಾನ್‌ಸ್ಟೇಬಲ್ ಪರೀಕ್ಷೆ ತಯಾರಿ' },
  login_google:  { en: 'Continue with Google', kn: 'Google ನಲ್ಲಿ ಮುಂದುವರಿಯಿರಿ' },
  login_guest:   { en: 'Continue as Guest', kn: 'ಅತಿಥಿಯಾಗಿ ಮುಂದುವರಿಯಿರಿ' },
  login_choose_lang: { en: 'Choose Language', kn: 'ಭಾಷೆ ಆಯ್ಕೆ ಮಾಡಿ' },
  login_lang_hint: { en: 'You can change this anytime', kn: 'ನೀವು ಇದನ್ನು ಯಾವಾಗ ಬೇಕಾದರೂ ಬದಲಾಯಿಸಬಹುದು' },

  // ── Home ─────────────────────────────────────────────
  home_greeting_morning:   { en: 'Good morning', kn: 'ಶುಭೋದಯ' },
  home_greeting_afternoon: { en: 'Good afternoon', kn: 'ಶುಭ ಮಧ್ಯಾಹ್ನ' },
  home_greeting_evening:   { en: 'Good evening', kn: 'ಶುಭ ಸಂಜೆ' },
  home_streak:             { en: 'day streak', kn: 'ದಿನ ಸರಣಿ' },
  home_days_left:          { en: 'days to go', kn: 'ದಿನಗಳು ಉಳಿದಿವೆ' },
  home_exam_label:         { en: 'KSP CPC Exam', kn: 'ಕೆಎಸ್ಪಿ ಸಿಪಿಸಿ ಪರೀಕ್ಷೆ' },
  home_set_date:           { en: 'Set exam date →', kn: 'ಪರೀಕ್ಷಾ ದಿನಾಂಕ ಹೊಂದಿಸಿ →' },
  home_vacancies:          { en: '3,991 vacancies • Est. 1:70+ ratio', kn: '3,991 ಹುದ್ದೆಗಳು • ಅಂದಾಜು 1:70+ ಅನುಪಾತ' },
  home_start_mock:         { en: 'Full Mock', kn: 'ಸಂಪೂರ್ಣ ಪರೀಕ್ಷೆ' },
  home_view_cutoff:        { en: 'Cutoff', kn: 'ಕಟ್-ಆಫ್' },
  home_today_focus:        { en: "Today's Focus", kn: 'ಇಂದಿನ ಗಮನ' },
  home_practice_now:       { en: 'Practice →', kn: 'ಅಭ್ಯಾಸ ಮಾಡಿ →' },
  home_rising_topics:      { en: 'Rising Topics', kn: 'ಏರುತ್ತಿರುವ ವಿಷಯಗಳು' },
  home_qs_done_today:      { en: 'Qs today', kn: 'ಇಂದಿನ ಪ್ರಶ್ನೆಗಳು' },
  home_accuracy:           { en: 'Accuracy', kn: 'ನಿಖರತೆ' },
  home_avg_score:          { en: 'Avg Score', kn: 'ಸರಾಸರಿ ಅಂಕ' },
  home_tests_done:         { en: 'Tests Done', kn: 'ಮಾಡಿದ ಪರೀಕ್ಷೆ' },
  home_quick_practice:     { en: 'Quick Practice', kn: 'ತ್ವರಿತ ಅಭ್ಯಾಸ' },
  home_full_mock:          { en: 'Full Mock', kn: 'ಸಂಪೂರ್ಣ ಪರೀಕ್ಷೆ' },
  home_insights:           { en: 'Cutoff', kn: 'ಕಟ್-ಆಫ್' },
  home_progress:           { en: 'Progress', kn: 'ಪ್ರಗತಿ' },
  home_exam_today:         { en: '🎯 Exam is today!', kn: '🎯 ಇಂದು ಪರೀಕ್ಷೆ!' },

  // ── Practice ─────────────────────────────────────────
  pyq_title:        { en: 'PYQ Practice', kn: 'ಹಿಂದಿನ ಪ್ರಶ್ನೆ ಅಭ್ಯಾಸ' },
  pyq_all_qs:       { en: 'questions', kn: 'ಪ್ರಶ್ನೆಗಳು' },
  pyq_by_subject:   { en: '📖 Subject', kn: '📖 ವಿಷಯ' },
  pyq_by_year:      { en: '📅 Year', kn: '📅 ವರ್ಷ' },
  pyq_by_topic:     { en: '🎯 Topic', kn: '🎯 ವಿಷಯಾಂಶ' },
  pyq_all_qs_f:     { en: 'All Questions', kn: 'ಎಲ್ಲಾ ಪ್ರಶ್ನೆಗಳು' },
  pyq_high_repeat:  { en: '🔴 High Repeat (3+)', kn: '🔴 ಹೆಚ್ಚು ಪುನರಾವರ್ತನೆ (3+)' },
  pyq_repeated:     { en: '🟡 Repeated (2+)', kn: '🟡 ಪುನರಾವರ್ತನೆ (2+)' },
  pyq_all_status:   { en: 'All Status', kn: 'ಎಲ್ಲಾ ಸ್ಥಿತಿ' },
  pyq_not_done:     { en: '⬜ Not Done', kn: '⬜ ಆಗಿಲ್ಲ' },
  pyq_done:         { en: '✅ Done', kn: '✅ ಮಾಡಿದೆ' },
  pyq_got_wrong:    { en: '❌ Got Wrong', kn: '❌ ತಪ್ಪಾಯಿತು' },
  pyq_practice_all: { en: 'Practice All', kn: 'ಎಲ್ಲವನ್ನೂ ಅಭ್ಯಾಸ ಮಾಡಿ' },
  pyq_done_label:   { en: 'done', kn: 'ಮಾಡಿದೆ' },
  pyq_topics:       { en: 'topics', kn: 'ವಿಷಯಾಂಶಗಳು' },
  pyq_qs:           { en: 'Qs', kn: 'ಪ್ರಶ್ನೆ' },
  pyq_paper:        { en: 'Paper', kn: 'ಪೇಪರ್' },
  pyq_min:          { en: 'min', kn: 'ನಿಮಿಷ' },
  pyq_available:    { en: 'available', kn: 'ಲಭ್ಯ' },
  pyq_back:         { en: '← Back', kn: '← ಹಿಂದೆ' },
  pyq_finish:       { en: '✓ Finish', kn: '✓ ಮುಗಿಸಿ' },
  pyq_next:         { en: 'Next →', kn: 'ಮುಂದೆ →' },
  pyq_prev:         { en: '← Prev', kn: '← ಹಿಂದಿನ' },
  pyq_show_exp:     { en: '💡 Show Explanation', kn: '💡 ವಿವರಣೆ ತೋರಿಸಿ' },
  pyq_hide_exp:     { en: '▲ Hide', kn: '▲ ಮರೆಮಾಡಿ' },
  pyq_correct_msg:  { en: '✅ Correct! Well done.', kn: '✅ ಸರಿಯಾಗಿದೆ! ಚೆನ್ನಾಗಿ ಮಾಡಿದಿರಿ.' },
  pyq_wrong_msg:    { en: 'Correct answer:', kn: 'ಸರಿಯಾದ ಉತ್ತರ:' },
  pyq_no_match:     { en: 'No questions match filters', kn: 'ಫಿಲ್ಟರ್‌ಗಳಿಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಪ್ರಶ್ನೆಗಳಿಲ್ಲ' },

  // ── Test ─────────────────────────────────────────────
  test_title:         { en: 'Mock Tests', kn: 'ಅಭ್ಯಾಸ ಪರೀಕ್ಷೆಗಳು' },
  test_full:          { en: 'Full Mock Test', kn: 'ಸಂಪೂರ್ಣ ಅಭ್ಯಾಸ ಪರೀಕ್ಷೆ' },
  test_full_sub:      { en: '100 Qs · 90 min · −0.25 negative', kn: '100 ಪ್ರ · 90 ನಿ · −0.25 ಋಣಾತ್ಮಕ' },
  test_year:          { en: 'Year-Wise Paper', kn: 'ವರ್ಷವಾರು ಪೇಪರ್' },
  test_subject:       { en: 'Subject Test', kn: 'ವಿಷಯ ಪರೀಕ್ಷೆ' },
  test_topic:         { en: 'Topic Drill', kn: 'ವಿಷಯಾಂಶ ಡ್ರಿಲ್' },
  test_choose_year:   { en: 'Choose Year', kn: 'ವರ್ಷ ಆಯ್ಕೆ ಮಾಡಿ' },
  test_choose_sub:    { en: 'Choose Subject', kn: 'ವಿಷಯ ಆಯ್ಕೆ ಮಾಡಿ' },
  test_choose_topic:  { en: 'Choose Topic', kn: 'ವಿಷಯಾಂಶ ಆಯ್ಕೆ ಮಾಡಿ' },
  test_start:         { en: 'Start Test →', kn: 'ಪರೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ →' },
  test_cancel:        { en: 'Cancel', kn: 'ರದ್ದು ಮಾಡಿ' },
  test_settings:      { en: 'Test Settings', kn: 'ಪರೀಕ್ಷೆ ಸೆಟ್ಟಿಂಗ್' },
  test_language:      { en: 'Language', kn: 'ಭಾಷೆ' },
  test_shuffle:       { en: 'Shuffle Questions', kn: 'ಪ್ರಶ್ನೆ ಮಿಶ್ರಮಾಡಿ' },
  test_shuffle_sub:   { en: 'Randomise question order', kn: 'ಪ್ರಶ್ನೆಗಳ ಕ್ರಮ ಬದಲಾಯಿಸಿ' },
  test_timer:         { en: 'Show Timer', kn: 'ಟೈಮರ್ ತೋರಿಸಿ' },
  test_neg_warn:      { en: 'Negative Marking: −¼ mark per wrong. Min 30 marks to qualify.', kn: 'ಋಣಾತ್ಮಕ ಅಂಕ: ತಪ್ಪಿಗೆ −¼. ಅರ್ಹತೆಗೆ ಕನಿಷ್ಠ 30 ಅಂಕ ಬೇಕು.' },
  test_submit:        { en: 'Submit ✓', kn: 'ಸಲ್ಲಿಸಿ ✓' },
  test_submit_q:      { en: 'Submit Test?', kn: 'ಪರೀಕ್ಷೆ ಸಲ್ಲಿಸಬೇಕೇ?' },
  test_answered:      { en: 'Answered', kn: 'ಉತ್ತರಿಸಿದ' },
  test_unanswered:    { en: 'Unanswered', kn: 'ಉತ್ತರಿಸದ' },
  test_confirm_yes:   { en: 'Yes, Submit', kn: 'ಹೌದು, ಸಲ್ಲಿಸಿ' },
  test_mark_review:   { en: 'Mark for Review', kn: 'ಪರಿಶೀಲನೆಗೆ ಗುರುತಿಸಿ' },
  test_marked:        { en: 'Marked', kn: 'ಗುರುತಿಸಲಾಗಿದೆ' },
  test_palette:       { en: '🗂 Palette', kn: '🗂 ಪ್ಯಾಲೆಟ್' },
  test_prev:          { en: '← Prev', kn: '← ಹಿಂದಿನ' },
  test_next:          { en: 'Next →', kn: 'ಮುಂದೆ →' },

  // ── Results ──────────────────────────────────────────
  result_title:     { en: 'Test Complete 🎉', kn: 'ಪರೀಕ್ಷೆ ಮುಗಿಯಿತು 🎉' },
  result_safe:      { en: 'marks above cutoff — Safe zone!', kn: 'ಅಂಕ ಕಟ್-ಆಫ್‌ಗಿಂತ ಮೇಲೆ — ಸುರಕ್ಷಿತ!' },
  result_border:    { en: 'marks above — Borderline, push +5', kn: 'ಅಂಕ ಮೇಲೆ — ಗಡಿರೇಖೆ, +5 ಸುಧಾರಿಸಿ' },
  result_below:     { en: 'marks below cutoff', kn: 'ಅಂಕ ಕಟ್-ಆಫ್‌ಗಿಂತ ಕೆಳಗೆ' },
  result_review:    { en: 'Review →', kn: 'ಪರಿಶೀಲಿಸಿ →' },
  result_new_test:  { en: 'New Test', kn: 'ಹೊಸ ಪರೀಕ್ಷೆ' },
  result_cutoff:    { en: 'Cutoff Comparison', kn: 'ಕಟ್-ಆಫ್ ಹೋಲಿಕೆ' },
  result_breakdown: { en: 'Subject Breakdown', kn: 'ವಿಷಯವಾರು ಅಂಕ' },
  result_raw:       { en: 'Raw:', kn: 'ಒಟ್ಟು:' },
  review_all:       { en: 'All', kn: 'ಎಲ್ಲಾ' },
  review_wrong:     { en: 'Wrong', kn: 'ತಪ್ಪು' },
  review_correct:   { en: 'Correct', kn: 'ಸರಿ' },
  review_skipped:   { en: 'Skipped', kn: 'ಬಿಟ್ಟ' },
  review_results:   { en: '← Results', kn: '← ಫಲಿತಾಂಶ' },
  review_title:     { en: 'Review Questions', kn: 'ಪ್ರಶ್ನೆ ಪರಿಶೀಲನೆ' },

  // ── Exam Date ────────────────────────────────────────
  date_title:     { en: 'Exam Date', kn: 'ಪರೀಕ್ಷಾ ದಿನಾಂಕ' },
  date_days:      { en: 'days remaining', kn: 'ದಿನಗಳು ಉಳಿದಿವೆ' },
  date_change:    { en: 'Change', kn: 'ಬದಲಾಯಿಸಿ' },
  date_set:       { en: 'Set Date', kn: 'ದಿನಾಂಕ ಹೊಂದಿಸಿ' },
  date_personal:  { en: 'Get personalised countdown', kn: 'ವೈಯಕ್ತಿಕ ಕೌಂಟ್‌ಡೌನ್ ಪಡೆಯಿರಿ' },
  date_30day:     { en: '⚠️ Less than 30 days! Prioritise Full Mocks daily.', kn: '⚠️ 30 ದಿನಕ್ಕಿಂತ ಕಡಿಮೆ! ಪ್ರತಿದಿನ ಸಂಪೂರ್ಣ ಪರೀಕ್ಷೆ ಮಾಡಿ.' },
  date_cancel:    { en: 'Cancel', kn: 'ರದ್ದು' },
  date_today:     { en: '🔔 Exam is today!', kn: '🔔 ಇಂದು ಪರೀಕ್ಷೆ!' },

  // ── Progress ─────────────────────────────────────────
  prog_title:      { en: '📈 My Progress', kn: '📈 ನನ್ನ ಪ್ರಗತಿ' },
  prog_qs_done:    { en: 'Qs Done', kn: 'ಪ್ರಶ್ನೆ ಮಾಡಿದೆ' },
  prog_accuracy:   { en: 'Accuracy', kn: 'ನಿಖರತೆ' },
  prog_tests:      { en: 'Tests', kn: 'ಪರೀಕ್ಷೆ' },
  prog_streak:     { en: 'Streak', kn: 'ಸರಣಿ' },
  prog_overview:   { en: 'Overview', kn: 'ಸಾರಾಂಶ' },
  prog_topics:     { en: 'Topics', kn: 'ವಿಷಯಾಂಶ' },
  prog_tests_tab:  { en: 'Tests', kn: 'ಪರೀಕ್ಷೆ' },
  prog_streak_tab: { en: 'Streak', kn: 'ಸರಣಿ' },

  // ── Insights ─────────────────────────────────────────
  ins_title:     { en: '📊 Insights', kn: '📊 ವಿಶ್ಲೇಷಣೆ' },
  ins_cutoff:    { en: 'Cutoff', kn: 'ಕಟ್-ಆಫ್' },
  ins_trends:    { en: 'Trends', kn: 'ಪ್ರವೃತ್ತಿ' },
  ins_year:      { en: 'Year', kn: 'ವರ್ಷ' },
  ins_compete:   { en: 'Competition', kn: 'ಸ್ಪರ್ಧೆ' },

  // ── Common ───────────────────────────────────────────
  back:          { en: '← Back', kn: '← ಹಿಂದೆ' },
  cancel:        { en: 'Cancel', kn: 'ರದ್ದು' },
  save:          { en: 'Save', kn: 'ಉಳಿಸಿ' },
  continue:      { en: 'Continue', kn: 'ಮುಂದುವರಿಯಿರಿ' },
  start:         { en: 'Start', kn: 'ಪ್ರಾರಂಭಿಸಿ' },
  done:          { en: 'Done', kn: 'ಮುಗಿಯಿತು' },
  no_data:       { en: 'No data yet', kn: 'ಇನ್ನೂ ಡೇಟಾ ಇಲ್ಲ' },
  offline_msg:   { en: 'Offline — All 2,499 questions available locally', kn: 'ಆಫ್‌ಲೈನ್ — 2,499 ಪ್ರಶ್ನೆಗಳು ಸ್ಥಳೀಯವಾಗಿ ಲಭ್ಯ' },
} as const;

export type TKey = keyof typeof T;

/** Translate a key to the current language */
export function t(key: TKey, lang: Lang): string {
  return T[key][lang] ?? T[key]['en'];
}

/** React hook — auto-picks language from context */
import { useContext } from 'react';
import { LangContext } from './LangContext';

export function useT() {
  const lang = useContext(LangContext);
  return (key: TKey) => t(key, lang);
}

export { T };
