
import React, { useState, useEffect, useRef } from 'react';
import { Quiz, Question, QuestionType, PointType, QuizGenre } from '../types';
import { quizAPI } from '../api';
import ProgressBar from './ProgressBar';

const allGenres: QuizGenre[] = [
  'General', 'Science', 'History', 'Technology', 'Pop Culture', 
  'Literature', 'Music', 'Movies', 'Sports', 'Geography', 
  'Art', 'Food & Drink', 'Nature', 'Mythology', 'Politics', 
  'Business', 'Gaming'
];

const statusMessages = [
  { p: 0, m: "Starting..." },
  { p: 15, m: "Analyzing instruction..." },
  { p: 30, m: "Modifying questions..." },
  { p: 50, m: "Adding answer options..." },
  { p: 70, m: "Finalizing changes..." },
  { p: 90, m: "Almost done..." },
];

type AIAction = 'add' | 'modify' | 'remove';

const QuizEditor: React.FC<{ quiz: Quiz; onSave: (q: Quiz) => void; onStart: (q: Quiz) => void; onBack: () => void; }> = ({ quiz, onSave, onStart, onBack }) => {
  const [editedQuiz, setEditedQuiz] = useState<Quiz>({
    ...quiz,
    visibility: quiz.visibility || 'DRAFT'
  });
  const [aiAction, setAiAction] = useState<AIAction>('modify');
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  
  const progressInterval = useRef<number | null>(null);
  const progressStart = useRef<number>(0);
  const progressDuration = useRef<number>(0);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      const baseMs = 7000;
      const perQuestionMs = 450;
      const baseSlowFactor = 2.5;
      const extraSlowPerQuestion = 0.08;
      const slowdown = baseSlowFactor * (1 + extraSlowPerQuestion * Math.max(0, aiQuestionCount - 5));
      progressStart.current = Date.now();
      progressDuration.current = (baseMs + aiQuestionCount * perQuestionMs) * slowdown;

      const stepBase = 1.2;
      const stepScale = Math.max(0.2, Math.min(1, 5 / aiQuestionCount));
      const maxStep = stepBase * stepScale;
      const intervalMs = Math.max(70, (180 + Math.min(400, Math.max(0, aiQuestionCount - 5) * 30)) / 3);

      progressInterval.current = window.setInterval(() => {
        const elapsed = Date.now() - progressStart.current;
        const ratio = Math.min(1, elapsed / progressDuration.current);
        const target = Math.min(96, ratio * 96);
        setProgress(prev => {
          if (target <= prev) return prev;
          const next = Math.min(target, prev + maxStep);
          return next;
        });
      }, intervalMs);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [loading, aiQuestionCount]);

  useEffect(() => {
    const currentMsg = statusMessages.slice().reverse().find(s => progress >= s.p);
    setStatus(currentMsg ? currentMsg.m : "");
  }, [progress]);

  const updateQ = (idx: number, updates: Partial<Question>) => {
    const qs = [...(editedQuiz.questions || [])];
    let baseQ = { ...qs[idx] };
    
    // Logic to handle type switching effectively
    if (updates.type && updates.type !== baseQ.type) {
      // Re-initialize mandatory fields based on the new type
      if (updates.type === QuestionType.PUZZLE) {
        baseQ.options = [];
        baseQ.correctIndices = [];
        baseQ.correctTexts = [];
        baseQ.correctSequence = baseQ.correctSequence?.length && baseQ.correctSequence.length >= 2 
          ? baseQ.correctSequence 
          : ["Step 1", "Step 2", "Step 3", "Step 4"];
      } else if (updates.type === QuestionType.TRUE_FALSE) {
        baseQ.options = ["True", "False"];
        baseQ.correctIndices = [0];
        baseQ.correctSequence = [];
        baseQ.correctTexts = [];
      } else if (updates.type === QuestionType.INPUT) {
        baseQ.options = [];
        baseQ.correctIndices = [];
        baseQ.correctSequence = [];
        baseQ.correctTexts = baseQ.correctTexts?.length ? baseQ.correctTexts : [""];
      } else if (updates.type === QuestionType.POLL) {
        baseQ.options = (baseQ.options && baseQ.options.length >= 2) ? baseQ.options : ["Option 1", "Option 2", "Option 3"];
        baseQ.correctIndices = [];
        baseQ.correctSequence = [];
        baseQ.correctTexts = [];
        baseQ.pointType = PointType.NONE;
      } else if (updates.type === QuestionType.WORD_CLOUD) {
        baseQ.options = [];
        baseQ.correctIndices = [];
        baseQ.correctSequence = [];
        baseQ.correctTexts = [];
        baseQ.pointType = PointType.NONE;
      } else if (updates.type === QuestionType.AUDIO_QUIZ) {
        baseQ.options = (baseQ.options && baseQ.options.length >= 2) ? baseQ.options : ["Option 1", "Option 2", "Option 3", "Option 4"];
        baseQ.correctIndices = (baseQ.correctIndices && baseQ.correctIndices.length >= 1) ? baseQ.correctIndices : [0];
        baseQ.correctSequence = [];
        baseQ.correctTexts = [];
        baseQ.audioUrl = baseQ.audioUrl || '';
        baseQ.pointType = PointType.NORMAL;
      } else if (updates.type === QuestionType.IMAGE_QUIZ) {
        baseQ.options = (baseQ.options && baseQ.options.length >= 2) ? baseQ.options : ["Option 1", "Option 2", "Option 3", "Option 4"];
        baseQ.correctIndices = (baseQ.correctIndices && baseQ.correctIndices.length >= 1) ? baseQ.correctIndices : [0];
        baseQ.correctSequence = [];
        baseQ.correctTexts = [];
        baseQ.imageUrl = baseQ.imageUrl || '';
        baseQ.pointType = PointType.NORMAL;
      } else {
        // DEFAULT: MULTIPLE CHOICE
        baseQ.options = (baseQ.options && baseQ.options.length >= 2) ? baseQ.options : ["Option 1", "Option 2"];
        baseQ.correctIndices = (baseQ.correctIndices && baseQ.correctIndices.length >= 1) ? baseQ.correctIndices : [0];
        baseQ.correctSequence = [];
        baseQ.correctTexts = [];
      }
    }

    qs[idx] = { ...baseQ, ...updates } as Question;
    setEditedQuiz({ ...editedQuiz, questions: qs });
  };

  const addOption = (idx: number) => {
    const q = editedQuiz.questions[idx];
    if ((q.options || []).length >= 8) return;
    updateQ(idx, { options: [...(q.options || []), `New Option ${(q.options || []).length + 1}`] });
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    const q = editedQuiz.questions[qIdx];
    if ((q.options || []).length <= 2) return;
    updateQ(qIdx, { 
      options: (q.options || []).filter((_, i) => i !== oIdx),
      correctIndices: (q.correctIndices || []).filter(i => i !== oIdx).map(i => i > oIdx ? i - 1 : i)
    });
  };

  const addPuzzleItem = (qIdx: number) => {
    const q = editedQuiz.questions[qIdx];
    const seq = q.correctSequence || [];
    if (seq.length >= 8) return;
    updateQ(qIdx, { correctSequence: [...seq, `Step ${seq.length + 1}`] });
  };

  const removePuzzleItem = (qIdx: number, sIdx: number) => {
    const q = editedQuiz.questions[qIdx];
    const seq = q.correctSequence || [];
    if (seq.length <= 2) return;
    updateQ(qIdx, { correctSequence: seq.filter((_, i) => i !== sIdx) });
  };

  const swapPuzzleItem = (qIdx: number, sIdx: number, direction: 'up' | 'down') => {
    const q = editedQuiz.questions[qIdx];
    const seq = [...(q.correctSequence || [])];
    const targetIdx = direction === 'up' ? sIdx - 1 : sIdx + 1;
    if (targetIdx < 0 || targetIdx >= seq.length) return;
    
    [seq[sIdx], seq[targetIdx]] = [seq[targetIdx], seq[sIdx]];
    updateQ(qIdx, { correctSequence: seq });
  };

  const handleAiModify = async () => {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    setProgress(0);
    try {
      const actionVerb = aiAction === 'add' ? 'Add' : aiAction === 'remove' ? 'Remove' : 'Modify';
      const fullPrompt = aiAction === 'add' 
        ? `${actionVerb} ${aiQuestionCount} questions: ${aiPrompt}`
        : aiAction === 'remove'
        ? `${actionVerb} questions: ${aiPrompt}`
        : aiPrompt;
      
      console.log('[AI][client] modify start', {
        quizId: editedQuiz.id || 'unsaved',
        questionCount: editedQuiz.questions?.length || 0,
        action: aiAction,
        promptPreview: fullPrompt.slice(0, 120)
      });
      const response = await quizAPI.modifyWithAI(
        editedQuiz, 
        fullPrompt, 
        editedQuiz.userId,
        aiAction === 'add' ? aiQuestionCount : undefined
      );
      
      console.log('[AI][client] response received', {
        hasData: !!response.data,
        hasQuiz: !!response.data?.quiz,
        responseKeys: response.data ? Object.keys(response.data) : [],
        fullResponse: response
      });
      
      // Clear interval and complete progress
      if (progressInterval.current) clearInterval(progressInterval.current);
      setProgress(100);
      setStatus("Quiz updated!");
      
      setTimeout(() => {
        console.log('[AI][client] modify success', {
          quizId: response.data?.quiz?.id || editedQuiz.id || 'unsaved',
          questionCount: response.data?.quiz?.questions?.length || 0,
          receivedQuiz: !!response.data?.quiz
        });
        
        if (response.data?.quiz && response.data.quiz.questions && response.data.quiz.questions.length > 0) {
          setEditedQuiz(response.data.quiz);
          setAiPrompt("");
        } else {
          console.error('[AI][client] No quiz in response or empty questions:', response.data);
          alert('AI modification failed: The AI returned an empty or invalid quiz. Please try again with a more specific instruction.');
        }
        setLoading(false);
        setProgress(0);
      }, 300);
    } catch (e: any) {
      console.error('[AI][client] modify error', {
        error: e,
        message: e?.message,
        response: e?.response?.data,
        status: e?.response?.status
      });
      
      // Clear interval on error
      if (progressInterval.current) clearInterval(progressInterval.current);
      
      // Show error message to user
      const errorMsg = e?.response?.data?.error || e?.message || 'AI modification failed. Please try again.';
      alert(`Error: ${errorMsg}`);
      
      setLoading(false);
      setProgress(0);
    }
  };

  // Safety check - if editedQuiz becomes undefined, show error state
  if (!editedQuiz) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-screen flex items-center justify-center">
        <div className="glass p-8 rounded-3xl text-center space-y-4">
          <div className="text-6xl text-red-400">
            <i className="bi bi-exclamation-triangle"></i>
          </div>
          <h2 className="text-2xl font-black text-white">Quiz Data Error</h2>
          <p className="text-slate-400">The quiz data was lost. Please go back and try again.</p>
          <button 
            onClick={onBack}
            className="bg-blue-500 text-white px-8 py-3 rounded-xl font-black uppercase text-xs hover:bg-blue-400 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,#1e1b4b_0%,#020617_60%)]"></div>
      
      <div className="min-h-screen px-4 sm:px-8 py-8 sm:py-12 relative z-10">
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 sm:space-y-12 min-h-screen pb-32">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button onClick={onBack} className="glass border-white/10 px-4 sm:px-6 md:px-8 py-2 sm:py-3 rounded-full text-[10px] sm:text-xs font-black uppercase text-slate-400 hover:text-white transition-all duration-300 ease-out hover:scale-105 hover:bg-white/5">Back</button>
        <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
          <button onClick={() => onSave(editedQuiz)} className="flex-1 sm:flex-none bg-emerald-500 text-white px-4 sm:px-8 md:px-10 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all duration-300 ease-out hover:bg-emerald-400 hover:shadow-emerald-500/40">Save</button>
          <button onClick={() => onStart(editedQuiz)} className="flex-1 sm:flex-none bg-white text-slate-900 px-4 sm:px-8 md:px-10 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs shadow-xl active:scale-95 transition-all duration-300 ease-out hover:bg-slate-100 hover:shadow-2xl">Test Solo</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-12">
        <div className="lg:col-span-2 space-y-8 sm:space-y-12">
          <div className="space-y-4">
            <input 
              value={editedQuiz.title} 
              onChange={e => setEditedQuiz({...editedQuiz, title: e.target.value})} 
              className="bg-transparent border-none text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white w-full focus:outline-none tracking-tighter" 
              placeholder="Quiz Title..." 
            />
            <textarea
              value={editedQuiz.description || ''}
              onChange={e => setEditedQuiz({...editedQuiz, description: e.target.value})}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 w-full focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
              placeholder="Add a description for your quiz..."
              rows={2}
            />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
               <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category:</span>
                 <select value={editedQuiz.genre} onChange={e => setEditedQuiz({...editedQuiz, genre: e.target.value as QuizGenre})} className="bg-white/5 border border-white/10 rounded-xl px-3 sm:px-4 py-2 text-xs font-black uppercase text-white outline-none">
                   {allGenres.map(g => <option key={g} value={g} className="bg-slate-900">{g}</option>)}
                 </select>
               </div>
               <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                  <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl px-2 sm:px-3 py-2 flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 w-full sm:w-auto">
                    <span className="hidden sm:inline">Visibility</span>
                    <div className="flex gap-1 flex-1 sm:flex-none">
                      {(['DRAFT','PUBLIC','PRIVATE'] as const).map(v => (
                        <button
                          key={v}
                          onClick={() => setEditedQuiz({...editedQuiz, visibility: v})}
                          className={`px-2 sm:px-3 py-1 rounded-lg flex-1 sm:flex-none transition-all duration-300 ease-out ${editedQuiz.visibility === v ? (v === 'PUBLIC' ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/30 scale-105' : v === 'PRIVATE' ? 'bg-slate-700 text-white shadow-lg shadow-slate-700/30 scale-105' : 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 scale-105') : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/10'}`}
                        >{v}</button>
                      ))}
                    </div>
                  </div>
               </div>
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8 md:space-y-12">
            {(editedQuiz.questions || []).map((q, idx) => (
              <div key={q.id || idx} className="glass p-4 sm:p-6 md:p-8 lg:p-12 rounded-2xl sm:rounded-3xl md:rounded-[4rem] border-white/5 space-y-4 sm:space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4">
                <div className="flex justify-between items-start sm:items-center gap-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-1">
                    <span className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">Question {idx+1}</span>
                    <select 
                      value={q.type} 
                      onChange={e => updateQ(idx, { type: e.target.value as QuestionType })} 
                      className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase p-1.5 sm:p-2 text-white outline-none hover:bg-white/10 transition-all cursor-pointer w-full sm:w-auto"
                    >
                      <option value={QuestionType.MULTIPLE_CHOICE} className="bg-slate-900">MULTIPLE CHOICE</option>
                      <option value={QuestionType.TRUE_FALSE} className="bg-slate-900">TRUE / FALSE</option>
                      <option value={QuestionType.PUZZLE} className="bg-slate-900">PUZZLE (ORDER)</option>
                      <option value={QuestionType.INPUT} className="bg-slate-900">TEXT INPUT</option>
                      <option value={QuestionType.POLL} className="bg-slate-900">POLL</option>
                      <option value={QuestionType.WORD_CLOUD} className="bg-slate-900">WORD CLOUD</option>
                      <option value={QuestionType.AUDIO_QUIZ} className="bg-slate-900">AUDIO QUIZ</option>
                      <option value={QuestionType.IMAGE_QUIZ} className="bg-slate-900">IMAGE QUIZ</option>
                    </select>
                  </div>
                  <button onClick={() => setEditedQuiz({...editedQuiz, questions: (editedQuiz.questions || []).filter((_, i) => i !== idx)})} className="text-rose-500/30 hover:text-rose-500 transition-colors"><i className="bi bi-trash3-fill"></i></button>
                </div>

                <input value={q.text || ""} onChange={e => updateQ(idx, { text: e.target.value })} className="bg-transparent border-none text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-white w-full focus:outline-none placeholder:opacity-10" placeholder="Question Text..." />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Points</label>
                    <div className="flex gap-2 bg-white/5 p-2 rounded-2xl border border-white/5">
                      {[PointType.NORMAL, PointType.HALF, PointType.DOUBLE, PointType.NONE].map(pt => (
                        <button 
                          key={pt} 
                          onClick={() => updateQ(idx, { pointType: pt })} 
                          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${q.pointType === pt ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          {pt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Time Limit (Sec)</label>
                    <input type="number" value={q.timeLimit || 20} onChange={e => updateQ(idx, { timeLimit: parseInt(e.target.value) || 20 })} className="bg-white/5 border border-white/10 w-full p-3 rounded-2xl text-white font-black outline-none focus:border-indigo-500" />
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5 space-y-6">
                  {q.type === QuestionType.PUZZLE ? (
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Correct Order</label>
                          {(q.correctSequence || []).length < 8 && (
                            <button onClick={() => addPuzzleItem(idx)} className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase">+ Add Step</button>
                          )}
                       </div>
                       <div className="space-y-3">
                          {(q.correctSequence || []).map((item, sIdx) => (
                             <div key={sIdx} className="flex gap-3 items-center group/item">
                                <span className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black text-xs border border-indigo-500/20 shrink-0">{sIdx + 1}</span>
                                <input 
                                  value={item} 
                                  onChange={e => {
                                    const newSeq = [...(q.correctSequence || [])];
                                    newSeq[sIdx] = e.target.value;
                                    updateQ(idx, { correctSequence: newSeq });
                                  }}
                                  className="flex-1 bg-white/5 border border-white/5 p-4 rounded-2xl text-white text-sm font-bold focus:border-indigo-500 outline-none" 
                                />
                                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                                   <button 
                                      onClick={() => swapPuzzleItem(idx, sIdx, 'up')}
                                      disabled={sIdx === 0}
                                      className="p-2 text-slate-500 hover:text-white disabled:opacity-10"
                                      title="Move Up"
                                   >
                                      <i className="bi bi-arrow-up"></i>
                                   </button>
                                   <button 
                                      onClick={() => swapPuzzleItem(idx, sIdx, 'down')}
                                      disabled={sIdx === (q.correctSequence || []).length - 1}
                                      className="p-2 text-slate-500 hover:text-white disabled:opacity-10"
                                      title="Move Down"
                                   >
                                      <i className="bi bi-arrow-down"></i>
                                   </button>
                                   <button 
                                      onClick={() => removePuzzleItem(idx, sIdx)}
                                      disabled={(q.correctSequence || []).length <= 2}
                                      className="p-2 text-rose-500/40 hover:text-rose-500 disabled:opacity-10"
                                      title="Remove Step"
                                   >
                                      <i className="bi bi-x-circle"></i>
                                   </button>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                  ) : q.type === QuestionType.INPUT ? (
                    <div className="space-y-4">
                       <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Accepted Text Responses</label>
                       <div className="space-y-3">
                          {(q.correctTexts || [""]).map((txt, tIdx) => (
                             <div key={tIdx} className="flex gap-3">
                                <input 
                                  value={txt} 
                                  onChange={e => {
                                    const newTxts = [...(q.correctTexts || [""])];
                                    newTxts[tIdx] = e.target.value;
                                    updateQ(idx, { correctTexts: newTxts });
                                  }}
                                  className="flex-1 bg-white/5 border border-white/5 p-4 rounded-2xl text-white text-sm font-bold focus:border-indigo-500 outline-none" 
                                  placeholder="Correct answer text..."
                                />
                             </div>
                          ))}
                       </div>
                    </div>
                  ) : q.type === QuestionType.WORD_CLOUD ? (
                    <div className="space-y-4">
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase text-purple-400 tracking-widest mb-2 flex items-center gap-2"><i className="bi bi-info-circle"></i> Word Cloud Settings</p>
                        <p className="text-[9px] text-slate-400">Players will type free-text responses that appear in a word cloud. No correct answers needed.</p>
                      </div>
                    </div>
                  ) : q.type === QuestionType.AUDIO_QUIZ ? (
                    <div className="space-y-4">
                       <div className="space-y-3">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Audio URL</label>
                          <input 
                            value={q.audioUrl || ""} 
                            onChange={e => updateQ(idx, { audioUrl: e.target.value })}
                            className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-white text-sm font-bold focus:border-amber-500 outline-none placeholder:text-slate-600" 
                            placeholder="https://example.com/audio.mp3"
                          />
                       </div>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center">
                             <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Answer Options</label>
                             {(q.options || []).length < 8 && (
                               <button onClick={() => addOption(idx)} className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase">+ Add Option</button>
                             )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {(q.options || []).map((opt, oIdx) => {
                                const isCorrect = (q.correctIndices || []).includes(oIdx);
                                return (
                                  <div key={oIdx} className={`p-4 rounded-3xl border-2 transition-all flex items-center gap-4 ${isCorrect ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-white/5'}`}>
                                     <button onClick={() => {
                                       let newIndices = [...(q.correctIndices || [])];
                                       if (newIndices.includes(oIdx)) {
                                         if (newIndices.length > 1) newIndices = newIndices.filter(i => i !== oIdx);
                                       } else {
                                         newIndices.push(oIdx);
                                       }
                                       updateQ(idx, { correctIndices: newIndices });
                                     }} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isCorrect ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-white/20'}`}>
                                       {isCorrect && <i className="bi bi-check-lg"></i>}
                                     </button>
                                     <input 
                                       value={opt} 
                                       onChange={e => {
                                         const newOpts = [...(q.options || [])];
                                         newOpts[oIdx] = e.target.value;
                                         updateQ(idx, { options: newOpts });
                                       }}
                                       className="bg-transparent border-none text-white text-sm font-bold flex-1 outline-none" 
                                     />
                                     {(q.options || []).length > 2 && (
                                       <button onClick={() => removeOption(idx, oIdx)} className="text-rose-500/30 hover:text-rose-500 transition-colors"><i className="bi bi-x-lg"></i></button>
                                     )}
                                  </div>
                                );
                             })}
                          </div>
                       </div>
                    </div>
                  ) : q.type === QuestionType.IMAGE_QUIZ ? (
                    <div className="space-y-4">
                       <div className="space-y-3">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Image URL</label>
                          <input 
                            value={q.imageUrl || ""} 
                            onChange={e => updateQ(idx, { imageUrl: e.target.value })}
                            className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-white text-sm font-bold focus:border-cyan-500 outline-none placeholder:text-slate-600" 
                            placeholder="https://example.com/image.jpg"
                          />
                       </div>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center">
                             <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Answer Options</label>
                             {(q.options || []).length < 8 && (
                               <button onClick={() => addOption(idx)} className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase">+ Add Option</button>
                             )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {(q.options || []).map((opt, oIdx) => {
                                const isCorrect = (q.correctIndices || []).includes(oIdx);
                                return (
                                  <div key={oIdx} className={`p-4 rounded-3xl border-2 transition-all flex items-center gap-4 ${isCorrect ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-white/5'}`}>
                                     <button onClick={() => {
                                       let newIndices = [...(q.correctIndices || [])];
                                       if (newIndices.includes(oIdx)) {
                                         if (newIndices.length > 1) newIndices = newIndices.filter(i => i !== oIdx);
                                       } else {
                                         newIndices.push(oIdx);
                                       }
                                       updateQ(idx, { correctIndices: newIndices });
                                     }} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isCorrect ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-white/20'}`}>
                                       {isCorrect && <i className="bi bi-check-lg"></i>}
                                     </button>
                                     <input 
                                       value={opt} 
                                       onChange={e => {
                                         const newOpts = [...(q.options || [])];
                                         newOpts[oIdx] = e.target.value;
                                         updateQ(idx, { options: newOpts });
                                       }}
                                       className="bg-transparent border-none text-white text-sm font-bold flex-1 outline-none" 
                                     />
                                     {(q.options || []).length > 2 && (
                                       <button onClick={() => removeOption(idx, oIdx)} className="text-rose-500/30 hover:text-rose-500 transition-colors"><i className="bi bi-x-lg"></i></button>
                                     )}
                                  </div>
                                );
                             })}
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
                            {q.type === QuestionType.POLL ? 'Opinion Options (No Correct Answer)' : 'Answer Options'}
                          </label>
                          {(q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.POLL) && (q.options || []).length < 8 && (
                            <button onClick={() => addOption(idx)} className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase">+ Add Option</button>
                          )}
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(q.options || []).map((opt, oIdx) => {
                             const isCorrect = (q.correctIndices || []).includes(oIdx);
                             const isPoll = q.type === QuestionType.POLL;
                             return (
                               <div key={oIdx} className={`p-4 rounded-3xl border-2 transition-all flex items-center gap-4 ${isPoll ? 'border-blue-500/30 bg-blue-500/5' : isCorrect ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-white/5'}`}>
                                  {!isPoll && (
                                    <button onClick={() => {
                                    let newIndices = [...(q.correctIndices || [])];
                                    if (newIndices.includes(oIdx)) {
                                      if (newIndices.length > 1) newIndices = newIndices.filter(i => i !== oIdx);
                                    } else {
                                      if (q.type === QuestionType.TRUE_FALSE) newIndices = [oIdx];
                                      else newIndices.push(oIdx);
                                    }
                                    updateQ(idx, { correctIndices: newIndices });
                                  }} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isCorrect ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-white/20'}`}>
                                    {isCorrect && <i className="bi bi-check-lg"></i>}
                                  </button>
                                  )}
                                  {isPoll && (
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center">
                                      <i className="bi bi-chat-dots text-blue-400 text-sm"></i>
                                    </div>
                                  )}
                                  <input 
                                    value={opt} 
                                    onChange={e => {
                                      const newOpts = [...(q.options || [])];
                                      newOpts[oIdx] = e.target.value;
                                      updateQ(idx, { options: newOpts });
                                    }}
                                    className="bg-transparent border-none text-white text-sm font-bold flex-1 outline-none" 
                                    readOnly={q.type === QuestionType.TRUE_FALSE}
                                  />
                                  {(q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.POLL) && (q.options || []).length > 2 && (
                                    <button onClick={() => removeOption(idx, oIdx)} className="text-rose-500/30 hover:text-rose-500 transition-colors"><i className="bi bi-x-lg"></i></button>
                                  )}
                               </div>
                             );
                          })}
                       </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => {
                const newQ: Question = {
                  id: Math.random().toString(36).substr(2, 9),
                  type: QuestionType.MULTIPLE_CHOICE,
                  pointType: PointType.NORMAL,
                  text: "New Question",
                  options: ["Option A", "Option B"],
                  correctIndices: [0],
                  timeLimit: 20
                };
                setEditedQuiz({ ...editedQuiz, questions: [...(editedQuiz.questions || []), newQ] });
              }}
              className="w-full glass border-dashed border-white/10 hover:border-indigo-500/50 p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl md:rounded-[4rem] flex flex-col items-center gap-3 sm:gap-4 text-slate-500 hover:text-indigo-400 transition-all group"
            >
              <i className="bi bi-plus-circle text-2xl sm:text-3xl md:text-4xl group-hover:scale-110 transition-transform"></i>
              <span className="font-black uppercase tracking-[0.4em] text-[10px] sm:text-xs">Add Question</span>
            </button>
          </div>
        </div>
        
        <div className="space-y-6 sm:space-y-8 lg:sticky lg:top-24 h-fit">
           <div className="glass p-4 sm:p-6 md:p-8 lg:p-10 rounded-2xl sm:rounded-3xl md:rounded-[3rem] border-blue-500/20 space-y-4 sm:space-y-6">
              <div className="text-blue-400 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                <i className="bi bi-stars"></i> Create with AI
              </div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Modify this quiz using natural language.</p>
              
              {/* AI Action Dropdown */}
              <div className="space-y-2">
                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">AI Action</label>
                <select 
                  value={aiAction} 
                  onChange={e => setAiAction(e.target.value as AIAction)}
                  className="glass w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-xs sm:text-sm text-white border border-white/10 focus:outline-none focus:border-blue-500/50 transition-all"
                  disabled={loading}
                >
                  <option value="add">Add Questions</option>
                  <option value="modify">Modify Questions</option>
                  <option value="remove">Remove Questions</option>
                </select>
              </div>

              {/* Question Count (only for Add action) */}
              {aiAction === 'add' && (
                <div className="space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Number of Questions</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="20" 
                    value={aiQuestionCount} 
                    onChange={e => setAiQuestionCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    className="glass w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-xs sm:text-sm text-white border border-white/10 focus:outline-none focus:border-blue-500/50 transition-all"
                    disabled={loading}
                  />
                </div>
              )}
              
              {/* AI Prompt */}
              <div className="space-y-2">
                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  {aiAction === 'add' ? 'What kind of questions?' : aiAction === 'remove' ? 'Which questions to remove?' : 'How to modify?'}
                </label>
                <textarea 
                  value={aiPrompt} 
                  onChange={e => setAiPrompt(e.target.value)} 
                  placeholder={
                    aiAction === 'add' 
                      ? "science questions about the solar system..."
                      : aiAction === 'remove'
                      ? "remove all true/false questions..."
                      : "make questions harder, convert Q2 to puzzle..."
                  }
                  className="bg-white/5 w-full p-3 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl h-32 sm:h-40 text-xs sm:text-sm text-white border border-white/5 focus:outline-none focus:border-blue-500/50 transition-all shadow-inner" 
                  disabled={loading}
                />
              </div>

              {/* Progress Bar */}
              {loading && <ProgressBar progress={progress} status={status} />}

              <button 
                onClick={handleAiModify} 
                disabled={loading || !aiPrompt.trim()} 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 sm:py-4 md:py-5 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs shadow-xl shadow-blue-600/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : aiAction === 'add' ? 'Add Questions' : aiAction === 'remove' ? 'Remove Questions' : 'Modify Quiz'}
              </button>
           </div>
        </div>
      </div>
    </div>
      </div>
    </div>
  );
};

export default QuizEditor;
