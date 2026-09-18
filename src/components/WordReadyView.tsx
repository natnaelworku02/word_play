import { useState } from "react";
import {
  Eye,
  EyeOff,
  Users,
  Play,
  Smartphone,
  Sparkles,
  Crown,
  HelpCircle,
} from "lucide-react";
import { Player, RoomState } from "../types.ts";
import { sounds } from "../utils/audio.ts";

interface WordReadyViewProps {
  room: RoomState;
  currentPlayer: Player;
  onRevealToggle: (revealed: boolean) => Promise<void>;
  onStartPlaying: () => Promise<void>;
  onLaunchHeadsUp: () => void;
  isStarting: boolean;
}

export function WordReadyView({
  room,
  currentPlayer,
  onRevealToggle,
  onStartPlaying,
  onLaunchHeadsUp,
  isStarting,
}: WordReadyViewProps) {
  const [localRevealed, setLocalRevealed] = useState(Boolean(currentPlayer.revealed));

  const isHost = currentPlayer.isHost;
  const isOddOut = Boolean(currentPlayer.isOddOut);
  const myWord = currentPlayer.assignedWord || "???";

  // Find partner
  const myPair = room.pairs.find(
    (pr) => pr.player1Id === currentPlayer.id || pr.player2Id === currentPlayer.id
  );
  const partnerName = currentPlayer.partnerName || (myPair ? (myPair.player1Id === currentPlayer.id ? myPair.player2Name : myPair.player1Name) : null);

  const handleCardClick = async () => {
    const nextState = !localRevealed;
    setLocalRevealed(nextState);
    sounds.playReveal();
    await onRevealToggle(nextState);
  };

  const handleHeadsUpMode = () => {
    sounds.playJoin();
    onLaunchHeadsUp();
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Status Notice */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Assortment Software Completed</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Your Word is Ready!
        </h2>
        <p className="text-xs sm:text-sm text-stone-400 max-w-sm mx-auto">
          We hid your word. Click the card below to see it, or hold your phone to your forehead!
        </p>
      </div>

      {/* Pairing / Team Information Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md text-stone-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Your Assignment
            </span>
          </div>
          {myPair && (
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-bold text-white shadow-xs"
              style={{ backgroundColor: myPair.color || "#3B82F6" }}
            >
              {myPair.name}
            </span>
          )}
        </div>

        <div className="mt-2.5">
          {isOddOut ? (
            <div className="p-3 bg-purple-950/40 border border-purple-800/50 rounded-xl text-purple-200">
              <span className="font-bold text-sm block text-purple-300">
                ⭐ You are the Odd One Out!
              </span>
              <p className="text-xs text-purple-200/90 mt-1">
                Because there is an odd number of players, you were randomly selected as the <strong>Grand Judge & Clue Master</strong>. You can give clues and communicate with every team!
              </p>
            </div>
          ) : partnerName ? (
            <div className="flex items-center justify-between p-3 bg-stone-950 border border-stone-800 rounded-xl">
              <div>
                <span className="text-[11px] text-stone-400 block">You are paired with:</span>
                <span className="text-base font-bold text-amber-400">
                  {partnerName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-stone-400 block">Team:</span>
                <span className="text-xs font-semibold text-stone-300">
                  {myPair?.name || "Pairs"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-stone-400 p-2">
              Paired with teammate for charades!
            </div>
          )}
        </div>
      </div>

      {/* Main Interactive Mystery Card: Click Screen to See Word */}
      <div
        id="charades-word-card"
        onClick={handleCardClick}
        className={`relative w-full rounded-2xl p-6 sm:p-8 cursor-pointer transition-all duration-300 border shadow-2xl text-center select-none ${
          localRevealed
            ? "bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-500/30"
            : "bg-stone-900 hover:bg-stone-850 border-stone-700 hover:border-amber-500/40"
        }`}
      >
        <div className="flex flex-col items-center justify-center min-h-[190px]">
          {localRevealed ? (
            <div className="space-y-3 animate-in zoom-in-95 duration-200">
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                <Eye className="w-3.5 h-3.5" />
                <span>Word Revealed</span>
              </span>

              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight break-words px-2 drop-shadow-md">
                {myWord}
              </div>

              <p className="text-xs text-stone-400 mt-2">
                (Tap card again to hide)
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <EyeOff className="w-7 h-7" />
              </div>

              <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                🔒 Word Hidden
              </div>

              <div className="inline-flex items-center gap-2 bg-amber-500 text-stone-950 px-4 py-2 rounded-xl text-xs sm:text-sm font-black shadow-md">
                <Eye className="w-4 h-4" />
                <span>Click screen to see the word</span>
              </div>

              <p className="text-[11px] text-stone-400 max-w-xs mx-auto pt-1">
                Tip: If you're going to hold it above your head for charades, don't look yet!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Heads Up / Forehead Mode Button */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">
            Forehead Charades Mode
          </h3>
        </div>
        <p className="text-xs text-stone-400 leading-relaxed">
          Hold your phone against your forehead facing your team members. You can also flip the text 180° so your partner reads it upright!
        </p>

        <button
          id="launch-heads-up-mode-btn"
          type="button"
          onClick={handleHeadsUpMode}
          className="w-full bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold py-3.5 px-4 rounded-xl border border-stone-700 flex items-center justify-center gap-2 text-sm transition-all shadow-md"
        >
          <Smartphone className="w-4 h-4 text-amber-400" />
          <span>Open Fullscreen Forehead Display</span>
        </button>
      </div>

      {/* Host Controls to Start Active Charades Round */}
      {isHost && (
        <div className="bg-stone-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
              Host: Start Charades Round
            </h3>
          </div>
          <p className="text-xs text-stone-400">
            When all players have their phones ready on their foreheads, start the round!
          </p>
          <button
            id="start-charades-round-btn"
            type="button"
            onClick={onStartPlaying}
            disabled={isStarting}
            className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-amber-500/25 transition-all"
          >
            <Play className="w-4 h-4 fill-stone-950" />
            <span>{isStarting ? "Starting..." : "Start Round for Everyone ⏱️"}</span>
          </button>
        </div>
      )}

      {/* Game Rules / Hints */}
      <div className="bg-stone-950 border border-stone-800 rounded-xl p-3.5 text-xs text-stone-400 flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-stone-300">How to Play Charades with Pairs:</p>
          <p>
            1. Hold your phone up above your head without looking at your own screen.
          </p>
          <p>
            2. Your partner and group can communicate and say whatever they want (or act it out) to get you to guess your secret word!
          </p>
        </div>
      </div>
    </div>
  );
}
