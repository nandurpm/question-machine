import test from 'node:test';
import assert from 'node:assert/strict';
import { questions, departments } from '../data/questions.mjs';
import { QuestionBankDB } from '../lib/db.mjs';
import { selectNextQuestion, calculateMastery, getNextTargetBloom } from '../lib/adaptive.mjs';
import { generateExam, evaluateExam } from '../lib/exam.mjs';
import { deterministicEvaluate, validateEvaluation } from '../lib/evaluator.mjs';
import { resolveTaxonomyFilters } from '../lib/taxonomy.mjs';

test('DB stores questions and validates fields', () => {
  const db = new QuestionBankDB(questions);
  assert.equal(db.getAllQuestions().length, questions.length);
  assert.ok(departments.length >= 3);
});

test('Deduplication detects exact and numerical duplicates', () => {
  const db = new QuestionBankDB(questions);
  const exact = db.detectDuplicate({
    id: 'dup1',
    prompt: 'What is the SI unit of voltage (electrical potential difference)?',
    concept: 'Voltage'
  });
  assert.equal(exact.isDuplicate, true);
  assert.equal(exact.type, 'exact');

  const numDup = db.detectDuplicate({
    id: 'dup2',
    prompt: 'A circuit has 24 V DC supplied across a 8 Ω resistor. Calculate the circuit current in Amperes.',
    concept: 'Ohm’s law'
  });
  assert.equal(numDup.isDuplicate, true);
  assert.equal(numDup.type, 'numerical');
});

test('Adaptive selection advances Bloom level on high score', () => {
  const db = new QuestionBankDB(questions);
  const userProfile = {
    mode: 'deep',
    topic: 'Voltage',
    seenQuestionIds: ['voltage-unit'],
    attempts: {
      'voltage-unit': { concept: 'Voltage', score: 90, bloomLevel: 'Remember' }
    }
  };
  const targetBloom = getNextTargetBloom(userProfile.attempts['voltage-unit']);
  assert.equal(targetBloom, 'Understand');
  const nextQ = selectNextQuestion(db, userProfile);
  assert.ok(nextQ);
});

test('taxonomy IDs resolve to question-bank names', () => {
  assert.deepEqual(
    resolveTaxonomyFilters(departments, { department: 'ELEV', subject: 'ELEV-ESC-ELEC' }),
    {
      department: 'Escalator & Elevator Engineering',
      subject: 'Escalator Electrical & Safety Systems'
    }
  );
});

test('Exam generator honors filters and evaluator counts unanswered questions', () => {
  const db = new QuestionBankDB(questions);
  const filters = resolveTaxonomyFilters(departments, { department: 'ELEV' });
  const exam = generateExam(db, { ...filters, questionCount: 3, timeLimitMinutes: 10 });
  assert.equal(exam.questions.length, 3);
  assert.ok(exam.questions.every((question) => question.department === 'Escalator & Elevator Engineering'));

  const submission = {
    examId: exam.examId,
    questionIds: exam.questions.map((question) => question.questionId),
    timeSpentSeconds: 60,
    answers: {
      [exam.questions[0].questionId]: 'intentionally incorrect'
    }
  };
  const report = evaluateExam(db, submission);
  assert.equal(report.totalQuestions, 3);
  assert.equal(report.attemptedCount, 1);
  assert.equal(report.unansweredCount, 2);
  assert.equal(report.incorrectCount, 3);
  assert.equal(report.overallPercentage, 0);
});

test('Exam generator rejects filter combinations with no questions', () => {
  const db = new QuestionBankDB(questions);
  assert.throws(
    () => generateExam(db, { department: 'Electrical Engineering', bloomLevel: 'Create' }),
    /No questions match/
  );
});

test('Exam score denominator includes blank questions', () => {
  const db = new QuestionBankDB(questions);
  const report = evaluateExam(db, {
    examId: 'exam-test',
    questionIds: ['voltage-unit', 'current-meaning'],
    answers: { 'voltage-unit': 'Volt' }
  });

  assert.equal(report.correctCount, 1);
  assert.equal(report.unansweredCount, 1);
  assert.equal(report.overallPercentage, 50);
});

test('Evaluator handles multi-choice, numerical, ordering, and matching', () => {
  const get = (id) => questions.find((q) => q.id === id);
  assert.equal(deterministicEvaluate(get('voltage-unit'), 'Volt').result, 'correct');
  assert.equal(deterministicEvaluate(get('ohms-law'), '3').result, 'correct');
  assert.equal(deterministicEvaluate(get('matching-units'), { Voltage: 'Volt', Current: 'Ampere', Power: 'Watt', Frequency: 'Hertz' }).result, 'correct');
});
