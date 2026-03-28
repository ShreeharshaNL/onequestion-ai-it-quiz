import express from "express";
import { getQuestion, getQuestionStatus } from "../controllers/questionController.js";

const router = express.Router();

router.get("/", getQuestion);
router.get("/status", getQuestionStatus);

export default router;
