import express from "express";
import { getQuestion, getQuestionStatus } from "../controllers/questionController.js";

const router = express.Router();

router.get("/question", getQuestion);
router.get("/question/status", getQuestionStatus);

export default router;
