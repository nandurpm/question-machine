/*
 * ============================================================
 * FILE: server.mjs
 * PURPOSE: Runs Question Machine's local HTTP server and exposes the question and answer-evaluation endpoints used by the browser client.
 * ============================================================
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { concepts, publicQuestion, questions } from './data/questions.mjs';
import { deterministicEvaluate, nvidiaEvaluate } from './lib/evaluator.mjs';

const port = Number(process.env.PORT || 4080);
const root = join(process.cwd(), 'public');
const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const send = (response, status, body) => { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(body)); };

async function readBody(request) { let body = ''; for await (const part of request) { body += part; if (body.length > 25_000) throw new Error('Request is too large'); } return JSON.parse(body || '{}'); }

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  try {
    if (request.method === 'GET' && url.pathname === '/api/session') return send(response, 200, { questions: questions.map(publicQuestion), concepts, aiAvailable: Boolean(process.env.NVIDIA_API_KEY) });
    if (request.method === 'POST' && url.pathname === '/api/evaluate') {
      const body = await readBody(request); const question = questions.find((item) => item.id === body.questionId);
      if (!question) return send(response, 404, { error: 'Unknown question.' });
      const deterministic = deterministicEvaluate(question, body.answer);
      const useAi = ['short_answer', 'scenario'].includes(question.type) && deterministic.result === 'needs_review' && Boolean(process.env.NVIDIA_API_KEY);
      if (!useAi) return send(response, 200, { evaluation: deterministic, question: publicQuestion(question) });
      try {
        const evaluated = await nvidiaEvaluate(question, body.answer, process.env.NVIDIA_API_KEY, process.env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct');
        return send(response, 200, { evaluation: evaluated || deterministic, question: publicQuestion(question) });
      } catch { return send(response, 200, { evaluation: { ...deterministic, feedback: 'Semantic review is temporarily unavailable. Your response is marked Needs Review rather than being guessed.', source: 'degraded' }, question: publicQuestion(question) }); }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return send(response, 405, { error: 'Method not allowed.' });
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const target = normalize(join(root, pathname));
    if (!target.startsWith(root) || !existsSync(target) || !statSync(target).isFile()) { response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return response.end('Not found'); }
    response.writeHead(200, { 'content-type': types[extname(target)] || 'application/octet-stream', 'x-content-type-options': 'nosniff' });
    if (request.method === 'HEAD') return response.end();
    createReadStream(target).pipe(response);
  } catch (error) { send(response, 400, { error: error.message === 'Request is too large' ? error.message : 'Invalid request.' }); }
});
server.listen(port, '0.0.0.0', () => console.log(`Question Machine is running on http://0.0.0.0:${port}`));
