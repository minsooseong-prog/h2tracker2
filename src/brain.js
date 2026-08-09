// 자율 행동. 사용자가 아무것도 하지 않아도 캐릭터가 화면을 돌아다니며 "생활"한다.
import { rand, pick, chance, clamp } from './math.js';

const REST = [
  'auto.idle', 'auto.think', 'auto.stretch', 'auto.yawn', 'auto.checkWatch',
  'auto.peek', 'auto.watch', 'auto.balance', 'auto.tiptoe', 'auto.wiggle',
  'auto.sneeze', 'auto.cold', 'auto.hot', 'auto.kneel',
];
const PLAY = [
  'auto.dance', 'auto.draw', 'auto.exercise', 'auto.pushup', 'auto.meditate',
  'auto.headbang', 'auto.swim', 'auto.roll', 'auto.moon', 'auto.crawl',
];

export class Brain {
  constructor(char, act) {
    this.c = char;
    this.act = act;
    this.timer = 2;
    this.lastUser = performance.now() / 1000;
    this.mode = 'auto';
    this.sleeping = false;
  }

  noticeUser() {
    this.lastUser = performance.now() / 1000;
    if (this.sleeping) {
      this.sleeping = false;
      this.c.play('wakeUp', { lock: true, say: '으음… 일어났어.' });
      this.timer = 2.5;
    }
  }

  busy() {
    const c = this.c;
    return c.state !== 'ground' || !!c.action || c.goal != null;
  }

  update(dt) {
    const c = this.c;
    const st = c.settings;
    if (this.mode !== 'auto' || !st.autonomy) return;
    if (this.busy()) return;

    this.timer -= dt * clamp(st.autonomy, 0.2, 3);
    if (this.timer > 0) return;

    const away = performance.now() / 1000 - this.lastUser;

    // 오래 방치되면 앉거나 잠든다
    if (away > 95 && !this.sleeping && chance(0.6)) {
      this.sleeping = true;
      this.act('auto.sleep', { hold: true, dur: rand(26, 14) });
      this.timer = rand(26, 14);
      return;
    }
    if (away > 45 && chance(0.35)) {
      this.act('auto.sit', { hold: true, dur: rand(12, 6) });
      this.timer = rand(12, 6);
      return;
    }

    const roll = Math.random();
    if (roll < 0.34) this.wander();
    else if (roll < 0.44) this.climb();
    else if (roll < 0.52) this.explore();
    else if (roll < 0.72) this.rest();
    else if (roll < 0.86) this.playAround();
    else this.watchUser();
  }

  wander() {
    const c = this.c;
    const target = rand(c.world.width - 60, 60);
    const run = chance(0.22);
    c.walkTo(target, run);
    if (chance(0.35)) this.act(run ? 'auto.explore' : 'auto.walk', { noAnim: true });
    this.timer = rand(3.4, 1.4);
  }

  explore() {
    const c = this.c;
    const edge = chance(0.5) ? 70 : c.world.width - 70;
    c.walkTo(edge, false);
    this.act('auto.explore', { noAnim: true });
    this.timer = rand(4, 2);
  }

  climb() {
    const c = this.c;
    const cands = c.world.platforms.filter(
      (p) => p.y < c.world.ground - 70 && p.x2 - p.x1 > 90 && p.y > 90
    );
    if (!cands.length) return this.wander();
    const p = pick(cands);
    const tx = clamp((p.x1 + p.x2) / 2, p.x1 + 24, p.x2 - 24);
    c.walkTo(tx, false);
    const need = c.world.ground - p.y;
    const power = clamp(Math.sqrt(2 * 2100 * (need + 60)), 600, 1250);
    this.pending = { tx, power };
    this.timer = 0.4;
    const watch = () => {
      if (!this.pending) return;
      if (Math.abs(c.x - this.pending.tx) < 30 && c.state === 'ground') {
        c.jump(this.pending.power);
        this.act('auto.climb', { noAnim: true });
        this.pending = null;
      } else if (c.goal == null && c.state === 'ground') {
        this.pending = null;
      } else setTimeout(watch, 120);
    };
    setTimeout(watch, 160);
  }

  rest() {
    this.act(pick(REST));
    this.timer = rand(4.5, 2);
  }

  playAround() {
    const ev = pick(PLAY);
    const hold = chance(0.6);
    this.act(ev, hold ? { hold: true, dur: rand(6, 3) } : {});
    this.timer = rand(5, 2.5);
  }

  watchUser() {
    const c = this.c;
    if (c.lookAt) c.faceTo(c.lookAt.x);
    this.act('auto.watch', { hold: true, dur: rand(4, 2) });
    this.timer = rand(4, 2);
  }
}
