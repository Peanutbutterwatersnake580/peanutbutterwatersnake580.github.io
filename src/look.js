import * as THREE from 'three';

export const INK = 0x2b241c;

const palette = new Map();

function hash(ix, iy) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const s = (t) => t * t * (3 - 2 * t);
  const ux = s(fx);
  const uy = s(fy);
  const h = (ix, iy) => {
    const wx = ((ix % 16) + 16) % 16;
    const wy = ((iy % 16) + 16) % 16;
    return hash(wx, wy);
  };
  const a = h(x0, y0);
  const b = h(x0 + 1, y0);
  const c = h(x0, y0 + 1);
  const d = h(x0 + 1, y0 + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function makeGradient() {
  const data = new Uint8Array([78, 138, 198, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function fillNoise(c, paint) {
  const g = c.getContext('2d');
  const img = g.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const n = valueNoise(x / 10, y / 10);
      const [r, gv, b] = paint(x, y, n);
      const i = (y * c.width + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = gv;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function grassTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const tex = fillNoise(c, (x, _y, n) => {
    const stripe = 0.5 + 0.5 * Math.sin((x / 128) * Math.PI * 8);
    const r = 78 + stripe * 28 + n * 24;
    const g = 158 + stripe * 36 + n * 20;
    const b = 52 + n * 16;
    return [r, g, b];
  });
  tex.repeat.set(1700, 4);
  return tex;
}

function dirtTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const tex = fillNoise(c, (_x, y, n) => {
    const band = 0.5 + 0.5 * Math.sin((y / 128) * Math.PI * 6);
    const r = 150 + band * 24 + n * 20;
    const g = 96 + band * 16 + n * 12;
    const b = 48 + n * 10;
    return [r, g, b];
  });
  tex.repeat.set(1700, 1);
  return tex;
}

function tntTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#c43222';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#f4e2b8';
  g.fillRect(0, 98, 256, 60);
  g.fillStyle = '#1c140f';
  g.font = '800 68px Impact, "Arial Black", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('TNT', 128, 130);
  g.fillStyle = '#7a2418';
  for (const [x, y] of [[30, 30], [226, 30], [30, 226], [226, 226]]) {
    g.beginPath();
    g.arc(x, y, 9, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function softTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createLook() {
  const gradientMap = makeGradient();
  const outline = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

  function mat(color) {
    const key = color >>> 0;
    let material = palette.get(key);
    if (!material) {
      material = new THREE.MeshToonMaterial({ color, gradientMap });
      palette.set(key, material);
    }
    return material;
  }

  const tntMap = tntTexture();
  const tnt = new THREE.MeshToonMaterial({ color: 0xffffff, map: tntMap, gradientMap });

  return {
    mat,
    outline,
    tnt,
    grassMap: grassTexture(),
    dirtMap: dirtTexture(),
    soft: softTexture(),
  };
}

export function shell(mesh, parent, outline, amount = 0.07) {
  const hull = new THREE.Mesh(mesh.geometry, outline);
  hull.position.copy(mesh.position);
  hull.quaternion.copy(mesh.quaternion);
  const s = mesh.scale;
  hull.scale.set(s.x * (1 + amount), s.y * (1 + amount), s.z * (1 + amount));
  parent.add(hull);
  return hull;
}
