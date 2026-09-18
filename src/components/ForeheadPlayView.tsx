import { useState, useEffect } from "react";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Clock,
  ArrowLeft,
  Crown,
  Users,
} from "lucide-react";
import { Player, RoomState } from "../types.ts";
import { sounds } from "../utils/audio.ts";

interface ForeheadPlayViewProps {
  room: RoomState;
  currentPlayer: Player;
  onScoreDelta: (targetPlayerId: string, delta: number) => Promise<void>;
  onEndRound: () => Promise<void>;
  onBackToCard: () => void;
}

export function ForeheadPlayView({
  room,
  currentPlayer,
  onScoreDelta,
  onEndRound,
  onBackToCard,
}: ForeheadPlayViewProps) {
  const [revealed, setRevealed] = useState(false);
  const [flipped180, setFlipped180] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(room.roundTimerSeconds || 60);

  const isHost = currentPlayer.isHost;
  const isOddOut = Boolean(currentPlayer.isOddOut);
  const myWord = currentPlayer.assignedWord || "???";
  const timerDuration = room.timerDuration || 60;

  // Partner info
  const myPair = room.pairs.find(
    (pr) => pr.player1Id === currentPlayer.id || pr.player2Id === currentPlayer.id
  );
  const partnerName = currentPlayer.partnerName || (myPair ? (myPair.player1Id === currentPlayer.id ? myPair.player2Name : myPair.player1Name) : null);

  // Timer countdown
  useEffect(() => {
    if (timerDuration === 0) return; // untimed

    const interval = setInterval(() => {
      if (room.timerStartedAt) {
        const elapsed = Math.floor((Date.now() - room.timerStartedAt) / 1000);
        const remaining = Math.max(0, timerDuration - elapsed);
        setTimeLeft(remaining);

        if (remaining <= 5 && remaining > 0) {
          sounds.playTick();
        } else if (remaining === 0) {
          sounds.playBuzzer();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room.timerStartedAt, timerDuration]);

  const handleScreenClick = () => {
    setRevealed((prev) => !prev);
    sounds.playReveal();
  };

  const handleCorrect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playSuccess();
    await onScoreDelta(currentPlayer.id, 1);
  };

  const handlePass = async (e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playTick();
  };

  const timerPercent = timerDuration > 0 ? (timeLeft / timerDuration) * 100 : 100;
  const isTimeCritical = timeLeft <= 10 && timerDuration > 0;

  return (
    <div className="fixed inset-0 z-40 bg-stone-950 text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Top Utility Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-900/90 border-b border-stone-800 backdrop-blur-xs">
        <button
          id="play-back-btn"
          type="button"
          onClick={onBackToCard}
          className="flex items-center gap-1.5 text-xs text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 px-3 py-1.5 rounded-lg border border-stone-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Play</span>
        </button>

        {/* Timer Display */}
        {timerDuration > 0 ? (
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${isTimeCritical ? "text-red-400 animate-pulse" : "text-amber-400"}`} />
            <span
              className={`font-mono font-black text-lg ${
                isTimeCritical ? "text-red-400 animate-pulse" : "text-white"
              }`}
            >
              {timeLeft}s
            </span>
          </div>
        ) : (
          <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">
            Free Play Mode
          </span>
        )}

        {/* 180 Flip Toggle */}
        <button
          id="play-flip-180-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFlipped180(!flipped180);
            sounds.playJoin();
          }}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
            flipped180
              ? "bg-amber-500 text-stone-950 border-amber-400"
              : "bg-stone-800 text-stone-300 hover:text-white border-stone-700"
          }`}
          title="Flip text 180° for people looking at your forehead"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{flipped180 ? "Flipped 180°" : "Flip for Others"}</span>
        </button>
      </div>

      {/* Timer Progress Bar */}
      {timerDuration > 0 && (
        <div className="w-full h-1.5 bg-stone-800">
          <div
            className={`h-full transition-all duration-1000 ${
              isTimeCritical ? "bg-red-500" : "bg-amber-500"
            }`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      )}

      {/* Main Interactive Screen Area: Tap anywhere to reveal / hide */}
      <div
        id="play-fullscreen-tap-area"
        onClick={handleScreenClick}
        className="flex-1 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all relative overflow-hidden"
      >
        {/* Subtle Background Glow */}
        <div className="absolute inset-0 bg-radial from-amber-500/5 to-transparent pointer-events-none" />

        {/* Team & Teammate Banner */}
        <div className="mb-4 z-10">
          {isOddOut ? (
            <span className="bg-purple-900/60 text-purple-300 border border-purple-700/60 text-xs px-3 py-1 rounded-full font-bold">
              Odd One Out / Grand Judge
            </span>
          ) : partnerName ? (
            <div className="inline-flex items-center gap-1.5 bg-stone-900/80 border border-stone-800 text-stone-300 text-xs px-3 py-1 rounded-full font-medium">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Partner: <strong className="text-white">{partnerName}</strong> ({myPair?.name || "Team"})</span>
            </div>
          ) : null}
        </div>

        {/* Card Content with 180° Flip support */}
        <div
          className={`w-full max-w-lg z-10 transition-transform duration-300 ${
            flipped180 ? "rotate-180" : ""
          }`}
        >
          {revealed ? (
            <div className="space-y-4 animate-in zoom-in-95 duration-150">
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                <Eye className="w-3.5 h-3.5" />
                <span>Word Revealed</span>
              </span>

              {/* Giant high-visibility word display */}
              <div className="text-4xl sm:text-6xl md:text-7xl font-black text-amber-300 tracking-tight leading-none px-2 py-4 drop-shadow-lg break-words">
                {myWord}
              </div>

              <p className="text-xs text-stone-400">
                Tap screen to hide again
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
                <EyeOff className="w-10 h-10" />
              </div>

              <div className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                🔒 Word Hidden on Forehead
              </div>

              <div className="inline-flex items-center gap-2 bg-amber-500 text-stone-950 px-5 py-2.5 rounded-2xl text-sm font-black shadow-lg">
                <Eye className="w-4 h-4" />
                <span>Tap Screen to See Word</span>
              </div>

              <p className="text-xs text-stone-400 max-w-xs mx-auto">
                Hold your phone facing your team! They can describe or act out your secret word.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div className="px-4 py-3 bg-stone-900/95 border-t border-stone-800 flex items-center justify-between gap-3">
        {/* Pass button */}
        <button
          id="play-pass-btn"
          type="button"
          onClick={handlePass}
          className="flex-1 flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-300 py-3 rounded-xl font-bold text-xs sm:text-sm border border-stone-700 transition-colors"
        >
          <XCircle className="w-4 h-4 text-stone-400" />
          <span>Pass</span>
        </button>

        {/* Got It Button */}
        <button
          id="play-got-it-btn"
          type="button"
          onClick={handleCorrect}
          className="flex-2 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-xs sm:text-sm shadow-lg transition-colors"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Got It! (+1)</span>
        </button>

        {/* Host End Round */}
        {isHost && (
          <button
            id="play-end-round-btn"
            type="button"
            onClick={onEndRound}
            className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 py-3 rounded-xl font-bold text-xs transition-colors"
          >
            <Crown className="w-4 h-4" />
            <span>End Round</span>
          </button>
        )}
      </div>
    </div>
  );
}
