/* =====================================================================
   Escape the Danger — the main action typing game
   The word is read aloud and shown as blanks. Each correct letter moves
   the hero toward safety; each wrong letter brings the danger closer.

   Four storybook scenes, painted by Kathryn (img/backgrounds, img/characters):
     castle – the princess runs up the jeweled path; the big bad wolf chases her
     lake   – the boy rows to the shore; a shark follows
     forest – the boy runs to the log cabin; a hungry bear chases him
     river  – the boy hops stone to stone; wrong letters raise the water

   Too many wrong letters: the danger carries the hero away (or tips the boat,
   or the river sweeps him off), then the scene fades to black: "Try again!"

   Difficulty scales with word length: longer words allow a few more
   mistakes and give more time before the (optional) chase timer nudges
   the danger closer.
   ===================================================================== */
'use strict';

const ESCAPE_THEMES = {
  castle: {
    label: 'Castle Escape', icon: '🏰', bg: 'castle-meadow.webp', bgPos: 'center 75%',
    hero: 'princess-run.webp', winHero: 'princess-wave.webp', danger: 'wolf-run.webp',
    meter: 'Wolf', meterIcon: '🐺',
    goal: 'Help the princess reach the castle before the big bad wolf!',
    win: 'Hooray! The princess is safe at the castle!',
    lose: 'The big bad wolf carried the princess away.',
  },
  lake: {
    label: 'Lake Escape', icon: '⛵', bg: 'lake.webp', bgPos: 'center 55%',
    hero: 'boat-kid.webp', danger: 'shark.webp',
    meter: 'Shark', meterIcon: '🦈',
    goal: 'Row to the shore before the shark catches up!',
    win: 'Hooray! You rowed safely to the shore!',
    lose: 'Splash! The shark tipped the boat over.',
  },
  forest: {
    label: 'Forest Frenzy', icon: '🐻', bg: 'forest.webp', bgPos: 'center 72%',
    hero: 'kid-run.webp', danger: 'bear-run.webp',
    meter: 'Bear', meterIcon: '🐻',
    goal: 'Run to the cabin before the hungry bear catches up!',
    win: 'Hooray! You made it safely to the cabin!',
    lose: 'The hungry bear carried you off into the woods.',
  },
  river: {
    label: 'River Crossing', icon: '🪨', bg: 'river.webp', bgPos: 'center 78%',
    hero: 'kid-run.webp', danger: null,
    meter: 'Water', meterIcon: '🌊',
    goal: 'Hop from stone to stone before the river rises!',
    win: 'Hooray! You hopped all the way across!',
    lose: 'Splash! The river swept you away.',
  },
};
const IMG_DIR = 'img/';

/* ---------------------------------------------------------------------
   Scene layouts. Each one places the hero and the danger for the current
   progress, and plays the win and lose animations. All positions are
   percentages of the scene (left / bottom) and widths are in cqw
   (percent of the scene's width), so everything scales with the screen.
   --------------------------------------------------------------------- */
const EscapeScenes = {
  /* Castle: a path from the forest (bottom-left) up to the castle door. */
  castle: {
    heroW: 27, dangerW: 25,
    pathAt(p, w) { return { left: 14 + 50 * p, bottom: Math.max(1 + 30 * p, 1), width: w * (1 - 0.42 * Math.max(p, 0)) }; },
    put(s, el, p, w) { const at = this.pathAt(p, w); s.place(el, at.left, at.bottom, at.width); return at; },
    layout(s, prog, frac) {
      s.p = 0.8 * prog;
      this.put(s, s.hero, s.p, this.heroW);
      this.put(s, s.danger, s.p - 0.12 - 0.42 * (1 - frac), this.dangerW);
    },
    win(s) {
      this.put(s, s.hero, 1, this.heroW);
      this.put(s, s.danger, -0.8, this.dangerW);
      s.later(() => {
        s.setHeroImg(s.theme.winHero);
        s.place(s.hero, 72.3, 35, 9);
        s.frame.classList.add('won');
      }, 650);
    },
    lose(s) {
      const p = s.p;
      this.put(s, s.danger, p - 0.1, this.dangerW);
      s.later(() => { s.frame.classList.add('grabbed'); const at = this.pathAt(p, this.heroW); s.place(s.hero, at.left - 2, at.bottom + 8); }, 800);
      s.later(() => { s.frame.classList.add('carry'); this.put(s, s.danger, -0.9, this.dangerW); s.place(s.hero, -32, 8); }, 1300);
      return 2500;
    },
  },

  /* Lake: the boat rows left to right toward the shore; the shark follows in the water. */
  lake: {
    heroW: 30, dangerW: 24, START: 14, SHORE: 58, WATER: 3,
    layout(s, prog, frac) {
      const bx = this.START + (this.SHORE - 8 - this.START) * prog;
      s.place(s.hero, bx, this.WATER, this.heroW);
      s.place(s.danger, bx - (6 + 22 * (1 - frac)) - 14, this.WATER - 2, this.dangerW);
      s.splashAt(bx + 8, 18);
    },
    win(s) {
      s.place(s.hero, this.SHORE, this.WATER + 4, 24);
      s.place(s.danger, -40, this.WATER - 2);
      s.frame.classList.add('won');
    },
    lose(s) {
      const bx = parseFloat(s.hero.style.left);
      s.place(s.danger, bx - 12, this.WATER - 2);
      s.later(() => s.frame.classList.add('bump'), 800);
      s.later(() => s.frame.classList.add('tip'), 1150);
      return 2700;
    },
  },

  /* Forest: run across the meadow to the log cabin; the bear charges out of the trees. */
  forest: {
    heroW: 26, dangerW: 27, START: 28, CABIN: 72,
    layout(s, prog, frac) {
      const px = this.START + (this.CABIN - 22 - this.START) * prog;
      s.place(s.hero, px, 0, this.heroW);
      s.place(s.danger, px - (8 + 22 * (1 - frac)) - 14, 0, this.dangerW);
    },
    win(s) {
      s.place(s.hero, this.CABIN + 2, 24, 11);
      s.place(s.danger, -40, 0);
      s.frame.classList.add('won');
    },
    lose(s) {
      const px = parseFloat(s.hero.style.left);
      s.place(s.danger, px - 12, 0);
      s.later(() => { s.frame.classList.add('grabbed'); s.place(s.hero, px - 4, 10); }, 800);
      s.later(() => { s.frame.classList.add('carry'); s.place(s.danger, -45, 0); s.place(s.hero, -37, 10); }, 1300);
      return 2600;
    },
  },

  /* River: one stepping stone per letter; wrong letters raise the water. */
  river: {
    heroW: 14, BANK_LEFT: 24, FIRST: 41, LAST: 64, BANK_RIGHT: 80, FEET: 21,
    build(s, letters) {
      const n = letters.length;
      s.stoneX = Array.from({ length: n }, (_, k) => (n === 1 ? (this.FIRST + this.LAST) / 2 : this.FIRST + (k * (this.LAST - this.FIRST)) / (n - 1)));
      const sw = Math.min(5.6, ((this.LAST - this.FIRST) / Math.max(n - 1, 1)) * 0.85);
      s.$('.esc-stones').innerHTML = s.stoneX.map(x => `<div class="esc-stone" style="left:${x}%;--sw:${sw}cqw"></div>`).join('');
    },
    stand(s, x) { s.place(s.hero, x - this.heroW / 2, this.FEET, this.heroW); },
    layout(s, prog, frac, pos) {
      this.stand(s, pos === 0 ? this.BANK_LEFT : s.stoneX[pos - 1]);
      s.$('.esc-flood').style.height = (frac ? 10 + 9 * frac : 0) + '%';
    },
    win(s) {
      s.hop();
      this.stand(s, this.BANK_RIGHT);
      s.frame.classList.add('won');
    },
    lose(s, pos) {
      const x = pos === 0 ? this.BANK_LEFT + 14 : s.stoneX[pos - 1];
      s.$('.esc-flood').style.height = '30%';
      s.splashAt(x - 4, 22);
      s.later(() => { s.frame.classList.add('swept'); s.hero.style.left = (x + 2) + '%'; s.hero.style.bottom = '-30%'; }, 500);
      return 2400;
    },
  },
};

Activities.escape = {
  title: 'Escape the Danger',
  icon: '🏃',
  color: '#e0559f',
  desc: 'Type letters to run, row, or hop to safety!',
  minWords: 1,

  start(root, ctx) {
    const { body } = UI.shell(root, ctx, this);
    const words = Util.shuffle(ctx.words);
    const results = [];               // one row per word (first outcome)
    let themeKey = ESCAPE_THEMES[Store.settings.theme] ? Store.settings.theme : 'castle';
    let idx = 0;
    let st = null;                    // state for the current word
    let creepTimer = null;
    let timers = [];

    // Warm up every picture so scenes appear instantly when switching themes.
    Object.values(ESCAPE_THEMES).forEach(t => {
      [`backgrounds/${t.bg}`, `characters/${t.hero}`, t.danger && `characters/${t.danger}`, t.winHero && `characters/${t.winHero}`]
        .filter(Boolean).forEach(src => { const im = new Image(); im.src = IMG_DIR + src; });
    });

    body.innerHTML = `
      <div class="escape">
        <div class="esc-top">
          <div class="theme-tabs" role="tablist">
            ${Object.entries(ESCAPE_THEMES).map(([k, t]) =>
              `<button type="button" class="theme-tab" data-theme="${k}" role="tab">${t.icon} <span class="hide-sm">${t.label}</span></button>`).join('')}
          </div>
          <div class="esc-score"></div>
        </div>
        <p class="esc-goal"></p>
        <div class="word-slots" aria-live="polite"></div>
        <div class="btn-row center esc-tools">
          <button type="button" class="btn small" data-do="hear">🔊 Hear word</button>
          <button type="button" class="btn small" data-do="hint">📜 Hint</button>
          <button type="button" class="btn small" data-do="peek">👀 Peek <small>(danger +1)</small></button>
        </div>
        <div class="hint-box" hidden></div>
        <div class="esc-scene" role="img">
          <div class="esc-backdrop"></div>
          <div class="esc-stones"></div>
          <div class="esc-flood"></div>
          <div class="esc-sprite esc-danger"><div class="bounce"><img alt=""></div></div>
          <div class="esc-sprite esc-hero"><div class="bounce"><img alt=""></div></div>
          <div class="esc-splash" aria-hidden="true">💦</div>
          <div class="esc-sparkles" aria-hidden="true"></div>
          <div class="esc-curtain" aria-live="assertive">
            <h2>Try again!</h2>
            <p class="esc-lose-msg"></p>
            <p>The word was <b class="esc-answer"></b></p>
            <div class="btn-row center">
              <button type="button" class="btn primary" data-do="retry">↺ Try this word again</button>
              <button type="button" class="btn" data-do="next">➡ Next word</button>
            </div>
          </div>
        </div>
        <div class="danger-meter"><span class="meter-label"></span><div class="meter"><i></i></div><span class="meter-icon"></span></div>
        <div class="esc-msg" aria-live="polite"></div>
        <div class="kb-wrap"></div>
      </div>`;

    const $ = sel => Util.$(sel, body);
    const frame = $('.esc-scene');
    const kb = UI.keyboard(handleKey, { extra: ["'", '-'] });
    $('.kb-wrap').appendChild(kb);

    /* Helpers handed to the scene layouts */
    const scene = {
      $, frame,
      hero: $('.esc-hero'),
      danger: $('.esc-danger'),
      get theme() { return ESCAPE_THEMES[themeKey]; },
      place(el, left, bottom, width) {
        el.style.left = left + '%';
        el.style.bottom = bottom + '%';
        if (width !== undefined) el.style.width = width + 'cqw';
      },
      later(fn, ms) { timers.push(setTimeout(fn, ms)); },
      setHeroImg(file) { Util.$('img', scene.hero).src = IMG_DIR + 'characters/' + file; },
      splashAt(left, bottom) { const sp = $('.esc-splash'); sp.style.left = left + '%'; sp.style.bottom = bottom + '%'; },
      hop() { scene.hero.classList.remove('hop'); void scene.hero.offsetWidth; scene.hero.classList.add('hop'); },
    };
    const layout = () => EscapeScenes[themeKey];

    /* ---------- word setup ---------- */
    function maxDangerFor(len) { return len <= 4 ? 4 : len <= 7 ? 5 : 6; }
    function creepSecondsFor(len) { return 6 + len * 0.7; }

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function startWord() {
      clearTimers();
      const w = words[idx];
      const letters = w.word.split('');
      st = {
        w, letters, pos: 0, danger: 0, max: maxDangerFor(letters.length),
        peeked: false, wrongs: 0, mode: 'typing', lastAction: Date.now(),
      };
      skipNonLetters();
      $('.hint-box').hidden = true;
      $('.esc-msg').innerHTML = '';
      kb.reset();
      buildScene();
      render();
      scene.later(() => Speech.speak(w.word), 350);
      startCreep();
    }

    function skipNonLetters() {
      while (st.pos < st.letters.length && !Util.isLetter(st.letters[st.pos])) st.pos++;
    }

    /* ---------- the scene ---------- */
    function buildScene() {
      const t = ESCAPE_THEMES[themeKey];
      frame.className = `esc-scene scene-${themeKey}`;
      frame.setAttribute('aria-label', t.goal);
      $('.esc-backdrop').style.backgroundImage = `url('${IMG_DIR}backgrounds/${t.bg}')`;
      $('.esc-backdrop').style.backgroundPosition = t.bgPos;
      scene.setHeroImg(t.hero);
      scene.hero.style.opacity = '';
      scene.danger.hidden = !t.danger;
      if (t.danger) Util.$('img', scene.danger).src = IMG_DIR + 'characters/' + t.danger;
      $('.esc-stones').innerHTML = '';
      $('.esc-flood').style.height = '0';
      $('.esc-curtain').classList.remove('show');
      $('.esc-sparkles').innerHTML = (themeKey === 'castle' ? [[68, 30], [83, 36], [74, 16], [86, 20]]
        : themeKey === 'lake' ? [[70, 30], [80, 22], [76, 12], [88, 34]]
        : themeKey === 'forest' ? [[74, 30], [84, 22], [79, 12], [90, 36]]
        : [[80, 40], [90, 30], [84, 18], [94, 48]])
        .map(([l, tp], i) => `<span style="left:${l}%;top:${tp}%;animation-delay:${i * 0.35}s">${i === 2 ? '⭐' : '✨'}</span>`).join('');
      if (layout().build) layout().build(scene, st.letters);
      Util.$$('.theme-tab', body).forEach(b => b.classList.toggle('active', b.dataset.theme === themeKey));
      $('.esc-goal').textContent = t.goal;
      $('.meter-label').textContent = t.meter;
      $('.meter-icon').textContent = t.meterIcon;
    }

    /* ---------- word blanks + score + positions ---------- */
    function render(reveal = false) {
      $('.word-slots').innerHTML = st.letters.map((ch, i) => {
        const shown = i < st.pos || !Util.isLetter(ch) || reveal;
        const cls = i < st.pos ? 'filled' : (reveal && st.mode === 'lost') ? 'missed' : i === st.pos ? 'current' : '';
        return `<span class="slot ${cls}">${shown ? Util.esc(ch) : ''}</span>`;
      }).join('');
      const escaped = results.filter(r => r.escaped).length;
      $('.esc-score').innerHTML = `🏆 <b>${escaped}</b> safe · Word ${idx + 1} of ${words.length}`;
      const frac = Math.min(st.danger / st.max, 1);
      Util.$('.meter i', body).style.width = (frac * 100) + '%';
      Util.$('.danger-meter', body).classList.toggle('high', frac >= 0.6);
      if (st.mode === 'typing') layout().layout(scene, st.pos / st.letters.length, frac, st.pos);
    }

    /* ---------- input ---------- */
    function handleKey(key) {
      if (st.mode !== 'typing') return;
      const expected = st.letters[st.pos];
      if (key.toLowerCase() === expected.toLowerCase()) {
        st.pos++;
        st.lastAction = Date.now();
        skipNonLetters();
        kb.flash(key, 'good');
        Sound.play('hop');
        if (themeKey === 'river') scene.hop();
        if (st.pos >= st.letters.length) { render(); return scene.later(win, themeKey === 'river' ? 450 : 0); }
        render();
      } else {
        st.wrongs++;
        kb.flash(key, 'bad');
        addDanger(1);
      }
    }

    function addDanger(amount, quiet) {
      st.danger += amount;
      if (!quiet) Sound.play('wrong');
      frame.classList.remove('shake'); void frame.offsetWidth; frame.classList.add('shake');
      const cur = Util.$('.slot.current', body);
      if (cur && !quiet) { cur.classList.add('oops'); setTimeout(() => cur.classList.remove('oops'), 400); }
      if (st.danger >= st.max) return lose();
      render();
    }

    /* The danger creeps closer if nobody types for a while (optional setting). */
    function startCreep() {
      clearInterval(creepTimer);
      if (!Store.settings.chaseTimer) return;
      creepTimer = setInterval(() => {
        if (!st || st.mode !== 'typing' || document.hidden) return;
        if (Date.now() - st.lastAction > creepSecondsFor(st.letters.length) * 1000) {
          st.lastAction = Date.now();
          addDanger(0.5, true);
          $('.esc-msg').innerHTML = '⏰ Hurry — the danger is creeping closer!';
        }
      }, 500);
    }

    function win() {
      if (st.mode !== 'typing') return;
      st.mode = 'won';
      clearInterval(creepTimer);
      const ok = st.wrongs === 0 && !st.peeked;
      if (!results[idx]) { results[idx] = { w: st.w, ok, given: st.w.word, escaped: true }; ctx.record(st.w.word, ok); }
      else if (!results[idx].escaped) { results[idx].escaped = true; ctx.record(st.w.word, true); }
      render(true);
      layout().win(scene);
      Sound.play('win');
      UI.confetti(18);
      $('.esc-msg').innerHTML = `<b>${ESCAPE_THEMES[themeKey].win}</b>
        <div class="btn-row center"><button type="button" class="btn primary" data-do="next">Next word ➜</button></div>`;
      scene.later(nextWord, 3200);
    }

    function lose() {
      st.mode = 'lost';
      clearInterval(creepTimer);
      if (!results[idx]) { results[idx] = { w: st.w, ok: false, given: st.w.word.slice(0, st.pos) + '…', escaped: false }; }
      ctx.record(st.w.word, false);
      render(true);
      Sound.play('lose');
      $('.esc-msg').innerHTML = '';
      const fadeAt = layout().lose(scene, st.pos);
      scene.later(() => {
        $('.esc-lose-msg').textContent = ESCAPE_THEMES[themeKey].lose;
        $('.esc-answer').textContent = st.w.word;
        $('.esc-curtain').classList.add('show');
        const retry = Util.$('[data-do="retry"]', frame);
        if (retry) retry.focus();
      }, fadeAt);
    }

    function nextWord() {
      clearTimers();
      idx++;
      if (idx >= words.length) return finishGame();
      startWord();
    }

    function finishGame() {
      clearInterval(creepTimer);
      clearTimers();
      removeKeys();
      const safe = results.filter(r => r.escaped).length;
      UI.results(body, ctx, {
        rows: results.map(r => ({ w: r.w, ok: r.ok, given: r.ok ? '' : r.given })),
        title: `${ESCAPE_THEMES[themeKey].label} complete!`,
        scoreText: `You reached safety ${safe} of ${words.length} times · ${results.filter(r => r.ok).length} words with no mistakes`,
      });
    }

    /* ---------- buttons ---------- */
    body.onclick = e => {
      const tab = e.target.closest('.theme-tab');
      if (tab && st) {
        themeKey = tab.dataset.theme;
        Store.setSetting('theme', themeKey);
        startWord();          // restart this word in the new scene
        return;
      }
      const b = e.target.closest('[data-do]');
      if (!b || !st) return;
      switch (b.dataset.do) {
        case 'hear': Speech.speak(st.w.word); break;
        case 'hint': {
          const hint = $('.hint-box');
          const s = Sentences.blankSentence(st.w, ctx.grade);
          hint.hidden = false;
          hint.innerHTML = st.w.definition ? `📖 ${Util.esc(st.w.definition)}` : `💬 ${Util.esc(s.blanked)}`;
          Speech.speak(st.w.definition || s.sentence);
          break;
        }
        case 'peek':
          if (st.mode !== 'typing') break;
          st.peeked = true;
          if (st.danger + 1 < st.max) addDanger(1, true);
          render(true);
          setTimeout(() => { if (st.mode === 'typing') render(); }, 1500);
          break;
        case 'retry': startWord(); break;
        case 'next': nextWord(); break;
      }
    };

    const removeKeys = UI.onKeys(e => {
      if (!st) return;
      if (e.key === 'Enter' && st.mode === 'won') { e.preventDefault(); return nextWord(); }
      if (e.key === 'Enter' && st.mode === 'lost' && $('.esc-curtain').classList.contains('show')) { e.preventDefault(); return startWord(); }
      if (e.key.length === 1 && /[a-z'\-]/i.test(e.key)) { e.preventDefault(); handleKey(e.key); }
    });

    startWord();

    // Cleanup when leaving the activity.
    return () => { clearInterval(creepTimer); clearTimers(); removeKeys(); };
  },
};
