import React from 'react';
import { useNavigate } from 'react-router-dom';
import QuizCreator from '../components/QuizCreator';
import { useUser } from '../context/UserContext';
import { Quiz } from '../types';

const CreateAIPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  const handleQuizCreated = (quiz: Quiz) => {
    // AI output is not persisted; strip ID so editor saves as new
    const draftQuiz: Quiz = {
      ...quiz,
      id: '',
      userId: user!.id,
      authorName: user!.username,
      playCount: 0,
      visibility: 'DRAFT',
      createdAt: Date.now()
    };
    sessionStorage.setItem('tempQuiz', JSON.stringify(draftQuiz));
    navigate('/editor', { state: { quiz: draftQuiz } });
  };

  const handleBack = () => {
    navigate('/create');
  };

  if (!user) return null;

  return (
    <QuizCreator
      onQuizCreated={handleQuizCreated}
      onBack={handleBack}
      isSolo={false}
      userId={user.id}
      authorName={user.username}
    />
  );
};

export default CreateAIPage;
