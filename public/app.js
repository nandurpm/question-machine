const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = 'question-machine:attempts';

function loadAttempts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .slice(-500)
        .filter(([, attempt]) => attempt && typeof attempt === 'object' && !Array.isArray(attempt))
        .map(([questionId, attempt]) => [String(questionId).slice(0, 120), {
          concept: String(attempt.concept || 'General').slice(0, 160),
          result: ['correct', 'partially_correct', 'incorrect', 'needs_review'].includes(attempt.result)
            ? attempt.result
            : 'needs_review',
          score: Math.min(100, Math.max(0, Number(attempt.score) || 0)),
          bloomLevel: String(attempt.bloomLevel || 'Remember').slice(0, 40),
          attemptedAt: String(attempt.attemptedAt || '').slice(0, 40)
        }])
    );
  } catch {
    return {};
  }
}

const state = {
  questions: [],
  concepts: [],
  departments: [],
  currentQuestion: null,
  currentEvaluation: null,
  questionRequestId: 0,
  userProfile: {
    department: '',
    subject: '',
    topic: '',
    mode: 'deep',
    attempts: loadAttempts(),
    seenQuestionIds: []
  },
  streak: 0,
  hint: 0,
  activeTab: 'welcome',
  toastTimer: null,
  exam: {
    paper: null,
    currentIndex: 0,
    answers: {},
    timerInterval: null,
    endsAt: 0,
    remainingSeconds: 0,
    status: 'idle',
    submitting: false,
    report: null
  }
};

const labels = {
  correct: ['Correct', '✓'],
  partially_correct: ['Developing', '≈'],
  incorrect: ['Needs revision', '!'],
  needs_review: ['Needs review', '?']
};

const escapeHTML = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function hasAnswer(value) {
  if (Array.isArray(value)) return value.length > 0 && value.every(hasAnswer);
  if (value && typeof value === 'object') {
    const values = Object.values(value);
    return values.length > 0 && values.every(hasAnswer);
  }
  return value === 0 || String(value ?? '').trim().length > 0;
}

function formatAnswer(value) {
  if (!hasAnswer(value)) return 'Not answered';
  if (Array.isArray(value)) return value.join(' → ');
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => `${key}: ${item}`).join(' · ');
  }
  return String(value);
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.userProfile.attempts));
  } catch {
    showToast('Progress could not be saved in this browser.', 'warning');
  }
}

function showToast(message, tone = 'info') {
  const toast = $('#toast');
  if (!toast) return;
  clearTimeout(state.toastTimer);
  toast.textContent = message;
  toast.className = `toast ${tone}`;
  state.toastTimer = setTimeout(() => toast.classList.add('hidden'), 4500);
}

function departmentById(id) {
  return state.departments.find((department) => department.id === id);
}

function subjectById(id) {
  return state.departments
    .flatMap((department) => department.subjects || [])
    .find((subject) => subject.id === id);
}

function optionMarkup(items) {
  return items.map((item) =>
    `<option value="${escapeHTML(item.id)}">${escapeHTML(item.name)}</option>`
  ).join('');
}

function renderTaxonomyOptions() {
  const departmentOptions = '<option value="">All Departments</option>' + optionMarkup(state.departments);
  $('#departmentSelect').innerHTML = departmentOptions;
  $('#examDeptSelect').innerHTML = departmentOptions;
  updateSubjectOptions('study');
  updateSubjectOptions('exam');
}

function updateSubjectOptions(context) {
  const isExam = context === 'exam';
  const departmentSelect = $(isExam ? '#examDeptSelect' : '#departmentSelect');
  const subjectSelect = $(isExam ? '#examSubjectSelect' : '#subjectSelect');
  if (!departmentSelect || !subjectSelect) return;

  const previousValue = subjectSelect.value;
  const department = departmentById(departmentSelect.value);
  const subjects = department?.subjects || [];
  subjectSelect.innerHTML = '<option value="">All Subjects</option>' + optionMarkup(subjects);
  if (subjects.some((subject) => subject.id === previousValue)) subjectSelect.value = previousValue;
}

function filteredQuestions() {
  const departmentName = departmentById(state.userProfile.department)?.name;
  const subjectName = subjectById(state.userProfile.subject)?.name;

  return state.questions.filter((question) => {
    if (departmentName && question.department !== departmentName) return false;
    if (subjectName && question.subject !== subjectName) return false;
    if (state.userProfile.topic && question.topic !== state.userProfile.topic && question.concept !== state.userProfile.topic) return false;
    return true;
  });
}

function renderTree() {
  const explored = new Map(Object.values(state.userProfile.attempts).map((attempt) => [attempt.concept, attempt.result]));
  const treeRoot = $('#tree');
  if (!treeRoot) return;

  const departmentName = departmentById(state.userProfile.department)?.name;
  const visibleConcepts = departmentName
    ? state.concepts.filter((concept) => concept.department === departmentName)
    : state.concepts;

  treeRoot.innerHTML = visibleConcepts.map((concept) => {
    const result = explored.get(concept.id);
    const active = state.currentQuestion?.concept === concept.id || state.userProfile.topic === concept.id;
    const klass = active
      ? 'active'
      : result === 'correct'
        ? 'strong'
        : result === 'partially_correct'
          ? 'developing'
          : result === 'incorrect' || result === 'needs_review'
            ? 'review'
            : '';
    return `<button type="button" class="tree-node ${klass}" data-concept="${escapeHTML(concept.id)}" ${active ? 'aria-current="true"' : ''}><i aria-hidden="true"></i><span>${escapeHTML(concept.id)}</span></button>`;
  }).join('');

  treeRoot.querySelectorAll('.tree-node').forEach((button) => {
    button.onclick = () => {
      state.userProfile.topic = button.dataset.concept;
      state.currentQuestion = null;
      closeTaxonomyPanel();
      switchTab('learning');
    };
  });
}

function answerValue(question, rootContainerSelector = '#questionInput') {
  const root = $(rootContainerSelector) || document;
  const questionType = question.questionType || question.type;

  if (questionType === 'multiple_choice' || questionType === 'true_false') {
    return root.querySelector('input[type="radio"]:checked')?.value || '';
  }
  if (questionType === 'multiple_correct') {
    return [...root.querySelectorAll('input[type="checkbox"]:checked')].map((element) => element.value);
  }
  if (questionType === 'ordering') {
    return [...root.querySelectorAll('[data-order]')]
      .filter((item) => item.value)
      .sort((left, right) => Number(left.value) - Number(right.value))
      .map((item) => item.dataset.order);
  }
  if (questionType === 'matching' || questionType === 'classification') {
    return Object.fromEntries(
      [...root.querySelectorAll('[data-match]')].map((item) => [item.dataset.match, item.value])
    );
  }
  return root.querySelector('#answer, .answer-field')?.value || '';
}

function renderInput(question, rootSelector = '#questionInput', namePrefix = 'answer') {
  const root = $(rootSelector);
  if (!root) return;
  const questionType = question.questionType || question.type;
  const safeName = escapeHTML(namePrefix);

  if (['multiple_choice', 'true_false'].includes(questionType)) {
    const options = question.options || ['True', 'False'];
    root.innerHTML = options.map((option) =>
      `<label class="choice"><input type="radio" name="${safeName}" value="${escapeHTML(option)}"><span>${escapeHTML(option)}</span></label>`
    ).join('');
    return;
  }

  if (questionType === 'multiple_correct') {
    root.innerHTML = (question.options || []).map((option) =>
      `<label class="choice"><input type="checkbox" name="${safeName}" value="${escapeHTML(option)}"><span>${escapeHTML(option)}</span></label>`
    ).join('');
    return;
  }

  if (questionType === 'ordering') {
    const items = question.items || [];
    root.innerHTML = items.map((item, index) =>
      `<label class="order-row"><span>${escapeHTML(item)}</span><select aria-label="Position for ${escapeHTML(item)}">${items.map((_, itemIndex) => `<option value="${itemIndex + 1}" ${index === itemIndex ? 'selected' : ''}>Step ${itemIndex + 1}</option>`).join('')}</select><input type="hidden" data-order="${escapeHTML(item)}" value="${index + 1}"></label>`
    ).join('');
    root.querySelectorAll('select').forEach((select) => {
      select.onchange = () => {
        select.nextElementSibling.value = select.value;
      };
    });
    return;
  }

  if (questionType === 'matching' || questionType === 'classification') {
    const mapping = questionType === 'matching' ? (question.pairs || {}) : (question.categories || {});
    const prompt = questionType === 'matching' ? 'Select a match…' : 'Select a category…';
    const values = [...new Set(Object.values(mapping))];
    root.innerHTML = Object.keys(mapping).map((item) =>
      `<label class="order-row"><span>${escapeHTML(item)}</span><select data-match="${escapeHTML(item)}" aria-label="${questionType === 'matching' ? 'Target' : 'Category'} for ${escapeHTML(item)}"><option value="">${prompt}</option>${values.map((value) => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join('')}</select></label>`
    ).join('');
    return;
  }

  const isLong = ['short_answer', 'scenario', 'troubleshooting', 'case_study'].includes(questionType);
  root.innerHTML = isLong
    ? '<textarea id="answer" class="answer-field" placeholder="Explain your reasoning in your own words…"></textarea>'
    : '<input id="answer" class="answer-field" autocomplete="off" placeholder="Type your answer…">';
}

function restoreInput(question, rootSelector, savedAnswer) {
  if (!hasAnswer(savedAnswer)) return;
  const root = $(rootSelector);
  const questionType = question.questionType || question.type;

  if (questionType === 'multiple_choice' || questionType === 'true_false') {
    root.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.checked = input.value === String(savedAnswer);
    });
    return;
  }
  if (questionType === 'multiple_correct') {
    const selected = new Set(savedAnswer.map(String));
    root.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.checked = selected.has(input.value);
    });
    return;
  }
  if (questionType === 'ordering') {
    root.querySelectorAll('[data-order]').forEach((hidden) => {
      const position = savedAnswer.findIndex((item) => String(item) === hidden.dataset.order);
      if (position >= 0) {
        hidden.value = String(position + 1);
        hidden.previousElementSibling.value = String(position + 1);
      }
    });
    return;
  }
  if (questionType === 'matching' || questionType === 'classification') {
    root.querySelectorAll('[data-match]').forEach((select) => {
      select.value = savedAnswer[select.dataset.match] || '';
    });
    return;
  }
  const field = root.querySelector('#answer, .answer-field');
  if (field) field.value = String(savedAnswer);
}

function updateStudyProgress() {
  const eligible = filteredQuestions();
  const eligibleIds = new Set(eligible.map((question) => question.questionId || question.id));
  const completed = state.userProfile.seenQuestionIds.filter((id) => eligibleIds.has(id)).length;
  const total = eligible.length || state.questions.length;
  $('#questionPosition').textContent = completed < total
    ? `Question ${completed + 1} of ${total}`
    : `Review round · ${total} available`;
  const progress = Math.min(100, (completed / Math.max(total, 1)) * 100);
  $('#progressBar').value = progress;
  $('#progressBar').textContent = `${Math.round(progress)}%`;
}

async function loadNextQuestion() {
  const requestId = ++state.questionRequestId;
  $('#nextQuestionButton').disabled = true;

  try {
    const response = await fetch('/api/questions/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(state.userProfile)
    });
    const data = await response.json();
    if (!response.ok || !data.question) throw new Error(data.error || 'No question is available.');
    if (requestId !== state.questionRequestId) return;
    state.currentQuestion = data.question;
    renderQuestion();
  } catch (error) {
    if (requestId !== state.questionRequestId) return;
    showToast(error.message || 'The next question could not be loaded.', 'error');
    $('#nextQuestionButton').disabled = false;
  }
}

function renderQuestion() {
  const question = state.currentQuestion;
  if (!question) return;

  state.currentEvaluation = null;
  state.hint = 0;
  $('#feedback').className = 'feedback hidden';
  $('#feedback').replaceChildren();
  $('#hintText').textContent = '';
  $('#hintButton').disabled = false;
  $('#hintButton').classList.remove('hidden');
  $('#submitButton').disabled = false;
  $('#submitButton').classList.remove('hidden');
  $('#submitButton').innerHTML = 'Check answer <span aria-hidden="true">→</span>';
  $('#nextQuestionButton').classList.add('hidden');
  $('#nextQuestionButton').disabled = false;

  updateStudyProgress();
  $('#questionBranch').textContent = question.branch || question.department || 'Fundamentals';
  $('#questionPrompt').textContent = question.prompt || question.questionText;
  $('#difficultyBadge').textContent = question.difficulty || `Level ${question.difficultyScore || ''}`;
  $('#bloomTag').textContent = question.bloomLevel || 'Understand';
  $('#conceptTitle').textContent = question.concept;
  $('#conceptDescription').textContent = `${(question.questionType || question.type || '').replaceAll('_', ' ')} · One idea at a time.`;
  $('#modeLabel').textContent = state.userProfile.mode === 'quick' ? 'Quick revision' : 'Deep learning';
  $('#bloomLevelLabel').textContent = question.bloomLevel || 'Remember';
  $('#streakLabel').textContent = `${state.streak} correct in a row`;
  $('#revisionLabel').textContent = `${Object.values(state.userProfile.attempts).filter((attempt) => attempt.result !== 'correct').length} concepts`;

  renderInput(question);
  renderTree();
  $('#questionInput').querySelector('input, textarea, select')?.focus();
}

function showFeedback(evaluation) {
  const [title, icon] = labels[evaluation.result] || labels.needs_review;
  const source = evaluation.source === 'nvidia-semantic'
    ? 'Semantic feedback'
    : evaluation.source === 'degraded'
      ? 'Degraded mode'
      : 'Deterministic feedback';
  const feedback = $('#feedback');
  feedback.className = `feedback ${evaluation.result}`;
  feedback.innerHTML = `<span class="feedback-icon" aria-hidden="true">${icon}</span><div><p class="eyebrow">${source}</p><h2>${escapeHTML(title)} · ${Number(evaluation.score) || 0}%</h2><p>${escapeHTML(evaluation.feedback)}</p></div><details><summary>Show model answer and explanation</summary><p class="model-answer">${escapeHTML(evaluation.modelAnswer || 'No model explanation is available for this question.')}</p></details>`;
}

async function submitAnswer() {
  const question = state.currentQuestion;
  if (!question || state.currentEvaluation) return;

  const answer = answerValue(question, '#questionInput');
  if (!hasAnswer(answer)) {
    $('#hintText').textContent = 'Complete an answer before checking it.';
    return;
  }

  $('#submitButton').disabled = true;
  $('#submitButton').textContent = 'Checking…';

  try {
    const response = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ questionId: question.questionId || question.id, answer })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Evaluation failed.');

    state.currentEvaluation = data.evaluation;
    const questionId = question.questionId || question.id;
    state.userProfile.attempts[questionId] = {
      concept: question.concept,
      result: data.evaluation.result,
      score: data.evaluation.score,
      bloomLevel: question.bloomLevel,
      attemptedAt: new Date().toISOString()
    };
    if (!state.userProfile.seenQuestionIds.includes(questionId)) state.userProfile.seenQuestionIds.push(questionId);
    state.streak = data.evaluation.result === 'correct' ? state.streak + 1 : 0;
    save();

    showFeedback(data.evaluation);
    renderTree();
    $('#streakLabel').textContent = `${state.streak} correct in a row`;
    const xpTotal = Object.values(state.userProfile.attempts).reduce((sum, item) => sum + (Number(item.score) || 0), 0);
    $('#scoreLabel').textContent = `${xpTotal} XP`;
    $('#questionInput').querySelectorAll('input, textarea, select').forEach((field) => { field.disabled = true; });
    $('#hintButton').classList.add('hidden');
    $('#submitButton').classList.add('hidden');
    $('#nextQuestionButton').classList.remove('hidden');
    $('#nextQuestionButton').focus();
  } catch (error) {
    $('#hintText').textContent = error.message || 'The evaluation service is unavailable. Your answer was not scored.';
    $('#submitButton').disabled = false;
    $('#submitButton').innerHTML = 'Check answer <span aria-hidden="true">→</span>';
  }
}

function updateTimerLabel() {
  const minutes = Math.floor(Math.max(0, state.exam.remainingSeconds) / 60).toString().padStart(2, '0');
  const seconds = (Math.max(0, state.exam.remainingSeconds) % 60).toString().padStart(2, '0');
  $('#timerLabel').textContent = `${minutes}:${seconds}`;
  $('.exam-timer').classList.toggle('urgent', state.exam.remainingSeconds <= 60);
}

function stopExamTimer() {
  if (state.exam.timerInterval) clearInterval(state.exam.timerInterval);
  state.exam.timerInterval = null;
}

function startExamTimer() {
  stopExamTimer();
  updateTimerLabel();
  state.exam.timerInterval = setInterval(() => {
    state.exam.remainingSeconds = Math.max(0, Math.ceil((state.exam.endsAt - Date.now()) / 1000));
    updateTimerLabel();
    if (state.exam.remainingSeconds === 0) {
      stopExamTimer();
      submitExam({ autoSubmitted: true });
    }
  }, 1000);
}

async function generateAndStartExam(event) {
  event?.preventDefault();
  const generateButton = $('#generateExamButton');
  const config = {
    department: $('#examDeptSelect')?.value || '',
    subject: $('#examSubjectSelect')?.value || '',
    bloomLevel: $('#examBloomSelect')?.value || '',
    questionCount: Number($('#examCountSelect')?.value || 10),
    timeLimitMinutes: Number($('#examTimeSelect')?.value || 15)
  };

  generateButton.disabled = true;
  generateButton.textContent = 'Building exam…';
  try {
    const response = await fetch('/api/exam/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(config)
    });
    const examPaper = await response.json();
    if (!response.ok || !examPaper.questions?.length) throw new Error(examPaper.error || 'No exam questions are available.');

    state.exam.paper = examPaper;
    state.exam.currentIndex = 0;
    state.exam.answers = {};
    state.exam.remainingSeconds = examPaper.timeLimitSeconds;
    state.exam.endsAt = Date.now() + examPaper.timeLimitSeconds * 1000;
    state.exam.status = 'active';
    state.exam.report = null;
    renderExamView();
    startExamTimer();
    renderExamQuestion();

    if (examPaper.questionCount < examPaper.requestedQuestionCount) {
      showToast(`Built an exam with all ${examPaper.questionCount} matching questions.`, 'info');
    }
  } catch (error) {
    showToast(error.message || 'The practice exam could not be generated.', 'error');
  } finally {
    generateButton.disabled = false;
    generateButton.innerHTML = 'Generate &amp; Start Exam <span aria-hidden="true">⚡</span>';
  }
}

function renderExamView() {
  $('#examConfigView').classList.toggle('hidden', state.exam.status !== 'idle');
  $('#examActiveView').classList.toggle('hidden', state.exam.status !== 'active');
  $('#examReportView').classList.toggle('hidden', state.exam.status !== 'report');
  if (state.exam.status === 'report') renderExamReport(state.exam.report);
}

function renderExamQuestion() {
  const paper = state.exam.paper;
  if (!paper || state.exam.status !== 'active') return;

  const question = paper.questions[state.exam.currentIndex];
  const questionId = question.questionId || question.id;
  $('#examTitleLabel').textContent = paper.title;
  $('#examProgressLabel').textContent = `Question ${state.exam.currentIndex + 1} of ${paper.questionCount}`;
  $('#examBranch').textContent = question.branch || question.department || 'Exam';
  $('#examPrompt').textContent = question.prompt || question.questionText;
  $('#examQuestionMeta').innerHTML = `<span>${escapeHTML(question.bloomLevel || 'Understand')}</span><span>${escapeHTML(question.difficulty || 'Mixed difficulty')}</span>`;

  renderInput(question, '#examQuestionInput', `examAnswer-${state.exam.currentIndex}`);
  restoreInput(question, '#examQuestionInput', state.exam.answers[questionId]);
  const inputRoot = $('#examQuestionInput');
  const syncAnswer = () => {
    saveExamCurrentAnswer();
    renderExamPalette();
  };
  inputRoot.oninput = syncAnswer;
  inputRoot.onchange = syncAnswer;

  $('#examPrevBtn').disabled = state.exam.currentIndex === 0;
  $('#examNextBtn').disabled = state.exam.currentIndex === paper.questionCount - 1;
  renderExamPalette();
  inputRoot.querySelector('input, textarea, select')?.focus();
}

function answeredExamCount() {
  return state.exam.paper?.questions.filter((question) =>
    hasAnswer(state.exam.answers[question.questionId || question.id])
  ).length || 0;
}

function renderExamPalette() {
  const paper = state.exam.paper;
  const palette = $('#examPalette');
  if (!palette || !paper) return;

  palette.innerHTML = paper.questions.map((question, index) => {
    const questionId = question.questionId || question.id;
    const answered = hasAnswer(state.exam.answers[questionId]);
    const active = index === state.exam.currentIndex;
    const classes = ['palette-btn'];
    if (answered) classes.push('answered');
    if (active) classes.push('active');
    const stateLabel = [active ? 'current' : '', answered ? 'answered' : 'unanswered'].filter(Boolean).join(', ');
    return `<button type="button" class="${classes.join(' ')}" data-idx="${index}" aria-label="Question ${index + 1}, ${stateLabel}" ${active ? 'aria-current="true"' : ''}>${index + 1}</button>`;
  }).join('');

  palette.querySelectorAll('.palette-btn').forEach((button) => {
    button.onclick = () => {
      saveExamCurrentAnswer();
      state.exam.currentIndex = Number(button.dataset.idx);
      renderExamQuestion();
    };
  });

  const answered = answeredExamCount();
  const unanswered = paper.questionCount - answered;
  $('#examNotice').textContent = `${answered} answered · ${unanswered} remaining`;
  $('#examFinishBtn').innerHTML = `Submit Exam (${answered}/${paper.questionCount}) <span aria-hidden="true">✓</span>`;
}

function saveExamCurrentAnswer() {
  const paper = state.exam.paper;
  if (!paper || state.exam.status !== 'active') return;
  const question = paper.questions[state.exam.currentIndex];
  const questionId = question.questionId || question.id;
  const value = answerValue(question, '#examQuestionInput');
  if (hasAnswer(value)) state.exam.answers[questionId] = value;
  else delete state.exam.answers[questionId];
}

async function submitExam({ autoSubmitted = false } = {}) {
  if (!state.exam.paper || state.exam.status !== 'active' || state.exam.submitting) return;
  saveExamCurrentAnswer();
  const unanswered = state.exam.paper.questionCount - answeredExamCount();
  if (!autoSubmitted && unanswered > 0) {
    const confirmed = window.confirm(`${unanswered} question${unanswered === 1 ? '' : 's'} unanswered. Submit the exam anyway?`);
    if (!confirmed) return;
  }

  stopExamTimer();
  state.exam.submitting = true;
  $('#examFinishBtn').disabled = true;
  $('#examFinishBtn').textContent = autoSubmitted ? 'Time is up — grading…' : 'Grading exam…';

  try {
    const questionIds = state.exam.paper.questions.map((question) => question.questionId || question.id);
    const response = await fetch('/api/exam/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        examId: state.exam.paper.examId,
        questionIds,
        answers: state.exam.answers,
        timeSpentSeconds: state.exam.paper.timeLimitSeconds - state.exam.remainingSeconds
      })
    });
    const report = await response.json();
    if (!response.ok) throw new Error(report.error || 'The exam could not be graded.');

    state.exam.report = report;
    state.exam.status = 'report';
    for (const result of report.questionResults || []) {
      state.userProfile.attempts[result.questionId] = {
        concept: result.concept,
        result: result.evaluation.result,
        score: result.evaluation.score,
        bloomLevel: result.bloomLevel,
        attemptedAt: new Date().toISOString()
      };
      if (!state.userProfile.seenQuestionIds.includes(result.questionId)) state.userProfile.seenQuestionIds.push(result.questionId);
    }
    save();
    renderTree();
    renderExamView();
  } catch (error) {
    showToast(error.message || 'The exam could not be graded.', 'error');
    if (state.exam.remainingSeconds > 0) startExamTimer();
  } finally {
    state.exam.submitting = false;
    $('#examFinishBtn').disabled = false;
    if (state.exam.status === 'active') renderExamPalette();
  }
}

function renderExamReport(report) {
  if (!report) return;
  $('#examReportGrade').textContent = `Grade: ${report.grade} (${report.overallPercentage}%)`;
  $('#examReportSummary').textContent = `${report.correctCount} correct · ${report.partialCount} partial · ${report.incorrectCount} incorrect (${report.unansweredCount || 0} unanswered) across ${report.totalQuestions} questions.`;

  $('#bloomReportList').innerHTML = Object.entries(report.bloomSummary || {}).map(([bloom, stats]) =>
    `<div class="item-row"><span>${escapeHTML(bloom)}</span><strong>${stats.scorePercentage}% · ${stats.questionCount} Q</strong></div>`
  ).join('') || '<p class="topic-note">No Bloom data is available.</p>';

  $('#conceptReportList').innerHTML = Object.entries(report.conceptSummary || {}).map(([concept, stats]) =>
    `<div class="item-row"><span>${escapeHTML(concept)}</span><strong>${stats.scorePercentage}%</strong></div>`
  ).join('') || '<p class="topic-note">No concept data is available.</p>';

  $('#examReviewList').innerHTML = (report.questionResults || []).map((result, index) => {
    const [title, icon] = labels[result.evaluation.result] || labels.needs_review;
    return `<details class="review-item ${escapeHTML(result.evaluation.result)}"><summary><span><i aria-hidden="true">${icon}</i> Question ${index + 1}: ${escapeHTML(result.prompt)}</span><strong>${escapeHTML(title)} · ${result.evaluation.score}%</strong></summary><div class="review-content"><p><b>Your answer:</b> ${escapeHTML(formatAnswer(result.submitted))}</p><p><b>Feedback:</b> ${escapeHTML(result.evaluation.feedback)}</p><p><b>Model answer:</b> ${escapeHTML(result.evaluation.modelAnswer || 'No model explanation is available.')}</p></div></details>`;
  }).join('');
}

function renderAnalytics() {
  const attempts = Object.values(state.userProfile.attempts);
  const bloomMap = {};
  const conceptMap = {};

  for (const attempt of attempts) {
    const score = Number(attempt.score) || 0;
    const bloom = attempt.bloomLevel || 'Remember';
    if (!bloomMap[bloom]) bloomMap[bloom] = { score: 0, count: 0 };
    bloomMap[bloom].score += score;
    bloomMap[bloom].count += 1;

    const concept = attempt.concept || 'General';
    if (!conceptMap[concept]) conceptMap[concept] = { score: 0, count: 0 };
    conceptMap[concept].score += score;
    conceptMap[concept].count += 1;
  }

  const renderMasteryRows = (entries, includeCount) => entries.map(([label, stats]) => {
    const mastery = Math.min(100, Math.max(0, Math.round(stats.score / stats.count)));
    return `<div class="mastery-row"><div><span>${escapeHTML(label)}</span><strong>${mastery}%${includeCount ? ` · ${stats.count} attempt${stats.count === 1 ? '' : 's'}` : ''}</strong></div><progress class="mastery-track" max="100" value="${mastery}" aria-label="${escapeHTML(label)} mastery ${mastery} percent">${mastery}%</progress></div>`;
  }).join('');

  const bloomEntries = Object.entries(bloomMap);
  $('#bloomAnalyticsList').innerHTML = bloomEntries.length
    ? renderMasteryRows(bloomEntries, true)
    : '<p class="topic-note">Complete a practice question or exam to see your progression.</p>';

  const conceptEntries = Object.entries(conceptMap).sort((left, right) =>
    (left[1].score / left[1].count) - (right[1].score / right[1].count)
  );
  $('#conceptAnalyticsList').innerHTML = conceptEntries.length
    ? renderMasteryRows(conceptEntries, false)
    : '<p class="topic-note">No concept history recorded yet.</p>';
}

function setActiveMode(mode) {
  document.querySelectorAll('.mode').forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function switchTab(tabName) {
  state.activeTab = tabName;
  $('#welcome').classList.add('hidden');
  $('#learning').classList.add('hidden');
  $('#examSection').classList.add('hidden');
  $('#analyticsSection').classList.add('hidden');

  if (tabName === 'learning') {
    $('#learning').classList.remove('hidden');
    setActiveMode(state.userProfile.mode);
    if (!state.currentQuestion) loadNextQuestion();
  } else if (tabName === 'exam') {
    $('#examSection').classList.remove('hidden');
    setActiveMode('exam');
    renderExamView();
    if (state.exam.status === 'active') renderExamQuestion();
  } else if (tabName === 'analytics') {
    $('#analyticsSection').classList.remove('hidden');
    setActiveMode('analytics');
    renderAnalytics();
  } else {
    $('#welcome').classList.remove('hidden');
    setActiveMode(state.userProfile.mode);
  }
}

function openTaxonomyPanel() {
  $('.tree-panel').classList.add('open');
  $('#panelBackdrop').classList.remove('hidden');
  $('#menuButton').setAttribute('aria-expanded', 'true');
  $('#treeCloseButton').focus();
}

function closeTaxonomyPanel() {
  $('.tree-panel').classList.remove('open');
  $('#panelBackdrop').classList.add('hidden');
  $('#menuButton').setAttribute('aria-expanded', 'false');
}

function resetSession() {
  const confirmed = window.confirm('Reset all saved practice progress and the current exam?');
  if (!confirmed) return;
  stopExamTimer();
  state.userProfile.attempts = {};
  state.userProfile.seenQuestionIds = [];
  state.userProfile.department = '';
  state.userProfile.subject = '';
  state.userProfile.topic = '';
  state.currentQuestion = null;
  state.currentEvaluation = null;
  state.streak = 0;
  state.exam = {
    paper: null,
    currentIndex: 0,
    answers: {},
    timerInterval: null,
    endsAt: 0,
    remainingSeconds: 0,
    status: 'idle',
    submitting: false,
    report: null
  };
  $('#departmentSelect').value = '';
  $('#examDeptSelect').value = '';
  updateSubjectOptions('study');
  updateSubjectOptions('exam');
  save();
  renderTree();
  switchTab('welcome');
  showToast('Session progress was reset.', 'info');
}

async function init() {
  const response = await fetch('/api/session');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Session metadata could not be loaded.');
  state.questions = data.questions || [];
  state.concepts = data.concepts || [];
  state.departments = data.departments || [];
  state.userProfile.seenQuestionIds = Object.keys(state.userProfile.attempts);

  renderTaxonomyOptions();
  renderTree();
  $('#questionCountHero').textContent = `${state.questions.length} curated question${state.questions.length === 1 ? '' : 's'}`;
  $('#aiStatus').textContent = data.aiAvailable ? 'Semantic Engine Active' : 'Deterministic Engine';
  const xpTotal = Object.values(state.userProfile.attempts).reduce((sum, item) => sum + (Number(item.score) || 0), 0);
  $('#scoreLabel').textContent = `${xpTotal} XP`;

  $('#departmentSelect').onchange = (event) => {
    state.userProfile.department = event.target.value;
    state.userProfile.subject = '';
    state.userProfile.topic = '';
    updateSubjectOptions('study');
    renderTree();
    if (state.activeTab === 'learning') {
      state.currentQuestion = null;
      loadNextQuestion();
    }
  };

  $('#subjectSelect').onchange = (event) => {
    state.userProfile.subject = event.target.value;
    state.userProfile.topic = '';
    if (state.activeTab === 'learning') {
      state.currentQuestion = null;
      loadNextQuestion();
    }
  };

  $('#examDeptSelect').onchange = () => updateSubjectOptions('exam');
  $('#startButton').onclick = () => switchTab('learning');
  $('#generateExamHeroBtn').onclick = () => switchTab('exam');
  $('#submitButton').onclick = submitAnswer;
  $('#nextQuestionButton').onclick = loadNextQuestion;

  $('#hintButton').onclick = () => {
    const question = state.currentQuestion;
    if (!question) return;
    const hints = question.hints || [];
    if (state.hint >= hints.length) {
      $('#hintText').textContent = 'No more hints are available for this question.';
      return;
    }
    state.hint += 1;
    $('#hintText').textContent = `Hint ${state.hint}: ${hints[state.hint - 1]}`;
  };

  $('#whyButton').onclick = () => {
    if (state.currentQuestion) {
      $('#hintText').textContent = `Why this question: ${state.currentQuestion.whyThisQuestion || state.currentQuestion.concept}`;
    }
  };

  $('#resetButton').onclick = resetSession;
  $('#menuButton').onclick = openTaxonomyPanel;
  $('#treeCloseButton').onclick = closeTaxonomyPanel;
  $('#panelBackdrop').onclick = closeTaxonomyPanel;

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeTaxonomyPanel();
  });

  document.querySelectorAll('.mode').forEach((button) => {
    button.onclick = () => {
      const mode = button.dataset.mode;
      if (mode === 'deep' || mode === 'quick') {
        state.userProfile.mode = mode;
        state.currentQuestion = null;
        switchTab('learning');
      } else {
        switchTab(mode);
      }
    };
  });

  $('#examForm').onsubmit = generateAndStartExam;
  $('#examPrevBtn').onclick = () => {
    saveExamCurrentAnswer();
    state.exam.currentIndex = Math.max(0, state.exam.currentIndex - 1);
    renderExamQuestion();
  };
  $('#examNextBtn').onclick = () => {
    saveExamCurrentAnswer();
    state.exam.currentIndex = Math.min(state.exam.paper.questionCount - 1, state.exam.currentIndex + 1);
    renderExamQuestion();
  };
  $('#examFinishBtn').onclick = () => submitExam();
  $('#examBackBtn').onclick = () => {
    stopExamTimer();
    state.exam.paper = null;
    state.exam.answers = {};
    state.exam.report = null;
    state.exam.status = 'idle';
    switchTab('exam');
  };
}

init().catch((error) => {
  console.error(error);
  document.body.innerHTML = '<main class="fatal"><h1>Question Machine could not start.</h1><p>Refresh the page or check the server connection.</p></main>';
});
