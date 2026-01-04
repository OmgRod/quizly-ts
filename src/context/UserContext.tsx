import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, userAPI } from '../api';
import { User } from '../types';

interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.getCurrentUser();
        setUser(response.data.user);
      } catch (error) {
        // Token is invalid or expired
        localStorage.removeItem('authToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authAPI.login(username, password);
    setUser(response.data.user);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
  };

  const register = async (username: string, password: string) => {
    const response = await authAPI.register(username, password);
    setUser(response.data.user);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
  };

  const logout = async () => {
    await authAPI.logout();
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const updateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    try {
      // Send updated user data to server - including all fields that might have changed
      await userAPI.updateProfile({
        username: updatedUser.username,
        xp: updatedUser.xp,
        coins: updatedUser.coins,
        totalPoints: updatedUser.totalPoints,
        profilePicture: updatedUser.profilePicture
      });
    } catch (error) {
      console.error('Failed to update user on server:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
