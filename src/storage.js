// localStorage 를 쓸 수 없는 환경(샌드박스/시크릿 모드)에서도 죽지 않도록 폴백
const memory = new Map();
let usable = true;
try {
  const k = '__probe__';
  window.localStorage.setItem(k, '1');
  window.localStorage.removeItem(k);
} catch (e) {
  usable = false;
}

export const store = {
  get(key, fallback) {
    try {
      const raw = usable ? window.localStorage.getItem(key) : memory.get(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    const raw = JSON.stringify(value);
    try {
      if (usable) window.localStorage.setItem(key, raw);
      else memory.set(key, raw);
    } catch (e) {
      memory.set(key, raw);
    }
  },
  remove(key) {
    try {
      if (usable) window.localStorage.removeItem(key);
    } catch (e) {}
    memory.delete(key);
  },
};
