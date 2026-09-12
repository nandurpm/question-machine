// lib/adaptive.mjs - Spaced Repetition & Bloom's Taxonomy Adaptive Engine

export const BLOOM_ORDER = [
  'Remember',
  'Understand',
  'Apply',
  'Analyze',
  'Evaluate',
  'Create'
];

export function calculateMastery(attempts = []) {
  if (!attempts.length) return { score: 0, level: 'Beginner', count: 0 };
  const recent = attempts.slice(-5);
  const totalScore = recent.reduce((sum, a) => sum + (a.score || 0), 0);
  const avg = totalScore / recent.length;

  let level = 'Beginner';
  if (avg >= 90) level = 'Expert';
  else if (avg >= 75) level = 'Advanced';
  else if (avg >= 60) level = 'Intermediate';
  else if (avg >= 40) level = 'Elementary';

  return {
    score: Math.round(avg),
    level,
    count: attempts.length
  };
}

export function getNextTargetBloom(lastAttempt = null) {
  if (!lastAttempt) return 'Remember';
  const currentBloom = lastAttempt.bloomLevel || 'Remember';
  const index = BLOOM_ORDER.indexOf(currentBloom);
  const idx = index === -1 ? 0 : index;

  if (lastAttempt.score >= 80) {
    return BLOOM_ORDER[Math.min(idx + 1, BLOOM_ORDER.length - 1)];
  }
  if (lastAttempt.score < 50) {
    return BLOOM_ORDER[Math.max(idx - 1, 0)];
  }
  return BLOOM_ORDER[idx];
}

export function selectNextQuestion(db, userProfile = {}) {
  const {
    topic = null,
    department = null,
    subject = null,
    mode = 'deep',
    attempts = {},
    seenQuestionIds = []
  } = userProfile;

  const filters = {};
  if (topic) filters.topic = topic;
  if (department) filters.department = department;
  if (subject) filters.subject = subject;

  const queryResult = db.query(filters);
  let candidates = queryResult.questions;

  if (!candidates.length) {
    candidates = db.getAllQuestions();
  }

  const seenSet = new Set(seenQuestionIds);
  const unseenCandidates = candidates.filter((q) => !seenSet.has(q.questionId));

  const availablePool = unseenCandidates.length ? unseenCandidates : candidates;

  if (mode === 'exam') {
    const randomIndex = Math.floor(Math.random() * availablePool.length);
    return availablePool[randomIndex];
  }

  const attemptHistory = Object.values(attempts);
  const lastAttempt = attemptHistory.length ? attemptHistory[attemptHistory.length - 1] : null;

  if (mode === 'quick') {
    const conceptScores = new Map();
    for (const a of attemptHistory) {
      if (!conceptScores.has(a.concept)) conceptScores.set(a.concept, []);
      conceptScores.get(a.concept).push(a.score);
    }

    const scoredPool = availablePool.map((q) => {
      const scores = conceptScores.get(q.concept) || [];
      const mastery = calculateMastery(scores.map((s) => ({ score: s })));
      const weaknessPriority = 100 - mastery.score;
      return { question: q, priority: weaknessPriority };
    });

    scoredPool.sort((a, b) => b.priority - a.priority);
    return scoredPool[0]?.question || availablePool[0];
  }

  // Deep / Adaptive Mode
  const targetBloom = getNextTargetBloom(lastAttempt);
  const conceptAttempts = new Map();
  for (const a of attemptHistory) {
    if (!conceptAttempts.has(a.concept)) conceptAttempts.set(a.concept, []);
    conceptAttempts.get(a.concept).push(a);
  }

  const scoredCandidates = availablePool.map((q) => {
    let score = 50;

    // 1. Bloom's Taxonomy Match
    if (q.bloomLevel === targetBloom) score += 35;
    else if (
      Math.abs(
        BLOOM_ORDER.indexOf(q.bloomLevel) - BLOOM_ORDER.indexOf(targetBloom)
      ) === 1
    ) {
      score += 15;
    }

    // 2. Weakness & Spaced Repetition Weighting
    const history = conceptAttempts.get(q.concept) || [];
    if (history.length) {
      const mastery = calculateMastery(history);
      score += (100 - mastery.score) * 0.4; // Prioritize lower mastery
    } else {
      score += 20; // Unattempted concept bonus
    }

    // 3. Question-level repetition penalty
    if (seenSet.has(q.questionId)) {
      score -= 40;
    }

    return { question: q, priorityScore: score };
  });

  scoredCandidates.sort((a, b) => b.priorityScore - a.priorityScore);
  return scoredCandidates[0]?.question || availablePool[0];
}
