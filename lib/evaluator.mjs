const clean = (value) => String(value ?? '').trim().toLowerCase().replace(/[.,;:!?]/g, '').replace(/\s+/g, ' ');

export function validateEvaluation(value) {
  const allowed = new Set(['correct', 'partially_correct', 'incorrect', 'needs_review']);
  if (!value || !allowed.has(value.result) || !Number.isFinite(value.score) || value.score < 0 || value.score > 100 || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) return null;
  return { result: value.result, score: Math.round(value.score), confidence: Number(value.confidence.toFixed(2)), matchedConcepts: Array.isArray(value.matchedConcepts) ? value.matchedConcepts.slice(0, 8) : [], missingConcepts: Array.isArray(value.missingConcepts) ? value.missingConcepts.slice(0, 8) : [], misconceptions: Array.isArray(value.misconceptions) ? value.misconceptions.slice(0, 4) : [], feedback: String(value.feedback || '').slice(0, 700), modelAnswer: String(value.modelAnswer || '').slice(0, 900), source: value.source || 'deterministic' };
}

function response(result, score, feedback, question, extra = {}) {
  return validateEvaluation({ result, score, confidence: extra.confidence ?? 1, matchedConcepts: extra.matchedConcepts ?? [], missingConcepts: extra.missingConcepts ?? [], misconceptions: extra.misconceptions ?? [], feedback, modelAnswer: question.explanation, source: extra.source ?? 'deterministic' });
}

function numericValue(value) {
  const match = String(value).replace(',', '.').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/i);
  return match ? Number(match[0]) : Number.NaN;
}

export function deterministicEvaluate(question, submitted) {
  const answer = clean(submitted);
  if (!answer) return response('needs_review', 0, 'Enter an answer before asking for feedback.', question, { confidence: 1 });
  if (question.type === 'multiple_choice' || question.type === 'true_false') {
    return clean(question.answer) === answer ? response('correct', 100, 'Correct. You selected the expected answer.', question) : response('incorrect', 0, 'That option is not the expected answer. Review the model answer and explanation.', question, { misconceptions: [String(submitted)] });
  }
  if (question.type === 'fill_blank') {
    const accepted = question.answer.map(clean);
    return accepted.includes(answer) ? response('correct', 100, 'Correct. Your term matches an accepted unit name or symbol.', question) : response('incorrect', 0, 'That term does not match the expected unit. Check spelling and the SI name.', question);
  }
  if (question.type === 'numerical') {
    const actual = numericValue(submitted);
    const expected = Number(question.answer);
    if (!Number.isFinite(actual)) return response('needs_review', 0, 'Enter a numerical value such as 3 A or 3.0.', question);
    const tolerance = Math.max(question.tolerance ?? 0.01, Math.abs(expected) * (question.tolerance ?? 0.01));
    return Math.abs(actual - expected) <= tolerance ? response('correct', 100, `Correct. ${actual} is within the accepted tolerance of ${expected} ${question.unit || ''}.`, question) : response('incorrect', 0, `${actual} is outside the accepted tolerance. Recheck the relationship and units.`, question);
  }
  if (question.type === 'ordering') {
    const selected = Array.isArray(submitted) ? submitted : [];
    const correct = selected.length === question.answer.length && selected.every((item, index) => item === question.answer[index]);
    const matches = selected.filter((item, index) => item === question.answer[index]).length;
    return correct ? response('correct', 100, 'Correct sequence. The safety-first order is complete.', question) : response(matches ? 'partially_correct' : 'incorrect', Math.round((matches / question.answer.length) * 100), 'Some steps are out of sequence. Read the explanation before trying the next question.', question);
  }
  if (question.type === 'matching') {
    const expected = question.answer || {};
    const pairs = Object.keys(expected);
    const matches = pairs.filter((key) => submitted?.[key] === expected[key]).length;
    if (matches === pairs.length) return response('correct', 100, 'All quantities are matched to their correct SI units.', question);
    return response(matches ? 'partially_correct' : 'incorrect', Math.round((matches / pairs.length) * 100), 'One or more quantities are matched to the wrong unit. Review the model answer.', question);
  }
  const concepts = (question.keyConcepts || []).filter((concept) => answer.includes(clean(concept)));
  const missing = (question.keyConcepts || []).filter((concept) => !concepts.includes(concept));
  if (concepts.length === (question.keyConcepts || []).length && concepts.length) return response('correct', 100, 'You included the main required concepts. Compare your phrasing with the model answer for precision.', question, { matchedConcepts: concepts });
  if (concepts.length) return response('partially_correct', Math.round((concepts.length / question.keyConcepts.length) * 100), 'You identified part of the idea, but one or more key concepts are missing.', question, { matchedConcepts: concepts, missingConcepts: missing });
  return response('needs_review', 0, 'This open response needs semantic review. Deterministic matching could not confirm the expected concepts.', question, { missingConcepts: question.keyConcepts || [], confidence: 0.35 });
}

export async function nvidiaEvaluate(question, submitted, apiKey, model) {
  const prompt = `Grade only the student answer using the supplied question and expected concepts. Do not invent facts, do not change the question, and return JSON only with result (correct|partially_correct|incorrect|needs_review), score (0-100), confidence (0-1), matchedConcepts, missingConcepts, misconceptions, feedback, modelAnswer. If uncertain use needs_review.\nQuestion: ${question.prompt}\nExpected answer: ${question.answer}\nKey concepts: ${(question.keyConcepts || []).join(', ')}\nStudent answer: ${submitted}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const result = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, temperature: 0.1, max_tokens: 500, messages: [{ role: 'system', content: 'You are a cautious engineering tutor. Return JSON only.' }, { role: 'user', content: prompt }] }), signal: controller.signal });
    if (!result.ok) throw new Error(`Provider returned ${result.status}`);
    const payload = await result.json();
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(String(content).match(/\{[\s\S]*\}/)?.[0] || '');
    return validateEvaluation({ ...parsed, source: 'nvidia-semantic' });
  } finally { clearTimeout(timeout); }
}
