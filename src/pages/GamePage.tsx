import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import QuestionScreen from '../components/QuestionScreen';
import Leaderboard from '../components/Leaderboard';
import Podium from '../components/Podium';
import { gameAPI, quizAPI } from '../api';
import { useUser } from '../context/UserContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { Player, Quiz, GameState, QuestionType, PointType } from '../types';

const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const { pin } = useParams<{ pin: string }>();
  const { user, updateUser, loading: userLoading } = useUser();
  const { handleError } = useErrorHandler();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>(GameState.QUESTION_INTRO);
  const [timeLeft, setTimeLeft] = useState(20);
  const [answersSubmitted, setAnswersSubmitted] = useState<Record<string, any>>({});
  const [isHost, setIsHost] = useState(false);
  const [isSolo, setIsSolo] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);
  
  // Use consistent player ID logic
  const getPlayerId = () => {
    if (user?.id) {
      // Clean up any guest ID if user is logged in
      if (pin) {
        const sessionKey = `quizly_guest_id_${pin}`;
        sessionStorage.removeItem(sessionKey);
      }
      return user.id;
    }
    if (pin) {
      const sessionKey = `quizly_guest_id_${pin}`;
      // Use sessionStorage (per-tab) for guest IDs
      const storedGuestId = sessionStorage.getItem(sessionKey);
      if (storedGuestId) return storedGuestId;
      const newGuestId = `guest_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(sessionKey, newGuestId);
      return newGuestId;
    }
    return sessionStorage.getItem('quizly_human_id') || `player_${Math.random().toString(36).substr(2, 9)}`;
  };
  
  const humanId = useRef<string>('');
  const botTimerRefs = useRef<number[]>([]);

  useEffect(() => {
    // Wait for user context to load
    if (userLoading) {
      console.log('GamePage: Waiting for user context to load');
      return;
    }

    // Don't reinitialize if already done
    if (gameInitialized) {
      console.log('GamePage: Already initialized, skipping');
      return;
    }

    console.log('GamePage: Initializing game for pin:', pin);
    // Set player ID after user context is loaded
    humanId.current = getPlayerId();
    sessionStorage.setItem('quizly_human_id', humanId.current);
    
    initializeGame();
    setGameInitialized(true);

    return () => {
      console.log('GamePage: Cleanup triggered');
      if (socket) {
        socket.disconnect();
      }
      botTimerRefs.current.forEach(t => clearTimeout(t));
    };
  }, [pin, userLoading, gameInitialized]);

  const initializeGame = async () => {
    // Check if this is solo mode (pin === 'solo')
    if (pin === 'solo') {
      // Solo mode - load quiz by ID and start immediately
      const soloQuizId = sessionStorage.getItem('soloQuizId');
      if (soloQuizId) {
        try {
          const response = await quizAPI.getById(soloQuizId);
          const parsedQuiz = response.data.quiz;
          setIsSolo(true);
          
          // Setup solo player (just the human, no bots)
          const human: Player = {
            id: humanId.current,
            name: user?.anonymousMode ? 'Anonymous' : (user?.username || 'Player'),
            score: 0,
            lastAnswerCorrect: false,
            streak: 0,
            isBot: false,
            userId: user?.id,
            anonymousMode: user?.anonymousMode
          };
          
          setPlayers([human]);
          setQuiz(parsedQuiz);
          
          // Start question sequence immediately with the parsed quiz
          setTimeout(() => {
            beginQuestionSequenceWithQuiz(parsedQuiz, 0);
          }, 100);
        } catch (error) {
          console.error('Failed to load solo quiz:', error);
        }
      }
    } else if (pin) {
      // Multiplayer mode
      try {
        const response = await gameAPI.getByPin(pin);
        const session = response.data.session;
        setQuiz(session.quiz);
        setPlayers((session.players as Player[]) || []);
        setIsHost(user?.id === session.hostId);
        setCurrentQuestionIndex(session.currentQuestionIndex || 0);
        
        // Connect socket with mobile-optimized settings
        const newSocket = io('/', {
          withCredentials: true,
          transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 20000 // 20 second timeout for mobile networks
        });
        setSocket(newSocket);
        
        // Setup socket listeners before joining
        setupSocketListeners(newSocket);
        
        // Join room with player ID
        newSocket.emit('JOIN_ROOM', { pin, playerId: humanId.current });
          newSocket.emit('JOIN_ROOM', { pin, playerId: humanId.current, userId: user?.id });
        
        // Start if already in progress - use the quiz from the response
        if (session.state !== 'LOBBY') {
          beginQuestionSequenceWithQuiz(session.quiz, session.currentQuestionIndex || 0);
        }
      } catch (error: any) {
        console.error('Failed to load game:', error);
        // Check error status codes in priority order
        if (error.response?.status === 410) {
          handleError(410, 'This game session has ended or does not exist');
        } else if (error.response?.status === 404) {
          handleError(410, 'Game session not found');
        } else if (error.response) {
          // Server responded with an error
          handleError(error.response.status, error.response.data?.error || 'Failed to load game session');
        } else {
          // Network or other error
          handleError(500, 'Failed to load game session');
        }
      }
    }
  };

  const setupSocketListeners = (socket: Socket) => {
    // Room validation
    socket.on('ROOM_ERROR', (data: { error: string; message: string }) => {
      console.error('Room error:', data);
      if (data.error === 'ROOM_NOT_FOUND') {
        // Redirect to error page for non-existent room
        navigate(`/error?code=410&message=${encodeURIComponent('This game session has ended or does not exist')}`);
      } else if (data.error === 'ALREADY_JOINED') {
        navigate(`/error?code=403&message=${encodeURIComponent('This account is already connected to this game. If you are reconnecting, please close other tabs or devices.')}`);
      } else {
        handleError(500, data.message || 'Failed to join game room');
      }
    });

    socket.on('ROOM_JOINED', (data: { pin: string; session: any }) => {
      console.log('Successfully joined room:', data.pin);
    });

    // Player connection tracking
    socket.on('PLAYER_CONNECTED', (data: { pin: string; playerId: string; connected: boolean }) => {
      if (data.pin === pin) {
        setPlayers(prevPlayers => 
          prevPlayers.map(p => 
            p.id === data.playerId ? { ...p, connected: data.connected } : p
          )
        );
      }
    });

    socket.on('PLAYER_DISCONNECTED', (data: { pin: string; playerId: string; connected: boolean }) => {
      if (data.pin === pin) {
        setPlayers(prevPlayers => 
          prevPlayers.map(p => 
            p.id === data.playerId ? { ...p, connected: data.connected } : p
          )
        );
      }
    });

    // Robust delivery: ACK for START_SIGNAL
    socket.on('START_SIGNAL', (data: { pin: string; quiz: any }) => {
      console.log('[CLIENT] Received START_SIGNAL', data);
      socket.emit('EVENT_ACK', { pin: data.pin, playerId: humanId.current, event: 'START_SIGNAL' });
      // Optionally, trigger any UI or state update if needed
    });

    socket.on('STATE_SYNC', (data: { pin: string; state: any; index?: number; timeLeft?: number }) => {
      if (!isHost && data.pin === pin) {
        console.log('[CLIENT] Received STATE_SYNC', data);
        // Send ACK for STATE_SYNC
        socket.emit('EVENT_ACK', { pin, playerId: humanId.current, event: 'STATE_SYNC' });
        // Always update question index and game state
        if (data.index !== undefined) {
          setCurrentQuestionIndex(data.index);
        }
        if (data.timeLeft !== undefined) {
          setTimeLeft(data.timeLeft);
        } else if (data.state === GameState.QUESTION_ACTIVE || Number(data.state) === GameState.QUESTION_ACTIVE) {
          setTimeLeft(() => {
            const idx = data.index !== undefined ? data.index : currentQuestionIndex;
            const limit = quiz?.questions?.[idx]?.timeLimit || 20;
            return limit;
          });
        }
        if (data.state === GameState.QUESTION_INTRO || Number(data.state) === GameState.QUESTION_INTRO) {
          setAnswersSubmitted({});
        }
        setGameState(data.state as GameState);
      }
    });

    socket.on('SCORE_SYNC', (data: { pin: string; players: Player[] }) => {
      if (!isHost && data.pin === pin) {
        setPlayers(data.players);
      }
    });

    socket.on('ANSWER_SUBMITTED', (data: { pin: string; playerId: string; answer: any }) => {
      if (data.pin === pin) {
        // All players (including host) update their local state when anyone submits
        setAnswersSubmitted(prev => ({ ...prev, [data.playerId]: data.answer }));
      }
    });
  };

  // New version that accepts quiz parameter to avoid async state issues
  const beginQuestionSequenceWithQuiz = (quizData: Quiz, index: number) => {
    if (!quizData) {
      console.error('Quiz data is null in beginQuestionSequenceWithQuiz');
      return;
    }
    
    console.log('Starting question sequence, index:', index, 'quiz:', quizData.title);
    
    setCurrentQuestionIndex(index);
    setGameState(GameState.QUESTION_INTRO);
    setAnswersSubmitted({});
    botTimerRefs.current.forEach(t => clearTimeout(t));
    botTimerRefs.current = [];
    
    if (isHost && socket && pin) {
      socket.emit('STATE_SYNC', { pin, state: GameState.QUESTION_INTRO, index });
    }

    const limit = quizData.questions[index].timeLimit || 20;
    const gameMode = sessionStorage.getItem('gameMode');
    
    console.log('Setting timeout for QUESTION_ACTIVE transition in 3000ms');
    
    setTimeout(() => {
      console.log('Timeout fired, setting QUESTION_ACTIVE state');
      setGameState(GameState.QUESTION_ACTIVE);
      setTimeLeft(limit);
      
      if (isHost && socket && pin) {
        socket.emit('STATE_SYNC', { pin, state: GameState.QUESTION_ACTIVE, timeLeft: limit });
      }

      // Bot logic for solo mode
      if (gameMode === 'SOLO') {
        setPlayers(currentPlayers => {
          currentPlayers.forEach(p => {
            if (p.isBot) {
              const delay = 2000 + Math.random() * (limit * 500);
              const timer = window.setTimeout(() => {
                const q = quizData.questions[index];
                const isCorrect = Math.random() > 0.4;
                let botAns: any = 0;
                
                if (q.type === QuestionType.POLL) {
                  // For polls, bots just pick random options
                  botAns = Math.floor(Math.random() * (q.options?.length || 2));
                } else if (q.type === QuestionType.WORD_CLOUD) {
                  // For word clouds, bots submit relevant words
                  const wordOptions = ['amazing', 'great', 'fun', 'awesome', 'cool', 'nice', 'good', 'best', 'love', 'excellent'];
                  botAns = wordOptions[Math.floor(Math.random() * wordOptions.length)];
                } else if (q.type === QuestionType.AUDIO_QUIZ || q.type === QuestionType.IMAGE_QUIZ) {
                  // For audio and image quizzes, bots pick based on correctness
                  botAns = isCorrect ? (q.correctIndices?.[0] || 0) : (q.options?.length ? Math.floor(Math.random() * q.options.length) : 0);
                } else if (q.type === QuestionType.PUZZLE) {
                  botAns = q.correctSequence || [];
                } else if (q.type === QuestionType.INPUT) {
                  botAns = isCorrect ? (q.correctTexts?.[0] || 'ans') : 'wrong';
                } else if (q.type === QuestionType.MULTIPLE_CHOICE && q.correctIndices && q.correctIndices.length > 1) {
                  botAns = isCorrect ? q.correctIndices : [0];
                } else {
                  botAns = isCorrect ? (q.correctIndices?.[0] || 0) : (q.options?.length ? 1 : 0);
                }
                
                submitAnswer(p.id, botAns);
              }, delay);
              botTimerRefs.current.push(timer);
            }
          });
          return currentPlayers;
        });
      }
    }, 3000);
  };

  // Wrapper that uses current quiz state
  const beginQuestionSequence = (index: number) => {
    if (!quiz) {
      console.error('Quiz is null in beginQuestionSequence');
      return;
    }
    beginQuestionSequenceWithQuiz(quiz, index);
  };

  const submitAnswer = (playerId: string, answer: any) => {
    console.log('Answer submitted:', { playerId, answer, isHost, isSolo });
    
    // Immediately update local state
    setAnswersSubmitted(prev => ({ ...prev, [playerId]: answer }));
    
    // In multiplayer, broadcast to all other players via server
    if (!isSolo && socket && pin) {
      socket.emit('ANSWER_SUBMITTED', { pin, playerId, answer });
    }
  };

  useEffect(() => {
    if (gameState === GameState.QUESTION_ACTIVE && Object.keys(answersSubmitted).length === players.length) {
      console.log('All players answered, revealing answers in 800ms');
      if (isHost || isSolo) {
        setTimeout(revealAnswers, 800);
      }
    }
  }, [answersSubmitted, gameState, isHost, isSolo, players.length]);

  useEffect(() => {
    let timer: any;
    if (gameState === GameState.QUESTION_ACTIVE && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => Math.max(prev - 1, 0)), 1000);
    } else if (gameState === GameState.QUESTION_ACTIVE && timeLeft === 0) {
      console.log('Time expired, revealing answers');
      // Fallback: allow any client to reveal to avoid getting stuck if host disconnects
      revealAnswers();
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const revealAnswers = () => {
    if (!quiz || gameState !== GameState.QUESTION_ACTIVE) return;
    
    console.log('Revealing answers for question', currentQuestionIndex);
    const q = quiz.questions[currentQuestionIndex];
    const updatedPlayers = players.map(p => {
      const ans = answersSubmitted[p.id];
      let accuracy = 0;

      if (q.pointType === PointType.NONE) {
        accuracy = 0;
      } else if (q.type === QuestionType.PUZZLE) {
        // Normalize both arrays to ensure consistent comparison
        const userAnswer = Array.isArray(ans) ? ans : [];
        const correctAnswer = Array.isArray(q.correctSequence) ? q.correctSequence : [];
        
        // Check if arrays have same length and same elements in same order
        if (userAnswer.length !== correctAnswer.length) {
          accuracy = 0;
        } else {
          accuracy = userAnswer.every((item, idx) => String(item).trim() === String(correctAnswer[idx]).trim()) ? 1 : 0;
        }
      } else if (q.type === QuestionType.INPUT) {
        const userAns = (ans || '').toString().toLowerCase().trim();
        accuracy = (q.correctTexts || []).some(t => t.toLowerCase().trim() === userAns) ? 1 : 0;
      } else if (q.type === QuestionType.MULTIPLE_CHOICE && q.correctIndices && q.correctIndices.length > 1) {
        const userIndices = Array.isArray(ans) ? ans : [ans];
        const correctOnes = q.correctIndices;
        const correctCount = userIndices.filter(i => correctOnes.includes(i)).length;
        const wrongSelected = userIndices.some(i => !correctOnes.includes(i));
        accuracy = wrongSelected ? 0 : correctCount / correctOnes.length;
      } else {
        accuracy = (q.correctIndices || []).includes(ans) ? 1 : 0;
      }

      let max = 1000;
      if (q.pointType === PointType.HALF) max = 500;
      if (q.pointType === PointType.DOUBLE) max = 2000;

      const points = Math.floor(accuracy * (max * 0.7 + max * 0.3 * (timeLeft / (q.timeLimit || 20))));
      return {
        ...p,
        score: p.score + points,
        streak: accuracy > 0.9 ? p.streak + 1 : (accuracy > 0 ? p.streak : 0),
        lastAnswerCorrect: accuracy > 0
      };
    });

    console.log('Updated player scores:', updatedPlayers.map(p => ({ name: p.name, score: p.score })));
    setPlayers(updatedPlayers);
    console.log('Setting game state to ANSWER_REVEAL');
    setGameState(GameState.ANSWER_REVEAL);
    
    if (isHost && socket && pin) {
      socket.emit('SCORE_SYNC', { pin, players: updatedPlayers });
      socket.emit('STATE_SYNC', { pin, state: GameState.ANSWER_REVEAL });
    }
  };

  const handleNext = () => {
    if (!quiz) return;
    
    if (currentQuestionIndex + 1 < quiz.questions.length) {
      beginQuestionSequence(currentQuestionIndex + 1);
    } else {
      console.log('Setting game state to PODIUM');
      setGameState(GameState.PODIUM);
      
      if (isHost && socket && pin) {
        socket.emit('STATE_SYNC', { pin, state: GameState.PODIUM });
      }
      
      // End game and award points
      if (isSolo || isHost) {
        endGame();
      }
    }
  };

  const endGame = async () => {
    if (pin && !isSolo) {
      try {
        await gameAPI.end(pin, players);
        
        // Reload user to get updated stats
        if (user) {
          const humanPlayer = players.find(p => p.id === humanId.current);
          if (humanPlayer && humanPlayer.userId === user.id) {
            await updateUser({
              ...user,
              totalPoints: user.totalPoints + humanPlayer.score,
              xp: user.xp + Math.floor(humanPlayer.score / 10),
              coins: user.coins + Math.floor(humanPlayer.score / 100)
            });
          }
        }
      } catch (error) {
        console.error('Failed to end game:', error);
      }
    } else if (isSolo && user) {
      // Solo mode - manually update user
      const humanPlayer = players.find(p => p.id === humanId.current);
      if (humanPlayer) {
        await updateUser({
          ...user,
          totalPoints: user.totalPoints + humanPlayer.score,
          xp: user.xp + Math.floor(humanPlayer.score / 10),
          coins: user.coins + Math.floor(humanPlayer.score / 100)
        });
      }
    }
  };

  const handleRestart = () => {
    console.log('handleRestart called');
    sessionStorage.removeItem('soloQuizId');
    sessionStorage.removeItem('currentQuiz');
    sessionStorage.removeItem('gameMode');
    // Clean up guest ID for this session
    if (pin && !user?.id) {
      sessionStorage.removeItem(`quizly_guest_id_${pin}`);
    }
    navigate('/');
  };

  if (!quiz) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-white">Loading game...</div>
    </div>;
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const currentHumanPlayer = players.find(p => p.id === humanId.current);

  if (gameState === GameState.QUESTION_INTRO || gameState === GameState.QUESTION_ACTIVE) {
    return (
      <QuestionScreen
        question={currentQuestion}
        index={currentQuestionIndex + 1}
        total={quiz.questions.length}
        timeLeft={timeLeft}
        gameState={gameState}
        totalSubmissions={Object.keys(answersSubmitted).length}
        totalPlayers={players.length}
        onAnswer={(ans) => submitAnswer(humanId.current, ans)}
        humanAnswer={answersSubmitted[humanId.current]}
      />
    );
  }

  if (gameState === GameState.ANSWER_REVEAL) {
    const isPoll = currentQuestion.type === QuestionType.POLL;
    const isWordCloud = currentQuestion.type === QuestionType.WORD_CLOUD;
    
    if (isPoll) {
      // For polls, show distribution of responses
      const responseCounts: { [key: number]: number } = {};
      const totalResponses = Object.keys(answersSubmitted).length;
      
      Object.values(answersSubmitted).forEach((answer) => {
        const optionIndex = typeof answer === 'number' ? answer : 0;
        responseCounts[optionIndex] = (responseCounts[optionIndex] || 0) + 1;
      });
      
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950/40 p-3 sm:p-4 md:p-8 text-center animate-in fade-in duration-500">
          <div className="mb-6 sm:mb-8 md:mb-12 w-full max-w-4xl mx-auto">
            <div className="text-blue-400 mb-4 sm:mb-6 md:mb-8">
              <i className="bi bi-bar-chart-fill text-[4rem] sm:text-[6rem] md:text-[10rem] drop-shadow-[0_0_50px_rgba(59,130,246,0.3)]"></i>
              <div className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-widest mt-3 sm:mt-4 md:mt-6">Poll Results</div>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mt-2 sm:mt-3 md:mt-4 uppercase tracking-widest">Everyone's opinion counts!</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 space-y-2.5 sm:space-y-3 md:space-y-4">
              {(currentQuestion.options || []).map((option, idx) => {
                const count = responseCounts[idx] || 0;
                const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
                const isHumanChoice = answersSubmitted[humanId.current] === idx;
                
                return (
                  <div key={idx} className={`relative p-4 rounded-2xl ${isHumanChoice ? 'bg-blue-500/10 border-2 border-blue-500/50' : 'bg-white/5 border border-white/10'}`}>
                    <div className="flex items-center justify-between mb-2 relative z-10">
                      <div className="flex items-center gap-3">
                        {isHumanChoice && <i className="bi bi-check-circle-fill text-blue-400"></i>}
                        <span className="text-white font-bold">{option}</span>
                      </div>
                      <span className="text-2xl font-black text-white">{percentage}%</span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{count} {count === 1 ? 'vote' : 'votes'}</div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {(isHost || isSolo) ? (
            <button
              onClick={() => {
                console.log('Transitioning from ANSWER_REVEAL (POLL) to LEADERBOARD');
                setGameState(GameState.LEADERBOARD);
                if (isHost && socket && pin) {
                  socket.emit('STATE_SYNC', { pin, state: GameState.LEADERBOARD });
                }
              }}
              className="bg-white text-slate-900 px-16 py-5 rounded-full text-2xl font-black transition-all hover:scale-105 active:scale-95 shadow-2xl mt-8"
            >
              Continue
            </button>
          ) : (
            <p className="text-slate-500 font-bold uppercase tracking-[0.4em] animate-pulse">
              Waiting for host...
            </p>
          )}
        </div>
      );
    }

    if (isWordCloud) {
      // For word clouds, aggregate responses and show word frequency cloud
      const wordCounts: { [word: string]: number } = {};
      const humanAnswer = answersSubmitted[humanId.current];
      
      Object.values(answersSubmitted).forEach((answer) => {
        if (typeof answer === 'string' && answer.trim()) {
          const word = answer.trim().toLowerCase();
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
      
      // Get max count for sizing
      const maxCount = Math.max(...Object.values(wordCounts), 1);
      const minCount = Math.min(...Object.values(wordCounts), 1);
      
      // Sort by frequency
      const sortedWords = Object.entries(wordCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 30); // Show top 30 words
      
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950/40 p-3 sm:p-4 md:p-8 text-center animate-in fade-in duration-500">
          <div className="mb-6 sm:mb-8 md:mb-12 w-full max-w-4xl mx-auto">
            <div className="text-purple-400 mb-4 sm:mb-6 md:mb-8">
              <i className="bi bi-cloud-fill text-[4rem] sm:text-[6rem] md:text-[10rem] drop-shadow-[0_0_50px_rgba(168,85,247,0.3)]"></i>
              <div className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-widest mt-3 sm:mt-4 md:mt-6">Word Cloud</div>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mt-2 sm:mt-3 md:mt-4 uppercase tracking-widest">See what everyone thought!</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-3 sm:p-6 md:p-8 min-h-48 sm:min-h-64 md:min-h-96 flex items-center justify-center">
              <div className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 justify-center items-center max-w-3xl">
                {sortedWords.length > 0 ? (
                  sortedWords.map(([word, count]) => {
                    // Calculate font size based on frequency (20px to 60px)
                    const ratio = (count - minCount) / (maxCount - minCount || 1);
                    const fontSize = 20 + ratio * 40;
                    const isHumanAnswer = word === humanAnswer?.trim().toLowerCase();
                    
                    return (
                      <div
                        key={word}
                        className={`transition-all text-center ${isHumanAnswer ? 'text-blue-400' : 'text-slate-300'}`}
                      >
                        <div style={{ fontSize: `${fontSize}px` }} className="font-black leading-none">
                          {word}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">({count})</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-slate-500 text-xl">No responses yet...</div>
                )}
              </div>
            </div>
          </div>
          
          {(isHost || isSolo) ? (
            <button
              onClick={() => {
                console.log('Transitioning from ANSWER_REVEAL (WORD_CLOUD) to LEADERBOARD');
                setGameState(GameState.LEADERBOARD);
                if (isHost && socket && pin) {
                  socket.emit('STATE_SYNC', { pin, state: GameState.LEADERBOARD });
                }
              }}
              className="bg-white text-slate-900 px-16 py-5 rounded-full text-2xl font-black transition-all hover:scale-105 active:scale-95 shadow-2xl mt-8"
            >
              Continue
            </button>
          ) : (
            <p className="text-slate-500 font-bold uppercase tracking-[0.4em] animate-pulse">
              Waiting for host...
            </p>
          )}
        </div>
      );
    }

    const correctAnswerDisplay = currentQuestion.type === QuestionType.INPUT
      ? (currentQuestion.correctTexts || []).join(' | ')
      : currentQuestion.type === QuestionType.TRUE_FALSE
      ? ((currentQuestion.correctIndices?.[0] ?? 0) === 0 ? 'True' : 'False')
      : currentQuestion.type === QuestionType.PUZZLE
      ? (currentQuestion.correctSequence || []).join(' → ')
      : (currentQuestion.correctIndices || []).map(idx => (currentQuestion.options || [])[idx]).join(' | ');

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950/40 p-8 text-center animate-in fade-in duration-500">
        <div className="mb-12 w-full max-w-4xl mx-auto">
          {currentHumanPlayer?.lastAnswerCorrect ? (
            <div className="text-emerald-400">
              <i className="bi bi-check-circle-fill text-[12rem] drop-shadow-[0_0_50px_rgba(16,185,129,0.3)]"></i>
              <div className="text-5xl font-black uppercase tracking-widest mt-6">Correct!</div>
            </div>
          ) : (
            <div className="text-rose-500">
              <i className="bi bi-x-circle-fill text-[10rem] drop-shadow-[0_0_50px_rgba(244,63,94,0.3)]"></i>
              <div className="text-5xl font-black uppercase tracking-widest mt-6">Incorrect</div>
              {correctAnswerDisplay && (
                <div className="mt-8 bg-rose-500/10 border border-rose-500/20 p-6 rounded-3xl max-w-xl mx-auto">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-500/60 block mb-2">
                    Correct Answer
                  </span>
                  <span className="text-2xl font-black text-white uppercase">{correctAnswerDisplay}</span>
                </div>
              )}
            </div>
          )}
        </div>
        {(isHost || isSolo) ? (
          <button
            onClick={() => {
              console.log('Transitioning from ANSWER_REVEAL to LEADERBOARD');
              setGameState(GameState.LEADERBOARD);
              if (isHost && socket && pin) {
                socket.emit('STATE_SYNC', { pin, state: GameState.LEADERBOARD });
              }
            }}
            className="bg-white text-slate-900 px-16 py-5 rounded-full text-2xl font-black transition-all hover:scale-105 active:scale-95 shadow-2xl mt-8"
          >
            Continue
          </button>
        ) : (
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] animate-pulse">
            Waiting for host...
          </p>
        )}
      </div>
    );
  }

  if (gameState === GameState.LEADERBOARD) {
    return (
      <Leaderboard
        players={players}
        humanId={humanId.current}
        isSolo={isSolo}
        isHost={isHost}
        onNext={handleNext}
        questionsAnswered={currentQuestionIndex + 1}
      />
    );
  }

  if (gameState === GameState.PODIUM) {
    console.log('Rendering PODIUM state');
    return (
      <Podium
        players={players}
        humanId={humanId.current}
        user={user}
        onRestart={handleRestart}
        onUpdateUser={updateUser}
      />
    );
  }

  return null;
};

export default GamePage;
