import { Volume2, VolumeX, LogOut, Copy, Check, Share2 } from "lucide-react";
import { useState } from "react";
import { sounds } from "../utils/audio.ts";

interface HeaderProps {
  roomCode?: string;
  playerName?: string;
  avatar?: string;
  isHost?: boolean;
  onLeave?: () => void;
  onOpenShare?: () => void;
}

export function Header({
  roomCode,
  playerName,
  avatar,
  isHost,
  onLeave,
  onOpenShare,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(sounds.enabled);
    if (sounds.enabled) sounds.playJoin();
  };

  const copyLink = async () => {
    if (!roomCode) return;
    const url = `${window.location.origin}?room=${roomCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      sounds.playJoin();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <header className="w-full bg-stone-900 text-stone-100 border-b border-stone-800 px-4 py-3 sticky top-0 z-30 shadow-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 font-black flex items-center justify-center text-lg shadow-sm">
            🎲
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
              Party Charades
            </h1>
            <p className="text-[11px] text-stone-400 font-medium hidden sm:block">
              Pair & Guess Forehead Game
            </p>
          </div>
        </div>

        {/* Room Info and Actions */}
        <div className="flex items-center gap-2">
          {roomCode && (
            <div className="flex items-center gap-1.5 bg-stone-800/90 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-stone-400 font-medium hidden xs:inline">Room:</span>
              <span className="font-mono font-bold tracking-wider text-amber-400 text-sm">
                {roomCode}
              </span>
              <button
                id="header-copy-btn"
                type="button"
                onClick={copyLink}
                title="Copy party invite link"
                className="ml-1 p-1 hover:bg-stone-700 rounded text-stone-300 hover:text-white transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {onOpenShare && (
                <button
                  id="header-share-btn"
                  type="button"
                  onClick={onOpenShare}
                  title="Share invite with friends"
                  className="p-1 hover:bg-stone-700 rounded text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {playerName && (
            <div className="flex items-center gap-1.5 bg-stone-800/70 border border-stone-700/60 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-base">{avatar || "👤"}</span>
              <span className="font-medium text-stone-200 max-w-[90px] truncate sm:max-w-[140px]">
                {playerName}
              </span>
              {isHost && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-semibold border border-amber-500/30">
                  Host
                </span>
              )}
            </div>
          )}

          {/* Sound Toggle */}
          <button
            id="header-sound-btn"
            type="button"
            onClick={toggleSound}
            title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
          </button>

          {/* Leave Button */}
          {roomCode && onLeave && (
            <button
              id="header-leave-btn"
              type="button"
              onClick={onLeave}
              title="Leave Room"
              className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 hover:text-red-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
