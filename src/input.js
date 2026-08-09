// 마우스/터치/키보드 입력을 "상호작용 이벤트"로 해석한다.
// 클릭·드래그뿐 아니라 쓰다듬기, 간지럽히기, 원 그리기, 흔들기 등 미세 제스처까지 인식.
import { clamp, TAU } from './math.js';

export class Input {
  constructor(char, fire) {
    this.c = char;
    this.fire = (ev, cd = 1.2, data) => {
      const now = performance.now() / 1000;
      const last = this.cool.get(ev) || -99;
      if (now - last < cd) return false;
      this.cool.set(ev, now);
      fire(ev, data);
      return true;
    };
    this.cool = new Map();
    this.p = { x: -999, y: -999, sx: 0, sy: 0, speed: 0, inside: false };
    this.hist = [];
    this.clicks = [];
    this.press = null;
    this.hoverPart = null;
    this.hoverTime = 0;
    this.partTime = 0;
    this.idleTime = 0;
    this.awayTime = 0;
    this.stillTime = 0;
    this.slowTime = 0;
    this.aboveTime = 0;
    this.reversals = [];
    this.lastVX = 0;
    this.angleAcc = 0;
    this.dragAngleAcc = 0;
    this.lastAngle = null;
    this.lastDragDir = null;
    this.drag = null;
    this.keys = new Set();
    this.leftAt = 0;
    this.bind();
  }

  bind() {
    const opts = { passive: false, capture: true };
    window.addEventListener('pointerdown', (e) => this.onDown(e), opts);
    window.addEventListener('pointermove', (e) => this.onMove(e), { passive: true });
    window.addEventListener('pointerup', (e) => this.onUp(e), opts);
    window.addEventListener('pointercancel', () => this.endDrag(0, 0));
    window.addEventListener('contextmenu', (e) => {
      if (this.c.hitTest(e.clientX, e.clientY)) { e.preventDefault(); this.fire('rightclick', 2); }
      else if (this.near(160)) this.fire('rightclick', 4);
    }, true);
    window.addEventListener('wheel', (e) => this.onWheel(e), { passive: true });
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    document.documentElement.addEventListener('pointerleave', () => {
      this.p.inside = false;
      this.leftAt = performance.now() / 1000;
      this.fire('cursor.leave', 8);
    });
    document.documentElement.addEventListener('pointerenter', () => {
      this.p.inside = true;
      if (performance.now() / 1000 - this.leftAt > 4) this.fire('cursor.return', 8);
    });
  }

  near(r = 140) {
    const h = this.c.points.chest;
    return Math.hypot(this.p.x - h.x, this.p.y - h.y) < r;
  }

  onDown(e) {
    if (e.button === 2) return;
    const hit = this.c.hitTest(e.clientX, e.clientY);
    this.press = {
      hit, x0: e.clientX, y0: e.clientY, t0: performance.now() / 1000,
      moved: 0, poked: false, target: e.target,
    };
    if (hit) {
      // 캐릭터를 잡았을 때는 아래 UI로 클릭이 전달되지 않도록 막는다
      e.preventDefault();
      e.stopPropagation();
    }
  }

  onMove(e) {
    const now = performance.now() / 1000;
    const px = this.p.x, py = this.p.y;
    this.p.x = e.clientX; this.p.y = e.clientY; this.p.inside = true;
    this.hist.push({ x: e.clientX, y: e.clientY, t: now });
    if (this.hist.length > 90) this.hist.shift();
    const dt = Math.max(1 / 240, now - (this.lastMoveT || now));
    this.lastMoveT = now;
    const dx = this.p.x - px, dy = this.p.y - py;
    this.p.speed = Math.hypot(dx, dy) / dt;
    this.idleTime = 0;

    // 방향 전환 감지(쓰다듬기/간지럽히기/흔들기)
    if (Math.abs(dx) > 2) {
      const dir = Math.sign(dx);
      if (this.lastDragDir !== null && dir !== this.lastDragDir) this.reversals.push(now);
      this.lastDragDir = dir;
    }
    this.reversals = this.reversals.filter((t) => now - t < 1.4);

    // 캐릭터 주위 회전각 누적
    const ch = this.c.points.chest;
    const a = Math.atan2(this.p.y - ch.y, this.p.x - ch.x);
    if (this.lastAngle != null) {
      let d = a - this.lastAngle;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      if (Math.hypot(this.p.x - ch.x, this.p.y - ch.y) < 260) this.angleAcc += d;
      else this.angleAcc *= 0.9;
    }
    this.lastAngle = a;

    if (this.press) {
      this.press.moved = Math.max(this.press.moved,
        Math.hypot(e.clientX - this.press.x0, e.clientY - this.press.y0));
      if (this.press.hit && !this.drag && this.press.moved > 7) {
        this.startDrag(this.press.hit, e.clientX, e.clientY);
      }
    }
    if (this.drag) {
      this.c.dragTo(e.clientX, e.clientY);
      this.drag.maxUp = Math.min(this.drag.maxUp, e.clientY);
      const d2 = Math.hypot(dx, dy);
      this.drag.dist += d2;
      if (this.lastAngle != null) this.dragAngleAcc += 0;
    }
  }

  onUp(e) {
    const now = performance.now() / 1000;
    if (this.drag) {
      const v = this.velocity();
      this.endDrag(v.x, v.y);
      this.press = null;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (this.press && this.press.hit && this.press.moved < 8) {
      e.preventDefault();
      e.stopPropagation();
      this.registerClick(now, this.press.hit.part);
    } else if (this.press && !this.press.hit && this.press.moved < 8) {
      const d = Math.hypot(e.clientX - this.c.points.chest.x, e.clientY - this.c.points.chest.y);
      const onUI = e.target && e.target.closest && e.target.closest('.panel, .topbar');
      if (!onUI) {
        if (d < 190) this.fire('click.ground', 2.5);
        else this.fire('click.far', 6);
      }
    }
    this.press = null;
  }

  registerClick(now, part) {
    this.clicks.push(now);
    this.clicks = this.clicks.filter((t) => now - t < 2);
    if (this.clicks.length >= 6) {
      this.clicks.length = 0;
      this.fire('rapidclick', 2.5);
      return;
    }
    const dbl = this.clicks.length >= 2 && now - this.clicks[this.clicks.length - 2] < 0.34;
    if (dbl) {
      if (part === 'head') { if (this.fire('dblclick.head', 2)) return; }
      else if (part === 'torso') { if (this.fire('dblclick.torso', 2)) return; }
      if (this.fire('dblclick.any', 2)) return;
    }
    const map = {
      head: 'click.head', torso: 'click.torso',
      armNear: 'click.armNear', armFar: 'click.armFar',
      handNear: 'click.hand', handFar: 'click.hand',
      legNear: 'click.legNear', legFar: 'click.legFar',
      footNear: 'click.foot', footFar: 'click.foot',
    };
    this.fire(map[part] || 'click.torso', 1.1);
  }

  startDrag(hit, x, y) {
    this.c.grab(hit.point, x, y);
    this.drag = {
      part: hit.part, t0: performance.now() / 1000,
      maxUp: y, dist: 0, shookAt: 0, spun: 0,
    };
    const ev = {
      head: 'grab.head', torso: 'grab.torso',
      armNear: 'grab.armNear', armFar: 'grab.armFar',
      handNear: 'grab.hand', handFar: 'grab.hand',
      legNear: 'grab.leg', legFar: 'grab.leg',
      footNear: 'grab.foot', footFar: 'grab.foot',
    }[hit.part] || 'grab.torso';
    this.fire(ev, 3);
    this.angleAcc = 0;
  }

  velocity() {
    const now = performance.now() / 1000;
    const recent = this.hist.filter((h) => now - h.t < 0.09);
    if (recent.length < 2) return { x: 0, y: 0 };
    const a = recent[0], b = recent[recent.length - 1];
    const dt = Math.max(0.016, b.t - a.t);
    return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
  }

  endDrag(vx, vy) {
    if (!this.drag) return;
    const speed = Math.hypot(vx, vy);
    const height = this.c.world.ground - this.drag.maxUp;
    this.c.release();
    if (speed > 1400) this.fire('release.throw', 1.5);
    else if (height > 320) this.fire('release.high', 2);
    else this.fire('release.gentle', 2);
    this.drag = null;
  }

  onWheel(e) {
    if (!this.near(200)) return;
    const now = performance.now() / 1000;
    this.wheelHits = (this.wheelHits || []).filter((t) => now - t < 1);
    this.wheelHits.push(now);
    if (this.wheelHits.length > 8) { this.fire('wheel.fast', 4); return; }
    this.fire(e.deltaY < 0 ? 'wheel.up' : 'wheel.down', 1.6);
  }

  onKey(e) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    this.keys.add(k);
    const map = {
      ' ': 'key.space', arrowleft: 'key.left', arrowright: 'key.right',
      arrowup: 'key.up', arrowdown: 'key.down',
      d: 'key.d', f: 'key.f', g: 'key.g', b: 'key.b', n: 'key.n', m: 'key.m',
      s: 'key.s', z: 'key.z', h: 'key.h', k: 'key.k', p: 'key.p', x: 'key.x',
      c: 'key.c', t: 'key.t', r: 'key.r', e: 'key.e', q: 'key.q', v: 'key.v',
      l: 'key.l', o: 'key.o', i: 'key.i', u: 'key.u', y: 'key.y', j: 'key.j',
      w: 'key.w', a: 'key.a',
    };
    const ev = map[k];
    if (ev) {
      if (k === ' ') e.preventDefault();
      this.fire(ev, 0.5);
    }
  }

  /* 매 프레임 지속 상태 판정 */
  update(dt) {
    const now = performance.now() / 1000;
    const c = this.c;
    c.lookAt = this.p.inside ? { x: this.p.x, y: this.p.y } : null;

    this.idleTime += dt;
    if (this.idleTime > 12) this.fire('cursor.idle', 25);

    const hit = c.hitTest(this.p.x, this.p.y);
    const part = hit && hit.part;
    if (part) {
      if (!this.hoverPart) this.fire('hover.enter', 9);
      this.hoverTime += dt;
      this.partTime = part === this.lastPart ? this.partTime + dt : 0;
      this.lastPart = part;
      if (this.hoverTime > 2.6) this.fire('hover.linger', 14);
      if (part === 'head' && this.partTime > 1.2) this.fire('hover.head', 12);
      if ((part === 'footNear' || part === 'footFar') && this.partTime > 1.0) this.fire('hover.foot', 12);
    } else {
      if (this.hoverTime > 1.5) this.fire('hover.leave', 12);
      this.hoverTime = 0; this.partTime = 0; this.lastPart = null;
    }
    this.hoverPart = part;

    const head = c.points.head;
    const dHead = Math.hypot(this.p.x - head.x, this.p.y - head.y);
    const overHead = dHead < 62 * c.scale;
    const chest = c.points.chest;
    const overBody = Math.hypot(this.p.x - chest.x, this.p.y - chest.y) < 70 * c.scale;

    // 쓰다듬기: 머리 위에서 느리게 좌우로 문지르기
    if (overHead && this.reversals.length >= 2 && this.p.speed > 40 && this.p.speed < 1400 && !this.drag) {
      this.fire('pet', 3.5);
    }
    // 간지럽히기: 몸통 위에서 빠르게 흔들기
    if (overBody && !overHead && this.reversals.length >= 4 && this.p.speed > 380 && !this.drag) {
      this.fire('tickle', 3.5);
    }
    // 커서로 캐릭터 주위를 빙빙 돌기
    if (Math.abs(this.angleAcc) > TAU * 1.6 && !this.drag) {
      this.angleAcc = 0;
      this.fire('cursor.circle', 6);
    }
    // 빠르게 스쳐 지나가기
    if (this.p.speed > 2600 && this.near(230) && !this.drag) this.fire('cursor.fast', 5);
    // 천천히 접근
    if (this.p.speed > 15 && this.p.speed < 110 && this.near(210) && !this.drag) {
      this.slowTime += dt;
      if (this.slowTime > 1.2) { this.slowTime = 0; this.fire('cursor.slow', 12); }
    } else this.slowTime = Math.max(0, this.slowTime - dt);
    // 급정거
    if (this.prevSpeed > 1200 && this.p.speed < 60 && this.near(220) && !this.drag) {
      this.fire('cursor.stopSudden', 8);
    }
    this.prevSpeed = this.p.speed;
    // 머리 바로 위에 정지
    if (!this.drag && Math.abs(this.p.x - head.x) < 46 && this.p.y < head.y - 24 && this.p.y > head.y - 150 && this.p.speed < 40) {
      this.aboveTime += dt;
      if (this.aboveTime > 1.1) { this.aboveTime = 0; this.fire('cursor.above', 10); }
    } else this.aboveTime = 0;
    // 지그재그
    if (this.reversals.length >= 6 && !overHead && !overBody && this.near(320) && !this.drag) {
      this.fire('cursor.zigzag', 8);
    }

    // 꾹 누르기
    if (this.press && this.press.hit && !this.drag && !this.press.poked &&
        now - this.press.t0 > 0.7 && this.press.moved < 8) {
      this.press.poked = true;
      this.fire('poke', 3);
    }

    // 잡고 있는 동안
    if (this.drag) {
      const held = now - this.drag.t0;
      if (this.reversals.length >= 6) this.fire('held.shake', 3);
      if (this.c.world.ground - this.p.y > 380) this.fire('held.high', 6);
      if (Math.abs(this.angleAcc) > TAU * 1.5) { this.angleAcc = 0; this.fire('held.spin', 5); }
      if (held > 8) this.fire('held.long', 14);
      if (this.p.speed < 20) {
        this.stillTime += dt;
        if (this.stillTime > 3) { this.stillTime = 0; this.fire('held.still', 12); }
      } else this.stillTime = 0;
      if (this.p.x < 46 || this.p.x > window.innerWidth - 46 || this.p.y < 46) this.fire('held.edge', 7);
      const v = this.velocity();
      if (v.y > 2300 && this.p.y > this.c.world.ground - 140) this.fire('held.slam', 3);
    }
  }
}
