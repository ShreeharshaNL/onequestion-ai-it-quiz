import { getNextQuestion, getQuestionPoolStatus } from "../services/aiService.js";

export async function getQuestion(_req, res, next) {
  try {
    const payload = await getNextQuestion();

    res.json(payload);
  } catch (error) {
    next(error);
  }
}

export function getQuestionStatus(_req, res) {
  res.json(getQuestionPoolStatus());
}
