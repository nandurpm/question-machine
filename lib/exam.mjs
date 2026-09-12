// lib/exam.mjs - Scalable Exam Generator & Evaluation Engine

import { deterministicEvaluate } from './evaluator.mjs';

export function generateExam(db, config = {}) {
  const {
    department = null,
    subject = null,
    topic = null,
    bloomLevel = null,
    difficulty = null,
    questionCount = 10,
    timeLimitMinutes = 15,
    title = 'Engineering Practice Examination'
  } = config;

  const filters = {};
  if (department) filters.department = department;
  if (subject) filters.subject = subject;
  if (topic) filters.topic = topic;
  if (bloomLevel) filters.bloomLevel = bloomLevel;
  if (difficulty) filters.difficulty = difficulty;

  const queryResult = db.query(filters);
  let available = queryResult.questions;

  if (!available.length) {
    available = db.getAllQuestions();
  }

  // Shuffle candidate pool
  const shuffled = [...available].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

  const examId = `EXAM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    examId,
    title,
    department: department || 'Multi-Disciplinary Engineering',
    subject: subject || 'All Subjects',
    topic: topic || 'All Topics',
    questionCount: selected.length,
    timeLimitMinutes,
    timeLimitSeconds: timeLimitMinutes * 60,
    createdAt: new Date().toISOString(),
    questions: selected.map((q) => {
      const { answer, correctAnswer, keyConcepts, tolerance, ...publicView } = q;
      return publicView;
    })
  };
}

export function evaluateExam(db, submission = {}) {
  const { examId, answers = {}, timeSpentSeconds = 0 } = submission;

  const results = [];
  let totalScore = 0;
  let correctCount = 0;
  let partialCount = 0;
  let incorrectCount = 0;

  const bloomBreakdown = {};
  const conceptBreakdown = {};

  for (const [questionId, submittedAnswer] of Object.entries(answers)) {
    const question = db.getQuestion(questionId);
    if (!question) continue;

    const evalResult = deterministicEvaluate(question, submittedAnswer);
    totalScore += evalResult.score;

    if (evalResult.result === 'correct') correctCount += 1;
    else if (evalResult.result === 'partially_correct') partialCount += 1;
    else incorrectCount += 1;

    // Bloom breakdown tracking
    const bloom = question.bloomLevel || 'Understand';
    if (!bloomBreakdown[bloom]) bloomBreakdown[bloom] = { total: 0, scored: 0, count: 0 };
    bloomBreakdown[bloom].total += 100;
    bloomBreakdown[bloom].scored += evalResult.score;
    bloomBreakdown[bloom].count += 1;

    // Concept breakdown tracking
    const concept = question.concept || 'General';
    if (!conceptBreakdown[concept]) conceptBreakdown[concept] = { total: 0, scored: 0, count: 0 };
    conceptBreakdown[concept].total += 100;
    conceptBreakdown[concept].scored += evalResult.score;
    conceptBreakdown[concept].count += 1;

    results.push({
      questionId,
      prompt: question.questionText || question.prompt,
      concept: question.concept,
      bloomLevel: question.bloomLevel,
      submitted: submittedAnswer,
      evaluation: evalResult
    });
  }

  const attemptedCount = results.length;
  const overallPercentage = attemptedCount > 0 ? Math.round(totalScore / attemptedCount) : 0;

  // Compute percentage per Bloom level & Concept
  const bloomSummary = {};
  for (const [key, val] of Object.entries(bloomBreakdown)) {
    bloomSummary[key] = {
      scorePercentage: Math.round(val.scored / val.count),
      questionCount: val.count
    };
  }

  const conceptSummary = {};
  for (const [key, val] of Object.entries(conceptBreakdown)) {
    conceptSummary[key] = {
      scorePercentage: Math.round(val.scored / val.count),
      questionCount: val.count
    };
  }

  let grade = 'F';
  if (overallPercentage >= 85) grade = 'A+';
  else if (overallPercentage >= 75) grade = 'A';
  else if (overallPercentage >= 65) grade = 'B';
  else if (overallPercentage >= 50) grade = 'C';

  return {
    examId,
    totalQuestions: attemptedCount,
    correctCount,
    partialCount,
    incorrectCount,
    totalXP: totalScore,
    overallPercentage,
    grade,
    timeSpentSeconds,
    bloomSummary,
    conceptSummary,
    questionResults: results
  };
}
