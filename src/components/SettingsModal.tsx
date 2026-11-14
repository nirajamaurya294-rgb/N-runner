import React from 'react';
import { Download, Music, Smartphone, Volume2, MessageSquareQuote, X } from 'lucide-react';
import type { GameSettings } from '../game/types';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onOpenDownload: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onOpenDownload,
  onClose,
}) => {
  const toggle = (key: keyof GameSettings) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75"
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/15 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 id="settings-modal-title" className="font-display text-xl font-bold text-white">
            Settings & Controls
          </h2>
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-white/10 cursor-pointer">
            <span className="flex items-center gap-3 text-sm font-semibold text-white">
              <Volume2 className="w-5 h-5 text-amber-400" />
              Sound Effects
            </span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={() => toggle('soundEnabled')}
              className="w-5 h-5 accent-amber-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-white/10 cursor-pointer">
            <span className="flex items-center gap-3 text-sm font-semibold text-white">
              <Music className="w-5 h-5 text-amber-400" />
              Chase Background Music
            </span>
            <input
              type="checkbox"
              checked={settings.musicEnabled}
              onChange={() => toggle('musicEnabled')}
              className="w-5 h-5 accent-amber-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-white/10 cursor-pointer">
            <span className="flex items-center gap-3 text-sm font-semibold text-white">
              <MessageSquareQuote className="w-5 h-5 text-amber-400" />
              Inspector Abhijeet Hindi Voice
            </span>
            <input
              type="checkbox"
              checked={settings.voiceEnabled}
              onChange={() => toggle('voiceEnabled')}
              className="w-5 h-5 accent-amber-500 cursor-pointer"
            />
          </label>

          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-white/10 text-xs text-slate-300 space-y-2.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-400" />
              Mobile & Android APK Support
            </div>
            <p className="leading-relaxed">
              Swipe Left / Right to switch tracks, Swipe Up to jump, and Swipe Down to slide in both
              portrait and landscape modes.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDownload();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-400/35 text-amber-300 font-semibold text-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download / Install N RUNNER
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
