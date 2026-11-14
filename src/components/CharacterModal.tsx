import React from 'react';
import { Check, X } from 'lucide-react';
import { CHARACTER_LIST } from '../game/rules';
import type { CharacterId } from '../game/types';

interface CharacterModalProps {
  selectedCharacter: CharacterId;
  onSelect: (id: CharacterId) => void;
  onClose: () => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  selectedCharacter,
  onSelect,
  onClose,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="char-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/70"
    >
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-amber-400/35 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 id="char-modal-title" className="font-display text-xl font-bold text-white">
              Select Runner
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Choose your runner to preview live on the railway tracks
            </p>
          </div>
          <button
            type="button"
            aria-label="Close character selection"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {CHARACTER_LIST.map((char) => {
            const isSelected = char.id === selectedCharacter;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => onSelect(char.id)}
                className={`text-left p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-800 border-amber-400 ring-2 ring-amber-400/40'
                    : 'bg-slate-950/60 border-white/10 hover:border-white/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="w-7 h-7 rounded-lg border border-white/25 shrink-0"
                      style={{
                        backgroundColor: char.swatchCss,
                        boxShadow: `inset 0 -4px 0 ${char.accentCss}`,
                      }}
                    />
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300">
                        <Check className="w-4 h-4" />
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-3 font-display text-lg font-bold text-white">{char.name}</div>
                  <div className="text-xs font-medium text-amber-300/90">{char.tagline}</div>
                </div>
                <div className="text-xs text-slate-400">{char.city}</div>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
