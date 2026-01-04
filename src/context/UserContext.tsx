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
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to restore session on app load
    const restoreSession = async () => {
      try {
        // Attempt to fetch current user from session
        // If session is valid, this succeeds. If not, it throws 401
        const response = await authAPI.getCurrentUser();
        setUser(response.data.user);
      } catch (error) {
        // No valid session - user is not authenticated
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (username: string, password: string) => {
    // Login creates an httpOnly session cookie automatically
    const response = await authAPI.login(username, password);
    setUser(response.data.user);
    // No JWT token storage needed - session is handled by the browser
  };

  const register = async (username: string, password: string) => {
    // Register creates an httpOnly session cookie automatically
    const response = await authAPI.register(username, password);
    setUser(response.data.user);
    // No JWT token storage needed - session is handled by the browser
  };

  const logout = async () => {
    // Logout destroys the session on the server
    await authAPI.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    // Refresh user data from current session
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data.user);
    } catch (error) {
      // Session invalid
      setUser(null);
      throw error;
    }
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
    <UserContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshUser }}>
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
