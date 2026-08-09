// 사람과 동일한 관절 계층을 가진 2D 뼈대.
// 규칙: 각도 0 = 화면 아래쪽(+Y), 방향벡터 = (sin a, cos a)
// 모든 포즈는 "오른쪽을 바라보는 상태" 기준으로 작성하고, 좌우 반전은 facing 으로 처리한다.
import { PI, Spring, angleDelta } from './math.js';

// rel: 'root' = 골반(몸통) 기준, 'parent' = 부모 뼈 기준
// base: 중립 자세에서의 기본 각도 (포즈 값은 여기서의 "변형량")
export const BONES = [
  { n: 'spine',     o: 'root',      p: null,       len: 26, base: PI,  rel: 'root',   k: 210 },
  { n: 'chest',     o: 'spine',     p: 'spine',    len: 26, base: PI,  rel: 'root',   k: 210 },
  { n: 'neck',      o: 'chest',     p: 'chest',    len: 10, base: PI,  rel: 'root',   k: 240 },
  { n: 'head',      o: 'neck',      p: 'neck',     len: 25, base: PI,  rel: 'root',   k: 190 },

  { n: 'armFarUp',  o: 'chest',     p: 'chest',    len: 26, base: 0,   rel: 'root',   k: 150 },
  { n: 'armFarLo',  o: 'armFarUp',  p: 'armFarUp', len: 24, base: 0,   rel: 'parent', k: 135 },
  { n: 'handFar',   o: 'armFarLo',  p: 'armFarLo', len: 9,  base: 0,   rel: 'parent', k: 100 },

  { n: 'armNearUp', o: 'chest',     p: 'chest',    len: 26, base: 0,   rel: 'root',   k: 150 },
  { n: 'armNearLo', o: 'armNearUp', p: 'armNearUp',len: 24, base: 0,   rel: 'parent', k: 135 },
  { n: 'handNear',  o: 'armNearLo', p: 'armNearLo',len: 9,  base: 0,   rel: 'parent', k: 100 },

  { n: 'legFarUp',  o: 'root',      p: null,       len: 30, base: 0,   rel: 'root',   k: 170 },
  { n: 'legFarLo',  o: 'legFarUp',  p: 'legFarUp', len: 28, base: 0,   rel: 'parent', k: 155 },
  { n: 'footFar',   o: 'legFarLo',  p: 'legFarLo', len: 12, base: 1.5, rel: 'parent', k: 120 },

  { n: 'legNearUp', o: 'root',      p: null,       len: 30, base: 0,   rel: 'root',   k: 170 },
  { n: 'legNearLo', o: 'legNearUp', p: 'legNearUp',len: 28, base: 0,   rel: 'parent', k: 155 },
  { n: 'footNear',  o: 'legNearLo', p: 'legNearLo',len: 12, base: 1.5, rel: 'parent', k: 120 },
];

export const JOINT_NAMES = BONES.map((b) => b.n);

// 렌더러/래그돌이 공유하는 표준 포인트 이름
export const POINTS = [
  'pelvis', 'chestBase', 'chest', 'neck', 'head',
  'elbowFar', 'wristFar', 'handFar',
  'elbowNear', 'wristNear', 'handNear',
  'kneeFar', 'ankleFar', 'toeFar',
  'kneeNear', 'ankleNear', 'toeNear',
];

export const HEAD_RADIUS = 26;   // 머리 원 반지름(스케일 1 기준)
export const HIP_HEIGHT = 60;    // 서 있을 때 지면에서 골반까지 높이

export class Skeleton {
  constructor() {
    this.springs = {};
    this.angle = {};
    for (const b of BONES) {
      this.springs[b.n] = new Spring(0, b.k, 1);
      this.angle[b.n] = 0;
    }
    this.root = { x: 0, y: 0, angle: 0 };
    this.rootAngleSpring = new Spring(0, 90, 1);
    this.scale = 1;
    this.facing = 1;
    this.pts = {};
    for (const p of POINTS) this.pts[p] = { x: 0, y: 0 };
  }

  // 관절 목표 각도를 스프링으로 따라간다 (부드러운 움직임의 근원)
  update(dt, targets, stiffMul = 1) {
    for (const b of BONES) {
      const s = this.springs[b.n];
      s.k = b.k * stiffMul;
      const t = targets[b.n] ?? 0;
      this.angle[b.n] = s.updateAngle(dt, t);
    }
  }

  setPoseInstant(targets) {
    for (const b of BONES) {
      this.springs[b.n].set(targets[b.n] ?? 0);
      this.angle[b.n] = targets[b.n] ?? 0;
    }
  }

  // FK: 각도 → 월드 좌표
  solve() {
    const S = this.scale, F = this.facing;
    const world = {};
    const origin = {};
    const tip = {};
    const rootPt = { x: this.root.x, y: this.root.y };

    for (const b of BONES) {
      const o = b.o === 'root' ? rootPt : tip[b.o];
      const parentWorld = b.rel === 'root' ? this.root.angle : world[b.p];
      const w = parentWorld + b.base + this.angle[b.n];
      world[b.n] = w;
      origin[b.n] = o;
      tip[b.n] = {
        x: o.x + F * Math.sin(w) * b.len * S,
        y: o.y + Math.cos(w) * b.len * S,
      };
    }

    const P = this.pts;
    P.pelvis = rootPt;
    P.chestBase = tip.spine;
    P.chest = tip.chest;
    P.neck = tip.neck;
    P.head = tip.head;
    P.elbowFar = tip.armFarUp;   P.wristFar = tip.armFarLo;   P.handFar = tip.handFar;
    P.elbowNear = tip.armNearUp; P.wristNear = tip.armNearLo; P.handNear = tip.handNear;
    P.kneeFar = tip.legFarUp;    P.ankleFar = tip.legFarLo;   P.toeFar = tip.footFar;
    P.kneeNear = tip.legNearUp;  P.ankleNear = tip.legNearLo; P.toeNear = tip.footNear;
    this.world = world;
    return P;
  }

  // 래그돌 좌표 → 관절 각도로 역산 (물리 → 애니메이션 복귀용)
  adoptFromPoints(pts) {
    const F = this.facing;
    const ang = (a, b) => Math.atan2((b.x - a.x) * F, b.y - a.y);
    const chain = {
      spine: [pts.pelvis, pts.chestBase],
      chest: [pts.chestBase, pts.chest],
      neck: [pts.chest, pts.neck],
      head: [pts.neck, pts.head],
      armFarUp: [pts.chest, pts.elbowFar],
      armFarLo: [pts.elbowFar, pts.wristFar],
      handFar: [pts.wristFar, pts.handFar],
      armNearUp: [pts.chest, pts.elbowNear],
      armNearLo: [pts.elbowNear, pts.wristNear],
      handNear: [pts.wristNear, pts.handNear],
      legFarUp: [pts.pelvis, pts.kneeFar],
      legFarLo: [pts.kneeFar, pts.ankleFar],
      footFar: [pts.ankleFar, pts.toeFar],
      legNearUp: [pts.pelvis, pts.kneeNear],
      legNearLo: [pts.kneeNear, pts.ankleNear],
      footNear: [pts.ankleNear, pts.toeNear],
    };
    const world = {};
    for (const b of BONES) {
      const c = chain[b.n];
      world[b.n] = ang(c[0], c[1]);
    }
    // 몸통 방향으로 루트 각도 추정
    this.root.angle = world.spine - PI;
    this.rootAngleSpring.set(this.root.angle);
    this.root.x = pts.pelvis.x;
    this.root.y = pts.pelvis.y;
    for (const b of BONES) {
      const parentWorld = b.rel === 'root' ? this.root.angle : world[b.p];
      let a = angleDelta(0, world[b.n] - parentWorld - b.base);
      this.springs[b.n].set(a);
      this.angle[b.n] = a;
    }
  }
}
