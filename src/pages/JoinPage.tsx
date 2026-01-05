import React from 'react';
import { Title, Meta } from 'react-head';
import { useNavigate } from 'react-router-dom';
import Join from '../components/Join';
import { gameAPI } from '../api';
import { useErrorHandler } from '../hooks/useErrorHandler';

const JoinPage: React.FC = () => {
  const navigate = useNavigate();
  const handleError = useErrorHandler();

  const handleJoin = async (pin: string): Promise<boolean> => {
    // Store guest name and navigate to lobby
    // Socket connection in LobbyPage will handle the actual join validation
    const guestName = sessionStorage.getItem('guestName') || 'Guest';
    navigate(`/lobby/${pin}`);
    return true;
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <>
      <Title>Quizly - Join Game</Title>
      <Meta name="description" content="Join a Quizly game!" />
      <Join onJoin={handleJoin} onBack={handleBack} />
    </>
  );
}

export default JoinPage;
