import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import QuizEditor from '../components/QuizEditor';
import { useUser } from '../context/UserContext';
import { quizAPI } from '../api';
import { Quiz, QuizGenre } from '../types';

const EditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useUser();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuiz();
  }, [id]);

  const loadQuiz = async () => {
    // Prefer navigation state to avoid sessionStorage misses
    const navQuiz = (location.state as any)?.quiz as Quiz | undefined;
    if (navQuiz) {
      setQuiz(navQuiz);
      sessionStorage.setItem('tempQuiz', JSON.stringify(navQuiz)); // keep as fallback
      setLoading(false);
      return;
    }

    if (id) {
      // Editing existing quiz
      try {
        const response = await quizAPI.getById(id);
        const loaded = response.data.quiz;
        setQuiz({ ...loaded, visibility: loaded.visibility || 'PUBLIC' });
      } catch (error) {
        console.error('Failed to load quiz:', error);
        navigate('/dashboard');
      }
    } else {
      // Check for temp quiz from AI creator
      const tempQuiz = sessionStorage.getItem('tempQuiz');
      if (tempQuiz) {
        setQuiz(JSON.parse(tempQuiz));
        sessionStorage.removeItem('tempQuiz');
      } else {
        // New quiz
        if (user) {
          setQuiz({
            id: '',
            userId: user.id,
            authorName: user.username,
            title: '',
            description: '',
            genre: 'General' as QuizGenre,
            questions: [],
            visibility: 'DRAFT',
            createdAt: Date.now(),
            playCount: 0
          });
        }
      }
    }
    setLoading(false);
  };

  const handleSave = async (updatedQuiz: Quiz) => {
    if (!user) {
      toast.error('You must be signed in to save quizzes.');
      return;
    }

    // Ensure required fields are present
    const normalized: Quiz = {
      ...updatedQuiz,
      userId: updatedQuiz.userId || user.id,
      authorName: updatedQuiz.authorName || user.username,
      title: updatedQuiz.title?.trim() || 'Untitled Quiz',
      description: updatedQuiz.description || '',
      genre: updatedQuiz.genre || ('General' as QuizGenre),
      visibility: updatedQuiz.visibility || 'DRAFT',
      questions: updatedQuiz.questions || [],
    };

    try {
      if (normalized.id) {
        await quizAPI.update(normalized.id, normalized);
        toast.success('Quiz updated.');
      } else {
        const response = await quizAPI.create(normalized);
        const saved = response.data.quiz || normalized;
        toast.success('Quiz saved.');
        // keep quiz available for follow-up edits
        sessionStorage.setItem('tempQuiz', JSON.stringify(saved));
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to save quiz:', error);
      toast.error('Failed to save quiz. Please try again.');
    }
  };

  const handleStart = async (quiz: Quiz) => {
    try {
      // Editor always tests quizzes in solo mode
      if (!quiz.id) {
        // Save quiz first if it doesn't have an ID
        const response = await quizAPI.create(quiz);
        const savedQuiz = response.data.quiz;
        await quizAPI.incrementPlayCount(savedQuiz.id);
        sessionStorage.setItem('soloQuizId', savedQuiz.id);
        navigate(`/game/solo`);
      } else {
        // Quiz already exists, increment play count and launch solo
        await quizAPI.incrementPlayCount(quiz.id);
        sessionStorage.setItem('soloQuizId', quiz.id);
        navigate(`/game/solo`);
      }
    } catch (error) {
      console.error('Failed to start quiz:', error);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (loading || !quiz || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-white">Loading...</div>
    </div>;
  }

  return (
    <QuizEditor
      quiz={quiz}
      onSave={handleSave}
      onStart={handleStart}
      onBack={handleBack}
    />
  );
};

export default EditorPage;
