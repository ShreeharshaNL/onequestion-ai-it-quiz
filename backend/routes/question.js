import express from "express";
import { getQuestion, getQuestionStatus } from "../controllers/questionController.js";

const router = express.Router();

// ✅ IMPORTANT: use "/" not "/question"
router.get("/", getQuestion);

// optional
router.get("/status", getQuestionStatus);
console.log("✅ Question routes loaded");
export default router;