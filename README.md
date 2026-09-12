# Question Machine

Question Machine is a responsive engineering practice platform with adaptive study sessions, timed exam generation, transparent grading, and browser-local mastery analytics.

**Live app:** [question-machine.onrender.com](https://question-machine.onrender.com)

## Highlights

- Filter practice by department, subject, or individual concept.
- Study in a deeper Bloom-guided sequence or prioritize weak concepts in Quick mode.
- Answer multiple-choice, multiple-correct, true/false, numerical, fill-in-the-blank, ordering, matching, classification, short-answer, and scenario questions.
- Build timed exams, move between questions without losing answers, and review every result after submission.
- Grade structured answers deterministically and explain why an answer passed or failed.
- Optionally route unresolved open responses to NVIDIA NIM for cautious semantic review.
- Store anonymous progress in `localStorage`; no account or database is required.

The included bank is curated seed content covering electrical fundamentals, electrical safety, machines, industrial automation, and escalator/elevator electrical systems. It is not a substitute for current official standards, manufacturer instructions, or safety procedures.

## Run locally

Requirements: Node.js 22 or newer.

```bash
git clone https://github.com/nandurpm/question-machine.git
cd question-machine
npm install
npm start
```

Open `http://localhost:4080`. Set `PORT` to use a different port:

```bash
PORT=5050 npm start
```

On Windows Command Prompt, use `set PORT=5050 && npm start`.

## Optional NVIDIA semantic evaluation

The default experience works without an AI key. Multiple-choice, multiple-correct, true/false, fill-in-the-blank, numerical, ordering, matching, and classification answers are always checked locally by deterministic server logic.

For unresolved short-answer and scenario responses, configure these server-side environment variables:

| Variable | Purpose |
| --- | --- |
| `NVIDIA_API_KEY` | Enables semantic review for unresolved open responses. |
| `NVIDIA_MODEL` | Optional NIM model ID; defaults to `meta/llama-3.1-8b-instruct`. |

Never commit a real key. On Render, add it through the service environment settings.

## Validation

```bash
npm run check
npm test
```

The test suite covers deterministic grading, question-bank validation and deduplication, adaptive selection, taxonomy resolution, filtered exam generation, and unanswered-question grading.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service and question-bank health check. |
| `GET` | `/api/session` | Public question metadata, concepts, departments, and evaluator status. |
| `GET` | `/api/topics` | Department and concept taxonomy. |
| `GET` | `/api/questions` | Search and filter public question metadata. |
| `POST` | `/api/questions/next` | Select the next adaptive study question. |
| `POST` | `/api/evaluate` | Grade one answer. |
| `POST` | `/api/exam/generate` | Create a filtered timed exam. |
| `POST` | `/api/exam/evaluate` | Grade the full exam, including unanswered questions. |
| `POST` | `/api/deduplicate` | Check a candidate question for duplicates. |

Taxonomy filters accept either IDs such as `ELEV` and `ELEV-ESC-ELEC` or their display names.

## Deployment

Create a Render Node Web Service with:

- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`

The server binds to `0.0.0.0:$PORT` and serves both the API and static client.

## Privacy and grading boundaries

- Progress is stored only in the current browser.
- The deterministic path sends no student answer to an external AI provider.
- When NVIDIA evaluation is enabled, only unresolved open responses are sent to that provider.
- If semantic evaluation is unavailable or invalid, the app returns **Needs review** instead of guessing a confident grade.
