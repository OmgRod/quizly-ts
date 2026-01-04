
export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  INPUT = 'INPUT',
  PUZZLE = 'PUZZLE',
  POLL = 'POLL',
  WORD_CLOUD = 'WORD_CLOUD',
  OPEN_ENDED = 'OPEN_ENDED',
  AUDIO_QUIZ = 'AUDIO_QUIZ',
  IMAGE_QUIZ = 'IMAGE_QUIZ',
  PIN_ANSWER = 'PIN_ANSWER',
  SLIDER = 'SLIDER',
  FLASHCARD = 'FLASHCARD',
  SCALE = 'SCALE',
  DROP_PIN = 'DROP_PIN'
}

export enum PointType {
  NORMAL = 'NORMAL',
  HALF = 'HALF',
  DOUBLE = 'DOUBLE',
  NONE = 'NONE'
}

export type QuizGenre = 
  | 'All' 
  | 'Science' 
  | 'History' 
  | 'Technology' 
  | 'Pop Culture' 
  | 'General'
  | 'Literature'
  | 'Music'
  | 'Movies'
  | 'Sports'
  | 'Geography'
  | 'Art'
  | 'Food & Drink'
  | 'Nature'
  | 'Mythology'
  | 'Politics'
  | 'Business'
  | 'Gaming';

export interface Question {
  id: string;
  type: QuestionType;
  pointType: PointType;
  text: string;
  options: string[];
  correctIndices?: number[];
  correctTexts?: string[];
  // Specialized fields
  correctSequence?: string[]; // For PUZZLE
  correctValue?: number;     // For SLIDER
  minValue?: number;         // For SLIDER/SCALE
  maxValue?: number;         // For SLIDER/SCALE
  stepValue?: number;
  imageUrl?: string;         // For IMAGE_QUIZ / PIN_ANSWER / DROP_PIN
  audioUrl?: string;         // For AUDIO_QUIZ
  correctRegions?: { x: number, y: number, radius: number }[]; // For PIN_ANSWER
  targetLatLng?: { lat: number, lng: number }; // For DROP_PIN
  isCaseSensitive?: boolean;
  timeLimit: number;
}

export interface Quiz {
  id: string;
  userId: string;
  authorName: string;
  authorProfilePicture?: string;
  title: string;
  genre: QuizGenre;
  description: string;
  questions: Question[];
  visibility?: 'DRAFT' | 'PRIVATE' | 'PUBLIC';
  createdAt: number;
  playCount: number;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  totalPoints: number;
  xp: number;
  coins: number;
  profilePicture?: string;
  profileVisibility?: boolean;
  showQuizStats?: boolean;
  anonymousMode?: boolean;
  isAdmin?: boolean;
  isSuspended?: boolean;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  lastAnswerCorrect: boolean;
  streak: number;
  isBot: boolean;
  userId?: string;
  isHost?: boolean;
  connected?: boolean;
  socketId?: string;
  anonymousMode?: boolean;
}

export enum GameState {
  HOME,
  BROWSE,
  AUTH,
  CREATING,
  EDITOR,
  LOBBY,
  QUESTION_INTRO,
  QUESTION_ACTIVE,
  ANSWER_REVEAL,
  LEADERBOARD,
  PODIUM,
  DASHBOARD,
  JOINING,
  SETTINGS
}

export type NetworkRole = 'HOST' | 'CLIENT' | 'SOLO';

/**
 * Leveling Utilities
 * Formula: XP required for level L is 1000 * ((1.5^(L-1) - 1) / 0.5)
 */
export const getLevelFromXP = (xp: number): number => {
  if (xp < 1000) return 1;
  // Inverse of the geometric sum formula
  return Math.floor(1 + Math.log(xp / 2000 + 1) / Math.log(1.5));
};

export const getXPForLevel = (level: number): number => {
  if (level <= 1) return 0;
  return Math.floor(2000 * (Math.pow(1.5, level - 1) - 1));
};

export const getLevelProgress = (xp: number): { level: number, progress: number, currentXP: number, nextXP: number } => {
  const level = getLevelFromXP(xp);
  const currentThreshold = getXPForLevel(level);
  const nextThreshold = getXPForLevel(level + 1);
  const progress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return { 
    level, 
    progress: Math.min(100, Math.max(0, progress)), 
    currentXP: xp - currentThreshold, 
    nextXP: nextThreshold - currentThreshold 
  };
};

/**
 * Get player rank based on accuracy percentage
 * @param accuracy - Percentage of correct answers (0-100)
 * @returns Rank title: Novice, Intermediate, Expert, or Master
 */
export const getRankFromAccuracy = (accuracy: number): string => {
  if (accuracy >= 90) return 'Master';
  if (accuracy >= 67) return 'Expert';
  if (accuracy >= 34) return 'Intermediate';
  return 'Novice';
};
