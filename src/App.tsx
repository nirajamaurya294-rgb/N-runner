import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CharacterModal } from './components/CharacterModal';
import { DownloadModal } from './components/DownloadModal';
import { GameOverModal } from './components/GameOverModal';
import { HudOverlay } from './components/HudOverlay';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { TitleOverlay } from './components/TitleOverlay';
import { RunnerEngine } from './game/RunnerEngine';
import { loadProgress, saveProgress } from './game/storage';
import type { CharacterId, GamePhase, GameSettings, HudSnapshot, PersistedProgress } from './game/types';

export default function App() {
  const initialProgressRef = useRef<PersistedProgress>(loadProgress());
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RunnerEngine | null>(null);

  const [progress, setProgress] = useState<PersistedProgress>(initialProgressRef.current);
  const [phase, setPhase] = useState<GamePhase>('title');
  const [showCharacters, setShowCharacters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);

  const [hud, setHud] = useState<HudSnapshot>({
    phase: 'title',
    score: 0,
    highScore: initialProgressRef.current.highScore,
    coins: 0,
    totalCoins: initialProgressRef.current.totalCoins,
    distanceMeters: 0,
    speedKmh: 59,
    multiplier: 1,
    dangerLevel: 0,
    caughtReason: '',
    activeDialogue: null,
  });

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const syncBodyState = useCallback((nextPhase: GamePhase) => {
    document.body.dataset.state = nextPhase;
    setPhase(nextPhase);
  }, []);

  const handleStartGame = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.currentTarget.blur();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setShowCharacters(false);
      setShowSettings(false);
      setShowDownload(false);
      setIsNewBest(false);
      syncBodyState('playing');
      engineRef.current?.startGame();
    },
    [syncBodyState],
  );

  const handlePauseGame = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    syncBodyState('paused');
    engineRef.current?.pauseGame();
  }, [syncBodyState]);

  const handleResumeGame = useCallback(() => {
    if (phaseRef.current !== 'paused') return;
    syncBodyState('playing');
    engineRef.current?.resumeGame();
  }, [syncBodyState]);

  const handleTogglePause = useCallback(() => {
    if (phaseRef.current === 'playing') {
      handlePauseGame();
    } else if (phaseRef.current === 'paused') {
      handleResumeGame();
    }
  }, [handlePauseGame, handleResumeGame]);

  const handleReturnToTitle = useCallback(() => {
    setShowCharacters(false);
    setShowSettings(false);
    setShowDownload(false);
    syncBodyState('title');
    engineRef.current?.returnToTitle();
  }, [syncBodyState]);

  const handleUpdateSettings = useCallback((nextSettings: GameSettings) => {
    setProgress((prev) => {
      const updated = { ...prev, settings: nextSettings };
      saveProgress(updated);
      return updated;
    });
    engineRef.current?.updateSettings(nextSettings);
  }, []);

  const handleToggleMute = useCallback(() => {
    const current = progressRef.current.settings;
    handleUpdateSettings({
      ...current,
      soundEnabled: !current.soundEnabled,
    });
  }, [handleUpdateSettings]);

  const handleSelectCharacter = useCallback((id: CharacterId) => {
    setProgress((prev) => {
      const updated = { ...prev, selectedCharacter: id };
      saveProgress(updated);
      return updated;
    });
    engineRef.current?.setCharacter(id);
  }, []);

  const handleGameOverRef = useRef<(snap: HudSnapshot) => void>(() => {});
  handleGameOverRef.current = (finalSnap: HudSnapshot) => {
    const prev = progressRef.current;
    const beatRecord = finalSnap.score > prev.highScore;
    const nextHighScore = Math.max(prev.highScore, finalSnap.score);
    const nextTotalCoins = prev.totalCoins + finalSnap.coins;

    const updated: PersistedProgress = {
      ...prev,
      highScore: nextHighScore,
      totalCoins: nextTotalCoins,
    };
    saveProgress(updated);
    setProgress(updated);
    engineRef.current?.updateStoredStats(nextHighScore, nextTotalCoins);

    setIsNewBest(beatRecord);
    setHud({
      ...finalSnap,
      phase: 'gameover',
      highScore: nextHighScore,
      totalCoins: nextTotalCoins,
    });
    syncBodyState('gameover');
  };

  const handleTogglePauseRef = useRef<() => void>(() => {});
  handleTogglePauseRef.current = handleTogglePause;

  const handleToggleMuteRef = useRef<() => void>(() => {});
  handleToggleMuteRef.current = handleToggleMute;

  // Mount WebGLRunner once into isolated container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const init = initialProgressRef.current;
    const engine = new RunnerEngine(
      mount,
      init.selectedCharacter,
      init.highScore,
      init.totalCoins,
      init.settings,
      {
        onHudUpdate: (snap) => setHud(snap),
        onGameOver: (snap) => handleGameOverRef.current(snap),
        onTogglePause: () => handleTogglePauseRef.current(),
        onToggleMute: () => handleToggleMuteRef.current(),
      },
    );
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      document.body.dataset.state = 'playing';
      setPhase('playing');
      engine.startGame();
    } else {
      document.body.dataset.state = 'title';
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Enter / Space handshake on Title or GameOver screen
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showCharacters || showSettings || showDownload) {
        if (e.code === 'Escape') {
          setShowCharacters(false);
          setShowSettings(false);
          setShowDownload(false);
        }
        return;
      }
      if (phase === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleStartGame();
      } else if (phase === 'gameover' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleStartGame();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, showCharacters, showSettings, showDownload, handleStartGame]);

  return (
    <main className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      {/* Isolated 3D WebGL Viewport */}
      <div
        ref={canvasMountRef}
        data-testid="game-viewport"
        className="fixed inset-0 w-full h-full z-0"
      />

      {/* Title Screen */}
      {phase === 'title' && (
        <TitleOverlay
          highScore={progress.highScore}
          totalCoins={progress.totalCoins}
          selectedCharacter={progress.selectedCharacter}
          onStart={handleStartGame}
          onOpenCharacters={() => setShowCharacters(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenDownload={() => setShowDownload(true)}
        />
      )}

      {/* Active Playing HUD */}
      {phase === 'playing' && (
        <HudOverlay
          hud={hud}
          soundEnabled={progress.settings.soundEnabled}
          onPause={handlePauseGame}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Pause Modal */}
      {phase === 'paused' && (
        <PauseModal
          score={hud.score}
          coins={hud.coins}
          soundEnabled={progress.settings.soundEnabled}
          onResume={handleResumeGame}
          onRestart={() => handleStartGame()}
          onHome={handleReturnToTitle}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Game Over Modal */}
      {phase === 'gameover' && (
        <GameOverModal
          snapshot={hud}
          isNewBest={isNewBest}
          onReplay={() => handleStartGame()}
          onOpenCharacters={() => setShowCharacters(true)}
          onHome={handleReturnToTitle}
        />
      )}

      {/* Character Selection Modal */}
      {showCharacters && (
        <CharacterModal
          selectedCharacter={progress.selectedCharacter}
          onSelect={handleSelectCharacter}
          onClose={() => setShowCharacters(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={progress.settings}
          onUpdateSettings={handleUpdateSettings}
          onOpenDownload={() => setShowDownload(true)}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Download / Install Modal */}
      {showDownload && <DownloadModal onClose={() => setShowDownload(false)} />}
    </main>
  );
}
