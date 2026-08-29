/*
 * ============================================================
 * FILE: evaluator.test.mjs
 * PURPOSE: Exercises Question Machine's domain behavior, validation, persistence, reporting, and safety boundaries with the Node.js test runner.
 * ============================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { questions } from '../data/questions.mjs';
import { deterministicEvaluate, validateEvaluation } from '../lib/evaluator.mjs';
const get = (id) => questions.find((item) => item.id === id);
test('grades multiple choice deterministically', () => assert.equal(deterministicEvaluate(get('voltage-unit'), 'Volt').result, 'correct'));
test('accepts numerical answers inside tolerance with a unit', () => assert.equal(deterministicEvaluate(get('ohms-law'), '3.01 A').result, 'correct'));
test('marks a concept answer partially correct when concepts are missing', () => assert.equal(deterministicEvaluate(get('diode-explain'), 'A semiconductor component').result, 'partially_correct'));
test('keeps open answers as needs review when no required concept matches', () => assert.equal(deterministicEvaluate(get('power-scenario'), 'It changes').result, 'needs_review'));
test('grades matching answers deterministically', () => assert.equal(deterministicEvaluate(get('matching-units'), { Voltage: 'Volt', Current: 'Ampere', Power: 'Watt' }).result, 'correct'));
test('rejects malformed semantic evaluator output', () => assert.equal(validateEvaluation({ result: 'correct', score: 130, confidence: 2 }), null));
