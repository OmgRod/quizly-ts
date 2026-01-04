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
    <Dashboard
      user={user}
      onEditQuiz={handleEditQuiz}
      onPlayQuiz={handlePlayQuiz}
      onNewQuiz={handleNewQuiz}
      onSettings={handleSettings}
    />
  );
};

export default DashboardPage;
