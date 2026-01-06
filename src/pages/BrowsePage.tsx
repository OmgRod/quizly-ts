import React from 'react';

import { useNavigate } from 'react-router-dom';
import Browse from '../components/Browse';
import { quizAPI, gameAPI } from '../api';
import { Quiz } from '../types';
import { useUser } from '../context/UserContext';

const BrowsePage: React.FC = () => {
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
          return;
        }
        if (quiz.visibility === 'DRAFT') {
          alert('Draft quizzes cannot be hosted.');
          return;
        }
        if (quiz.visibility === 'PRIVATE' && quiz.userId !== user.id) {
          alert('Only the creator can host a private quiz.');
          return;
        }
        await quizAPI.incrementPlayCount(quiz.id);
        const response = await gameAPI.create(quiz.id);
        const pin = response.data.pin;
        navigate(`/lobby/${pin}`);
      }
    } catch (error: any) {
      console.error('Failed to start quiz:', error);
      if (error.response?.data?.details) {
        alert(error.response.data.details);
      } else {
        alert('Failed to start quiz. Please try again.');
      }
    }
  };

  return (
    <>
      <Title>Quizly - Browse</Title>
      <Meta name="description" content="Browse quizzes and users on Quizly!" />
      <Browse onStartQuiz={handleStartQuiz} />
    </>
  );
}

export default BrowsePage;
