import React from 'react';
import { Title, Meta } from 'react-head';
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

  return (
    <>
      <Title>Quizly - Home</Title>
      <Meta name="description" content="Welcome to Quizly!" />
      <Home onStart={handleStart} onSolo={handleSolo} onJoin={handleJoin} />
    </>
  );
}

export default HomePage;
