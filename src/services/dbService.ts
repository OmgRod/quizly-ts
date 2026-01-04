
import { User, Quiz, QuizGenre, Question } from '../types';
import { socket } from './socketService';
import bcrypt from 'bcryptjs';

interface GameSession {
  pin: string;
  quizId: string;
  hostId: string;
  createdAt: number;
}

class PrismaClient {
  private STORAGE_KEY = 'quizly_sqlite_data';

  private getData() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      const initial = {
        users: [] as User[],
        quizzes: [] as Quiz[],
        sessions: [] as GameSession[]
      };
      if (!data) return initial;
      const parsed = JSON.parse(data);
      if (!parsed.sessions) parsed.sessions = [];
      if (!parsed.quizzes) parsed.quizzes = [];
      if (!parsed.users) parsed.users = [];
      return parsed;
    } catch (e) {
      console.warn("Storage access denied. Persistent data will not be available.", e);
      return { users: [], quizzes: [], sessions: [] };
    }
  }

  private saveData(data: any) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage access denied. Data will not be saved.", e);
    }
  }

  user = {
    findUnique: async (params: { where: { username?: string; id?: string } }): Promise<User | null> => {
      const db = this.getData();
      if (params.where.username) {
        return db.users.find((u: User) => u.username.toLowerCase() === params.where.username!.toLowerCase()) || null;
      }
      if (params.where.id) {
        return db.users.find((u: User) => u.id === params.where.id) || null;
      }
      return null;
    },
    create: async (params: { data: Partial<User> }): Promise<User> => {
      const db = this.getData();
      const password = params.data.password ? bcrypt.hashSync(params.data.password, 10) : undefined;
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        username: params.data.username!,
        totalPoints: 0,
        xp: 0,
        coins: 100,
        ...params.data,
        password: password
      };
      db.users.push(newUser);
      this.saveData(db);
      return newUser;
    },
    update: async (params: { where: { id: string }, data: any }): Promise<User> => {
      const db = this.getData();
      const index = db.users.findIndex((u: User) => u.id === params.where.id);
      if (index === -1) throw new Error("User not found");
      
      const updated = { ...db.users[index] };
      if (params.data.totalPoints?.increment) updated.totalPoints += params.data.totalPoints.increment;
      if (params.data.xp?.increment) updated.xp += params.data.xp.increment;
      if (params.data.coins?.increment) updated.coins += params.data.coins.increment;
      
      if (params.data.username) updated.username = params.data.username;
      if (params.data.password) {
        updated.password = bcrypt.hashSync(params.data.password, 10);
      }
      
      db.users[index] = updated;
      this.saveData(db);
      return updated;
    },
    delete: async (params: { where: { id: string } }) => {
      const db = this.getData();
      db.users = db.users.filter((u: User) => u.id !== params.where.id);
      db.quizzes = db.quizzes.filter((q: Quiz) => q.userId !== params.where.id);
      this.saveData(db);
    }
  };

  quiz = {
    findMany: async (params?: { where?: { genre?: string; userId?: string; title?: { contains: string } }, include?: { questions: boolean } }): Promise<Quiz[]> => {
      const db = this.getData();
      let res = db.quizzes;
      if (params?.where?.genre && params.where.genre !== 'All') {
        res = res.filter((q: any) => q.genre === params.where!.genre);
      }
      if (params?.where?.userId) {
        res = res.filter((q: any) => q.userId === params.where!.userId);
      }
      if (params?.where?.title?.contains) {
        const search = params.where.title.contains.toLowerCase();
        res = res.filter((q: any) => q.title.toLowerCase().includes(search));
      }
      return res;
    },
    // Enhanced create to act as an upsert and prevent duplicates
    create: async (params: { data: any }): Promise<Quiz> => {
      const db = this.getData();
      const { id, questions, ...quizData } = params.data;
      
      const finalId = id || Math.random().toString(36).substr(2, 9);
      const existingIndex = db.quizzes.findIndex((q: Quiz) => q.id === finalId);
      
      const newQuestions = Array.isArray(questions) ? questions : (questions?.create || questions?.set || []);

      if (existingIndex !== -1) {
        // Update existing instead of creating duplicate
        const updatedQuiz = {
          ...db.quizzes[existingIndex],
          ...quizData,
          questions: newQuestions
        };
        db.quizzes[existingIndex] = updatedQuiz;
        this.saveData(db);
        return updatedQuiz;
      }

      const newQuiz: Quiz = {
        id: finalId,
        playCount: 0,
        createdAt: Date.now(),
        ...quizData,
        questions: newQuestions
      };
      
      db.quizzes.push(newQuiz);
      this.saveData(db);
      return newQuiz;
    },
    update: async (params: { where: { id: string }, data: any }) => {
      const db = this.getData();
      const index = db.quizzes.findIndex((q: any) => q.id === params.where.id);
      if (index !== -1) {
        const existing = db.quizzes[index];
        const { playCount, questions, ...updates } = params.data;
        
        if (playCount?.increment) {
          existing.playCount += playCount.increment;
        } else {
          const finalQuestions = Array.isArray(questions) 
            ? questions 
            : (questions?.set || existing.questions);
            
          db.quizzes[index] = { 
            ...existing, 
            ...updates, 
            questions: finalQuestions 
          };
        }
        this.saveData(db);
        return db.quizzes[index];
      } else {
        // If not found, try to create it (handles AI quizzes or manual ones with pre-set IDs)
        return this.quiz.create(params);
      }
    },
    delete: async (params: { where: { id: string } }) => {
      const db = this.getData();
      db.quizzes = db.quizzes.filter((q: any) => q.id !== params.where.id);
      this.saveData(db);
    }
  };

  session = {
    create: async (pin: string, quizId: string, hostId: string): Promise<GameSession> => {
      const db = this.getData();
      const newSession: GameSession = {
        pin,
        quizId,
        hostId,
        createdAt: Date.now()
      };
      db.sessions = db.sessions.filter((s: GameSession) => s.pin !== pin);
      db.sessions.push(newSession);
      this.saveData(db);
      return newSession;
    },
    findUnique: async (pin: string): Promise<GameSession | null> => {
      const db = this.getData();
      const now = Date.now();
      const validSessions = db.sessions.filter((s: GameSession) => (now - s.createdAt) < 4 * 60 * 60 * 1000);
      if (validSessions.length !== db.sessions.length) {
        db.sessions = validSessions;
        this.saveData(db);
      }
      return db.sessions.find((s: GameSession) => s.pin === pin) || null;
    },
    delete: async (pin: string) => {
      const db = this.getData();
      db.sessions = db.sessions.filter((s: GameSession) => s.pin !== pin);
      this.saveData(db);
    }
  };

  async updateStats(userId: string, points: number, xp: number, coins: number): Promise<User> {
    return this.user.update({
      where: { id: userId },
      data: {
        totalPoints: { increment: points },
        xp: { increment: xp },
        coins: { increment: coins }
      }
    });
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compareSync(password, hash);
  }
}

export const prisma = new PrismaClient();
