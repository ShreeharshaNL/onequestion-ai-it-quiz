# OneQuestion: AI IT Quiz

A full-stack web application that serves one AI-generated IT multiple-choice question instantly from a prefilled backend question pool.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- AI: Gemini API

## Features

- Instant question delivery from an in-memory queue
- Background refill job that keeps at least 20 questions ready
- Fallback static questions if the AI pool is empty
- Topic-aware question generation across Networks, OS, DBMS, OOPs, and DSA
- Responsive dark UI with answer feedback, explanation reveal, score, and next question flow

## Project Structure

```text
.
|-- backend
|   |-- controllers
|   |   `-- questionController.js
|   |-- routes
|   |   `-- question.js
|   |-- services
|   |   `-- aiService.js
|   |-- package.json
|   `-- server.js
|-- frontend
|   |-- src
|   |   |-- components
|   |   |   `-- Quiz.jsx
|   |   |-- styles
|   |   |   `-- index.css
|   |   |-- App.jsx
|   |   `-- main.jsx
|   |-- index.html
|   |-- package.json
|   |-- postcss.config.js
|   |-- tailwind.config.js
|   `-- vite.config.js
`-- package.json
```

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
QUESTION_POOL_TARGET=20
QUESTION_REFILL_BATCH=4
QUESTION_REFILL_INTERVAL_MS=4000
```

## Install

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

## Run

From the project root:

```bash
npm run dev
```

This starts:

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

## Production

Build the frontend:

```bash
npm run build
```

Preview frontend build:

```bash
npm run preview
```

Run backend in production mode:

```bash
npm run start:backend
```
