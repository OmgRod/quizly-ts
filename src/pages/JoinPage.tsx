import React from 'react';
import { Helmet } from 'react-helmet-async';
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

  return <>
    <Helmet>
      <title>Enter Game PIN | Quizly</title>
      <meta name="description" content="Enter your game PIN to join a live quiz session on Quizly." />
      <link rel="canonical" href="https://yourdomain.com/join" />
    </Helmet>
    <Join onJoin={handleJoin} onBack={handleBack} />
  </>;
};

export default JoinPage;
