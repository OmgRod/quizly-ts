import { Ollama } from 'ollama';
import { Agent, fetch as undiciFetch } from 'undici';
import { Quiz, QuestionType } from "../../src/types";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";
const OLLAMA_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Try to parse possibly messy JSON by trimming fences and slicing the first {...} block
const tryParseJson = (raw: string) => {
  const trimmed = raw.trim();
  const fenceStripped = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(fenceStripped);
  } catch (e) {
    const firstBrace = fenceStripped.indexOf('{');
    const lastBrace = fenceStripped.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const slice = fenceStripped.slice(firstBrace, lastBrace + 1);
      return JSON.parse(slice);
    }
    throw e;
  }
};

const timeoutDispatcher = new Agent({
  headersTimeout: OLLAMA_TIMEOUT_MS,
  bodyTimeout: OLLAMA_TIMEOUT_MS
});

const ollama = new Ollama({
  host: OLLAMA_BASE_URL,
  fetch: (url, init) => undiciFetch(url, { ...init, dispatcher: timeoutDispatcher })
});

const QUIZ_GRAMMAR = `
root ::= quiz
quiz ::= "{" title "," description "," questions "}"
title ::= "\\"title\\"" ":" string
description ::= "\\"description\\"" ":" string
questions ::= "\\"questions\\"" ":" "[" question ("," question)* "]"
question ::= "{" id "," qtype "," pointType "," text "," options? correctIndices? correctSequence? correctTexts? timeLimit "}"
id ::= "\\"id\\"" ":" string
qtype ::= "\\"type\\"" ":" ("\\"MULTIPLE_CHOICE\\"" | "\\"TRUE_FALSE\\"" | "\\"INPUT\\"" | "\\"PUZZLE\\"" | "\\"POLL\\"" | "\\"WORD_CLOUD\\"")
pointType ::= "\\"pointType\\"" ":" ("\\"NORMAL\\"" | "\\"HALF\\"" | "\\"DOUBLE\\"" | "\\"NONE\\"")
text ::= "\\"text\\"" ":" string
options ::= "," "\\"options\\"" ":" "[" string ("," string)* "]"
correctIndices ::= "," "\\"correctIndices\\"" ":" "[" number ("," number)* "]"
correctSequence ::= "," "\\"correctSequence\\"" ":" "[" string ("," string)* "]"
correctTexts ::= "," "\\"correctTexts\\"" ":" "[" string ("," string)* "]"
timeLimit ::= "," "\\"timeLimit\\"" ":" number
string ::= /"([^"\\\\]|\\\\.)*"/
number ::= /[0-9]+/
options? ::= | options
correctIndices? ::= | correctIndices
correctSequence? ::= | correctSequence
correctTexts? ::= | correctTexts
`;

async function callOllama(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const response = await ollama.generate({
      model: OLLAMA_MODEL,
      prompt,
      system: systemPrompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1,
        top_p: 0.9
      }
    } as any);

    return (response as any).response;
  } catch (error: any) {
    if (error.message?.includes('ECONNREFUSED') || error.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to Ollama at ${OLLAMA_BASE_URL}. Make sure Ollama is running.`);
    }
    throw error;
  }
}

function validateQuizStrict(q: any): void {
  if (!q || typeof q !== 'object') throw new Error('Invalid quiz payload');
  if (!Array.isArray(q.questions)) throw new Error('Invalid questions array');
  q.questions.forEach((question: any, idx: number) => {
    if (!question || typeof question !== 'object') throw new Error(`Invalid question at index ${idx}`);
    if (!question.type) throw new Error(`Missing type for question ${idx}`);
    if (!question.text) throw new Error(`Missing text for question ${idx}`);
    if (!question.pointType) throw new Error(`Missing pointType for question ${idx}`);
    if (typeof question.timeLimit !== 'number') {
      // Normalize missing or invalid timeLimit to a sane default
      question.timeLimit = 20;
    }

    // Per-type correctness and completeness checks
    if (question.type === QuestionType.MULTIPLE_CHOICE || question.type === QuestionType.TRUE_FALSE) {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        throw new Error(`Missing or insufficient options for question ${idx}`);
      }

      // Normalize missing/invalid correctIndices by defaulting to the first option
      if (!Array.isArray(question.correctIndices) || question.correctIndices.length === 0) {
        question.correctIndices = [0];
      }

      // Clamp out-of-range indices back to the first option to avoid rejection
      const sanitized = question.correctIndices
        .filter((ci: number) => typeof ci === 'number')
        .map((ci: number) => (ci >= 0 && ci < question.options.length ? ci : 0));
      if (sanitized.length === 0) {
        sanitized.push(0);
      }
      question.correctIndices = sanitized;

      if (question.type === QuestionType.TRUE_FALSE) {
        // Enforce canonical True/False options and keep indices within [0,1]
        question.options = ["True", "False"];
        question.correctIndices = question.correctIndices.map((ci: number) => (ci === 1 ? 1 : 0));
      }
    }

    if (question.type === QuestionType.POLL) {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        throw new Error(`Missing or insufficient options for poll question ${idx}`);
      }
      // POLL questions should not have correctIndices
      question.correctIndices = undefined;
      // Ensure NONE point type for polls
      if (question.pointType !== 'NONE') {
        question.pointType = 'NONE';
      }
    }

    if (question.type === QuestionType.PUZZLE) {
      if (!Array.isArray(question.correctSequence) || question.correctSequence.length < 3) {
        throw new Error(`Missing correctSequence for puzzle question ${idx}`);
      }
    }

    if (question.type === QuestionType.INPUT) {
      if (!Array.isArray(question.correctTexts) || question.correctTexts.length === 0) {
        throw new Error(`Missing correctTexts for input question ${idx}`);
      }
    }

    if (question.type === QuestionType.WORD_CLOUD) {
      // WORD_CLOUD only needs the prompt text in 'text' field
      // Ensure pointType is NONE
      if (question.pointType !== 'NONE') {
        question.pointType = 'NONE';
      }
    }
  });
}

export async function generateQuizFromAI(topic: string, count: number = 5, userId: string = 'guest'): Promise<Quiz> {
  const systemPrompt = `You are a quiz generation AI. You MUST respond with valid JSON only, no other text. Follow the schema exactly.`;
  
  const prompt = `Generate a "wild" and highly engaging ${count}-question interactive quiz about: ${topic}. 
  Include various types: 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'INPUT', 'PUZZLE' (ordering items), 'POLL' (opinion questions with no correct answer), and 'WORD_CLOUD' (word association/brainstorm prompts).

  IMPORTANT RULES FOR VARIED QUESTIONS (NO EXCEPTIONS):
  1. For MULTIPLE_CHOICE: Be creative with the number of options. Provide between 2 and 8 options. Do NOT always provide 4.
  2. For TRUE_FALSE: 'options' MUST be exactly ["True", "False"].
  3. For MULTIPLE_CHOICE and TRUE_FALSE: 'correctIndices' MUST NOT BE EMPTY and MUST reference the actual correct option indices.
  4. For PUZZLE: provide 'correctSequence' as an array of 3 to 8 strings in the correct order (this IS the answer).
  5. For INPUT: provide 'correctTexts' as an array of 1-3 possible correct string answers.
  6. For POLL: provide 'options' (2-8 items) but DO NOT include 'correctIndices'. Set 'pointType' to 'NONE'. These are opinion questions where all answers are valid.
  7. For WORD_CLOUD: DO NOT include 'options' or 'correctIndices'. Set 'pointType' to 'NONE'. Players will type free-text responses that get aggregated into a word cloud.
  8. Assign 'pointType': 'NORMAL', 'HALF', 'DOUBLE', or 'NONE' (use NONE for POLL and WORD_CLOUD questions, NORMAL/HALF/DOUBLE for all others).
  9. Every question MUST have: 'text' (this is the question you will ask), 'type', 'pointType', and a 'timeLimit' you choose (e.g., 15, 20, 30).
  10. You MUST pick the correct answer(s) for every question you generate (except POLL and WORD_CLOUD questions which have no correct answers).

  Make the questions challenging, witty, and varied. All questions must have complete options and correct structure.

  Response JSON Schema:
  {
    "title": "string - The title of the quiz",
    "description": "string - A brief description of the quiz",
    "questions": [
      {
        "id": "string - unique identifier",
        "type": "string - MULTIPLE_CHOICE, TRUE_FALSE, INPUT, PUZZLE, POLL, or WORD_CLOUD",
        "pointType": "string - NORMAL, HALF, DOUBLE, or NONE",
        "text": "string - The question text (exactly what will be asked)",
        "options": ["array of strings - 2-8 items for MULTIPLE_CHOICE, exactly 2 for TRUE_FALSE"],
        "correctIndices": [0, "array of integers - indices of correct options (0-based)"],
        "correctSequence": ["array of strings - 3-8 items in correct order for PUZZLE type"],
        "correctTexts": ["array of strings - valid answers for INPUT type"],
        "timeLimit": 20
      }
    ]
  }

  Respond with ONLY the JSON object, no markdown formatting or other text.`;

  try {
    const text = await callOllama(prompt, systemPrompt);
    
    if (!text) throw new Error("Empty response from AI");
    
    // Clean up response - remove markdown code blocks if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const quizData = JSON.parse(cleanText);

    validateQuizStrict(quizData);

    // Apply top-level defaults
    const title = (quizData.title && String(quizData.title).trim()) || `AI Quiz: ${topic}`;
    const description = (quizData.description && String(quizData.description).trim()) || `An auto-generated quiz about ${topic}`;

    // Validate and Fix data integrity while allowing "wild" variety
    const validatedQuestions = (quizData.questions || []).map((q: any, idx: number) => {
      const type = (q.type as QuestionType) || QuestionType.MULTIPLE_CHOICE;
      q.type = type;
      q.id = q.id || `q_${idx}_${Math.random().toString(36).slice(2, 7)}`;
      q.timeLimit = typeof q.timeLimit === 'number' ? q.timeLimit : 20;
      
      // Fix Multiple Choice
      if (type === QuestionType.MULTIPLE_CHOICE) {
        if (!q.options || q.options.length < 2) {
          q.options = ["Option A", "Option B", "Option C", "Option D"];
        }
        if (!q.correctIndices || q.correctIndices.length === 0) {
          q.correctIndices = [0];
        }
      }
      
      // Fix True/False
      if (type === QuestionType.TRUE_FALSE) {
        q.options = ["True", "False"];
        if (!q.correctIndices || q.correctIndices.length === 0) {
          q.correctIndices = [0];
        }
      }
      
      // Fix Poll
      if (type === QuestionType.POLL) {
        if (!q.options || q.options.length < 2) {
          q.options = ["Option A", "Option B", "Option C", "Option D"];
        }
        // No correct answer for polls
        q.correctIndices = undefined;
        q.pointType = 'NONE';
      }

      // Fix Puzzle
      if (type === QuestionType.PUZZLE && (!q.correctSequence || q.correctSequence.length < 3)) {
        q.correctSequence = q.correctSequence?.length >= 2 ? q.correctSequence : ["Step 1", "Step 2", "Step 3"];
      }

      // Fix Input
      if (type === QuestionType.INPUT && (!q.correctTexts || q.correctTexts.length === 0)) {
        q.correctTexts = ["correct answer"];
      }

      // Fix Word Cloud
      if (type === QuestionType.WORD_CLOUD) {
        q.options = [];
        q.correctIndices = [];
        q.correctTexts = undefined;
        q.correctSequence = undefined;
        q.pointType = 'NONE';
      }



      return q;
    });

    return {
      ...quizData,
      title,
      description,
      questions: validatedQuestions,
      id: Math.random().toString(36).substr(2, 9),
      userId,
      createdAt: Date.now(),
      playCount: 0
    } as Quiz;
  } catch (error) {
    console.error("Failed to generate/parse AI response", error);
    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED") || error.message.includes("connect")) {
        throw new Error("Cannot connect to Ollama. Make sure Ollama is running at " + OLLAMA_BASE_URL);
      }
      // Re-throw the original error message so we can see what went wrong
      throw error;
    }
    throw new Error("Failed to create quiz. AI service might be busy.");
  }
}

export async function modifyQuizWithAI(currentQuiz: Quiz, instruction: string, desiredQuestionCount?: number): Promise<Quiz> {
  const systemPrompt = `You are an expert quiz generation and modification AI. You create challenging, engaging, and varied quizzes. You MUST respond with valid JSON only, no other text. Follow the schema exactly.`;
  const safeInstruction = JSON.stringify(instruction);
  
  const hasQuestions = Array.isArray(currentQuiz.questions) && currentQuiz.questions.length > 0;
  const currentCount = hasQuestions ? currentQuiz.questions.length : 0;
  const action = hasQuestions ? 'Modify' : 'Create';
  
  // Parse the instruction to understand intent
  const instructionLower = instruction.toLowerCase();
  const isAddingQuestions = instructionLower.includes('add') || instructionLower.includes('more') || instructionLower.includes('additional');
  const isChangingDifficulty = instructionLower.includes('harder') || instructionLower.includes('easier') || instructionLower.includes('difficult');
  const isRewriting = instructionLower.includes('rewrite') || instructionLower.includes('rephrase') || instructionLower.includes('change');
  
  let targetQuestionCount = desiredQuestionCount || currentCount || 5;
  if (isAddingQuestions && desiredQuestionCount) {
    targetQuestionCount = currentCount + desiredQuestionCount;
  }
  
  const constraintText = targetQuestionCount ? `\\n- TARGET QUESTION COUNT: You MUST generate exactly ${targetQuestionCount} questions. This is a strict requirement.` : '';
  
  const prompt = `${action} a quiz based on this instruction: ${safeInstruction}
Current Quiz Data: ${JSON.stringify(currentQuiz)}

Context:
- Current questions: ${currentCount}
- Target questions: ${targetQuestionCount}
- Instruction intent: ${isAddingQuestions ? 'Adding questions' : isChangingDifficulty ? 'Changing difficulty' : isRewriting ? 'Rewriting content' : 'General modification'}

Instructions:
- If the instruction asks to ADD questions, add them to the existing questions (don't replace the whole quiz). Return ALL questions (existing + new).
- When adding questions, preserve ALL existing question data EXACTLY as provided - do not modify or regenerate existing questions.
- If the instruction asks to MODIFY questions, update their content/types while maintaining structure.
- If the instruction asks for a REWRITE, you can regenerate all content but keep the general topic.
- Make questions diverse in type: mix MULTIPLE_CHOICE, TRUE_FALSE, INPUT, PUZZLE, WORD_CLOUD, and other types.
- Create engaging, thoughtful questions that test real understanding, not just trivia.
- Each question should have a unique perspective or challenging aspect.
- CRITICAL: Use the field name "text" (NOT "question") for the question content. For example: {"text": "What is the capital of France?", ...}
- CRITICAL: The \"text\" field must contain the ACTUAL QUESTION TEXT (e.g., \"What is the capital of France?\"), NOT generic labels like \"Question 1\" or \"Question 12\".
- DO NOT repeat or duplicate any existing questions. Each question must be completely unique.

Constraints (must obey all):${constraintText}
- Maintain valid question structures.
- Multiple Choice questions can have 3 to 8 options (vary the count!).
- True/False questions MUST have exactly 2 options: ["True", "False"].
- Puzzle questions must have a correctSequence between 3 and 8 items.
- INPUT type questions should have varied correct answers (synonyms, similar expressions). Use INPUT for factual short-answer questions.
- WORD_CLOUD questions are ONLY for asking opinions or brainstorming ideas - NOT for factual questions. Examples: "What words come to mind about pizza?", "Name things you associate with summer". WORD_CLOUD has NO correct answers.
- You MUST pick and supply correct answer(s) for questions that have them (MULTIPLE_CHOICE, TRUE_FALSE, INPUT, PUZZLE). WORD_CLOUD questions should NOT have correctTexts or any correct answers.
- Time limits should vary: 15-20s for simple questions, 25-30s for complex ones.
- Set a title and description that match the quiz content and instruction.
- Use varied pointType values: mix NORMAL, DOUBLE (for harder questions), and HALF (for bonus questions).
- Field naming: Use "text" for question content, "type" for question type, "id" for unique identifier.

Return the full quiz JSON strictly following the same schema as the input.
Respond with ONLY the JSON object, no markdown formatting or other text.`;

  try {
    const text = await callOllama(prompt, systemPrompt);
    if (!text) throw new Error("Empty response from AI");

    console.log('[AI][modify] Raw response length:', text.length, 'Preview:', text.slice(0, 500));

    const quizData = tryParseJson(text);
    console.log('[AI][modify] Parsed quiz:', {
      hasTitle: !!quizData?.title,
      hasQuestions: Array.isArray(quizData?.questions),
      questionCount: Array.isArray(quizData?.questions) ? quizData.questions.length : 0
    });

    const sourceQuestions = Array.isArray(quizData.questions) && quizData.questions.length > 0
      ? quizData.questions
      : (currentQuiz.questions || []);

    if (!Array.isArray(sourceQuestions) || sourceQuestions.length === 0) {
      console.error('[AI][modify] Failed to get questions. AI response:', JSON.stringify(quizData, null, 2));
      throw new Error('AI returned no questions. The AI might not have understood the instruction. Try being more specific (e.g., "add 5 geography questions")');
    }

    // Repair incomplete answers from the model before strict validation
    const sanitizedQuestions = sourceQuestions.map((q: any, idx: number) => {
      const base = currentQuiz.questions?.[idx];
      const type = (q.type as QuestionType) || (base?.type as QuestionType) || QuestionType.MULTIPLE_CHOICE;
      
      // Get question text - AI might use "text" or "question" field, prefer AI's response, fallback to base
      let text = (q.text && String(q.text).trim()) || (q.question && String(q.question).trim()) || (base?.text && String(base.text).trim());
      if (!text || text.toLowerCase().startsWith('question ') && text.length < 15) {
        throw new Error(`AI failed to generate proper question text for question ${idx + 1}. Got: "${text || 'empty'}". Please try again with a more specific instruction.`);
      }
      
      const pointType = q.pointType || base?.pointType || 'NORMAL';
      const timeLimit = typeof q.timeLimit === 'number' ? q.timeLimit : (typeof base?.timeLimit === 'number' ? base.timeLimit : 20);
      const id = q.id || base?.id || `q_${idx}_${Math.random().toString(36).slice(2, 7)}`;

      // Normalize per type using base data as fallback to avoid validation failures
      if (type === QuestionType.MULTIPLE_CHOICE) {
        const options = (q.options && q.options.length >= 2 ? q.options : base?.options) || ["Option A", "Option B", "Option C", "Option D"];
        const correctIndices = (q.correctIndices && q.correctIndices.length > 0 ? q.correctIndices : base?.correctIndices) || [0];
        return { ...q, id, type, text, pointType, timeLimit, options, correctIndices };
      }

      if (type === QuestionType.TRUE_FALSE) {
        const options = ["True", "False"];
        const correctIndices = (q.correctIndices && q.correctIndices.length > 0 ? q.correctIndices : base?.correctIndices) || [0];
        return { ...q, id, type, text, pointType, timeLimit, options, correctIndices };
      }

      if (type === QuestionType.PUZZLE) {
        const correctSequence = (q.correctSequence && q.correctSequence.length >= 3 ? q.correctSequence : base?.correctSequence) || ["Step 1", "Step 2", "Step 3"];
        return { ...q, id, type, text, pointType, timeLimit, correctSequence };
      }

      if (type === QuestionType.INPUT) {
        const correctTexts = (q.correctTexts && q.correctTexts.length > 0 ? q.correctTexts : base?.correctTexts) || ["correct answer"];
        return { ...q, id, type, text, pointType, timeLimit, correctTexts };
      }

      return { ...q, id, type, text, pointType, timeLimit };
    });

    // Validate after repairing
    validateQuizStrict({ ...quizData, questions: sanitizedQuestions });

    // Apply defaults on modify path too
    const title = (quizData.title && String(quizData.title).trim()) || currentQuiz.title || 'Updated Quiz';
    const description = (quizData.description && String(quizData.description).trim()) || currentQuiz.description || '';

    // Enforce target question count
    let finalQuestions = sanitizedQuestions;
    if (targetQuestionCount && sanitizedQuestions.length < targetQuestionCount) {
      console.log(`[AI][modify] AI generated ${sanitizedQuestions.length} questions but target is ${targetQuestionCount}. Filling with placeholder questions.`);
      const needed = targetQuestionCount - sanitizedQuestions.length;
      const placeholders = Array.from({ length: needed }, (_, i) => ({
        id: `q_fill_${i}_${Math.random().toString(36).slice(2, 7)}`,
        type: QuestionType.MULTIPLE_CHOICE,
        pointType: 'NORMAL',
        text: `Additional Question ${sanitizedQuestions.length + i + 1}`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctIndices: [0],
        timeLimit: 20
      }));
      finalQuestions = [...sanitizedQuestions, ...placeholders];
    } else if (targetQuestionCount && sanitizedQuestions.length > targetQuestionCount) {
      console.log(`[AI][modify] AI generated ${sanitizedQuestions.length} questions but target is ${targetQuestionCount}. Trimming to target.`);
      finalQuestions = sanitizedQuestions.slice(0, targetQuestionCount);
    }

    return { ...currentQuiz, ...quizData, title, description, questions: finalQuestions } as Quiz;
  } catch (error) {
    console.error("AI modification failed:", error);
    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED") || error.message.includes("connect")) {
        throw new Error("Cannot connect to Ollama. Make sure Ollama is running at " + OLLAMA_BASE_URL);
      }
      // Re-throw the original error message
      throw error;
    }
    throw new Error("AI failed to modify the quiz.");
  }
}
