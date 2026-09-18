export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  word?: string; // Word submitted by this player
  assignedWord?: string; // Word given to this player by assortment
  pairId?: string;
  partnerId?: string;
  partnerName?: string;
  isOddOut?: boolean;
  revealed?: boolean;
  score?: number;
  readyToPlay?: boolean;
  connected?: boolean;
  lastSeen?: number;
}

export interface Pair {
  id: string;
  name: string; // e.g. "Team Lightning", "Team Phoenix"
  color: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
}

export type GamePhase = 'lobby' | 'submitting' | 'ready' | 'playing' | 'round_over';

export interface RoomState {
  code: string;
  hostId: string;
  hostName: string;
  phase: GamePhase;
  players: Player[];
  pairs: Pair[];
  oddPlayerId?: string | null;
  oddPlayerName?: string | null;
  roundTimerSeconds?: number;
  timerStartedAt?: number | null;
  timerDuration?: number;
  wordPoolCount: number;
  roundNumber: number;
  createdAt: number;
  allWordsSubmitted?: boolean;
}

export type WsMessage =
  | { type: 'JOIN_ROOM'; roomCode: string; playerId: string }
  | { type: 'LEAVE_ROOM'; roomCode: string; playerId: string }
  | { type: 'ROOM_UPDATE'; room: RoomState }
  | { type: 'PING' }
  | { type: 'PONG' };
