import type {
  CharacterConfig,
  CharacterId,
  CoinDef,
  CollisionOutcome,
  EnvironmentZone,
  Lane,
  ObstacleDef,
  TrackSegmentPlan,
} from './types';

export const LANE_WIDTH = 3.2;
export const SEGMENT_LENGTH = 36;
export const BASE_RUN_SPEED = 16.5; // m/s
export const MAX_RUN_SPEED = 35.0;  // m/s
export const GRAVITY = -42.0;       // m/s^2
export const JUMP_VELOCITY = 15.2;  // m/s -> peak ~2.75m
export const SLIDE_DURATION = 0.68; // seconds
export const TRAIN_ROOF_Y = 3.15;

export const ABHIJEET_CLOSE_DIALOGUES: readonly string[] = [
  'Bas ek baar mil ja beta, fir dekh!',
  'Ruk ja beta, aaj bachne nahi dunga!',
  'Pakad mein aa gaya toh dekh lena!',
];

export const ABHIJEET_CAUGHT_DIALOGUE = 'Kyun re, kya samajh rakha hai apne aap ko!';

export const CHARACTERS: Record<CharacterId, CharacterConfig> = {
  aarav: {
    id: 'aarav',
    name: 'Aarav',
    tagline: 'Mumbai Track Sprinter',
    city: 'Dadar Yard',
    primaryColor: 0xf97316,   // Saffron hoodie
    secondaryColor: 0x1e3a8a, // Indigo denim
    accentColor: 0xfacc15,    // Gold trim & sneakers
    skinColor: 0xc68652,
    hairColor: 0x171717,
    headwear: 'cap',
    swatchCss: '#f97316',
    accentCss: '#facc15',
  },
  kabir: {
    id: 'kabir',
    name: 'Kabir',
    tagline: 'Gully Cricket Striker',
    city: 'Delhi Junction',
    primaryColor: 0x0284c7,   // Team blue jersey
    secondaryColor: 0x1e293b, // Charcoal track pants
    accentColor: 0x38bdf8,    // Sky trim
    skinColor: 0xb87544,
    hairColor: 0x111827,
    headwear: 'headband',
    swatchCss: '#0284c7',
    accentCss: '#38bdf8',
  },
  vikram: {
    id: 'vikram',
    name: 'Vikram',
    tagline: 'Express Roof Jumper',
    city: 'Jaipur Central',
    primaryColor: 0x059669,   // Emerald jacket
    secondaryColor: 0x3f3f46, // Slate cargos
    accentColor: 0xfbbf24,    // Amber sneakers
    skinColor: 0xcf8e5b,
    hairColor: 0x18181b,
    headwear: 'hair',
    swatchCss: '#059669',
    accentCss: '#fbbf24',
  },
};

export const CHARACTER_LIST: CharacterConfig[] = [
  CHARACTERS.aarav,
  CHARACTERS.kabir,
  CHARACTERS.vikram,
];

export function laneToX(lane: Lane): number {
  return lane * LANE_WIDTH;
}

export function clampLane(lane: number): Lane {
  if (lane <= -1) return -1;
  if (lane >= 1) return 1;
  return 0;
}

export function computeRunSpeed(distanceMeters: number): number {
  // Smooth ramp over first 1800 meters
  const t = Math.min(1, Math.max(0, distanceMeters / 1800));
  const eased = 1 - Math.pow(1 - t, 1.45);
  return BASE_RUN_SPEED + (MAX_RUN_SPEED - BASE_RUN_SPEED) * eased;
}

export function computeScore(distanceMeters: number, runCoins: number, multiplier = 1): number {
  return Math.floor(distanceMeters * 2.5 * multiplier + runCoins * 15);
}

export function zoneForSegment(segmentIndex: number): EnvironmentZone {
  if (segmentIndex < 0) return 'yard';
  // Cycle through railway environments cleanly:
  // 0-2: yard, 3-4: station, 5-7: bridge, 8-9: tunnel
  const cycle = segmentIndex % 10;
  if (cycle <= 2) return 'yard';
  if (cycle <= 4) return 'station';
  if (cycle <= 7) return 'bridge';
  return 'tunnel';
}

export function pickAbhijeetCloseDialogue(seed: number): string {
  const idx = Math.abs(Math.floor(seed)) % ABHIJEET_CLOSE_DIALOGUES.length;
  return ABHIJEET_CLOSE_DIALOGUES[idx];
}

export interface PlayerBounds {
  x: number;
  y: number; // feet Y
  z: number;
  vy: number;
  isSliding: boolean;
}

export function getPlayerHitbox(player: PlayerBounds) {
  const halfW = 0.38;
  const halfD = 0.35;
  const height = player.isSliding ? 0.72 : 1.68;
  return {
    minX: player.x - halfW,
    maxX: player.x + halfW,
    minY: player.y,
    maxY: player.y + height,
    minZ: player.z - halfD,
    maxZ: player.z + halfD,
  };
}

export function evaluateObstacleCollisions(
  player: PlayerBounds,
  obstacles: ObstacleDef[],
  abhijeetIsClose: boolean,
): CollisionOutcome {
  const p = getPlayerHitbox(player);

  for (const obs of obstacles) {
    if (obs.hitTriggered) continue;

    const obsX = laneToX(obs.lane);
    const halfW = obs.width * 0.5;
    const obsMinX = obsX - halfW;
    const obsMaxX = obsX + halfW;

    const overlapX = p.maxX > obsMinX && p.minX < obsMaxX;
    if (!overlapX) continue;

    const obsMinZ = obs.z - obs.length * 0.5;
    const obsMaxZ = obs.z + obs.length * 0.5;
    const overlapZ = p.maxZ > obsMinZ && p.minZ < obsMaxZ;
    if (!overlapZ) continue;

    // Special case: ramp onto static train roof
    if (obs.kind === 'train_ramp') {
      const progress = (obsMaxZ - player.z) / Math.max(0.1, obs.length);
      const clamped = Math.max(0, Math.min(1, progress));
      const rampY = clamped * TRAIN_ROOF_Y;
      if (player.y <= rampY + 0.45 && player.vy <= 4) {
        return { type: 'land_on_train', roofY: rampY };
      }
      continue;
    }

    // Train roof landing check
    if (obs.kind === 'train_static' || obs.kind === 'train_moving') {
      if (player.y >= obs.maxY - 0.55 && player.vy <= 0.5) {
        return { type: 'land_on_train', roofY: obs.maxY };
      }
    }

    // Check vertical overlap
    const overlapY = p.maxY > obs.minY + 0.08 && p.minY < obs.maxY - 0.08;
    if (!overlapY) continue;

    // Determine whether this hit is a glancing side-stumble or a fatal collision
    const centerDistX = Math.abs(player.x - obsX);
    const isGlancingEdge = centerDistX > halfW * 0.68;

    if (obs.kind === 'barrier_low') {
      if (abhijeetIsClose) {
        return { type: 'fatal', obstacleId: obs.id, reason: 'Tripped over railway barricade!' };
      }
      return { type: 'stumble', obstacleId: obs.id, reason: 'Clipped a track barrier!' };
    }

    if (obs.kind === 'barrier_high') {
      if (abhijeetIsClose) {
        return { type: 'fatal', obstacleId: obs.id, reason: 'Hit overhead signal bar!' };
      }
      return { type: 'stumble', obstacleId: obs.id, reason: 'Ducked too late under signal bar!' };
    }

    if (isGlancingEdge && !abhijeetIsClose) {
      return {
        type: 'stumble',
        obstacleId: obs.id,
        reason: obs.kind.includes('train') ? 'Brushed past a rail coach!' : 'Scraped past a roadblock!',
      };
    }

    const reason =
      obs.kind === 'train_moving'
        ? 'Blocked by an oncoming express train!'
        : obs.kind === 'train_static'
          ? 'Crashed into a parked rail coach!'
          : 'Stopped at a railway barricade!';

    return { type: 'fatal', obstacleId: obs.id, reason };
  }

  return { type: 'none' };
}

export function collectOverlappingCoins(player: PlayerBounds, coins: CoinDef[]): number {
  const p = getPlayerHitbox(player);
  const pickupPad = 0.55;
  let collectedCount = 0;

  for (const coin of coins) {
    if (coin.collected) continue;
    const cx = laneToX(coin.lane);
    if (
      p.maxX + pickupPad >= cx &&
      p.minX - pickupPad <= cx &&
      p.maxY + pickupPad >= coin.y - 0.4 &&
      p.minY - pickupPad <= coin.y + 0.4 &&
      p.maxZ + pickupPad >= coin.z - 0.4 &&
      p.minZ - pickupPad <= coin.z + 0.4
    ) {
      coin.collected = true;
      collectedCount += 1;
    }
  }

  return collectedCount;
}

export function createSeededRng(seed: number): () => number {
  let state = (seed >>> 0) || 1337;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Generates a 36m railway segment with guaranteed solvable lanes.
 * Segment 0 and 1 are gentle warm-up segments so the player survives opening seconds cleanly.
 */
export function generateTrackSegment(
  segmentIndex: number,
  runSpeed: number,
  rng: () => number,
): TrackSegmentPlan {
  const zStart = -segmentIndex * SEGMENT_LENGTH;
  const zEnd = zStart - SEGMENT_LENGTH;
  const zone = zoneForSegment(segmentIndex);
  const obstacles: Omit<ObstacleDef, 'id'>[] = [];
  const coins: Omit<CoinDef, 'id' | 'collected'>[] = [];

  // Behind-camera runway (empty yard)
  if (segmentIndex < 0) {
    return { index: segmentIndex, zStart, zEnd, zone, obstacles, coins };
  }

  // Safe opening runway for first segment
  if (segmentIndex === 0) {
    for (let i = 0; i < 6; i++) {
      coins.push({ lane: 0, z: zStart - 10 - i * 3.5, y: 0.9 });
    }
    return { index: segmentIndex, zStart, zEnd, zone, obstacles, coins };
  }

  const lanes: Lane[] = [-1, 0, 1];
  const difficulty = Math.min(1, (runSpeed - BASE_RUN_SPEED) / (MAX_RUN_SPEED - BASE_RUN_SPEED));

  // Always reserve at least one guaranteed safe (or jump/slide-passable) lane
  const safeLane = lanes[Math.floor(rng() * 3)];
  const otherLanes = lanes.filter((l) => l !== safeLane);

  // Pattern selection
  const roll = rng();

  if (segmentIndex === 1) {
    // Gentle intro: 1 low hurdle + coin arc on safe lane
    const hurdleLane = otherLanes[0];
    obstacles.push({
      kind: 'barrier_low',
      lane: hurdleLane,
      z: zStart - 18,
      length: 0.8,
      width: 2.2,
      minY: 0,
      maxY: 1.05,
      speed: 0,
    });
    for (let i = 0; i < 5; i++) {
      coins.push({ lane: safeLane, z: zStart - 8 - i * 4, y: 0.9 });
    }
    return { index: segmentIndex, zStart, zEnd, zone, obstacles, coins };
  }

  if (roll < 0.30) {
    // Pattern A: Moving express train on one lane + barrier on another + open/coin lane
    const trainLane = otherLanes[0];
    const secondLane = otherLanes[1];
    const trainSpeed = 11 + difficulty * 9;

    obstacles.push({
      kind: 'train_moving',
      lane: trainLane,
      z: zStart - 22,
      length: 14,
      width: 2.4,
      minY: 0,
      maxY: TRAIN_ROOF_Y,
      speed: trainSpeed,
    });

    if (rng() < 0.65) {
      const barrierKind = rng() < 0.5 ? 'barrier_low' : 'barrier_high';
      obstacles.push({
        kind: barrierKind,
        lane: secondLane,
        z: zStart - 16,
        length: 0.9,
        width: 2.2,
        minY: barrierKind === 'barrier_high' ? 1.15 : 0,
        maxY: barrierKind === 'barrier_high' ? 2.8 : 1.05,
        speed: 0,
      });
    }

    // Coin arc over or along safe lane
    for (let i = 0; i < 6; i++) {
      coins.push({ lane: safeLane, z: zStart - 7 - i * 4, y: 0.9 });
    }
  } else if (roll < 0.60) {
    // Pattern B: Parked train with climbable ramp + coins on roof + safe side lane
    const trainLane = otherLanes[0];
    const rampZ = zStart - 9;
    const trainZ = zStart - 22;

    obstacles.push({
      kind: 'train_ramp',
      lane: trainLane,
      z: rampZ,
      length: 5.5,
      width: 2.2,
      minY: 0,
      maxY: TRAIN_ROOF_Y,
      speed: 0,
    });
    obstacles.push({
      kind: 'train_static',
      lane: trainLane,
      z: trainZ,
      length: 17,
      width: 2.4,
      minY: 0,
      maxY: TRAIN_ROOF_Y,
      speed: 0,
      hasRamp: true,
    });

    // Rewarding roof coins!
    for (let i = 0; i < 5; i++) {
      coins.push({
        lane: trainLane,
        z: trainZ + 6 - i * 3.2,
        y: TRAIN_ROOF_Y + 0.9,
      });
    }

    // Optional hurdle on second non-safe lane
    if (rng() < 0.5 + difficulty * 0.35) {
      obstacles.push({
        kind: 'barrier_full',
        lane: otherLanes[1],
        z: zStart - 20,
        length: 1.1,
        width: 2.35,
        minY: 0,
        maxY: 2.4,
        speed: 0,
      });
    }

    for (let i = 0; i < 4; i++) {
      coins.push({ lane: safeLane, z: zStart - 10 - i * 4.5, y: 0.9 });
    }
  } else if (roll < 0.82) {
    // Pattern C: Hurdle & Slide gauntlet across two slots (safe lane still clean or jumpable)
    const firstZ = zStart - 11;
    const secondZ = zStart - 25;

    obstacles.push({
      kind: 'barrier_low',
      lane: otherLanes[0],
      z: firstZ,
      length: 0.8,
      width: 2.2,
      minY: 0,
      maxY: 1.05,
      speed: 0,
    });

    obstacles.push({
      kind: 'barrier_high',
      lane: otherLanes[1],
      z: firstZ,
      length: 0.85,
      width: 2.2,
      minY: 1.15,
      maxY: 2.8,
      speed: 0,
    });

    // Second row: low jump hurdle on safeLane (jumpable!) + full block on one other
    obstacles.push({
      kind: 'barrier_low',
      lane: safeLane,
      z: secondZ,
      length: 0.8,
      width: 2.2,
      minY: 0,
      maxY: 1.05,
      speed: 0,
    });
    // Jump coin parabola over safeLane hurdle
    for (let i = -2; i <= 2; i++) {
      const arcY = 2.4 - (i * i) * 0.32;
      coins.push({ lane: safeLane, z: secondZ - i * 1.6, y: arcY });
    }

    if (rng() < 0.6) {
      obstacles.push({
        kind: 'barrier_high',
        lane: otherLanes[0],
        z: secondZ,
        length: 0.85,
        width: 2.2,
        minY: 1.15,
        maxY: 2.8,
        speed: 0,
      });
    }
  } else {
    // Pattern D: Dual trains (one moving, one static) leaving 1 clear express lane!
    obstacles.push({
      kind: 'train_static',
      lane: otherLanes[0],
      z: zStart - 18,
      length: 15,
      width: 2.4,
      minY: 0,
      maxY: TRAIN_ROOF_Y,
      speed: 0,
    });
    obstacles.push({
      kind: 'train_moving',
      lane: otherLanes[1],
      z: zStart - 26,
      length: 14,
      width: 2.4,
      minY: 0,
      maxY: TRAIN_ROOF_Y,
      speed: 12 + difficulty * 8,
    });

    for (let i = 0; i < 6; i++) {
      coins.push({ lane: safeLane, z: zStart - 8 - i * 3.8, y: 0.9 });
    }
  }

  return { index: segmentIndex, zStart, zEnd, zone, obstacles, coins };
}
