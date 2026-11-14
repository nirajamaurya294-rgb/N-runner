import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GameAudioEngine } from './audio';
import {
  animateCharacterRig,
  createCoinMesh,
  createInspectorRig,
  createObstacleMesh,
  createRunnerRig,
  createTrackChunkMesh,
  type CharacterRig,
} from './models';
import {
  ABHIJEET_CAUGHT_DIALOGUE,
  CHARACTERS,
  GRAVITY,
  JUMP_VELOCITY,
  SEGMENT_LENGTH,
  SLIDE_DURATION,
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
import { createProceduralTextures, type ProceduralTexturePack } from './textures';
import type {
  CharacterId,
  CoinDef,
  GamePhase,
  GameSettings,
  HudSnapshot,
  Lane,
  ObstacleDef,
} from './types';

interface ActiveSegment {
  index: number;
  group: THREE.Group;
  obstacles: (ObstacleDef & { mesh: THREE.Group })[];
  coins: (CoinDef & { mesh: THREE.Group })[];
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

const MAX_PARTICLES = 96;
const VISIBLE_SEGMENTS_AHEAD = 5;
const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

export interface RunnerEngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onGameOver: (finalSnapshot: HudSnapshot) => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
}

export class RunnerEngine {
  private container: HTMLElement;
  private callbacks: RunnerEngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private dirLight: THREE.DirectionalLight;
  private textures: ProceduralTexturePack;
  public audio: GameAudioEngine;
  private isSoftwareGl: boolean;

  private frameId = 0;
  private lastTimestamp = 0;
  private disposed = false;

  // Actors
  private selectedCharacter: CharacterId;
  private runnerRig: CharacterRig;
  private inspectorRig: CharacterRig;
  private titleTrain: THREE.Group;

  // Pooled particles
  private particleMesh: THREE.InstancedMesh;
  private particles: Particle[] = [];
  private particleCursor = 0;

  // World state
  private phase: GamePhase = 'title';
  private segments: ActiveSegment[] = [];
  private nextSegmentIndex = 0;
  private entityIdCounter = 1;
  private rng = createSeededRng(Date.now());

  // Player kinematics
  private playerLane: Lane = 0;
  private playerX = 0;
  private playerY = 0;
  private playerZ = 0;
  private playerVy = 0;
  private groundY = 0;
  private isGrounded = true;
  private slideTimer = 0;
  private jumpBufferTimer = 0;
  private runCyclePhase = 0;
  private squashX = 1;
  private squashY = 1;
  private leanX = 0;

  // Chaser & scoring state
  private abhijeetDistance = 4.2;
  private dangerTimer = 0;
  private surgeCooldown = 14;
  private stumbleTimer = 0;
  private runCoins = 0;
  private totalCoins = 0;
  private highScore = 0;
  private distanceMeters = 0;
  private runSpeed = 16.5;
  private multiplier = 1;
  private dialogueText: string | null = null;
  private dialogueTimer = 0;
  private dialogueCounter = 0;
  private caughtReason = '';

  // Juice: hitstop, camera trauma, defeat beat
  private hitstopTimer = 0;
  private trauma = 0;
  private defeatBeatTimer = 0;
  private pendingGameOver = false;
  private titleTime = 0;
  private hudSyncTimer = 0;

  // Input state
  private keysHeld = new Set<string>();
  private touchStartX = 0;
  private touchStartY = 0;
  private touchHandled = false;
  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    initialCharacter: CharacterId,
    initialHighScore: number,
    initialTotalCoins: number,
    initialSettings: GameSettings,
    callbacks: RunnerEngineCallbacks,
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.selectedCharacter = initialCharacter;
    this.highScore = initialHighScore;
    this.totalCoins = initialTotalCoins;

    this.audio = new GameAudioEngine();
    this.audio.updateSettings(initialSettings);

    // Detect software WebGL cleanly via renderer string
    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // Scene & Golden-Hour Horizon Sky
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0xdba87b); // Warm Indian late-afternoon golden sky
    this.scene.background = skyColor;
    this.scene.fog = new THREE.Fog(0xdba87b, 48, 155);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 220);

    // Mandatory studio environment map for crisp metallic rails & gold coins
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Warm/cool 3-point outdoor railway lighting
    const hemi = new THREE.HemisphereLight(0xfef3c7, 0x334155, 0.85);
    this.scene.add(hemi);

    this.dirLight = new THREE.DirectionalLight(0xfff1d6, 1.85);
    this.dirLight.position.set(16, 26, 14);
    this.dirLight.castShadow = !this.isSoftwareGl;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 90;
    const d = 18;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.55);
    rimLight.position.set(-14, 12, -25);
    this.scene.add(rimLight);

    this.textures = createProceduralTextures(this.renderer);

    // Build character rigs & ambient title express train
    this.runnerRig = createRunnerRig(CHARACTERS[this.selectedCharacter], this.textures);
    this.scene.add(this.runnerRig.root);

    this.inspectorRig = createInspectorRig(this.textures);
    this.scene.add(this.inspectorRig.root);

    this.titleTrain = createObstacleMesh('train_moving', 16, this.textures);
    this.titleTrain.position.set(laneToX(1), 0, -45);
    this.scene.add(this.titleTrain);

    // Pooled InstancedMesh particles
    const pGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.2,
    });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 0,
        color: new THREE.Color(0xfacc15),
      });
      _mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, _color.setHex(0xfacc15));
    }

    this.resetWorldForTitle();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind events
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.container.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd, { passive: true });

    this.handleResize();
    this.updateTitleScene(0.016);
    this.renderer.render(this.scene, this.camera);
    this.lastTimestamp = performance.now();
    this.scheduleNextFrame();
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.phase === 'paused' || this.phase === 'gameover') {
      this.frameId = window.setTimeout(() => this.tick(performance.now()), 120);
      return;
    }
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick(performance.now()));
    } else {
      this.frameId = requestAnimationFrame((now) => this.tick(now));
    }
  }

  private afterDraw(cb: () => void): void {
    if (this.disposed) return;
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      if (!sync) {
        this.frameId = window.setTimeout(cb, 80);
        return;
      }
      let polls = 0;
      const poll = () => {
        if (this.disposed) {
          gl.deleteSync(sync);
          return;
        }
        polls += 1;
        const status = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED && polls < 20) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } catch {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth || window.innerWidth);
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    // Widen vertical FOV automatically on portrait mobile so all 3 tracks stay clearly visible
    const baseFov = this.camera.aspect < 0.85 ? 72 : this.camera.aspect < 1.1 ? 64 : 56;
    this.camera.fov = baseFov;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.render(this.scene, this.camera);
  };

  private handleWindowBlur = (): void => {
    this.keysHeld.clear();
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.keysHeld.clear();
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const code = e.code;

    if (code === 'KeyM') {
      this.callbacks.onToggleMute();
      return;
    }

    if (code === 'Escape' || code === 'KeyP') {
      if (this.phase === 'playing' || this.phase === 'paused') {
        this.callbacks.onTogglePause();
      }
      return;
    }

    if (this.phase !== 'playing' || this.pendingGameOver) return;
    this.keysHeld.add(code);

    if (code === 'ArrowLeft' || code === 'KeyA') {
      e.preventDefault();
      this.triggerMoveLeft();
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      e.preventDefault();
      this.triggerMoveRight();
    } else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') {
      e.preventDefault();
      this.triggerJump();
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      e.preventDefault();
      this.triggerSlide();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysHeld.delete(e.code);
  };

  private handleTouchStart = (e: TouchEvent): void => {
    if (this.phase !== 'playing' || e.touches.length === 0) return;
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchHandled = false;
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (this.phase !== 'playing' || this.touchHandled || e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;
    const threshold = 24;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    this.touchHandled = true;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) this.triggerMoveLeft();
      else this.triggerMoveRight();
    } else {
      if (dy < 0) this.triggerJump();
      else this.triggerSlide();
    }
  };

  private handleTouchEnd = (): void => {
    this.touchHandled = false;
  };

  public triggerMoveLeft(): void {
    if (this.phase !== 'playing' || this.pendingGameOver) return;
    const next = clampLane(this.playerLane - 1);
    if (next !== this.playerLane) {
      this.playerLane = next;
      this.audio.playSwipe();
    }
  }

  public triggerMoveRight(): void {
    if (this.phase !== 'playing' || this.pendingGameOver) return;
    const next = clampLane(this.playerLane + 1);
    if (next !== this.playerLane) {
      this.playerLane = next;
      this.audio.playSwipe();
    }
  }

  public triggerJump(): void {
    if (this.phase !== 'playing' || this.pendingGameOver) return;
    if (this.isGrounded) {
      this.executeJump();
    } else {
      this.jumpBufferTimer = 0.14;
    }
  }

  private executeJump(): void {
    this.playerVy = JUMP_VELOCITY;
    this.isGrounded = false;
    this.slideTimer = 0;
    this.jumpBufferTimer = 0;
    this.squashX = 0.84;
    this.squashY = 1.2;
    this.audio.playJump();
    this.spawnParticles(this.playerX, this.playerY + 0.1, this.playerZ, 5, 0xd6d3d1, 2.2);
  }

  public triggerSlide(): void {
    if (this.phase !== 'playing' || this.pendingGameOver) return;
    this.slideTimer = SLIDE_DURATION;
    if (!this.isGrounded) {
      // Fast drop into slide!
      this.playerVy = Math.min(this.playerVy, -26);
    }
    this.squashX = 1.18;
    this.squashY = 0.78;
    this.audio.playSlide();
    this.spawnParticles(this.playerX, this.playerY + 0.15, this.playerZ, 4, 0xd6d3d1, 1.8);
  }

  public setCharacter(id: CharacterId): void {
    if (this.selectedCharacter === id) return;
    this.selectedCharacter = id;
    const oldPos = this.runnerRig.root.position.clone();
    this.scene.remove(this.runnerRig.root);
    this.runnerRig = createRunnerRig(CHARACTERS[id], this.textures);
    this.runnerRig.root.position.copy(oldPos);
    this.scene.add(this.runnerRig.root);
  }

  public updateSettings(settings: GameSettings): void {
    this.audio.updateSettings(settings);
  }

  public updateStoredStats(highScore: number, totalCoins: number): void {
    this.highScore = highScore;
    this.totalCoins = totalCoins;
  }

  private clearAllSegments(): void {
    for (const seg of this.segments) {
      this.scene.remove(seg.group);
    }
    this.segments = [];
  }

  private spawnSegment(segmentIndex: number): void {
    const plan = generateTrackSegment(segmentIndex, this.runSpeed, this.rng);
    const group = createTrackChunkMesh(plan.zone, this.textures);
    group.position.set(0, 0, plan.zStart);

    const activeObs: (ObstacleDef & { mesh: THREE.Group })[] = [];
    for (const o of plan.obstacles) {
      const id = this.entityIdCounter++;
      const mesh = createObstacleMesh(o.kind, o.length, this.textures);
      mesh.position.set(laneToX(o.lane), 0, o.z - plan.zStart);
      group.add(mesh);
      activeObs.push({ ...o, id, mesh });
    }

    const activeCoins: (CoinDef & { mesh: THREE.Group })[] = [];
    for (const c of plan.coins) {
      const id = this.entityIdCounter++;
      const mesh = createCoinMesh();
      mesh.position.set(laneToX(c.lane), c.y, c.z - plan.zStart);
      group.add(mesh);
      activeCoins.push({ ...c, id, collected: false, mesh });
    }

    this.scene.add(group);
    this.segments.push({
      index: segmentIndex,
      group,
      obstacles: activeObs,
      coins: activeCoins,
    });
  }

  private resetWorldForTitle(): void {
    this.clearAllSegments();
    this.phase = 'title';
    this.playerLane = 0;
    this.playerX = 0;
    this.playerY = 0;
    this.playerZ = 0;
    this.playerVy = 0;
    this.groundY = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.distanceMeters = 0;
    this.runCoins = 0;
    this.runSpeed = 16.5;
    this.pendingGameOver = false;
    this.dialogueText = null;
    this.dialogueTimer = 0;
    this.abhijeetDistance = 3.6;

    this.rng = createSeededRng(101);
    // Spawn segment -1 behind player so tracks never end abruptly in view
    this.spawnSegment(-1);
    this.nextSegmentIndex = 0;
    for (let i = 0; i < VISIBLE_SEGMENTS_AHEAD; i++) {
      this.spawnSegment(this.nextSegmentIndex++);
    }

    this.runnerRig.root.position.set(0, 0, -0.5);
    this.inspectorRig.root.position.set(-0.95, 0, 2.75);
    this.titleTrain.visible = true;
    this.emitHud();
  }

  public startGame(): void {
    const canAutoplay =
      typeof navigator === 'undefined' ||
      !(navigator as unknown as { userActivation?: { hasBeenActive: boolean } }).userActivation ||
      (navigator as unknown as { userActivation?: { hasBeenActive: boolean } }).userActivation!.hasBeenActive;
    if (canAutoplay) {
      this.audio.unlock();
      this.audio.startMusic();
    }
    this.clearAllSegments();

    this.phase = 'playing';
    this.playerLane = 0;
    this.playerX = 0;
    this.playerY = 0;
    this.playerZ = 0;
    this.playerVy = 0;
    this.groundY = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.jumpBufferTimer = 0;
    this.runCyclePhase = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.leanX = 0;

    this.distanceMeters = 0;
    this.runCoins = 0;
    this.runSpeed = 16.5;
    this.multiplier = 1;
    this.abhijeetDistance = 4.2;
    this.dangerTimer = 3.5;
    this.surgeCooldown = 18;
    this.stumbleTimer = 0;
    this.hitstopTimer = 0;
    this.trauma = 0;
    this.pendingGameOver = false;
    this.defeatBeatTimer = 0;
    this.caughtReason = '';
    this.keysHeld.clear();

    this.titleTrain.visible = false;
    this.rng = createSeededRng(Date.now());
    this.spawnSegment(-1);
    this.nextSegmentIndex = 0;
    for (let i = 0; i < VISIBLE_SEGMENTS_AHEAD; i++) {
      this.spawnSegment(this.nextSegmentIndex++);
    }

    this.runnerRig.root.position.set(0, 0, 0);
    this.inspectorRig.root.position.set(0, 0, 3.4);

    // Opening chase shout from Inspector Abhijeet!
    this.triggerAbhijeetCloseDialogue();
    this.emitHud();
  }

  public pauseGame(): void {
    if (this.phase !== 'playing' || this.pendingGameOver) return;
    this.phase = 'paused';
    this.keysHeld.clear();
    this.audio.stopMusic();
    this.audio.cancelSpeech();
    this.emitHud();
  }

  public resumeGame(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.keysHeld.clear();
    this.lastTimestamp = performance.now();
    this.audio.startMusic();
    this.emitHud();
  }

  public returnToTitle(): void {
    this.audio.stopMusic();
    this.audio.cancelSpeech();
    this.resetWorldForTitle();
  }

  private triggerAbhijeetCloseDialogue(): void {
    const line = pickAbhijeetCloseDialogue(this.dialogueCounter++);
    this.dialogueText = line;
    this.dialogueTimer = 3.2;
    this.audio.speakAbhijeetLine(line, 'close');
  }

  private spawnParticles(
    x: number,
    y: number,
    z: number,
    count: number,
    hexColor: number,
    spreadSpeed: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.4;
      p.y = y + Math.random() * 0.3;
      p.z = z + (Math.random() - 0.5) * 0.4;
      p.vx = (Math.random() - 0.5) * spreadSpeed * 1.4;
      p.vy = 1.5 + Math.random() * spreadSpeed * 1.6;
      p.vz = (Math.random() - 0.5) * spreadSpeed;
      p.life = 0;
      p.maxLife = 0.32 + Math.random() * 0.25;
      p.scale = 0.8 + Math.random() * 0.7;
      p.color.setHex(hexColor);
    }
  }

  private updateParticles(dt: number): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.particleMesh.setMatrixAt(i, _mat4);
        continue;
      }

      p.vy -= 18 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const t = 1 - p.life / p.maxLife;
      const s = p.scale * t;

      _pos.set(p.x, p.y, p.z);
      _quat.identity();
      _scale.set(s, s, s);
      _mat4.compose(_pos, _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, p.color);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private getSnapshot(): HudSnapshot {
    const score = computeScore(this.distanceMeters, this.runCoins, this.multiplier);
    const best = Math.max(this.highScore, score);
    const dangerLevel =
      this.dangerTimer > 0 ? Math.min(1, 0.5 + (6 - this.abhijeetDistance) * 0.15) : 0;

    return {
      phase: this.phase,
      score,
      highScore: best,
      coins: this.runCoins,
      totalCoins: this.totalCoins + this.runCoins,
      distanceMeters: Math.floor(this.distanceMeters),
      speedKmh: Math.round(this.runSpeed * 3.6),
      multiplier: this.multiplier,
      dangerLevel,
      caughtReason: this.caughtReason,
      activeDialogue: this.dialogueTimer > 0 ? this.dialogueText : null,
    };
  }

  private emitHud(): void {
    this.callbacks.onHudUpdate(this.getSnapshot());
  }

  private tick(now: number): void {
    if (this.disposed) return;

    const rawDt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    if (this.phase === 'title') {
      this.updateParticles(dt);
      this.updateTitleScene(dt);
      this.renderer.render(this.scene, this.camera);
    } else if (this.phase === 'playing') {
      this.updateParticles(dt);
      this.updatePlayingScene(dt);
      this.renderer.render(this.scene, this.camera);
    }

    this.scheduleNextFrame();
  }

  private updateTitleScene(dt: number): void {
    this.titleTime += dt;
    animateCharacterRig(this.runnerRig, this.titleTime, {
      mode: 'idle',
      leanX: 0,
      playerY: 0,
    });
    animateCharacterRig(this.inspectorRig, this.titleTime + 1.2, {
      mode: 'idle',
      leanX: 0,
      playerY: 0,
    });

    // Ambient moving express train gliding past on right track
    this.titleTrain.position.z += 18 * dt;
    if (this.titleTrain.position.z > 25) {
      this.titleTrain.position.z = -95;
    }

    // Gentle cinematic camera showcase pan
    const orbitAngle = Math.sin(this.titleTime * 0.35) * 0.35;
    const camDist = this.camera.aspect < 0.85 ? 9.2 : 7.6;
    this.camera.position.set(
      Math.sin(orbitAngle) * 3.2 + 1.25,
      2.85 + Math.sin(this.titleTime * 0.5) * 0.2,
      camDist,
    );
    this.camera.lookAt(-0.15, 1.3, -2.5);
  }

  private updatePlayingScene(dt: number): void {
    // Handle dramatic defeat beat before switching to Game Over modal
    if (this.pendingGameOver) {
      this.defeatBeatTimer -= dt;
      this.trauma = Math.max(0, this.trauma - dt * 1.8);
      // Abhijeet rushes right next to the boy
      this.abhijeetDistance = THREE.MathUtils.damp(this.abhijeetDistance, 1.15, 10, dt);
      this.inspectorRig.root.position.set(
        THREE.MathUtils.damp(this.inspectorRig.root.position.x, this.playerX - 0.55, 8, dt),
        0,
        this.playerZ + this.abhijeetDistance,
      );
      animateCharacterRig(this.runnerRig, this.runCyclePhase, {
        mode: 'stumble',
        leanX: 0,
        playerY: this.playerY,
      });
      animateCharacterRig(this.inspectorRig, this.runCyclePhase, {
        mode: 'idle',
        leanX: 0,
        playerY: 0,
      });
      this.updateChaseCamera(dt);

      if (this.defeatBeatTimer <= 0) {
        this.pendingGameOver = false;
        this.phase = 'gameover';
        this.audio.stopMusic();
        const finalSnap = this.getSnapshot();
        this.callbacks.onGameOver(finalSnap);
      }
      return;
    }

    // Hitstop freeze frames (world pauses briefly while camera shake continues!)
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.trauma = Math.max(0, this.trauma - dt * 1.8);
      this.updateChaseCamera(dt);
      return;
    }

    // Speed progression
    this.runSpeed = computeRunSpeed(this.distanceMeters);
    const dz = this.runSpeed * dt;
    this.playerZ -= dz;
    this.distanceMeters += dz;
    this.multiplier = 1 + Math.floor(this.distanceMeters / 500);

    // Horizontal lane damping
    const targetX = laneToX(this.playerLane);
    const prevX = this.playerX;
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 16, dt);
    this.leanX = THREE.MathUtils.clamp((this.playerX - prevX) / Math.max(dt, 0.001) / 14, -1, 1);

    // Jump & gravity
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
      if (this.isGrounded) {
        this.executeJump();
      }
    }

    if (this.slideTimer > 0) {
      this.slideTimer -= dt;
    }

    if (!this.isGrounded || this.playerY > this.groundY) {
      this.playerVy += GRAVITY * dt;
      this.playerY += this.playerVy * dt;
      if (this.playerY <= this.groundY) {
        this.playerY = this.groundY;
        this.playerVy = 0;
        this.isGrounded = true;
        this.squashX = 1.2;
        this.squashY = 0.8;
        this.spawnParticles(this.playerX, this.playerY + 0.08, this.playerZ, 4, 0xd6d3d1, 1.6);
      }
    }

    // Reset dynamic roof floor each frame before evaluating collisions
    this.groundY = 0;

    // Move oncoming trains & animate spinning coins
    for (const seg of this.segments) {
      for (const obs of seg.obstacles) {
        if (obs.kind === 'train_moving' && obs.z > this.playerZ - 145) {
          obs.z += obs.speed * dt;
          obs.mesh.position.z = obs.z - seg.group.position.z;
          // Play train horn as oncoming train enters close range
          if (!obs.hasRamp && obs.z > this.playerZ - 48 && obs.z < this.playerZ - 32) {
            obs.hasRamp = true; // reuse flag so horn plays once per train
            this.audio.playTrainHorn();
          }
        }
      }
      for (const coin of seg.coins) {
        if (!coin.collected) {
          coin.mesh.rotation.y += 3.8 * dt;
        }
      }
    }

    // Gather nearby obstacles & coins for collision checks
    const nearbyObstacles: ObstacleDef[] = [];
    const nearbyCoins: CoinDef[] = [];
    for (const seg of this.segments) {
      if (seg.index * SEGMENT_LENGTH > Math.abs(this.playerZ) + 75) continue;
      for (const obs of seg.obstacles) {
        if (Math.abs(obs.z - this.playerZ) < 16) nearbyObstacles.push(obs);
      }
      for (const coin of seg.coins) {
        if (!coin.collected && Math.abs(coin.z - this.playerZ) < 4) {
          nearbyCoins.push(coin);
        }
      }
    }

    const playerBounds = {
      x: this.playerX,
      y: this.playerY,
      z: this.playerZ,
      vy: this.playerVy,
      isSliding: this.slideTimer > 0,
    };

    // Collect coins
    const picked = collectOverlappingCoins(playerBounds, nearbyCoins);
    if (picked > 0) {
      this.runCoins += picked;
      this.audio.playCoin();
      for (const seg of this.segments) {
        for (const coin of seg.coins) {
          if (coin.collected && coin.mesh.visible) {
            coin.mesh.visible = false;
            this.spawnParticles(
              laneToX(coin.lane),
              coin.y,
              coin.z,
              6,
              0xfacc15,
              2.6,
            );
          }
        }
      }
      this.emitHud();
    }

    // Evaluate obstacle collisions
    const abhijeetIsClose = this.dangerTimer > 0;
    const outcome = evaluateObstacleCollisions(playerBounds, nearbyObstacles, abhijeetIsClose);

    if (outcome.type === 'land_on_train') {
      this.groundY = outcome.roofY;
      if (this.playerY <= this.groundY + 0.05 && this.playerVy <= 0) {
        this.playerY = this.groundY;
        this.playerVy = 0;
        this.isGrounded = true;
      }
    } else if (outcome.type === 'stumble') {
      // Mark obstacle hit so it doesn't double-trigger on next frame
      for (const seg of this.segments) {
        const found = seg.obstacles.find((o) => o.id === outcome.obstacleId);
        if (found) found.hitTriggered = true;
      }
      this.hitstopTimer = 0.05;
      this.trauma = 0.65;
      this.stumbleTimer = 0.45;
      this.dangerTimer = 6.2;
      this.abhijeetDistance = 2.6;
      this.audio.playStumble();
      this.spawnParticles(this.playerX, this.playerY + 0.8, this.playerZ, 16, 0xf97316, 4.2);
      this.triggerAbhijeetCloseDialogue();
      this.emitHud();
    } else if (outcome.type === 'fatal') {
      this.pendingGameOver = true;
      this.defeatBeatTimer = 0.55;
      this.hitstopTimer = 0.06;
      this.trauma = 1.0;
      this.caughtReason = outcome.reason;
      this.dialogueText = ABHIJEET_CAUGHT_DIALOGUE;
      this.dialogueTimer = 4.5;
      this.audio.playCrash();
      this.audio.speakAbhijeetLine(ABHIJEET_CAUGHT_DIALOGUE, 'caught');
      this.spawnParticles(this.playerX, this.playerY + 0.9, this.playerZ, 26, 0xef4444, 5.5);
      this.emitHud();
      return;
    }

    // Update Abhijeet chase distance & periodic close surges
    if (this.dangerTimer > 0) {
      this.dangerTimer -= dt;
      this.abhijeetDistance = THREE.MathUtils.damp(this.abhijeetDistance, 2.35, 5, dt);
    } else {
      this.abhijeetDistance = THREE.MathUtils.damp(this.abhijeetDistance, 4.6, 3, dt);
      this.surgeCooldown -= dt;
      if (this.surgeCooldown <= 0) {
        this.surgeCooldown = 22 + Math.random() * 8;
        this.dangerTimer = 4.0;
        this.triggerAbhijeetCloseDialogue();
      }
    }

    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
    }
    if (this.stumbleTimer > 0) {
      this.stumbleTimer -= dt;
    }

    // Squash & stretch recovery
    this.squashX = THREE.MathUtils.damp(this.squashX, 1, 14, dt);
    this.squashY = THREE.MathUtils.damp(this.squashY, 1, 14, dt);

    // Distance-synced running stride
    this.runCyclePhase += dz * 1.15;

    const animMode =
      this.stumbleTimer > 0
        ? 'stumble'
        : !this.isGrounded
          ? 'jump'
          : this.slideTimer > 0
            ? 'slide'
            : 'run';

    this.runnerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    animateCharacterRig(this.runnerRig, this.runCyclePhase, {
      mode: animMode,
      leanX: this.leanX,
      playerY: this.playerY - this.groundY,
      squashX: this.squashX,
      squashY: this.squashY,
    });

    // Abhijeet follows closely behind the boy's lane
    const inspX = THREE.MathUtils.damp(this.inspectorRig.root.position.x, this.playerX, 7.5, dt);
    this.inspectorRig.root.position.set(inspX, 0, this.playerZ + this.abhijeetDistance);
    animateCharacterRig(this.inspectorRig, this.runCyclePhase + 0.6, {
      mode: 'run',
      leanX: this.leanX * 0.6,
      playerY: 0,
    });

    // Dynamic zone atmosphere lighting (slight tunnel darkening vs sunlit sky)
    const currentSegIdx = Math.floor(Math.abs(this.playerZ) / SEGMENT_LENGTH);
    const zone = zoneForSegment(currentSegIdx);
    const targetBg = zone === 'tunnel' ? 0x1e293b : 0xdba87b;
    _color.setHex(targetBg);
    (this.scene.background as THREE.Color).lerp(_color, 1 - Math.exp(-3.5 * dt));
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(this.scene.background as THREE.Color);
    }

    // Recycle passed segments & spawn ahead
    while (this.segments.length > 0 && this.segments[0].index < currentSegIdx - 1) {
      const old = this.segments.shift()!;
      this.scene.remove(old.group);
    }
    while (this.segments.length < VISIBLE_SEGMENTS_AHEAD) {
      this.spawnSegment(this.nextSegmentIndex++);
    }

    // Move key directional light shadow frustum with the runner
    this.dirLight.position.set(this.playerX + 16, 26, this.playerZ + 14);
    this.dirLight.target.position.set(this.playerX, 0, this.playerZ - 12);

    this.updateChaseCamera(dt);

    // Throttled HUD updates (~10Hz)
    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.1) {
      this.hudSyncTimer = 0;
      this.emitHud();
    }
  }

  private updateChaseCamera(dt: number): void {
    this.trauma = Math.max(0, this.trauma - dt * 2.2);
    const shake = this.trauma * this.trauma;

    const isPortrait = this.camera.aspect < 0.85;
    const baseDist = isPortrait ? 9.4 : 7.8;
    const baseHeight = isPortrait ? 4.8 : 4.25;

    // Subtle speed FOV kick
    const speedRatio = (this.runSpeed - 16.5) / (35 - 16.5);
    const baseFov = isPortrait ? 72 : this.camera.aspect < 1.1 ? 64 : 56;
    const targetFov = baseFov + speedRatio * 6;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();
    }

    const desiredCamX = THREE.MathUtils.damp(this.camera.position.x, this.playerX * 0.65, 9, dt);
    const desiredCamY = THREE.MathUtils.damp(
      this.camera.position.y,
      this.playerY * 0.55 + baseHeight,
      7,
      dt,
    );
    const desiredCamZ = this.playerZ + baseDist;

    this.camera.position.set(
      desiredCamX + (Math.random() - 0.5) * shake * 0.45,
      desiredCamY + (Math.random() - 0.5) * shake * 0.35,
      desiredCamZ,
    );
    this.camera.lookAt(
      this.playerX * 0.5,
      this.playerY * 0.45 + 1.35,
      this.playerZ - 9.5,
    );
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);

    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.container.removeEventListener('touchstart', this.handleTouchStart);
    this.container.removeEventListener('touchmove', this.handleTouchMove);
    this.container.removeEventListener('touchend', this.handleTouchEnd);

    this.audio.dispose();
    this.textures.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
