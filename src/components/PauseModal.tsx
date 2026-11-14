import React from 'react';
import { Home, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  score: number;
  coins: number;
  soundEnabled: boolean;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  score,
  coins,
  soundEnabled,
  onResume,
  onRestart,
  onHome,
  onToggleMute,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75"
    >
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-amber-400/35 shadow-2xl p-6 text-center space-y-5">
        <div>
          <h2 id="pause-modal-title" className="font-display text-2xl font-bold text-white">
            Game Paused
          </h2>
          <p className="mt-1 text-sm text-slate-300 font-mono-num">
            Score {score.toLocaleString()} · Coins {coins}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-3 min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-lg cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            Resume
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Restart Run
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="w-full flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            {soundEnabled ? 'Sound: On' : 'Sound: Off'}
          </button>

          <button
            type="button"
            onClick={onHome}
            className="w-full flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-white/10 text-slate-200 font-semibold text-sm cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
