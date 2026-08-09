// 공용 수학 / 유틸리티
export const TAU = Math.PI * 2;
export const PI = Math.PI;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const chance = (p) => Math.random() < p;
export const sign = (v) => (v < 0 ? -1 : 1);

// 각도 최단 경로 차이
export function angleDelta(a, b) {
  let d = (b - a) % TAU;
  if (d > PI) d -= TAU;
  if (d < -PI) d += TAU;
  return d;
}

// 임계 감쇠 스프링 (관절이 "살아있게" 움직이는 핵심)
export class Spring {
  constructor(value = 0, stiffness = 140, damping = 1) {
    this.v = value;
    this.vel = 0;
    this.k = stiffness;
    this.d = damping;
  }
  update(dt, target) {
    const c = 2 * Math.sqrt(this.k) * this.d;
    const acc = (target - this.v) * this.k - this.vel * c;
    this.vel += acc * dt;
    this.v += this.vel * dt;
    return this.v;
  }
  updateAngle(dt, target) {
    const t = this.v + angleDelta(this.v, target);
    return this.update(dt, t);
  }
  set(v) {
    this.v = v;
    this.vel = 0;
  }
}

// 점 → 선분 거리
export function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const cx = x1 + dx * t, cy = y1 + dy * t;
  return Math.hypot(px - cx, py - cy);
}

// 간단한 시드 없는 노이즈(부드러운 랜덤 흔들림)
export function noise1(t, seed = 0) {
  return (
    Math.sin(t * 1.13 + seed * 12.9898) * 0.5 +
    Math.sin(t * 2.31 + seed * 7.233) * 0.3 +
    Math.sin(t * 0.61 + seed * 3.117) * 0.2
  );
}
