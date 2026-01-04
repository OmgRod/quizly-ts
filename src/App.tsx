import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { UserProvider, useUser } from './context/UserContext';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import BrowsePage from './pages/BrowsePage';
import LeaderboardPage from './pages/LeaderboardPage';
import AuthPage from './pages/AuthPage';
import JoinPage from './pages/JoinPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import CreatePage from './pages/CreatePage';
import CreateAIPage from './pages/CreateAIPage';
import EditorPage from './pages/EditorPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import QuizDetailPage from './pages/QuizDetailPage';
import UserProfilePage from './pages/UserProfilePage';
import AdminPage from './pages/AdminPage';
import ErrorPage from './pages/ErrorPage';
import Header from './components/Header';
import Footer from './components/Footer';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import LegalUpdatePopup from './components/LegalUpdatePopup';

// 404 Not Found wrapper
const NotFoundPage: React.FC = () => {
  return <ErrorPage defaultCode="404" defaultMessage="This page doesn't exist" />;
};

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useUser();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-white">Loading...</div>
    </div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
};

// Layout wrapper
const Layout: React.FC<{ children: React.ReactNode; hideHeader?: boolean }> = ({ children, hideHeader }) => {
  const { user, refreshUser } = useUser();
  
  return (
    <div className="min-h-screen relative flex flex-col bg-slate-950">
      {!hideHeader && <Header user={user} />}
      {user && <LegalUpdatePopup user={user} onAccept={refreshUser} />}
      <main className={`flex-1 ${!hideHeader ? "pt-24" : ""}`}>
        {children}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UserProvider>
        <Toaster position="top-center" />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/explore" element={<Layout><ExplorePage /></Layout>} />
          <Route path="/browse" element={<Layout><BrowsePage /></Layout>} />
          <Route path="/auth" element={<Layout><AuthPage /></Layout>} />
          <Route path="/join" element={<Layout><JoinPage /></Layout>} />
          <Route path="/quiz/:id" element={<Layout><QuizDetailPage /></Layout>} />
          <Route path="/user/:id" element={<Layout><UserProfilePage /></Layout>} />
          <Route path="/terms" element={<Layout><TermsOfService /></Layout>} />
          <Route path="/privacy" element={<Layout><PrivacyPolicy /></Layout>} />
          
          {/* Protected routes */}
          <Route path="/leaderboard" element={
            <ProtectedRoute>
              <Layout><LeaderboardPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout><DashboardPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout><SettingsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <Layout><AdminPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/create" element={
            <ProtectedRoute>
              <Layout><CreatePage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/create/ai" element={
            <ProtectedRoute>
              <Layout><CreateAIPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/create/manual" element={
            <ProtectedRoute>
              <Layout><EditorPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/editor" element={
            <ProtectedRoute>
              <Layout><EditorPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/editor/:id" element={
            <ProtectedRoute>
              <Layout><EditorPage /></Layout>
            </ProtectedRoute>
          } />
          
          {/* Error page */}
          <Route path="/error" element={<ErrorPage />} />
          
          {/* Game routes with no header */}
          <Route path="/lobby/:pin" element={<Layout hideHeader><LobbyPage /></Layout>} />
          <Route path="/game/:pin" element={<Layout hideHeader><GamePage /></Layout>} />
          
          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  );
};

export default App;
