/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "./components/Header.tsx";
import { JoinCreateView } from "./components/JoinCreateView.tsx";
import { LobbyView } from "./components/LobbyView.tsx";
import { WordReadyView } from "./components/WordReadyView.tsx";
import { ForeheadPlayView } from "./components/ForeheadPlayView.tsx";
import { RoundOverView } from "./components/RoundOverView.tsx";
import { ShareModal } from "./components/ShareModal.tsx";
import { RoomState, Player } from "./types.ts";
import { getStoredPlayerId, getStoredPlayerName, getStoredPlayerAvatar } from "./utils/storage.ts";
import { sounds } from "./utils/audio.ts";

export default function App() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string>(getStoredPlayerId());
  const [initialRoomCode, setInitialRoomCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [headsUpActive, setHeadsUpActive] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPairing, setIsPairing] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const roomRef = useRef<RoomState | null>(null);
  roomRef.current = room;

  // 1. Check URL parameters for ?room=CODE on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("room");
    if (codeParam) {
      setInitialRoomCode(codeParam.toUpperCase());
    }
  }, []);

  // 2. Fetch room state via REST
  const fetchRoomState = useCallback(async (code: string, pId?: string) => {
    try {
      const res = await fetch(`/api/rooms/${code}${pId ? `?playerId=${pId}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data.room);
        return data.room as RoomState;
      } else {
        if (res.status === 404) {
          setError("Room not found. Please check your room code.");
          setRoom(null);
        }
      }
    } catch {
      // Ignore network errors in polling
    }
    return null;
  }, []);

  // 3. WebSocket Connection & Sync
  useEffect(() => {
    if (!room?.code) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "JOIN_ROOM",
        roomCode: room.code,
        playerId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ROOM_UPDATE" && data.room) {
          setRoom(data.room);
        }
      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    };

    // Heartbeat ping
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "PING" }));
      }
    }, 25000);

    // Fallback polling every 3 seconds
    const pollInterval = setInterval(() => {
      if (roomRef.current?.code) {
        fetchRoomState(roomRef.current.code, playerId);
      }
    }, 3000);

    return () => {
      clearInterval(pingInterval);
      clearInterval(pollInterval);
      ws.close();
    };
  }, [room?.code, playerId, fetchRoomState]);

  // Handle URL history update when room changes
  useEffect(() => {
    if (room?.code) {
      const newUrl = `${window.location.pathname}?room=${room.code}`;
      if (window.location.search !== `?room=${room.code}`) {
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [room?.code]);

  // Current player from room state
  const currentPlayer: Player | undefined = room?.players.find((p) => p.id === playerId);

  // -------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------

  // Create Room
  const handleCreateRoom = async (hostName: string, avatar: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName, avatar }),
      });
      const data = await res.json();
      if (res.ok) {
        setPlayerId(data.playerId);
        setRoom(data.room);
      } else {
        setError(data.error || "Failed to create party.");
      }
    } catch {
      setError("Network error while creating party.");
    } finally {
      setIsLoading(false);
    }
  };

  // Join Room
  const handleJoinRoom = async (code: string, playerName: string, avatar: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playerName,
          avatar,
          existingPlayerId: playerId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPlayerId(data.playerId);
        setRoom(data.room);
      } else {
        setError(data.error || "Could not join room.");
      }
    } catch {
      setError("Network error while joining room.");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Secret Word
  const handleSubmitWord = async (word: string) => {
    if (!room) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${room.code}/submit-word`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, word }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        setRoom(data.room);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pair Players & Roll Words (Assortment Software)
  const handlePairAndAssign = async (timerDuration: number) => {
    if (!room) return;
    setIsPairing(true);
    try {
      const res = await fetch(`/api/rooms/${room.code}/pair-and-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, timerDuration }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        setRoom(data.room);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPairing(false);
    }
  };

  // Toggle Reveal / Peek Word
  const handleRevealToggle = async (revealed: boolean) => {
    if (!room) return;
    try {
      const res = await fetch(`/api/rooms/${room.code}/reveal-word`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, revealed }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        setRoom(data.room);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Start Active Charades Round
  const handleStartPlaying = async () => {
    if (!room) return;
    setIsStarting(true);
    try {
      const res = await fetch(`/api/rooms/${room.code}/start-play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        setRoom(data.room);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsStarting(false);
    }
  };

  // Score Got It / Pass
  const handleScoreDelta = async (targetPlayerId: string, delta: number) => {
    if (!room) return;
    try {
      const res = await fetch(`/api/rooms/${room.code}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, targetPlayerId, delta }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        setRoom(data.room);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // End Round
  const handleEndRound = async () => {
    if (!room) return;
    try {
      const res = await fetch(`/api/rooms/${room.code}/end-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        setRoom(data.room);
        setHeadsUpActive(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Next Round / Reset
  const handleNextRound = async (clearWords: boolean) => {
    if (!room) return;
    setIsResetting(true);
    try {
      const res = await fetch(`/api/rooms/${room.code}/next-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, clearWords }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        setRoom(data.room);
        setHeadsUpActive(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  // Leave Room
  const handleLeaveRoom = async () => {
    if (!room) return;
    try {
      await fetch(`/api/rooms/${room.code}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
    } catch {
      // Ignore
    }
    sounds.playJoin();
    setRoom(null);
    setHeadsUpActive(false);
    window.history.replaceState({}, "", window.location.pathname);
  };

  // -------------------------------------------------------------
  // Render View based on room phase & state
  // -------------------------------------------------------------

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top Header */}
      <Header
        roomCode={room?.code}
        playerName={currentPlayer?.name || getStoredPlayerName()}
        avatar={currentPlayer?.avatar || getStoredPlayerAvatar()}
        isHost={currentPlayer?.isHost}
        onLeave={room ? handleLeaveRoom : undefined}
        onOpenShare={() => setShareModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
        {!room || !currentPlayer ? (
          <JoinCreateView
            initialRoomCode={initialRoomCode}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <>
            {/* LOBBY / SUBMITTING PHASE */}
            {(room.phase === "lobby" || room.phase === "submitting") && (
              <LobbyView
                room={room}
                currentPlayer={currentPlayer}
                onOpenShare={() => setShareModalOpen(true)}
                onSubmitWord={handleSubmitWord}
                onPairAndAssign={handlePairAndAssign}
                isSubmitting={isSubmitting}
                isPairing={isPairing}
              />
            )}

            {/* READY PHASE: "After giving them a word, we're not going to show them. We're going to hide it and say your word is ready." */}
            {room.phase === "ready" && (
              headsUpActive ? (
                <ForeheadPlayView
                  room={room}
                  currentPlayer={currentPlayer}
                  onScoreDelta={handleScoreDelta}
                  onEndRound={handleEndRound}
                  onBackToCard={() => setHeadsUpActive(false)}
                />
              ) : (
                <WordReadyView
                  room={room}
                  currentPlayer={currentPlayer}
                  onRevealToggle={handleRevealToggle}
                  onStartPlaying={handleStartPlaying}
                  onLaunchHeadsUp={() => setHeadsUpActive(true)}
                  isStarting={isStarting}
                />
              )
            )}

            {/* ACTIVE PLAYING PHASE: Forehead Charades */}
            {room.phase === "playing" && (
              <ForeheadPlayView
                room={room}
                currentPlayer={currentPlayer}
                onScoreDelta={handleScoreDelta}
                onEndRound={handleEndRound}
                onBackToCard={() => {
                  if (currentPlayer.isHost) {
                    handleEndRound();
                  } else {
                    setHeadsUpActive(false);
                  }
                }}
              />
            )}

            {/* ROUND OVER / RESULTS */}
            {room.phase === "round_over" && (
              <RoundOverView
                room={room}
                currentPlayer={currentPlayer}
                onNextRound={handleNextRound}
                isResetting={isResetting}
              />
            )}
          </>
        )}
      </main>

      {/* Share / Invite Modal */}
      {room && (
        <ShareModal
          roomCode={room.code}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
}
