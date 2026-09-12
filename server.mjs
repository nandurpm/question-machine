import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { concepts, departments, publicQuestion, questions } from './data/questions.mjs';
import { selectNextQuestion } from './lib/adaptive.mjs';
import { QuestionBankDB } from './lib/db.mjs';
import { deterministicEvaluate, nvidiaEvaluate } from './lib/evaluator.mjs';
import { evaluateExam, generateExam } from './lib/exam.mjs';

const db = new QuestionBankDB(questions);

const port = Number(process.env.PORT || 4080);
const root = join(process.cwd(), 'public');
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const send = (response, status, body) => {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(body));
};

async function readBody(request) {
  let body = '';
  for await (const part of request) {
    body += part;
    if (body.length > 50_000) throw new Error('Request is too large');
  }
  return JSON.parse(body || '{}');
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  try {
    // Session metadata
    if (request.method === 'GET' && url.pathname === '/api/session') {
      return send(response, 200, {
        questions: db.getAllQuestions().map(publicQuestion),
        concepts,
        departments,
        aiAvailable: Boolean(process.env.NVIDIA_API_KEY)
      });
    }

    // Taxonomy and Departments list
    if (request.method === 'GET' && url.pathname === '/api/topics') {
      return send(response, 200, { departments, concepts });
    }

    // Question Bank Search & Query
    if (request.method === 'GET' && url.pathname === '/api/questions') {
      const filters = {
        department: url.searchParams.get('department'),
        subject: url.searchParams.get('subject'),
        topic: url.searchParams.get('topic'),
        concept: url.searchParams.get('concept'),
        bloomLevel: url.searchParams.get('bloomLevel'),
        questionType: url.searchParams.get('questionType'),
        difficulty: url.searchParams.get('difficulty'),
        search: url.searchParams.get('search'),
        limit: Number(url.searchParams.get('limit')) || 20,
        offset: Number(url.searchParams.get('offset')) || 0
      };
      const result = db.query(filters);
      return send(response, 200, {
        total: result.total,
        questions: result.questions.map(publicQuestion)
      });
    }

    // Adaptive Next Question Selection
    if (request.method === 'POST' && url.pathname === '/api/questions/next') {
      const userProfile = await readBody(request);
      const nextQ = selectNextQuestion(db, userProfile);
      return send(response, 200, { question: publicQuestion(nextQ) });
    }

    // Deduplication API
    if (request.method === 'POST' && url.pathname === '/api/deduplicate') {
      const candidate = await readBody(request);
      const duplicateInfo = db.detectDuplicate(candidate);
      return send(response, 200, duplicateInfo);
    }

    // Answer Evaluation
    if (request.method === 'POST' && url.pathname === '/api/evaluate') {
      const body = await readBody(request);
      const question = db.getQuestion(body.questionId);
      if (!question) return send(response, 404, { error: 'Unknown question.' });

      const deterministic = deterministicEvaluate(question, body.answer);
      const isShortText = ['short_answer', 'scenario', 'troubleshooting', 'case_study'].includes(question.questionType || question.type);
      const useAi = isShortText && deterministic.result === 'needs_review' && Boolean(process.env.NVIDIA_API_KEY);

      if (!useAi) return send(response, 200, { evaluation: deterministic, question: publicQuestion(question) });

      try {
        const evaluated = await nvidiaEvaluate(question, body.answer, process.env.NVIDIA_API_KEY, process.env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct');
        return send(response, 200, { evaluation: evaluated || deterministic, question: publicQuestion(question) });
      } catch {
        return send(response, 200, {
          evaluation: {
            ...deterministic,
            feedback: 'Semantic review is temporarily unavailable. Your response is marked Needs Review rather than being guessed.',
            source: 'degraded'
          },
          question: publicQuestion(question)
        });
      }
    }

    // Exam Paper Generation
    if (request.method === 'POST' && url.pathname === '/api/exam/generate') {
      const config = await readBody(request);
      const examPaper = generateExam(db, config);
      return send(response, 200, examPaper);
    }

    // Exam Submission & Grading
    if (request.method === 'POST' && url.pathname === '/api/exam/evaluate') {
      const submission = await readBody(request);
      const examReport = evaluateExam(db, submission);
      return send(response, 200, examReport);
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return send(response, 405, { error: 'Method not allowed.' });
    }

    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const target = normalize(join(root, pathname));
    if (!target.startsWith(root) || !existsSync(target) || !statSync(target).isFile()) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return response.end('Not found');
    }
    response.writeHead(200, {
      'content-type': types[extname(target)] || 'application/octet-stream',
      'x-content-type-options': 'nosniff'
    });
    if (request.method === 'HEAD') return response.end();
    createReadStream(target).pipe(response);
  } catch (error) {
    send(response, 400, { error: error.message === 'Request is too large' ? error.message : 'Invalid request.' });
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Question Machine is running on http://0.0.0.0:${port}`));
