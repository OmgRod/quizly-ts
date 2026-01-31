import React from 'react';

import { useNavigate } from 'react-router-dom';
import QuizDetail from '../components/QuizDetail';
import { useUser } from '../context/UserContext';
import { Quiz } from '../types';
import { quizAPI, gameAPI } from '../api';

const QuizDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  const handleStartQuiz = async (quiz: Quiz, solo?: boolean) => {
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

  // For SEO, ideally fetch quiz title/desc here, but fallback to generic
  return (
    <>
      <QuizDetail onStartQuiz={handleStartQuiz} user={user} />
    </>
  );
}

export default QuizDetailPage;
