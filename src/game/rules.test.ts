import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ABHIJEET_CAUGHT_DIALOGUE,
  ABHIJEET_CLOSE_DIALOGUES,
  BASE_RUN_SPEED,
  CHARACTER_LIST,
  LANE_WIDTH,
  MAX_RUN_SPEED,
  clampLane,
  collectOverlappingCoins,
  computeRunSpeed,
  computeScore,
  createSeededRng,
  evaluateObstacleCollisions,
  generateTrackSegment,
  laneToX,
  pickAbhijeetCloseDialogue,
  zoneForSegment,
} from './rules';
import type { CoinDef, ObstacleDef } from './types';

test('lane coordinate mapping and clamping behave accurately', () => {
  assert.equal(laneToX(-1), -LANE_WIDTH);
  assert.equal(laneToX(0), 0);
  assert.equal(laneToX(1), LANE_WIDTH);
  assert.equal(clampLane(-2), -1);
  assert.equal(clampLane(2), 1);
  assert.equal(clampLane(0), 0);
});

test('run speed ramps smoothly between base and max speed', () => {
  assert.equal(computeRunSpeed(0), BASE_RUN_SPEED);
  assert.ok(computeRunSpeed(600) > BASE_RUN_SPEED);
  assert.ok(computeRunSpeed(600) < MAX_RUN_SPEED);
  assert.equal(computeRunSpeed(5000), MAX_RUN_SPEED);
});

test('score calculation rewards both distance and coins', () => {
  assert.equal(computeScore(100, 10, 1), 400);
  assert.equal(computeScore(100, 10, 2), 650);
});

test('jump clears low barrier and slide clears high overhead barrier', () => {
  const lowBarrier: ObstacleDef = {
    id: 1,
    kind: 'barrier_low',
    lane: 0,
    z: -20,
    length: 0.8,
    width: 2.2,
    minY: 0,
    maxY: 1.05,
    speed: 0,
  };

  // Jumping over low barrier
  const jumpingOver = evaluateObstacleCollisions(
    { x: 0, y: 1.2, z: -20, vy: 2, isSliding: false },
    [lowBarrier],
    false,
  );
  assert.equal(jumpingOver.type, 'none');

  // Running straight into low barrier triggers stumble when Abhijeet is far, fatal when close
  const stumbleLow = evaluateObstacleCollisions(
    { x: 0, y: 0, z: -20, vy: 0, isSliding: false },
    [lowBarrier],
    false,
  );
  assert.equal(stumbleLow.type, 'stumble');

  const fatalLow = evaluateObstacleCollisions(
    { x: 0, y: 0, z: -20, vy: 0, isSliding: false },
    [lowBarrier],
    true,
  );
  assert.equal(fatalLow.type, 'fatal');

  const highBarrier: ObstacleDef = {
    id: 2,
    kind: 'barrier_high',
    lane: 0,
    z: -30,
    length: 0.8,
    width: 2.2,
    minY: 1.15,
    maxY: 2.8,
    speed: 0,
  };

  // Sliding under high barrier clears it safely (slide height 0.72 < minY 1.15)
  const slidingUnder = evaluateObstacleCollisions(
    { x: 0, y: 0, z: -30, vy: 0, isSliding: true },
    [highBarrier],
    true,
  );
  assert.equal(slidingUnder.type, 'none');

  // Standing upright hits high barrier
  const standingHit = evaluateObstacleCollisions(
    { x: 0, y: 0, z: -30, vy: 0, isSliding: false },
    [highBarrier],
    true,
  );
  assert.equal(standingHit.type, 'fatal');
});

test('train collision differentiates front crash from landing on roof', () => {
  const train: ObstacleDef = {
    id: 10,
    kind: 'train_static',
    lane: 1,
    z: -50,
    length: 16,
    width: 2.4,
    minY: 0,
    maxY: 3.15,
    speed: 0,
  };

  // Head-on crash
  const frontCrash = evaluateObstacleCollisions(
    { x: laneToX(1), y: 0, z: -50, vy: 0, isSliding: false },
    [train],
    false,
  );
  assert.equal(frontCrash.type, 'fatal');

  // Running safely on top of the roof
  const onRoof = evaluateObstacleCollisions(
    { x: laneToX(1), y: 3.1, z: -50, vy: -1, isSliding: false },
    [train],
    false,
  );
  assert.equal(onRoof.type, 'land_on_train');
});

test('coin collection detects overlap and marks coins collected once', () => {
  const coins: CoinDef[] = [
    { id: 1, lane: 0, z: -15, y: 0.9, collected: false },
    { id: 2, lane: 1, z: -15, y: 0.9, collected: false },
  ];

  const firstPass = collectOverlappingCoins(
    { x: 0, y: 0.2, z: -15, vy: 0, isSliding: false },
    coins,
  );
  assert.equal(firstPass, 1);
  assert.equal(coins[0].collected, true);
  assert.equal(coins[1].collected, false);

  const secondPass = collectOverlappingCoins(
    { x: 0, y: 0.2, z: -15, vy: 0, isSliding: false },
    coins,
  );
  assert.equal(secondPass, 0);
});

test('track segment generator cycles all 4 railway environments and always leaves a passable path', () => {
  const seenZones = new Set<string>();
  const rng = createSeededRng(42);

  for (let i = 0; i < 40; i++) {
    seenZones.add(zoneForSegment(i));
    const seg = generateTrackSegment(i, BASE_RUN_SPEED + i * 0.4, rng);
    // Verify no single Z slice blocks all 3 lanes with unavoidable full-height obstacles
    const fullBlockedLanesAtMid = new Set<number>();
    for (const obs of seg.obstacles) {
      if (obs.kind === 'barrier_full' || obs.kind === 'train_static' || obs.kind === 'train_moving') {
        fullBlockedLanesAtMid.add(obs.lane);
      }
    }
    assert.ok(fullBlockedLanesAtMid.size < 3, `Segment ${i} blocked all 3 lanes!`);
  }

  assert.deepEqual(
    ['yard', 'station', 'bridge', 'tunnel'].every((z) => seenZones.has(z)),
    true,
  );
});

test('Abhijeet Hindi dialogues and character roster match requirements', () => {
  assert.equal(ABHIJEET_CLOSE_DIALOGUES.length, 3);
  assert.ok(ABHIJEET_CLOSE_DIALOGUES.includes('Bas ek baar mil ja beta, fir dekh!'));
  assert.ok(ABHIJEET_CLOSE_DIALOGUES.includes('Ruk ja beta, aaj bachne nahi dunga!'));
  assert.ok(ABHIJEET_CLOSE_DIALOGUES.includes('Pakad mein aa gaya toh dekh lena!'));
  assert.equal(ABHIJEET_CAUGHT_DIALOGUE, 'Kyun re, kya samajh rakha hai apne aap ko!');
  assert.equal(pickAbhijeetCloseDialogue(0), ABHIJEET_CLOSE_DIALOGUES[0]);
  assert.ok(CHARACTER_LIST.length >= 3);
});
