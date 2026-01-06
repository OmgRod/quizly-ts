import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import GameLobby from '../components/GameLobby';
import { gameAPI } from '../api';
import { useUser } from '../context/UserContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { Player, Quiz } from '../types';

const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { pin } = useParams<{ pin: string }>();
  const { user, loading: userLoading } = useUser();
  const { handleError } = useErrorHandler();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [sessionCreatedAt, setSessionCreatedAt] = useState<Date>(new Date());
  const [needsGuestName, setNeedsGuestName] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState('');

  useEffect(() => {
    if (!pin) {
      navigate('/');
      return;
    }

    // Wait for user context to load before connecting
    if (userLoading) {
      return;
    }

    // Check if guest user needs to provide a name
    if (!user && !sessionStorage.getItem('guestName')) {
      setNeedsGuestName(true);
      return;
    }

    // Don't reload session if already loaded
    if (sessionLoaded) {
      return;
    }

    console.log('[LOBBY] Initializing lobby connection...');

    // Connect to socket with mobile-optimized settings
    console.log('[LOBBY] Creating socket connection...');
    const newSocket = io('/', {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000 // 20 second timeout for mobile networks
    });
    
    // Setup socket listeners BEFORE connecting
    setupSocketListeners(newSocket);
    
    newSocket.on('connect', () => {
      console.log('[LOBBY] Socket connected with ID:', newSocket.id);
      // Load session only after socket is connected
      loadSession(newSocket);
    });
    
    newSocket.on('disconnect', () => {
      console.log('[LOBBY] Socket disconnected');
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('[LOBBY] Socket connection error:', error);
    });
    
    setSocket(newSocket);
    
    // Mark as loaded to prevent re-initialization
    setSessionLoaded(true);

    return () => {
      console.log('[LOBBY] Cleaning up socket connection...');
      newSocket.disconnect();
    };
  }, [pin, userLoading, needsGuestName, user, navigate]);

  const setupSocketListeners = (socket: Socket) => {
    // Room validation
    socket.on('ROOM_ERROR', (data: { error: string; message: string }) => {
      console.error('[LOBBY] ROOM_ERROR received:', data);
      if (data.error === 'ROOM_NOT_FOUND') {
        navigate(`/error?code=410&message=${encodeURIComponent('This game session has ended or does not exist')}`);
      } else {
        // Ignore ALREADY_JOINED error and allow user to proceed
        // Optionally log or show a non-blocking message
        console.warn('[LOBBY] Ignored ALREADY_JOINED error:', data);
      }
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
      // No-op: player removal is handled by LOBBY_UPDATE from server
    });

    socket.on('LOBBY_UPDATE', (data: { pin: string; players: Player[] }) => {
      console.log('[LOBBY] LOBBY_UPDATE received:', { pin: data.pin, playersCount: data.players.length, players: data.players });
      if (data.pin === pin) {
        console.log('[LOBBY] Updating players state with', data.players.length, 'players');
        setPlayers(data.players);
      } else {
        console.log('[LOBBY] Ignoring LOBBY_UPDATE for different pin:', data.pin, 'vs', pin);
      }
    });

    socket.on('START_SIGNAL', (data: { pin: string; quiz: Quiz }) => {
      if (data.pin === pin) {
        navigate(`/game/${pin}`);
      }
    });
  };

  const loadSession = async (socket: Socket) => {
    if (!pin) return;
    
    console.log('[LOBBY] Loading session for PIN:', pin);
    try {
      const response = await gameAPI.getByPin(pin);
      const session = response.data.session;
      console.log('[LOBBY] Session loaded:', { 
        pin: session.pin, 
        playersCount: session.players?.length || 0,
        hostId: session.hostId,
        currentUserId: user?.id 
      });
      setPlayers((session.players as Player[]) || []);
      setQuiz(session.quiz);
      setSessionCreatedAt(new Date(session.createdAt));
      setIsHost(user?.id === session.hostId);

      // Get player info - use persistent ID from sessionStorage (per-tab)
      const guestName = sessionStorage.getItem('guestName');
      const playerName = user?.username || guestName || 'Guest';
      
      // For logged-in users, use their user ID
      // For guests, use or create a persistent guest ID
      let playerId: string;
      if (user?.id) {
        playerId = user.id;
        // Clean up any guest ID if user is logged in
        const sessionKey = `quizly_guest_id_${pin}`;
        sessionStorage.removeItem(sessionKey);
      } else {
        // Check if we already have a guest ID for this session + tab
        // Use sessionStorage (per-tab) instead of localStorage (shared across tabs)
        const sessionKey = `quizly_guest_id_${pin}`;
        const storedGuestId = sessionStorage.getItem(sessionKey);
        if (storedGuestId) {
          playerId = storedGuestId;
        } else {
          playerId = `guest_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem(sessionKey, playerId);
        }
      }

      // Join room with validation - wait for room joined confirmation
      // Set up the listener BEFORE emitting JOIN_ROOM
      socket.once('ROOM_JOINED', () => {
        console.log('ROOM_JOINED event received, checking for existing player...');
        const existingPlayer = (session.players as any[])?.find((p: any) => p.id === playerId);
        
        if (!existingPlayer) {
          console.log('New player - emitting PLAYER_JOINED for:', playerId);
          // Only create new player if doesn't exist
          const newPlayer: Player = {
            id: playerId,
            name: user?.anonymousMode ? 'Anonymous' : playerName,
            score: 0,
            lastAnswerCorrect: false,
            streak: 0,
            isBot: false,
            userId: user?.id,
            isHost: user?.id === session.hostId,
            connected: true,
            anonymousMode: user?.anonymousMode
          };

          socket.emit('PLAYER_JOINED', { pin, player: newPlayer });
        } else {
          // Player already exists, just mark as reconnected
          console.log('Reconnecting as existing player:', playerId);
        }
      });
      
      // Now emit JOIN_ROOM
      console.log('Emitting JOIN_ROOM for player:', playerId);
      const joinRoomPayload: any = { pin, playerId };
      if (user?.id) joinRoomPayload.userId = user.id;
      socket.emit('JOIN_ROOM', joinRoomPayload);
    } catch (error: any) {
      console.error('Failed to load session:', error);
      // Check if it's a 404 response from the server
      if (error.response?.status === 404 || error.response?.data?.error?.includes('not found')) {
        navigate(`/error?code=410&message=${encodeURIComponent('This game session has ended or does not exist')}`);
      } else if (error.response) {
        // Server responded with an error
        handleError(error.response.status, error.response.data?.error || 'Failed to load game session');
      } else {
        // Network or other error
        handleError(500, 'Failed to load game session');
      }
    }
  };

  const handleStart = () => {
    if (socket && pin && quiz && isHost) {
      socket.emit('START_SIGNAL', { pin, quiz });
      socket.disconnect();
      navigate(`/game/${pin}`);
    }
  };

  const handleExit = () => {
    if (socket) {
      socket.disconnect();
    }
    navigate('/');
  };

  const handleGuestNameSubmit = () => {
    if (guestNameInput.trim()) {
      sessionStorage.setItem('guestName', guestNameInput.trim());
      setNeedsGuestName(false);
    }
  };

  // Show guest name prompt if needed
  if (needsGuestName) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,#1e1b4b_0%,#020617_60%)]"></div>
        <div className="glass p-8 rounded-[2rem] border-white/10 space-y-6 max-w-md w-full relative z-10 animate-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-3xl mx-auto mb-4">
              <i className="bi bi-person-fill"></i>
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Enter Your Name</h3>
            <p className="text-slate-400 text-sm">Choose a nickname to join the game</p>
          </div>
          <input 
            type="text" 
            placeholder="Your Nickname" 
            value={guestNameInput}
            onChange={(e) => setGuestNameInput(e.target.value)}
            maxLength={30}
            className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white font-bold text-xl focus:outline-none focus:border-blue-500 transition-colors"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleGuestNameSubmit()}
          />
          <button 
            onClick={handleGuestNameSubmit}
            className="w-full bg-blue-500 hover:bg-blue-400 text-white font-black py-5 rounded-2xl text-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-30"
            disabled={!guestNameInput.trim()}
          >
            JOIN GAME
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-full text-slate-500 font-bold hover:text-slate-300 transition-colors text-xs uppercase tracking-widest pt-2"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <GameLobby
      pin={pin || ''}
      players={players}
      onStart={handleStart}
      quizTitle={quiz?.title || 'Loading...'}
      isHost={isHost}
      createdAt={sessionCreatedAt}
      onExit={handleExit}
    />
  );
};

export default LobbyPage;
