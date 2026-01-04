import toast from 'react-hot-toast';

import React, { useState } from 'react';
import { User, GameState } from '../types';
import { userAPI, quizAPI } from '../api';
import { generateAvatarUrl } from '../utils/avatar';
import { parseQuizFile } from '../utils/quizImportExport';

interface AccountSettingsProps {
  user: User;
  onUpdate: (user: User) => void;
  onDelete: () => void;
  onBack: () => void;
  onLogout: () => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onUpdate, onDelete, onBack, onLogout }) => {
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState(user.password || "");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [profilePicture, setProfilePicture] = useState(user.profilePicture || generateAvatarUrl(user.username));
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState(user.profileVisibility ?? true);
  const [showQuizStats, setShowQuizStats] = useState(user.showQuizStats ?? true);
  const [anonymousMode, setAnonymousMode] = useState(user.anonymousMode ?? false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });


  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate username format before sending to server
    if (username && !/^[a-zA-Z0-9]{3,32}$/.test(username)) {
      toast.error("Username must be alphanumeric only and between 3-32 characters");
      setLoading(false);
      return;
    }

    // Validate password confirmation if password is being changed
    if (password && password !== confirmNewPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }
    
    const updateData: any = { 
      username, 
      password,
      profileVisibility,
      showQuizStats,
      anonymousMode
    };

    // Only include profilePicture if it was actually changed
    const originalPicture = user.profilePicture || generateAvatarUrl(user.username);
    if (profilePicture !== originalPicture) {
      updateData.profilePicture = profilePicture;
    }

    try {
      await onUpdate(updateData);
      toast.success("Account updated successfully");
      setPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update account");
    } finally {
      setLoading(false);
    }
  };


  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        e.target.value = '';
        return;
      }

      // Check file size (limit to 2MB for better performance)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        toast.error(`Image must be smaller than 2MB. Your image is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const dataUrl = event.target?.result as string;
          
          // Create an image element to check dimensions
          const img = new Image();
          img.onload = () => {
            const maxDimension = 2048;
            const minDimension = 100;
            
            // Check if image is too small
            if (img.width < minDimension || img.height < minDimension) {
              toast.error(`Image is too small. Minimum size is ${minDimension}x${minDimension}px`);
              e.target.value = '';
              return;
            }
            
            // Check if image needs resizing
            if (img.width > maxDimension || img.height > maxDimension) {
              // Create canvas to resize image
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                toast.error('Failed to process image');
                return;
              }
              
              // Calculate new dimensions (maintain aspect ratio)
              let width = img.width;
              let height = img.height;
              
              if (width > height) {
                if (width > maxDimension) {
                  height = (height * maxDimension) / width;
                  width = maxDimension;
                }
              } else {
                if (height > maxDimension) {
                  width = (width * maxDimension) / height;
                  height = maxDimension;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              
              // Draw resized image
              ctx.drawImage(img, 0, 0, width, height);
              
              // Convert to data URL with quality adjustment
              const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
              
              // Check if resized image is still too large
              const resizedSize = resizedDataUrl.length * 0.75; // Approximate size in bytes
              if (resizedSize > maxSize) {
                toast.error('Image is too large even after compression. Please use a smaller image.');
                e.target.value = '';
                return;
              }
              
              setProfilePicture(resizedDataUrl);
              toast.success(`Image resized from ${img.width}x${img.height} to ${Math.round(width)}x${Math.round(height)}`);
            } else {
              // Image is within acceptable dimensions
              setProfilePicture(dataUrl);
              toast.success('Profile picture uploaded successfully');
            }
          };
          
          img.onerror = () => {
            toast.error('Failed to load image');
            e.target.value = '';
          };
          
          img.src = dataUrl;
        } catch (err) {
          console.error('File processing error:', err);
          toast.error('Failed to read image file');
          e.target.value = '';
        }
      };
      reader.onerror = () => {
        console.error('FileReader error');
        toast.error('Failed to read image file');
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload handler error:', err);
      toast.error('Failed to process image');
      e.target.value = '';
    }
  };

  const handlePurge = async () => {
    setLoading(true);
    try {
      setShowDeleteModal(false);
      toast.success('Account deleted successfully. Redirecting...');
      // Small delay to show the toast before redirect
      setTimeout(() => {
        onDelete();
      }, 500);
    } catch (error) {
      toast.error('Failed to delete account');
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setBulkUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    let successCount = 0;
    let failedCount = 0;
    const failedFiles: string[] = [];

    // Get all existing quizzes to check for duplicates
    let existingQuizzes: any[] = [];
    try {
      const response = await quizAPI.getAll({ userId: user.id });
      existingQuizzes = response.data?.quizzes || [];
    } catch (err) {
      console.warn('Could not fetch existing quizzes for duplicate check:', err);
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await parseQuizFile(file);
        if (result.error) {
          failedCount++;
          failedFiles.push(`${file.name}: ${result.error}`);
          console.error(`Failed to import ${file.name}:`, result.error);
        } else if (result.quiz) {
          try {
            // Check if a quiz with this name already exists
            const isDuplicate = existingQuizzes.some((q: any) => q.title === result.quiz!.title);
            
            if (isDuplicate) {
              failedCount++;
              failedFiles.push(`${file.name}: Quiz with name "${result.quiz.title}" already exists`);
              console.log(`Skipped ${file.name}: Quiz with name "${result.quiz.title}" already exists`);
            } else {
              // Send only essential fields - server auto-generates createdAt, playCount, id, userId
              const cleanQuiz = {
                title: result.quiz.title,
                genre: result.quiz.genre,
                description: result.quiz.description,
                visibility: result.quiz.visibility || 'DRAFT',
                questions: result.quiz.questions
              };
              await quizAPI.create(cleanQuiz);
              successCount++;
              existingQuizzes.push(result.quiz); // Add to list for subsequent checks
            }
          } catch (err: any) {
            failedCount++;
            const errMsg = err.response?.data?.error || err.message || 'Failed to save quiz';
            failedFiles.push(`${file.name}: ${errMsg}`);
            console.error(`Failed to save ${file.name}:`, err);
          }
        }
      } catch (err) {
        failedCount++;
        failedFiles.push(`${file.name}: Failed to read file`);
        console.error(`Failed to read ${file.name}:`, err);
      }
      setUploadProgress({ current: i + 1, total: files.length });
    }

    setBulkUploading(false);
    setUploadProgress({ current: 0, total: 0 });

    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} quiz${successCount !== 1 ? 'zes' : ''}`);
    }

    if (failedCount > 0) {
      const failureMessage = failedFiles.length > 5 
        ? `${failedCount} quizzes failed or skipped (check console for details)`
        : failedFiles.join('\n');
      toast.error(failureMessage);
      console.log('Failed files:', failedFiles);
    }

    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,#1e1b4b_0%,#020617_60%)]"></div>
      
      <div className="max-w-3xl mx-auto px-8 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
      <div className="mb-12 flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Account Settings</h2>
          <p className="text-slate-500 font-medium">Modify your account information.</p>
        </div>
        <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors">
          <i className="bi bi-x-lg text-2xl"></i>
        </button>
      </div>

      <div className="space-y-8">
        {/* Core Settings */}
        <div className="glass p-10 rounded-[3rem] border-white/10">
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Username</label>
              <div className="relative group">
                <i className="bi bi-person absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400"></i>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 p-5 pl-14 rounded-2xl text-white font-bold text-lg focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
              <p className="text-slate-500 text-xs font-medium">Alphanumeric characters only, 3-32 characters</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Profile Picture</label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <img 
                    src={profilePicture}
                    alt="Profile"
                    className="w-24 h-24 rounded-2xl object-contain border-2 border-blue-500/30 bg-white/5"
                  />
                  {profilePicture !== (user.profilePicture || generateAvatarUrl(user.username)) && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <i className="bi bi-check-lg text-white text-xs"></i>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <label className="flex items-center justify-center w-full px-6 py-4 bg-white/5 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:bg-white/10 hover:border-blue-500/50 transition-all group">
                    <div className="text-center">
                      <i className="bi bi-cloud-upload text-2xl text-slate-500 group-hover:text-blue-400 mb-2 block"></i>
                      <span className="text-xs font-bold text-slate-500 group-hover:text-white uppercase tracking-widest">Upload Image</span>
                      <p className="text-[10px] text-slate-600 mt-1">Max 2MB • Min 100x100px</p>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    Square images work best.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <i className="bi bi-key absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400"></i>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 p-5 pl-14 rounded-2xl text-white font-bold text-lg focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            {password && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative group">
                  <i className="bi bi-check-circle absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400"></i>
                  <input 
                    type="password" 
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className={`w-full bg-white/5 border p-5 pl-14 rounded-2xl text-white font-bold text-lg focus:outline-none transition-all ${
                      confirmNewPassword && password === confirmNewPassword 
                        ? 'border-emerald-500/50 focus:border-emerald-500/50' 
                        : confirmNewPassword && password !== confirmNewPassword
                        ? 'border-rose-500/50 focus:border-rose-500/50'
                        : 'border-white/5 focus:border-blue-500/50'
                    }`}
                  />
                </div>
                {confirmNewPassword && password !== confirmNewPassword && (
                  <p className="text-rose-500 text-xs font-medium">Passwords do not match</p>
                )}
                {confirmNewPassword && password === confirmNewPassword && (
                  <p className="text-emerald-500 text-xs font-medium">Passwords match</p>
                )}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl text-xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-30"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Bulk Quiz Upload */}
        <div className="glass p-10 rounded-[3rem] border-white/10">
          <div className="flex items-center gap-4 text-white mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <i className="bi bi-cloud-upload text-2xl"></i>
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tighter text-lg">Bulk Import Quizzes</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Upload multiple quiz JSON files at once.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-slate-500 text-sm font-medium">Select multiple JSON quiz files to import them all at once. Each file will be validated and added to your quiz library.</p>
            
            <label className="flex items-center justify-center w-full px-6 py-8 bg-white/5 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:bg-white/10 hover:border-blue-500/50 transition-all group">
              <div className="text-center">
                <i className="bi bi-file-earmark-arrow-up text-3xl text-slate-500 group-hover:text-blue-400 mb-3 block"></i>
                <span className="text-sm font-bold text-white uppercase tracking-widest block">Select JSON Files</span>
                <span className="text-xs text-slate-500 mt-2">or drag and drop</span>
              </div>
              <input 
                type="file" 
                multiple
                accept=".json"
                onChange={handleBulkUpload}
                disabled={bulkUploading}
                className="hidden"
              />
            </label>

            {bulkUploading && (
              <div className="bg-white/5 border border-blue-500/30 rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Uploading quizzes...</span>
                  <span className="text-xs text-slate-500">{uploadProgress.current}/{uploadProgress.total}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="glass p-10 rounded-[3rem] border-white/5 bg-white/5 space-y-4">
          <div className="flex items-center gap-4 text-white">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <i className="bi bi-power text-2xl"></i>
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tighter text-lg">Log Out</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Sign out of your account.</p>
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">Logging out will end your current session. Your progress will remain saved.</p>
          <button 
            onClick={onLogout}
            className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all w-full md:w-auto"
          >
            Log Out
          </button>
        </div>

        {/* Privacy Settings */}
        <div className="glass p-10 rounded-[3rem] border-white/10">
          <div className="flex items-center gap-4 text-white mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <i className="bi bi-shield-lock text-2xl"></i>
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tighter text-lg">Privacy Settings</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Control your visibility.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
              <div>
                <h4 className="font-black text-white text-sm uppercase tracking-widest mb-1">Profile Visibility</h4>
                <p className="text-slate-500 text-xs font-medium">Allow others to view your profile and stats</p>
              </div>
              <button
                onClick={async () => {
                  const newValue = !profileVisibility;
                  setProfileVisibility(newValue);
                  try {
                    const response = await userAPI.updateProfile({ profileVisibility: newValue });
                    onUpdate(response.data.user);
                                      toast.success(`Profile visibility ${newValue ? 'enabled' : 'disabled'}`);
                  } catch (err) {
                    console.error('Failed to update privacy setting:', err);
                    setProfileVisibility(!newValue);
                                      toast.error('Failed to update privacy setting');
                  }
                }}
                className={`relative inline-flex items-center h-7 w-14 rounded-full transition-colors overflow-hidden ${
                  profileVisibility ? 'bg-blue-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    profileVisibility ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
              <div>
                <h4 className="font-black text-white text-sm uppercase tracking-widest mb-1">Show Quiz Stats</h4>
                <p className="text-slate-500 text-xs font-medium">Display your quiz creation count publicly</p>
              </div>
              <button
                onClick={async () => {
                  const newValue = !showQuizStats;
                  setShowQuizStats(newValue);
                  try {
                    const response = await userAPI.updateProfile({ showQuizStats: newValue });
                                        toast.success(`Quiz stats ${newValue ? 'shown' : 'hidden'}`);
                    onUpdate(response.data.user);
                  } catch (err) {
                    console.error('Failed to update privacy setting:', err);
                    setShowQuizStats(!newValue);
                                      toast.error('Failed to update privacy setting');
                  }
                }}
                className={`relative inline-flex items-center h-7 w-14 rounded-full transition-colors overflow-hidden ${
                  showQuizStats ? 'bg-blue-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    showQuizStats ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
              <div>
                <h4 className="font-black text-white text-sm uppercase tracking-widest mb-1">Anonymous Mode</h4>
                <p className="text-slate-500 text-xs font-medium">Hide your username from leaderboards</p>
              </div>
              <button
                onClick={async () => {
                  const newValue = !anonymousMode;
                  setAnonymousMode(newValue);
                  try {
                    const response = await userAPI.updateProfile({ anonymousMode: newValue });
                                        toast.success(`Anonymous mode ${newValue ? 'enabled' : 'disabled'}`);
                    onUpdate(response.data.user);
                  } catch (err) {
                    console.error('Failed to update privacy setting:', err);
                    setAnonymousMode(!newValue);
                                      toast.error('Failed to update privacy setting');
                  }
                }}
                className={`relative inline-flex items-center h-7 w-14 rounded-full transition-colors overflow-hidden ${
                  anonymousMode ? 'bg-blue-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    anonymousMode ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass p-10 rounded-[3rem] border-rose-500/10 bg-rose-500/5 space-y-4">
          <div className="flex items-center gap-4 text-rose-500">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <i className="bi bi-exclamation-octagon text-2xl"></i>
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tighter text-lg">Danger Zone</h3>
              <p className="text-xs text-rose-500/60 font-bold uppercase tracking-widest">Permanent destructive actions.</p>
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">Deleting your account will permanently remove your scores, stats, and all quizzes.</p>
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="text-rose-500 font-black text-xs uppercase tracking-[0.2em] hover:text-rose-400 transition-all pt-2 block"
          >
            Delete Account →
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300"></div>
          <div className="glass p-12 rounded-[3.5rem] border-rose-500/20 w-full max-w-md relative z-10 animate-in zoom-in duration-300 text-center space-y-8">
            <div className="w-24 h-24 bg-rose-500/10 rounded-[2rem] flex items-center justify-center text-rose-500 text-5xl mx-auto mb-4 animate-bounce">
              <i className="bi bi-trash3-fill"></i>
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">Confirm Deletion?</h3>
              <p className="text-slate-500 text-sm font-medium">This action cannot be undone. All quizzes and progress will be permanently deleted.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handlePurge}
                disabled={loading}
                className="bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-rose-600/20 active:scale-95"
              >
                {loading ? "Deleting..." : "Yes, Delete"}
              </button>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="bg-white/5 text-slate-400 font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:text-white transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AccountSettings;
