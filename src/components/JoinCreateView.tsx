import { useState, useEffect } from "react";
import { Sparkles, Users, Crown, ArrowRight, Gamepad2, Info } from "lucide-react";
import {
  getStoredPlayerName,
  setStoredPlayerName,
  getStoredPlayerAvatar,
  setStoredPlayerAvatar,
} from "../utils/storage.ts";
import { sounds } from "../utils/audio.ts";

interface JoinCreateViewProps {
  initialRoomCode?: string;
  onCreateRoom: (hostName: string, avatar: string) => Promise<void>;
  onJoinRoom: (roomCode: string, playerName: string, avatar: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

const AVATAR_OPTIONS = ["🦁", "🦊", "🐼", "🐯", "🚀", "👑", "⚡", "🍕", "🎯", "🦄", "🎸", "🏄"];

export function JoinCreateView({
  initialRoomCode,
  onCreateRoom,
  onJoinRoom,
  isLoading,
  error,
}: JoinCreateViewProps) {
  const [tab, setTab] = useState<"create" | "join">(initialRoomCode ? "join" : "create");
  const [name, setName] = useState(getStoredPlayerName());
  const [avatar, setAvatar] = useState(getStoredPlayerAvatar());
  const [roomCode, setRoomCode] = useState(initialRoomCode || "");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode.toUpperCase());
      setTab("join");
    }
  }, [initialRoomCode]);

  const handleAvatarSelect = (a: string) => {
    setAvatar(a);
    setStoredPlayerAvatar(a);
    sounds.playJoin();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const cleanName = name.trim() || "Host";
    setStoredPlayerName(cleanName);
    sounds.playJoin();
    await onCreateRoom(cleanName, avatar);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanCode) {
      setLocalError("Please enter a room code.");
      return;
    }
    if (!cleanName) {
      setLocalError("Please enter your name.");
      return;
    }

    setStoredPlayerName(cleanName);
    sounds.playJoin();
    await onJoinRoom(cleanCode, cleanName, avatar);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
      {/* Hero Badge */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-3">
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>Mobile & PC Party Game</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Party Charades & Pairs
        </h2>
        <p className="text-stone-400 text-xs sm:text-sm mt-1.5">
          Submit secret words, pair up equally, and hold your phone to your forehead!
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 bg-stone-900 border border-stone-800 p-1 rounded-xl mb-6 shadow-sm">
        <button
          id="tab-create-party"
          type="button"
          onClick={() => {
            setTab("create");
            setLocalError(null);
          }}
          className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            tab === "create"
              ? "bg-amber-500 text-stone-950 shadow-md"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>Host Game</span>
        </button>
        <button
          id="tab-join-party"
          type="button"
          onClick={() => {
            setTab("join");
            setLocalError(null);
          }}
          className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            tab === "join"
              ? "bg-amber-500 text-stone-950 shadow-md"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Join Party</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        {(error || localError) && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs font-medium">
            {error || localError}
          </div>
        )}

        {initialRoomCode && tab === "join" && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
            <span>You received an invitation link! Enter your name below to jump in.</span>
          </div>
        )}

        {tab === "create" ? (
          /* Host / Create Party Form */
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wide">
                Your Host Name
              </label>
              <input
                id="host-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                maxLength={24}
                required
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Avatar picker */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wide">
                Pick Your Avatar
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => handleAvatarSelect(em)}
                    className={`h-11 rounded-xl text-xl flex items-center justify-center border transition-all ${
                      avatar === em
                        ? "bg-amber-500/20 border-amber-500 scale-105 shadow-xs"
                        : "bg-stone-950 border-stone-800 hover:border-stone-700"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="create-party-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/20 transition-all text-sm disabled:opacity-50"
            >
              <Crown className="w-4 h-4" />
              <span>{isLoading ? "Starting Party..." : "Create Game & Get Link"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Join Party Form */
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wide">
                Party Room Code
              </label>
              <input
                id="join-room-code-input"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="4-LETTER CODE (e.g. WORD)"
                maxLength={6}
                required
                className="w-full font-mono text-center tracking-widest text-lg font-bold bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-amber-400 placeholder-stone-600 focus:outline-none focus:border-amber-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wide">
                Your Player Name
              </label>
              <input
                id="join-player-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Write your name here..."
                maxLength={24}
                required
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Avatar picker */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wide">
                Pick Your Avatar
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => handleAvatarSelect(em)}
                    className={`h-11 rounded-xl text-xl flex items-center justify-center border transition-all ${
                      avatar === em
                        ? "bg-amber-500/20 border-amber-500 scale-105 shadow-xs"
                        : "bg-stone-950 border-stone-800 hover:border-stone-700"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="join-party-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/20 transition-all text-sm disabled:opacity-50"
            >
              <Users className="w-4 h-4" />
              <span>{isLoading ? "Joining Party..." : "Join Party"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* How it works info card */}
      <div className="mt-6 bg-stone-900/60 border border-stone-800/80 rounded-xl p-4 text-xs text-stone-400">
        <div className="flex items-center gap-1.5 text-stone-300 font-semibold mb-2">
          <Info className="w-3.5 h-3.5 text-amber-400" />
          <span>How It Works:</span>
        </div>
        <ol className="list-decimal list-inside space-y-1.5 text-stone-400 leading-relaxed">
          <li>Host creates a party & sends the invite link to members.</li>
          <li>Each member writes their name & enters the lobby.</li>
          <li>Everyone submits a secret word or phrase.</li>
          <li>Software pairs players equally (or selects one odd-out).</li>
          <li>Your secret word is ready — hold on forehead and communicate!</li>
        </ol>
      </div>
    </div>
  );
}
