import { Quiz } from "../../src/types.js";
import * as geminiService from "./geminiService.js";
import * as ollamaService from "./ollamaService.js";

// Set AI provider via environment variable: 'gemini' or 'ollama'
const AI_PROVIDER = process.env.AI_PROVIDER || "gemini";

export async function generateQuizFromAI(topic: string, count: number = 5, userId: string = 'guest'): Promise<Quiz> {
  console.log(`[AI Service] Using provider: ${AI_PROVIDER}`);
  
  if (AI_PROVIDER === "ollama") {
    return ollamaService.generateQuizFromAI(topic, count, userId);
  } else {
    return geminiService.generateQuizFromAI(topic, count, userId);
  }
}

export async function modifyQuizWithAI(currentQuiz: Quiz, instruction: string, desiredQuestionCount?: number): Promise<Quiz> {
  console.log(`[AI Service] Using provider: ${AI_PROVIDER}`);
  
  if (AI_PROVIDER === "ollama") {
    return ollamaService.modifyQuizWithAI(currentQuiz, instruction, desiredQuestionCount);
  } else {
    return geminiService.modifyQuizWithAI(currentQuiz, instruction, desiredQuestionCount);
  }
}
