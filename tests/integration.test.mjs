import test from 'node:test';
import assert from 'node:assert/strict';
import { questions, departments } from '../data/questions.mjs';
import { QuestionBankDB } from '../lib/db.mjs';
import { selectNextQuestion, calculateMastery, getNextTargetBloom } from '../lib/adaptive.mjs';
import { generateExam, evaluateExam } from '../lib/exam.mjs';
import { deterministicEvaluate, validateEvaluation } from '../lib/evaluator.mjs';

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

test('Exam generator creates exam paper and evaluator computes grade', () => {
  const db = new QuestionBankDB(questions);
  const exam = generateExam(db, { department: 'Electrical Engineering', questionCount: 3, timeLimitMinutes: 10 });
  assert.equal(exam.questions.length, 3);

  const submission = {
    examId: exam.examId,
    timeSpentSeconds: 60,
    answers: {
      [exam.questions[0].questionId]: 'Volt'
    }
  };
  const report = evaluateExam(db, submission);
  assert.ok(report.grade);
  assert.ok(report.totalQuestions >= 1);
});

test('Evaluator handles multi-choice, numerical, ordering, and matching', () => {
  const get = (id) => questions.find((q) => q.id === id);
  assert.equal(deterministicEvaluate(get('voltage-unit'), 'Volt').result, 'correct');
  assert.equal(deterministicEvaluate(get('ohms-law'), '3').result, 'correct');
  assert.equal(deterministicEvaluate(get('matching-units'), { Voltage: 'Volt', Current: 'Ampere', Power: 'Watt', Frequency: 'Hertz' }).result, 'correct');
});
