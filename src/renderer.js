// 업로드된 이미지의 캐릭터를 그대로 재현하는 렌더러.
// 굵고 둥근 주황색 선, 속이 빈 원형 머리, 원근을 위한 반대편 팔다리의 짙은 색.
import { HEAD_RADIUS } from './skeleton.js';
import { TAU } from './math.js';

export const SKIN = {
  main: '#F2760C',
  far: '#C85B06',
  glow: 'rgba(242,118,12,0.25)',
};

function line(ctx, pts, w, color) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

export function drawShadow(ctx, x, groundY, scale, height) {
  const t = Math.max(0, 1 - height / (220 * scale));
  if (t <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = 0.16 * t;
  ctx.fillStyle = '#2A2118';
  ctx.beginPath();
  ctx.ellipse(x, groundY + 2, 30 * scale * (0.55 + 0.45 * t), 6 * scale * (0.5 + 0.5 * t), 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawFigure(ctx, P, scale = 1, opts = {}) {
  const limb = 13 * scale;
  const torso = 15.5 * scale;
  const headW = 15 * scale;
  const R = HEAD_RADIUS * scale;
  const far = opts.flat ? SKIN.main : SKIN.far;

  ctx.save();
  if (opts.glow) {
    ctx.shadowColor = SKIN.glow;
    ctx.shadowBlur = 18 * scale;
  }

  // 반대편(먼 쪽) 팔다리 — 살짝 어둡게 해서 입체감
  line(ctx, [P.pelvis, P.kneeFar, P.ankleFar, P.toeFar], limb * 0.94, far);
  line(ctx, [P.chest, P.elbowFar, P.wristFar, P.handFar], limb * 0.9, far);

  // 몸통
  line(ctx, [P.pelvis, P.chestBase, P.chest, P.neck], torso, SKIN.main);

  // 머리 (속이 빈 원)
  ctx.beginPath();
  ctx.arc(P.head.x, P.head.y, R, 0, TAU);
  ctx.lineWidth = headW;
  ctx.strokeStyle = SKIN.main;
  ctx.stroke();

  // 가까운 쪽 팔다리
  line(ctx, [P.pelvis, P.kneeNear, P.ankleNear, P.toeNear], limb, SKIN.main);
  line(ctx, [P.chest, P.elbowNear, P.wristNear, P.handNear], limb, SKIN.main);

  ctx.restore();

  if (opts.face) drawFace(ctx, P, scale, opts.facing ?? 1, opts.mood ?? 'neutral');
}

function drawFace(ctx, P, scale, facing, mood) {
  const R = HEAD_RADIUS * scale;
  const ex = P.head.x + facing * R * 0.36;
  const ey = P.head.y - R * 0.12;
  const gap = R * 0.42;
  ctx.save();
  ctx.fillStyle = '#3A2A18';
  ctx.strokeStyle = '#3A2A18';
  ctx.lineWidth = 2.4 * scale;
  ctx.lineCap = 'round';
  const eye = (x) => {
    ctx.beginPath();
    if (mood === 'sleep') {
      ctx.moveTo(x - 3.4 * scale, ey);
      ctx.quadraticCurveTo(x, ey + 3.4 * scale, x + 3.4 * scale, ey);
      ctx.stroke();
    } else if (mood === 'happy') {
      ctx.moveTo(x - 3.4 * scale, ey + 1.5 * scale);
      ctx.quadraticCurveTo(x, ey - 3.4 * scale, x + 3.4 * scale, ey + 1.5 * scale);
      ctx.stroke();
    } else {
      ctx.arc(x, ey, 2.6 * scale, 0, TAU);
      ctx.fill();
    }
  };
  eye(ex - gap * 0.5);
  eye(ex + gap * 0.5);
  ctx.restore();
}

// 감정 이펙트(별, 물음표, 하트, 땀, zzz …)
export function drawEmote(ctx, x, y, glyph, alpha, scale = 1, color = '#F2760C') {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.font = `700 ${22 * scale}px ui-rounded, "Jua", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, x, y);
  ctx.restore();
}
