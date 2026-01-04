import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Auth from '../components/Auth';
import { useUser } from '../context/UserContext';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register } = useUser();
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (username: string, password: string, isRegister: boolean) => {
    try {
      setError(null);
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Authentication failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return <Auth onAuth={handleAuth} onBack={handleBack} error={error} />;
};

export default AuthPage;
