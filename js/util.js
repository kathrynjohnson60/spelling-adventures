/* =====================================================================
   Spelling Adventures — util.js
   Shared helpers used everywhere:
     • Util   – small DOM / array / text helpers
     • Sound  – cheerful sound effects made with the Web Audio API
                (no audio files needed, so it works offline)
     • Speech – reads words and sentences aloud (Web Speech API)
     • UI     – reusable pieces: toast, modal, on-screen keyboard,
                activity header, results screen, confetti
     • Activities – registry every game adds itself to
   ===================================================================== */
'use strict';

/* ---------- Util: tiny helpers ---------- */
const Util = {
  $(sel, root = document) { return root.querySelector(sel); },
  $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); },

  /** Escape text so it is safe to put inside HTML. */
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  /** Return a shuffled copy of an array (Fisher–Yates). */
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); },
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
  capFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; },
  plural(n, word) { return `${n} ${word}${n === 1 ? '' : 's'}`; },

  /** Normalise an answer before comparing: trim, lower-case, straighten quotes, collapse spaces. */
  norm(s) {
    return String(s ?? '').trim().toLowerCase().replace(/[‘’`]/g, "'").replace(/\s+/g, ' ');
  },

  isLetter(ch) { return /^[a-z]$/i.test(ch); },

  /** Escape a string for use inside a RegExp. */
  reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); },

  /** Colour each letter of a typed answer green (right spot) or red (wrong). */
  letterDiff(given, correct) {
    const g = String(given || '');
    return correct.split('').map((ch, i) => {
      const ok = (g[i] || '').toLowerCase() === ch.toLowerCase();
      return `<span class="diff ${ok ? 'ok' : 'bad'}">${Util.esc(ch)}</span>`;
    }).join('');
  },
};

/* ---------- Sound: synthesised sound effects ---------- */
const Sound = (() => {
  let ctx = null;

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** Play one note. `slide` glides the pitch to a new frequency. */
  function tone(freq, start, dur, type = 'sine', vol = 0.12, slide) {
    const ac = audio(); if (!ac) return;
    const t = ac.currentTime + start;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  const effects = {
    correct: () => { tone(660, 0, 0.12, 'triangle'); tone(990, 0.09, 0.16, 'triangle'); },
    wrong:   () => { tone(240, 0, 0.22, 'sawtooth', 0.06, 150); },
    hop:     () => { tone(420, 0, 0.14, 'square', 0.05, 840); },
    flip:    () => { tone(560, 0, 0.07, 'triangle', 0.08); },
    pop:     () => { tone(1200, 0, 0.08, 'square', 0.07, 180); },
    click:   () => { tone(700, 0, 0.04, 'triangle', 0.05); },
    tick:    () => { tone(1000, 0, 0.03, 'square', 0.03); },
    win:     () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.2, 'triangle', 0.1)); },
    lose:    () => { [392, 330, 262].forEach((f, i) => tone(f, i * 0.17, 0.26, 'sine', 0.1)); },
    done:    () => { [523, 659].forEach((f, i) => tone(f, i * 0.12, 0.2, 'triangle', 0.09)); },
  };

  return {
    play(name) {
      if (!Store.settings.sound) return;
      try { effects[name] && effects[name](); } catch (e) { /* audio is optional */ }
    },
  };
})();

/* ---------- Speech: read words aloud ---------- */
const Speech = {
  supported: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
  voices: [],
  _seq: 0,          // bumps whenever speech is cancelled, so queued phrases stop
  _listeners: [],

  init() {
    if (!this.supported) return;
    const load = () => {
      this.voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
      this._listeners.forEach(fn => fn());
    };
    load();
    speechSynthesis.onvoiceschanged = load;
  },

  onVoices(fn) { this._listeners.push(fn); },

  /**
   * How clear a voice is. Browsers ship very different voices:
   *  • Edge "… Online (Natural)" voices (Aria, Jenny, Guy…) — best, almost human
   *  • Chrome "Google US English" — very good
   *  • Apple Samantha / Ava / Allison… — good
   *  • Older Windows voices (David, Zira, Mark) — robotic; often mispronounce single words
   * Online voices need the internet, so they're skipped when offline.
   */
  score(v) {
    let s = 0;
    if (/natural|neural/i.test(v.name)) s += 50;
    else if (/online/i.test(v.name)) s += 30;
    if (/google/i.test(v.name)) s += 40;
    if (/samantha|ava|allison|susan|evan|nicky|zoe|tom|serena/i.test(v.name)) s += 25;
    if (v.lang === 'en-US') s += 5; else if (/^en-(GB|AU|CA)/i.test(v.lang)) s += 3;
    if (!v.localService && navigator.onLine === false) s -= 100;
    return s;
  },
  ranked() { return this.voices.slice().sort((a, b) => this.score(b) - this.score(a)); },
  /** true when the best voice available is one of the older, robotic ones. */
  onlyBasicVoices() { const best = this.ranked()[0]; return !best || this.score(best) < 25; },

  /** The saved voice, or the clearest one this browser has. */
  voice() {
    const want = Store.settings.voiceURI;
    return this.voices.find(v => v.voiceURI === want) || this.ranked()[0] || null;
  },

  /* ---------- Pronunciation fixes ----------
     "Say it like" spellings: the word stays the same on screen, only the voice changes.
     Built-in fixes cover words the robotic voices commonly get wrong; teachers can add
     their own for any word in the list editor. */
  BUILT_IN_SAY: { does: 'duz', doesnt: 'duzunt', "doesn't": "duzunt" },
  _say_map: {},
  refreshPronunciations() {
    const map = { ...this.BUILT_IN_SAY };
    Store.lists.forEach(l => l.words.forEach(w => { if (w.say) map[Util.norm(w.word)] = w.say; }));
    this._say_map = map;
    const keys = Object.keys(map).sort((a, b) => b.length - a.length).map(Util.reEsc);
    this._say_re = keys.length ? new RegExp(`(^|[^a-z'])(${keys.join('|')})(?![a-z'])`, 'gi') : null;
  },
  /** Swap in any "say it like" spellings before the voice reads the text. */
  spoken(text) {
    if (!this._say_re) return text;
    return String(text).replace(this._say_re, (m, pre, word) => pre + (this._say_map[word.toLowerCase()] || word));
  },

  /** Speak one phrase without cancelling a sequence in progress. Resolves when finished. */
  _say(text, rate) {
    return new Promise(resolve => {
      if (!this.supported || !text) return resolve();
      const u = new SpeechSynthesisUtterance(this.spoken(text));
      u.rate = rate ?? Store.settings.rate;
      const v = this.voice();
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
      let finished = false;
      const finish = () => { if (!finished) { finished = true; resolve(); } };
      u.onend = finish; u.onerror = finish;
      // Safety net: some browsers never fire "onend".
      setTimeout(finish, 2500 + (text.length * 140) / u.rate);
      speechSynthesis.speak(u);
    });
  },

  /** Stop anything being spoken and say this instead. */
  async speak(text, opts = {}) {
    this.stop();
    await Util.sleep(60); // small gap avoids a Chrome bug right after cancel()
    return this._say(text, opts.rate);
  },

  /** Spelling-test style: "word … sentence … word". */
  async sayInContext(word, sentence) {
    this.stop();
    const token = this._seq;
    await Util.sleep(60);
    await this._say(word);
    if (!sentence || token !== this._seq) return;
    await Util.sleep(250);
    if (token !== this._seq) return;
    await this._say(sentence);
    if (token !== this._seq) return;
    await Util.sleep(200);
    if (token === this._seq) await this._say(word);
  },

  stop() {
    this._seq++;
    if (this.supported) speechSynthesis.cancel();
  },
};

/* ---------- Activities registry ---------- */
// Every activity file adds itself here: Activities.test = { title, icon, start(root, ctx) … }
const Activities = {};
const ACT_ORDER = ['test', 'escape', 'match', 'scramble', 'missing', 'balloon', 'speed', 'listen', 'sentences', 'flashcards'];

/* ---------- UI: reusable pieces ---------- */
const UI = {
  /** Small message that slides up from the bottom. */
  toast(msg, type = '') {
    const el = Util.$('#toast');
    el.textContent = msg;
    el.className = `toast show ${type}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.className = 'toast'; }, 2600);
  },

  /** Pop-up dialog. Resolves with the clicked button's value (or null if dismissed). */
  modal({ title, html = '', buttons = [{ label: 'OK', value: true, cls: 'primary' }] }) {
    return new Promise(resolve => {
      const root = Util.$('#modal-root');
      root.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 id="modal-title">${title}</h2>
            <div class="modal-body">${html}</div>
            <div class="btn-row">${buttons.map((b, i) =>
              `<button type="button" class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div>
          </div>
        </div>`;
      const onKey = e => { if (e.key === 'Escape') close(null); };
      const close = v => { document.removeEventListener('keydown', onKey); root.innerHTML = ''; resolve(v); };
      Util.$$('[data-i]', root).forEach(btn => { btn.onclick = () => close(buttons[+btn.dataset.i].value); });
      Util.$('.modal-backdrop', root).onclick = e => { if (e.target.classList.contains('modal-backdrop')) close(null); };
      document.addEventListener('keydown', onKey);
      const last = Util.$$('.btn', root).pop();
      if (last) last.focus();
    });
  },

  confirm(msg, okLabel = 'Yes', danger = false) {
    return this.modal({
      title: 'Are you sure?',
      html: `<p>${msg}</p>`,
      buttons: [
        { label: 'Cancel', value: false, cls: 'ghost' },
        { label: okLabel, value: true, cls: danger ? 'danger' : 'primary' },
      ],
    });
  },

  /** Emoji confetti shower for celebrations. */
  confetti(count = 34) {
    const box = document.createElement('div');
    box.className = 'confetti no-print';
    const bits = ['🎉', '⭐', '🎈', '✨', '🌟', '🎊', '💫'];
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.textContent = Util.pick(bits);
      s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDelay = Math.random() * 0.8 + 's';
      s.style.fontSize = 18 + Math.random() * 22 + 'px';
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3600);
  },

  /**
   * Listen for keyboard letters while a game is on screen.
   * Ignores typing inside the page's own form fields. Returns a function that removes the listeners.
   *
   * Two kinds of typing are handled:
   *  • normal key presses (keydown), and
   *  • keyboards that deliver letters as text without key presses (some Chromebook and
   *    tablet keyboards, voice typing, embedded browsers). A hidden "letter catcher"
   *    field receives that text and passes each letter on.
   */
  onKeys(handler) {
    const catcher = document.createElement('input');
    catcher.className = 'key-catcher';
    catcher.setAttribute('aria-hidden', 'true');
    catcher.setAttribute('tabindex', '-1');
    catcher.setAttribute('inputmode', 'none');      // don't pop up a phone keyboard
    catcher.setAttribute('autocomplete', 'off');
    catcher.setAttribute('autocapitalize', 'off');
    catcher.setAttribute('autocorrect', 'off');
    catcher.setAttribute('spellcheck', 'false');
    document.body.appendChild(catcher);

    const fake = key => ({ key, target: catcher, ctrlKey: false, metaKey: false, altKey: false, preventDefault() {} });

    const onKeydown = e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target !== catcher && e.target.closest && e.target.closest('input, textarea, select')) return;
      handler(e);
      // A letter typed into the catcher was already handled; stop it from also arriving as text.
      if (e.target === catcher && e.key.length === 1) e.preventDefault();
    };
    const onInput = () => {
      const text = catcher.value;
      catcher.value = '';
      [...text].forEach(ch => handler(fake(ch)));
    };
    // Clicking around the page (but not in a real form field) puts the catcher back in charge.
    const onClick = e => {
      if (!e.target.closest('input, textarea, select, .modal')) UI.grabKeyboard(catcher);
    };

    document.addEventListener('keydown', onKeydown);
    catcher.addEventListener('input', onInput);
    document.addEventListener('click', onClick);
    UI.grabKeyboard(catcher);
    return () => {
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('click', onClick);
      catcher.remove();
    };
  },

  /** Move keyboard focus onto the page (the letter catcher if there is one),
   *  so students can start typing right away without clicking first. */
  grabKeyboard(target) {
    try { window.focus(); } catch (e) { /* ignore */ }
    const el = target || document.querySelector('.key-catcher');
    if (el) { el.focus({ preventScroll: true }); return; }
    const main = document.getElementById('app');
    if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); }
  },

  /** Big on-screen keyboard for tablets and phones. */
  keyboard(onKey, { extra = [] } = {}) {
    const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    const el = document.createElement('div');
    el.className = 'kb no-print';
    el.innerHTML = `<p class="kb-hint">⌨️ Type with your keyboard, or tap the letters below.</p>` + rows.map(r => `<div class="kb-row">${r.split('').map(k =>
        `<button type="button" class="kb-key" data-key="${k}">${k}</button>`).join('')}</div>`).join('')
      + (extra.length ? `<div class="kb-row">${extra.map(k =>
        `<button type="button" class="kb-key wide" data-key="${Util.esc(k)}">${k === ' ' ? 'space' : Util.esc(k)}</button>`).join('')}</div>` : '');
    // Keep focus where it is (so Enter / typing still work) when tapping keys.
    el.addEventListener('mousedown', e => e.preventDefault());
    el.addEventListener('click', e => {
      const b = e.target.closest('.kb-key');
      if (b && !b.disabled) onKey(b.dataset.key);
    });
    const keyEl = k => el.querySelector(`[data-key="${CSS.escape(k.toLowerCase())}"]`);
    el.mark = (k, cls) => { const b = keyEl(k); if (b) b.classList.add(cls); };
    el.disable = k => { const b = keyEl(k); if (b) b.disabled = true; };
    el.flash = (k, cls) => {
      const b = keyEl(k); if (!b) return;
      b.classList.add(cls);
      setTimeout(() => b.classList.remove(cls), 380);
    };
    el.reset = () => Util.$$('.kb-key', el).forEach(b => { b.disabled = false; b.className = b.className.replace(/\s(good|bad)/g, ''); });
    return el;
  },

  /** Standard activity header (back button, title, list name). Returns the body element. */
  shell(root, ctx, A) {
    root.innerHTML = `
      <section class="activity" style="--act:${A.color}">
        <div class="act-bar no-print">
          <a class="btn ghost small" href="#/list/${ctx.list.id}" aria-label="Back to list">⬅ <span class="hide-sm">Back</span></a>
          <div class="act-title">
            <span class="act-icon" aria-hidden="true">${A.icon}</span>
            <div>
              <h1>${A.title}</h1>
              <small>${Util.esc(ctx.list.name)} · ${Util.plural(ctx.words.length, 'word')}${ctx.subset ? ' · 🎯 practice set' : ''}</small>
            </div>
          </div>
        </div>
        <div class="act-body"></div>
      </section>`;
    return { body: Util.$('.act-body', root) };
  },

  /**
   * Run an activity one word at a time.
   * renderRound(word, api) draws a round and calls api.done(correct, whatTheyTyped).
   * When every word is done, the shared results screen appears.
   */
  rounds(body, ctx, words, renderRound, resultOpts = {}) {
    const rows = [];
    let i = 0;
    const next = () => {
      if (i >= words.length) return UI.results(body, ctx, { rows, ...resultOpts });
      const w = words[i];
      let finished = false; // a round can only finish once (guards double taps)
      renderRound(w, {
        index: i,
        total: words.length,
        done(ok, given) {
          if (finished) return;
          finished = true;
          rows.push({ w, ok, given });
          ctx.record(w.word, ok);
          i++;
          next();
        },
      });
    };
    next();
  },

  /** Little "Word 3 of 10" progress bar. */
  progress(index, total) {
    const pct = Math.round((index / total) * 100);
    return `<div class="round-progress"><span>Word ${index + 1} of ${total}</span>
      <div class="bar"><i style="width:${pct}%"></i></div></div>`;
  },

  /** Shared results screen with score, missed words and "practice missed" buttons. */
  results(body, ctx, { rows, title, scoreText, extraHTML = '' }) {
    const correct = rows.filter(r => r.ok).length;
    const total = rows.length;
    const pct = total ? correct / total : 0;
    const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
    // A word can appear more than once (Speed Round); count it as missed if any attempt missed.
    const missedMap = new Map();
    rows.filter(r => !r.ok).forEach(r => missedMap.set(Util.norm(r.w.word), r.w));
    const missed = [...missedMap.values()];
    const cheer = pct === 1 ? 'Perfect score! 🏆' : pct >= 0.8 ? 'Awesome work! 🌟'
      : pct >= 0.5 ? 'Nice job — keep practicing! 💪' : 'Every try makes you stronger! 🌱';

    Sound.play(pct >= 0.7 ? 'win' : 'done');
    if (pct >= 0.7) UI.confetti();

    body.innerHTML = `
      <div class="card results pop-in">
        <div class="stars" aria-label="${stars} stars">${'⭐'.repeat(stars)}${'<span class="star-empty">★</span>'.repeat(3 - stars)}</div>
        <h2>${title || cheer}</h2>
        <p class="score">${scoreText || `${correct} out of ${total} correct`}</p>
        ${extraHTML}
        <ul class="result-list">
          ${rows.map(r => `
            <li class="${r.ok ? 'ok' : 'miss'}">
              <span aria-hidden="true">${r.ok ? '✅' : '❌'}</span>
              <button type="button" class="linkish say" data-say="${Util.esc(r.w.word)}" title="Hear it">${Util.esc(r.w.word)} 🔊</button>
              ${!r.ok && r.given ? `<span class="given">you typed: <b>${Util.esc(r.given)}</b></span>` : ''}
            </li>`).join('')}
        </ul>
        <div class="btn-row center">
          <button type="button" class="btn" data-act="again">🔁 Play again</button>
          ${missed.length ? `<button type="button" class="btn primary" data-act="missed">🎯 Practice missed words (${missed.length})</button>` : ''}
          <a class="btn ghost" href="#/list/${ctx.list.id}">🧩 More activities</a>
        </div>
        ${missed.length ? `
          <div class="missed-launch">
            <p>Or practice the missed words with a different activity:</p>
            <div class="mini-acts">
              ${ACT_ORDER.filter(k => k !== ctx.act && Activities[k] && missed.length >= (Activities[k].minWords || 1))
                .map(k => `<button type="button" class="mini-act" data-launch="${k}" style="--act:${Activities[k].color}">
                  <span>${Activities[k].icon}</span>${Activities[k].title}</button>`).join('')}
            </div>
          </div>` : ''}
      </div>`;

    body.onclick = e => {
      const say = e.target.closest('[data-say]');
      if (say) return Speech.speak(say.dataset.say);
      const act = e.target.closest('[data-act]');
      if (act && act.dataset.act === 'again') return ctx.restart();
      if (act && act.dataset.act === 'missed') return ctx.restart(missed);
      const launch = e.target.closest('[data-launch]');
      if (launch) ctx.launch(launch.dataset.launch, missed);
    };
  },
};
