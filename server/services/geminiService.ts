
import { GoogleGenAI, Type } from "@google/genai";
import { Quiz, QuestionType, PointType, Question } from "../../src/types.js";

const modelName = "gemini-3-flash-preview";

export async function generateQuizFromAI(topic: string, count: number = 5, userId: string = 'guest'): Promise<Quiz> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: modelName,
    contents: `Generate a "wild" and highly engaging ${count}-question interactive quiz about: ${topic}. 
    Include various types: 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'INPUT', and 'PUZZLE' (ordering items).
    
    IMPORTANT RULES FOR VARIED QUESTIONS:
    1. For MULTIPLE_CHOICE: Be creative with the number of options. Provide between 2 and 8 options. Do NOT always provide 4.
    2. For TRUE_FALSE: 'options' MUST be exactly ["True", "False"].
    3. For MULTIPLE_CHOICE and TRUE_FALSE: 'correctIndices' MUST NOT BE EMPTY. Select at least one correct index.
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
      questions: validatedQuestions,
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

export async function modifyQuizWithAI(currentQuiz: Quiz, instruction: string, desiredQuestionCount?: number): Promise<Quiz> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
  
  const constraintText = targetQuestionCount ? `\n- TARGET QUESTION COUNT: You MUST generate exactly ${targetQuestionCount} questions. This is a strict requirement.` : '';
  
  // Extract existing question texts for duplicate detection
  const existingQuestions = hasQuestions ? currentQuiz.questions.map(q => q.text || '').filter(t => t.trim()) : [];
  const existingQuestionsText = existingQuestions.length > 0 
    ? `\n\nEXISTING QUESTIONS (DO NOT REPEAT THESE):\n${existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : '';
  
  const response = await ai.models.generateContent({
    model: modelName,
    contents: `${action} a quiz based on this instruction: "${instruction}"
Current Quiz Data: ${JSON.stringify(currentQuiz)}${existingQuestionsText}

Context:
- Current questions: ${currentCount}
- Target questions: ${targetQuestionCount}
- Instruction intent: ${isAddingQuestions ? 'Adding questions' : isChangingDifficulty ? 'Changing difficulty' : isRewriting ? 'Rewriting content' : 'General modification'}

Instructions:
- If the instruction asks to ADD questions, add them to the existing questions (don't replace the whole quiz).
- If the instruction asks to MODIFY questions, update their content/types while maintaining structure.
- If the instruction asks for a REWRITE, you can regenerate all content but keep the general topic.
- Make questions diverse in type: mix MULTIPLE_CHOICE, TRUE_FALSE, INPUT, and PUZZLE types.
- Create engaging, thoughtful questions that test real understanding.
- Each question should have a unique perspective or challenging aspect.
- CRITICAL: The "text" field must contain the ACTUAL QUESTION TEXT (e.g., "What is the capital of France?"), NOT generic labels like "Question 1" or "Question 12".
- DO NOT repeat or duplicate any existing questions. Each question must be completely unique.

Constraints (must obey all):${constraintText}
- Multiple Choice questions can have 3 to 8 options (vary the count!).
- True/False questions MUST have exactly 2 options: ["True", "False"].
- Puzzle questions must have a correctSequence between 3 and 8 items.
- INPUT type questions should have varied correct answers (synonyms, similar expressions). Use INPUT for factual short-answer questions.
- WORD_CLOUD questions are ONLY for asking opinions or brainstorming ideas - NOT for factual questions. Examples: "What words describe happiness?", "Name things you find at a beach". WORD_CLOUD has NO correct answers.
- You MUST pick and supply correct answer(s) for questions that have them (MULTIPLE_CHOICE, TRUE_FALSE, INPUT, PUZZLE). Do NOT add correctTexts to WORD_CLOUD questions.
- Time limits should vary: 15-20s for simple, 25-30s for complex.
- Use varied pointType: NORMAL, DOUBLE (harder), HALF (bonus).

Return the full updated quiz JSON.`,
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
    
    // Validate question text and check for duplicates
    if (quizData.questions && Array.isArray(quizData.questions)) {
      quizData.questions.forEach((q: any, idx: number) => {
        const text = q.text ? String(q.text).trim() : '';
        if (!text || text.toLowerCase().startsWith('question ')) {
          throw new Error(`AI failed to generate proper question text for question ${idx + 1}. Got: "${text || 'empty'}". Please try again with a more specific instruction.`);
        }
      });
    }
    
    // Enforce target question count
    if (targetQuestionCount && quizData.questions) {
      if (quizData.questions.length < targetQuestionCount) {
        throw new Error(`AI generated only ${quizData.questions.length} questions but ${targetQuestionCount} were requested. Please try again.`);
      } else if (quizData.questions.length > targetQuestionCount) {
        quizData.questions = quizData.questions.slice(0, targetQuestionCount);
      }
    }
    
    return { ...currentQuiz, ...quizData } as Quiz;
  } catch (error) {
    console.error("AI modification failed:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("AI failed to modify the quiz.");
  }
}
