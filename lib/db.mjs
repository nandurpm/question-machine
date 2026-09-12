// lib/db.mjs - Scalable Question Bank Data Access & Deduplication Engine

function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function replaceNumbers(text = '') {
  // Replace numbers standalone or attached to unit strings (e.g., 5a, 10kW, 400v)
  return text.replace(/\d+(\.\d+)?/g, '#NUM#');
}

function levenshteinDistance(str1 = '', str2 = '') {
  const m = str1.length;
  const n = str2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function textSimilarity(str1 = '', str2 = '') {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);
  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const maxLength = Math.max(norm1.length, norm2.length);
  const distance = levenshteinDistance(norm1, norm2);
  const levSimilarity = 1 - distance / maxLength;

  const tokens1 = new Set(norm1.split(' '));
  const tokens2 = new Set(norm2.split(' '));
  const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);
  const jaccardSimilarity = union.size === 0 ? 0 : intersection.size / union.size;

  return 0.5 * levSimilarity + 0.5 * jaccardSimilarity;
}

export class QuestionBankDB {
  constructor(initialQuestions = []) {
    this.questions = new Map();
    this.parentChildMap = new Map();
    this.conceptIndex = new Map();
    this.topicIndex = new Map();

    for (const q of initialQuestions) {
      this.addQuestion(q);
    }
  }

  validateQuestion(question) {
    if (!question || typeof question !== 'object') {
      throw new Error('Question must be an object');
    }
    const id = question.questionId || question.id;
    if (!id) throw new Error('Question must have a questionId or id');

    const prompt = question.questionText || question.prompt;
    if (!prompt) throw new Error('Question must have questionText or prompt');

    const type = question.questionType || question.type || 'multiple_choice';
    const concept = question.concept || question.topic || 'General';

    return {
      questionId: String(id),
      id: String(id),
      parentQuestionId: question.parentQuestionId ? String(question.parentQuestionId) : null,
      questionVersion: question.questionVersion || 1,
      subject: question.subject || 'Engineering Fundamentals',
      department: question.department || 'Electrical & Technical Engineering',
      category: question.category || 'Core Concepts',
      subCategory: question.subCategory || 'General',
      chapter: question.chapter || 'Overview',
      unit: question.unit || 'Unit 1',
      topic: question.topic || concept,
      concept: concept,
      subConcept: question.subConcept || '',
      questionType: type,
      type: type,
      difficulty: question.difficulty || 'Intermediate',
      difficultyScore: question.difficultyScore || (typeof question.difficulty === 'number' ? question.difficulty * 20 : 50),
      bloomLevel: question.bloomLevel || 'Understand',
      learningLevel: question.learningLevel || 'Diploma / Polytechnic',
      questionText: prompt,
      prompt: prompt,
      questionImage: question.questionImage || null,
      questionDiagram: question.questionDiagram || null,
      options: Array.isArray(question.options) ? question.options : [],
      items: Array.isArray(question.items) ? question.items : [],
      pairs: question.pairs || null,
      categories: question.categories || null,
      correctAnswer: question.correctAnswer ?? question.answer ?? null,
      answer: question.correctAnswer ?? question.answer ?? null,
      acceptableAnswers: Array.isArray(question.acceptableAnswers) ? question.acceptableAnswers : [],
      keyConcepts: Array.isArray(question.keyConcepts) ? question.keyConcepts : [],
      tolerance: question.tolerance ?? 0.02,
      modelAnswer: question.modelAnswer || question.explanation || '',
      shortAnswer: question.shortAnswer || '',
      detailedExplanation: question.detailedExplanation || question.explanation || '',
      explanation: question.detailedExplanation || question.explanation || '',
      reasoning: question.reasoning || question.explanation || '',
      hint1: question.hint1 || (question.hints ? question.hints[0] : ''),
      hint2: question.hint2 || (question.hints ? question.hints[1] : ''),
      hint3: question.hint3 || (question.hints ? question.hints[2] : ''),
      hints: Array.isArray(question.hints)
        ? question.hints
        : [question.hint1, question.hint2, question.hint3].filter(Boolean),
      commonMistake: question.commonMistake || '',
      whyThisQuestion: question.whyThisQuestion || `${concept} connects fundamental physical principles to applied engineering diagnosis.`,
      realWorldApplication: question.realWorldApplication || '',
      formula: question.formula || '',
      calculationData: question.calculationData || null,
      solutionSteps: Array.isArray(question.solutionSteps) ? question.solutionSteps : [],
      reference: question.reference || '',
      source: question.source || 'Standard Engineering Curriculum',
      tags: Array.isArray(question.tags) ? question.tags : [concept.toLowerCase()],
      keywords: Array.isArray(question.keywords) ? question.keywords : [],
      prerequisites: Array.isArray(question.prerequisites) ? question.prerequisites : [],
      relatedQuestions: Array.isArray(question.relatedQuestions) ? question.relatedQuestions : [],
      relatedConcepts: Array.isArray(question.relatedConcepts) ? question.relatedConcepts : [],
      language: question.language || 'en',
      status: question.status || 'verified',
      qualityScore: question.qualityScore || 95,
      createdDate: question.createdDate || new Date().toISOString(),
      updatedDate: question.updatedDate || new Date().toISOString(),
      verified: question.verified ?? true,
      verifiedBy: question.verifiedBy || 'Senior Faculty Editor',
      usageCount: question.usageCount || 0,
      correctCount: question.correctCount || 0,
      incorrectCount: question.incorrectCount || 0,
      averageTime: question.averageTime || 45,
      successRate: question.successRate || 0.75,
      next: question.next || null,
      branch: question.branch || 'Fundamentals'
    };
  }

  addQuestion(rawQuestion) {
    const q = this.validateQuestion(rawQuestion);
    this.questions.set(q.questionId, q);

    if (q.parentQuestionId) {
      if (!this.parentChildMap.has(q.parentQuestionId)) {
        this.parentChildMap.set(q.parentQuestionId, new Set());
      }
      this.parentChildMap.get(q.parentQuestionId).add(q.questionId);
    }

    if (!this.conceptIndex.has(q.concept)) {
      this.conceptIndex.set(q.concept, new Set());
    }
    this.conceptIndex.get(q.concept).add(q.questionId);

    if (!this.topicIndex.has(q.topic)) {
      this.topicIndex.set(q.topic, new Set());
    }
    this.topicIndex.get(q.topic).add(q.questionId);

    return q;
  }

  getQuestion(questionId) {
    return this.questions.get(String(questionId)) || null;
  }

  getAllQuestions() {
    return Array.from(this.questions.values());
  }

  getVariants(parentQuestionId) {
    const childIds = this.parentChildMap.get(String(parentQuestionId)) || new Set();
    return Array.from(childIds)
      .map((id) => this.getQuestion(id))
      .filter(Boolean);
  }

  detectDuplicate(candidateQuestion) {
    const q = this.validateQuestion(candidateQuestion);
    const textNorm = normalizeText(q.questionText);
    const textWithNumPlaceholder = replaceNumbers(textNorm);

    for (const existing of this.questions.values()) {
      if (existing.questionId === q.questionId) continue;

      const existingNorm = normalizeText(existing.questionText);
      const existingWithNumPlaceholder = replaceNumbers(existingNorm);

      // Exact duplicate
      if (textNorm === existingNorm) {
        return {
          isDuplicate: true,
          type: 'exact',
          matchedQuestionId: existing.questionId,
          similarityScore: 1.0,
          reason: 'Exact question text match'
        };
      }

      // Numerical duplicate
      if (
        textWithNumPlaceholder === existingWithNumPlaceholder &&
        textNorm !== existingNorm
      ) {
        return {
          isDuplicate: true,
          type: 'numerical',
          matchedQuestionId: existing.questionId,
          similarityScore: 0.95,
          reason: 'Identical problem structure with modified numerical values'
        };
      }

      // Semantic duplicate check (same concept + same type + high similarity)
      const similarity = textSimilarity(q.questionText, existing.questionText);
      if (similarity >= 0.85) {
        return {
          isDuplicate: true,
          type: 'near',
          matchedQuestionId: existing.questionId,
          similarityScore: Number(similarity.toFixed(2)),
          reason: `High wording similarity (${Math.round(similarity * 100)}%)`
        };
      }

      if (
        q.concept === existing.concept &&
        q.questionType === existing.questionType &&
        q.bloomLevel === existing.bloomLevel &&
        similarity >= 0.75
      ) {
        return {
          isDuplicate: true,
          type: 'semantic',
          matchedQuestionId: existing.questionId,
          similarityScore: Number(similarity.toFixed(2)),
          reason: 'Identical concept, Bloom level, and high wording similarity'
        };
      }
    }

    return {
      isDuplicate: false,
      type: null,
      matchedQuestionId: null,
      similarityScore: 0,
      reason: 'No duplicate detected'
    };
  }

  query(filters = {}) {
    let result = Array.from(this.questions.values());

    if (filters.department) {
      const dep = filters.department.toLowerCase();
      result = result.filter((q) => q.department.toLowerCase() === dep);
    }

    if (filters.subject) {
      const subj = filters.subject.toLowerCase();
      result = result.filter((q) => q.subject.toLowerCase() === subj);
    }

    if (filters.topic) {
      const top = filters.topic.toLowerCase();
      result = result.filter(
        (q) => q.topic.toLowerCase() === top || q.concept.toLowerCase() === top
      );
    }

    if (filters.concept) {
      const con = filters.concept.toLowerCase();
      result = result.filter((q) => q.concept.toLowerCase() === con);
    }

    if (filters.bloomLevel) {
      const bloom = filters.bloomLevel.toLowerCase();
      result = result.filter((q) => q.bloomLevel.toLowerCase() === bloom);
    }

    if (filters.questionType) {
      const qtype = filters.questionType.toLowerCase();
      result = result.filter((q) => q.questionType.toLowerCase() === qtype);
    }

    if (filters.difficulty) {
      const diff = filters.difficulty.toLowerCase();
      result = result.filter((q) => String(q.difficulty).toLowerCase() === diff);
    }

    if (filters.minDifficultyScore !== undefined) {
      result = result.filter((q) => q.difficultyScore >= filters.minDifficultyScore);
    }

    if (filters.maxDifficultyScore !== undefined) {
      result = result.filter((q) => q.difficultyScore <= filters.maxDifficultyScore);
    }

    if (filters.search) {
      const term = normalizeText(filters.search);
      result = result.filter(
        (q) =>
          normalizeText(q.questionText).includes(term) ||
          normalizeText(q.concept).includes(term) ||
          normalizeText(q.topic).includes(term) ||
          q.tags.some((t) => normalizeText(t).includes(term))
      );
    }

    const offset = filters.offset || 0;
    const limit = filters.limit || result.length;

    return {
      total: result.length,
      questions: result.slice(offset, offset + limit)
    };
  }
}
