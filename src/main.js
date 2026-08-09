// 앱 진입점: 캔버스 루프 + 캐릭터 + 두뇌 + 입력 + UI 연결
import { Character } from './character.js';
import { Brain } from './brain.js';
import { Input } from './input.js';
import { UI, DEFAULTS } from './ui.js';
import { resolve, TOTAL } from './interactions.js';
import { store } from './storage.js';
import { clamp, pick } from './math.js';

// 계속 반복 재생해야 자연스러운 클립들
const HOLD = new Set([
  'sit', 'sitSwing', 'sleep', 'lie', 'meditate', 'type', 'draw', 'pushup', 'situp',
  'squat', 'jumpingJack', 'think', 'clap', 'dance', 'disco', 'robot', 'twist',
  'moonwalk', 'floss', 'headbang', 'crawl', 'swim', 'handstand', 'hide', 'listen',
  'push', 'pull', 'lean', 'kneel', 'tiptoe', 'balance', 'crouch', 'sway', 'wiggle',
  'angry', 'cry', 'laugh', 'scared', 'shiver', 'fan', 'dizzy', 'tickled', 'hang',
  'tantrum', 'walk', 'run', 'jog', 'sneak', 'idle',
]);

class App {
  constructor() {
    this.canvas = document.getElementById('scene');
    this.ctx = this.canvas.getContext('2d');
    this.world = {
      width: window.innerWidth,
      height: window.innerHeight,
      ground: window.innerHeight - 26,
      platforms: [],
      gravity: DEFAULTS.gravity,
      settings: Object.assign({}, DEFAULTS),
    };

    this.char = new Character(this.world);
    this.ui = new UI(this);
    this.brain = new Brain(this.char, (ev, opts) => this.command(ev, opts));
    this.input = new Input(this.char, (ev, data) => this.command(ev, data));

    this.char.x = this.world.width * 0.4;
    this.char.snapToSurface();

    this.char.onLand = (impact, onPanel) => {
      if (onPanel) this.command('land.platform');
      else if (impact > 1100) this.command('land.hard');
      else if (impact > 420) this.command('land.soft');
    };
    this.char.onFallOff = () => this.command('platform.fall');
    this.char.onRecoverStart = () => this.command('ragdoll.settle');
    this.char.onRecovered = () => this.command('recover.done');

    this.bindWindow();
    this.startupGreeting();
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  /* ── 설정 ── */
  applySettings(s) {
    Object.assign(this.world.settings, s);
    this.world.gravity = s.gravity;
    this.char.settings = this.world.settings;
    this.char.scale = s.scale;
  }

  toggleAutonomy() {
    const s = this.ui.settings;
    s.autonomy = s.autonomy > 0 ? 0 : 1;
    store.set('sm.settings', s);
    this.applySettings(s);
    const el = document.getElementById('set-autonomy');
    if (el) el.value = s.autonomy;
    return s.autonomy > 0;
  }

  resetAll() {
    store.remove('sm.settings');
    store.remove('sm.found');
    this.ui.settings = Object.assign({}, DEFAULTS);
    this.ui.found = new Set();
    this.applySettings(this.ui.settings);
    this.ui.renderCodex();
    this.ui.updateCounter();
    for (const [id, key] of [
      ['set-speed', 'speed'], ['set-scale', 'scale'], ['set-autonomy', 'autonomy'],
      ['set-gravity', 'gravity'], ['set-smooth', 'smooth'],
    ]) {
      const el = document.getElementById(id);
      if (el) el.value = DEFAULTS[key];
    }
    for (const [id, key] of [
      ['set-shadow', 'shadow'], ['set-glow', 'glow'], ['set-face', 'face'], ['set-bubbles', 'bubbles'],
    ]) {
      const el = document.getElementById(id);
      if (el) el.checked = DEFAULTS[key];
    }
    document.getElementById('set-theme').value = DEFAULTS.theme;
    document.documentElement.dataset.theme = DEFAULTS.theme;
    this.command('ui.reset');
    this.ui.toast('설정과 도감을 초기화했습니다');
  }

  callCharacter() {
    const p = this.input.p;
    const x = p.inside ? p.x : this.world.width / 2;
    this.char.stopAction();
    this.char.walkTo(x, Math.abs(x - this.char.x) > 320);
    this.char.say('갈게!');
    this.brain.noticeUser();
  }

  /* ── 상호작용 실행 ── */
  command(ev, opts = {}) {
    const r = resolve(ev);
    if (!r) return;
    const { entry, line } = r;
    const c = this.char;

    if (!ev.startsWith('auto.')) this.brain.noticeUser();

    // 특수 동작이 필요한 이벤트 (클립 대신 실제 이동/점프로 처리)
    let noAnim = opts.noAnim;
    if (ev === 'key.space' || ev === 'key.up') { c.jump(ev === 'key.up' ? 900 : 760); noAnim = true; }
    if (ev === 'key.left' || ev === 'key.right') {
      c.walkTo(c.x + (ev === 'key.left' ? -160 : 160), this.input.keys.has('shift'));
      noAnim = true;
    }
    if (ev === 'key.r') {
      c.walkTo(this.input.p.inside ? this.input.p.x : c.x + 320, true);
      noAnim = true;
    }

    const physics = c.state === 'held' || c.state === 'ragdoll';
    if (physics || noAnim) {
      c.say(line);
      if (entry.emote) c.emote(entry.emote);
    } else {
      const hold = opts.hold ?? HOLD.has(entry.anim);
      const dur = opts.dur ?? entry.dur ?? (hold ? 3.6 : undefined);
      c.play(entry.anim, {
        say: line,
        emote: entry.emote,
        hold,
        dur,
        lock: !['walk', 'run', 'jog'].includes(entry.anim),
      });
    }

    const milestone = this.ui.discover(entry);
    if (milestone && !this._inMilestone) {
      this._inMilestone = true;
      setTimeout(() => { this.command('world.milestone'); this._inMilestone = false; }, 900);
    }
  }

  /* ── 창/시간 이벤트 ── */
  bindWindow() {
    const onResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.canvas.style.width = window.innerWidth + 'px';
      this.canvas.style.height = window.innerHeight + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.world.width = window.innerWidth;
      this.world.height = window.innerHeight;
      this.world.ground = window.innerHeight - 26;
      this.char.x = clamp(this.char.x, 30, this.world.width - 30);
      this.ui.measurePlatforms();
    };
    window.addEventListener('resize', () => {
      onResize();
      clearTimeout(this._rt);
      this._rt = setTimeout(() => this.command('world.resize'), 260);
    });
    onResize();

    window.addEventListener('blur', () => this.command('world.blur'));
    window.addEventListener('focus', () => this.command('world.focus'));

    const visits = store.get('sm.visits', 0) + 1;
    store.set('sm.visits', visits);
    this.visits = visits;
    setTimeout(() => this.command('world.long'), 10 * 60 * 1000);
  }

  startupGreeting() {
    setTimeout(() => {
      this.command(this.visits > 1 ? 'world.return' : 'world.first');
    }, 700);
  }

  /* ── 메인 루프 ── */
  loop(now) {
    const dt = Math.min((now - this.last) / 1000, 1 / 24);
    this.last = now;

    // 열린 창 위를 걸어 다닐 수 있도록 발판 갱신
    this.platTick = (this.platTick || 0) + dt;
    if (this.platTick > 0.25) {
      this.platTick = 0;
      this.world.platforms = this.ui.measurePlatforms();
    }

    // 방향키 지속 이동
    const k = this.input.keys;
    if (this.char.state === 'ground') {
      if (k.has('arrowleft')) this.char.walkTo(this.char.x - 140, k.has('shift'));
      else if (k.has('arrowright')) this.char.walkTo(this.char.x + 140, k.has('shift'));
    }

    this.input.update(dt);
    this.brain.update(dt);
    this.char.update(dt);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.world.width, this.world.height);
    this.char.draw(ctx);
    this.ui.updateBubble(this.char);

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('total-count').textContent = TOTAL;
  window.__app = new App();
});
