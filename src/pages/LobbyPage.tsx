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
  const handleError = useErrorHandler();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [sessionCreatedAt, setSessionCreatedAt] = useState<Date>(new Date());

  useEffect(() => {
    if (!pin) {
      navigate('/');
      return;
    }

    // Wait for user context to load before connecting
    if (userLoading) {
      return;
    }

    // Don't reload session if already loaded
    if (sessionLoaded) {
      return;
    }

    console.log('[LOBBY] Initializing lobby connection...');

    // Connect to socket
    console.log('[LOBBY] Creating socket connection...');
    const newSocket = io('/', {
      withCredentials: true
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
  }, [pin, userLoading]);

  const setupSocketListeners = (socket: Socket) => {
    // Room validation
    socket.on('ROOM_ERROR', (data: { error: string; message: string }) => {
      console.error('[LOBBY] ROOM_ERROR received:', data);
      if (data.error === 'ROOM_NOT_FOUND') {
        navigate(`/error?code=410&message=${encodeURIComponent('This game session has ended or does not exist')}`);
      } else {
        handleError(500, data.message || 'Failed to join lobby');
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
      if (data.pin === pin) {
        // Mark player as disconnected
        setPlayers(prevPlayers => 
          prevPlayers.map(p => 
            p.id === data.playerId ? { ...p, connected: data.connected } : p
          )
        );
        
        // Remove disconnected player after 10 seconds if they don't reconnect
        // (gives time for page refreshes)
        setTimeout(() => {
          setPlayers(prevPlayers => {
            const player = prevPlayers.find(p => p.id === data.playerId);
            // Only remove if still disconnected, not the host, and not a bot
            if (player && player.connected === false && !player.isHost && !player.isBot) {
              const newPlayers = prevPlayers.filter(p => p.id !== data.playerId);
              // Notify server to update players list
              socket.emit('REMOVE_PLAYER', { pin, playerId: data.playerId });
              return newPlayers;
            }
            return prevPlayers;
          });
        }, 10000); // Increased from 3 to 10 seconds
      }
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
      socket.emit('JOIN_ROOM', { pin, playerId });
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
      navigate(`/game/${pin}`);
    }
  };

  const handleExit = () => {
    if (socket) {
      socket.disconnect();
    }
    navigate('/');
  };

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
