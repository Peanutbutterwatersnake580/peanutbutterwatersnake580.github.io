import * as THREE from 'three';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ridge(color, yBase, amp, z, freq, phase) {
  const segs = 280;
  const length = 280000;
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segs; i++) {
    const x = (i / segs) * length - 4000;
    const y =
      yBase +
      Math.sin(i * freq + phase) * amp +
      Math.sin(i * freq * 0.37 + phase * 1.7) * amp * 0.45;
    positions.push(x, y, z, x, -80, z);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    // DoubleSide ribbons: winding just needs to be consistent.
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
  );
  return mesh;
}

function scatter(count, geo, material, place) {
  const mesh = new THREE.InstancedMesh(geo, material, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    place(dummy, i, count);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export function createScenery(scene, look) {
  const skyGeo = new THREE.SphereGeometry(9000, 20, 14);
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 4;
  skyCanvas.height = 512;
  const g = skyCanvas.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#5aa6e6');
  grd.addColorStop(0.45, '#9ed4f6');
  grd.addColorStop(0.78, '#d7f0b0');
  grd.addColorStop(1, '#f3e2a4');
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 512);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    skyGeo,
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false })
  );
  scene.add(sky);

  // Flat toon colors. A repeating grass texture aliases into a checkerboard
  // at this grazing angle; the tufts carry the detail instead.
  const grass = look.mat(0x5eae3c);
  const dirt = look.mat(0xc4894e);
  // Top stays at y=0. A fullscreen phone looks lower than the browser tab,
  // so the dirt continues well past the bottom of that view.
  const ground = new THREE.Mesh(new THREE.BoxGeometry(300000, 1800, 640), [
    dirt, dirt, grass, dirt, dirt, dirt,
  ]);
  ground.position.set(146000, -900, 80);
  scene.add(ground);

  scene.add(ridge(0x8ed468, 78, 42, -160, 0.55, 0.4));
  scene.add(ridge(0x3f8f62, 110, 64, -300, 0.42, 1.2));
  scene.add(ridge(0x6aa4c8, 150, 80, -480, 0.31, 2.1));

  // Fixed world height, behind the foothill ridges. update() slides them in x only.
  const ranges = [
    mountainRange(scene, { color: 0x6e8f62, snow: 0, z: -640, height: 260, parallax: 0.55, seed: 0x51a1 }),
    mountainRange(scene, { color: 0x7b93aa, snow: 0xf7f4ee, z: -1040, height: 460, parallax: 0.32, seed: 0x51a2 }),
    mountainRange(scene, { color: 0xb4cbe2, snow: 0xfffdf8, z: -1560, height: 680, parallax: 0.14, seed: 0x51a3 }),
  ];

  const rng = mulberry32(0x0a11ce);
  const cone = new THREE.ConeGeometry(5, 16, 4);
  cone.translate(0, 8, 0);
  const tufts = scatter(1800, cone, look.mat(0x3f9a34), (dummy, i) => {
    dummy.position.set(-400 + rng() * 220000, 0, -70 + rng() * 120);
    dummy.rotation.y = rng() * Math.PI;
    const h = 0.6 + rng() * 1.1;
    dummy.scale.set(0.7 + rng() * 0.8, h, 0.7 + rng() * 0.6);
  });
  scene.add(tufts);
  const darkTufts = scatter(900, cone, look.mat(0x2f7a28), (dummy) => {
    dummy.position.set(-400 + rng() * 220000, 0, -60 + rng() * 100);
    dummy.rotation.y = rng() * Math.PI;
    dummy.scale.setScalar(0.45 + rng() * 0.5);
  });
  scene.add(darkTufts);

  const flowerColors = [0xfff4d2, 0xf2d24e, 0xe86b8a, 0xffffff];
  const bud = new THREE.SphereGeometry(4.2, 7, 6);
  bud.translate(0, 9, 0);
  for (const color of flowerColors) {
    scene.add(scatter(220, bud, look.mat(color), (dummy) => {
      dummy.position.set(rng() * 180000, 0, -40 + rng() * 80);
      dummy.scale.setScalar(0.7 + rng() * 0.8);
    }));
  }

  const rock = new THREE.DodecahedronGeometry(4, 0);
  scene.add(scatter(260, rock, look.mat(0x8d8478), (dummy) => {
    dummy.position.set(rng() * 200000, 2, -50 + rng() * 90);
    dummy.rotation.set(rng(), rng(), rng());
    dummy.scale.set(0.6 + rng(), 0.4 + rng() * 0.5, 0.6 + rng());
  }));

  const clouds = [];
  const puff = new THREE.SphereGeometry(1, 10, 8);
  const puffMat = look.mat(0xfffaf2);
  const cloudGap = 520;
  for (let i = 0; i < 16; i++) {
    const cloud = new THREE.Group();
    const n = 4;
    for (let k = 0; k < n; k++) {
      const s = meshSphere(puff, puffMat, (k - 1.5) * 22, (k % 2) * 10, (k % 3) * 4);
      s.scale.setScalar(22 + (k % 3) * 10);
      cloud.add(s);
    }
    cloud.position.set(-700 + i * cloudGap, 0, -100 - (i % 4) * 55);
    scene.add(cloud);
    clouds.push({ mesh: cloud, altitude: 250 + (i % 5) * 38, phase: i * 0.7 });
  }

  const sun = new THREE.Group();
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(46, 18, 14),
    new THREE.MeshBasicMaterial({ color: 0xffe38a })
  );
  sun.add(ball);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: look.soft,
      color: 0xffe7a3,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  );
  glow.scale.set(200, 200, 1);
  sun.add(glow);
  scene.add(sun);

  return {
    update(time, cam) {
      sky.position.set(cam.x, cam.y, cam.z);
      sun.position.set(cam.x - 520, cam.y + 268, -460);
      for (let i = 0; i < ranges.length; i++) trackRange(ranges[i], cam.x);
      const cloudSpan = clouds.length * cloudGap;
      for (let i = 0; i < clouds.length; i++) {
        const cloud = clouds[i];
        const left = cam.x - cloudSpan * 0.45;
        if (cloud.mesh.position.x < left) cloud.mesh.position.x += cloudSpan;
        if (cloud.mesh.position.x > left + cloudSpan) cloud.mesh.position.x -= cloudSpan;
        cloud.mesh.position.y = cloud.altitude + Math.sin(time * 0.25 + cloud.phase) * 8;
      }
    },
  };
}

function peakShape(kind, rng) {
  const j = () => (rng() - 0.5) * 0.14;
  if (kind < 0.22) {
    return [
      { t: -0.2 + j(), h: 0.16 },
      { t: 0.02 + j(), h: 1 },
      { t: 0.18 + j(), h: 0.14 },
    ];
  }
  if (kind < 0.44) {
    return [
      { t: -0.78, h: 0.1 },
      { t: -0.25, h: 0.4 },
      { t: 0.18 + j(), h: 1 },
      { t: 0.4, h: 0.22 },
    ];
  }
  if (kind < 0.66) {
    return [
      { t: -0.58, h: 0.2 },
      { t: -0.32 + j(), h: 0.78 + rng() * 0.22 },
      { t: -0.04, h: 0.26 },
      { t: 0.3 + j(), h: 1 },
      { t: 0.52, h: 0.14 },
    ];
  }
  if (kind < 0.84) {
    return [
      { t: -0.72, h: 0.32 },
      { t: -0.22 + j(), h: 0.92 },
      { t: 0.24, h: 0.66 },
      { t: 0.58, h: 0.28 },
    ];
  }
  return [
    { t: -0.64, h: 0.18 },
    { t: -0.36, h: 0.96 },
    { t: 0.26 + j(), h: 0.9 },
    { t: 0.52, h: 0.2 },
  ];
}

function mountainRange(scene, opts) {
  const span = 4200;
  const tiles = 3;
  const length = span * tiles;
  const rng = mulberry32(opts.seed);
  const samples = [{ x: 0, y: -36 }];
  let x = 0;
  while (x < length - 400) {
    const roll = rng();
    let kind = 4;
    let width = 640 + rng() * 420;
    if (roll < 0.22) {
      kind = 0;
      width = 150 + rng() * 160;
    } else if (roll < 0.44) {
      kind = 1;
      width = 560 + rng() * 460;
    } else if (roll < 0.66) {
      kind = 2;
      width = 420 + rng() * 280;
    } else if (roll < 0.84) {
      kind = 3;
      width = 480 + rng() * 340;
    }
    const valley = 320 + rng() * 560;
    const left = x + valley;
    const right = Math.min(length, left + width);
    if (left > length - 160) break;
    const peak = opts.height * (kind === 0 ? 0.72 + rng() * 0.4 : 0.38 + rng() * 0.55);
    samples.push({ x: left, y: -36 });
    const shape = peakShape([0.05, 0.3, 0.55, 0.75, 0.92][kind], rng);
    for (let i = 0; i < shape.length; i++) {
      const p = shape[i];
      samples.push({
        x: left + ((p.t + 1) * 0.5) * (right - left),
        y: -20 + peak * p.h,
      });
    }
    samples.push({ x: right, y: -36 });
    x = right;
  }
  samples.push({ x: length, y: -36 });
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].x <= samples[i - 1].x) samples[i].x = samples[i - 1].x + 6;
  }

  const positions = [];
  const indices = [];
  const caps = [];
  const capIndex = [];
  for (let i = 0; i < samples.length; i++) {
    positions.push(samples[i].x, samples[i].y, 0, samples[i].x, -36, 0);
  }
  if (opts.snow) {
    for (let i = 1; i < samples.length - 1; i++) {
      const y = samples[i].y;
      if (y < opts.height * 0.42) continue;
      if (y < samples[i - 1].y || y < samples[i + 1].y) continue;
      const n = caps.length / 3;
      const tip = samples[i];
      const left = samples[i - 1];
      const right = samples[i + 1];
      const shoulder = -20 + (y + 20) * 0.58;
      // Left shoulder, right shoulder, tip. That winds toward +Z, the camera.
      caps.push(
        tip.x + (left.x - tip.x) * 0.42, shoulder, 2,
        tip.x + (right.x - tip.x) * 0.42, shoulder, 2,
        tip.x, y + 6, 2,
      );
      capIndex.push(n, n + 1, n + 2);
    }
    for (let i = 1; i < samples.length - 2; i++) {
      const a = samples[i];
      const b = samples[i + 1];
      if (a.y < opts.height * 0.5 || b.y < opts.height * 0.5) continue;
      const n = caps.length / 3;
      const sa = -20 + (a.y + 20) * 0.7;
      const sb = -20 + (b.y + 20) * 0.7;
      caps.push(a.x, sa, 2, b.x, sb, 2, b.x, b.y + 4, 2, a.x, a.y + 4, 2);
      capIndex.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
  }
  for (let i = 0; i < samples.length - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const group = new THREE.Group();
  // Flat color, same as the foothill ribbons. A toon shade on this card goes muddy.
  group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: opts.color, side: THREE.DoubleSide })));
  if (opts.snow) {
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(caps, 3));
    snowGeo.setIndex(capIndex);
    snowGeo.computeVertexNormals();
    group.add(new THREE.Mesh(snowGeo, new THREE.MeshBasicMaterial({ color: opts.snow, side: THREE.DoubleSide })));
  }
  group.position.z = opts.z;
  scene.add(group);
  return { group, span, parallax: opts.parallax };
}

function trackRange(range, camX) {
  const span = range.span;
  const scroll = ((camX * range.parallax) % span + span) % span;
  range.group.position.x = camX - scroll - span;
}

function meshSphere(geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
}
