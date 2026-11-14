import * as THREE from 'three';

export interface ProceduralTexturePack {
  trackBed: THREE.CanvasTexture;
  trainBodyBlue: THREE.CanvasTexture;
  trainBodyExpress: THREE.CanvasTexture;
  platformTile: THREE.CanvasTexture;
  hazardStripe: THREE.CanvasTexture;
  tunnelBrick: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  stationSign: THREE.CanvasTexture;
  dispose: () => void;
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1,
  isColor = true,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(renderer: THREE.WebGLRenderer): ProceduralTexturePack {
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);

  // 1. Railway ballast & wooden sleepers
  const trackCanvas = document.createElement('canvas');
  trackCanvas.width = 256;
  trackCanvas.height = 512;
  const tctx = trackCanvas.getContext('2d')!;
  tctx.fillStyle = '#3b3733';
  tctx.fillRect(0, 0, 256, 512);
  // Ballast gravel speckles
  for (let i = 0; i < 2400; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 512;
    const shade = 45 + ((i * 29) % 45);
    tctx.fillStyle = `rgb(${shade + 8}, ${shade + 4}, ${shade})`;
    tctx.fillRect(x, y, 3, 3);
  }
  // Wooden/concrete sleepers every 64px
  for (let y = 12; y < 512; y += 64) {
    tctx.fillStyle = '#4c3626';
    tctx.fillRect(24, y, 208, 20);
    tctx.fillStyle = '#3a271a';
    tctx.fillRect(24, y + 14, 208, 6);
    // Steel rail tie plates
    tctx.fillStyle = '#78716c';
    tctx.fillRect(58, y + 2, 16, 16);
    tctx.fillRect(182, y + 2, 16, 16);
  }
  const trackBed = finalizeTexture(trackCanvas, maxAniso, 1, 4, true);

  // 2. Classic Indian Blue-Cream Coach Side
  const blueCoach = document.createElement('canvas');
  blueCoach.width = 512;
  blueCoach.height = 256;
  const bctx = blueCoach.getContext('2d')!;
  bctx.fillStyle = '#1d4ed8';
  bctx.fillRect(0, 0, 512, 256);
  // Cream upper window band
  bctx.fillStyle = '#e2e8f0';
  bctx.fillRect(0, 48, 512, 86);
  // Saffron & dark navy stripe
  bctx.fillStyle = '#f97316';
  bctx.fillRect(0, 134, 512, 12);
  bctx.fillStyle = '#1e3a8a';
  bctx.fillRect(0, 146, 512, 14);
  // Coach windows with dark glass and safety bars
  for (let x = 28; x < 470; x += 66) {
    bctx.fillStyle = '#0f172a';
    bctx.fillRect(x, 62, 46, 54);
    bctx.fillStyle = '#38bdf8';
    bctx.fillRect(x + 4, 66, 14, 44);
    bctx.fillStyle = '#94a3b8';
    bctx.fillRect(x, 86, 46, 4);
    bctx.fillRect(x, 98, 46, 4);
  }
  const trainBodyBlue = finalizeTexture(blueCoach, maxAniso, 1, 1, true);

  // 3. Moving Express Locomotive Red-Gold Livery
  const expCanvas = document.createElement('canvas');
  expCanvas.width = 512;
  expCanvas.height = 256;
  const ectx = expCanvas.getContext('2d')!;
  ectx.fillStyle = '#b91c1c';
  ectx.fillRect(0, 0, 512, 256);
  ectx.fillStyle = '#fbbf24';
  ectx.fillRect(0, 108, 512, 28);
  ectx.fillStyle = '#fef3c7';
  ectx.fillRect(0, 136, 512, 10);
  for (let x = 36; x < 470; x += 72) {
    ectx.fillStyle = '#1e293b';
    ectx.fillRect(x, 42, 44, 48);
    ectx.fillStyle = '#bae6fd';
    ectx.fillRect(x + 5, 48, 12, 34);
  }
  const trainBodyExpress = finalizeTexture(expCanvas, maxAniso, 1, 1, true);

  // 4. Station Platform Tile with Yellow Safety Edge
  const platCanvas = document.createElement('canvas');
  platCanvas.width = 256;
  platCanvas.height = 256;
  const pctx = platCanvas.getContext('2d')!;
  pctx.fillStyle = '#cbd5e1';
  pctx.fillRect(0, 0, 256, 256);
  pctx.strokeStyle = '#94a3b8';
  pctx.lineWidth = 3;
  for (let x = 0; x <= 256; x += 64) {
    pctx.beginPath();
    pctx.moveTo(x, 0);
    pctx.lineTo(x, 256);
    pctx.stroke();
  }
  for (let y = 0; y <= 256; y += 64) {
    pctx.beginPath();
    pctx.moveTo(0, y);
    pctx.lineTo(256, y);
    pctx.stroke();
  }
  // Tactile yellow strip on platform edge
  pctx.fillStyle = '#facc15';
  pctx.fillRect(0, 0, 28, 256);
  const platformTile = finalizeTexture(platCanvas, maxAniso, 1, 6, true);

  // 5. Caution Hazard Stripes
  const hazCanvas = document.createElement('canvas');
  hazCanvas.width = 256;
  hazCanvas.height = 128;
  const hctx = hazCanvas.getContext('2d')!;
  hctx.fillStyle = '#facc15';
  hctx.fillRect(0, 0, 256, 128);
  hctx.fillStyle = '#18181b';
  for (let x = -128; x < 384; x += 48) {
    hctx.beginPath();
    hctx.moveTo(x, 0);
    hctx.lineTo(x + 24, 0);
    hctx.lineTo(x - 24, 128);
    hctx.lineTo(x - 48, 128);
    hctx.closePath();
    hctx.fill();
  }
  const hazardStripe = finalizeTexture(hazCanvas, maxAniso, 2, 1, true);

  // 6. Tunnel Masonry Brick
  const tunCanvas = document.createElement('canvas');
  tunCanvas.width = 256;
  tunCanvas.height = 256;
  const tnctx = tunCanvas.getContext('2d')!;
  tnctx.fillStyle = '#334155';
  tnctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    const y = row * 32;
    const offset = (row % 2) * 32;
    for (let col = -1; col < 5; col++) {
      const shade = 44 + ((row * 7 + col * 13) % 24);
      tnctx.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 14})`;
      tnctx.fillRect(col * 64 + offset + 2, y + 2, 60, 28);
    }
  }
  const tunnelBrick = finalizeTexture(tunCanvas, maxAniso, 4, 4, true);

  // 7. Radial Contact Shadow
  const shadCanvas = document.createElement('canvas');
  shadCanvas.width = 128;
  shadCanvas.height = 128;
  const sctx = shadCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
  grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.22)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const contactShadow = finalizeTexture(shadCanvas, 1, 1, 1, true);
  contactShadow.wrapS = THREE.ClampToEdgeWrapping;
  contactShadow.wrapT = THREE.ClampToEdgeWrapping;

  // 8. Station Signboard ("N-NAGAR JN")
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 128;
  const sgctx = signCanvas.getContext('2d')!;
  sgctx.fillStyle = '#facc15';
  sgctx.fillRect(0, 0, 512, 128);
  sgctx.strokeStyle = '#1e293b';
  sgctx.lineWidth = 10;
  sgctx.strokeRect(8, 8, 496, 112);
  sgctx.fillStyle = '#0f172a';
  sgctx.font = 'bold 54px sans-serif';
  sgctx.textAlign = 'center';
  sgctx.textBaseline = 'middle';
  sgctx.fillText('N-NAGAR JN', 256, 66);
  const stationSign = finalizeTexture(signCanvas, maxAniso, 1, 1, true);

  return {
    trackBed,
    trainBodyBlue,
    trainBodyExpress,
    platformTile,
    hazardStripe,
    tunnelBrick,
    contactShadow,
    stationSign,
    dispose: () => {
      trackBed.dispose();
      trainBodyBlue.dispose();
      trainBodyExpress.dispose();
      platformTile.dispose();
      hazardStripe.dispose();
      tunnelBrick.dispose();
      contactShadow.dispose();
      stationSign.dispose();
    },
  };
}
