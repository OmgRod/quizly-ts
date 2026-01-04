import { Quiz, QuizGenre } from '../types';

export const downloadQuiz = (quiz: Quiz): void => {
  const jsonString = JSON.stringify(quiz, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${quiz.title.replace(/\s+/g, '_')}_${quiz.id}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const validateQuizJSON = (data: any): { valid: boolean; quiz?: Quiz; error?: string } => {
  try {
    // Check if data is an object
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid file format: not a valid JSON object' };
    }

    // Check required fields
    const requiredFields = ['title', 'questions', 'genre'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    // Validate title
    if (typeof data.title !== 'string' || data.title.trim().length === 0) {
      return { valid: false, error: 'Title must be a non-empty string' };
    }

    // Validate genre
    const validGenres: QuizGenre[] = [
      'General', 'Science', 'History', 'Technology', 'Pop Culture',
      'Literature', 'Music', 'Movies', 'Sports', 'Geography',
      'Art', 'Food & Drink', 'Nature', 'Mythology', 'Politics',
      'Business', 'Gaming', 'All'
    ];
    if (!validGenres.includes(data.genre)) {
      return { valid: false, error: `Invalid genre: ${data.genre}` };
    }

    // Validate questions
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      return { valid: false, error: 'Questions must be a non-empty array' };
    }

    if (data.questions.length < 1) {
      return { valid: false, error: 'Quiz must have at least 1 question' };
    }

    if (data.questions.length > 25) {
      return { valid: false, error: 'Quiz cannot have more than 25 questions' };
    }

    // Validate each question
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      
      if (!q || typeof q !== 'object') {
        return { valid: false, error: `Question ${i + 1}: Invalid question object` };
      }

      // Accept both 'question' and 'text' field names
      const questionText = q.question || q.text;
      if (typeof questionText !== 'string' || questionText.trim().length === 0) {
        return { valid: false, error: `Question ${i + 1}: Question text is required` };
      }

      // Question types that require options
      const typesRequiringOptions = ['MULTIPLE_CHOICE', 'TRUE_FALSE'];
      
      // Only validate strict options for types that explicitly require them
      if (typesRequiringOptions.includes(q.type)) {
        if (!Array.isArray(q.options)) {
          return { valid: false, error: `Question ${i + 1}: Options must be an array` };
        }

        if (q.options.length < 2) {
          return { valid: false, error: `Question ${i + 1}: Must have at least 2 answer options` };
        }

        // Relaxed limit for imported quizzes - allow up to 10 options
        if (q.options.length > 10) {
          return { valid: false, error: `Question ${i + 1}: Cannot have more than 10 options` };
        }

        for (let j = 0; j < q.options.length; j++) {
          if (typeof q.options[j] !== 'string' || q.options[j].trim().length === 0) {
            return { valid: false, error: `Question ${i + 1}: Option ${j + 1} is empty` };
          }
        }
      } else if (Array.isArray(q.options) && q.options.length > 0) {
        // If options exist for any type, just validate their format without strict counting
        for (let j = 0; j < q.options.length; j++) {
          if (typeof q.options[j] !== 'string') {
            q.options[j] = String(q.options[j]);
          }
        }
      }

      // For PUZZLE type, check correctSequence instead of correctAnswer/correctIndices
      if (q.type === 'PUZZLE') {
        if (!Array.isArray(q.correctSequence) || q.correctSequence.length === 0) {
          return { valid: false, error: `Question ${i + 1}: Puzzle must have a correct sequence` };
        }
      } else if (q.type === 'POLL') {
        // POLL questions are opinion-based and don't require correct answers
        // If they have options, validate option format but not count
        if (Array.isArray(q.options)) {
          for (let j = 0; j < q.options.length; j++) {
            if (typeof q.options[j] !== 'string') {
              q.options[j] = String(q.options[j]);
            }
          }
        }
      } else if (q.type === 'WORD_CLOUD' || q.type === 'OPEN_ENDED') {
        // These types typically don't have correct answers
        // No validation needed
      } else if (typesRequiringOptions.includes(q.type)) {
        // For other types that need options, check for correct answer
        // Support both correctAnswer (single) and correctIndices (multiple)
        const hasCorrectAnswer = q.correctAnswer !== undefined && q.correctAnswer !== null;
        const hasCorrectIndices = Array.isArray(q.correctIndices) && q.correctIndices.length > 0;
        
        if (!hasCorrectAnswer && !hasCorrectIndices) {
          // If no correct answer specified, that's okay for imported quizzes - be lenient
          // return { valid: false, error: `Question ${i + 1}: Must have a correct answer or correct indices` };
        }

        // Validate correctAnswer if present
        if (hasCorrectAnswer && (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length)) {
          return { valid: false, error: `Question ${i + 1}: Invalid correct answer index` };
        }

        // Validate correctIndices if present
        if (hasCorrectIndices) {
          for (const idx of q.correctIndices) {
            if (typeof idx !== 'number' || idx < 0 || idx >= q.options.length) {
              return { valid: false, error: `Question ${i + 1}: Invalid index in correct answers` };
            }
          }
        }
      } else if (q.type === 'INPUT') {
        // INPUT type should have correctTexts
        if (!Array.isArray(q.correctTexts) || q.correctTexts.length === 0) {
          return { valid: false, error: `Question ${i + 1}: INPUT type must have correct text answers` };
        }
      }

      // Validate question type
      const allValidTypes = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'PUZZLE', 'POLL', 'INPUT', 'WORD_CLOUD', 'OPEN_ENDED', 'AUDIO_QUIZ', 'IMAGE_QUIZ', 'SLIDER', 'SCALE', 'FLASHCARD', 'MATCHING'];
      if (q.type && !allValidTypes.includes(q.type)) {
        return { valid: false, error: `Question ${i + 1}: Invalid question type: ${q.type}` };
      }
    }

    // Optional fields validation
    if (data.description && typeof data.description !== 'string') {
      return { valid: false, error: 'Description must be a string' };
    }

    if (data.visibility && !['PUBLIC', 'PRIVATE', 'DRAFT'].includes(data.visibility)) {
      return { valid: false, error: 'Invalid visibility setting' };
    }

    return { valid: true, quiz: data as Quiz };
  } catch (e) {
    return { valid: false, error: `Failed to parse JSON: ${e instanceof Error ? e.message : 'Unknown error'}` };
  }
};

// Normalize quiz data to match the expected interface
const normalizeQuiz = (quiz: any): Quiz => {
  return {
    ...quiz,
    questions: quiz.questions.map((q: any) => ({
      id: q.id || `q_${Math.random()}`,
      type: q.type,
      pointType: q.pointType || 'NORMAL',
      text: q.text || q.question,
      question: q.text || q.question, // Support both field names
      options: q.options || [],
      correctIndices: q.correctIndices || (q.correctAnswer !== undefined ? [q.correctAnswer] : []),
      correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : q.correctIndices?.[0],
      correctTexts: q.correctTexts,
      correctSequence: q.correctSequence,
      correctValue: q.correctValue,
      minValue: q.minValue,
      maxValue: q.maxValue,
      stepValue: q.stepValue,
      imageUrl: q.imageUrl,
      audioUrl: q.audioUrl,
      correctRegions: q.correctRegions,
      targetLatLng: q.targetLatLng,
      isCaseSensitive: q.isCaseSensitive || false,
      timeLimit: q.timeLimit || 30,
    }))
  };
};

export const parseQuizFile = async (file: File): Promise<{ quiz?: Quiz; error?: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        const validation = validateQuizJSON(data);
        
        if (validation.valid && validation.quiz) {
          const normalizedQuiz = normalizeQuiz(validation.quiz);
          resolve({ quiz: normalizedQuiz });
        } else {
          resolve({ error: validation.error || 'Unknown validation error' });
        }
      } catch (err) {
        resolve({ error: `Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}` });
      }
    };

    reader.onerror = () => {
      resolve({ error: 'Failed to read file' });
    };

    reader.readAsText(file);
  });
};
