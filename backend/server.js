import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import questionRouter from "./routes/question.js";
import {
  ensureQuestionPool,
  startQuestionPoolRefillJob,
  initializeClient,
} from "./services/aiService.js";

dotenv.config();
initializeClient();

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) || "*",
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", questionRouter);

app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    message: "Something went wrong.",
  });
});

app.listen(PORT, async () => {
  console.log(`Backend listening on http://localhost:${PORT}`);

  await ensureQuestionPool();
  startQuestionPoolRefillJob();
});

