
import React, { useState, useEffect, useRef } from 'react';
import { Question, GameState, QuestionType, PointType } from '../types';
import { decodeHtmlEntities } from '../utils/cn';

interface QuestionScreenProps {
  question: Question;
  index: number;
  total: number;
  timeLeft: number;
  gameState: GameState;
  totalSubmissions: number;
  totalPlayers: number;
  onAnswer: (answer: any) => void;
  humanAnswer?: any;
}

const CHOICE_STYLES = [
    { border: 'neon-border-blue', text: 'text-sky-400', bg: 'bg-sky-500/10', icon: 'bi-triangle-fill' },
    { border: 'neon-border-purple', text: 'text-purple-400', bg: 'bg-purple-500/10', icon: 'bi-square-fill' },
    { border: 'neon-border-pink', text: 'text-pink-400', bg: 'bg-pink-500/10', icon: 'bi-circle-fill' },
    { border: 'neon-border-emerald', text: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: 'bi-pentagon-fill' },
    { border: 'border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]', text: 'text-violet-400', bg: 'bg-violet-500/10', icon: 'bi-hexagon-fill' },
    { border: 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]', text: 'text-amber-400', bg: 'bg-amber-500/10', icon: 'bi-star-fill' },
    { border: 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]', text: 'text-rose-400', bg: 'bg-rose-500/10', icon: 'bi-diamond-fill' },
    { border: 'border-emerald-300 shadow-[0_0_15px_rgba(110,231,183,0.3)]', text: 'text-emerald-300', bg: 'bg-emerald-300/10', icon: 'bi-heart-fill' },
];

const QuestionScreen: React.FC<QuestionScreenProps> = ({ 
  question, index, total, timeLeft, gameState, totalSubmissions, totalPlayers, onAnswer, humanAnswer
}) => {
  const [introCountdown, setIntroCountdown] = useState(3);
  const [currentSequence, setCurrentSequence] = useState<string[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [multiSelections, setMultiSelections] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isSelectAll = question.type === QuestionType.MULTIPLE_CHOICE && (question.correctIndices?.length || 0) > 1;
  const isPoll = question.type === QuestionType.POLL;
  const isWordCloud = question.type === QuestionType.WORD_CLOUD;
  const isAudioQuiz = question.type === QuestionType.AUDIO_QUIZ;
  const isImageQuiz = question.type === QuestionType.IMAGE_QUIZ;

  useEffect(() => {
    if (gameState === GameState.QUESTION_INTRO) {
      setIntroCountdown(3);
      setInputValue("");
      setMultiSelections([]);
      const timer = setInterval(() => setIntroCountdown(prev => Math.max(0, prev - 1)), 1000);
      
      if (question.type === QuestionType.PUZZLE) {
        const items = [...(question.correctSequence || [])].sort(() => Math.random() - 0.5);
        setCurrentSequence(items);
      }

      return () => clearInterval(timer);
    }
  }, [gameState, question]);

  // Touch drag state
  const touchDrag = useRef<{startY: number, idx: number, dragging: boolean} | null>(null);
  const dragTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleDragStart = (idx: number) => {
    setDraggingIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === idx) return;
    const newSequence = [...currentSequence];
    const draggedItem = newSequence[draggingIndex];
    newSequence.splice(draggingIndex, 1);
    newSequence.splice(idx, 0, draggedItem);
    setCurrentSequence(newSequence);
    setDraggingIndex(idx);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
  };

  // Touch drag handlers for mobile
  const handleTouchStart = (idx: number, e: React.TouchEvent) => {
    if (dragTimeout.current) clearTimeout(dragTimeout.current);
    dragTimeout.current = setTimeout(() => {
      touchDrag.current = { startY: e.touches[0].clientY, idx, dragging: true };
      setDraggingIndex(idx);
      document.body.style.overflow = 'hidden'; // Prevent scroll
    }, 200); // Long-press to start drag
  };

  const handleTouchMove = (e: React.TouchEvent, idx: number) => {
    if (!touchDrag.current || !touchDrag.current.dragging) return;
    const moveY = e.touches[0].clientY;
    const deltaY = moveY - touchDrag.current.startY;
    // Find which item we're over
    const overIdx = idx;
    if (draggingIndex !== null && overIdx !== draggingIndex) {
      const newSequence = [...currentSequence];
      const draggedItem = newSequence[draggingIndex];
      newSequence.splice(draggingIndex, 1);
      newSequence.splice(overIdx, 0, draggedItem);
      setCurrentSequence(newSequence);
      setDraggingIndex(overIdx);
      touchDrag.current.idx = overIdx;
    }
  };

  const handleTouchEnd = () => {
    if (dragTimeout.current) clearTimeout(dragTimeout.current);
    if (touchDrag.current && touchDrag.current.dragging) {
      setDraggingIndex(null);
      touchDrag.current = null;
      document.body.style.overflow = '';
    }
  };

  const handleSwap = (idxA: number, idxB: number) => {
    const newSequence = [...currentSequence];
    [newSequence[idxA], newSequence[idxB]] = [newSequence[idxB], newSequence[idxA]];
    setCurrentSequence(newSequence);
  };

  const handleLockIn = () => {
    onAnswer(currentSequence);
  };

  const toggleSelection = (idx: number) => {
    setMultiSelections(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleMultiSubmit = () => {
    if (multiSelections.length > 0) {
      onAnswer(multiSelections);
    }
  };

  useEffect(() => {
    // Nudge autoplay for audio questions when the element is available
    if (isAudioQuiz && question.audioUrl && audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
    }
  }, [isAudioQuiz, question.audioUrl, question.id]);

  if (gameState === GameState.QUESTION_INTRO) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen p-4 sm:p-8 md:p-12 text-center bg-slate-950 py-12 sm:py-16 md:py-20">
        <div className="bg-indigo-500/10 text-indigo-400 px-4 sm:px-6 py-2 rounded-full font-black text-[9px] sm:text-xs uppercase tracking-widest mb-6 sm:mb-8 md:mb-12 border border-indigo-500/20">
          <span className="hidden sm:inline">Question {index}/{total} • </span>
          {isAudioQuiz ? "AUDIO QUIZ" : isImageQuiz ? "IMAGE QUIZ" : isWordCloud ? "WORD CLOUD" : isPoll ? "POLL" : isSelectAll ? "SELECT ALL" : question.type.replace('_', ' ')}
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-black text-white leading-tight mb-8 sm:mb-12 md:mb-20 max-w-4xl tracking-tight">{decodeHtmlEntities(question.text)}</h2>
        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl sm:text-3xl md:text-4xl font-black text-indigo-400 animate-pulse">
            {introCountdown}
        </div>
      </div>
    );
  }

  const pointIndicator = (
    <div className={`mt-4 inline-flex items-center gap-2 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest animate-bounce ${
      question.pointType === PointType.DOUBLE ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]' :
      question.pointType === PointType.HALF ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
      question.pointType === PointType.NONE ? 'bg-slate-500/10 text-slate-500 border border-white/5' : 'hidden'
    }`}>
      {question.pointType === PointType.DOUBLE && <i className="bi bi-lightning-fill"></i>}
      {question.pointType === PointType.DOUBLE ? 'Double Points' : 
       question.pointType === PointType.HALF ? 'Half Points' : 
       question.pointType === PointType.NONE ? 'Opinion Question' : 'Normal Question'}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:justify-between items-center md:items-start p-4 sm:p-6 md:p-8 z-10 gap-4">
        <div className="glass px-6 py-4 sm:px-8 sm:py-5 rounded-2xl sm:rounded-3xl text-center min-w-[120px] sm:min-w-[140px] order-1 md:order-none">
          <div className="text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">Clock</div>
          <div className="text-4xl sm:text-5xl font-black text-white font-mono">{timeLeft}</div>
        </div>
        <div className="max-w-3xl text-center px-4 sm:px-8 md:px-12 order-2 md:order-none">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 leading-tight drop-shadow-2xl">{decodeHtmlEntities(question.text)}</h2>
          {pointIndicator}
          {isSelectAll && <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Multiple Selection Active</p>}
          {isPoll && (
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center justify-center gap-2">
              <i className="bi bi-bar-chart-line"></i> No right or wrong answers
            </p>
          )}
          {isWordCloud && (
            <p className="text-purple-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center justify-center gap-2">
              <i className="bi bi-cloud-fill"></i> Share a word or phrase
            </p>
          )}
          {isAudioQuiz && (
            <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center justify-center gap-2">
              <i className="bi bi-volume-up-fill"></i> Listen carefully to the audio
            </p>
          )}
          {isImageQuiz && (
            <p className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center justify-center gap-2">
              <i className="bi bi-image-fill"></i> Look at the image and answer
            </p>
          )}
        </div>
        <div className="glass px-6 py-4 sm:px-8 sm:py-5 rounded-2xl sm:rounded-3xl text-center min-w-[120px] sm:min-w-[140px] order-3 md:order-none">
          <div className="text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">Players</div>
          <div className="text-4xl sm:text-5xl font-black text-white font-mono">{totalSubmissions}/{totalPlayers}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 md:p-8 z-10 overflow-y-auto">
        {humanAnswer !== undefined ? (
          <div className="glass p-4 sm:p-6 md:p-10 rounded-2xl sm:rounded-3xl text-center border-emerald-500/30 animate-in zoom-in duration-300">
            <i className="bi bi-cpu text-3xl sm:text-5xl md:text-6xl text-emerald-400 animate-pulse mb-3 sm:mb-4 block"></i>
            <div className="text-lg sm:text-xl md:text-2xl font-black text-white uppercase mb-1">Waiting for Players</div>
            <div className="text-xs sm:text-sm text-slate-500 font-bold tracking-widest uppercase">Waiting for Results...</div>
          </div>
        ) : (
          <>
            <div className={`${
              question.type === QuestionType.INPUT || question.type === QuestionType.PUZZLE || question.type === QuestionType.WORD_CLOUD ? 'flex flex-col items-center gap-6 w-full max-w-6xl px-4 sm:px-6 md:px-8' :
              isAudioQuiz || isImageQuiz ? 'flex flex-col items-center gap-6 w-full max-w-6xl px-4 sm:px-6 md:px-8' :
              (question.options?.length || 0) > 6 ? 'grid gap-3 sm:gap-4 md:gap-6 w-full max-w-6xl px-4 sm:px-6 md:px-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 
              (question.options?.length || 0) > 4 ? 'grid gap-3 sm:gap-4 md:gap-6 w-full max-w-6xl px-4 sm:px-6 md:px-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 
              'grid gap-3 sm:gap-4 md:gap-6 w-full max-w-6xl px-4 sm:px-6 md:px-8 grid-cols-1 md:grid-cols-2'
            }`}>
              {question.type === QuestionType.PUZZLE ? (
                <div className="w-full max-w-4xl flex flex-col items-center gap-4 sm:gap-6 md:gap-8 lg:gap-12 animate-in fade-in duration-500">
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.4em] block mb-4">Tactile Sequence Rearrangement</span>
                    <p className="text-slate-500 text-sm font-medium">Drag items or click arrows to swap into correct protocol order.</p>
                  </div>

                  <div className={`flex flex-col gap-4 w-full ${(currentSequence || []).length > 5 ? 'max-w-3xl' : 'max-w-2xl'}`}>
                    {(currentSequence || []).map((item, idx) => (
                      <div
                        key={item}
                        className={`relative glass p-6 rounded-2xl flex items-center justify-between border-2 transition-all group ${draggingIndex === idx ? 'opacity-30 border-dashed border-indigo-500 scale-95' : 'border-white/5 hover:border-indigo-500/50 hover:bg-white/5'}`}
                        // Desktop drag events only on grip
                      >
                        <div className="flex items-center gap-6">
                          <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black text-sm border border-indigo-500/20">
                            {idx + 1}
                          </span>
                          <span className="text-lg font-bold text-white uppercase tracking-wider">{item}</span>
                        </div>
                        <div className="flex gap-2 opacity-100 transition-opacity">
                          {idx > 0 && (
                            <button onClick={() => handleSwap(idx, idx - 1)} className="p-2 text-slate-500 hover:text-white transition-colors">
                              <i className="bi bi-chevron-up"></i>
                            </button>
                          )}
                          {idx < currentSequence.length - 1 && (
                            <button onClick={() => handleSwap(idx, idx + 1)} className="p-2 text-slate-500 hover:text-white transition-colors">
                              <i className="bi bi-chevron-down"></i>
                            </button>
                          )}
                          {/* Drag handle: desktop and mobile */}
                          <span
                            className="bi bi-grip-vertical text-slate-500 ml-2 cursor-grab active:cursor-grabbing touch-none"
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                            onTouchStart={(e) => handleTouchStart(idx, e)}
                            onTouchMove={(e) => handleTouchMove(e, idx)}
                            onTouchEnd={handleTouchEnd}
                            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                            aria-label="Drag to reorder"
                            role="button"
                            tabIndex={0}
                          ></span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={handleLockIn}
                    className="group relative bg-white text-slate-900 px-16 py-6 rounded-3xl font-black text-2xl uppercase tracking-tighter shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-4 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-blue-500/10 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    <i className="bi bi-lock-fill text-blue-600"></i>
                    <span className="relative z-10">Submit</span>
                  </button>
                </div>
              ) : question.type === QuestionType.INPUT ? (
                <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8 animate-in fade-in duration-500">
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.4em] block mb-4">Text Input</span>
                    <p className="text-slate-500 text-sm font-medium">Type your answer below.</p>
                  </div>
                  
                  <input 
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && inputValue.trim() && onAnswer(inputValue.trim())}
                    maxLength={150}
                    className="w-full bg-white/5 border-2 border-white/10 p-8 rounded-[2rem] text-3xl font-black text-white text-center focus:outline-none focus:border-blue-500/50 transition-all placeholder:opacity-20 uppercase tracking-widest"
                    placeholder="TYPE HERE..."
                    autoFocus
                  />

                  <button 
                    onClick={() => inputValue.trim() && onAnswer(inputValue.trim())}
                    disabled={!inputValue.trim()}
                    className="group relative bg-white text-slate-900 px-16 py-6 rounded-3xl font-black text-2xl uppercase tracking-tighter shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-4 overflow-hidden disabled:opacity-30"
                  >
                    <i className="bi bi-send-fill text-blue-600"></i>
                    Submit
                  </button>
                </div>
              ) : question.type === QuestionType.WORD_CLOUD ? (
                <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8 animate-in fade-in duration-500">
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase text-purple-400 tracking-[0.4em] block mb-4">Word Cloud Entry</span>
                    <p className="text-slate-500 text-sm font-medium">Enter a word or short phrase that represents your answer.</p>
                  </div>
                  
                  <input 
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && inputValue.trim() && onAnswer(inputValue.trim())}
                    maxLength="100"
                    className="w-full bg-white/5 border-2 border-purple-500/20 p-8 rounded-[2rem] text-3xl font-black text-white text-center focus:outline-none focus:border-purple-500/50 transition-all placeholder:opacity-20 tracking-widest"
                    placeholder="Your word or phrase..."
                    autoFocus
                  />

                  <button 
                    onClick={() => inputValue.trim() && onAnswer(inputValue.trim())}
                    disabled={!inputValue.trim()}
                    className="group relative bg-white text-slate-900 px-16 py-6 rounded-3xl font-black text-2xl uppercase tracking-tighter shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-4 overflow-hidden disabled:opacity-30"
                  >
                    <i className="bi bi-cloud-fill text-purple-600"></i>
                    Submit Word
                  </button>
                </div>
              ) : question.type === QuestionType.AUDIO_QUIZ ? (
                <div className="w-full flex flex-col items-center gap-6 animate-in fade-in duration-500">
                  {question.audioUrl && (
                    <div className="w-full max-w-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 rounded-3xl p-8 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <i className="bi bi-volume-up-fill text-amber-400 text-3xl"></i>
                        <span className="text-amber-300 text-sm font-bold uppercase tracking-wider">Audio Content</span>
                      </div>
                      <audio 
                        ref={audioRef}
                        src={question.audioUrl}
                        controls
                        autoPlay
                        className="w-full h-12 rounded-xl bg-black/30"
                      />
                    </div>
                  )}

                  <div className="w-full max-w-5xl grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2">
                    {(question.options || []).map((opt, i) => {
                      const style = CHOICE_STYLES[i] || CHOICE_STYLES[0];
                      const isDense = (question.options?.length || 0) > 4;
                      const isSelected = isSelectAll ? multiSelections.includes(i) : false;
                      
                      return (
                        <button 
                          key={i}
                          onClick={() => isSelectAll ? toggleSelection(i) : onAnswer(i)}
                          className={`group relative glass ${style.border} ${isDense ? 'p-4 sm:p-6 rounded-xl sm:rounded-2xl' : 'p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem]'} flex items-center gap-3 sm:gap-6 transition-all hover:scale-[1.03] active:scale-95 hover:bg-white/5 ${isSelected ? 'ring-4 ring-indigo-500/50 bg-indigo-500/10 border-indigo-500' : ''}`}
                        >
                          <div className={`${isDense ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-12 h-12 sm:w-16 sm:h-16'} flex items-center justify-center rounded-xl sm:rounded-2xl ${style.bg} ${style.text} shadow-xl flex-shrink-0`}>
                            {isSelectAll ? (
                              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-white/20'}`}>
                                {isSelected && <i className="bi bi-check-lg"></i>}
                              </div>
                            ) : (
                              <i className={`bi ${style.icon} ${isDense ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'}`}></i>
                            )}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <span className={`${isDense ? 'text-sm sm:text-base' : 'text-base sm:text-xl'} font-black ${style.text}`}>{decodeHtmlEntities(opt)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : question.type === QuestionType.IMAGE_QUIZ ? (
                <div className="w-full flex flex-col items-center gap-6 animate-in fade-in duration-500">
                  {question.imageUrl && (
                    <div className="w-full max-w-3xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/30 rounded-3xl p-6 overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                      <img 
                        src={question.imageUrl}
                        alt="Question"
                        className="w-full h-auto rounded-2xl object-cover max-h-96 mx-auto"
                      />
                    </div>
                  )}

                  <div className="w-full max-w-5xl grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2">
                    {(question.options || []).map((opt, i) => {
                      const style = CHOICE_STYLES[i] || CHOICE_STYLES[0];
                      const isDense = (question.options?.length || 0) > 4;
                      const isSelected = isSelectAll ? multiSelections.includes(i) : false;
                      
                      return (
                        <button 
                          key={i}
                          onClick={() => isSelectAll ? toggleSelection(i) : onAnswer(i)}
                          className={`group relative glass ${style.border} ${isDense ? 'p-4 sm:p-6 rounded-xl sm:rounded-2xl' : 'p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem]'} flex items-center gap-3 sm:gap-6 transition-all hover:scale-[1.03] active:scale-95 hover:bg-white/5 ${isSelected ? 'ring-4 ring-indigo-500/50 bg-indigo-500/10 border-indigo-500' : ''}`}
                        >
                          <div className={`${isDense ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-12 h-12 sm:w-16 sm:h-16'} flex items-center justify-center rounded-xl sm:rounded-2xl ${style.bg} ${style.text} shadow-xl flex-shrink-0`}>
                            {isSelectAll ? (
                              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-white/20'}`}>
                                {isSelected && <i className="bi bi-check-lg"></i>}
                              </div>
                            ) : (
                              <i className={`bi ${style.icon} ${isDense ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'}`}></i>
                            )}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <span className={`${isDense ? 'text-sm sm:text-base' : 'text-base sm:text-xl'} font-black ${style.text}`}>{decodeHtmlEntities(opt)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                (question.options || []).map((opt, i) => {
                  const style = CHOICE_STYLES[i] || CHOICE_STYLES[0];
                  const isDense = (question.options?.length || 0) > 4;
                  const isSelected = isSelectAll ? multiSelections.includes(i) : false;
                  
                  return (
                    <button 
                      key={i}
                      onClick={() => isSelectAll ? toggleSelection(i) : onAnswer(i)}
                      className={`group relative glass ${style.border} ${isDense ? 'p-4 sm:p-6 rounded-xl sm:rounded-2xl' : 'p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem]'} flex items-center gap-3 sm:gap-6 transition-all hover:scale-[1.03] active:scale-95 hover:bg-white/5 ${isSelected ? 'ring-4 ring-indigo-500/50 bg-indigo-500/10 border-indigo-500' : ''}`}
                    >
                      <div className={`${isDense ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-12 h-12 sm:w-16 sm:h-16'} flex items-center justify-center rounded-xl sm:rounded-2xl ${style.bg} ${style.text} shadow-xl flex-shrink-0`}>
                        {isSelectAll ? (
                          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-white/20'}`}>
                            {isSelected && <i className="bi bi-check-lg"></i>}
                          </div>
                        ) : (
                          <i className={`bi ${style.icon} ${isDense ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'}`}></i>
                        )}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="text-[8px] sm:text-[10px] font-black uppercase opacity-30 mb-1">Option 0{i+1}</div>
                        <span className={`${isDense ? 'text-sm sm:text-lg' : 'text-base sm:text-2xl'} font-bold text-white leading-tight block break-words`}>{decodeHtmlEntities(opt)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            
            {isSelectAll && (
              <div className="mt-12 animate-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={handleMultiSubmit}
                  disabled={multiSelections.length === 0}
                  className="group relative bg-white text-slate-900 px-16 py-6 rounded-3xl font-black text-2xl uppercase tracking-tighter shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-4 overflow-hidden disabled:opacity-30"
                >
                  <div className="absolute inset-0 bg-indigo-500/10 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                  <i className="bi bi-send-fill text-indigo-600"></i>
                  <span className="relative z-10">Submit</span>
                </button>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-4 text-center">Partial credit enabled for incomplete protocols</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full animate-pulse blur-[100px] pointer-events-none"></div>
    </div>
  );
};

export default QuestionScreen;
