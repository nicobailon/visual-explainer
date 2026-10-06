// Injected before deck scripts by render.mjs.
// 1. Virtual time: timers, requestAnimationFrame, performance.now, Date, and every CSS or Web
//    Animation advance only when the renderer moves the clock, so a slow frame never drops or skews time.
// 2. Scene state: __ve.cue() sets the attributes and events that the deck's own CSS and JS react to.
(() => {
  let now = 0, nextId = 1, frames = new Map(), cur = -1, caption = null;
  const timers = new Map();
  const started = new WeakMap(); // Animation -> virtual start ms, or null when the page controls it
  const epoch = Date.now();
  performance.now = () => now;
  Date.now = () => epoch + now;
  // new Date() and Date() read the virtual clock too; explicit arguments behave natively.
  window.Date = new Proxy(Date, {
    construct: (D, args, nt) => Reflect.construct(D, args.length ? args : [epoch + now], nt),
    apply: (D) => new D(epoch + now).toString(),
  });
  const run = (fn, args) => (typeof fn === 'function' ? fn(...args) : (0, eval)(String(fn)));
  window.setTimeout = (fn, ms, ...args) => { const id = nextId++; timers.set(id, { at: now + Math.max(0, +ms || 0), fn, args }); return id; };
  window.setInterval = (fn, ms, ...args) => { const every = Math.max(1, +ms || 0), id = nextId++; timers.set(id, { at: now + every, fn, args, every }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  window.requestAnimationFrame = (cb) => { const id = nextId++; frames.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { frames.delete(id); };

  // Pause each new animation and start its clock now. Runs after every callback that could create one,
  // so an animation started by a timer at 100 ms counts from 100 ms, not from the next frame.
  const adopt = () => {
    for (const a of document.getAnimations()) {
      if (started.has(a)) continue;
      // An animation the page already paused stays under page control.
      started.set(a, a.playState === 'paused' ? null : now);
      if (a.playState !== 'paused') a.pause();
    }
  };
  // Move every adopted animation to the current virtual time.
  const sync = () => {
    for (const a of document.getAnimations()) {
      const t0 = started.get(a);
      if (t0 == null || a.playState === 'finished') continue; // not adopted yet, or page-controlled
      const t = (now - t0) * a.playbackRate;
      // finish() fires finish and animationend events, which a paused animation never would.
      if (t >= a.effect.getComputedTiming().endTime) a.finish();
      else a.currentTime = t;
    }
  };
  // Run due timers in order, each at its own time and seeing animations at that time.
  const advance = (target) => {
    if (target < now) throw new Error(`clock cannot go back: ${target} < ${now}`);
    for (;;) {
      let id = null, due = null;
      for (const [k, t] of timers) if (t.at <= target && (!due || t.at < due.at)) { id = k; due = t; }
      if (!due) break;
      now = due.at;
      if (due.every) due.at += due.every; else timers.delete(id);
      sync();
      run(due.fn, due.args);
      adopt();
    }
    now = target;
    sync();
  };

  const scenes = () => [...document.querySelectorAll('[data-say]')];
  const fire = (el, type, detail) => el.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));

  window.__ve = {
    scenes: () => scenes().map((s) => ({ lines: s.dataset.say.trim().split(/(?<=[.!?])\s+/).filter(Boolean), hold: +s.dataset.hold || 0 })),

    // At `at` ms, scene i is on with sentences 1..beat started: data-beat="0 1 … beat", so CSS can match
    // [data-beat~="2"]. The scene before it keeps data-was until the next change, for its exit animation.
    cue(at, i, beat, text, captions) {
      advance(at);
      const list = scenes(), next = list[i];
      if (i !== cur) {
        for (const s of list) s.removeAttribute('data-was');
        const prev = list[cur];
        if (prev) { prev.removeAttribute('data-beat'); prev.setAttribute('data-was', ''); fire(prev, 've:leave', { scene: cur }); }
        cur = i;
      }
      next.setAttribute('data-beat', Array.from({ length: beat + 1 }, (_, n) => n).join(' '));
      fire(next, 've:beat', { scene: i, beat });
      if (!caption) {
        caption = document.body.appendChild(Object.assign(document.createElement('p'), { className: 've-caption' }));
        // Defaults go first in <head>, so the deck's own .ve-caption rules win.
        document.head.prepend(Object.assign(document.createElement('style'), { textContent:
          '.ve-caption{position:fixed;left:50%;bottom:36px;transform:translateX(-50%);z-index:2147483647;max-width:1040px;margin:0;padding:8px 16px;border-radius:6px;background:rgb(0 0 0/.75);color:#fff;font:500 24px/1.35 sans-serif;text-align:center;text-wrap:balance}.ve-caption:empty{display:none}' }));
      }
      caption.textContent = captions ? text : '';
      adopt();
    },

    // One video frame at `target` ms.
    tick(target) {
      advance(target);
      const batch = frames;
      frames = new Map();
      adopt();
      for (const cb of batch.values()) { cb(now); adopt(); }
      sync();
    },
  };
})();
