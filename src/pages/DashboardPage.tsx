import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import { useUser } from '../context/UserContext';
import { userAPI, gameAPI, quizAPI } from '../api';
import { Quiz } from '../types';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.ceil(quizzes.length / pageSize);
  const paginatedQuizzes = quizzes.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (user) {
      loadUserQuizzes();
    }
  }, [user]);

  const loadUserQuizzes = async () => {
    if (!user) return;
    try {
      const response = await userAPI.getQuizzes(user.id);
      setQuizzes(response.data.quizzes);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    }
  };

  const handleEditQuiz = (quiz: Quiz) => {
    navigate(`/editor/${quiz.id}`);
  };

  const handlePlayQuiz = async (quiz: Quiz) => {
    try {
      // Draft quizzes can only be played solo
      if (quiz.visibility === 'DRAFT') {
        await quizAPI.incrementPlayCount(quiz.id);
        sessionStorage.setItem('soloQuizId', quiz.id);
        navigate(`/game/solo`);
        return;
      }

      if (quiz.visibility === 'PRIVATE' && quiz.userId !== user?.id) {
        alert('Only the creator can host a private quiz.');
        return;
      }

      const response = await gameAPI.create(quiz.id);
      const pin = response.data.pin;
      navigate(`/lobby/${pin}`);
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  };

  const handleNewQuiz = () => {
    navigate('/editor');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  if (!user) return null;

  return (
    <>
      <Dashboard
        user={user}
        quizzes={paginatedQuizzes}
        setQuizzes={setQuizzes}
        onEditQuiz={handleEditQuiz}
        onPlayQuiz={handlePlayQuiz}
        onNewQuiz={handleNewQuiz}
        onSettings={handleSettings}
      />
      <div className="flex justify-center mt-6 gap-2">
        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded bg-slate-700 text-white disabled:opacity-50">Prev</button>
        <span className="px-3 py-1 font-bold text-slate-400">Page {page} of {totalPages}</span>
        <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded bg-slate-700 text-white disabled:opacity-50">Next</button>
      </div>
    </>
  );
};

export default DashboardPage;
