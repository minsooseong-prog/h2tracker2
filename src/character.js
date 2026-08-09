// 졸라맨 본체.
// 뼈대(스프링) + 절차적 클립 + 래그돌 물리 + 상태머신을 한데 묶는다.
import { Skeleton, HIP_HEIGHT, HEAD_RADIUS } from './skeleton.js';
import { poseAt, META, CLIPS } from './poses.js';
import { Ragdoll } from './ragdoll.js';
import { drawFigure, drawShadow, drawEmote } from './renderer.js';
import { clamp, lerp, Spring, distToSegment, PI, rand, pick } from './math.js';

const GRAVITY = 2100;

export class Character {
  constructor(world) {
    this.world = world;
    this.sk = new Skeleton();
    this.scale = 0.92;
    this.x = 200;
    this.y = 0;
    this.vy = 0;
    this.vx = 0;
    this.facing = 1;
    this.facingLerp = 1;
    this.state = 'ground'; // ground | air | held | ragdoll | recover
    this.grounded = true;
    this.surface = 0;

    this.action = null;      // {name,t,dur,loop,lock}
    this.locomotion = 'idle';
    this.speed = 0;
    this.goal = null;        // 목표 x
    this.runMode = false;

    this.ySpring = new Spring(0, 420, 1);
    this.leanSpring = new Spring(0, 120, 1);
    this.xOffSpring = new Spring(0, 200, 1);
    this.facingSpring = new Spring(1, 300, 1);

    this.ragdoll = null;
    this.restTimer = 0;

    this.bubble = null;      // {text, life}
    this.emotes = [];
    this.lookAt = null;      // {x,y}
    this.lookWeight = 1;
    this.mood = 'neutral';
    this.settings = world.settings;

    this.stats = { steps: 0, jumps: 0, falls: 0 };
    this.snapToSurface();
  }

  /* ── 기본 정보 ── */
  get hipHeight() { return HIP_HEIGHT * this.scale; }
  get headPos() { return this.sk.pts.head; }
  get points() { return this.sk.pts; }

  surfaceAt(x, feetY) {
    let best = this.world.ground;
    for (const p of this.world.platforms) {
      if (x > p.x1 - 6 && x < p.x2 + 6 && p.y <= feetY + 6 && p.y < best) best = p.y;
    }
    return best;
  }

  snapToSurface() {
    this.surface = this.surfaceAt(this.x, this.world.ground);
    this.y = this.surface - this.hipHeight;
    this.ySpring.set(this.y);
  }

  /* ── 행동 재생 ── */
  play(name, opts = {}) {
    if (!CLIPS[name]) name = 'idle';
    const meta = META[name] || { dur: 1.2, loop: false };
    this.action = {
      name,
      t: 0,
      dur: opts.dur ?? meta.dur * (opts.repeat ?? 1),
      loop: opts.hold ?? false,
      lock: opts.lock ?? true,
      then: opts.then || null,
    };
    if (opts.say) this.say(opts.say);
    if (opts.emote) this.emote(opts.emote);
    if (opts.mood) this.mood = opts.mood;
    return this;
  }

  stopAction() { this.action = null; }

  say(text, dur) {
    if (!text) return;
    this.bubble = { text, life: dur ?? clamp(1.6 + text.length * 0.08, 1.8, 5.5) };
  }

  emote(glyph, color) {
    this.emotes.push({
      glyph, color: color || '#F2760C',
      x: rand(14, -14), y: 0, life: 1.1, vy: rand(-52, -34), t: 0,
    });
  }

  /* ── 이동 ── */
  walkTo(x, run = false) {
    this.goal = clamp(x, 30, this.world.width - 30);
    this.runMode = run;
  }
  stop() { this.goal = null; this.vx = 0; }

  jump(power = 720, dx = 0) {
    if (this.state !== 'ground' || !this.grounded) return false;
    this.vy = -power;
    this.vx = dx;
    this.grounded = false;
    this.state = 'air';
    this.stats.jumps++;
    this.play('jump', { lock: true });
    return true;
  }

  faceTo(x) { this.facing = x < this.x ? -1 : 1; }

  /* ── 잡기 / 던지기 ── */
  hitTest(px, py) {
    const P = this.sk.pts;
    const s = this.scale;
    const R = HEAD_RADIUS * s + 8;
    if (Math.hypot(px - P.head.x, py - P.head.y) < R) return { part: 'head', point: 'head' };
    const seg = (a, b, w) => distToSegment(px, py, a.x, a.y, b.x, b.y) < w;
    const w = 16 * s;
    if (seg(P.chest, P.elbowNear, w)) return { part: 'armNear', point: 'elbowNear' };
    if (seg(P.elbowNear, P.wristNear, w)) return { part: 'handNear', point: 'wristNear' };
    if (seg(P.wristNear, P.handNear, w)) return { part: 'handNear', point: 'handNear' };
    if (seg(P.chest, P.elbowFar, w)) return { part: 'armFar', point: 'elbowFar' };
    if (seg(P.elbowFar, P.wristFar, w)) return { part: 'armFar', point: 'wristFar' };
    if (seg(P.wristFar, P.handFar, w)) return { part: 'handFar', point: 'handFar' };
    if (seg(P.pelvis, P.chestBase, w + 3) || seg(P.chestBase, P.chest, w + 3) || seg(P.chest, P.neck, w))
      return { part: 'torso', point: 'chest' };
    if (seg(P.pelvis, P.kneeNear, w)) return { part: 'legNear', point: 'kneeNear' };
    if (seg(P.kneeNear, P.ankleNear, w)) return { part: 'legNear', point: 'ankleNear' };
    if (seg(P.ankleNear, P.toeNear, w)) return { part: 'footNear', point: 'toeNear' };
    if (seg(P.pelvis, P.kneeFar, w)) return { part: 'legFar', point: 'kneeFar' };
    if (seg(P.kneeFar, P.ankleFar, w)) return { part: 'legFar', point: 'ankleFar' };
    if (seg(P.ankleFar, P.toeFar, w)) return { part: 'footFar', point: 'toeFar' };
    return null;
  }

  grab(pointName, x, y) {
    this.sk.solve();
    this.ragdoll = new Ragdoll(this.sk.pts, this.world.gravity ?? 1800);
    this.ragdoll.grab(pointName, x, y);
    this.state = 'held';
    this.action = null;
    this.goal = null;
  }

  dragTo(x, y) { if (this.ragdoll) this.ragdoll.moveGrab(x, y); }

  release() {
    if (!this.ragdoll) return;
    this.ragdoll.release();
    this.state = 'ragdoll';
    this.restTimer = 0;
    this.stats.falls++;
  }

  knockOut(vx, vy) {
    this.sk.solve();
    this.ragdoll = new Ragdoll(this.sk.pts, this.world.gravity ?? 1800);
    this.ragdoll.seedVelocity(vx, vy);
    this.state = 'ragdoll';
    this.restTimer = 0;
    this.action = null;
    this.goal = null;
  }

  /* ── 매 프레임 ── */
  update(dt) {
    const st = this.settings;
    const speedMul = st ? st.speed : 1;
    dt = clamp(dt, 0, 1 / 30);

    // 말풍선 수명
    if (this.bubble) {
      this.bubble.life -= dt;
      if (this.bubble.life <= 0) this.bubble = null;
    }
    for (const e of this.emotes) {
      e.t += dt; e.life -= dt; e.y += e.vy * dt; e.vy += 30 * dt;
    }
    this.emotes = this.emotes.filter((e) => e.life > 0);

    if (this.state === 'held' || this.state === 'ragdoll') {
      this.updatePhysicsDoll(dt);
      return;
    }

    // 액션 진행
    let anim = this.locomotion;
    let u = 0;
    if (this.action) {
      this.action.t += dt * speedMul;
      if (this.action.t >= this.action.dur) {
        const then = this.action.then;
        this.action = null;
        this.mood = 'neutral';
        if (then) then();
      } else {
        anim = this.action.name;
        u = this.action.loop ? 0 : clamp(this.action.t / this.action.dur, 0, 1);
      }
    }

    const locked = !!(this.action && this.action.lock);

    // 걷기/뛰기 이동
    if (!locked && this.state === 'ground') {
      if (this.goal != null) {
        const dx = this.goal - this.x;
        if (Math.abs(dx) < 6) {
          this.goal = null; this.vx = 0; this.locomotion = 'idle';
        } else {
          const base = this.runMode ? 240 : 96;
          this.vx = Math.sign(dx) * base * speedMul * this.scale;
          this.facing = Math.sign(dx);
          this.locomotion = this.runMode ? 'run' : 'walk';
        }
      } else if (!this.action) {
        this.vx *= 0.82;
        this.locomotion = 'idle';
      }
    } else if (locked) {
      this.vx *= 0.9;
    }

    this.x += this.vx * dt;
    this.x = clamp(this.x, 24, this.world.width - 24);
    if (Math.abs(this.vx) > 5) this.stats.steps += Math.abs(this.vx) * dt * 0.02;

    // 수직 물리
    const feetY = this.y + this.hipHeight;
    if (this.state === 'air') {
      const prevFeet = feetY;
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      const nextFeet = this.y + this.hipHeight;
      let landed = null;
      const cands = [{ y: this.world.ground, x1: -1e9, x2: 1e9 }, ...this.world.platforms];
      for (const p of cands) {
        if (this.x > p.x1 - 4 && this.x < p.x2 + 4 &&
            prevFeet <= p.y + 2 && nextFeet >= p.y && this.vy > 0) {
          if (!landed || p.y < landed.y) landed = p;
        }
      }
      if (landed) {
        this.surface = landed.y;
        this.y = landed.y - this.hipHeight;
        this.ySpring.set(this.y);
        const impact = this.vy;
        this.vy = 0;
        this.grounded = true;
        this.state = 'ground';
        this.onLand?.(impact, landed.y !== this.world.ground);
        if (!this.action || this.action.name === 'jump' || this.action.name === 'fall') {
          this.play('land', { lock: true });
        }
      } else if (this.action && this.action.name === 'jump' && this.vy > 90) {
        this.play('fall', { hold: true, dur: 99, lock: true });
      }
    } else {
      // 지면 지지 확인 (플랫폼 밖으로 걸어 나가면 낙하)
      const s = this.surfaceAt(this.x, this.y + this.hipHeight + 4);
      if (Math.abs(s - this.surface) > 2 && s > this.surface) {
        this.surface = s;
        this.grounded = false;
        this.state = 'air';
        this.vy = 20;
        this.play('fall', { hold: true, dur: 99, lock: true });
        this.onFallOff?.();
      } else {
        this.surface = s;
      }
    }

    // 포즈 계산
    const clipT = this.action ? this.action.t : (this.tLoop = (this.tLoop || 0) + dt * speedMul);
    const pose = poseAt(anim, clipT, u);

    // 부가 레이어: 커서 바라보기
    if (this.lookAt && !locked && this.lookWeight > 0) {
      const h = this.sk.pts.head;
      const dx = (this.lookAt.x - h.x) * this.facing;
      const dy = this.lookAt.y - h.y;
      const tilt = clamp(Math.atan2(dx, -dy - 40), -1.1, 1.1);
      pose.head += tilt * 0.30 * this.lookWeight;
      pose.neck += tilt * 0.14 * this.lookWeight;
      pose.chest += tilt * 0.05 * this.lookWeight;
    }

    // 호흡(항상 살아있게)
    const bt = performance.now() / 1000;
    pose.chest += 0.018 * Math.sin(bt * 1.5);
    pose.spine += 0.012 * Math.sin(bt * 1.5 + 0.5);

    this.sk.update(dt, pose, st ? st.smooth : 1);
    this.sk.scale = this.scale;

    // 루트(골반) 위치·기울기
    // 포즈에서는 "앞으로 숙임 = 양수"로 쓰고, 실제 루트 각도는 부호가 반대다
    const targetLean = -((pose._lean || 0) + (pose._spin || 0));
    this.sk.root.angle = this.sk.rootAngleSpring.updateAngle(dt, targetLean);
    const hipOff = (pose._hip || 0) * this.scale;
    const xOff = this.xOffSpring.update(dt, (pose._x || 0) * this.scale) * this.facingLerp;
    if (this.state === 'ground') {
      const desired = this.surface - this.hipHeight - hipOff;
      this.y = this.ySpring.update(dt, desired);
    }
    this.facingLerp = this.facingSpring.update(dt, this.facing);
    this.sk.facing = clamp(this.facingLerp, -1, 1);
    this.sk.root.x = this.x + xOff;
    this.sk.root.y = this.y;
    this.sk.solve();
  }

  updatePhysicsDoll(dt) {
    const bounds = {
      left: 16, right: this.world.width - 16,
      ground: this.world.ground, platforms: this.world.platforms,
    };
    this.ragdoll.gravity = this.world.gravity ?? 1800;
    this.ragdoll.step(dt, bounds);
    const P = this.ragdoll.points();
    for (const k in P) this.sk.pts[k] = P[k];
    this.x = P.pelvis.x;
    this.y = P.pelvis.y;

    if (this.state === 'ragdoll') {
      const near = this.ragdoll.points().pelvis.y > this.world.ground - 200;
      if (this.ragdoll.energy < 0.45 && near) this.restTimer += dt;
      else this.restTimer = 0;
      if (this.restTimer > 0.45) this.recover();
    }
  }

  recover() {
    const pts = this.ragdoll.points();
    this.sk.facing = this.facingLerp = this.facing;
    this.sk.adoptFromPoints(pts);
    this.ragdoll = null;
    this.state = 'ground';
    this.grounded = true;
    this.vy = 0; this.vx = 0;
    this.surface = this.surfaceAt(this.x, this.world.ground);
    this.y = pts.pelvis.y;
    this.ySpring.set(this.y);
    this.x = clamp(pts.pelvis.x, 30, this.world.width - 30);
    this.play('getUp', { lock: true, then: () => this.onRecovered?.() });
    this.onRecoverStart?.();
  }

  /* ── 그리기 ── */
  draw(ctx) {
    const P = this.sk.pts;
    const st = this.settings;
    if (!st || st.shadow) {
      const feet = Math.max(P.toeNear.y, P.toeFar.y);
      drawShadow(ctx, (P.toeNear.x + P.toeFar.x) / 2, this.surface, this.scale, this.surface - feet);
    }
    drawFigure(ctx, P, this.scale, {
      glow: st ? st.glow : false,
      face: st ? st.face : false,
      facing: Math.sign(this.facingLerp) || 1,
      mood: this.mood,
    });
    for (const e of this.emotes) {
      drawEmote(ctx, P.head.x + e.x, P.head.y - 38 * this.scale + e.y,
        e.glyph, clamp(e.life, 0, 1), this.scale, e.color);
    }
  }
}
