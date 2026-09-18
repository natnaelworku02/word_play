import { useState } from "react";
import {
  Users,
  Copy,
  Check,
  Share2,
  Crown,
  Sparkles,
  Send,
  Dices,
  Shuffle,
  Clock,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Player, RoomState } from "../types.ts";
import { sounds } from "../utils/audio.ts";

interface LobbyViewProps {
  room: RoomState;
  currentPlayer: Player;
  onOpenShare: () => void;
  onSubmitWord: (word: string) => Promise<void>;
  onPairAndAssign: (timerDuration: number) => Promise<void>;
  isSubmitting: boolean;
  isPairing: boolean;
}

const FUN_WORD_IDEAS = [
  "Moonwalking Astronaut",
  "Spaghetti Tornado",
  "Secret Agent Penguin",
  "Dinosaur on Skateboard",
  "Karaoke Superstar",
  "Zombie doing Yoga",
  "Surfing Dog",
  "Chef with Fireworks",
  "Scuba Diver in Bathtub",
  "Time Machine Glitch",
  "Rockstar at Dentist",
  "Giant Marshmallow",
  "Juggling Flaming Torches",
  "Vampire in Sunlight",
  "Superhero Missing Cape",
  "Pirate parrot",
  "Unicorn barista",
  "Statue of Liberty",
];

export function LobbyView({
  room,
  currentPlayer,
  onOpenShare,
  onSubmitWord,
  onPairAndAssign,
  isSubmitting,
  isPairing,
}: LobbyViewProps) {
  const [wordInput, setWordInput] = useState(currentPlayer.word && currentPlayer.word !== "✓ Submitted" ? currentPlayer.word : "");
  const [copied, setCopied] = useState(false);
  const [timerDuration, setTimerDuration] = useState(room.timerDuration || 60);

  const isHost = currentPlayer.isHost;
  const players = room.players;
  const submittedCount = players.filter((p) => Boolean(p.word)).length;
  const hasSubmitted = Boolean(currentPlayer.word);
  const isOdd = players.length % 2 !== 0;

  const copyInvite = async () => {
    const url = `${window.location.origin}?room=${room.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      sounds.playJoin();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSurpriseMe = () => {
    const random = FUN_WORD_IDEAS[Math.floor(Math.random() * FUN_WORD_IDEAS.length)];
    setWordInput(random);
    sounds.playJoin();
  };

  const handleWordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordInput.trim()) return;
    sounds.playJoin();
    await onSubmitWord(wordInput.trim());
  };

  const handleStartPairing = async () => {
    sounds.playReveal();
    await onPairAndAssign(timerDuration);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Room Code & Invite Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl text-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="inline-flex items-center gap-1.5 text-xs text-stone-400 font-semibold mb-1 uppercase tracking-wider">
          <span>Party Room Code</span>
        </div>

        <div className="flex items-center justify-center gap-3 my-2">
          <span className="font-mono text-4xl sm:text-5xl font-black tracking-widest text-amber-400 drop-shadow-sm">
            {room.code}
          </span>
        </div>

        <p className="text-xs text-stone-400 max-w-sm mx-auto mb-4">
          Send this link to all members. When they click it, they will write their name to join!
        </p>

        {/* Share buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            id="lobby-copy-invite-btn"
            type="button"
            onClick={copyInvite}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
              copied
                ? "bg-emerald-950/60 border-emerald-600 text-emerald-300"
                : "bg-stone-800 hover:bg-stone-700/90 border-stone-700 text-stone-200"
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-stone-400" />}
            <span>{copied ? "Link Copied!" : "Copy Invite Link"}</span>
          </button>

          <button
            id="lobby-open-share-modal-btn"
            type="button"
            onClick={onOpenShare}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>QR & Apps</span>
          </button>
        </div>
      </div>

      {/* Word Submission Section (Required for everyone) */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step 1: Secret Word Input</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              {hasSubmitted ? "Your Word is Submitted" : "Submit a Secret Word or Phrase"}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Everyone submits a word. Words will be randomly assorted and assigned to players for charades!
            </p>
          </div>

          <button
            id="word-surprise-btn"
            type="button"
            onClick={handleSurpriseMe}
            className="shrink-0 flex items-center gap-1.5 text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-1.5 rounded-lg border border-stone-700 transition-colors"
            title="Get a random word suggestion"
          >
            <Dices className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Idea</span>
          </button>
        </div>

        <form onSubmit={handleWordSubmit} className="space-y-3">
          <div className="relative">
            <input
              id="secret-word-input"
              type="text"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder="e.g. Surfing Kangaroo, Harry Potter, Astronaut..."
              maxLength={40}
              required
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
            {hasSubmitted && (
              <span className="absolute right-3 top-3 text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-md font-semibold">
                ✓ Saved
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-stone-400">
              <span className="font-semibold text-stone-300">Submitted:</span>{" "}
              <span className="text-amber-400 font-bold">{submittedCount}</span> of {players.length} players
            </div>

            <button
              id="submit-secret-word-btn"
              type="submit"
              disabled={isSubmitting || !wordInput.trim()}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-md disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{hasSubmitted ? "Update Word" : "Submit Word"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Registered Members List */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wide">
              Registered Party Members ({players.length})
            </h3>
          </div>
          <span className="text-xs text-stone-400">
            {submittedCount === players.length && players.length > 0 ? (
              <span className="text-emerald-400 font-semibold">All words submitted!</span>
            ) : (
              <span>Waiting for words...</span>
            )}
          </span>
        </div>

        {/* Player Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
          {players.map((p) => {
            const isSelf = p.id === currentPlayer.id;
            const hasWord = Boolean(p.word);
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isSelf
                    ? "bg-amber-500/10 border-amber-500/40 text-white"
                    : "bg-stone-950/80 border-stone-800 text-stone-300"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{p.avatar || "👤"}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">
                        {p.name}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] bg-amber-500 text-stone-950 font-bold px-1.5 py-0.2 rounded-sm">
                          You
                        </span>
                      )}
                      {p.isHost && (
                        <span title="Party Host" className="inline-flex">
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500">
                      {p.connected !== false ? "Connected" : "Reconnecting..."}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {hasWord ? (
                    <span className="text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-md font-medium">
                      ✓ Word In
                    </span>
                  ) : (
                    <span className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded-md">
                      Writing...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pairing Rule Notice */}
        {players.length > 1 && (
          <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-stone-300">Equal Pairing & Odd Player Rule:</p>
              <p className="text-stone-400 mt-0.5">
                {isOdd ? (
                  <>
                    Currently <span className="text-amber-300 font-bold">{players.length} players (odd number)</span>.
                    The software will randomly select <strong>1 player</strong> as the Odd One Out (Guest Judge / Lone Guesser) and pair the remaining{" "}
                    <strong>{players.length - 1} players</strong> equally!
                  </>
                ) : (
                  <>
                    Currently <span className="text-emerald-400 font-bold">{players.length} players (even number)</span>.
                    Everyone will be paired equally into <strong>{players.length / 2} pairs</strong>!
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Host Controls */}
      {isHost ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                Party Host Controls
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Round Timer:</span>
              <select
                id="timer-duration-select"
                value={timerDuration}
                onChange={(e) => setTimerDuration(Number(e.target.value))}
                className="bg-stone-950 border border-stone-700 text-stone-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500"
              >
                <option value={45}>45s</option>
                <option value={60}>60s</option>
                <option value={90}>90s</option>
                <option value={120}>120s</option>
                <option value={0}>Untimed / Free Play</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-stone-400">
            Pressing below will activate the random assortment software: pair everyone equally, assign secret words, and prepare each player's forehead card!
          </p>

          <button
            id="pair-and-assign-btn"
            type="button"
            onClick={handleStartPairing}
            disabled={players.length < 2 || isPairing}
            className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-black py-4 px-6 rounded-xl flex items-center justify-center gap-2 text-base shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Shuffle className="w-5 h-5" />
            <span>
              {isPairing
                ? "Assorting & Pairing..."
                : players.length < 2
                ? "Need at least 2 players to start"
                : "Pair Players & Roll Secret Words 🎲"}
            </span>
          </button>
        </div>
      ) : (
        <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-4 text-center text-xs text-stone-400">
          <div className="inline-flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
            <HelpCircle className="w-4 h-4" />
            <span>Waiting for Host</span>
          </div>
          <p>
            The party host ({room.hostName}) will roll the random pairs and secret words when everyone is ready!
          </p>
        </div>
      )}
    </div>
  );
}
