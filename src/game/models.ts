import * as THREE from 'three';
import { LANE_WIDTH, SEGMENT_LENGTH, TRAIN_ROOF_Y } from './rules';
import type { ProceduralTexturePack } from './textures';
import type { CharacterConfig, EnvironmentZone, ObstacleKind } from './types';

export interface CharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  shadow: THREE.Mesh;
}

export function createRunnerRig(
  config: CharacterConfig,
  textures: ProceduralTexturePack,
): CharacterRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const clothMat = new THREE.MeshStandardMaterial({
    color: config.primaryColor,
    roughness: 0.78,
    metalness: 0.05,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: config.secondaryColor,
    roughness: 0.82,
    metalness: 0.04,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: config.accentColor,
    roughness: 0.35,
    metalness: 0.2,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: config.skinColor,
    roughness: 0.58,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: config.hairColor,
    roughness: 0.72,
    metalness: 0.05,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.45,
    metalness: 0.08,
  });

  // Torso group (pivoted around hips at y = 0.78)
  const torso = new THREE.Group();
  torso.position.set(0, 0.78, 0);
  bodyPivot.add(torso);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.56, 0.3), clothMat);
  chest.position.y = 0.28;
  chest.castShadow = true;
  torso.add(chest);

  // Waist trim / belt stripe
  const beltTrim = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.32), accentMat);
  beltTrim.position.y = 0.05;
  torso.add(beltTrim);

  // Youth backpack (visible from 3rd-person chase camera!)
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.44, 0.18), pantsMat);
  backpack.position.set(0, 0.3, 0.22);
  backpack.castShadow = true;
  torso.add(backpack);

  const packStripe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.19), accentMat);
  packStripe.position.set(0, 0.36, 0.23);
  torso.add(packStripe);

  // Head group
  const head = new THREE.Group();
  head.position.set(0, 0.62, 0);
  torso.add(head);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 14), skinMat);
  cranium.position.y = 0.16;
  cranium.castShadow = true;
  head.add(cranium);

  // Hair cap
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat,
  );
  hair.position.set(0, 0.18, 0.01);
  head.add(hair);

  // Expressive eyes facing forward (-Z)
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
  leftEye.position.set(-0.07, 0.17, -0.18);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.07;
  head.add(leftEye, rightEye);

  // Character-specific headwear
  if (config.headwear === 'cap') {
    const capCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.218, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      accentMat,
    );
    capCrown.position.y = 0.2;
    head.add(capCrown);

    // Backwards cool street cap visor (+Z)
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.18), clothMat);
    visor.position.set(0, 0.22, 0.2);
    visor.rotation.x = 0.18;
    head.add(visor);
  } else if (config.headwear === 'headband') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.212, 0.212, 0.07, 16), accentMat);
    band.position.y = 0.23;
    head.add(band);
  } else {
    // Spiky runner tuft
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 8), hairMat);
    tuft.position.set(0, 0.37, -0.05);
    tuft.rotation.x = -0.35;
    head.add(tuft);
  }

  // Arms (pivoted at shoulder)
  const makeArm = (side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.35, 0.5, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.072, 0.26, 10), clothMat);
    sleeve.position.y = -0.12;
    sleeve.castShadow = true;
    arm.add(sleeve);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.054, 0.24, 10), skinMat);
    forearm.position.y = -0.34;
    arm.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), skinMat);
    hand.position.y = -0.47;
    arm.add(hand);

    torso.add(arm);
    return arm;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Legs (pivoted at hip y = 0.78)
  const makeLeg = (side: -1 | 1) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.15, 0.78, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.08, 0.36, 10), pantsMat);
    thigh.position.y = -0.18;
    thigh.castShadow = true;
    leg.add(thigh);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.068, 0.34, 10), pantsMat);
    shin.position.y = -0.5;
    shin.castShadow = true;
    leg.add(shin);

    const shoeUpper = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.27), accentMat);
    shoeUpper.position.set(0, -0.7, -0.04);
    shoeUpper.castShadow = true;
    leg.add(shoeUpper);

    const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.28), soleMat);
    shoeSole.position.set(0, -0.76, -0.04);
    leg.add(shoeSole);

    bodyPivot.add(leg);
    return leg;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  // Contact shadow disc
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.65, 20),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  root.add(shadow);

  return {
    root,
    bodyPivot,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    shadow,
  };
}

export function createInspectorRig(textures: ProceduralTexturePack): CharacterRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Slightly taller/broader silhouette for CID Inspector Abhijeet
  bodyPivot.scale.set(1.12, 1.12, 1.12);

  const khakiUniform = new THREE.MeshStandardMaterial({
    color: 0xb49663, // Indian police khaki
    roughness: 0.78,
    metalness: 0.04,
  });
  const blazerNavy = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // CID dark detective blazer over shirt
    roughness: 0.72,
    metalness: 0.06,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.32,
    metalness: 0.15,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.22,
    metalness: 0.88,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xc28050,
    roughness: 0.56,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.65,
  });

  const torso = new THREE.Group();
  torso.position.set(0, 0.78, 0);
  bodyPivot.add(torso);

  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.34), blazerNavy);
  jacket.position.y = 0.3;
  jacket.castShadow = true;
  torso.add(jacket);

  // Khaki inner shirt & belt
  const shirtStrip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.54, 0.35), khakiUniform);
  shirtStrip.position.y = 0.3;
  torso.add(shirtStrip);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.36), leatherMat);
  belt.position.y = 0.04;
  torso.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.38), brassMat);
  buckle.position.y = 0.04;
  torso.add(buckle);

  // Shoulder stars / epaulettes
  const epLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.12), brassMat);
  epLeft.position.set(-0.22, 0.61, 0);
  const epRight = epLeft.clone();
  epRight.position.x = 0.22;
  torso.add(epLeft, epRight);

  // Head with inspector peaked cap, shades, and signature mustache
  const head = new THREE.Group();
  head.position.set(0, 0.66, 0);
  torso.add(head);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 14), skinMat);
  cranium.position.y = 0.16;
  cranium.castShadow = true;
  head.add(cranium);

  // Mustache
  const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.036, 0.05), hairMat);
  mustache.position.set(0, 0.1, -0.195);
  head.add(mustache);

  // Detective sunglasses
  const shades = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.065, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.15, metalness: 0.6 }),
  );
  shades.position.set(0, 0.18, -0.185);
  head.add(shades);

  // Police peaked cap
  const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.215, 0.11, 16), blazerNavy);
  capBand.position.y = 0.29;
  head.add(capBand);

  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.07, 16), khakiUniform);
  capTop.position.y = 0.36;
  head.add(capTop);

  const capPeak = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.17), leatherMat);
  capPeak.position.set(0, 0.25, -0.2);
  capPeak.rotation.x = 0.15;
  head.add(capPeak);

  const capBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12), brassMat);
  capBadge.rotation.x = Math.PI / 2;
  capBadge.position.set(0, 0.31, -0.22);
  head.add(capBadge);

  // Arms
  const makeArm = (side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.38, 0.54, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.076, 0.46, 10), blazerNavy);
    sleeve.position.y = -0.22;
    sleeve.castShadow = true;
    arm.add(sleeve);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), skinMat);
    hand.position.y = -0.47;
    arm.add(hand);

    if (side === 1) {
      // Police baton in right hand
      const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.42, 8), leatherMat);
      baton.rotation.x = Math.PI / 2;
      baton.position.set(0, -0.48, -0.18);
      arm.add(baton);
    }

    torso.add(arm);
    return arm;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Legs
  const makeLeg = (side: -1 | 1) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.16, 0.78, 0);
    const trouser = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.088, 0.68, 10), khakiUniform);
    trouser.position.y = -0.34;
    trouser.castShadow = true;
    leg.add(trouser);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 0.28), leatherMat);
    boot.position.set(0, -0.71, -0.04);
    boot.castShadow = true;
    leg.add(boot);

    bodyPivot.add(leg);
    return leg;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.75, 20),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.52,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  root.add(shadow);

  return {
    root,
    bodyPivot,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    shadow,
  };
}

export function animateCharacterRig(
  rig: CharacterRig,
  phase: number,
  options: {
    mode: 'idle' | 'run' | 'jump' | 'slide' | 'stumble';
    leanX: number;
    playerY: number;
    squashX?: number;
    squashY?: number;
  },
): void {
  const { mode, leanX, playerY, squashX = 1, squashY = 1 } = options;

  rig.bodyPivot.scale.set(squashX, squashY, squashX);
  rig.bodyPivot.rotation.z = leanX * -0.18;

  // Shrink and soften shadow when jumping high
  const heightFactor = Math.max(0.45, 1 - playerY * 0.14);
  rig.shadow.scale.setScalar(heightFactor);
  (rig.shadow.material as THREE.MeshBasicMaterial).opacity = 0.52 * heightFactor;

  if (mode === 'idle') {
    const breath = Math.sin(phase * 2.4) * 0.03;
    rig.bodyPivot.position.y = breath;
    rig.bodyPivot.rotation.x = 0;
    rig.torso.rotation.x = 0.05;
    rig.leftLeg.rotation.x = 0.08;
    rig.rightLeg.rotation.x = -0.08;
    rig.leftArm.rotation.x = -0.12 + breath;
    rig.rightArm.rotation.x = 0.12 - breath;
    return;
  }

  if (mode === 'slide') {
    // Low baseball/parkour slide pose
    rig.bodyPivot.position.y = -0.44;
    rig.bodyPivot.rotation.x = 1.05;
    rig.torso.rotation.x = -0.25;
    rig.leftLeg.rotation.x = -0.45;
    rig.rightLeg.rotation.x = -0.15;
    rig.leftArm.rotation.x = 0.85;
    rig.rightArm.rotation.x = 0.65;
    return;
  }

  if (mode === 'jump') {
    rig.bodyPivot.position.y = 0;
    rig.bodyPivot.rotation.x = 0;
    rig.torso.rotation.x = 0.22;
    rig.leftLeg.rotation.x = 0.65;
    rig.rightLeg.rotation.x = -0.55;
    rig.leftArm.rotation.x = -1.25;
    rig.rightArm.rotation.x = -0.95;
    return;
  }

  // Running cycle
  const swing = Math.sin(phase);
  const bob = Math.abs(Math.cos(phase)) * 0.11;
  const stumbleTilt = mode === 'stumble' ? Math.sin(phase * 2.5) * 0.22 : 0;

  rig.bodyPivot.position.y = bob;
  rig.bodyPivot.rotation.x = 0;
  rig.torso.rotation.x = 0.22 + stumbleTilt;
  rig.torso.rotation.y = swing * 0.12;
  rig.head.rotation.y = -swing * 0.08;

  rig.leftLeg.rotation.x = swing * 0.95;
  rig.rightLeg.rotation.x = -swing * 0.95;
  rig.leftArm.rotation.x = -swing * 0.88;
  rig.rightArm.rotation.x = swing * 0.88;
}

export function createTrainModel(
  isMoving: boolean,
  length: number,
  textures: ProceduralTexturePack,
): THREE.Group {
  const group = new THREE.Group();

  const bodyTex = isMoving ? textures.trainBodyExpress : textures.trainBodyBlue;
  const bodyMat = new THREE.MeshStandardMaterial({
    map: bodyTex,
    roughness: 0.42,
    metalness: 0.25,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.65,
    metalness: 0.35,
  });
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.55,
    metalness: 0.65,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: isMoving ? 0xfbbf24 : 0xe2e8f0,
    roughness: 0.3,
    metalness: 0.6,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.15,
    metalness: 0.75,
  });

  // 1. Undercarriage chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.42, length - 0.2), chassisMat);
  chassis.position.y = 0.38;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // 2. Main coach / locomotive hull
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.44, 2.32, length), bodyMat);
  hull.position.y = 1.72;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // 3. Beveled roof shell (so players can run on top cleanly)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.28, length - 0.1), roofMat);
  roof.position.y = TRAIN_ROOF_Y - 0.14;
  roof.receiveShadow = true;
  group.add(roof);

  // 4. Roof AC / vent pods (3 secondary details)
  for (let i = -1; i <= 1; i++) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 1.8), trimMat);
    pod.position.set(0, TRAIN_ROOF_Y + 0.04, i * (length * 0.28));
    group.add(pod);
  }

  // 5. Front cab windshield & cowcatcher facing +Z (toward approaching runner)
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.62, 0.14), glassMat);
  windshield.position.set(0, 2.2, length * 0.5 + 0.02);
  group.add(windshield);

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.32, 0.34), trimMat);
  frontBumper.position.set(0, 0.46, length * 0.5 + 0.12);
  group.add(frontBumper);

  // 6. Dual glowing headlights
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: isMoving ? 0xfef08a : 0xfde047,
    emissiveIntensity: isMoving ? 2.4 : 0.6,
    roughness: 0.2,
  });
  const leftLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12), lampMat);
  leftLamp.rotation.x = Math.PI / 2;
  leftLamp.position.set(-0.72, 1.15, length * 0.5 + 0.05);
  const rightLamp = leftLamp.clone();
  rightLamp.position.x = 0.72;
  group.add(leftLamp, rightLamp);

  // 7. Steel wheel bogies along sides
  const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 2.52, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelOffsets = [-length * 0.36, -length * 0.24, length * 0.24, length * 0.36];
  for (const wz of wheelOffsets) {
    const wheel = new THREE.Mesh(wheelGeo, chassisMat);
    wheel.position.set(0, 0.28, wz);
    group.add(wheel);
  }

  return group;
}

export function createObstacleMesh(
  kind: ObstacleKind,
  length: number,
  textures: ProceduralTexturePack,
): THREE.Group {
  if (kind === 'train_static') {
    return createTrainModel(false, length, textures);
  }
  if (kind === 'train_moving') {
    return createTrainModel(true, length, textures);
  }

  const group = new THREE.Group();
  const hazMat = new THREE.MeshStandardMaterial({
    map: textures.hazardStripe,
    roughness: 0.55,
    metalness: 0.15,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.38,
    metalness: 0.78,
  });
  const redLampMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.4,
    roughness: 0.25,
  });

  if (kind === 'train_ramp') {
    // Inclined boarding ramp from y=0 to y=TRAIN_ROOF_Y
    const rampLen = Math.hypot(length, TRAIN_ROOF_Y);
    const angle = Math.atan2(TRAIN_ROOF_Y, length);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.2, rampLen), hazMat);
    deck.position.set(0, TRAIN_ROOF_Y * 0.5 - 0.08, 0);
    deck.rotation.x = angle;
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);

    // Side safety rails
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, rampLen), steelMat);
      rail.position.set(side * 1.05, TRAIN_ROOF_Y * 0.5 + 0.06, 0);
      rail.rotation.x = angle;
      group.add(rail);
    }
    return group;
  }

  if (kind === 'barrier_low') {
    // Jumpable A-frame railway hurdle (maxY ~ 1.05m)
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.34, 0.18), hazMat);
    plank.position.y = 0.86;
    plank.castShadow = true;
    group.add(plank);

    for (const sx of [-0.95, 0.95]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.96, 0.16), steelMat);
      post.position.set(sx, 0.48, 0);
      post.castShadow = true;
      group.add(post);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.56), steelMat);
      foot.position.set(sx, 0.05, 0);
      group.add(foot);
    }
    return group;
  }

  if (kind === 'barrier_high') {
    // Overhead signal gantry — tall side pillars + warning crossbar at y = 1.2m..2.4m (slide under!)
    for (const sx of [-1.1, 1.1]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.75, 10), steelMat);
      pillar.position.set(sx, 1.37, 0);
      pillar.castShadow = true;
      group.add(pillar);
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.58, 0.24), hazMat);
    crossBeam.position.y = 1.65;
    crossBeam.castShadow = true;
    group.add(crossBeam);

    const topSign = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 0.28), redLampMat);
    topSign.position.y = 2.35;
    group.add(topSign);
    return group;
  }

  // barrier_full: heavy roadblock
  const concreteBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 0.65, 0.72),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88 }),
  );
  concreteBase.position.y = 0.325;
  concreteBase.castShadow = true;
  group.add(concreteBase);

  const upperBoard = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.9, 0.32), hazMat);
  upperBoard.position.y = 1.4;
  upperBoard.castShadow = true;
  group.add(upperBoard);

  for (const sx of [-0.92, 0.92]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.1, 0.22), steelMat);
    post.position.set(sx, 1.05, 0);
    group.add(post);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), redLampMat);
    lamp.position.set(sx, 2.18, 0);
    group.add(lamp);
  }

  return group;
}

export function createCoinMesh(): THREE.Group {
  const group = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0x92400e,
    emissiveIntensity: 0.35,
    roughness: 0.2,
    metalness: 0.92,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.16,
    metalness: 0.95,
  });

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.09, 16), goldMat);
  disc.rotation.x = Math.PI / 2;
  group.add(disc);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 8, 18), rimMat);
  group.add(ring);

  const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), rimMat);
  emblem.scale.set(1, 1, 0.45);
  group.add(emblem);

  return group;
}

export function createTrackChunkMesh(
  zone: EnvironmentZone,
  textures: ProceduralTexturePack,
): THREE.Group {
  const group = new THREE.Group();

  const groundMat = new THREE.MeshStandardMaterial({
    color: zone === 'bridge' ? 0x1d4ed8 : 0x5c6648,
    roughness: 0.92,
    metalness: zone === 'bridge' ? 0.25 : 0.02,
  });
  const trackBedMat = new THREE.MeshStandardMaterial({
    map: textures.trackBed,
    roughness: 0.88,
    metalness: 0.05,
  });
  const railSteelMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.25,
    metalness: 0.88,
  });
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.45,
    metalness: 0.72,
  });

  // Outer ground / river plane (wide so there's never an empty void)
  const groundY = zone === 'bridge' ? -3.2 : -0.16;
  const outerGround = new THREE.Mesh(
    new THREE.PlaneGeometry(88, SEGMENT_LENGTH),
    groundMat,
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.set(0, groundY, -SEGMENT_LENGTH * 0.5);
  outerGround.receiveShadow = true;
  group.add(outerGround);

  // Railway embankment / bridge deck beneath the 3 tracks (top face at y = -0.02 so zero Z-fighting)
  const deckGeo = new THREE.BoxGeometry(11.6, zone === 'bridge' ? 0.8 : 0.24, SEGMENT_LENGTH);
  const deckMat = new THREE.MeshStandardMaterial({
    color: zone === 'bridge' ? 0x334155 : 0x44403c,
    roughness: 0.86,
    metalness: zone === 'bridge' ? 0.4 : 0.05,
  });
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.set(0, zone === 'bridge' ? -0.44 : -0.14, -SEGMENT_LENGTH * 0.5);
  deck.receiveShadow = true;
  group.add(deck);

  // Three parallel railway track beds + gleaming twin steel rails
  const trackBedGeo = new THREE.PlaneGeometry(2.6, SEGMENT_LENGTH);
  const railGeo = new THREE.BoxGeometry(0.09, 0.1, SEGMENT_LENGTH);

  for (const lane of [-1, 0, 1] as const) {
    const lx = lane * LANE_WIDTH;
    const bed = new THREE.Mesh(trackBedGeo, trackBedMat);
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(lx, 0.03, -SEGMENT_LENGTH * 0.5);
    bed.receiveShadow = true;
    group.add(bed);

    for (const rx of [-0.68, 0.68]) {
      const rail = new THREE.Mesh(railGeo, railSteelMat);
      rail.position.set(lx + rx, 0.08, -SEGMENT_LENGTH * 0.5);
      group.add(rail);
    }
  }

  // Overhead railway catenary gantry every 18m (except inside tunnels)
  if (zone !== 'tunnel') {
    for (const gz of [-9, -27]) {
      const leftMast = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.2, 0.22), poleMat);
      leftMast.position.set(-5.7, 3.1, gz);
      const rightMast = leftMast.clone();
      rightMast.position.x = 5.7;
      const crossArm = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.18, 0.18), poleMat);
      crossArm.position.set(0, 6.0, gz);
      group.add(leftMast, rightMast, crossArm);
    }
  }

  // Zone-specific 3D architecture
  if (zone === 'station') {
    const platMat = new THREE.MeshStandardMaterial({
      map: textures.platformTile,
      roughness: 0.72,
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x0f766e, // Classic railway green-teal canopy
      roughness: 0.5,
      metalness: 0.3,
    });
    const signMat = new THREE.MeshStandardMaterial({
      map: textures.stationSign,
      roughness: 0.4,
    });

    for (const side of [-1, 1]) {
      const px = side * 7.6;
      const platform = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.05, SEGMENT_LENGTH), platMat);
      platform.position.set(px, 0.52, -SEGMENT_LENGTH * 0.5);
      platform.receiveShadow = true;
      group.add(platform);

      // Station canopy roof
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, SEGMENT_LENGTH), canopyMat);
      canopy.position.set(px, 4.9, -SEGMENT_LENGTH * 0.5);
      canopy.rotation.z = side * -0.08;
      group.add(canopy);

      for (const pz of [-8, -26]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 4.0, 10), poleMat);
        pillar.position.set(px + side * 0.3, 2.9, pz);
        group.add(pillar);

        // Station signboard
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.75, 3.1), signMat);
        board.position.set(px - side * 1.4, 3.6, pz);
        group.add(board);

        // Waiting bench
        const bench = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.48, 2.4),
          new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 }),
        );
        bench.position.set(px + side * 0.8, 1.28, pz + 3.5);
        group.add(bench);
      }
    }
  } else if (zone === 'bridge') {
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Golden-ochre steel bridge trusses
      roughness: 0.4,
      metalness: 0.65,
    });
    const pierMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.88,
    });

    for (const side of [-1, 1]) {
      const tx = side * 5.85;
      // Top & bottom chords
      const topChord = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, SEGMENT_LENGTH), trussMat);
      topChord.position.set(tx, 4.6, -SEGMENT_LENGTH * 0.5);
      const botChord = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.4, SEGMENT_LENGTH), trussMat);
      botChord.position.set(tx, 0.2, -SEGMENT_LENGTH * 0.5);
      group.add(topChord, botChord);

      // Vertical & diagonal truss struts
      for (let z = -3; z > -SEGMENT_LENGTH; z -= 6) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.5, 0.24), trussMat);
        post.position.set(tx, 2.35, z);
        const diag = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.4, 0.18), trussMat);
        diag.position.set(tx, 2.4, z - 3);
        diag.rotation.x = 0.62;
        group.add(post, diag);
      }
    }

    // Concrete bridge piers descending into river
    for (const pz of [-9, -27]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(10.8, 3.4, 1.8), pierMat);
      pier.position.set(0, -2.1, pz);
      group.add(pier);
    }
  } else if (zone === 'tunnel') {
    const tunnelMat = new THREE.MeshStandardMaterial({
      map: textures.tunnelBrick,
      roughness: 0.85,
      side: THREE.BackSide,
    });
    const archShellMat = new THREE.MeshStandardMaterial({
      map: textures.tunnelBrick,
      roughness: 0.85,
    });

    // Concrete side walls + arched roof
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6.2, SEGMENT_LENGTH), archShellMat);
      wall.position.set(side * 6.3, 3.0, -SEGMENT_LENGTH * 0.5);
      group.add(wall);
    }

    const ceiling = new THREE.Mesh(
      new THREE.CylinderGeometry(6.4, 6.4, SEGMENT_LENGTH, 18, 1, true, 0, Math.PI),
      tunnelMat,
    );
    ceiling.rotation.z = Math.PI / 2;
    ceiling.rotation.y = Math.PI / 2;
    ceiling.position.set(0, 2.4, -SEGMENT_LENGTH * 0.5);
    group.add(ceiling);

    // Warm amber tunnel ceiling lamps
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.0,
    });
    for (const lz of [-9, -27]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 0.45), lampMat);
      lamp.position.set(0, 7.6, lz);
      group.add(lamp);
    }
  } else {
    // Yard: trees, signal boxes, and distant city blocks
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.82 });
    const cityMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });

    for (const side of [-1, 1]) {
      for (const tz of [-7, -19, -31]) {
        const tx = side * (8.5 + ((Math.abs(tz) % 5) * 0.4));
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.8, 8), trunkMat);
        trunk.position.set(tx, 0.9, tz);
        const crown1 = new THREE.Mesh(new THREE.ConeGeometry(1.35, 2.6, 8), leafMat);
        crown1.position.set(tx, 2.5, tz);
        const crown2 = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.0, 8), leafMat);
        crown2.position.set(tx, 3.6, tz);
        group.add(trunk, crown1, crown2);
      }

      // Distant skyline buildings with warm lit window strips
      const bx = side * 19.5;
      const bldgH = 9 + (side > 0 ? 5 : 2);
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(5.5, bldgH, 12), cityMat);
      bldg.position.set(bx, bldgH * 0.5 - 0.16, -18);
      group.add(bldg);

      const winMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.45,
        roughness: 0.3,
      });
      for (let wy = 2.2; wy < bldgH - 1.5; wy += 2.2) {
        const winBand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 9.2), winMat);
        winBand.position.set(bx - side * 2.78, wy, -18);
        group.add(winBand);
      }
    }
  }

  return group;
}
