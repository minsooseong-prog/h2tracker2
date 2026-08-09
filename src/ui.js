// 화면 UI: 메인 메뉴 · 게시판 · 설정 · 상호작용 도감 + 말풍선.
import { store } from './storage.js';
import { INTERACTIONS, TOTAL } from './interactions.js';

export const DEFAULTS = {
  speed: 1,
  scale: 0.92,
  autonomy: 1,
  gravity: 1800,
  smooth: 1,
  shadow: true,
  glow: false,
  face: false,
  bubbles: true,
  theme: 'light',
};

export class UI {
  constructor(app) {
    this.app = app;
    this.settings = Object.assign({}, DEFAULTS, store.get('sm.settings', {}));
    this.posts = store.get('sm.posts', []);
    this.found = new Set(store.get('sm.found', []));
    this.el = {};
    this.platforms = [];
    this.build();
  }

  q(id) { return document.getElementById(id); }

  build() {
    const e = this.el;
    e.bubble = this.q('bubble');
    e.toast = this.q('toast');
    e.panels = {
      menu: this.q('panel-menu'),
      board: this.q('panel-board'),
      settings: this.q('panel-settings'),
      codex: this.q('panel-codex'),
    };

    document.querySelectorAll('[data-panel]').forEach((btn) => {
      btn.addEventListener('click', () => this.toggle(btn.dataset.panel));
    });
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.close(btn.dataset.close));
    });

    // 메인 메뉴 동작
    this.q('act-call').addEventListener('click', () => this.app.callCharacter());
    this.q('act-jump').addEventListener('click', () => this.app.command('key.space'));
    this.q('act-dance').addEventListener('click', () => this.app.command('key.d'));
    this.q('act-sleep').addEventListener('click', () => this.app.command('key.z'));
    this.q('act-auto').addEventListener('click', (ev) => {
      const on = this.app.toggleAutonomy();
      ev.currentTarget.textContent = on ? '자율 모드 끄기' : '자율 모드 켜기';
      this.toast(on ? '자율 모드를 켰습니다' : '자율 모드를 껐습니다');
    });
    this.q('act-reset').addEventListener('click', () => {
      this.app.resetAll();
    });

    // 게시판
    this.q('post-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const name = this.q('post-name').value.trim() || '익명';
      const body = this.q('post-body').value.trim();
      if (!body) { this.toast('내용을 입력해 주세요'); return; }
      this.posts.unshift({ id: Date.now(), name, body, at: new Date().toISOString() });
      this.posts = this.posts.slice(0, 200);
      store.set('sm.posts', this.posts);
      this.q('post-body').value = '';
      this.renderPosts();
      this.app.command('ui.post');
      this.toast('글을 올렸습니다');
    });

    // 설정
    const bind = (id, key, kind = 'range', after) => {
      const el = this.q(id);
      if (!el) return;
      if (kind === 'check') el.checked = !!this.settings[key];
      else el.value = this.settings[key];
      const handler = () => {
        this.settings[key] = kind === 'check' ? el.checked : parseFloat(el.value);
        store.set('sm.settings', this.settings);
        this.applySettings();
        if (after) after();
      };
      el.addEventListener(kind === 'check' ? 'change' : 'input', handler);
    };
    bind('set-speed', 'speed', 'range', () => this.app.command('ui.speed'));
    bind('set-scale', 'scale', 'range', () => this.app.command('ui.scale'));
    bind('set-autonomy', 'autonomy');
    bind('set-gravity', 'gravity', 'range', () => this.app.command('ui.gravity'));
    bind('set-smooth', 'smooth');
    bind('set-shadow', 'shadow', 'check');
    bind('set-glow', 'glow', 'check');
    bind('set-face', 'face', 'check');
    bind('set-bubbles', 'bubbles', 'check');
    this.q('set-theme').value = this.settings.theme;
    this.q('set-theme').addEventListener('change', (ev) => {
      this.settings.theme = ev.target.value;
      store.set('sm.settings', this.settings);
      this.applySettings();
      this.app.command('ui.theme');
    });

    // 처음부터 열려 있는 패널의 버튼에 활성 표시
    for (const [name, el] of Object.entries(e.panels)) {
      if (el && el.classList.contains('open')) {
        document.querySelector(`[data-panel="${name}"]`)?.classList.add('active');
      }
    }

    this.q('codex-search').addEventListener('input', () => this.renderCodex());
    this.q('total-count').textContent = TOTAL;
    this.renderPosts();
    this.renderCodex();
    this.applySettings();
  }

  applySettings() {
    document.documentElement.dataset.theme = this.settings.theme;
    this.app.applySettings(this.settings);
  }

  toggle(name) {
    const p = this.el.panels[name];
    if (!p) return;
    const open = p.classList.toggle('open');
    document.querySelector(`[data-panel="${name}"]`)?.classList.toggle('active', open);
    if (open) this.app.command('ui.' + name);
    else this.app.command('ui.close');
    this.measurePlatforms();
  }

  close(name) {
    const p = this.el.panels[name];
    if (!p) return;
    p.classList.remove('open');
    document.querySelector(`[data-panel="${name}"]`)?.classList.remove('active');
    this.app.command('ui.close');
    this.measurePlatforms();
  }

  // 열려 있는 창의 윗면을 캐릭터가 올라설 수 있는 발판으로 등록
  measurePlatforms() {
    const out = [];
    document.querySelectorAll('.panel.open, .topbar').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 60 || r.height < 24) return;
      out.push({ x1: r.left + 8, x2: r.right - 8, y: r.top, el });
    });
    this.platforms = out;
    return out;
  }

  renderPosts() {
    const list = this.q('post-list');
    list.innerHTML = '';
    this.q('post-count').textContent = this.posts.length;
    if (!this.posts.length) {
      list.innerHTML = '<li class="empty">아직 글이 없습니다. 첫 글을 남겨 보세요.</li>';
      return;
    }
    for (const p of this.posts) {
      const li = document.createElement('li');
      li.className = 'post';
      const d = new Date(p.at);
      li.innerHTML = `
        <div class="post-head">
          <strong></strong>
          <time>${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</time>
          <button class="link-btn" type="button">삭제</button>
        </div>
        <p></p>`;
      li.querySelector('strong').textContent = p.name;
      li.querySelector('p').textContent = p.body;
      li.querySelector('button').addEventListener('click', () => {
        this.posts = this.posts.filter((x) => x.id !== p.id);
        store.set('sm.posts', this.posts);
        this.renderPosts();
        this.app.command('ui.delete');
      });
      list.appendChild(li);
    }
  }

  discover(entry) {
    if (!entry || this.found.has(entry.id)) return false;
    this.found.add(entry.id);
    store.set('sm.found', [...this.found]);
    this.updateCounter();
    if (this.el.panels.codex.classList.contains('open')) this.renderCodex();
    const n = this.found.size;
    if (n === 10 || n === 30 || n === 60 || n === 100 || n === TOTAL) {
      this.toast(`상호작용 ${n}종 발견!`);
      return true;
    }
    return false;
  }

  updateCounter() {
    this.q('found-count').textContent = this.found.size;
  }

  renderCodex() {
    const term = this.q('codex-search').value.trim();
    const list = this.q('codex-list');
    list.innerHTML = '';
    const groups = new Map();
    for (const it of INTERACTIONS) {
      const g = it.event.split('.')[0];
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(it);
    }
    const label = {
      click: '클릭', dblclick: '더블클릭', rapidclick: '연타', poke: '길게 누르기',
      hover: '커서 근접', pet: '쓰다듬기', tickle: '간지럽히기',
      grab: '잡기', held: '들고 있는 중', release: '놓기',
      land: '착지', ragdoll: '넘어짐', recover: '회복',
      cursor: '커서 제스처', wheel: '휠', rightclick: '오른쪽 클릭',
      key: '키보드', ui: '화면 조작', world: '환경', platform: '창 위',
      auto: '자율 행동',
    };
    for (const [g, items] of groups) {
      const shown = items.filter(
        (it) => !term || it.name.includes(term) || it.lines.some((l) => l.includes(term))
      );
      if (!shown.length) continue;
      const head = document.createElement('li');
      head.className = 'codex-group';
      head.textContent = `${label[g] || g} · ${shown.filter((s) => this.found.has(s.id)).length}/${shown.length}`;
      list.appendChild(head);
      for (const it of shown) {
        const li = document.createElement('li');
        const got = this.found.has(it.id);
        li.className = 'codex-item' + (got ? ' got' : '');
        const line = got ? it.lines[0] : '아직 발견하지 못했습니다';
        li.innerHTML = '<span class="dot"></span><div><b></b><em></em></div>';
        li.querySelector('b').textContent = got ? it.name : '???';
        li.querySelector('em').textContent = line;
        list.appendChild(li);
      }
    }
    this.updateCounter();
  }

  toast(msg) {
    const t = this.el.toast;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }

  updateBubble(char) {
    const b = this.el.bubble;
    if (!this.settings.bubbles || !char.bubble) { b.classList.remove('show'); return; }
    const head = char.points.head;
    b.textContent = char.bubble.text;
    b.classList.add('show');
    const w = b.offsetWidth || 120;
    const x = Math.min(Math.max(head.x, w / 2 + 12), window.innerWidth - w / 2 - 12);
    b.style.transform = `translate(${x}px, ${head.y - 52 * char.scale}px) translate(-50%, -100%)`;
  }
}
