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

This repository is Render-ready. Create a Node Web Service with build command `npm install` and start command `npm start`; the server binds to `0.0.0.0:$PORT`. Add the optional NVIDIA variables in Render’s secret environment-variable interface after deployment.

**Live application:** [https://question-machine.onrender.com](https://question-machine.onrender.com)

## Privacy and scope

The default mode sends no student answer to an AI provider. Browser-local progress can be reset at any time. The shipped questions are educational seed content; the application does not claim syllabus grounding until an approved source/resource layer is added.

<!-- clear-use-guide -->
## Clear use guide

### Install

Use Node.js 22 or newer, clone this repository, and install its dependencies:

```bash
git clone https://github.com/nandurpm/question-machine.git
cd question-machine
npm install
```

### Open it locally

Start the local web/report server:

```bash
npm start
```

Then open the URL printed by the terminal. The production report hosts use http://localhost:4080 unless a different PORT value is set. To choose another port, use PORT=5050 npm start on Linux/macOS or set PORT=5050 && npm start in Windows Command Prompt.


### Use the hosted version

**Live URL:** [https://question-machine.onrender.com](https://question-machine.onrender.com)

The hosted version is a browser-friendly report or application view. It runs on Render’s free tier, so the first request after inactivity can take longer while the instance starts.

### Windows and Linux

The same Node.js commands work in Windows PowerShell, Windows Command Prompt, and a Linux terminal. Use the platform-specific port command above only when you need a non-default local port.

### Important scope

This project follows its existing local-first and read-only boundaries. Demo/report content is generated or supplied through the documented local workflow; a hosted page does not provide hidden access to your device, private files, hardware, accounts, or network.

