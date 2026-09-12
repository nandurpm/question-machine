const clean = (value) => String(value ?? '').trim().toLowerCase().replace(/[.,;:!?]/g, '').replace(/\s+/g, ' ');

export function validateEvaluation(value) {
  const allowed = new Set(['correct', 'partially_correct', 'incorrect', 'needs_review']);
  if (!value || !allowed.has(value.result) || !Number.isFinite(value.score) || value.score < 0 || value.score > 100 || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) return null;
  return {
    result: value.result,
    score: Math.round(value.score),
    confidence: Number(value.confidence.toFixed(2)),
    matchedConcepts: Array.isArray(value.matchedConcepts) ? value.matchedConcepts.slice(0, 8) : [],
    missingConcepts: Array.isArray(value.missingConcepts) ? value.missingConcepts.slice(0, 8) : [],
    misconceptions: Array.isArray(value.misconceptions) ? value.misconceptions.slice(0, 4) : [],
    feedback: String(value.feedback || '').slice(0, 700),
    modelAnswer: String(value.modelAnswer || '').slice(0, 900),
    source: value.source || 'deterministic'
  };
}

function response(result, score, feedback, question = {}, extra = {}) {
  return validateEvaluation({
    result,
    score,
    confidence: extra.confidence ?? 1,
    matchedConcepts: extra.matchedConcepts ?? [],
    missingConcepts: extra.missingConcepts ?? [],
    misconceptions: extra.misconceptions ?? [],
    feedback,
    modelAnswer: question.explanation || question.detailedExplanation || question.modelAnswer || '',
    source: extra.source ?? 'deterministic'
  });
}

function numericValue(value) {
  const match = String(value).replace(',', '.').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/i);
  return match ? Number(match[0]) : Number.NaN;
}

export function deterministicEvaluate(question = {}, submitted) {
  const answer = clean(submitted);
  const qtype = question.questionType || question.type || 'multiple_choice';

  if (!submitted && submitted !== 0 && qtype !== 'ordering' && qtype !== 'matching' && qtype !== 'classification') {
    return response('needs_review', 0, 'Enter an answer before asking for feedback.', question, { confidence: 1 });
  }

  // 1. Basic Single Select (Multiple Choice & True/False)
  if (qtype === 'multiple_choice' || qtype === 'true_false') {
    const expected = question.correctAnswer ?? question.answer;
    return clean(expected) === answer
      ? response('correct', 100, 'Correct. You selected the expected answer.', question)
      : response('incorrect', 0, 'That option is not the expected answer. Review the model answer and explanation.', question, { misconceptions: [String(submitted)] });
  }

  // 2. Multiple Correct Answers
  if (qtype === 'multiple_correct') {
    const expectedArray = Array.isArray(question.correctAnswer)
      ? question.correctAnswer
      : Array.isArray(question.answer)
      ? question.answer
      : [];
    const submittedArray = Array.isArray(submitted) ? submitted : [submitted];

    const expectedClean = expectedArray.map(clean);
    const submittedClean = submittedArray.map(clean);

    const correctMatches = submittedClean.filter((item) => expectedClean.includes(item)).length;
    const extraFalse = submittedClean.filter((item) => !expectedClean.includes(item)).length;

    if (correctMatches === expectedClean.length && extraFalse === 0 && submittedClean.length === expectedClean.length) {
      return response('correct', 100, 'Correct! You identified all correct options.', question);
    }
    const score = Math.max(0, Math.round(((correctMatches - extraFalse) / expectedClean.length) * 100));
    return response(score > 0 ? 'partially_correct' : 'incorrect', score, 'Some selections are incorrect or missing. Review the explanation.', question);
  }

  // 3. Fill in the Blank
  if (qtype === 'fill_blank') {
    const expectedList = Array.isArray(question.correctAnswer)
      ? question.correctAnswer
      : Array.isArray(question.answer)
      ? question.answer
      : [question.correctAnswer || question.answer];
    const accepted = expectedList.map(clean);
    return accepted.includes(answer)
      ? response('correct', 100, 'Correct. Your term matches an accepted technical term or unit name.', question)
      : response('incorrect', 0, 'That term does not match the expected answer. Check spelling and technical terminology.', question);
  }

  // 4. Numerical & Calculation
  if (qtype === 'numerical' || qtype === 'calculation' || qtype === 'formula') {
    const actual = numericValue(submitted);
    const expected = Number(question.correctAnswer ?? question.answer);
    if (!Number.isFinite(actual)) return response('needs_review', 0, 'Enter a numerical value such as 3, 3.5, or 3 A.', question);
    const tol = Math.max(question.tolerance ?? 0.02, Math.abs(expected) * (question.tolerance ?? 0.02));
    return Math.abs(actual - expected) <= tol
      ? response('correct', 100, `Correct. ${actual} is within the accepted tolerance of ${expected} ${question.unit || ''}.`, question)
      : response('incorrect', 0, `${actual} is outside the accepted tolerance. Recheck the mathematical relationship and units.`, question);
  }

  // 5. Ordering / Sequence
  if (qtype === 'ordering') {
    const selected = Array.isArray(submitted) ? submitted : [];
    const expected = question.correctAnswer || question.answer || [];
    const correct = selected.length === expected.length && selected.every((item, index) => item === expected[index]);
    const matches = selected.filter((item, index) => item === expected[index]).length;
    return correct
      ? response('correct', 100, 'Correct sequence! All steps are arranged in exact order.', question)
      : response(matches ? 'partially_correct' : 'incorrect', Math.round((matches / expected.length) * 100), 'Some steps are out of sequence. Review the explanation before proceeding.', question);
  }

  // 6. Matching Pair
  if (qtype === 'matching') {
    const expected = question.pairs || question.correctAnswer || question.answer || {};
    const pairs = Object.keys(expected);
    const matches = pairs.filter((key) => submitted?.[key] === expected[key]).length;
    if (matches === pairs.length) return response('correct', 100, 'All quantities/items are matched to their correct counterparts.', question);
    return response(matches ? 'partially_correct' : 'incorrect', Math.round((matches / pairs.length) * 100), 'One or more items are matched incorrectly. Review the model answer.', question);
  }

  // 7. Classification
  if (qtype === 'classification') {
    const expected = question.categories || question.correctAnswer || question.answer || {};
    const keys = Object.keys(expected);
    const matches = keys.filter((key) => submitted?.[key] === expected[key]).length;
    if (matches === keys.length) return response('correct', 100, 'All items are correctly classified.', question);
    return response(matches ? 'partially_correct' : 'incorrect', Math.round((matches / keys.length) * 100), 'Some items are misclassified. Check categories in the model answer.', question);
  }

  // 8. Open Responses (Short Answer, Scenario, Troubleshooting, Diagnostic, Assertion-Reason)
  const keyConcepts = (question.keyConcepts || []).map(clean);
  const matched = (question.keyConcepts || []).filter((concept) => answer.includes(clean(concept)));
  const missing = (question.keyConcepts || []).filter((concept) => !matched.includes(concept));

  if (keyConcepts.length && matched.length === keyConcepts.length) {
    return response('correct', 100, 'You included all required technical concepts. Compare your phrasing with the model answer for precision.', question, { matchedConcepts: matched });
  }
  if (matched.length) {
    return response('partially_correct', Math.round((matched.length / keyConcepts.length) * 100), 'You identified part of the core engineering concept, but one or more key ideas are missing.', question, { matchedConcepts: matched, missingConcepts: missing });
  }

  return response('needs_review', 0, 'This open response needs semantic review. Deterministic matching could not confirm the expected key concepts.', question, { missingConcepts: question.keyConcepts || [], confidence: 0.35 });
}

export async function nvidiaEvaluate(question = {}, submitted, apiKey, model) {
  const prompt = `Grade only the student answer using the supplied question and expected concepts. Do not invent facts, do not change the question, and return JSON only with result (correct|partially_correct|incorrect|needs_review), score (0-100), confidence (0-1), matchedConcepts, missingConcepts, misconceptions, feedback, modelAnswer. If uncertain use needs_review.\nQuestion: ${question.prompt || question.questionText}\nExpected answer: ${question.answer || question.correctAnswer}\nKey concepts: ${(question.keyConcepts || []).join(', ')}\nStudent answer: ${submitted}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const result = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.1, max_tokens: 500, messages: [{ role: 'system', content: 'You are a cautious engineering tutor. Return JSON only.' }, { role: 'user', content: prompt }] }),
      signal: controller.signal
    });
    if (!result.ok) throw new Error(`Provider returned ${result.status}`);
    const payload = await result.json();
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(String(content).match(/\{[\s\S]*\}/)?.[0] || '');
    return validateEvaluation({ ...parsed, source: 'nvidia-semantic' });
  } finally {
    clearTimeout(timeout);
  }
}
