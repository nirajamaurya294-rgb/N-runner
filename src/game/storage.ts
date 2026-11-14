import type { CharacterId, GameSettings, PersistedProgress } from './types';

const STORAGE_KEY = 'n_runner_save_v1';

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  voiceEnabled: true,
};

const DEFAULT_PROGRESS: PersistedProgress = {
  highScore: 0,
  totalCoins: 0,
  selectedCharacter: 'aarav',
  settings: DEFAULT_SETTINGS,
};

export function loadProgress(): PersistedProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>;
    const charId: CharacterId =
      parsed.selectedCharacter === 'kabir' ||
      parsed.selectedCharacter === 'vikram' ||
      parsed.selectedCharacter === 'aarav'
        ? parsed.selectedCharacter
        : 'aarav';
    return {
      highScore: typeof parsed.highScore === 'number' && parsed.highScore >= 0 ? Math.floor(parsed.highScore) : 0,
      totalCoins: typeof parsed.totalCoins === 'number' && parsed.totalCoins >= 0 ? Math.floor(parsed.totalCoins) : 0,
      selectedCharacter: charId,
      settings: {
        soundEnabled: parsed.settings?.soundEnabled ?? true,
        musicEnabled: parsed.settings?.musicEnabled ?? true,
        voiceEnabled: parsed.settings?.voiceEnabled ?? true,
      },
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: PersistedProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors in restricted webviews
  }
}
