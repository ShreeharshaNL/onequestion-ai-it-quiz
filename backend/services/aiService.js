import { GoogleGenAI } from "@google/genai";

const TOPICS = [
  "Computer Networks",
  "Operating Systems",
  "DBMS",
  "OOPs",
  "Data Structures & Algorithms",
];

const FALLBACK_QUESTIONS = [
  {
    id: "fallback-os-process-state",
    topic: "Operating Systems",
    question: "Which process state describes a process waiting for an I/O operation to complete?",
    options: ["Running", "Blocked", "Ready", "Terminated"],
    correctAnswer: 1,
    explanation:
      "A blocked process cannot continue until the event it is waiting for, such as an I/O completion, occurs.",
  },
  {
    id: "fallback-dbms-normalization",
    topic: "DBMS",
    question: "What is the primary goal of database normalization?",
    options: [
      "Increase redundancy for faster reads",
      "Reduce redundancy and improve data integrity",
      "Convert SQL into machine code",
      "Encrypt every column by default",
    ],
    correctAnswer: 1,
    explanation:
      "Normalization organizes data into well-structured tables to minimize redundancy and reduce update anomalies.",
  },
  {
    id: "fallback-dsa-binary-search",
    topic: "Data Structures & Algorithms",
    question: "What is the time complexity of binary search on a sorted array?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correctAnswer: 1,
    explanation:
      "Binary search halves the search space on each step, leading to logarithmic time complexity.",
  },
];

const POOL_TARGET = Number(process.env.QUESTION_POOL_TARGET || 5);
const REFILL_BATCH = Number(process.env.QUESTION_REFILL_BATCH || 1);
const REFILL_INTERVAL_MS = Number(process.env.QUESTION_REFILL_INTERVAL_MS || 600000);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

let geminiClient = null;
let groqEnabled = false;
let currentProvider = "gemini"; // Track which provider is active
let questionPool = [];
let recentQuestionSignatures = new Set();
let refillInProgress = false;
let fallbackIndex = 0;
let lastGenerationError = "No API keys configured.";
let quotaExhaustedUntil = 0;

export function initializeClient() {
  if (process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    currentProvider = "gemini";
    console.log("✓ Gemini API initialized (primary)");
  }

  if (process.env.GROQ_API_KEY) {
    groqEnabled = true;
    if (!geminiClient) {
      currentProvider = "groq";
    }
    console.log("✓ Groq API initialized (fallback)");
  }

  if (!geminiClient && !groqEnabled) {
    lastGenerationError = "No API keys configured.";
  } else {
    lastGenerationError = null;
  }
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildSignature(question) {
  return normalizeText(question.question);
}

function getRandomTopic() {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}

function sanitizeQuestion(rawQuestion, topic) {
  if (!rawQuestion || typeof rawQuestion !== "object") {
    throw new Error("AI returned an invalid question payload.");
  }

  const { question, options, correctAnswer, explanation } = rawQuestion;

  if (typeof question !== "string" || !question.trim()) {
    throw new Error("Question text is missing.");
  }

  if (
    !Array.isArray(options) ||
    options.length !== 4 ||
    options.some((option) => typeof option !== "string" || !option.trim())
  ) {
    throw new Error("Question options must contain exactly 4 non-empty strings.");
  }

  if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) {
    throw new Error("Correct answer index must be between 0 and 3.");
  }

  if (typeof explanation !== "string" || !explanation.trim()) {
    throw new Error("Explanation is missing.");
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    topic,
    question: question.trim(),
    options: options.map((option) => option.trim()),
    correctAnswer,
    explanation: explanation.trim(),
  };
}

function getFallbackQuestion() {
  const baseQuestion = FALLBACK_QUESTIONS[fallbackIndex % FALLBACK_QUESTIONS.length];
  fallbackIndex += 1;

  return {
    ...baseQuestion,
    id: `${baseQuestion.id}-${Date.now()}`,
    source: "fallback",
    fallbackReason: lastGenerationError || "Question pool is empty.",
  };
}

async function generateQuestionWithAI() {
  const topic = getRandomTopic();
  const prompt = `You generate accurate medium-difficulty IT multiple-choice questions for technical quizzes.
Create one unique medium-difficulty multiple-choice question about ${topic}.
Return response strictly in JSON using this schema:
{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": 0,
  "explanation": "..."
}

Rules:
- Exactly 4 options
- Only one correct answer
- Explanation must be short, clear, and technically accurate
- Avoid duplicates and avoid trick wording
- Keep the question self-contained
- Return only raw JSON with no markdown fences or extra text`;

  let lastError = null;

  // Try primary provider first
  if (currentProvider === "gemini" && geminiClient) {
    try {
      return await generateWithGemini(prompt, topic);
    } catch (error) {
      lastError = error;
      console.warn(`[GEMINI] Failed, attempting fallback...`);
      
      // Switch to Groq on Gemini failure
      if (groqEnabled) {
        currentProvider = "groq";
        try {
          return await generateWithGroq(prompt, topic);
        } catch (groqError) {
          // Both failed
          quotaExhaustedUntil = Date.now() + 86400000;
          console.error("⚠️ All providers exhausted. Serving fallback questions.");
          throw groqError;
        }
      } else {
        // No fallback available
        throw error;
      }
    }
  } 
  
  // Try Groq directly (either primary or after Gemini failed)
  if (groqEnabled) {
    try {
      currentProvider = "groq";
      return await generateWithGroq(prompt, topic);
    } catch (error) {
      quotaExhaustedUntil = Date.now() + 86400000;
      throw error;
    }
  }

  throw new Error("No AI providers available.");
}

async function generateWithGemini(prompt, topic) {
  const completion = await geminiClient.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const rawText = completion.text?.trim();
  if (!rawText) {
    throw new Error("Gemini returned an empty response.");
  }

  return sanitizeQuestion(JSON.parse(rawText), topic);
}

async function generateWithGroq(prompt, topic) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content?.trim();

    if (!rawText) {
      throw new Error("Groq returned an empty response.");
    }

    return sanitizeQuestion(JSON.parse(rawText), topic);
  } catch (error) {
    throw new Error(`Groq generation failed: ${error.message}`);
  }
}

async function tryGenerateUniqueQuestion() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const question = await generateQuestionWithAI();
    const signature = buildSignature(question);

    if (!recentQuestionSignatures.has(signature)) {
      recentQuestionSignatures.add(signature);

      if (recentQuestionSignatures.size > 200) {
        const [firstEntry] = recentQuestionSignatures;
        if (firstEntry) {
          recentQuestionSignatures.delete(firstEntry);
        }
      }

      return question;
    }
  }

  throw new Error("Could not generate a unique question after multiple attempts.");
}

export async function ensureQuestionPool() {
  const hasProvider = geminiClient || groqEnabled;
  if (!hasProvider || refillInProgress || questionPool.length >= POOL_TARGET) {
    return;
  }

  // Skip if all providers are exhausted
  if (quotaExhaustedUntil > Date.now()) {
    return;
  }

  refillInProgress = true;

  try {
    const missingCount = POOL_TARGET - questionPool.length;
    const generateCount = Math.min(Math.max(missingCount, 1), REFILL_BATCH);
    const generatedQuestions = await Promise.allSettled(
      Array.from({ length: generateCount }, () => tryGenerateUniqueQuestion()),
    );

    const successfulQuestions = generatedQuestions
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    if (successfulQuestions.length > 0) {
      questionPool.push(...successfulQuestions);
      lastGenerationError = null;
      console.log(`[${currentProvider.toUpperCase()}] Pool refilled: ${questionPool.length}/${POOL_TARGET}`);
    }

    generatedQuestions
      .filter((result) => result.status === "rejected")
      .forEach((result) => {
        const errorMsg = result.reason?.message || String(result.reason);
        lastGenerationError = errorMsg;
        console.error(`[${currentProvider.toUpperCase()}] Generation failed:`, errorMsg);
      });
  } finally {
    refillInProgress = false;
  }
}

export function startQuestionPoolRefillJob() {
  const hasProvider = geminiClient || groqEnabled;
  if (!hasProvider) {
    console.warn("⚠️ No AI providers configured. Serving fallback questions only.");
    return;
  }

  setInterval(() => {
    ensureQuestionPool().catch((error) => {
      lastGenerationError = error.message;
      console.error("Pool refill job error:", error.message);
    });
  }, REFILL_INTERVAL_MS);
}

export function getQuestionPoolStatus() {
  const quotaExhausted = quotaExhaustedUntil > Date.now();
  const hasProvider = geminiClient || groqEnabled;
  
  return {
    poolSize: questionPool.length,
    poolTarget: POOL_TARGET,
    activeProvider: hasProvider ? currentProvider : "none",
    providersAvailable: {
      gemini: !!geminiClient,
      groq: groqEnabled,
    },
    usingFallbackOnly: !hasProvider || quotaExhausted,
    quotaExhausted,
    quotaResetTime: quotaExhausted ? new Date(quotaExhaustedUntil).toISOString() : null,
    lastGenerationError,
  };
}

export async function getNextQuestion() {
  const nextQuestion = questionPool.shift();

  ensureQuestionPool().catch((error) => {
    lastGenerationError = error.message;
    console.error("Async pool refill failed:", error.message);
  });

  if (nextQuestion) {
    return {
      ...nextQuestion,
      source: "pool",
      poolSize: questionPool.length,
    };
  }

  return {
    ...getFallbackQuestion(),
    poolSize: 0,
  };
}
