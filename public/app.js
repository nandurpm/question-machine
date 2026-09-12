const $ = (selector) => document.querySelector(selector);

const state = {
  questions: [],
  concepts: [],
  departments: [],
  currentQuestion: null,
  userProfile: {
    department: '',
    subject: '',
    topic: '',
    mode: 'deep',
    attempts: JSON.parse(localStorage.getItem('question-machine:attempts') || '{}'),
    seenQuestionIds: []
  },
  streak: 0,
  hint: 0,
  activeTab: 'welcome', // 'welcome', 'learning', 'exam', 'analytics'
  exam: {
    paper: null,
    currentIndex: 0,
    answers: {},
    timerInterval: null,
    remainingSeconds: 0
  }
};

const labels = {
  correct: ['Correct', '✓'],
  partially_correct: ['Developing', '≈'],
  incorrect: ['Needs revision', '!'],
  needs_review: ['Needs review', '?']
};

function save() {
  localStorage.setItem('question-machine:attempts', JSON.stringify(state.userProfile.attempts));
}

function renderTaxonomyOptions() {
  const deptSelect = $('#departmentSelect');
  if (deptSelect) {
    deptSelect.innerHTML = '<option value="">All Departments</option>' +
      state.departments.map((d) => `<option value="${d.id}">${d.name}</option>`).join('');
  }

  const examDeptSelect = $('#examDeptSelect');
  if (examDeptSelect) {
    examDeptSelect.innerHTML = '<option value="">All Departments</option>' +
      state.departments.map((d) => `<option value="${d.id}">${d.name}</option>`).join('');
  }

  updateSubjectOptions();
}

function updateSubjectOptions() {
  const selectedDeptId = $('#departmentSelect').value;
  const subjectSelect = $('#subjectSelect');
  if (!subjectSelect) return;

  if (!selectedDeptId) {
    subjectSelect.innerHTML = '<option value="">All Subjects</option>';
    return;
  }

  const dept = state.departments.find((d) => d.id === selectedDeptId);
  if (!dept) return;

  subjectSelect.innerHTML = '<option value="">All Subjects</option>' +
    dept.subjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
}

function renderTree() {
  const explored = new Map(Object.values(state.userProfile.attempts).map((a) => [a.concept, a.result]));
  const treeRoot = $('#tree');
  if (!treeRoot) return;

  treeRoot.innerHTML = state.concepts.map((concept) => {
    const result = explored.get(concept.id);
    const active = state.currentQuestion?.concept === concept.id;
    const klass = active ? 'active' : result === 'correct' ? 'strong' : result === 'partially_correct' ? 'developing' : result === 'incorrect' || result === 'needs_review' ? 'review' : '';
    return `<div class="tree-node ${klass}"><i></i><span>${concept.id}</span></div>`;
  }).join('');
}

function answerValue(question, rootContainerSelector = '#questionInput') {
  const root = $(rootContainerSelector) || document;
  const qtype = question.questionType || question.type;

  if (qtype === 'multiple_choice' || qtype === 'true_false') {
    const checked = root.querySelector('input[type="radio"]:checked');
    return checked ? checked.value : '';
  }
  if (qtype === 'multiple_correct') {
    return [...root.querySelectorAll('input[type="checkbox"]:checked')].map((el) => el.value);
  }
  if (qtype === 'ordering') {
    return [...root.querySelectorAll('[data-order]')]
      .sort((a, b) => Number(a.value) - Number(b.value))
      .map((item) => item.dataset.order);
  }
  if (qtype === 'matching' || qtype === 'classification') {
    return Object.fromEntries(
      [...root.querySelectorAll('[data-match]')].map((item) => [item.dataset.match, item.value])
    );
  }
  const field = root.querySelector('#answer') || root.querySelector('.answer-field');
  return field ? field.value : '';
}

function renderInput(question, rootSelector = '#questionInput', namePrefix = 'answer') {
  const root = $(rootSelector);
  if (!root) return;
  const qtype = question.questionType || question.type;

  if (['multiple_choice', 'true_false'].includes(qtype)) {
    const options = question.options || ['True', 'False'];
    root.innerHTML = options.map((option, index) =>
      `<label class="choice"><input type="radio" name="${namePrefix}" value="${option}" ${index === 0 ? 'autofocus' : ''}><span>${option}</span></label>`
    ).join('');
    return;
  }

  if (qtype === 'multiple_correct') {
    const options = question.options || [];
    root.innerHTML = options.map((option) =>
      `<label class="choice"><input type="checkbox" name="${namePrefix}" value="${option}"><span>${option}</span></label>`
    ).join('');
    return;
  }

  if (qtype === 'ordering') {
    const items = question.items || [];
    root.innerHTML = items.map((item, index) =>
      `<label class="order-row"><span>${item}</span><select aria-label="Position for ${item}">${items.map((_, i) => `<option value="${i + 1}" ${index === i ? 'selected' : ''}>Step ${i + 1}</option>`).join('')}</select><input type="hidden" data-order="${item}"></label>`
    ).join('');
    // Bind position update
    root.querySelectorAll('select').forEach((sel, idx) => {
      sel.onchange = (e) => {
        sel.nextElementSibling.value = e.target.value;
      };
      sel.nextElementSibling.value = idx + 1;
    });
    return;
  }

  if (qtype === 'matching') {
    const pairs = question.pairs || {};
    const keys = Object.keys(pairs);
    const units = [...new Set(Object.values(pairs))];
    root.innerHTML = keys.map((item) =>
      `<label class="order-row"><span>${item}</span><select data-match="${item}" aria-label="Target for ${item}">${units.map((unit) => `<option value="${unit}">${unit}</option>`).join('')}</select></label>`
    ).join('');
    return;
  }

  if (qtype === 'classification') {
    const categories = question.categories || {};
    const items = Object.keys(categories);
    const catList = [...new Set(Object.values(categories))];
    root.innerHTML = items.map((item) =>
      `<label class="order-row"><span>${item}</span><select data-match="${item}" aria-label="Category for ${item}">${catList.map((cat) => `<option value="${cat}">${cat}</option>`).join('')}</select></label>`
    ).join('');
    return;
  }

  const isLong = ['short_answer', 'scenario', 'troubleshooting', 'case_study'].includes(qtype);
  root.innerHTML = isLong
    ? '<textarea id="answer" class="answer-field" placeholder="Explain your reasoning in your own words…"></textarea>'
    : '<input id="answer" class="answer-field" autocomplete="off" placeholder="Type your answer…">';
}

async function loadNextQuestion() {
  try {
    const response = await fetch('/api/questions/next', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(state.userProfile)
    });
    const data = await response.json();
    state.currentQuestion = data.question;
    renderQuestion();
  } catch (e) {
    console.error('Failed to load next question:', e);
  }
}

function renderQuestion() {
  const question = state.currentQuestion;
  if (!question) return;

  $('#feedback').className = 'feedback hidden';
  state.hint = 0;
  $('#hintText').textContent = '';
  $('#questionPosition').textContent = `Question ${state.userProfile.seenQuestionIds.length + 1} of ${state.questions.length}`;
  $('#progressBar').style.width = `${((state.userProfile.seenQuestionIds.length + 1) / Math.max(state.questions.length, 1)) * 100}%`;
  $('#questionBranch').textContent = question.branch || question.department || 'Fundamentals';
  $('#questionPrompt').textContent = question.prompt || question.questionText;
  $('#difficultyBadge').textContent = `Level ${question.difficultyScore || question.difficulty}`;
  $('#bloomTag').textContent = question.bloomLevel || 'Understand';

  $('#conceptTitle').textContent = question.concept;
  $('#conceptDescription').textContent = `${(question.questionType || question.type || '').replaceAll('_', ' ')} · One idea at a time.`;
  $('#bloomLevelLabel').textContent = question.bloomLevel || 'Remember';
  $('#streakLabel').textContent = `${state.streak} answers`;
  $('#revisionLabel').textContent = `${Object.values(state.userProfile.attempts).filter((a) => a.result !== 'correct').length} concepts`;

  renderInput(question);
  renderTree();
}

function showFeedback(evaluation) {
  const [title, icon] = labels[evaluation.result] || labels.needs_review;
  const feedback = $('#feedback');
  feedback.className = `feedback ${evaluation.result}`;
  feedback.innerHTML = `<span class="feedback-icon">${icon}</span><div><p class="eyebrow">${evaluation.source === 'nvidia-semantic' ? 'Semantic feedback' : evaluation.source === 'degraded' ? 'Degraded mode' : 'Deterministic feedback'}</p><h2>${title} · ${evaluation.score}%</h2><p>${evaluation.feedback}</p></div><details><summary>Show model answer and explanation</summary><p class="model-answer">${evaluation.modelAnswer}</p></details>`;
}

async function submitAnswer() {
  const question = state.currentQuestion;
  if (!question) return;

  const answer = answerValue(question, '#questionInput');
  if (!answer || (Array.isArray(answer) && !answer.length)) {
    $('#hintText').textContent = 'Choose or enter an answer before checking it.';
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
    if (!response.ok) throw new Error(data.error || 'Evaluation failed');

    const qid = question.questionId || question.id;
    state.userProfile.attempts[qid] = {
      concept: question.concept,
      result: data.evaluation.result,
      score: data.evaluation.score,
      bloomLevel: question.bloomLevel
    };
    if (!state.userProfile.seenQuestionIds.includes(qid)) {
      state.userProfile.seenQuestionIds.push(qid);
    }
    state.streak += 1;
    save();

    showFeedback(data.evaluation);
    renderTree();

    const xpTotal = Object.values(state.userProfile.attempts).reduce((sum, item) => sum + item.score, 0);
    $('#scoreLabel').textContent = `${xpTotal} XP`;

    setTimeout(() => {
      loadNextQuestion();
    }, state.userProfile.mode === 'quick' ? 1200 : 3500);
  } catch (err) {
    $('#hintText').textContent = 'The evaluation service is unavailable. Your answer was not scored.';
  } finally {
    $('#submitButton').disabled = false;
    $('#submitButton').innerHTML = 'Check answer <span>→</span>';
  }
}

/* Exam Flow Logic */
async function generateAndStartExam(e) {
  if (e) e.preventDefault();
  const department = $('#examDeptSelect')?.value || state.userProfile.department;
  const bloomLevel = $('#examBloomSelect')?.value;
  const questionCount = Number($('#examCountSelect')?.value || 10);
  const timeLimitMinutes = Number($('#examTimeSelect')?.value || 15);

  try {
    const response = await fetch('/api/exam/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ department, bloomLevel, questionCount, timeLimitMinutes })
    });
    const examPaper = await response.json();
    state.exam.paper = examPaper;
    state.exam.currentIndex = 0;
    state.exam.answers = {};
    state.exam.remainingSeconds = examPaper.timeLimitSeconds;

    $('#examConfigView').classList.add('hidden');
    $('#examActiveView').classList.remove('hidden');
    $('#examReportView').classList.add('hidden');

    startExamTimer();
    renderExamQuestion();
  } catch (err) {
    alert('Failed to generate practice exam.');
  }
}

function startExamTimer() {
  if (state.exam.timerInterval) clearInterval(state.exam.timerInterval);
  state.exam.timerInterval = setInterval(() => {
    state.exam.remainingSeconds -= 1;
    if (state.exam.remainingSeconds <= 0) {
      clearInterval(state.exam.timerInterval);
      submitExam();
      return;
    }
    const mins = Math.floor(state.exam.remainingSeconds / 60).toString().padStart(2, '0');
    const secs = (state.exam.remainingSeconds % 60).toString().padStart(2, '0');
    $('#timerLabel').textContent = `${mins}:${secs}`;
  }, 1000);
}

function renderExamQuestion() {
  const paper = state.exam.paper;
  if (!paper) return;

  const question = paper.questions[state.exam.currentIndex];
  $('#examTitleLabel').textContent = paper.title;
  $('#examProgressLabel').textContent = `Question ${state.exam.currentIndex + 1} of ${paper.questionCount}`;
  $('#examBranch').textContent = question.branch || question.department || 'Exam';
  $('#examPrompt').textContent = question.prompt || question.questionText;

  renderInput(question, '#examQuestionInput', 'examAnswer');
  renderExamPalette();
}

function renderExamPalette() {
  const paper = state.exam.paper;
  const palette = $('#examPalette');
  if (!palette || !paper) return;

  palette.innerHTML = paper.questions.map((q, idx) => {
    const qid = q.questionId || q.id;
    const answered = Boolean(state.exam.answers[qid]);
    const active = idx === state.exam.currentIndex;
    const klass = active ? 'active' : answered ? 'answered' : '';
    return `<button class="palette-btn ${klass}" data-idx="${idx}">${idx + 1}</button>`;
  }).join('');

  palette.querySelectorAll('.palette-btn').forEach((btn) => {
    btn.onclick = () => {
      saveExamCurrentAnswer();
      state.exam.currentIndex = Number(btn.dataset.idx);
      renderExamQuestion();
    };
  });
}

function saveExamCurrentAnswer() {
  const paper = state.exam.paper;
  if (!paper) return;

  const currentQ = paper.questions[state.exam.currentIndex];
  const qid = currentQ.questionId || currentQ.id;
  const val = answerValue(currentQ, '#examQuestionInput');
  if (val) state.exam.answers[qid] = val;
}

async function submitExam() {
  saveExamCurrentAnswer();
  if (state.exam.timerInterval) clearInterval(state.exam.timerInterval);

  try {
    const response = await fetch('/api/exam/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        examId: state.exam.paper.examId,
        answers: state.exam.answers,
        timeSpentSeconds: state.exam.paper.timeLimitSeconds - state.exam.remainingSeconds
      })
    });
    const report = await response.json();

    $('#examActiveView').classList.add('hidden');
    $('#examReportView').classList.remove('hidden');

    $('#examReportGrade').textContent = `Grade: ${report.grade} (${report.overallPercentage}%)`;
    $('#examReportSummary').textContent = `Correct: ${report.correctCount} | Partial: ${report.partialCount} | Incorrect: ${report.incorrectCount} out of ${report.totalQuestions} questions.`;

    const bloomList = $('#bloomReportList');
    bloomList.innerHTML = Object.entries(report.bloomSummary).map(([bloom, stats]) =>
      `<div class="item-row"><span>${bloom}</span><strong>${stats.scorePercentage}% (${stats.questionCount} Qs)</strong></div>`
    ).join('');

    const conceptList = $('#conceptReportList');
    conceptList.innerHTML = Object.entries(report.conceptSummary).map(([concept, stats]) =>
      `<div class="item-row"><span>${concept}</span><strong>${stats.scorePercentage}%</strong></div>`
    ).join('');
  } catch (err) {
    alert('Failed to evaluate exam paper.');
  }
}

function renderAnalytics() {
  const attempts = Object.values(state.userProfile.attempts);
  const bloomMap = {};
  const conceptMap = {};

  for (const a of attempts) {
    const b = a.bloomLevel || 'Remember';
    if (!bloomMap[b]) bloomMap[b] = { score: 0, count: 0 };
    bloomMap[b].score += a.score;
    bloomMap[b].count += 1;

    const c = a.concept || 'General';
    if (!conceptMap[c]) conceptMap[c] = { score: 0, count: 0 };
    conceptMap[c].score += a.score;
    conceptMap[c].count += 1;
  }

  const bloomAnalytics = $('#bloomAnalyticsList');
  if (bloomAnalytics) {
    bloomAnalytics.innerHTML = Object.keys(bloomMap).length
      ? Object.entries(bloomMap).map(([bloom, stats]) =>
        `<div class="item-row"><span>${bloom}</span><strong>${Math.round(stats.score / stats.count)}% Mastery (${stats.count} attempts)</strong></div>`
      ).join('')
      : '<p class="topic-note">No attempt history available yet.</p>';
  }

  const conceptAnalytics = $('#conceptAnalyticsList');
  if (conceptAnalytics) {
    conceptAnalytics.innerHTML = Object.keys(conceptMap).length
      ? Object.entries(conceptMap).map(([concept, stats]) =>
        `<div class="item-row"><span>${concept}</span><strong>${Math.round(stats.score / stats.count)}% Mastery</strong></div>`
      ).join('')
      : '<p class="topic-note">No concept history recorded.</p>';
  }
}

function switchTab(tabName) {
  state.activeTab = tabName;
  $('#welcome').classList.add('hidden');
  $('#learning').classList.add('hidden');
  $('#examSection').classList.add('hidden');
  $('#analyticsSection').classList.add('hidden');

  if (tabName === 'learning') {
    $('#learning').classList.remove('hidden');
    if (!state.currentQuestion) loadNextQuestion();
  } else if (tabName === 'exam') {
    $('#examSection').classList.remove('hidden');
    $('#examConfigView').classList.remove('hidden');
    $('#examActiveView').classList.add('hidden');
    $('#examReportView').classList.add('hidden');
  } else if (tabName === 'analytics') {
    $('#analyticsSection').classList.remove('hidden');
    renderAnalytics();
  } else {
    $('#welcome').classList.remove('hidden');
  }
}

async function init() {
  const response = await fetch('/api/session');
  const data = await response.json();
  state.questions = data.questions;
  state.concepts = data.concepts;
  state.departments = data.departments || [];

  renderTaxonomyOptions();

  $('#aiStatus').textContent = data.aiAvailable ? 'Semantic Engine Active' : 'Deterministic Engine';

  $('#departmentSelect').onchange = (e) => {
    state.userProfile.department = e.target.value;
    updateSubjectOptions();
    if (state.activeTab === 'learning') loadNextQuestion();
  };

  $('#subjectSelect').onchange = (e) => {
    state.userProfile.subject = e.target.value;
    if (state.activeTab === 'learning') loadNextQuestion();
  };

  $('#startButton').onclick = () => switchTab('learning');
  $('#generateExamHeroBtn').onclick = () => switchTab('exam');

  $('#submitButton').onclick = submitAnswer;

  $('#hintButton').onclick = () => {
    const q = state.currentQuestion;
    if (!q) return;
    state.hint = Math.min(state.hint + 1, (q.hints || []).length);
    $('#hintText').textContent = state.hint ? `Hint ${state.hint}: ${q.hints[state.hint - 1]}` : 'No more hints available.';
  };

  $('#whyButton').onclick = () => {
    if (state.currentQuestion) {
      $('#hintText').textContent = `Why this question: ${state.currentQuestion.whyThisQuestion || state.currentQuestion.concept}`;
    }
  };

  $('#resetButton').onclick = () => {
    state.userProfile.attempts = {};
    state.userProfile.seenQuestionIds = [];
    state.streak = 0;
    save();
    switchTab('welcome');
  };

  $('#menuButton').onclick = () => $('.tree-panel').classList.toggle('open');

  document.querySelectorAll('.mode').forEach((button) => {
    button.onclick = () => {
      document.querySelector('.mode.active').classList.remove('active');
      button.classList.add('active');
      const mode = button.dataset.mode;
      if (['deep', 'quick'].includes(mode)) {
        state.userProfile.mode = mode;
        switchTab('learning');
      } else if (mode === 'exam') {
        switchTab('exam');
      } else if (mode === 'analytics') {
        switchTab('analytics');
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
  $('#examFinishBtn').onclick = submitExam;
  $('#examBackBtn').onclick = () => switchTab('exam');
}

init().catch((err) => {
  console.error(err);
  document.body.innerHTML = '<main class="fatal"><h1>Question Machine could not start.</h1><p>Refresh the page or check the server connection.</p></main>';
});
