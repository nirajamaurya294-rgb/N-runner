import React from 'react';
import { Pause, Volume2, VolumeX } from 'lucide-react';
import type { HudSnapshot } from '../game/types';

interface HudOverlayProps {
  hud: HudSnapshot;
  soundEnabled: boolean;
  onPause: () => void;
  onToggleMute: () => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  hud,
  soundEnabled,
  onPause,
  onToggleMute,
}) => {
  const showDangerEdge = hud.dangerLevel > 0.35;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3.5 sm:p-6">
      {/* Subtle peripheral crimson frame when Inspector Abhijeet is close */}
      {showDangerEdge && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none border-[6px] border-red-500/45"
        />
      )}

      {/* Top Perimeter HUD Bar (<= 15% height, >= 85% viewport unobstructed) */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Hero Score + Unboxed Kicker */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span
              data-testid="hud-score"
              className="font-mono-num text-3xl sm:text-4xl font-bold text-white hud-text-shadow leading-none"
            >
              {hud.score.toLocaleString()}
            </span>
            {hud.multiplier > 1 && (
              <span className="font-mono-num text-sm font-bold text-amber-300 hud-text-shadow">
                x{hud.multiplier}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-amber-100/90 hud-text-shadow">
            <span>Best {hud.highScore.toLocaleString()}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">{hud.distanceMeters}m</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">{hud.speedKmh} km/h</span>
          </div>
        </div>

        {/* Top-Right: Coin Readout + Compact Square Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/75 border border-amber-400/35">
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
              <circle cx="12" cy="12" r="7" fill="#fde047" />
              <path d="M12 7 L14 12 L12 17 L10 12 Z" fill="#b45309" />
            </svg>
            <span
              data-testid="hud-coins"
              className="font-mono-num text-lg font-bold text-amber-300 leading-none"
            >
              {hud.coins}
            </span>
          </div>

          <button
            type="button"
            tabIndex={-1}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="pointer-events-auto flex items-center justify-center w-11 h-11 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-white/20 text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-rose-400" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause game"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="pointer-events-auto flex items-center justify-center w-11 h-11 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-amber-400/40 text-amber-300 transition-colors cursor-pointer"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Transient CID Inspector Abhijeet Hindi Voice Banner (Upper-center sky so characters stay 100% clear) */}
      {hud.activeDialogue && (
        <div className="fixed top-16 sm:top-5 left-1/2 -translate-x-1/2 w-[90vw] max-w-md px-4 py-2 rounded-xl bg-slate-950/90 border-2 border-amber-400 shadow-2xl text-center pointer-events-none">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Inspector Abhijeet
          </div>
          <div
            data-testid="abhijeet-dialogue"
            className="mt-0.5 text-sm sm:text-base font-bold text-white"
          >
            “{hud.activeDialogue}”
          </div>
        </div>
      )}
    </div>
  );
};
