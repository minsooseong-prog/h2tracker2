// 관절 좌표를 그대로 입자로 바꿔 실제 물리처럼 흔들리게 하는 래그돌.
// 드래그, 던지기, 넘어짐, 매달리기에 사용된다.
import { POINTS } from './skeleton.js';
import { clamp } from './math.js';

const LINKS = [
  ['pelvis', 'chestBase', 1], ['chestBase', 'chest', 1], ['chest', 'neck', 1], ['neck', 'head', 1],
  ['chest', 'elbowFar', 1], ['elbowFar', 'wristFar', 1], ['wristFar', 'handFar', 1],
  ['chest', 'elbowNear', 1], ['elbowNear', 'wristNear', 1], ['wristNear', 'handNear', 1],
  ['pelvis', 'kneeFar', 1], ['kneeFar', 'ankleFar', 1], ['ankleFar', 'toeFar', 1],
  ['pelvis', 'kneeNear', 1], ['kneeNear', 'ankleNear', 1], ['ankleNear', 'toeNear', 1],
  // 형태 유지용 보조 링크 (몸이 완전히 접히지 않도록)
  ['pelvis', 'chest', 0.55], ['pelvis', 'neck', 0.35], ['chestBase', 'neck', 0.4],
  ['chest', 'head', 0.25],
  ['chest', 'wristFar', 0.12], ['chest', 'wristNear', 0.12],
  ['pelvis', 'ankleFar', 0.12], ['pelvis', 'ankleNear', 0.12],
  ['kneeFar', 'toeFar', 0.2], ['kneeNear', 'toeNear', 0.2],
  ['elbowFar', 'handFar', 0.2], ['elbowNear', 'handNear', 0.2],
];

export class Ragdoll {
  constructor(pts, gravity = 1800) {
    this.p = {};
    for (const n of POINTS) {
      const s = pts[n];
      this.p[n] = { x: s.x, y: s.y, px: s.x, py: s.y, pinned: false };
    }
    this.links = LINKS.map(([a, b, stiff]) => ({
      a, b, stiff,
      len: Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y),
    }));
    this.gravity = gravity;
    this.grabbed = null;
    this.energy = 1;
  }

  seedVelocity(vx, vy) {
    for (const n of POINTS) {
      const q = this.p[n];
      q.px = q.x - vx * (1 / 60);
      q.py = q.y - vy * (1 / 60);
    }
  }

  grab(name, x, y) {
    this.grabbed = name;
    const q = this.p[name];
    q.pinned = true;
    q.x = x; q.y = y; q.px = x; q.py = y;
  }

  moveGrab(x, y) {
    if (!this.grabbed) return;
    const q = this.p[this.grabbed];
    q.px = q.x; q.py = q.y;
    q.x = x; q.y = y;
  }

  release() {
    if (this.grabbed) this.p[this.grabbed].pinned = false;
    this.grabbed = null;
  }

  step(dt, bounds) {
    dt = clamp(dt, 0, 1 / 45);
    const damp = 0.994;
    for (const n of POINTS) {
      const q = this.p[n];
      if (q.pinned) continue;
      const vx = (q.x - q.px) * damp;
      const vy = (q.y - q.py) * damp;
      q.px = q.x; q.py = q.y;
      q.x += vx;
      q.y += vy + this.gravity * dt * dt;
    }
    for (let it = 0; it < 6; it++) {
      for (const l of this.links) {
        const a = this.p[l.a], b = this.p[l.b];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = ((d - l.len) / d) * 0.5 * l.stiff;
        const ox = dx * diff, oy = dy * diff;
        if (!a.pinned) { a.x += ox; a.y += oy; }
        if (!b.pinned) { b.x -= ox; b.y -= oy; }
      }
      this.collide(bounds);
    }
    // 정지 판단용 운동 에너지
    let e = 0;
    for (const n of POINTS) {
      const q = this.p[n];
      e += Math.hypot(q.x - q.px, q.y - q.py);
    }
    this.energy = e / POINTS.length;
  }

  collide(bounds) {
    const { left, right, ground, platforms } = bounds;
    for (const n of POINTS) {
      const q = this.p[n];
      if (q.pinned) continue;
      if (q.x < left) { q.x = left; q.px = q.x + (q.px - q.x) * -0.5; }
      if (q.x > right) { q.x = right; q.px = q.x + (q.px - q.x) * -0.5; }
      let floor = ground;
      if (platforms) {
        for (const pl of platforms) {
          if (q.x > pl.x1 && q.x < pl.x2 && q.py <= pl.y + 4 && pl.y < floor) floor = pl.y;
        }
      }
      if (q.y > floor) {
        const vy = q.y - q.py;
        q.y = floor;
        q.py = q.y + vy * 0.35;      // 튕김
        q.px = q.x + (q.px - q.x) * 0.72; // 마찰
      }
      if (q.y < 0) { q.y = 0; q.py = q.y - (q.py - q.y) * 0.4; }
    }
  }

  points() {
    const out = {};
    for (const n of POINTS) out[n] = { x: this.p[n].x, y: this.p[n].y };
    return out;
  }

  center() {
    return { x: this.p.pelvis.x, y: this.p.pelvis.y };
  }
}
