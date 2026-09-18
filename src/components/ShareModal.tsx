import { X, Copy, Check, Share2, Smartphone } from "lucide-react";
import { useState } from "react";
import { sounds } from "../utils/audio.ts";

interface ShareModalProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ roomCode, isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}?room=${roomCode}` : "";
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      sounds.playJoin();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title: "Join our Party Charades Game!",
        text: `Join my Party Charades room! Room code: ${roomCode}`,
        url: shareUrl,
      });
      sounds.playJoin();
    } catch (e) {
      // User cancelled or not supported
    }
  };

  // Simple clean QR code using public quickchart or svg
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}&bgcolor=1c1917&color=f59e0b`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-stone-900 border border-stone-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative text-stone-100">
        <button
          id="share-modal-close-btn"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
            <Smartphone className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Invite Party Members</h2>
          <p className="text-xs text-stone-400 mt-1">
            Send this link or scan the QR code to join this party
          </p>
        </div>

        {/* Room Code Display */}
        <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 text-center mb-4">
          <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold block">
            Party Room Code
          </span>
          <span className="text-3xl font-black font-mono tracking-widest text-amber-400">
            {roomCode}
          </span>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="p-2.5 bg-stone-950 border border-stone-800 rounded-xl">
            <img
              src={qrUrl}
              alt="Scan to join party"
              className="w-36 h-36 rounded-lg object-contain"
              loading="lazy"
            />
          </div>
        </div>

        {/* Share Actions */}
        <div className="space-y-2.5">
          {canNativeShare && (
            <button
              id="share-native-btn"
              type="button"
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 px-4 rounded-xl transition-colors shadow-md"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via WhatsApp / Messages</span>
            </button>
          )}

          <button
            id="share-copy-btn"
            type="button"
            onClick={handleCopy}
            className={`w-full flex items-center justify-center gap-2 border py-2.5 px-4 rounded-xl font-semibold transition-colors ${
              copied
                ? "bg-emerald-950/60 border-emerald-600 text-emerald-300"
                : "bg-stone-800 hover:bg-stone-700/80 border-stone-700 text-stone-200"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Link Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Party Link</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-center text-stone-500 mt-4 break-all">
          {shareUrl}
        </p>
      </div>
    </div>
  );
}
