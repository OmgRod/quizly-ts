
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
