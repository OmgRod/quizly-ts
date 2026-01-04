import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import api from '../api';
import Card from './ui/Card';
import Button from './ui/Button';
import { Trash2, Edit2, Lock, Unlock, Shield, ShieldOff, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { LIMITS } from './QuizCreator';
import ReportsTab from './ReportsTab';

interface Quiz {
  id: string;
  title: string;
  genre: string;
  visibility: string;
  playCount: number;
  user: { id: string; username: string };
  questions: Array<{ id: string }>;
  updatedAt: string;
}

interface User {
  id: string;
  username: string;
  totalPoints: number;
  xp: number;
  coins: number;
  isAdmin: boolean;
  isSuspended: boolean;
  createdAt: string;
  quizCount?: number;
  sessionCount?: number;
}

const ITEMS_PER_PAGE = 10;

export default function AdminPanel() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'quizzes' | 'users' | 'reports'>('quizzes');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [viewingQuizId, setViewingQuizId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination & Search
  const [quizPage, setQuizPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [quizSearchInput, setQuizSearchInput] = useState('');
  const [quizSearchTerm, setQuizSearchTerm] = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  // Fetch quizzes with pagination
  const fetchQuizzes = async (page: number = 1, search: string = '') => {
    setLoading(true);
    try {
      const res = await api.get('/admin/quizzes', {
        params: { page, search }
      });
      setQuizzes(res.data.quizzes);
      setTotalQuizzes(res.data.total || 0);
      setError('');
    } catch (err) {
      setError('Failed to fetch quizzes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users with pagination
  const fetchUsers = async (page: number = 1, search: string = '') => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', {
        params: { page, search }
      });
      setUsers(res.data.users);
      setTotalUsers(res.data.total || 0);
      setError('');
    } catch (err) {
      setError('Failed to fetch users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load quizzes when page or search term changes
  useEffect(() => {
    fetchQuizzes(quizPage, quizSearchTerm);
  }, [quizPage, quizSearchTerm]);

  // Load users when page or search term changes
  useEffect(() => {
    fetchUsers(userPage, userSearchTerm);
  }, [userPage, userSearchTerm]);

  // Handle quiz search - triggered on Enter key
  const handleQuizSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setQuizSearchTerm(quizSearchInput);
      setQuizPage(1);
    }
  };

  // Handle user search - triggered on Enter key
  const handleUserSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setUserSearchTerm(userSearchInput);
      setUserPage(1);
    }
  };

  // Delete quiz
  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    try {
      await api.delete(`/admin/quizzes/${quizId}`);
      setQuizzes(quizzes.filter(q => q.id !== quizId));
      setSuccess('Quiz deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete quiz');
      console.error(err);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user account?')) return;
    if (user?.id === userId) {
      setError('Cannot delete your own account');
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      setSuccess('User deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete user');
      console.error(err);
    }
  };

  // Toggle suspend
  const handleToggleSuspend = async (userId: string, currentState: boolean) => {
    if (user?.id === userId) {
      setError('Cannot suspend your own account');
      return;
    }

    try {
      await api.post(`/admin/users/${userId}/suspend`, { suspend: !currentState });
      setUsers(
        users.map(u =>
          u.id === userId ? { ...u, isSuspended: !currentState } : u
        )
      );
      setSuccess(currentState ? 'User unsuspended' : 'User suspended');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update user suspension');
      console.error(err);
    }
  };

  // Toggle admin
  const handleToggleAdmin = async (userId: string, currentState: boolean) => {
    if (user?.id === userId && currentState) {
      setError('Cannot remove your own admin status');
      return;
    }

    try {
      await api.put(`/admin/users/${userId}`, { isAdmin: !currentState });
      setUsers(
        users.map(u =>
          u.id === userId ? { ...u, isAdmin: !currentState } : u
        )
      );
      setSuccess(currentState ? 'Admin status removed' : 'User promoted to admin');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update admin status');
      console.error(err);
    }
  };

  // Update coins
  const handleUpdateCoins = async (userId: string, newCoins: number) => {
    try {
      await api.put(`/admin/users/${userId}`, { coins: newCoins });
      setUsers(
        users.map(u =>
          u.id === userId ? { ...u, coins: newCoins } : u
        )
      );
      setSuccess('Coins updated');
      setEditingUser(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update coins');
      console.error(err);
    }
  };

  const quizPages = Math.ceil(totalQuizzes / ITEMS_PER_PAGE);
  const userPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-red-50 border-red-200">
          <div className="text-red-800 font-semibold">Access Denied</div>
          <div className="text-red-700 mt-2">You don't have permission to access the admin panel.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-gray-600">Manage quizzes and user accounts</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('quizzes')}
          className={`px-4 py-2 font-semibold border-b-2 ${
            activeTab === 'quizzes'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Quizzes ({totalQuizzes})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-semibold border-b-2 ${
            activeTab === 'users'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Users ({totalUsers})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 font-semibold border-b-2 ${
            activeTab === 'reports'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Reports
        </button>
      </div>

      {/* Quizzes Tab */}
      {activeTab === 'quizzes' && (
        <div>
          {/* Search Bar */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-3 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search quizzes by title or author... (Press Enter)"
              value={quizSearchInput}
              onChange={(e) => setQuizSearchInput(e.target.value)}
              onKeyPress={handleQuizSearch}
              maxLength={100}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading quizzes...</div>
          ) : quizzes.length === 0 ? (
            <Card className="text-center py-8 text-gray-500">
              {quizSearchTerm ? 'No quizzes match your search' : 'No quizzes found'}
            </Card>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {quizzes.map(quiz => (
                  <Card key={quiz.id} className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1 truncate">{quiz.title}</h3>
                        <div className="flex gap-4 text-sm text-gray-500 flex-wrap">
                          <span>By: {quiz.user.username}</span>
                          <span>Genre: {quiz.genre}</span>
                          <span>Visibility: {quiz.visibility}</span>
                          <span>Questions: {quiz.questions.length}</span>
                          <span>Plays: {quiz.playCount}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-nowrap">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => window.open(`/quiz/${quiz.id}`, '_blank')}
                          title="View Quiz"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingQuiz(editingQuiz === quiz.id ? null : quiz.id)}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteQuiz(quiz.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>

                    {/* Edit Quiz Form */}
                    {editingQuiz === quiz.id && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <input
                          type="text"
                          placeholder="Title"
                          defaultValue={quiz.title}
                          maxLength={LIMITS.QUIZ_TITLE}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          id={`quiz-title-${quiz.id}`}
                        />
                        <select
                          defaultValue={quiz.visibility}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                          id={`quiz-visibility-${quiz.id}`}
                        >
                          <option value="PUBLIC" className="bg-slate-900">Public</option>
                          <option value="PRIVATE" className="bg-slate-900">Private</option>
                          <option value="UNLISTED" className="bg-slate-900">Unlisted</option>
                        </select>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setEditingQuiz(null)}>
                            Save Changes
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingQuiz(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Quiz Pagination */}
              {quizPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <span className="text-sm text-gray-600">Page {quizPage} of {quizPages}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setQuizPage(Math.max(1, quizPage - 1))}
                      disabled={quizPage === 1}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setQuizPage(Math.min(quizPages, quizPage + 1))}
                      disabled={quizPage === quizPages}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          {/* Search Bar */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-3 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search users by username... (Press Enter)"
              value={userSearchInput}
              onChange={(e) => setUserSearchInput(e.target.value)}
              onKeyPress={handleUserSearch}
              maxLength={50}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading users...</div>
          ) : users.length === 0 ? (
            <Card className="text-center py-8 text-gray-500">
              {userSearchTerm ? 'No users match your search' : 'No users found'}
            </Card>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {users.map(u => (
                  <Card key={u.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{u.username}</h3>
                          {u.isAdmin && <Shield size={16} className="text-blue-600" />}
                          {u.isSuspended && <Lock size={16} className="text-red-600" />}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-2">
                          <span>Points: {u.totalPoints}</span>
                          <span>XP: {u.xp}</span>
                          <span>Coins: {u.coins}</span>
                          <span>Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <Button
                          size="sm"
                          variant={u.isAdmin ? 'secondary' : 'primary'}
                          onClick={() => handleToggleAdmin(u.id, u.isAdmin)}
                          disabled={user?.id === u.id}
                        >
                          {u.isAdmin ? <ShieldOff size={16} /> : <Shield size={16} />}
                        </Button>
                        <Button
                          size="sm"
                          variant={u.isSuspended ? 'primary' : 'secondary'}
                          onClick={() => handleToggleSuspend(u.id, u.isSuspended)}
                          disabled={user?.id === u.id}
                        >
                          {u.isSuspended ? <Unlock size={16} /> : <Lock size={16} />}
                        </Button>
                        {editingUser !== u.id && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingUser(u.id)}
                          >
                            <Edit2 size={16} />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={user?.id === u.id}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>

                    {/* Edit User Form */}
                    {editingUser === u.id && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <label className="text-sm font-semibold">Coins</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            defaultValue={u.coins}                          min="0"
                          max="999999"                            className="flex-1 px-3 py-2 border rounded-lg"
                            id={`user-coins-${u.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const input = document.getElementById(`user-coins-${u.id}`) as HTMLInputElement;
                              handleUpdateCoins(u.id, parseInt(input.value));
                            }}
                          >
                            Update
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingUser(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* User Pagination */}
              {userPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <span className="text-sm text-gray-600">Page {userPage} of {userPages}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setUserPage(Math.max(1, userPage - 1))}
                      disabled={userPage === 1}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setUserPage(Math.min(userPages, userPage + 1))}
                      disabled={userPage === userPages}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Reports Tab */}
      <ReportsTab isActive={activeTab === 'reports'} />
    </div>
  );
}
