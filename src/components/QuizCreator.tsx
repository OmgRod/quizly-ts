import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { quizAPI } from '../api';
import { Quiz, QuizGenre } from '../types';
import ProgressBar from './ProgressBar';
import { parseQuizFile } from '../utils/quizImportExport';

// Character limits
export const LIMITS = {
  QUIZ_TITLE: 100,
  QUIZ_DESCRIPTION: 500,
  QUESTION_TEXT: 300,
  ANSWER_OPTION: 150,
  CORRECT_ANSWER: 150
};

interface QuizCreatorProps {
  onQuizCreated: (quiz: Quiz) => void;
  onBack: () => void;
  isSolo: boolean;
  userId?: string;
  authorName?: string;
}

const statusMessages = [
  { p: 0, m: "Starting..." },
  { p: 15, m: "Reading topic: " },
  { p: 30, m: "Creating questions..." },
  { p: 50, m: "Adding answer options..." },
  { p: 70, m: "Finalizing quiz..." },
  { p: 90, m: "Almost done..." },
];

const allGenres: QuizGenre[] = [
  'General', 'Science', 'History', 'Technology', 'Pop Culture', 
  'Literature', 'Music', 'Movies', 'Sports', 'Geography', 
  'Art', 'Food & Drink', 'Nature', 'Mythology', 'Politics', 
  'Business', 'Gaming'
];

const QuizCreator: React.FC<QuizCreatorProps> = ({ onQuizCreated, onBack, isSolo, userId, authorName }) => {
  const [topic, setTopic] = useState("");
  const [genre, setGenre] = useState<QuizGenre>('General');
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  
  const progressInterval = useRef<number | null>(null);
  const progressStart = useRef<number>(0);
  const progressDuration = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      const baseMs = 7000; // base wait time
      const perQuestionMs = 450; // additional wait per question
      // Slowdown scales with question count; at 5 questions it's 2.5x slower, then a bit slower per extra question
      const baseSlowFactor = 2.5;
      const extraSlowPerQuestion = 0.08; // 8% slower per question above 5
      const slowdown = baseSlowFactor * (1 + extraSlowPerQuestion * Math.max(0, questionCount - 5));
      progressStart.current = Date.now();
      progressDuration.current = (baseMs + questionCount * perQuestionMs) * slowdown;

      // Visual tick pacing also scales with question count (more questions = smaller steps + slower ticks)
      const stepBase = 1.2; // faster visual increment
      const stepScale = Math.max(0.2, Math.min(1, 5 / questionCount)); // keeps scaling with question count
      const maxStep = stepBase * stepScale;
      const intervalMs = Math.max(70, (180 + Math.min(400, Math.max(0, questionCount - 5) * 30)) / 3); // roughly 3x faster cadence with a floor

      progressInterval.current = window.setInterval(() => {
        const elapsed = Date.now() - progressStart.current;
        const ratio = Math.min(1, elapsed / progressDuration.current);
        const target = Math.min(96, ratio * 96);
        setProgress(prev => {
          if (target <= prev) return prev;
          const next = Math.min(target, prev + maxStep);
          return next;
        });
      }, intervalMs);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [loading]);

  useEffect(() => {
    const currentMsg = statusMessages.slice().reverse().find(s => progress >= s.p);
    if (currentMsg) {
      setStatus(currentMsg.p === 15 ? `${currentMsg.m} "${topic}"` : currentMsg.m);
    }
  }, [progress, topic]);

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const response = await quizAPI.generateFromAI(topic, questionCount, userId);
      const quiz = response.data.quiz;
      
      // Quiz is ready! Immediately complete the progress bar
      if (progressInterval.current) clearInterval(progressInterval.current);
      setProgress(100);
      setStatus("Quiz ready!");
      
      // Short animation delay before showing the quiz
      setTimeout(() => {
        onQuizCreated({ 
          ...quiz, 
          genre, 
          authorName: authorName || 'AI Core',
          playCount: 0 
        });
        setLoading(false);
      }, 400);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "AI is currently unavailable. Please try again.";
      toast.error(errorMessage);
      setLoading(false);
      setProgress(0);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (!file.name.endsWith('.json')) {
      toast.error('Please select a valid JSON file');
      return;
    }

    try {
      const { quiz, error } = await parseQuizFile(file);
      
      if (error) {
        toast.error(`Import failed: ${error}`);
        return;
      }

      if (quiz) {
        // Pre-fill the form with the imported quiz data
        setTopic(quiz.title);
        setGenre(quiz.genre);
        setQuestionCount(quiz.questions.length);
        
        // Show the quiz creation summary before calling onQuizCreated
        toast.success(`Loaded "${quiz.title}" with ${quiz.questions.length} questions!`);
        
        // After a short delay, show the quiz as if it was created
        setTimeout(() => {
          onQuizCreated({
            ...quiz,
            authorName: authorName || quiz.authorName || 'Imported',
            userId: userId || quiz.userId,
            playCount: 0,
            createdAt: Date.now(),
          });
        }, 600);
      }
    } catch (err) {
      toast.error('Failed to import quiz file');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-3 sm:px-4 md:px-6">
      <div className="glass p-4 sm:p-6 md:p-12 rounded-2xl sm:rounded-3xl md:rounded-[4rem] shadow-2xl w-full max-w-2xl border-white/10 text-white animate-in zoom-in duration-500 relative overflow-hidden">
        {!loading && (
          <button onClick={onBack} className="absolute top-4 sm:top-6 md:top-8 right-4 sm:right-6 md:right-8 text-slate-500 hover:text-white transition-colors z-10">
            <i className="bi bi-x-lg text-lg sm:text-xl"></i>
          </button>
        )}

        {loading ? (
          <div className="py-8 sm:py-10 md:py-12 space-y-8 sm:space-y-10 md:space-y-12 animate-in fade-in duration-500">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="relative w-24 sm:w-28 md:w-32 h-24 sm:h-28 md:h-32 mx-auto">
                 <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-20"></div>
                 <div className="absolute inset-4 bg-indigo-500/30 rounded-full animate-pulse"></div>
                 <div className="absolute inset-0 flex items-center justify-center text-4xl text-blue-400">
                   <i className="bi bi-cpu animate-spin duration-[3000ms]"></i>
                 </div>
              </div>
              <h2 className="text-4xl font-black tracking-tighter uppercase">Creating Quiz</h2>
            </div>

            <div className="space-y-4">
              <ProgressBar progress={progress} status={status} />
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-10 space-y-4">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-4xl text-indigo-400 mx-auto border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
                <i className="bi bi-cpu-fill"></i>
              </div>
              <h2 className="text-4xl font-black tracking-tighter uppercase">Create Quiz</h2>
              <p className="text-slate-500 font-medium">Enter a topic for your quiz.</p>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Topic</label>
                 <input 
                   type="text" 
                   placeholder="e.g., Quantum Physics, 80s Movie Trivia..." 
                   value={topic}
                   onChange={(e) => setTopic(e.target.value)}
                   disabled={loading}
                   maxLength={100}
                   className="w-full bg-white/5 border border-white/5 p-6 rounded-2xl text-xl font-bold focus:outline-none focus:border-blue-500/50 transition-all placeholder:opacity-20"
                   autoFocus
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Number of Questions ({questionCount})</label>
                   <div className="bg-white/5 border border-white/5 p-5 rounded-2xl flex items-center gap-4">
                      <input 
                        type="range"
                        min="1"
                        max="10"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                        className="flex-1 accent-blue-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                      />
                      <span className="w-10 text-center font-black text-blue-400 text-lg">{questionCount}</span>
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
                   <select 
                      value={genre}
                      onChange={(e) => setGenre(e.target.value as QuizGenre)}
                      className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-black text-xs uppercase tracking-widest focus:outline-none focus:border-blue-500/50 cursor-pointer text-white transition-all"
                   >
                      {allGenres.map(g => (
                        <option key={g} value={g} className="bg-slate-900">{g}</option>
                      ))}
                   </select>
                </div>
              </div>
              
              <button 
                onClick={handleGenerate}
                disabled={loading || !topic}
                className="w-full bg-white text-slate-900 font-black py-6 rounded-3xl text-2xl transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
              >
                <i className="bi bi-lightning-charge-fill text-blue-600"></i>
                Generate Quiz
              </button>
              
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <i className="bi bi-exclamation-triangle text-yellow-500 text-lg flex-shrink-0 mt-0.5"></i>
                  <p className="text-yellow-500/90 text-xs font-medium leading-relaxed">
                    AI-generated content may contain errors or inaccuracies. Please review and edit questions before publishing.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
  </div>
  );
};

export default QuizCreator;
