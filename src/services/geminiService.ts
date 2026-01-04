
import { GoogleGenAI, Type } from "@google/genai";
import { Quiz, QuestionType, PointType, Question } from "../types";

const modelName = "gemini-3-flash-preview";

export async function generateQuizFromAI(topic: string, count: number = 5, userId: string = 'guest'): Promise<Quiz> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: modelName,
    contents: `Generate a "wild" and highly engaging ${count}-question interactive quiz about: ${topic}. 
    Include various types: 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'INPUT', and 'PUZZLE' (ordering items).
    
    IMPORTANT RULES FOR VARIED QUESTIONS:
    1. For MULTIPLE_CHOICE: Be creative with the number of options. Provide between 2 and 8 options. Do NOT always provide 4. You CAN have multiple correct answers (e.g., [0, 2] for indices 0 and 2).
    2. For TRUE_FALSE: 'options' MUST be exactly ["True", "False"].
    3. For MULTIPLE_CHOICE and TRUE_FALSE: 'correctIndices' MUST NOT BE EMPTY. Select at least one correct index. MULTIPLE_CHOICE can have 1 or more correct answers.
    4. For PUZZLE: provide 'correctSequence' as an array of 3 to 8 strings in the correct order.
    5. For INPUT: provide 'correctTexts' as an array of 1-3 possible correct string answers.
    6. Assign 'pointType': 'NORMAL', 'HALF', or 'DOUBLE'.
    7. All questions MUST have a 'text', 'type', 'pointType', and 'timeLimit' (usually 20 or 30).
    
    Make the questions challenging, witty, and varied. All questions must have complete options and correct structure.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "The title of the quiz" },
          description: { type: Type.STRING, description: "A brief description of the quiz" },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { 
                  type: Type.STRING, 
                  description: "Type: MULTIPLE_CHOICE, TRUE_FALSE, INPUT, PUZZLE" 
                },
                pointType: { 
                  type: Type.STRING, 
                  description: "Weight: NORMAL, HALF, DOUBLE, NONE" 
                },
                text: { type: Type.STRING, description: "The question text" },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "2-8 items for MULTIPLE_CHOICE, exactly 2 for TRUE_FALSE"
                },
                correctIndices: { 
                  type: Type.ARRAY, 
                  items: { type: Type.INTEGER },
                  description: "Indices of correct options (0-based)."
                },
                correctSequence: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "3-8 items in correct order for PUZZLE type."
                },
                correctTexts: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Valid answers for INPUT type."
                },
                timeLimit: { type: Type.INTEGER, description: "Time in seconds (e.g. 20)" },
              },
              required: ["id", "text", "type", "pointType", "timeLimit"]
            }
          }
        },
        required: ["title", "description", "questions"]
      }
    }
  });

  try {
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    const quizData = JSON.parse(text);
    
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
        } else {
          // Ensure all indices are valid and unique
          q.correctIndices = [...new Set(q.correctIndices.filter((i: number) => i >= 0 && i < q.options.length))];
          if (q.correctIndices.length === 0) {
            q.correctIndices = [0];
          }
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

    return {
      ...quizData,
      questions: validatedQuestions.slice(0, count),
      id: Math.random().toString(36).substr(2, 9),
      userId,
      createdAt: Date.now(),
      playCount: 0
    } as Quiz;
  } catch (error) {
    console.error("Failed to generate/parse AI response", error);
    if (error instanceof Error && error.message.includes("401")) {
      throw new Error("API authentication failed. Please select a valid API key.");
    }
    throw new Error("Failed to create quiz. AI service might be busy.");
  }
}

export async function modifyQuizWithAI(currentQuiz: Quiz, instruction: string): Promise<Quiz> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: modelName,
    contents: `Modify the following quiz based on this instruction: "${instruction}".
    Current Quiz Data: ${JSON.stringify(currentQuiz)}
    
    Constraints:
    - Maintain valid question structures.
    - Multiple Choice questions can have 2 to 8 options.
    - True/False questions MUST have exactly 2 options: ["True", "False"].
    - Puzzle questions must have a correctSequence between 3 and 8 items.
    
    Return the full updated quiz JSON strictly following the schema.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING },
                pointType: { type: Type.STRING },
                text: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                correctSequence: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctTexts: { type: Type.ARRAY, items: { type: Type.STRING } },
                timeLimit: { type: Type.INTEGER },
              },
              required: ["id", "text", "type", "pointType", "timeLimit"]
            }
          }
        },
        required: ["title", "description", "questions"]
      }
    }
  });

  try {
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    const quizData = JSON.parse(text);
    return { ...currentQuiz, ...quizData } as Quiz;
  } catch (error) {
    console.error("AI modification failed:", error);
    throw new Error("AI failed to modify the quiz.");
  }
}
