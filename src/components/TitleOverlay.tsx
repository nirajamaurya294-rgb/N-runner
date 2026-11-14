import React from 'react';
import { Download, Play, Settings, Users } from 'lucide-react';
import { CHARACTERS } from '../game/rules';
import type { CharacterId } from '../game/types';

interface TitleOverlayProps {
  highScore: number;
  totalCoins: number;
  selectedCharacter: CharacterId;
  onStart: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenCharacters: () => void;
  onOpenSettings: () => void;
  onOpenDownload: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  highScore,
  totalCoins,
  selectedCharacter,
  onStart,
  onOpenCharacters,
  onOpenSettings,
  onOpenDownload,
}) => {
  const activeChar = CHARACTERS[selectedCharacter];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-5 sm:p-8">
      {/* Top Row: Bespoke SVG Emblem over open sky negative space + Unboxed Record */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="pointer-events-auto max-w-md">
          <svg
            viewBox="0 0 440 118"
            className="w-72 sm:w-96 h-auto drop-shadow-[0_6px_14px_rgba(0,0,0,0.65)]"
            role="img"
            aria-label="N RUNNER"
          >
            <defs>
              <linearGradient id="nRunnerGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="55%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            {/* Railway track wing accent */}
            <path
              d="M12 96 L428 96 M24 106 L416 106"
              stroke="#fbbf24"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.9"
            />
            <path
              d="M52 96 L46 106 M112 96 L108 106 M172 96 L170 106 M232 96 L232 106 M292 96 L294 106 M352 96 L356 106"
              stroke="#f59e0b"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Shield badge behind N */}
            <path
              d="M18 16 L84 16 L96 52 L84 84 L18 84 L8 52 Z"
              fill="#0f172a"
              stroke="#f59e0b"
              strokeWidth="4"
            />
            <text
              x="52"
              y="67"
              textAnchor="middle"
              fontFamily="Chakra Petch, sans-serif"
              fontWeight="700"
              fontSize="52"
              fill="url(#nRunnerGold)"
            >
              N
            </text>
            <text
              x="114"
              y="69"
              fontFamily="Chakra Petch, sans-serif"
              fontWeight="700"
              fontSize="56"
              letterSpacing="3"
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth="7"
              paintOrder="stroke fill"
            >
              RUNNER
            </text>
          </svg>
          <p className="mt-1.5 text-sm sm:text-base font-semibold text-amber-100 hud-text-shadow">
            Outrun CID Inspector Abhijeet across 3 tracks
          </p>
        </div>

        {/* Clean unboxed tabular stats */}
        <div className="flex items-center gap-5 text-sm sm:text-base font-bold text-white hud-text-shadow">
          <div>
            <span className="text-amber-300/90 text-xs uppercase tracking-wider mr-1.5">Best</span>
            <span className="font-mono-num text-lg sm:text-xl">{highScore.toLocaleString()}</span>
          </div>
          <span aria-hidden="true" className="text-white/40">
            ·
          </span>
          <div>
            <span className="text-amber-300/90 text-xs uppercase tracking-wider mr-1.5">Coins</span>
            <span className="font-mono-num text-lg sm:text-xl">{totalCoins.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar + Single Flat Control Hint */}
      <div className="flex flex-col items-center gap-4 pb-2">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 w-full max-w-2xl">
          <button
            type="button"
            data-start="true"
            onClick={onStart}
            className="flex items-center justify-center gap-2.5 px-8 py-3.5 min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-display font-bold text-xl tracking-wide shadow-[0_6px_0_#b45309,0_12px_24px_rgba(0,0,0,0.5)] transition-transform whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
          >
            <Play className="w-6 h-6 fill-slate-950" />
            PLAY
          </button>

          <button
            type="button"
            onClick={onOpenCharacters}
            className="flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-400/40 text-white font-semibold text-sm sm:text-base shadow-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <Users className="w-5 h-5 text-amber-400" />
            <span>Runner: {activeChar.name}</span>
          </button>

          <button
            type="button"
            onClick={onOpenDownload}
            className="flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-400/40 text-white font-semibold text-sm sm:text-base shadow-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <Download className="w-5 h-5 text-amber-400" />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex items-center justify-center gap-2 px-4 py-3.5 min-h-[48px] min-w-[48px] rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/20 text-white font-semibold text-sm sm:text-base shadow-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <Settings className="w-5 h-5 text-slate-200" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>

        <p className="text-xs sm:text-sm font-medium text-amber-50/90 hud-text-shadow text-center">
          Swipe or Arrows / WASD Move · Space Jump · Down Slide · Esc / P Pause
        </p>
      </div>
    </div>
  );
};
