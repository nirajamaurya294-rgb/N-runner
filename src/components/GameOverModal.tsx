import React from 'react';
import { Home, RotateCcw, Trophy, Users } from 'lucide-react';
import { ABHIJEET_CAUGHT_DIALOGUE } from '../game/rules';
import type { HudSnapshot } from '../game/types';

interface GameOverModalProps {
  snapshot: HudSnapshot;
  isNewBest: boolean;
  onReplay: () => void;
  onOpenCharacters: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  snapshot,
  isNewBest,
  onReplay,
  onOpenCharacters,
  onHome,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80"
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-400/45 shadow-2xl p-6 text-center space-y-5">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-rose-400">
            Caught by Inspector Abhijeet
          </div>
          <h2 id="gameover-modal-title" className="mt-1 font-display text-3xl font-bold text-white">
            Busted!
          </h2>
          <p className="mt-2 px-3 py-2 rounded-lg bg-slate-950/80 border border-amber-400/30 text-sm font-semibold text-amber-300">
            “{ABHIJEET_CAUGHT_DIALOGUE}”
          </p>
          {snapshot.caughtReason && (
            <p className="mt-2 text-xs text-slate-300">{snapshot.caughtReason}</p>
          )}
        </div>

        {/* 3 Tabular Run Metric Tiles */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-950/75 border border-white/10">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Score</div>
            <div className="mt-1 font-mono-num text-xl font-bold text-white">
              {snapshot.score.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/75 border border-amber-400/25">
            <div className="text-[11px] uppercase tracking-wider text-amber-300 flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              Best
            </div>
            <div className="mt-1 font-mono-num text-xl font-bold text-amber-300">
              {snapshot.highScore.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/75 border border-white/10">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Coins</div>
            <div className="mt-1 font-mono-num text-xl font-bold text-amber-400">
              +{snapshot.coins}
            </div>
          </div>
        </div>

        {isNewBest && (
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            New High Score Record · {snapshot.distanceMeters}m Dashed
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onReplay}
            className="w-full flex items-center justify-center gap-2 py-3.5 min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-lg shadow-[0_4px_0_#b45309] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            Play Again
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenCharacters}
              className="flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
            >
              <Users className="w-4 h-4 text-amber-400" />
              Runners
            </button>

            <button
              type="button"
              onClick={onHome}
              className="flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-xl bg-slate-950/75 hover:bg-slate-800 border border-white/10 text-slate-200 font-semibold text-sm cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
