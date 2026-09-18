import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { Player, Pair, RoomState, GamePhase } from "./src/types.ts";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory room store
interface InternalRoom {
  code: string;
  hostId: string;
  hostName: string;
  phase: GamePhase;
  players: Player[];
  pairs: Pair[];
  oddPlayerId: string | null;
  oddPlayerName: string | null;
  roundTimerSeconds: number;
  timerStartedAt: number | null;
  timerDuration: number;
  wordPool: { word: string; submittedBy: string }[];
  roundNumber: number;
  createdAt: number;
}

const rooms = new Map<string, InternalRoom>();

// Active WebSocket connections mapped by roomCode -> Set of { ws, playerId }
interface ClientConn {
  ws: WebSocket;
  playerId?: string;
}
const roomClients = new Map<string, Set<ClientConn>>();

// Fun party team names and colors
const TEAM_PRESETS = [
  { name: "Team Phoenix", color: "#EF4444" },
  { name: "Team Blue Lightning", color: "#3B82F6" },
  { name: "Team Emerald", color: "#10B981" },
  { name: "Team Solar Flare", color: "#F59E0B" },
  { name: "Team Cosmic Purple", color: "#8B5CF6" },
  { name: "Team Coral Reef", color: "#EC4899" },
  { name: "Team Cyber Neon", color: "#06B6D4" },
  { name: "Team Golden Eagle", color: "#EAB308" },
];

// Fallback backup words if players need more words
const DEFAULT_WORDS = [
  "Moonwalk", "Spaghetti", "Flamingo", "Rollercoaster", "Statue of Liberty",
  "Ninja", "T-Rex", "Karaoke Singer", "Pirate Ship", "Time Machine",
  "Scuba Diver", "Toothbrush", "Juggling", "Bungee Jumping", "Superhero Cape",
  "Helicopter", "Campfire", "DJ at a Party", "Astronaut", "Surfing a Big Wave"
];

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

function sanitizeRoomForPlayer(room: InternalRoom, playerId?: string): RoomState {
  // Return room state. Each player sees their own assignedWord, their partner info, etc.
  return {
    code: room.code,
    hostId: room.hostId,
    hostName: room.hostName,
    phase: room.phase,
    players: room.players.map((p) => {
      const isSelf = p.id === playerId;
      const isRoundOver = room.phase === "round_over";
      return {
        ...p,
        // Hide other players' assigned words until round_over unless it's yourself or revealed
        assignedWord: isSelf || isRoundOver || p.revealed ? p.assignedWord : undefined,
        // Hide submitted word of others until round_over
        word: isSelf || isRoundOver ? p.word : (p.word ? "✓ Submitted" : undefined),
      };
    }),
    pairs: room.pairs,
    oddPlayerId: room.oddPlayerId,
    oddPlayerName: room.oddPlayerName,
    roundTimerSeconds: room.roundTimerSeconds,
    timerStartedAt: room.timerStartedAt,
    timerDuration: room.timerDuration,
    wordPoolCount: room.wordPool.length,
    roundNumber: room.roundNumber,
    createdAt: room.createdAt,
    allWordsSubmitted: room.players.length > 0 && room.players.every((p) => Boolean(p.word)),
  };
}

function broadcastRoom(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const clients = roomClients.get(roomCode);
  if (!clients) return;

  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        const sanitized = sanitizeRoomForPlayer(room, client.playerId);
        client.ws.send(JSON.stringify({ type: "ROOM_UPDATE", room: sanitized }));
      } catch (err) {
        console.error("Error broadcasting to client:", err);
      }
    }
  }
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. Create Game / Party
app.post("/api/rooms", (req, res) => {
  const { hostName, avatar } = req.body;
  const name = (hostName || "Host").trim();
  const code = generateRoomCode();
  const hostId = "p_" + Math.random().toString(36).substring(2, 9);

  const hostPlayer: Player = {
    id: hostId,
    name,
    avatar: avatar || "👑",
    isHost: true,
    score: 0,
    connected: true,
    lastSeen: Date.now(),
  };

  const newRoom: InternalRoom = {
    code,
    hostId,
    hostName: name,
    phase: "lobby",
    players: [hostPlayer],
    pairs: [],
    oddPlayerId: null,
    oddPlayerName: null,
    roundTimerSeconds: 60,
    timerStartedAt: null,
    timerDuration: 60,
    wordPool: [],
    roundNumber: 1,
    createdAt: Date.now(),
  };

  rooms.set(code, newRoom);
  res.json({
    room: sanitizeRoomForPlayer(newRoom, hostId),
    playerId: hostId,
    code,
  });
});

// 2. Get Room State
app.get("/api/rooms/:code", (req, res) => {
  const code = req.params.code.toUpperCase();
  const playerId = (req.query.playerId as string) || undefined;
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  res.json({ room: sanitizeRoomForPlayer(room, playerId) });
});

// 3. Join Game / Party
app.post("/api/rooms/:code/join", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { name, avatar, existingPlayerId } = req.body;
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  // Check if player is reconnecting with existing ID
  let player: Player | undefined;
  if (existingPlayerId) {
    player = room.players.find((p) => p.id === existingPlayerId);
  }

  if (player) {
    // Reconnect
    if (name) player.name = name.trim();
    if (avatar) player.avatar = avatar;
    player.connected = true;
    player.lastSeen = Date.now();
  } else {
    // Check if game is in progress and new players cannot join or join as spectator
    const newPlayerId = "p_" + Math.random().toString(36).substring(2, 9);
    player = {
      id: newPlayerId,
      name: (name || `Player ${room.players.length + 1}`).trim(),
      avatar: avatar || "🎉",
      isHost: room.players.length === 0,
      score: 0,
      connected: true,
      lastSeen: Date.now(),
    };
    if (room.players.length === 0) {
      room.hostId = newPlayerId;
      room.hostName = player.name;
    }
    room.players.push(player);
  }

  broadcastRoom(code);

  res.json({
    room: sanitizeRoomForPlayer(room, player.id),
    playerId: player.id,
  });
});

// 4. Submit Secret Word
app.post("/api/rooms/:code/submit-word", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, word } = req.body;
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ error: "Room not found" });
  const cleanWord = (word || "").trim();
  if (!cleanWord) return res.status(400).json({ error: "Word cannot be empty" });

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return res.status(404).json({ error: "Player not found" });

  player.word = cleanWord;

  // Update or add to room wordPool
  const existingIndex = room.wordPool.findIndex((wp) => wp.submittedBy === playerId);
  if (existingIndex >= 0) {
    room.wordPool[existingIndex].word = cleanWord;
  } else {
    room.wordPool.push({ word: cleanWord, submittedBy: playerId });
  }

  broadcastRoom(code);
  res.json({ success: true, room: sanitizeRoomForPlayer(room, playerId) });
});

// 5. Random Pairing and Word Assortment
app.post("/api/rooms/:code/pair-and-assign", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, timerDuration = 60 } = req.body;
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ error: "Room not found" });

  // Only host can trigger pairing
  if (room.hostId !== playerId && room.players.length > 1) {
    const caller = room.players.find((p) => p.id === playerId);
    if (!caller?.isHost) {
      return res.status(403).json({ error: "Only the host can start pairing" });
    }
  }

  if (room.players.length < 2) {
    return res.status(400).json({ error: "Need at least 2 players to play" });
  }

  // Shuffle players
  const shuffledPlayers = [...room.players].sort(() => Math.random() - 0.5);

  let oddPlayer: Player | null = null;
  let pairingPool = [...shuffledPlayers];

  // If odd number of players, leave one person randomly out!
  if (pairingPool.length % 2 !== 0) {
    oddPlayer = pairingPool.pop()!;
    room.oddPlayerId = oddPlayer.id;
    room.oddPlayerName = oddPlayer.name;
    oddPlayer.isOddOut = true;
    oddPlayer.pairId = undefined;
    oddPlayer.partnerId = undefined;
    oddPlayer.partnerName = undefined;
  } else {
    room.oddPlayerId = null;
    room.oddPlayerName = null;
  }

  // Create pairs equally
  const pairs: Pair[] = [];
  for (let i = 0; i < pairingPool.length; i += 2) {
    const p1 = pairingPool[i];
    const p2 = pairingPool[i + 1];
    const pairId = "pair_" + Math.random().toString(36).substring(2, 7);
    const preset = TEAM_PRESETS[pairs.length % TEAM_PRESETS.length];

    p1.isOddOut = false;
    p1.pairId = pairId;
    p1.partnerId = p2.id;
    p1.partnerName = p2.name;

    p2.isOddOut = false;
    p2.pairId = pairId;
    p2.partnerId = p1.id;
    p2.partnerName = p1.name;

    pairs.push({
      id: pairId,
      name: preset.name,
      color: preset.color,
      player1Id: p1.id,
      player1Name: p1.name,
      player2Id: p2.id,
      player2Name: p2.name,
    });
  }
  room.pairs = pairs;

  // Assortment of words:
  // Collect submitted words
  const submittedWords = room.players
    .filter((p) => Boolean(p.word))
    .map((p) => ({ word: p.word!.trim(), submittedBy: p.id }));

  // Pool of available words
  let availableWords = [...submittedWords];

  // If there are fewer words than players (or default words needed), add from party charades backup bank
  let backupIdx = 0;
  const shuffledBackups = [...DEFAULT_WORDS].sort(() => Math.random() - 0.5);
  while (availableWords.length < room.players.length) {
    availableWords.push({
      word: shuffledBackups[backupIdx % shuffledBackups.length],
      submittedBy: "system",
    });
    backupIdx++;
  }

  // Shuffle available words
  availableWords = availableWords.sort(() => Math.random() - 0.5);

  // Assign words to players, attempting not to assign a player their own word
  const assignedWordsSet = new Set<string>();
  for (const player of room.players) {
    player.revealed = false;
    player.readyToPlay = false;

    // Find candidate word not submitted by this player and not already assigned
    const candidateIdx = availableWords.findIndex(
      (w) => w.submittedBy !== player.id && !assignedWordsSet.has(w.word)
    );

    if (candidateIdx >= 0) {
      player.assignedWord = availableWords[candidateIdx].word;
      assignedWordsSet.add(availableWords[candidateIdx].word);
      availableWords.splice(candidateIdx, 1);
    } else if (availableWords.length > 0) {
      // Fallback to next available word
      player.assignedWord = availableWords[0].word;
      assignedWordsSet.add(availableWords[0].word);
      availableWords.shift();
    } else {
      player.assignedWord = shuffledBackups[Math.floor(Math.random() * shuffledBackups.length)];
    }
  }

  // Phase transition:
  // "After giving them a word, we're not going to show them. We're going to hide it and say your word is ready."
  room.phase = "ready";
  room.timerDuration = timerDuration;
  room.roundTimerSeconds = timerDuration;
  room.timerStartedAt = null;

  broadcastRoom(code);

  res.json({
    success: true,
    room: sanitizeRoomForPlayer(room, playerId),
  });
});

// 6. Start Active Charades Round (Heads Up mode)
app.post("/api/rooms/:code/start-play", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body;
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ error: "Room not found" });

  room.phase = "playing";
  room.timerStartedAt = Date.now();
  room.roundTimerSeconds = room.timerDuration || 60;

  broadcastRoom(code);
  res.json({ success: true, room: sanitizeRoomForPlayer(room, playerId) });
});

// 7. Click Screen to Reveal/Hide Word
app.post("/api/rooms/:code/reveal-word", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, revealed } = req.body;
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ error: "Room not found" });

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return res.status(404).json({ error: "Player not found" });

  player.revealed = revealed !== undefined ? Boolean(revealed) : !player.revealed;

  broadcastRoom(code);
  res.json({ success: true, room: sanitizeRoomForPlayer(room, playerId) });
});

// 8. Mark Score / Got It / Skip
app.post("/api/rooms/:code/score", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, targetPlayerId, delta = 1 } = req.body;
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ error: "Room not found" });

  const target = room.players.find((p) => p.id === targetPlayerId);
  if (target) {
    target.score = Math.max(0, (target.score || 0) + delta);
  }

  broadcastRoom(code);
  res.json({ success: true, room: sanitizeRoomForPlayer(room, playerId) });
});

// 9. End Round or Next Round
app.post("/api/rooms/:code/end-round", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body;
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ error: "Room not found" });

  room.phase = "round_over";
  room.timerStartedAt = null;

  broadcastRoom(code);
  res.json({ success: true, room: sanitizeRoomForPlayer(room, playerId) });
});

// 10. Next Round / Reset
app.post("/api/rooms/:code/next-round", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, clearWords = false } = req.body;
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ error: "Room not found" });

  room.roundNumber += 1;
  room.phase = clearWords ? "submitting" : "lobby";
  room.timerStartedAt = null;
  room.roundTimerSeconds = room.timerDuration || 60;

  for (const p of room.players) {
    p.revealed = false;
    p.readyToPlay = false;
    p.assignedWord = undefined;
    p.pairId = undefined;
    p.partnerId = undefined;
    p.partnerName = undefined;
    p.isOddOut = false;
    if (clearWords) {
      p.word = undefined;
    }
  }

  if (clearWords) {
    room.wordPool = [];
  }
  room.pairs = [];
  room.oddPlayerId = null;
  room.oddPlayerName = null;

  broadcastRoom(code);
  res.json({ success: true, room: sanitizeRoomForPlayer(room, playerId) });
});

// 11. Leave Room
app.post("/api/rooms/:code/leave", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body;
  const room = rooms.get(code);

  if (room) {
    room.players = room.players.filter((p) => p.id !== playerId);
    if (room.hostId === playerId && room.players.length > 0) {
      room.players[0].isHost = true;
      room.hostId = room.players[0].id;
      room.hostName = room.players[0].name;
    }
    if (room.players.length === 0) {
      rooms.delete(code);
    } else {
      broadcastRoom(code);
    }
  }

  res.json({ success: true });
});

// -------------------------------------------------------------
// SERVER & WEBSOCKET SETUP
// -------------------------------------------------------------
async function startServer() {
  const server = http.createServer(app);

  // WebSocket Server on the same HTTP server
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    const clientRef: ClientConn = { ws };

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "JOIN_ROOM" && msg.roomCode) {
          const code = msg.roomCode.toUpperCase();
          currentRoomCode = code;
          currentPlayerId = msg.playerId;
          clientRef.playerId = msg.playerId;

          if (!roomClients.has(code)) {
            roomClients.set(code, new Set());
          }
          roomClients.get(code)!.add(clientRef);

          // Send current state
          const room = rooms.get(code);
          if (room) {
            ws.send(JSON.stringify({
              type: "ROOM_UPDATE",
              room: sanitizeRoomForPlayer(room, currentPlayerId || undefined),
            }));
          }
        } else if (msg.type === "PING") {
          ws.send(JSON.stringify({ type: "PONG" }));
        }
      } catch (e) {
        console.error("WS error:", e);
      }
    });

    ws.on("close", () => {
      if (currentRoomCode && roomClients.has(currentRoomCode)) {
        roomClients.get(currentRoomCode)!.delete(clientRef);
        if (roomClients.get(currentRoomCode)!.size === 0) {
          roomClients.delete(currentRoomCode);
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
