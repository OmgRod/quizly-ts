import { Quiz, QuestionType, PointType, Question } from "../types";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

async function callOllama(prompt: string, systemPrompt?: string): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      system: systemPrompt,
      stream: false,
      format: 'json'
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data: OllamaResponse = await response.json();
  return data.response;
}

export async function generateQuizFromAI(topic: string, count: number = 5, userId: string = 'guest'): Promise<Quiz> {
  const systemPrompt = `You are a quiz generation AI. You MUST respond with valid JSON only, no other text. Follow the schema exactly.`;
  
  const prompt = `Generate a "wild" and highly engaging ${count}-question interactive quiz about: ${topic}. 
Include various types: 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'INPUT', and 'PUZZLE' (ordering items).

IMPORTANT RULES FOR VARIED QUESTIONS:
1. For MULTIPLE_CHOICE: Be creative with the number of options. Provide between 2 and 8 options. Do NOT always provide 4.
2. For TRUE_FALSE: 'options' MUST be exactly ["True", "False"].
3. For MULTIPLE_CHOICE and TRUE_FALSE: 'correctIndices' MUST NOT BE EMPTY. Select at least one correct index.
4. For PUZZLE: provide 'correctSequence' as an array of 3 to 8 strings in the correct order.
5. For INPUT: provide 'correctTexts' as an array of 1-3 possible correct string answers.
6. Assign 'pointType': 'NORMAL', 'HALF', or 'DOUBLE'.
7. All questions MUST have a 'text', 'type', 'pointType', and 'timeLimit' (usually 20 or 30).

Make the questions challenging, witty, and varied. All questions must have complete options and correct structure.

Response JSON Schema:
{
  "title": "string - The title of the quiz",
  "description": "string - A brief description of the quiz",
  "questions": [
    {
      "id": "string - unique identifier",
      "type": "string - MULTIPLE_CHOICE, TRUE_FALSE, INPUT, or PUZZLE",
      "pointType": "string - NORMAL, HALF, DOUBLE, or NONE",
      "text": "string - The question text",
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
    
    // Validate and Fix data integrity while allowing "wild" variety
    const validatedQuestions = (quizData.questions || []).map((q: any) => {
      const type = q.type as QuestionType;
      
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

      // Fix Puzzle
      if (type === QuestionType.PUZZLE && (!q.correctSequence || q.correctSequence.length < 3)) {
        q.correctSequence = q.correctSequence?.length >= 2 ? q.correctSequence : ["Step 1", "Step 2", "Step 3"];
      }

      // Fix Input
      if (type === QuestionType.INPUT && (!q.correctTexts || q.correctTexts.length === 0)) {
        q.correctTexts = ["correct answer"];
      }

      return q;
    });

    // Ollama bug: sometimes returns one more than requested
    let questions = validatedQuestions;
    if (questions.length > count) {
      questions = questions.slice(0, count);
    }
    // Always return exactly 'count' questions (pad if needed)
    if (questions.length < count) {
      while (questions.length < count) {
        questions.push({
          id: Math.random().toString(36).substr(2, 9),
          type: QuestionType.MULTIPLE_CHOICE,
          pointType: PointType.NORMAL,
          text: "(Extra placeholder question)",
          options: ["Option A", "Option B"],
          correctIndices: [0],
          timeLimit: 20
        });
      }
    }
    return {
      ...quizData,
      questions,
      id: Math.random().toString(36).substr(2, 9),
      userId,
      createdAt: Date.now(),
      playCount: 0
    } as Quiz;
  } catch (error) {
    console.error("Failed to generate/parse AI response", error);
    if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
      throw new Error("Cannot connect to Ollama. Make sure Ollama is running at " + OLLAMA_BASE_URL);
    }
    throw new Error("Failed to create quiz. AI service might be busy.");
  }
}

export async function modifyQuizWithAI(currentQuiz: Quiz, instruction: string): Promise<Quiz> {
  const systemPrompt = `You are a quiz modification AI. You MUST respond with valid JSON only, no other text. Follow the schema exactly.`;
  
  const prompt = `Modify the following quiz based on this instruction: "${instruction}".
Current Quiz Data: ${JSON.stringify(currentQuiz)}

Constraints:
- Maintain valid question structures.
- Multiple Choice questions can have 2 to 8 options.
- True/False questions MUST have exactly 2 options: ["True", "False"].
- Puzzle questions must have a correctSequence between 3 and 8 items.

Return the full updated quiz JSON strictly following the same schema as the input.
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
    return { ...currentQuiz, ...quizData } as Quiz;
  } catch (error) {
    console.error("AI modification failed:", error);
    if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
      throw new Error("Cannot connect to Ollama. Make sure Ollama is running at " + OLLAMA_BASE_URL);
    }
    throw new Error("AI failed to modify the quiz.");
  }
}
