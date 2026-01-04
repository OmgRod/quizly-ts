// Track pending ACKs for critical events per room and player
const pendingAcks: Map<string, Map<string, { event: string; payload: any }>> = new Map(); // pin -> playerId -> {event, payload}

import { Server, Socket } from 'socket.io';
import prisma from './prisma.js';

// GameState enum to convert numeric values to strings for database
enum GameState {
  HOME,
  BROWSE,
  AUTH,
  CREATING,
  EDITOR,
  LOBBY,
  QUESTION_INTRO,
  QUESTION_ACTIVE,
  ANSWER_REVEAL,
  LEADERBOARD,
  PODIUM,
  DASHBOARD,
  EXPLORE,
  ACCOUNT,
  JOIN,
  GAME
}

interface Player {
  id: string;
  name: string;
  score: number;
  lastAnswerCorrect: boolean;
  streak: number;
  isBot: boolean;
  userId?: string;
  isHost?: boolean;
  connected?: boolean;
  socketId?: string;
  anonymousMode?: boolean;
}

// Track connected players by room
const roomConnections: Map<string, Map<string, string>> = new Map(); // pin -> playerId -> socketId

// Function to check if all players are bots
function hasRealPlayers(players: any[]): boolean {
  return players.some((p: any) => !p.isBot);
}

// Cleanup inactive game sessions (no real players + inactive for 10+ minutes)
// Also cleanup games where all real players are disconnected
async function cleanupInactiveSessions() {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    
    // Get all sessions
    const allSessions = await prisma.gameSession.findMany({});

    for (const session of allSessions) {
      let shouldDelete = false;
      let reason = '';
      
      // Parse players and check if there are real (non-bot) players
      let players: any[] = [];
      try {
        players = typeof session.players === 'string' ? JSON.parse(session.players) : (Array.isArray(session.players) ? session.players : []);
      } catch (e) {
        console.error(`Failed to parse players for session ${session.pin}:`, e);
        players = [];
      }

      const realPlayers = players.filter((p: any) => !p.isBot);
      const connectedRealPlayers = realPlayers.filter((p: any) => p.connected !== false);
      
      // Condition 1: No real players at all (only bots or empty) and inactive for 10+ minutes
      if (!hasRealPlayers(players) && session.lastActiveAt < tenMinutesAgo) {
        shouldDelete = true;
        reason = 'no real players, inactive for 10+ minutes';
      }
      
      // Condition 2: All real players are disconnected and session is older than 2 minutes
      else if (realPlayers.length > 0 && connectedRealPlayers.length === 0 && session.lastActiveAt < twoMinutesAgo) {
        shouldDelete = true;
        reason = 'all real players disconnected for 2+ minutes';
      }
      
      // Condition 3: Very old sessions (inactive for 30+ minutes) regardless of state
      else if (session.lastActiveAt < new Date(Date.now() - 30 * 60 * 1000)) {
        shouldDelete = true;
        reason = 'inactive for 30+ minutes';
      }

      if (shouldDelete) {
        await prisma.gameSession.delete({
          where: { id: session.id }
        });
        console.log(`[CLEANUP] Deleted session: ${session.pin} (${reason})`);
        
        // Clean up room connections
        roomConnections.delete(session.pin);
      }
    }
  } catch (error) {
    console.error('[CLEANUP] Error during cleanup:', error);
  }
}

export function setupSocketHandlers(io: Server) {
  // Start cleanup task - runs every 2 minutes to check for disconnected players
  const cleanupInterval = setInterval(cleanupInactiveSessions, 2 * 60 * 1000);
  
  // Run initial cleanup on startup
  cleanupInactiveSessions();
  
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    // Join a game room - validate room exists first
    socket.on('JOIN_ROOM', async (data: { pin: string; playerId?: string; userId?: string }) => {
      try {
        const { pin, playerId } = data;
        
        // Check if game session exists
        const session = await prisma.gameSession.findUnique({
          where: { pin },
          include: { quiz: true }
        });

        if (!session) {
          // Room doesn't exist - send error
          socket.emit('ROOM_ERROR', { 
            error: 'ROOM_NOT_FOUND',
            message: 'This game room does not exist or has expired'
          });
          return;
        }

        // Join the socket room
        socket.join(pin);
        
        // Track connection
        if (playerId) {
          if (!roomConnections.has(pin)) {
            roomConnections.set(pin, new Map());
          }
          // Parse players array
          let players: any[] = [];
          try {
            players = typeof session.players === 'string' ? JSON.parse(session.players) : (Array.isArray(session.players) ? session.players : []);
          } catch (e) {
            console.error('Failed to parse players:', e);
            players = [];
          }
          // Prevent duplicate account join
          // Strict duplicate join prevention
          if (data.userId) {
            // Authenticated: block if any connected player has same userId (except this socket)
            const alreadyIn = players.find((p: any) =>
              p.userId === data.userId &&
              p.connected !== false &&
              p.socketId !== socket.id
            );
            if (alreadyIn) {
              socket.emit('ROOM_ERROR', {
                error: 'ALREADY_JOINED',
                message: 'This account is already connected to this game.'
              });
              console.warn(`[SERVER] Prevented duplicate join for userId ${data.userId} in room ${pin}`);
              return;
            }
          } else {
            // Guest: block if any connected player has same playerId (except this socket)
            const alreadyIn = players.find((p: any) =>
              p.id === playerId &&
              p.connected !== false &&
              p.socketId !== socket.id
            );
            if (alreadyIn) {
              socket.emit('ROOM_ERROR', {
                error: 'ALREADY_JOINED',
                message: 'This guest is already connected to this game.'
              });
              console.warn(`[SERVER] Prevented duplicate join for guest playerId ${playerId} in room ${pin}`);
              return;
            }
          }
          // If player already had a connection, it means they're reconnecting
          const oldSocketId = roomConnections.get(pin)!.get(playerId);
          if (oldSocketId && oldSocketId !== socket.id) {
            console.log(`Player ${playerId} reconnecting with new socket ${socket.id}, old socket was ${oldSocketId}`);
          }
          // Update to new socket ID in roomConnections
          roomConnections.get(pin)!.set(playerId, socket.id);
          // Update player connection status and socketId in session.players array
          const player = players.find((p: any) => p.id === playerId);
          if (player) {
            player.connected = true;
            player.socketId = socket.id;
            await prisma.gameSession.update({
              where: { pin },
              data: { 
                players: JSON.stringify(players),
                lastActiveAt: new Date()
              }
            });
            // Send updated session with connected player to the reconnecting client
            const updatedSession = await prisma.gameSession.findUnique({
              where: { pin },
              include: { quiz: true }
            });
            // Notify ALL clients in the room (including this one) about the updated players
            io.to(pin).emit('LOBBY_UPDATE', { 
              pin, 
              players: typeof updatedSession?.players === 'string' ? JSON.parse(updatedSession.players) : [] 
            });
            console.log(`[SERVER] Player ${playerId} marked as connected and socketId updated in both roomConnections and session.players array: ${socket.id}`);
          }
          // Extra logging to confirm both sources
          console.log(`[SERVER] roomConnections for ${pin}:`, Array.from(roomConnections.get(pin)!.entries()));
        }
        
        // Send success confirmation
        socket.emit('ROOM_JOINED', { pin, session });
        
        console.log(`Player ${playerId || socket.id} joined room ${pin}`);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('ROOM_ERROR', { 
          error: 'JOIN_FAILED',
          message: 'Failed to join game room'
        });
      }
    });

    // Player joins a game lobby
    socket.on('PLAYER_JOINED', async (data: { pin: string; player: Player }) => {
      try {
        const { pin, player } = data;
        console.log('[SERVER] PLAYER_JOINED received:', { pin, playerId: player.id, playerName: player.name });
        
        // Join the room
        socket.join(pin);

        // Update session with new player
        const session = await prisma.gameSession.findUnique({
          where: { pin }
        });

        if (session) {
          let players: any[] = [];
          try {
            players = typeof session.players === 'string' ? JSON.parse(session.players) : (Array.isArray(session.players) ? session.players : []);
          } catch (e) {
            console.error('Failed to parse players:', e);
            players = [];
          }
          
          // Check if player already exists
          if (!players.find((p: any) => p.id === player.id)) {
            console.log('[SERVER] Adding new player to session:', player.id);
            players.push(player);
            
            await prisma.gameSession.update({
              where: { pin },
              data: { 
                players: JSON.stringify(players),
                lastActiveAt: new Date()
              }
            });
            
            console.log('[SERVER] Broadcasting LOBBY_UPDATE to room', pin, 'with', players.length, 'players');
            // Broadcast to all clients in the room
            io.to(pin).emit('LOBBY_UPDATE', { pin, players });
          } else {
            console.log('[SERVER] Player already exists in session:', player.id);
          }
        }
      } catch (error) {
        console.error('Player joined error:', error);
      }
    });

    // Host updates lobby
    socket.on('LOBBY_UPDATE', async (data: { pin: string; players: Player[] }) => {
      try {
        const { pin, players } = data;

        await prisma.gameSession.update({
          where: { pin },
          data: { players: JSON.stringify(players) }
        });

        // Broadcast to all clients except sender
        socket.to(pin).emit('LOBBY_UPDATE', { pin, players });
      } catch (error) {
        console.error('Lobby update error:', error);
      }
    });

    // Host starts the game
    socket.on('START_SIGNAL', async (data: { pin: string; quiz: any }) => {
      try {
        const { pin, quiz } = data;

        await prisma.gameSession.update({
          where: { pin },
          data: { 
            state: 'QUESTION_INTRO',
            currentQuestionIndex: 0,
            lastActiveAt: new Date()
          }
        });

        // Broadcast to all clients in the room and track pending ACKs
        const session = await prisma.gameSession.findUnique({ where: { pin } });
        let players: any[] = [];
        try {
          players = typeof session?.players === 'string' ? JSON.parse(session.players) : (Array.isArray(session?.players) ? session.players : []);
        } catch (e) { players = []; }
        if (!pendingAcks.has(pin)) pendingAcks.set(pin, new Map());
        players.forEach((p: any) => {
          if (p.id) {
            pendingAcks.get(pin)!.set(p.id, { event: 'START_SIGNAL', payload: { pin, quiz } });
            const playerSocketId = roomConnections.get(pin)?.get(p.id);
            if (playerSocketId) {
              console.log(`[SERVER] Emitting START_SIGNAL to player ${p.id} (socket ${playerSocketId}) in room ${pin}`);
              io.to(playerSocketId).emit('START_SIGNAL', { pin, quiz });
            } else {
              console.warn(`[SERVER] No socketId for player ${p.id} in room ${pin} when emitting START_SIGNAL`);
            }
          }
        });
      } catch (error) {
        console.error('Start signal error:', error);
      }
    });

    // Remove a disconnected player
    socket.on('REMOVE_PLAYER', async (data: { pin: string; playerId: string }) => {
      try {
        const { pin, playerId } = data;
        
        const session = await prisma.gameSession.findUnique({
          where: { pin }
        });
        
        if (session) {
          let players: any[] = [];
          try {
            players = typeof session.players === 'string' ? JSON.parse(session.players) : (Array.isArray(session.players) ? session.players : []);
          } catch (e) {
            console.error('Failed to parse players:', e);
            players = [];
          }
          
          // Remove the player
          const newPlayers = players.filter((p: any) => p.id !== playerId);
          
          await prisma.gameSession.update({
            where: { pin },
            data: { players: JSON.stringify(newPlayers) }
          });
          
          // Broadcast updated player list
          io.to(pin).emit('LOBBY_UPDATE', { pin, players: newPlayers });
          console.log(`Player ${playerId} removed from room ${pin}`);
        }
      } catch (error) {
        console.error('Remove player error:', error);
      }
    });

    // Player submits an answer
    socket.on('ANSWER_SUBMITTED', (data: { pin: string; playerId: string; answer: any }) => {
      // Broadcast to all players in the room (including sender for confirmation)
      io.to(data.pin).emit('ANSWER_SUBMITTED', data);
    });

    // Host syncs game state
    socket.on('STATE_SYNC', async (data: { pin: string; state: any; index?: number }) => {
      try {
        const { pin, state, index } = data;

        // Convert numeric enum to string for database
        const stateString = typeof state === 'number' ? GameState[state] : state;

        const updateData: any = { state: stateString };
        if (index !== undefined) {
          updateData.currentQuestionIndex = index;
        }

        // When game starts (first question intro), mark as inactive so no new players can join
        if (state === GameState.QUESTION_INTRO && index === 0) {
          updateData.isActive = false;
        }

        await prisma.gameSession.update({
          where: { pin },
          data: updateData
        });

        // Broadcast to all clients except sender and track pending ACKs
        const session = await prisma.gameSession.findUnique({ where: { pin } });
        let players: any[] = [];
        try {
          players = typeof session?.players === 'string' ? JSON.parse(session.players) : (Array.isArray(session?.players) ? session.players : []);
        } catch (e) { players = []; }
        if (!pendingAcks.has(pin)) pendingAcks.set(pin, new Map());
        players.forEach((p: any) => {
          if (p.id && p.id !== undefined && p.id !== null) {
            // Always use roomConnections for up-to-date socketId
            const playerSocketId = roomConnections.get(pin)?.get(p.id);
            if (playerSocketId && playerSocketId !== socket.id) {
              pendingAcks.get(pin)!.set(p.id, { event: 'STATE_SYNC', payload: data });
              console.log(`[SERVER] Emitting STATE_SYNC to player ${p.id} (socket ${playerSocketId}) in room ${pin} with state`, data);
              io.to(playerSocketId).emit('STATE_SYNC', data);
            } else if (!playerSocketId) {
              console.warn(`[SERVER] No socketId for player ${p.id} in room ${pin} when emitting STATE_SYNC`);
            }
          }
        });
      } catch (error) {
        console.error('State sync error:', error);
      }
    });
    // Handle ACKs from clients for critical events
    socket.on('EVENT_ACK', (data: { pin: string; playerId: string; event: string }) => {
      const { pin, playerId, event } = data;
      console.log(`[SERVER] Received EVENT_ACK for ${event} from player ${playerId} in room ${pin}`);
      if (pendingAcks.has(pin)) {
        const playerMap = pendingAcks.get(pin)!;
        if (playerMap.has(playerId) && playerMap.get(playerId)!.event === event) {
          playerMap.delete(playerId);
        }
      }
    });

    // On reconnect or join, resend any pending critical events
    socket.on('JOIN_ROOM', async (data: { pin: string; playerId?: string; userId?: string }) => {
      // ...existing code...

      // After join logic, check for pending ACKs
      if (data.playerId && pendingAcks.has(data.pin)) {
        const playerMap = pendingAcks.get(data.pin)!;
        if (playerMap.has(data.playerId)) {
          const pending = playerMap.get(data.playerId)!;
          socket.emit(pending.event, pending.payload);
        }
      }
    });

    // Host syncs scores
    socket.on('SCORE_SYNC', async (data: { pin: string; players: Player[] }) => {
      try {
        const { pin, players } = data;

        await prisma.gameSession.update({
          where: { pin },
          data: { 
            players: JSON.stringify(players),
            lastActiveAt: new Date()
          }
        });

        // Broadcast to all clients except sender
        socket.to(pin).emit('SCORE_SYNC', data);
      } catch (error) {
        console.error('Score sync error:', error);
      }
    });

    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      
      // Find which room and player this socket belonged to
      for (const [pin, connections] of roomConnections.entries()) {
        for (const [playerId, socketId] of connections.entries()) {
          if (socketId === socket.id) {
            // Mark player as disconnected
            try {
              const session = await prisma.gameSession.findUnique({
                where: { pin }
              });
              
              if (session) {
                let players: any[] = [];
                try {
                  players = typeof session.players === 'string' ? JSON.parse(session.players) : (Array.isArray(session.players) ? session.players : []);
                } catch (e) {
                  console.error('Failed to parse players:', e);
                  players = [];
                }
                const player = players.find((p: any) => p.id === playerId);
                
                // Only mark as disconnected if their current socketId matches this disconnecting socket
                // (prevents marking as disconnected if they already reconnected with a new socket)
                if (player && player.socketId === socket.id) {
                  // Remove player from the list entirely
                  const updatedPlayers = players.filter((p: any) => p.id !== playerId);
                  await prisma.gameSession.update({
                    where: { pin },
                    data: { players: JSON.stringify(updatedPlayers) }
                  });
                  // Notify all clients in the room with the new player list
                  io.to(pin).emit('LOBBY_UPDATE', { pin, players: updatedPlayers });
                  // Also emit PLAYER_DISCONNECTED for legacy UI
                  io.to(pin).emit('PLAYER_DISCONNECTED', { pin, playerId, connected: false });
                  console.log(`Player ${playerId} removed from room ${pin} on disconnect`);
                } else if (player) {
                  if (typeof player.socketId === 'string' && player.socketId !== socket.id) {
                    console.log(`Socket ${socket.id} disconnected but player ${playerId} already reconnected with socket ${player.socketId}`);
                  }
                }
              }
              
              // Remove from tracking only if this socket is still the current one
              if (connections.get(playerId) === socket.id) {
                connections.delete(playerId);
              }
              if (connections.size === 0) {
                roomConnections.delete(pin);
              }
            } catch (error) {
              console.error('Error handling disconnect:', error);
            }
            
            return;
          }
        }
      }
    });
  });
}
