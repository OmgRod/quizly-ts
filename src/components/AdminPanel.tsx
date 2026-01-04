import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import api from '../api';
import Card from './ui/Card';
import Button from './ui/Button';
import { Trash2, Edit2, Lock, Unlock, Shield, ShieldOff } from 'lucide-react';

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

export default function AdminPanel() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'quizzes' | 'users'>('quizzes');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch quizzes
  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/quizzes');
      setQuizzes(res.data.quizzes);
      setError('');
    } catch (err) {
      setError('Failed to fetch quizzes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
      setError('');
    } catch (err) {
      setError('Failed to fetch users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'quizzes') {
      fetchQuizzes();
    } else {
      fetchUsers();
    }
  }, [activeTab]);

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
          Quizzes ({quizzes.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-semibold border-b-2 ${
            activeTab === 'users'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Users ({users.length})
        </button>
      </div>

      {/* Quizzes Tab */}
      {activeTab === 'quizzes' && (
        <div>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading quizzes...</div>
          ) : quizzes.length === 0 ? (
            <Card className="text-center py-8 text-gray-500">No quizzes found</Card>
          ) : (
            <div className="space-y-4">
              {quizzes.map(quiz => (
                <Card key={quiz.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{quiz.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{quiz.description || 'No description'}</p>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>By: {quiz.user.username}</span>
                        <span>Genre: {quiz.genre}</span>
                        <span>Visibility: {quiz.visibility}</span>
                        <span>Questions: {quiz.questions.length}</span>
                        <span>Plays: {quiz.playCount}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
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
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        id={`quiz-title-${quiz.id}`}
                      />
                      <textarea
                        placeholder="Description"
                        defaultValue={quiz.description}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        rows={3}
                        id={`quiz-desc-${quiz.id}`}
                      />
                      <select
                        defaultValue={quiz.visibility}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        id={`quiz-visibility-${quiz.id}`}
                      >
                        <option value="PUBLIC">Public</option>
                        <option value="PRIVATE">Private</option>
                        <option value="UNLISTED">Unlisted</option>
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
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading users...</div>
          ) : users.length === 0 ? (
            <Card className="text-center py-8 text-gray-500">No users found</Card>
          ) : (
            <div className="space-y-4">
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
                          defaultValue={u.coins}
                          className="flex-1 px-3 py-2 border rounded-lg"
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
          )}
        </div>
      )}
    </div>
  );
}
