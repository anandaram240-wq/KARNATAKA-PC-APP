// src/lib/studyEngine.ts
// Smart priority scoring — tells students what to study first

import { getTopicStats } from './storage';

interface RawQuestion { id: number; topic: string; subject: string; }

// Exam weight by subject (from real data analysis)
const SUBJECT_WEIGHT: Record<string, number> = {
  'General Awareness': 70,
  'General Science':   21,
  'Reasoning':          7,
  'Mathematics':        2,
};

// Topic frequency (pre-computed from full dataset — top topics)
const TOPIC_FREQ: Record<string, number> = {
  'Karnataka State GK':    122,
  'Indian History':        111,
  'Miscellaneous':          72,
  'Biology':                60,
  'Indian Polity':          50,
  'Geography':              47,
  'Chemistry':              45,
  'Music Theory':           33,
  'Current Affairs':        32,
  'Physics':                26,
  'Important Days':         22,
  'Monuments':              21,
  'Indian Economy':         19,
  'Computers':              19,
  'Awards':                 19,
  'Number Series':          17,
  'Fundamental Rights':     15,
  'Directions':             15,
  'Blood Relations':        13,
  'Indian Rivers':          13,
};

export interface PriorityTopic {
  subject: string;
  topic: string;
  totalQuestions: number;
  doneQuestions: number;
  completionPct: number;
  priorityScore: number;
  label: '🔴 Critical' | '🟠 High' | '🟡 Medium' | '🟢 Done';
}

export function getStudyPriority(questions: RawQuestion[]): PriorityTopic[] {
  const stats = getTopicStats(questions);

  const topicData: Record<string, { subject: string; total: number; done: number; correct: number }> = {};
  questions.forEach(q => {
    const k = q.subject + '::' + q.topic;
    if (!topicData[k]) topicData[k] = { subject: q.subject, total: 0, done: 0, correct: 0 };
    topicData[k].total++;
  });

  // Merge with stats
  Object.entries(stats).forEach(([k, v]) => {
    if (topicData[k]) {
      topicData[k].done    = v.done;
      topicData[k].correct = v.correct;
    }
  });

  return Object.entries(topicData)
    .map(([k, v]) => {
      const [subject, topic] = k.split('::');
      const completionPct = v.total ? (v.done / v.total) * 100 : 0;
      const subjectW = SUBJECT_WEIGHT[subject] ?? 5;
      const topicFreq = TOPIC_FREQ[topic] ?? v.total;
      // Priority = frequency × subject_weight × (1 - completion)
      const priorityScore = Math.round(topicFreq * (subjectW / 100) * (1 - completionPct / 100));

      let label: PriorityTopic['label'] = '🟢 Done';
      if (completionPct < 100) {
        if (priorityScore >= 40) label = '🔴 Critical';
        else if (priorityScore >= 20) label = '🟠 High';
        else label = '🟡 Medium';
      }

      return {
        subject,
        topic,
        totalQuestions: v.total,
        doneQuestions: v.done,
        completionPct: Math.round(completionPct),
        priorityScore,
        label,
      };
    })
    .filter(t => t.completionPct < 100)
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

// Returns top N topics to focus on today
export function getTodaysFocus(questions: RawQuestion[], n = 3): PriorityTopic[] {
  return getStudyPriority(questions).slice(0, n);
}

// Selection probability estimator
export function getSelectionProbability(avgScore: number, category: string, region: string): number {
  // Based on 2024 patterns — rough estimate
  const cutoffMap: Record<string, number> = {
    'General_NKK': 68, 'General_KK': 60,
    'OBC_2A_NKK': 65, 'OBC_2A_KK': 57,
    'OBC_2B_NKK': 64, 'OBC_2B_KK': 56,
    'SC_NKK': 57, 'SC_KK': 49,
    'ST_NKK': 51, 'ST_KK': 43,
    'CAT01_NKK': 60, 'CAT01_KK': 52,
  };
  const key = `${category}_${region}`;
  const cutoff = cutoffMap[key] ?? 65;
  const margin = avgScore - cutoff;
  if (avgScore >= 100) return 98;
  if (margin >= 15) return 95;
  if (margin >= 10) return 85;
  if (margin >= 5)  return 65;
  if (margin >= 0)  return 35;
  if (margin >= -5) return 15;
  return 5;
}
