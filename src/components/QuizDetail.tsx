import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Quiz, User, QuestionType } from '../types';
import { quizAPI } from '../api';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { getGenreIcon } from '../utils/genre';
import ReportModal from './ReportModal';

// Format question type for display
const formatQuestionType = (type: QuestionType): string => {
  switch (type) {
    case QuestionType.MULTIPLE_CHOICE:
      return 'Multiple Choice';
    case QuestionType.TRUE_FALSE:
      return 'True/False';
    case QuestionType.INPUT:
      return 'Text Input';
    case QuestionType.PUZZLE:
      return 'Puzzle';
    case QuestionType.POLL:
      return 'Poll (Opinion)';
    case QuestionType.WORD_CLOUD:
      return 'Word Cloud';
    case QuestionType.AUDIO_QUIZ:
      return 'Audio Quiz';
    case QuestionType.IMAGE_QUIZ:
      return 'Image Quiz';
    default:
      return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
};

interface QuizDetailProps {
  onStartQuiz: (quiz: Quiz, solo?: boolean) => void;
  user: User | null;
}

const QuizDetail: React.FC<QuizDetailProps> = ({ onStartQuiz, user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const handleError = useErrorHandler();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const toggleQuestion = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  useEffect(() => {
    const loadQuiz = async () => {
      if (!id) return;
      try {
        const response = await quizAPI.getById(id);
        setQuiz(response.data.quiz);
      } catch (error: any) {
        console.error('Failed to load quiz:', error);
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          errorHandler.handleError(404, 'Quiz not found');
        } else {
          errorHandler.handleError(500, 'Failed to load quiz');
        }
      } finally {
        setLoading(false);
      }
    };
    const { handleError } = useErrorHandler();
    loadQuiz();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-3 sm:px-4">
        <div className="glass p-6 sm:p-8 rounded-2xl sm:rounded-3xl">
          <div className="animate-pulse text-white font-black">Loading...</div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center px-3 sm:px-4">
        <div className="glass p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-center space-y-3">
          <div className="text-2xl sm:text-3xl text-white font-black">Quiz not found</div>
          <button
            onClick={() => navigate('/explore')}
            className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
          >
            Back to explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 sm:mb-8 text-slate-400 hover:text-white font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
      >
        <i className="bi bi-arrow-left"></i> Back
      </button>

      <div className="glass p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl md:rounded-[3rem] border-white/10 space-y-6 sm:space-y-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 sm:gap-6 md:gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-3 sm:px-4 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-blue-500/20 mb-3 sm:mb-4">
              {quiz.genre}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3 sm:mb-4 tracking-tight">{quiz.title}</h1>
            <p className="text-slate-400 text-sm sm:text-base md:text-lg font-medium leading-relaxed">{quiz.description}</p>
          </div>
          <div className="w-20 sm:w-24 h-20 sm:h-24 bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-400 flex-shrink-0 text-2xl sm:text-3xl">
            <i className={`bi ${getGenreIcon(quiz.genre)} text-4xl`}></i>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/5 text-center">
            <div className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase mb-1 sm:mb-2">Questions</div>
            <div className="text-2xl sm:text-3xl font-black text-white">{quiz.questions?.length || 0}</div>
          </div>
          <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/5 text-center">
            <div className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase mb-1 sm:mb-2">Plays</div>
            <div className="text-2xl sm:text-3xl font-black text-white">{(quiz.playCount || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/5 text-center">
            <div className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase mb-1 sm:mb-2">Creator</div>
            <button 
              onClick={() => navigate(`/user/${quiz.userId}`)}
              className="text-sm sm:text-xl font-black text-white truncate hover:text-blue-400 transition-colors"
            >
              {quiz.authorName}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={() => onStartQuiz(quiz, false)}
            className="flex-1 bg-white text-slate-950 py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black text-sm sm:text-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-2 sm:gap-4"
          >
            <i className="bi bi-play-fill\"></i> Start Multiplayer
          </button>
          <button
            onClick={() => onStartQuiz(quiz, true)}
            className="flex-1 glass border-white/10 text-white py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black text-sm sm:text-xl uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-4"
          >
            <i className="bi bi-person-fill\"></i> Play Solo
          </button>
        </div>

        {user?.id === quiz.userId && (
          <button
            onClick={() => navigate(`/editor/${quiz.id}`)}
            className="w-full glass border-white/10 text-slate-400 hover:text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 sm:gap-3"
          >
            <i className="bi bi-pencil-fill\"></i> Edit Quiz
          </button>
        )}

        {user?.id !== quiz.userId && (
          <button
            onClick={() => setReportModalOpen(true)}
            className="w-full glass border-white/10 text-slate-400 hover:text-amber-400 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2 sm:gap-3"
          >
            <i className="bi bi-flag-fill"></i> Report Quiz
          </button>
        )}
      </div>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetType="quiz"
        targetId={quiz.id}
        targetName={quiz.title}
      />

      <div className="mt-6 sm:mt-8 glass p-6 sm:p-8 rounded-2xl sm:rounded-3xl md:rounded-[3rem] border-white/10">
        <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6 uppercase tracking-tight">Questions Preview</h2>
        <div className="space-y-3 sm:space-y-4">
          {quiz.questions?.map((q, idx) => (
            <div key={idx} className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-8 sm:w-10 h-8 sm:h-10 bg-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center text-blue-400 font-black flex-shrink-0 text-sm sm:text-base">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-lg font-black text-white mb-2">{q.text}</h3>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                      {formatQuestionType(q.type)}
                    </div>
                    {(q.options || q.correctSequence || q.correctTexts) && (
                      <button
                        onClick={() => toggleQuestion(idx)}
                        className="text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-1"
                      >
                        {expandedQuestions.has(idx) ? (
                          <>
                            <i className="bi bi-chevron-up"></i> Hide
                          </>
                        ) : (
                          <>
                            <i className="bi bi-chevron-down"></i> Show Options
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  {expandedQuestions.has(idx) && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                      {q.type === QuestionType.PUZZLE && q.correctSequence && (
                        <div>
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Correct Order:</div>
                          <div className="space-y-2">
                            {q.correctSequence.map((item, i) => (
                              <div key={i} className="bg-white/5 px-3 py-2 rounded-lg text-sm text-white flex items-center gap-2">
                                <span className="text-blue-400 font-black">{i + 1}.</span> {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {q.type === QuestionType.INPUT && q.correctTexts && (
                        <div>
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Correct Answers:</div>
                          <div className="space-y-2">
                            {q.correctTexts.map((text, i) => (
                              <div key={i} className="bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg text-sm text-green-400">
                                {text}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {(q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.TRUE_FALSE) && q.options && (
                        <div>
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Options:</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {q.options.map((option, i) => {
                              const isCorrect = q.correctIndices?.includes(i);
                              return (
                                <div 
                                  key={i} 
                                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                                    isCorrect 
                                      ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                                      : 'bg-white/5 text-white'
                                  }`}
                                >
                                  {isCorrect && <i className="bi bi-check-circle-fill"></i>}
                                  {option}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizDetail;
