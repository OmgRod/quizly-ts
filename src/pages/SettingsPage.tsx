import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AccountSettings from '../components/AccountSettings';
import { useUser } from '../context/UserContext';
import { userAPI } from '../api';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useUser();
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (data: any) => {
    try {
      setError(null);
      const response = await userAPI.updateProfile(data);
      await updateUser(response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
      throw err;
    }
  };

  const handleDelete = async () => {
    try {
      await userAPI.deleteAccount();
      await logout();
      navigate('/auth');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete account');
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <AccountSettings
      user={user}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onBack={handleBack}
      onLogout={handleLogout}
    />
  );
};

export default SettingsPage;
