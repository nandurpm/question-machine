# Question Machine

**Question Machine** is a public, responsive learning-tree tutor for Polytechnic and engineering learners. It moves from a topic to a question, student answer, transparent evaluation, feedback, model answer, and a deeper related question.

## What is included

The initial Electricity path supports multiple choice, true/false, numerical, fill-in-the-blank, short-answer, scenario, and ordering questions. Multiple-choice, true/false, fill-in-the-blank, numerical, and ordering answers are checked deterministically. Open responses use transparent keyword/concept matching first; only unresolved open answers may use the optional NVIDIA semantic evaluator. If the provider is unavailable, the application returns **Needs Review** instead of claiming a confident AI grade.

The interface fills the available screen, includes a visual knowledge tree with text labels in addition to color, stores only anonymous session progress in the browser, and works without an AI key for the seeded deterministic path.

## Run locally

Requirements: Node.js 22 or newer.

```bash
npm start
```

Open `http://localhost:4080`. To use another port, set `PORT`, for example `PORT=5050 npm start` on Linux/macOS or `set PORT=5050 && npm start` on Windows Command Prompt.

## Optional NVIDIA semantic evaluation

Copy `.env.example` to a local `.env` file only if your local environment loader supports it, or export the values in your shell. On Render, set these as service environment variables, never in the repository:

| Variable | Purpose |
| --- | --- |
| `NVIDIA_API_KEY` | NVIDIA API key used only for unresolved short-answer and scenario evaluation. |
| `NVIDIA_MODEL` | Optional NIM model ID; defaults to `meta/llama-3.1-8b-instruct`. |

The adapter calls NVIDIA’s documented `POST /v1/chat/completions` endpoint and validates structured output before it is displayed. [NVIDIA LLM API documentation](https://docs.api.nvidia.com/nim/reference/llm-apis)

## Validation

```bash
npm run check
npm test
```

## Deployment

This repository is Render-ready. Create a Node Web Service with build command `npm install` and start command `npm start`; the server binds to `0.0.0.0:$PORT`. Add the optional NVIDIA variables in Render’s secret environment-variable interface after deployment. The live deployment URL will be added here once verified.

## Privacy and scope

The default mode sends no student answer to an AI provider. Browser-local progress can be reset at any time. The shipped questions are educational seed content; the application does not claim syllabus grounding until an approved source/resource layer is added.
