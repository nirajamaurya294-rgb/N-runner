export type Lane = -1 | 0 | 1;

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type CharacterId = 'aarav' | 'kabir' | 'vikram';

export type EnvironmentZone = 'yard' | 'station' | 'bridge' | 'tunnel';

export type ObstacleKind =
  | 'barrier_low'     // Jump over
  | 'barrier_high'    // Slide under
  | 'barrier_full'    // Dodge lane
  | 'train_static'    // Parked railway coach (dodge lane or climb via ramp)
  | 'train_moving'    // Approaching express train (dodge lane)
  | 'train_ramp';     // Ramp leading onto static train roof

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  tagline: string;
  city: string;
  primaryColor: number;
  secondaryColor: number;
  accentColor: number;
  skinColor: number;
  hairColor: number;
  headwear: 'cap' | 'headband' | 'hair';
  swatchCss: string;
  accentCss: string;
}

export interface ObstacleDef {
  id: number;
  kind: ObstacleKind;
  lane: Lane;
  z: number;         // Negative Z is forward along the track
  length: number;    // Depth along Z
  width: number;
  minY: number;      // Bottom clearance
  maxY: number;      // Top height
  speed: number;     // >0 means moving toward player (+Z)
  hasRamp?: boolean; // Can player run onto roof?
  hitTriggered?: boolean;
}

export interface CoinDef {
  id: number;
  lane: Lane;
  z: number;
  y: number;
  collected: boolean;
}

export interface TrackSegmentPlan {
  index: number;
  zStart: number;    // Closer to 0 (less negative)
  zEnd: number;      // Further forward (more negative)
  zone: EnvironmentZone;
  obstacles: Omit<ObstacleDef, 'id'>[];
  coins: Omit<CoinDef, 'id' | 'collected'>[];
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  voiceEnabled: boolean;
}

export interface PersistedProgress {
  highScore: number;
  totalCoins: number;
  selectedCharacter: CharacterId;
  settings: GameSettings;
}

export interface HudSnapshot {
  phase: GamePhase;
  score: number;
  highScore: number;
  coins: number;
  totalCoins: number;
  distanceMeters: number;
  speedKmh: number;
  multiplier: number;
  dangerLevel: number; // 0 (safe) to 1 (Abhijeet right behind)
  caughtReason: string;
  activeDialogue: string | null;
}

export type CollisionOutcome =
  | { type: 'none' }
  | { type: 'land_on_train'; roofY: number }
  | { type: 'stumble'; obstacleId: number; reason: string }
  | { type: 'fatal'; obstacleId: number; reason: string };
