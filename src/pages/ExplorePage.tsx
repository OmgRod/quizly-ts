import React, { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import Explore from '../components/Explore';
import { quizAPI, gameAPI } from '../api';
import { Quiz } from '../types';
import { useUser } from '../context/UserContext';

const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const response = await quizAPI.getAll();
      setQuizzes(response.data.quizzes);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    }
  };

  const handleStartQuiz = async (quiz: Quiz, solo: boolean) => {
    try {
      if (solo) {
        // Increment play count
        await quizAPI.incrementPlayCount(quiz.id);
        // Store quiz ID for solo mode
        sessionStorage.setItem('soloQuizId', quiz.id);
        // Navigate directly to game (no lobby)
        navigate(`/game/solo`);
      } else {
        // Create multiplayer session
        if (!user) {
          navigate('/auth');
          alert('Only the creator can host a private quiz.');
          return;
        }
        await quizAPI.incrementPlayCount(quiz.id);
        const response = await gameAPI.create(quiz.id);
        navigate(`/lobby/${response.data.session.pin}`);
      }
    } catch (error) {
      console.error('Failed to start quiz:', error);
    }
  };

  const handleStartAI = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate('/create/ai');
  };

  const handleManualCreate = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate('/create/manual');
  };

  return (
    <>
      <Explore
        onStartQuiz={handleStartQuiz}
        onStartAI={handleStartAI}
        onManualCreate={handleManualCreate}
      />
    </>
  );
};

export default ExplorePage;
