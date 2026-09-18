import { Trophy, RotateCw, Crown, PlusCircle } from "lucide-react";
import { Player, RoomState } from "../types.ts";
import { sounds } from "../utils/audio.ts";

interface RoundOverViewProps {
  room: RoomState;
  currentPlayer: Player;
  onNextRound: (clearWords: boolean) => Promise<void>;
  isResetting: boolean;
}

export function RoundOverView({
  room,
  currentPlayer,
  onNextRound,
  isResetting,
}: RoundOverViewProps) {
  const isHost = currentPlayer.isHost;

  const handleNextRound = async (clearWords: boolean) => {
    sounds.playJoin();
    await onNextRound(clearWords);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Trophy Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
          <Trophy className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Round {room.roundNumber} Complete!
        </h2>
        <p className="text-xs sm:text-sm text-stone-400">
          Here is what everyone submitted and what secret words they were assigned!
        </p>
      </div>

      {/* Pairs & Word Assignments Showcase */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>Teams & Secret Words</span>
        </h3>

        <div className="space-y-3">
          {room.pairs.map((pair) => {
            const p1 = room.players.find((p) => p.id === pair.player1Id);
            const p2 = room.players.find((p) => p.id === pair.player2Id);
            const totalScore = (p1?.score || 0) + (p2?.score || 0);

            return (
              <div
                key={pair.id}
                className="bg-stone-950 border border-stone-800 rounded-xl p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: pair.color || "#3B82F6" }}
                  >
                    {pair.name}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {totalScore} pts
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Player 1 */}
                  <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800">
                    <div className="font-semibold text-stone-200 flex items-center gap-1.5">
                      <span>{p1?.avatar || "👤"}</span>
                      <span>{p1?.name || "Player 1"}</span>
                    </div>
                    <div className="mt-1 text-stone-400 text-[11px]">
                      Assigned: <strong className="text-amber-300 font-semibold">{p1?.assignedWord || "—"}</strong>
                    </div>
                    {p1?.word && p1.word !== "✓ Submitted" && (
                      <div className="text-[10px] text-stone-500">
                        Submitted: "{p1.word}"
                      </div>
                    )}
                  </div>

                  {/* Player 2 */}
                  <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800">
                    <div className="font-semibold text-stone-200 flex items-center gap-1.5">
                      <span>{p2?.avatar || "👤"}</span>
                      <span>{p2?.name || "Player 2"}</span>
                    </div>
                    <div className="mt-1 text-stone-400 text-[11px]">
                      Assigned: <strong className="text-amber-300 font-semibold">{p2?.assignedWord || "—"}</strong>
                    </div>
                    {p2?.word && p2.word !== "✓ Submitted" && (
                      <div className="text-[10px] text-stone-500">
                        Submitted: "{p2.word}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Odd One Out */}
          {room.oddPlayerName && (
            <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-3 text-xs">
              <div className="flex items-center justify-between text-purple-300 font-bold mb-1">
                <span>⭐ Odd One Out (Guest Judge):</span>
                <span>{room.oddPlayerName}</span>
              </div>
              <p className="text-[11px] text-purple-300/80">
                Randomly selected out for equal team pairing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Host Next Round Controls */}
      {isHost ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
              Host: Ready for Next Round?
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              id="next-round-keep-words-btn"
              type="button"
              disabled={isResetting}
              onClick={() => handleNextRound(false)}
              className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-colors"
            >
              <RotateCw className="w-4 h-4" />
              <span>Next Round (Keep Words)</span>
            </button>

            <button
              id="next-round-new-words-btn"
              type="button"
              disabled={isResetting}
              onClick={() => handleNextRound(true)}
              className="flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold py-3 px-4 rounded-xl text-xs sm:text-sm border border-stone-700 transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>Submit Brand New Words</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 text-center text-xs text-stone-400">
          Waiting for party host ({room.hostName}) to start the next round!
        </div>
      )}
    </div>
  );
}
