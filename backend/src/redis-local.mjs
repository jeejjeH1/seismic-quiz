export class LocalRedis {
  constructor() {
    this.map = new Map();
    this.status = "ready";
  }

  on() {}

  async hset(key, fieldOrObj, maybeValue) {
    const h = this.map.get(key) || new Map();
    this.map.set(key, h);
    if (typeof fieldOrObj === "object") {
      for (const [f, v] of Object.entries(fieldOrObj)) h.set(f, String(v));
      return Object.keys(fieldOrObj).length;
    }
    h.set(String(fieldOrObj), String(maybeValue));
    return 1;
  }

  async hmset(key, obj) {
    return this.hset(key, obj);
  }

  async hget(key, field) {
    const h = this.map.get(key);
    return h ? h.get(String(field)) ?? null : null;
  }

  async hgetall(key) {
    const h = this.map.get(key);
    if (!h) return {};
    return Object.fromEntries(h);
  }

  async hlen(key) {
    const h = this.map.get(key);
    return h ? h.size : 0;
  }

  async del(...keys) {
    let n = 0;
    for (const k of keys.flat()) if (this.map.delete(k)) n++;
    return n;
  }

  async zadd(key, score, member) {
    const z = this._z(key);
    z.set(String(member), Number(score));
    return 1;
  }

  async zincrby(key, incr, member) {
    const z = this._z(key);
    const cur = z.get(String(member)) || 0;
    const next = cur + Number(incr);
    z.set(String(member), next);
    return next;
  }

  async zrevrange(key, start, stop, withScores) {
    const z = this._z(key);
    const sorted = [...z.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
    const size = sorted.length;
    let s = start < 0 ? size + start : start;
    let e = stop < 0 ? size + stop : stop;
    const slice = sorted.slice(Math.max(0, s), e + 1);
    if (withScores === "WITHSCORES") {
      const flat = [];
      for (const m of slice) flat.push(m, String(z.get(m)));
      return flat;
    }
    return slice;
  }

  _z(key) {
    let z = this.map.get(key);
    if (!(z instanceof Map)) {
      z = new Map();
      this.map.set(key, z);
    }
    return z;
  }
}
