import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import Home from '../components/Home';
import { useUser } from '../context/UserContext';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  const handleStart = () => {
    if (user) {
      navigate('/explore');
    } else {
      navigate('/auth');
    }
  };

  const handleSolo = () => {
    navigate('/explore');
  };

  const handleJoin = (name: string) => {
    sessionStorage.setItem('guestName', name);
    navigate('/join');
  };

  return <>
    <Helmet>
      <title>Quizly - The Future of Learning</title>
      <meta name="description" content="AI-powered knowledge exploration and quiz platform. Create, play, and share quizzes on any topic!" />
      <link rel="canonical" href="https://yourdomain.com/" />
    </Helmet>
    <Home user={user} onStart={handleStart} onSolo={handleSolo} onJoin={handleJoin} />
  </>;
};

export default HomePage;
