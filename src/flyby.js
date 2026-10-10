import * as THREE from 'three';
import { shell } from './look.js';

// Clouds top out near y 410. These stay parked until the kitten is well above that.
export const FLYBY_Y = 980;

// The flight camera sits at z = 980. Craft used to spawn just behind the kitten,
// so a fast pass filled the screen and was gone. They now hang well back in z.
const CAM_Z = 980;
const VIEW_TAN = Math.tan((34 * Math.PI) / 360);

function viewHalfWidth(z) {
  return VIEW_TAN * (CAM_Z - z) * 2.05;
}

const sphere = new THREE.SphereGeometry(1, 16, 12);
const box = new THREE.BoxGeometry(1, 1, 1);
const cone = new THREE.ConeGeometry(1, 1, 12);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);

const beamMat = new THREE.MeshBasicMaterial({
  color: 0xb6ff9a,
  transparent: true,
  opacity: 0.3,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a1e });
const flameCoreMat = new THREE.MeshBasicMaterial({ color: 0xfff6d0 });

function mesh(geometry, material, x, y, z) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z);
  return item;
}

function body(parent, item, look) {
  parent.add(item);
  shell(item, parent, look.outline, 0.06);
  return item;
}

// Nose is local +X. rotation.z = atan2(vy, vx) then points the nose along travel.
function blimp(look) {
  const root = new THREE.Group();
  const { mat } = look;
  const hull = mesh(sphere, mat(0xf0d78c), 0, 0, 0);
  hull.scale.set(78, 26, 26);
  body(root, hull, look);

  for (const [x, sx] of [[20, 7], [-24, 5.5]]) {
    const band = mesh(sphere, mat(0xd23b2e), x, 0, 0);
    band.scale.set(sx, 27, 27);
    root.add(band);
  }

  const gondola = mesh(box, mat(0x4a3428), -2, -32, 0);
  gondola.scale.set(30, 12, 12);
  body(root, gondola, look);

  const fin = mesh(box, mat(0xd23b2e), -70, 12, 0);
  fin.scale.set(18, 30, 3.2);
  root.add(fin);
  const finH = mesh(box, mat(0xd23b2e), -70, 0, 0);
  finH.scale.set(16, 3.2, 28);
  root.add(finH);

  for (const x of [-18, -2, 14]) {
    const pane = mesh(sphere, mat(0x243044), x, -12, 24);
    pane.scale.set(4.2, 4.2, 3);
    root.add(pane);
  }
  return { mesh: root, parts: {} };
}

function ufo(look) {
  const root = new THREE.Group();
  const { mat } = look;
  const hull = mesh(sphere, mat(0xd5dde6), 0, 0, 0);
  hull.scale.set(48, 12, 48);
  body(root, hull, look);
  const dome = mesh(sphere, mat(0x8fd4ff), 0, 12, 0);
  dome.scale.set(18, 14, 18);
  body(root, dome, look);

  const lights = new THREE.Group();
  const colors = [0x39e07a, 0xffe56a, 0xff5a7a, 0x7ec8ff];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bulb = mesh(sphere, mat(colors[i % colors.length]), Math.cos(a) * 36, -1, Math.sin(a) * 36);
    bulb.scale.setScalar(4.2);
    lights.add(bulb);
  }
  root.add(lights);

  // Unit cone points +Y and is centered. Flip it so the wide end sits under the saucer.
  const beam = mesh(cone, beamMat, 0, -38, 0);
  beam.rotation.x = Math.PI;
  beam.scale.set(18, 52, 18);
  root.add(beam);
  return { mesh: root, parts: { lights } };
}

function rocket(look) {
  const root = new THREE.Group();
  const { mat } = look;
  const tube = mesh(cyl, mat(0xf4f6f8), 0, 0, 0);
  tube.rotation.z = -Math.PI / 2;
  tube.scale.set(10, 64, 10);
  body(root, tube, look);

  const nose = mesh(cone, mat(0xd23b2e), 46, 0, 0);
  nose.rotation.z = -Math.PI / 2;
  nose.scale.set(10, 28, 10);
  body(root, nose, look);

  const stripe = mesh(box, mat(0x2f6fbe), 4, 0, 0);
  stripe.rotation.z = -Math.PI / 2;
  stripe.scale.set(11.2, 10, 11.2);
  root.add(stripe);

  for (const y of [14, -14]) {
    const fin = mesh(box, mat(0x2b2118), -22, y, 0);
    fin.scale.set(18, 16, 3);
    root.add(fin);
  }

  const flame = mesh(cone, flameMat, -44, 0, 0);
  flame.rotation.z = Math.PI / 2;
  flame.scale.set(7, 22, 7);
  root.add(flame);
  const core = mesh(cone, flameCoreMat, -42, 0, 0);
  core.rotation.z = Math.PI / 2;
  core.scale.set(3.6, 14, 3.6);
  root.add(core);
  return { mesh: root, parts: { flame, core } };
}

function plane(look) {
  const root = new THREE.Group();
  const { mat } = look;
  const fuselage = mesh(sphere, mat(0xc47a3a), 0, 0, 0);
  fuselage.scale.set(44, 11, 11);
  body(root, fuselage, look);

  // Wings sit outside the body so the side camera sees a biplane, not a sausage.
  const upper = mesh(box, mat(0xf2c14e), 2, 22, 0);
  upper.scale.set(62, 7, 14);
  body(root, upper, look);
  const lower = mesh(box, mat(0xf2c14e), 2, -18, 0);
  lower.scale.set(52, 6, 14);
  root.add(lower);
  for (const x of [-14, 18]) {
    const strut = mesh(box, mat(0x2b2118), x, 2, 8);
    strut.scale.set(3.4, 42, 3.4);
    root.add(strut);
  }

  const cockpit = mesh(sphere, mat(0x8fd4ff), 14, 12, 6);
  cockpit.scale.set(11, 8, 8);
  body(root, cockpit, look);

  const fin = mesh(box, mat(0xd23b2e), -46, 20, 0);
  fin.scale.set(16, 28, 3.5);
  root.add(fin);
  const tail = mesh(box, mat(0xd23b2e), -46, 5, 0);
  tail.scale.set(18, 4, 24);
  root.add(tail);

  const prop = mesh(box, mat(0x2b2118), 48, 0, 0);
  prop.scale.set(2.6, 34, 3.4);
  root.add(prop);
  return { mesh: root, parts: { prop } };
}

const MAKERS = { blimp, ufo, rocket, plane };
const KINDS = Object.keys(MAKERS);

function pickKind() {
  return KINDS[Math.floor(Math.random() * KINDS.length)];
}

export function createFlybys(scene, look) {
  const crafts = [];
  let above = false;
  let wait = 0;

  function launch(cam, kittenY, kind, at) {
    const type = MAKERS[kind] ? kind : pickKind();
    const built = MAKERS[type](look);
    // Uniform scale keeps the biplane wings outside the body. The extra size
    // only offsets how far back they sit, so the silhouette stays readable.
    built.mesh.scale.setScalar(2.2);
    let dir = Math.random() < 0.5 ? 1 : -1;
    if (type === 'rocket' && Math.random() < 0.75) dir = 1;
    const speed = type === 'rocket' ? 160 + Math.random() * 70
      : type === 'plane' ? 90 + Math.random() * 40
      : type === 'ufo' ? 70 + Math.random() * 30
      : 50 + Math.random() * 25;
    const z = at && at.z != null ? at.z : -4000 - Math.random() * 1600;
    const lead = viewHalfWidth(z) + 220 + Math.random() * 280;
    const lift = (Math.random() < 0.6 ? 1 : -1) * (220 + Math.random() * 180);
    const craft = {
      kind: type,
      mesh: built.mesh,
      parts: built.parts,
      x: at ? cam.x + at.x : cam.x - dir * lead,
      y: at ? kittenY + at.y : kittenY + lift,
      z,
      vx: at && at.vx != null ? at.vx : dir * speed,
      vy: at && at.vy != null ? at.vy : (type === 'rocket' ? 14 + Math.random() * 22 : (Math.random() - 0.5) * 8),
      phase: Math.random() * Math.PI * 2,
      age: 0,
    };
    scene.add(craft.mesh);
    crafts.push(craft);
  }

  function update(time, dt, cam, kittenY, flying) {
    for (let i = crafts.length - 1; i >= 0; i--) {
      const craft = crafts[i];
      craft.age += dt;
      craft.x += craft.vx * dt;
      craft.y += craft.vy * dt;
      const bobAmp = craft.kind === 'rocket' ? 3 : 12;
      const bob = Math.sin(time * (craft.kind === 'blimp' ? 0.7 : 1.5) + craft.phase) * bobAmp;
      craft.mesh.position.set(craft.x, craft.y + bob, craft.z);
      if (craft.kind === 'ufo') {
        craft.mesh.rotation.z = Math.sin(time * 1.2 + craft.phase) * 0.18;
        craft.mesh.rotation.x = Math.cos(time * 0.8 + craft.phase) * 0.1;
        if (craft.parts.lights) craft.parts.lights.rotation.y = time * 1.7;
      } else {
        craft.mesh.rotation.z = Math.atan2(craft.vy, craft.vx);
      }
      if (craft.parts.prop) craft.parts.prop.rotation.x = time * 32;
      if (craft.parts.flame) {
        const flick = 0.65 + Math.abs(Math.sin(time * 34 + craft.phase)) * 0.55;
        craft.parts.flame.scale.y = 22 * flick;
        craft.parts.core.scale.y = 14 * (0.55 + flick * 0.45);
      }
      const past = Math.abs(craft.x - cam.x) > viewHalfWidth(craft.z) + 360
        && Math.sign(craft.x - cam.x) === Math.sign(craft.vx);
      if (past || craft.age > 48) {
        scene.remove(craft.mesh);
        crafts.splice(i, 1);
      }
    }

    const high = flying && kittenY >= FLYBY_Y;
    if (!high) {
      above = false;
      return;
    }
    if (!above) {
      above = true;
      wait = 0.35 + Math.random() * 0.75;
    }
    wait -= dt;
    if (wait <= 0 && crafts.length < 1) {
      launch(cam, kittenY);
      wait = 7 + Math.random() * 6;
    }
  }

  function clear() {
    for (let i = 0; i < crafts.length; i++) scene.remove(crafts[i].mesh);
    crafts.length = 0;
    above = false;
  }

  return {
    update,
    clear,
    launch,
    stats() {
      return crafts.map((craft) => ({
        kind: craft.kind,
        x: craft.x,
        y: craft.y,
        z: craft.z,
      }));
    },
  };
}
