import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { parseQuizFile } from '../utils/quizImportExport';
import toast from 'react-hot-toast';

const CreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (!file.name.endsWith('.json')) {
      toast.error('Please select a valid JSON file');
      return;
    }

    try {
      const { quiz, error } = await parseQuizFile(file);
      
      if (error) {
        toast.error(`Import failed: ${error}`);
        return;
      }

      if (quiz) {
        toast.success(`Loaded "${quiz.title}"! Redirecting to editor...`);
        // Navigate to editor with the imported quiz
        setTimeout(() => {
          navigate('/create/manual', { state: { quiz } });
        }, 600);
      }
    } catch (err) {
      toast.error('Failed to import quiz file');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="max-w-6xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-black text-white tracking-tighter uppercase">
            Create Quiz
          </h1>
          <p className="text-slate-500 text-lg font-medium">
            Choose your creation method
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* AI Creation */}
          <button
            onClick={() => navigate('/create/ai')}
            className="glass p-10 rounded-[2.5rem] border-white/10 hover:border-purple-500/30 transition-all duration-300 ease-out group active:scale-95 hover:shadow-2xl hover:shadow-purple-500/20"
          >
            <div className="space-y-6">
              <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center text-4xl text-purple-400 mx-auto shadow-2xl shadow-purple-500/20 group-hover:scale-110 transition-all duration-300 ease-out">
                <i className="bi bi-stars"></i>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">
                  AI Generator
                </h2>
                <p className="text-slate-500 text-sm font-medium">
                  Let AI create your quiz
                </p>
              </div>
              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <i className="bi bi-check-circle-fill text-purple-400 text-lg mt-0.5"></i>
                  <div>
                    <p className="text-white font-bold text-sm">Quick & Easy</p>
                    <p className="text-slate-500 text-xs">Generate quizzes in seconds</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <i className="bi bi-check-circle-fill text-purple-400 text-lg mt-0.5"></i>
                  <div>
                    <p className="text-white font-bold text-sm">Smart Questions</p>
                    <p className="text-slate-500 text-xs">AI generates intelligent content</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <i className="bi bi-check-circle-fill text-purple-400 text-lg mt-0.5"></i>
                  <div>
                    <p className="text-white font-bold text-sm">Customizable</p>
                    <p className="text-slate-500 text-xs">Edit after generation</p>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <div className="bg-purple-600 text-white font-black py-4 rounded-xl text-lg transition-all duration-300 ease-out text-center group-hover:bg-purple-500 group-hover:shadow-lg group-hover:shadow-purple-500/50">
                  Create with AI
                </div>
              </div>
            </div>
          </button>

          {/* Manual Creation */}
          <button
            onClick={() => navigate('/create/manual')}
            className="glass p-10 rounded-[2.5rem] border-white/10 hover:border-blue-500/30 transition-all duration-300 ease-out group active:scale-95 hover:shadow-2xl hover:shadow-blue-500/20"
          >
            <div className="space-y-6">
              <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-4xl text-blue-400 mx-auto shadow-2xl shadow-blue-500/20 group-hover:scale-110 transition-all duration-300 ease-out">
                <i className="bi bi-pencil-square"></i>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">
                  Manual Editor
                </h2>
                <p className="text-slate-500 text-sm font-medium">
                  Build from scratch
                </p>
              </div>
              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <i className="bi bi-check-circle-fill text-blue-400 text-lg mt-0.5"></i>
                  <div>
                    <p className="text-white font-bold text-sm">Full Control</p>
                    <p className="text-slate-500 text-xs">Design every detail yourself</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <i className="bi bi-check-circle-fill text-blue-400 text-lg mt-0.5"></i>
                  <div>
                    <p className="text-white font-bold text-sm">Rich Question Types</p>
                    <p className="text-slate-500 text-xs">Multiple choice, true/false & more</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <i className="bi bi-check-circle-fill text-blue-400 text-lg mt-0.5"></i>
                  <div>
                    <p className="text-white font-bold text-sm">Precision</p>
                    <p className="text-slate-500 text-xs">Exact wording and formatting</p>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <div className="bg-blue-600 text-white font-black py-4 rounded-xl text-lg transition-all duration-300 ease-out text-center group-hover:bg-blue-500 group-hover:shadow-lg group-hover:shadow-blue-500/50">
                  Create Manually
                </div>
              </div>
            </div>
          </button>

          {/* Import from JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="glass p-10 rounded-[2.5rem] border-white/10 hover:border-green-400/30 transition-all duration-300 ease-out group active:scale-95 hover:shadow-2xl hover:shadow-green-400/20"
          >
            <div className="space-y-6">
              <div className="w-20 h-20 bg-green-400/10 rounded-3xl flex items-center justify-center text-4xl text-green-400 mx-auto shadow-2xl shadow-green-400/20 group-hover:scale-110 transition-all duration-300 ease-out">
                <i className="bi bi-upload"></i>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">
                  Import Quiz
                </h2>
                <p className="text-slate-500 text-sm font-medium">
                  Upload a saved quiz file
                </p>
              </div>
              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <i className="bi bi-check-circle-fill text-green-400 text-lg mt-0.5"></i>
                  <div>
                    <p className="text-white font-bold text-sm">Restore Backup</p>
                    <p className="text-slate-500 text-xs">Load previously saved quizzes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <i className="bi bi-check-circle-fill text-green-400 text-lg mt-0.5"></i>
                  <div>
                    <p className="text-white font-bold text-sm">Share Quizzes</p>
                    <p className="text-slate-500 text-xs">Import quizzes from others</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <i className="bi bi-check-circle-fill text-green-400 text-lg mt-0.5"></i>
                  <div>
                    <p className="text-white font-bold text-sm">JSON Format</p>
                    <p className="text-slate-500 text-xs">Compatible with exported files</p>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <div className="bg-green-500 text-white font-black py-4 rounded-xl text-lg transition-all duration-300 ease-out text-center group-hover:bg-green-400 group-hover:shadow-lg group-hover:shadow-green-400/50">
                  Import from JSON
                </div>
              </div>
            </div>
          </button>
        </div>

        <input 
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileImport}
          className="hidden"
        />

        <div className="text-center">
          <button
            onClick={() => navigate('/explore')}
            className="text-slate-500 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors"
          >
            ← Back to Explore
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
