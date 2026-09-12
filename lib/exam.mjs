// lib/exam.mjs - Scalable Exam Generator & Evaluation Engine

import { deterministicEvaluate } from './evaluator.mjs';

const boundedInteger = (value, fallback, minimum, maximum) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
};

const hasSubmittedAnswer = (value) => {
  if (Array.isArray(value)) return value.length > 0 && value.every(hasSubmittedAnswer);
  if (value && typeof value === 'object') {
    const values = Object.values(value);
    return values.length > 0 && values.every(hasSubmittedAnswer);
  }
  return value === 0 || String(value ?? '').trim().length > 0;
};

function shuffledCopy(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function generateExam(db, config = {}) {
  const {
    department = null,
    subject = null,
    topic = null,
    bloomLevel = null,
    difficulty = null,
    questionCount: requestedQuestionCount = 10,
    timeLimitMinutes: requestedTimeLimit = 15,
    title = 'Engineering Practice Examination'
  } = config;

  const questionCount = boundedInteger(requestedQuestionCount, 10, 1, 100);
  const timeLimitMinutes = boundedInteger(requestedTimeLimit, 15, 1, 180);

  const filters = {};
  if (department) filters.department = department;
  if (subject) filters.subject = subject;
  if (topic) filters.topic = topic;
  if (bloomLevel) filters.bloomLevel = bloomLevel;
  if (difficulty) filters.difficulty = difficulty;

  const queryResult = db.query(filters);
  let available = queryResult.questions;

  if (!available.length) {
    throw new Error('No questions match the selected filters. Try a broader department, subject, or Bloom level.');
  }

  const shuffled = shuffledCopy(available);
  const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

  const examId = `EXAM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    examId,
    title,
    department: department || 'Multi-Disciplinary Engineering',
    subject: subject || 'All Subjects',
    topic: topic || 'All Topics',
    questionCount: selected.length,
    requestedQuestionCount: questionCount,
    availableQuestionCount: available.length,
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
  const submittedQuestionIds = Array.isArray(submission.questionIds)
    ? submission.questionIds
    : Object.keys(answers);
  const questionIds = [...new Set(submittedQuestionIds.map(String))].slice(0, 100);

  const results = [];
  let totalScore = 0;
  let correctCount = 0;
  let partialCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const bloomBreakdown = {};
  const conceptBreakdown = {};

  for (const questionId of questionIds) {
    const question = db.getQuestion(questionId);
    if (!question) continue;

    const submittedAnswer = answers[questionId];
    const answered = hasSubmittedAnswer(submittedAnswer);
    const evalResult = answered
      ? deterministicEvaluate(question, submittedAnswer)
      : {
          result: 'incorrect',
          score: 0,
          confidence: 1,
          matchedConcepts: [],
          missingConcepts: [],
          misconceptions: [],
          feedback: 'No answer was submitted for this question.',
          modelAnswer: question.explanation || question.detailedExplanation || question.modelAnswer || '',
          source: 'deterministic'
        };

    if (!answered) unansweredCount += 1;
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
      submitted: answered ? submittedAnswer : '',
      answered,
      evaluation: evalResult
    });
  }

  const totalQuestions = results.length;
  const attemptedCount = totalQuestions - unansweredCount;
  const overallPercentage = totalQuestions > 0 ? Math.round(totalScore / totalQuestions) : 0;

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
    totalQuestions,
    attemptedCount,
    unansweredCount,
    correctCount,
    partialCount,
    incorrectCount,
    totalXP: totalScore,
    overallPercentage,
    grade,
    timeSpentSeconds: Math.max(0, Number(timeSpentSeconds) || 0),
    bloomSummary,
    conceptSummary,
    questionResults: results
  };
}
