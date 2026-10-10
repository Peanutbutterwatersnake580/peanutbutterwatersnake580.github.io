// Fixed-step flight from Kitten Cannon! v1.3 (Dan Fleming / BurstStudio, 2007).
//
// The Flash clip did this every enterFrame (about 30Hz):
//   xsp = power * cos(rot), ysp = power * sin(rot)   // rot is barrel angle
//   ysp += 1                                          // gravity, Flash +y is down
//   bounce 0.72 on a hard landing; a landing softer than 2px/frame ends the shot
//   TNT:     ysp = -28 - |ysp|, xsp = 5 + speed * 1.2, only while falling
//   balloon: ysp = -28 - |ysp|, xsp = 7 + speed * 1.2
//   trampoline: ysp = -ysp * 1.4 while falling, horizontal speed unchanged
//   spikes and the flytrap call setZeroes()
// Object hits are ignored until frame 15, matching Math.floor(_root.speed) != 0.
//
// Here +y is up. Falling is vy < 0. Distances are still Flash pixels.

import {
  ARM_FRAME,
  BOUNCE,
  GRAVITY,
  GROUND_Y,
  MAX_SPEED,
  SETTLE,
  aimVector,
  launchPoint,
} from './tune.js';

export function createKitten(angleDeg, power) {
  const p = launchPoint(angleDeg);
  const a = aimVector(angleDeg);
  return {
    x: p.x,
    y: p.y,
    startX: p.x,
    vx: a.x * power,
    vy: a.y * power,
    // Degrees. Nose is local +X. Positive rotation.z is nose-up; flight tumbles clockwise.
    spin: angleDeg,
    frame: 0,
    dead: false,
    cause: null,
  };
}

function clampSpeed(k) {
  k.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, k.vx));
  k.vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, k.vy));
}

// Ground objects only connect when the kitten is on the way down, same as the
// Flash hit tests (`ysp > 0` with +y down). Balloons and flytraps connect either way.
function canHit(k, prop) {
  if (k.frame < ARM_FRAME || k.dead || prop.spent) return false;
  if (prop.ready && k.frame < prop.ready) return false;
  if (prop.type === 'balloon' || prop.type === 'venus') return true;
  return k.vy < 0;
}

function overlaps(k, prop) {
  return Math.abs(k.x - prop.x) < prop.hw && Math.abs(k.y - prop.y) < prop.hh;
}

function pickHit(k, props) {
  let best = null;
  let bestD = Infinity;
  for (let i = 0; i < props.length; i++) {
    const prop = props[i];
    if (Math.abs(prop.x - k.x) > prop.hw + 1) continue;
    if (!canHit(k, prop) || !overlaps(k, prop)) continue;
    const d = Math.abs(k.x - prop.x) + Math.abs(k.y - prop.y);
    if (d < bestD) {
      best = prop;
      bestD = d;
    }
  }
  return best;
}

function land(k) {
  const falling = -k.vy;
  if (falling < SETTLE) {
    k.dead = true;
    k.vx = 0;
    k.vy = 0;
    k.cause = 'landed';
    return 'settle';
  }
  k.vx *= BOUNCE;
  k.vy = falling * BOUNCE;
  return 'bounce';
}

export function resolveHit(k, prop) {
  if (prop.type === 'tnt') {
    k.vy = 28 + Math.abs(k.vy);
    k.vx = 5 + k.vx * 1.2;
    prop.spent = true;
    clampSpeed(k);
    return 'tnt';
  }
  if (prop.type === 'balloon') {
    k.vy = 28 + Math.abs(k.vy);
    k.vx = 7 + k.vx * 1.2;
    prop.spent = true;
    clampSpeed(k);
    return 'balloon';
  }
  if (prop.type === 'trampoline') {
    // One boing per pass. The Flash clip could retrigger every falling frame
    // while the kitten sat inside the bed; a few frames of cooldown keeps a
    // single landing as one hop.
    k.vy = -k.vy * 1.4;
    prop.ready = k.frame + 10;
    clampSpeed(k);
    return 'trampoline';
  }
  if (prop.type === 'spikes') {
    k.dead = true;
    k.vx = 0;
    k.vy = 0;
    k.cause = 'spikes';
    prop.spent = true;
    return 'spikes';
  }
  if (prop.type === 'venus') {
    k.dead = true;
    k.vx = 0;
    k.vy = 0;
    k.cause = 'venus';
    prop.spent = true;
    return 'venus';
  }
  return null;
}

// One 30Hz step. Long steps are sampled along the segment so a fast kitten
// cannot tunnel through a crate. Gravity is still applied once, like enterFrame.
export function step(k, props) {
  if (k.dead) return null;
  k.frame += 1;
  k.vy -= GRAVITY;
  const x0 = k.x;
  const y0 = k.y;
  const x1 = x0 + k.vx;
  const y1 = y0 + k.vy;
  k.spin -= k.vx / 5;

  const samples = Math.max(1, Math.min(48, Math.ceil(Math.hypot(k.vx, k.vy) / 10)));
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    k.x = x0 + (x1 - x0) * t;
    k.y = y0 + (y1 - y0) * t;
    const hit = pickHit(k, props);
    if (hit) return resolveHit(k, hit);
    if (k.y <= GROUND_Y && k.vy < 0) {
      k.y = GROUND_Y;
      return land(k);
    }
  }
  if (k.y < GROUND_Y) k.y = GROUND_Y;
  return null;
}

export function runUntilDone(angleDeg, power, props, maxFrames = 30 * 90) {
  const k = createKitten(angleDeg, power);
  const hits = [];
  let guard = 0;
  while (!k.dead && guard < maxFrames) {
    const event = step(k, props);
    if (event && event !== 'bounce' && event !== 'settle') hits.push(event);
    guard += 1;
  }
  return { kitten: k, hits, frames: guard };
}
