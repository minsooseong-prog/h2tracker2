// 절차적 모션 클립 라이브러리.
// 모든 클립: (t, u) => 포즈 오브젝트   t = 경과 초, u = 진행률(0~1, 1회성 클립)
// 값은 "중립 자세(STAND)로부터의 변형량(radian)".
// 특수 키: _hip(엉덩이 높이 가감), _lean(몸 전체 기울기), _x(좌우 오프셋), _spin(몸 전체 회전)
import { PI, TAU, clamp, noise1 } from './math.js';

const s = Math.sin, c = Math.cos;
const bell = (u) => s(clamp(u, 0, 1) * PI); // 0→1→0

export const STAND = {
  spine: 0, chest: 0, neck: 0, head: 0,
  armFarUp: -0.14, armFarLo: 0.30, handFar: 0,
  armNearUp: 0.16, armNearLo: 0.32, handNear: 0,
  legFarUp: -0.10, legFarLo: -0.13, footFar: 0,
  legNearUp: 0.10, legNearLo: -0.11, footNear: 0,
  _hip: 0, _lean: 0, _x: 0, _spin: 0,
};

export const CLIPS = {};
export const META = {};

// clip(이름, 지속시간, 루프여부, 함수)
function clip(name, dur, loop, fn) {
  CLIPS[name] = fn;
  META[name] = { dur, loop };
}

/* ─────────── 기본 / 이동 ─────────── */

clip('idle', 3.2, true, (t) => ({
  spine: 0.02 * s(t * 1.1) + 0.01 * noise1(t * 0.5, 1),
  chest: 0.03 * s(t * 1.3 + 0.4),
  neck: 0.02 * s(t * 0.9),
  head: 0.05 * noise1(t * 0.35, 3),
  armNearUp: 0.16 + 0.05 * s(t * 1.05),
  armNearLo: 0.32 + 0.06 * s(t * 1.05 + 0.7),
  armFarUp: -0.14 + 0.05 * s(t * 1.0 + 1.2),
  armFarLo: 0.30 + 0.06 * s(t * 1.0 + 1.9),
  _hip: 1.6 * s(t * 1.1),
  _lean: 0.015 * s(t * 0.6),
}));

clip('idleShift', 2.4, false, (t, u) => {
  const b = bell(u);
  return {
    _lean: -0.09 * b, _hip: -3 * b, _x: -4 * b,
    legNearUp: 0.10 + 0.16 * b, legNearLo: -0.11 - 0.20 * b,
    legFarUp: -0.10 - 0.06 * b,
    armNearUp: 0.16 + 0.12 * b, armFarUp: -0.14 - 0.10 * b,
    head: 0.12 * b, neck: 0.06 * b,
  };
});

clip('lookAround', 2.6, false, (t, u) => ({
  head: 0.5 * s(u * TAU), neck: 0.25 * s(u * TAU), chest: 0.08 * s(u * TAU),
  armNearUp: 0.16 + 0.1 * s(u * TAU), _hip: -1 * bell(u),
}));

function walkCycle(p, amp, armAmp, lean, bob) {
  return {
    legNearUp: amp * s(p),
    legNearLo: -0.30 + 0.42 * c(p + 1.0) - 0.30,
    footNear: 0.30 * s(p + 1.4),
    legFarUp: amp * s(p + PI),
    legFarLo: -0.30 + 0.42 * c(p + PI + 1.0) - 0.30,
    footFar: 0.30 * s(p + PI + 1.4),
    armNearUp: -armAmp * s(p),
    armNearLo: 0.35 + 0.25 * (1 + s(p + 0.6)) * 0.5,
    armFarUp: -armAmp * s(p + PI),
    armFarLo: 0.35 + 0.25 * (1 + s(p + PI + 0.6)) * 0.5,
    spine: lean * 0.4, chest: lean * 0.3,
    neck: -lean * 0.3, head: -lean * 0.3,
    _lean: lean,
    _hip: bob * c(2 * p),
  };
}

clip('walk', 1, true, (t) => walkCycle(t * 7.2, 0.52, 0.42, 0.05, 2.6));
clip('jog', 1, true, (t) => walkCycle(t * 10.5, 0.72, 0.66, 0.12, 4.5));
clip('run', 1, true, (t) => {
  const p = t * 13.5;
  const o = walkCycle(p, 0.95, 0.95, 0.24, 7);
  o.armNearLo = 1.35 + 0.2 * s(p);
  o.armFarLo = 1.35 + 0.2 * s(p + PI);
  o._hip = 7 * c(2 * p) + 4;
  return o;
});
clip('sneak', 1, true, (t) => {
  const o = walkCycle(t * 4.2, 0.34, 0.12, 0.30, 1.5);
  o._hip = -16 + 1.5 * c(2 * t * 4.2);
  o.legNearLo = -0.85 + 0.25 * s(t * 4.2);
  o.legFarLo = -0.85 + 0.25 * s(t * 4.2 + PI);
  o.armNearUp = 0.8; o.armNearLo = 1.5;
  o.armFarUp = 0.6; o.armFarLo = 1.6;
  return o;
});
clip('crawl', 1, true, (t) => {
  const p = t * 5;
  return {
    _lean: 1.35, _hip: -22,
    armNearUp: 2.05 + 0.45 * s(p), armNearLo: -0.35 + 0.3 * s(p),
    armFarUp: 2.0 + 0.45 * s(p + PI), armFarLo: -0.35 + 0.3 * s(p + PI),
    legNearUp: 0.86 + 0.3 * s(p + PI), legNearLo: -0.95,
    legFarUp: 0.8 + 0.3 * s(p), legFarLo: -0.95,
    neck: -0.7, head: -0.5,
  };
});

clip('jump', 0.9, false, (t, u) => {
  const crouch = clamp(1 - u * 4, 0, 1);
  const air = bell(clamp((u - 0.2) / 0.8, 0, 1));
  return {
    _hip: -22 * crouch + 6 * air,
    legNearUp: 0.35 * crouch + 0.5 * air, legNearLo: -1.0 * crouch - 0.7 * air,
    legFarUp: 0.30 * crouch + 0.3 * air, legFarLo: -1.0 * crouch - 0.5 * air,
    armNearUp: -0.6 * crouch + 2.6 * air, armNearLo: 0.4,
    armFarUp: -0.6 * crouch + 2.4 * air, armFarLo: 0.4,
    spine: 0.25 * crouch - 0.1 * air, _lean: 0.2 * crouch,
    footNear: 0.4 * crouch, footFar: 0.4 * crouch,
  };
});

clip('fall', 1, true, (t) => ({
  armNearUp: 2.5 + 0.25 * s(t * 9), armNearLo: 0.6 + 0.2 * s(t * 11),
  armFarUp: 2.4 + 0.25 * s(t * 9 + 1), armFarLo: 0.6 + 0.2 * s(t * 11 + 1),
  legNearUp: 0.45 + 0.2 * s(t * 8), legNearLo: -0.7,
  legFarUp: -0.35 + 0.2 * s(t * 8 + PI), legFarLo: -0.5,
  spine: -0.1, head: -0.25, neck: -0.15, _lean: -0.1,
}));

clip('land', 0.55, false, (t, u) => {
  const b = 1 - clamp(u * 1.6, 0, 1);
  return {
    _hip: -30 * b,
    legNearUp: 0.42 * b, legNearLo: -1.15 * b,
    legFarUp: 0.30 * b, legFarLo: -1.05 * b,
    armNearUp: 1.6 * b, armNearLo: 0.9 * b,
    armFarUp: 1.5 * b, armFarLo: 0.9 * b,
    spine: 0.3 * b, _lean: 0.24 * b, footNear: 0.4 * b, footFar: 0.4 * b,
  };
});

clip('crouch', 1.2, true, (t) => ({
  _hip: -20 + 1.2 * s(t * 1.6),
  legNearUp: 0.6, legNearLo: -1.35, legFarUp: 0.45, legFarLo: -1.25,
  spine: 0.35, _lean: 0.25,
  armNearUp: 0.5, armNearLo: 0.9, armFarUp: 0.4, armFarLo: 0.9,
  footNear: 0.35, footFar: 0.35,
}));

clip('sit', 2.8, true, (t) => ({
  _hip: -38, _lean: 0.05,
  legNearUp: 1.45, legNearLo: -0.55, footNear: 0.3,
  legFarUp: 1.35, legFarLo: -0.5, footFar: 0.3,
  armNearUp: 0.35 + 0.05 * s(t * 1.1), armNearLo: 0.5,
  armFarUp: -0.3, armFarLo: 0.5,
  spine: 0.06 * s(t * 1.1), head: 0.04 * s(t * 0.7),
}));

clip('sitSwing', 2, true, (t) => ({
  _hip: -38,
  legNearUp: 1.45 + 0.25 * s(t * 3), legNearLo: -0.55 + 0.35 * s(t * 3 + 0.6),
  legFarUp: 1.35 + 0.25 * s(t * 3 + PI), legFarLo: -0.5 + 0.35 * s(t * 3 + PI + 0.6),
  armNearUp: 0.3, armNearLo: 0.4, armFarUp: -0.25, armFarLo: 0.4,
  head: 0.1 * s(t * 3), spine: 0.05 * s(t * 3),
}));

clip('lie', 2, true, (t) => ({
  _lean: -1.5, _hip: -52,
  legNearUp: 0.15, legNearLo: -0.1, legFarUp: -0.1, legFarLo: -0.05,
  armNearUp: 0.25, armNearLo: 0.2, armFarUp: -0.2, armFarLo: 0.2,
  head: 0.3, neck: 0.2, spine: 0.05 * s(t * 0.9),
}));

clip('sleep', 4, true, (t) => ({
  _lean: -1.5, _hip: -52,
  legNearUp: 0.35, legNearLo: -0.55, legFarUp: 0.15, legFarLo: -0.35,
  armNearUp: 0.6, armNearLo: 0.9, armFarUp: -0.1, armFarLo: 0.5,
  head: 0.45 + 0.03 * s(t * 0.8), neck: 0.25,
  spine: 0.07 * s(t * 0.8), chest: 0.05 * s(t * 0.8),
}));

clip('wakeUp', 1.8, false, (t, u) => {
  const e = clamp(u * 1.3, 0, 1);
  return {
    _lean: -1.5 * (1 - e), _hip: -52 + 52 * e,
    armNearUp: 0.6 + 2.0 * bell(u), armNearLo: 0.9 - 0.5 * bell(u),
    armFarUp: -0.1 + 1.8 * bell(u), armFarLo: 0.5,
    head: 0.45 * (1 - e) - 0.3 * bell(u),
    legNearUp: 0.35 * (1 - e), legNearLo: -0.55 * (1 - e),
    spine: -0.15 * bell(u),
  };
});

clip('getUp', 1.4, false, (t, u) => {
  const e = clamp(u * 1.25, 0, 1);
  const b = bell(u);
  return {
    _hip: -44 * (1 - e), _lean: 0.55 * (1 - e) + 0.15 * b,
    legNearUp: 1.1 * (1 - e) + 0.3 * b, legNearLo: -1.5 * (1 - e) - 0.3 * b,
    legFarUp: 0.7 * (1 - e), legFarLo: -1.3 * (1 - e),
    armNearUp: 0.9 * (1 - e) + 0.4 * b, armNearLo: 1.1 * (1 - e),
    armFarUp: 0.8 * (1 - e), armFarLo: 1.0 * (1 - e),
    spine: 0.45 * (1 - e), head: -0.2 * b,
  };
});

/* ─────────── 인사 / 감정 표현 ─────────── */

clip('wave', 1.6, false, (t, u) => ({
  armNearUp: 2.55, armNearLo: 0.55 + 0.55 * s(u * TAU * 2.2), handNear: 0.3 * s(u * TAU * 2.2),
  armFarUp: -0.2, armFarLo: 0.35,
  head: -0.1, neck: -0.06, _lean: -0.04, _hip: 1.5 * s(u * TAU * 2.2),
}));

clip('waveBig', 2.2, false, (t, u) => ({
  armNearUp: 2.9 + 0.35 * s(u * TAU * 2.5), armNearLo: 0.2,
  armFarUp: 2.8 + 0.35 * s(u * TAU * 2.5 + PI), armFarLo: 0.2,
  spine: 0.12 * s(u * TAU * 2.5), _lean: 0.1 * s(u * TAU * 2.5),
  head: -0.18, _hip: 3 * Math.abs(s(u * TAU * 2.5)),
  legNearUp: 0.15, legFarUp: -0.15,
}));

clip('salute', 1.5, false, (t, u) => {
  const e = bell(u);
  return {
    armNearUp: 0.16 + 2.2 * e, armNearLo: 0.32 + 1.7 * e, handNear: -0.4 * e,
    armFarUp: -0.14 - 0.1 * e, armFarLo: 0.05 * e,
    spine: -0.06 * e, head: -0.05 * e,
    legNearUp: 0.02, legFarUp: -0.02,
  };
});

clip('bow', 1.6, false, (t, u) => {
  const e = bell(u);
  return {
    _lean: 0.85 * e, spine: 0.25 * e, chest: 0.2 * e,
    neck: -0.35 * e, head: -0.25 * e,
    armNearUp: 0.16 - 0.55 * e, armNearLo: 0.32 + 0.2 * e,
    armFarUp: -0.14 - 0.45 * e, armFarLo: 0.30 + 0.2 * e,
    legNearUp: 0.06 * e, _hip: -4 * e,
  };
});

clip('nod', 1.1, false, (t, u) => ({
  head: 0.4 * s(u * TAU * 2), neck: 0.22 * s(u * TAU * 2),
  chest: 0.06 * s(u * TAU * 2), _hip: 1.5 * s(u * TAU * 2),
}));

clip('shakeHead', 1.2, false, (t, u) => ({
  head: 0.1, neck: 0.05,
  armNearUp: 0.7 * bell(u), armNearLo: 1.1 * bell(u),
  armFarUp: -0.6 * bell(u), armFarLo: 1.0 * bell(u),
  _x: 3 * s(u * TAU * 3),
  spine: 0.08 * s(u * TAU * 3),
}));

clip('shrug', 1.4, false, (t, u) => {
  const e = bell(u);
  return {
    armNearUp: 0.16 + 1.2 * e, armNearLo: 0.32 + 1.0 * e, handNear: 0.5 * e,
    armFarUp: -0.14 - 1.1 * e, armFarLo: 0.30 + 1.0 * e, handFar: -0.5 * e,
    neck: -0.12 * e, head: 0.12 * e, chest: -0.08 * e, _hip: 2 * e,
  };
});

clip('point', 1.3, false, (t, u) => {
  const e = clamp(u * 3, 0, 1) * (1 - clamp((u - 0.75) * 4, 0, 1));
  return {
    armNearUp: 0.16 + 1.35 * e, armNearLo: 0.32 - 0.3 * e, handNear: -0.1 * e,
    chest: 0.05 * e, head: 0.08 * e, _lean: 0.05 * e,
    armFarUp: -0.14 - 0.2 * e,
  };
});

clip('pointDown', 1.3, false, (t, u) => {
  const e = bell(u);
  return {
    armNearUp: 0.16 + 0.9 * e, armNearLo: 0.32 - 0.9 * e,
    _lean: 0.2 * e, spine: 0.12 * e, neck: -0.15 * e, head: -0.2 * e,
    armFarUp: -0.14 - 0.15 * e,
  };
});

clip('think', 2.6, true, (t) => ({
  armNearUp: 1.15, armNearLo: 1.75 + 0.06 * s(t * 2.2), handNear: -0.25,
  armFarUp: -0.55, armFarLo: 1.25,
  head: 0.22 + 0.06 * s(t * 0.9), neck: 0.12,
  _lean: -0.06, _hip: 1.2 * s(t * 1.2),
  legNearUp: 0.12, legFarUp: -0.14,
}));

clip('facepalm', 2, false, (t, u) => {
  const e = clamp(u * 3, 0, 1);
  return {
    armNearUp: 0.16 + 2.35 * e, armNearLo: 0.32 + 1.35 * e, handNear: -0.3 * e,
    neck: 0.28 * e, head: 0.35 * e, spine: 0.16 * e, _lean: 0.14 * e, _hip: -3 * e,
    armFarUp: -0.14 - 0.2 * e,
  };
});

clip('clap', 1.8, true, (t) => {
  const p = s(t * 9);
  return {
    armNearUp: 1.5 + 0.05 * p, armNearLo: 1.15 - 0.35 * p,
    armFarUp: 1.4 - 0.05 * p, armFarLo: 1.15 + 0.35 * p,
    head: -0.05, _hip: 1.2 * Math.abs(p), spine: 0.03 * p,
  };
});

clip('cheer', 2, false, (t, u) => {
  const p = s(u * TAU * 3);
  return {
    armNearUp: 2.95 + 0.15 * p, armNearLo: 0.15,
    armFarUp: 2.85 - 0.15 * p, armFarLo: 0.15,
    head: -0.22, neck: -0.12, spine: -0.1,
    _hip: 6 * Math.abs(p),
    legNearUp: 0.25 * Math.abs(p), legNearLo: -0.5 * Math.abs(p),
    legFarUp: -0.25 * Math.abs(p), legFarLo: -0.5 * Math.abs(p),
  };
});

clip('laugh', 2, true, (t) => {
  const p = s(t * 11);
  return {
    _lean: 0.3 + 0.07 * p, spine: 0.18, chest: 0.1, neck: -0.25, head: -0.3 + 0.05 * p,
    armNearUp: 0.9, armNearLo: 1.6 + 0.1 * p,
    armFarUp: 0.7, armFarLo: 1.5 - 0.1 * p,
    _hip: -3 + 2 * p, legNearUp: 0.2, legNearLo: -0.35,
  };
});

clip('cry', 2.6, true, (t) => {
  const p = s(t * 6);
  return {
    armNearUp: 2.3, armNearLo: 1.5 + 0.08 * p,
    armFarUp: 2.2, armFarLo: 1.5 - 0.08 * p,
    neck: 0.15, head: 0.2, spine: 0.14 + 0.04 * p, _lean: 0.12,
    _hip: -4 + 2 * p, legNearUp: 0.15, legFarUp: -0.15,
  };
});

clip('angry', 2, true, (t) => {
  const p = s(t * 13);
  return {
    armNearUp: 0.85 + 0.05 * p, armNearLo: 1.75, handNear: -0.35,
    armFarUp: 0.75 - 0.05 * p, armFarLo: 1.75, handFar: 0.35,
    _lean: 0.2, spine: 0.12, neck: -0.18, head: -0.12 + 0.03 * p,
    _hip: 1.5 * p, _x: 1.2 * p,
    legNearUp: 0.18, legFarUp: -0.18,
  };
});

clip('scared', 2, true, (t) => {
  const p = s(t * 16);
  return {
    armNearUp: 2.15, armNearLo: 1.5, armFarUp: 2.05, armFarLo: 1.5,
    _lean: -0.28, spine: -0.15, neck: 0.28, head: 0.3,
    _hip: -12 + 1.2 * p, _x: 1.5 * p,
    legNearUp: 0.35, legNearLo: -0.65, legFarUp: 0.05, legFarLo: -0.6,
  };
});

clip('surprise', 1.2, false, (t, u) => {
  const e = bell(u);
  return {
    armNearUp: 0.16 + 2.4 * e, armNearLo: 0.32 + 0.9 * e,
    armFarUp: -0.14 - 2.3 * e, armFarLo: 0.30 + 0.9 * e,
    _lean: -0.22 * e, spine: -0.14 * e, neck: 0.2 * e, head: 0.22 * e,
    _hip: 5 * e,
    legNearUp: 0.3 * e, legNearLo: -0.4 * e, legFarUp: -0.3 * e, legFarLo: -0.4 * e,
  };
});

clip('blowKiss', 1.8, false, (t, u) => {
  const e = clamp(u * 2.5, 0, 1);
  const out = clamp((u - 0.45) * 2.4, 0, 1);
  return {
    armNearUp: 0.16 + 2.3 * e - 0.9 * out, armNearLo: 0.32 + 1.5 * e - 1.5 * out,
    handNear: -0.4 * e + 0.6 * out,
    armFarUp: -0.14 - 0.2 * e, armFarLo: 0.30 + 0.2 * e,
    head: -0.12 * e, _lean: -0.05 * e + 0.1 * out, _hip: 2 * out,
  };
});

clip('heart', 2, false, (t, u) => {
  const e = clamp(u * 3, 0, 1) * (1 - clamp((u - 0.7) * 3.3, 0, 1));
  const beat = 1 + 0.05 * s(u * TAU * 4);
  return {
    armNearUp: 0.16 + 1.75 * e * beat, armNearLo: 0.32 + 1.55 * e,
    armFarUp: -0.14 + 1.85 * e * beat, armFarLo: 0.30 + 1.55 * e,
    head: -0.1 * e, neck: -0.05 * e, _hip: 2 * e * s(u * TAU * 4),
  };
});

clip('flex', 2, false, (t, u) => {
  const e = clamp(u * 3, 0, 1) * (1 - clamp((u - 0.72) * 3.6, 0, 1));
  return {
    armNearUp: 0.16 + 1.45 * e, armNearLo: 0.32 + 2.05 * e, handNear: -0.3 * e,
    armFarUp: -0.14 - 1.45 * e, armFarLo: 0.30 + 2.05 * e, handFar: 0.3 * e,
    chest: -0.1 * e, neck: 0.05 * e, _lean: -0.05 * e, _hip: 1.5 * e,
    legNearUp: 0.2 * e, legFarUp: -0.2 * e,
  };
});

clip('thumbsUp', 1.4, false, (t, u) => {
  const e = clamp(u * 4, 0, 1) * (1 - clamp((u - 0.72) * 3.6, 0, 1));
  return {
    armNearUp: 0.16 + 1.05 * e, armNearLo: 0.32 + 0.95 * e, handNear: -0.9 * e,
    head: -0.08 * e, chest: 0.05 * e, _hip: 1.5 * e,
  };
});

clip('victory', 1.6, false, (t, u) => {
  const e = clamp(u * 3, 0, 1) * (1 - clamp((u - 0.75) * 4, 0, 1));
  return {
    armNearUp: 0.16 + 2.6 * e, armNearLo: 0.32 - 0.1 * e,
    armFarUp: -0.14 - 0.2 * e,
    head: -0.14 * e, _hip: 2 * e, legNearUp: 0.12 * e,
  };
});

clip('stopSign', 1.4, false, (t, u) => {
  const e = clamp(u * 5, 0, 1) * (1 - clamp((u - 0.72) * 3.6, 0, 1));
  return {
    armNearUp: 0.16 + 1.4 * e, armNearLo: 0.32 - 0.35 * e, handNear: -0.5 * e,
    _lean: -0.12 * e, spine: -0.08 * e, head: 0.05 * e,
    legNearUp: -0.1 * e, legFarUp: -0.25 * e, _hip: -2 * e,
  };
});

clip('hide', 2, true, (t) => ({
  armNearUp: 2.35 + 0.03 * s(t * 5), armNearLo: 1.55,
  armFarUp: 2.25, armFarLo: 1.55,
  neck: 0.2, head: 0.25, spine: 0.1, _lean: -0.1, _hip: -10,
  legNearUp: 0.3, legNearLo: -0.5, legFarUp: 0.0, legFarLo: -0.45,
}));

clip('peek', 2.2, false, (t, u) => {
  const e = bell(u);
  return {
    armNearUp: 2.3 - 0.5 * e, armNearLo: 1.5,
    armFarUp: 2.2, armFarLo: 1.5,
    head: 0.2 - 0.3 * e, neck: 0.15 - 0.2 * e, _hip: -10 + 4 * e,
    _lean: -0.08,
  };
});

clip('listen', 2.4, true, (t) => ({
  armNearUp: 2.25, armNearLo: 1.35 + 0.04 * s(t * 2),
  armFarUp: -0.2, armFarLo: 0.35,
  head: -0.28, neck: -0.15, _lean: 0.12, spine: 0.08,
  _hip: 1 * s(t * 1.4),
}));

clip('checkWatch', 1.8, false, (t, u) => {
  const e = bell(u);
  return {
    armNearUp: 0.16 + 1.25 * e, armNearLo: 0.32 + 1.55 * e, handNear: -0.3 * e,
    neck: 0.2 * e, head: 0.25 * e, spine: 0.08 * e,
    armFarUp: -0.14 - 0.1 * e,
  };
});

clip('tantrum', 2.4, true, (t) => {
  const p = s(t * 14);
  return {
    _lean: 0.05 * p, _hip: -6 + 5 * Math.abs(s(t * 7)),
    armNearUp: 2.6 + 0.4 * p, armNearLo: 0.5,
    armFarUp: 2.5 - 0.4 * p, armFarLo: 0.5,
    legNearUp: 0.4 * Math.abs(s(t * 7)), legNearLo: -0.8 * Math.abs(s(t * 7)),
    legFarUp: -0.4 * Math.abs(s(t * 7 + PI)), legFarLo: -0.8 * Math.abs(s(t * 7 + PI)),
    head: -0.2, neck: -0.15,
  };
});

/* ─────────── 놀람 / 피격 / 물리 반응 ─────────── */

clip('dizzy', 2.6, true, (t) => ({
  head: 0.35 * s(t * 3.5), neck: 0.2 * s(t * 3.5 + 0.4),
  spine: 0.12 * s(t * 2.2), chest: 0.1 * s(t * 2.6),
  _lean: 0.16 * s(t * 2.0), _x: 5 * s(t * 2.0), _hip: -4 + 2 * s(t * 3),
  armNearUp: 0.9 + 0.4 * s(t * 3.2), armNearLo: 0.9,
  armFarUp: -0.85 - 0.4 * s(t * 3.2 + 1), armFarLo: 0.9,
  legNearUp: 0.28, legNearLo: -0.5, legFarUp: -0.26, legFarLo: -0.5,
}));

clip('tickled', 2, true, (t) => {
  const p = s(t * 17);
  return {
    _lean: 0.3 + 0.1 * p, spine: 0.2, chest: 0.12,
    armNearUp: 0.6 + 0.15 * p, armNearLo: 2.0,
    armFarUp: 0.5 - 0.15 * p, armFarLo: 2.0,
    neck: -0.2, head: -0.25, _hip: -6 + 3 * p, _x: 1.5 * p,
    legNearUp: 0.3, legNearLo: -0.6, legFarUp: -0.1, legFarLo: -0.5,
  };
});

clip('shiver', 2, true, (t) => {
  const p = s(t * 24);
  return {
    armNearUp: 0.75, armNearLo: 1.85 + 0.04 * p,
    armFarUp: 0.65, armFarLo: 1.85 - 0.04 * p,
    spine: 0.1, neck: 0.15, head: 0.12 + 0.02 * p,
    _hip: -6 + 0.8 * p, _x: 0.8 * p, _lean: 0.02 * p,
    legNearUp: 0.15, legNearLo: -0.3, legFarUp: -0.12, legFarLo: -0.3,
  };
});

clip('fan', 2.2, true, (t) => ({
  armNearUp: 1.9, armNearLo: 1.15 + 0.55 * s(t * 8), handNear: 0.3 * s(t * 8),
  armFarUp: -0.3, armFarLo: 0.4,
  neck: -0.1, head: -0.12, _lean: -0.05, _hip: 1 * s(t * 4),
}));

clip('sneeze', 1.4, false, (t, u) => {
  const back = clamp(u * 2.2, 0, 1) * (1 - clamp((u - 0.45) * 6, 0, 1));
  const fwd = clamp((u - 0.5) * 5, 0, 1) * (1 - clamp((u - 0.8) * 5, 0, 1));
  return {
    _lean: -0.25 * back + 0.55 * fwd,
    neck: 0.3 * back - 0.5 * fwd, head: 0.35 * back - 0.55 * fwd,
    armNearUp: 0.16 + 1.6 * back + 2.0 * fwd, armNearLo: 0.32 + 1.4 * back + 1.5 * fwd,
    armFarUp: -0.14 - 0.2 * back, spine: -0.12 * back + 0.25 * fwd,
    _hip: -3 * fwd,
  };
});

clip('faint', 1.6, false, (t, u) => {
  const e = clamp(u * 1.2, 0, 1);
  return {
    _lean: -1.45 * e, _hip: -52 * e,
    armNearUp: 0.16 + 1.2 * e, armNearLo: 0.32 - 0.2 * e,
    armFarUp: -0.14 - 0.6 * e,
    head: 0.5 * e, neck: 0.3 * e,
    legNearUp: 0.25 * e, legNearLo: -0.3 * e, legFarUp: -0.1 * e,
  };
});

clip('hang', 2.4, true, (t) => ({
  armNearUp: 3.05 + 0.05 * s(t * 1.6), armNearLo: 0.1,
  armFarUp: 3.0 + 0.05 * s(t * 1.6), armFarLo: 0.1,
  spine: 0.02 * s(t * 1.6), neck: 0.05, head: 0.08,
  legNearUp: 0.22 + 0.12 * s(t * 1.6), legNearLo: -0.35 - 0.15 * s(t * 1.6),
  legFarUp: -0.18 + 0.12 * s(t * 1.6 + 0.5), legFarLo: -0.3 - 0.15 * s(t * 1.6 + 0.5),
  _hip: -3,
}));

clip('swim', 1.6, true, (t) => {
  const p = t * 6;
  return {
    _lean: 1.5, _hip: -26,
    armNearUp: -0.9 + 1.9 * s(p), armNearLo: 0.5,
    armFarUp: -0.9 + 1.9 * s(p + PI), armFarLo: 0.5,
    legNearUp: 0.25 * s(p * 2), legNearLo: -0.35,
    legFarUp: 0.25 * s(p * 2 + PI), legFarLo: -0.35,
    neck: -0.55, head: -0.35,
  };
});

clip('roll', 1.2, false, (t, u) => ({
  _spin: TAU * u, _hip: -26,
  spine: 0.5, chest: 0.4, neck: 0.5, head: 0.4,
  armNearUp: 1.4, armNearLo: 2.1, armFarUp: 1.3, armFarLo: 2.1,
  legNearUp: 1.5, legNearLo: -1.8, legFarUp: 1.4, legFarLo: -1.8,
}));

clip('backflip', 1.4, false, (t, u) => {
  const air = s(clamp(u, 0, 1) * PI);
  return {
    _spin: -TAU * clamp((u - 0.12) / 0.76, 0, 1),
    _hip: 70 * air - 14 * (1 - air),
    legNearUp: 1.3 * air, legNearLo: -1.9 * air,
    legFarUp: 1.2 * air, legFarLo: -1.8 * air,
    armNearUp: 2.2 * air, armNearLo: 1.1 * air,
    armFarUp: 2.1 * air, armFarLo: 1.1 * air,
    spine: 0.35 * air,
  };
});

clip('handstand', 2.6, true, (t) => ({
  _spin: PI, _hip: 44 + 1.5 * s(t * 2.2),
  armNearUp: 3.34 + 0.04 * s(t * 2.2), armNearLo: -0.12,
  armFarUp: 2.86 - 0.04 * s(t * 2.2), armFarLo: 0.12,
  legNearUp: 0.12 + 0.07 * s(t * 1.8), legNearLo: -0.15,
  legFarUp: -0.12 - 0.07 * s(t * 1.8), legFarLo: -0.15,
  spine: 0.03 * s(t * 2.2), neck: -0.28, head: -0.45,
}));

clip('spin', 1.2, false, (t, u) => ({
  _spin: TAU * u,
  armNearUp: 1.55, armNearLo: 0.1, armFarUp: -1.55, armFarLo: 0.1,
  legNearUp: 0.35, legNearLo: -0.9, legFarUp: -0.1, legFarLo: -0.2,
  _hip: 6 * bell(u), head: -0.1,
}));

clip('balance', 3, true, (t) => ({
  armNearUp: 1.5 + 0.15 * s(t * 2.4), armNearLo: 0.1,
  armFarUp: -1.5 + 0.15 * s(t * 2.4 + 1), armFarLo: 0.1,
  legNearUp: 0.15 + 0.08 * s(t * 1.7), legNearLo: -0.2,
  legFarUp: -0.75, legFarLo: -0.5,
  _lean: 0.06 * s(t * 2.4), spine: 0.05 * s(t * 2.0), _hip: -2,
}));

/* ─────────── 춤 / 놀이 ─────────── */

clip('dance', 2.4, true, (t) => {
  const p = t * 5.5;
  return {
    _hip: 5 * Math.abs(s(p)), _lean: 0.12 * s(p / 2), _x: 4 * s(p / 2),
    armNearUp: 1.4 + 1.3 * s(p), armNearLo: 0.8 + 0.4 * s(p * 2),
    armFarUp: 1.3 + 1.3 * s(p + PI), armFarLo: 0.8 + 0.4 * s(p * 2 + PI),
    legNearUp: 0.3 * s(p), legNearLo: -0.45 - 0.2 * s(p),
    legFarUp: 0.3 * s(p + PI), legFarLo: -0.45 - 0.2 * s(p + PI),
    head: 0.15 * s(p), neck: 0.1 * s(p), spine: 0.1 * s(p / 2),
  };
});

clip('disco', 2.4, true, (t) => {
  const p = t * 5;
  const up = s(p) > 0;
  return {
    armNearUp: up ? 2.75 : 0.6, armNearLo: up ? 0.2 : 1.5, handNear: -0.3,
    armFarUp: up ? -0.5 : 1.0, armFarLo: 1.2,
    _hip: 4 * Math.abs(s(p * 2)), _lean: 0.1 * s(p),
    legNearUp: 0.2 * s(p * 2), legNearLo: -0.4,
    legFarUp: 0.2 * s(p * 2 + PI), legFarLo: -0.4,
    head: -0.1 * s(p), spine: 0.08 * s(p),
  };
});

clip('robot', 2.6, true, (t) => {
  const step = Math.floor(t * 4) % 4;
  const a = [0, 1, 0, -1][step];
  const b = [1, 0, -1, 0][step];
  return {
    armNearUp: 1.55 + 0.0 * a, armNearLo: 1.5 + 0.4 * a,
    armFarUp: 1.5 * b + 0.2, armFarLo: 1.4,
    _lean: 0.06 * a, head: 0.15 * b, neck: 0.08 * b,
    _hip: -2 + 3 * (step % 2), legNearUp: 0.12 * b, legNearLo: -0.25,
    legFarUp: -0.12 * b, legFarLo: -0.25,
  };
});

clip('twist', 2.4, true, (t) => {
  const p = t * 6;
  return {
    _lean: 0.16 * s(p), _x: 5 * s(p),
    _hip: -8 + 3 * Math.abs(s(p * 2)),
    armNearUp: 1.35 + 0.5 * s(p), armNearLo: 1.15,
    armFarUp: -1.25 + 0.5 * s(p), armFarLo: 1.15,
    legNearUp: 0.28, legNearLo: -0.7, legFarUp: -0.24, legFarLo: -0.7,
    head: -0.12 * s(p), spine: 0.1 * s(p),
  };
});

clip('moonwalk', 2.4, true, (t) => {
  const p = t * 5;
  return {
    _lean: -0.12,
    legNearUp: 0.45 * s(p), legNearLo: -0.5 - 0.4 * clamp(s(p), 0, 1),
    footNear: 0.6 * clamp(-s(p), 0, 1),
    legFarUp: 0.45 * s(p + PI), legFarLo: -0.5 - 0.4 * clamp(s(p + PI), 0, 1),
    footFar: 0.6 * clamp(-s(p + PI), 0, 1),
    armNearUp: 0.9, armNearLo: 0.9, armFarUp: 0.8, armFarLo: 0.9,
    _hip: -4 + 2 * c(2 * p), head: 0.05 * s(p),
  };
});

clip('floss', 2, true, (t) => {
  const p = t * 7;
  return {
    _x: 4 * s(p), _lean: 0.12 * s(p), _hip: 2 * Math.abs(s(p)),
    armNearUp: 0.5 + 0.9 * s(p), armNearLo: 0.7,
    armFarUp: -0.4 + 0.9 * s(p), armFarLo: 0.7,
    legNearUp: 0.12, legFarUp: -0.12,
    head: -0.06 * s(p), spine: 0.08 * s(p),
  };
});

clip('headbang', 2, true, (t) => {
  const p = t * 8;
  return {
    neck: 0.4 * s(p) - 0.1, head: 0.45 * s(p) - 0.1,
    spine: 0.15 * s(p), _lean: 0.16 + 0.1 * s(p),
    armNearUp: 1.9, armNearLo: 1.5, armFarUp: 1.8, armFarLo: 1.5,
    legNearUp: 0.2, legNearLo: -0.4, legFarUp: -0.2, legFarLo: -0.4,
    _hip: -5 + 2 * s(p),
  };
});

clip('wiggle', 1.8, true, (t) => {
  const p = t * 9;
  return {
    _x: 3 * s(p), _lean: 0.1 * s(p), spine: 0.12 * s(p), chest: 0.1 * s(p + 0.5),
    neck: 0.1 * s(p + 1), head: 0.1 * s(p + 1.5),
    armNearUp: 0.16 + 0.3 * s(p + 1), armFarUp: -0.14 + 0.3 * s(p + 1),
    _hip: 1.5 * Math.abs(s(p)),
  };
});

clip('sway', 3, true, (t) => ({
  _x: 5 * s(t * 1.8), _lean: 0.1 * s(t * 1.8),
  armNearUp: 0.4 + 0.35 * s(t * 1.8), armNearLo: 0.5,
  armFarUp: -0.35 + 0.35 * s(t * 1.8), armFarLo: 0.5,
  head: 0.12 * s(t * 1.8 + 0.6), spine: 0.06 * s(t * 1.8),
  _hip: 1.5 * s(t * 3.6),
}));

/* ─────────── 운동 / 액션 ─────────── */

clip('stretch', 2.4, false, (t, u) => {
  const e = bell(u);
  return {
    armNearUp: 0.16 + 2.85 * e, armNearLo: 0.32 - 0.25 * e,
    armFarUp: -0.14 + 2.9 * e, armFarLo: 0.30 - 0.25 * e,
    spine: -0.16 * e, chest: -0.1 * e, neck: -0.1 * e, head: -0.15 * e,
    _lean: -0.14 * e, _hip: 5 * e,
    legNearUp: 0.05, footNear: -0.3 * e, footFar: -0.3 * e,
  };
});

clip('yawn', 2.4, false, (t, u) => {
  const e = bell(u);
  return {
    armNearUp: 0.16 + 2.4 * e, armNearLo: 0.32 + 1.1 * e,
    armFarUp: -0.14 - 1.9 * e, armFarLo: 0.30 + 0.5 * e,
    neck: -0.28 * e, head: -0.32 * e, spine: -0.12 * e, _lean: -0.12 * e, _hip: 3 * e,
  };
});

clip('pushup', 1.6, true, (t) => {
  const p = 0.5 + 0.5 * s(t * 4);   // 1 = 팔 편 상태
  return {
    _lean: 1.35, _hip: -20 - 8 * (1 - p),
    armNearUp: 1.52 - 0.25 * (1 - p), armNearLo: 0.05 + 1.15 * (1 - p),
    armFarUp: 1.46 - 0.25 * (1 - p), armFarLo: 0.05 + 1.15 * (1 - p),
    legNearUp: 0.52, legNearLo: -0.06, legFarUp: 0.46, legFarLo: -0.06,
    footNear: -0.5, footFar: -0.5,
    neck: -0.55, head: -0.4, spine: -0.05,
  };
});

clip('situp', 1.8, true, (t) => {
  const p = 0.5 + 0.5 * s(t * 3.4);
  return {
    _lean: -1.5 + 0.85 * p, _hip: -44,
    legNearUp: 0.85, legNearLo: -2.3, footNear: 0.3,
    legFarUp: 0.75, legFarLo: -2.2, footFar: 0.3,
    armNearUp: 2.3, armNearLo: 1.6, armFarUp: 2.2, armFarLo: 1.6,
    neck: 0.2 - 0.35 * p, head: 0.25 - 0.4 * p, spine: 0.2 * p,
  };
});

clip('squat', 1.8, true, (t) => {
  const p = 0.5 + 0.5 * s(t * 3.4);
  return {
    _hip: -24 * p,
    legNearUp: 0.7 * p, legNearLo: -1.5 * p, footNear: 0.42 * p,
    legFarUp: 0.6 * p, legFarLo: -1.4 * p, footFar: 0.42 * p,
    armNearUp: 0.16 + 1.35 * p, armNearLo: 0.32 - 0.25 * p,
    armFarUp: -0.14 + 1.5 * p, armFarLo: 0.30 - 0.25 * p,
    _lean: 0.3 * p, spine: 0.15 * p, neck: -0.15 * p, head: -0.15 * p,
  };
});

clip('jumpingJack', 1.4, true, (t) => {
  const p = 0.5 + 0.5 * s(t * 7);
  return {
    _hip: 6 * p,
    armNearUp: 0.16 + 2.8 * p, armNearLo: 0.32 - 0.2 * p,
    armFarUp: -0.14 - 2.8 * p, armFarLo: 0.30 - 0.2 * p,
    legNearUp: 0.1 + 0.35 * p, legNearLo: -0.15,
    legFarUp: -0.1 - 0.35 * p, legFarLo: -0.15,
    head: -0.05 * p,
  };
});

clip('kick', 1.1, false, (t, u) => {
  const e = bell(u);
  const wind = clamp(u * 3, 0, 1) * (1 - clamp((u - 0.3) * 4, 0, 1));
  return {
    legNearUp: 0.1 - 0.5 * wind + 1.75 * e, legNearLo: -0.15 - 0.7 * wind + 0.55 * e,
    footNear: 0.4 * e,
    legFarUp: -0.1 - 0.15 * e, legFarLo: -0.15 - 0.25 * e,
    armNearUp: 0.16 - 0.8 * e, armNearLo: 0.32 + 0.5 * e,
    armFarUp: -0.14 + 1.3 * e, armFarLo: 0.30 + 0.6 * e,
    _lean: -0.32 * e, spine: -0.14 * e, _hip: -3 * e,
  };
});

clip('punch', 0.9, false, (t, u) => {
  const wind = clamp(u * 4, 0, 1) * (1 - clamp((u - 0.25) * 5, 0, 1));
  const hit = clamp((u - 0.28) * 6, 0, 1) * (1 - clamp((u - 0.6) * 3, 0, 1));
  return {
    armNearUp: 0.16 + 0.9 * wind + 1.35 * hit, armNearLo: 0.32 + 1.9 * wind - 1.7 * hit,
    armFarUp: -0.14 + 1.0 * wind + 0.6 * hit, armFarLo: 0.30 + 1.6 * wind + 0.5 * hit,
    _lean: -0.12 * wind + 0.22 * hit, spine: 0.12 * hit, chest: 0.1 * hit,
    legNearUp: 0.1 + 0.25 * hit, legNearLo: -0.11 - 0.35 * hit,
    legFarUp: -0.1 - 0.2 * hit, _hip: -3 * hit,
  };
});

clip('block', 1.2, false, (t, u) => {
  const e = clamp(u * 5, 0, 1) * (1 - clamp((u - 0.65) * 3, 0, 1));
  return {
    armNearUp: 0.16 + 2.05 * e, armNearLo: 0.32 + 1.35 * e,
    armFarUp: -0.14 + 2.1 * e, armFarLo: 0.30 + 1.35 * e,
    _lean: -0.2 * e, neck: 0.18 * e, head: 0.2 * e, spine: -0.1 * e,
    _hip: -8 * e, legNearUp: 0.25 * e, legNearLo: -0.45 * e,
    legFarUp: -0.05 * e, legFarLo: -0.4 * e,
  };
});

clip('push', 2, true, (t) => ({
  armNearUp: 1.45 + 0.04 * s(t * 3), armNearLo: 0.15,
  armFarUp: 1.4 + 0.04 * s(t * 3), armFarLo: 0.15,
  _lean: 0.42, spine: 0.15, neck: -0.35, head: -0.3,
  legNearUp: -0.35, legNearLo: -0.15, footNear: 0.35,
  legFarUp: 0.35, legFarLo: -0.55,
  _hip: -8 + 1 * s(t * 3),
}));

clip('pull', 2, true, (t) => {
  const p = 0.5 + 0.5 * s(t * 3);
  return {
    armNearUp: 1.6, armNearLo: 0.2 + 1.2 * p,
    armFarUp: 1.5, armFarLo: 0.2 + 1.2 * p,
    _lean: -0.35 - 0.12 * p, spine: -0.12, neck: 0.15, head: 0.12,
    legNearUp: 0.55, legNearLo: -0.75, legFarUp: -0.25, legFarLo: -0.35,
    _hip: -12,
  };
});

clip('lean', 2.6, true, (t) => ({
  _lean: -0.2, _x: 6,
  armNearUp: 0.16 + 0.2 * s(t * 1.2), armNearLo: 0.32,
  armFarUp: -1.65, armFarLo: 0.15,
  legNearUp: 0.28, legNearLo: -0.3, legFarUp: 0.05, legFarLo: -0.2,
  head: 0.1, _hip: -3 + 1 * s(t * 1.2),
}));

clip('kneel', 2.4, true, (t) => ({
  _hip: -24, _lean: 0.08,
  legNearUp: 0.85, legNearLo: -1.6, footNear: 0.5,
  legFarUp: -0.55, legFarLo: -1.75, footFar: 0.6,
  armNearUp: 0.35, armNearLo: 0.55,
  armFarUp: -0.25, armFarLo: 0.5,
  spine: 0.05 * s(t * 1.1), head: 0.05 * s(t * 0.8),
}));

clip('meditate', 4, true, (t) => ({
  _hip: -42, _lean: 0.0,
  legNearUp: 1.55, legNearLo: -2.35, footNear: 0.6,
  legFarUp: 1.45, legFarLo: -2.3, footFar: 0.6,
  armNearUp: 0.95, armNearLo: 1.15, armFarUp: -0.85, armFarLo: 1.15,
  spine: 0.03 * s(t * 0.7), chest: 0.03 * s(t * 0.7), neck: 0.02, head: 0.03 * s(t * 0.7),
}));

clip('type', 2.4, true, (t) => ({
  _hip: -26,
  legNearUp: 1.2, legNearLo: -1.1, legFarUp: 1.1, legFarLo: -1.05,
  armNearUp: 1.15, armNearLo: 0.75 + 0.12 * s(t * 16), handNear: 0.15 * s(t * 19),
  armFarUp: 1.05, armFarLo: 0.75 + 0.12 * s(t * 16 + 1.7), handFar: 0.15 * s(t * 21),
  _lean: 0.22, spine: 0.1, neck: -0.2, head: -0.15,
}));

clip('draw', 2.6, true, (t) => ({
  armNearUp: 1.25 + 0.12 * s(t * 3.2), armNearLo: 0.85 + 0.18 * s(t * 4.3),
  handNear: 0.1 * s(t * 5),
  armFarUp: -0.35, armFarLo: 0.5,
  _lean: 0.22, spine: 0.12, neck: -0.25, head: -0.28, _hip: -5,
  legNearUp: 0.16, legFarUp: -0.16,
}));

clip('tiptoe', 2.4, true, (t) => ({
  _hip: 8 + 1.5 * s(t * 2),
  footNear: -0.85, footFar: -0.85,
  legNearUp: 0.08, legNearLo: -0.05, legFarUp: -0.08, legFarLo: -0.05,
  armNearUp: 0.16 + 1.4, armNearLo: 0.3, armFarUp: -0.14 + 1.3, armFarLo: 0.3,
  spine: -0.06, neck: -0.08, head: -0.1,
}));

export function poseAt(name, t, u) {
  const fn = CLIPS[name] || CLIPS.idle;
  const delta = fn(t, u ?? 0) || {};
  const out = {};
  for (const k in STAND) out[k] = STAND[k];
  for (const k in delta) out[k] = (k in STAND ? (k.startsWith('_') ? delta[k] : delta[k]) : delta[k]);
  return out;
}

export const CLIP_NAMES = Object.keys(CLIPS);
