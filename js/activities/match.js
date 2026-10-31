/* =====================================================================
   Memory Match
   Classic flip-two-cards memory game. Each word has a partner card:
     • Picture & sound – shows a picture (when we have one) and SAYS the word
     • Definition      – shows the word's definition
     • Same word       – easiest: match the word to itself
   Grid size adjusts to how many pairs are chosen.
   ===================================================================== */
'use strict';

/* Simple illustrations for common spelling words. Words not listed get a 🔊 card. */
const WORD_EMOJI = {
  cat: '🐱', dog: '🐶', pig: '🐷', cow: '🐮', hen: '🐔', fox: '🦊', bat: '🦇', bug: '🐛', ant: '🐜', bee: '🐝',
  fish: '🐟', frog: '🐸', duck: '🦆', bird: '🐦', owl: '🦉', bear: '🐻', lion: '🦁', tiger: '🐯', horse: '🐴',
  sheep: '🐑', goat: '🐐', mouse: '🐭', rabbit: '🐰', bunny: '🐰', turtle: '🐢', snake: '🐍', whale: '🐋',
  shark: '🦈', crab: '🦀', snail: '🐌', monkey: '🐵', panda: '🐼', zebra: '🦓', elephant: '🐘', giraffe: '🦒',
  dragon: '🐉', dinosaur: '🦕', butterfly: '🦋', spider: '🕷️', puppy: '🐶', kitten: '🐱', unicorn: '🦄',
  hat: '🎩', cap: '🧢', map: '🗺️', bag: '👜', backpack: '🎒', sun: '☀️', sunshine: '🌞', moon: '🌙', star: '⭐',
  cloud: '☁️', rain: '🌧️', snow: '❄️', rainbow: '🌈', tree: '🌳', leaf: '🍃', flower: '🌸', rose: '🌹',
  apple: '🍎', banana: '🍌', grapes: '🍇', peach: '🍑', pear: '🍐', lemon: '🍋', cake: '🎂', pie: '🥧',
  bread: '🍞', cheese: '🧀', egg: '🥚', milk: '🥛', cookie: '🍪', pizza: '🍕', corn: '🌽', carrot: '🥕',
  bus: '🚌', car: '🚗', truck: '🚚', train: '🚆', plane: '✈️', boat: '⛵', ship: '🚢', rocket: '🚀', bike: '🚲',
  ball: '⚽', football: '🏈', kite: '🪁', book: '📖', pen: '🖊️', pencil: '✏️', crayon: '🖍️', bed: '🛏️',
  house: '🏠', home: '🏡', castle: '🏰', tent: '⛺', key: '🔑', bell: '🔔', box: '📦', clock: '⏰', lamp: '💡',
  heart: '❤️', ring: '💍', crown: '👑', king: '🤴', queen: '👸', baby: '👶', teeth: '🦷', tooth: '🦷', eye: '👁️',
  hand: '✋', foot: '🦶', beach: '🏖️', island: '🏝️', mountain: '⛰️', volcano: '🌋', ocean: '🌊', fire: '🔥',
  birthday: '🎂', gift: '🎁', party: '🎉', music: '🎵', drum: '🥁', guitar: '🎸', robot: '🤖', telescope: '🔭',
  microscope: '🔬', magnet: '🧲', globe: '🌎', earth: '🌍', planet: '🪐', web: '🕸️', nest: '🪺', shell: '🐚',
  green: '🟢', red: '🔴', blue: '🔵', yellow: '🟡', orange: '🟠', purple: '🟣', brown: '🟤', sad: '😢',
  happy: '😀', sleep: '😴', dream: '💭', run: '🏃', ran: '🏃', swim: '🏊', jump: '🦘', playground: '🛝',
  kindness: '💗', energy: '⚡', gravity: '🍎', habitat: '🏞️', autograph: '✍️', snowman: '⛄', sandwich: '🥪',
};
const emojiFor = word => {
  const w = Util.norm(word);
  return WORD_EMOJI[w] || WORD_EMOJI[w.replace(/e?s$/, '')] || '';
};

Activities.match = {
  title: 'Memory Match',
  icon: '🃏',
  color: '#00b894',
  desc: 'Flip cards to find the matching pairs.',
  minWords: 2,

  start(root, ctx) {
    const { body } = UI.shell(root, ctx, this);
    const withDef = ctx.words.filter(w => w.definition);
    let lastSetup = null;
    let timer = null;

    /* ---------- setup screen ---------- */
    function setup() {
      clearInterval(timer);
      const n = ctx.words.length;
      const sizes = [...new Set([2, 3, 4, 6, 8, 10, 12].filter(s => s <= n).concat(n <= 12 ? [n] : []))].sort((a, b) => a - b);
      const def = lastSetup ? lastSetup.pairs : Math.min(6, n);
      body.innerHTML = `
        <div class="card setup-card pop-in">
          <h2>🃏 Set up your game</h2>
          <fieldset>
            <legend>How many pairs?</legend>
            <div class="choice-row">
              ${sizes.map(s => `<label class="choice"><input type="radio" name="pairs" value="${s}" ${s === def ? 'checked' : ''}><span>${s} pairs<small>${s * 2} cards</small></span></label>`).join('')}
            </div>
          </fieldset>
          <fieldset>
            <legend>Match each word with…</legend>
            <div class="choice-row">
              <label class="choice"><input type="radio" name="mode" value="sound" checked><span>🖼️🔊 Picture & sound<small>Hear the word when you flip</small></span></label>
              <label class="choice ${withDef.length < 2 ? 'disabled' : ''}"><input type="radio" name="mode" value="definition" ${withDef.length < 2 ? 'disabled' : ''}><span>📖 Definition<small>${withDef.length < 2 ? 'Add definitions in the list editor' : 'Read and match the meaning'}</small></span></label>
              <label class="choice"><input type="radio" name="mode" value="same"><span>🔤 Same word<small>Easiest — great for little ones</small></span></label>
            </div>
          </fieldset>
          <div class="btn-row center"><button type="button" class="btn primary big" data-do="start">▶ Start matching</button></div>
        </div>`;
      if (lastSetup) {
        const m = Util.$(`input[name=mode][value=${lastSetup.mode}]`, body);
        if (m && !m.disabled) m.checked = true;
      }
      Util.$('[data-do=start]', body).onclick = () => {
        const pairs = +Util.$('input[name=pairs]:checked', body).value;
        const mode = Util.$('input[name=mode]:checked', body).value;
        play(pairs, mode);
      };
    }

    /* ---------- the game ---------- */
    function play(pairs, mode) {
      lastSetup = { pairs, mode };
      const pool = mode === 'definition' ? withDef : ctx.words;
      const chosen = Util.shuffle(pool).slice(0, Math.min(pairs, pool.length));
      const cards = Util.shuffle(chosen.flatMap((w, i) => [{ id: i, kind: 'word', w }, { id: i, kind: mode, w }]));
      const n = cards.length;
      const cols = n <= 6 ? 3 : n <= 8 ? 4 : n <= 10 ? 5 : 6;
      let open = [];
      let lock = false;
      let moves = 0;
      let found = 0;
      const t0 = Date.now();

      const face = c => {
        if (c.kind === 'word' || c.kind === 'same') return `<span class="mword">${Util.esc(c.w.word)}</span>`;
        if (c.kind === 'definition') return `<span class="mdef">${Util.esc(c.w.definition)}</span>`;
        const pic = emojiFor(c.w.word);
        return `<span class="mpic">${pic || '🔊'}</span><small>${pic ? '🔊' : 'listen'}</small>`;
      };

      body.innerHTML = `
        <div class="match-top">
          <span>🔁 Moves: <b class="m-moves">0</b></span>
          <span>✅ Pairs: <b class="m-found">0</b> / ${chosen.length}</span>
          <span>⏱ <b class="m-time">0:00</b></span>
          <button type="button" class="btn small ghost" data-do="setup">⚙️ New game</button>
        </div>
        <div class="match-grid" style="--cols:${cols}">
          ${cards.map((c, i) => `
            <button type="button" class="mcard ${c.kind === 'word' ? 'is-word' : 'is-partner'}" data-i="${i}" aria-label="Hidden card">
              <span class="mcard-inner">
                <span class="mface mback">❓</span>
                <span class="mface mfront">${face(c)}</span>
              </span>
            </button>`).join('')}
        </div>`;

      clearInterval(timer);
      timer = setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        const el = Util.$('.m-time', body);
        if (el) el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      }, 1000);

      Util.$('[data-do=setup]', body).onclick = setup;
      Util.$('.match-grid', body).onclick = e => {
        const el = e.target.closest('.mcard');
        if (!el || lock || el.classList.contains('flipped')) return;
        const c = cards[+el.dataset.i];
        el.classList.add('flipped');
        el.setAttribute('aria-label', c.kind === 'definition' ? c.w.definition : c.w.word);
        Sound.play('flip');
        if (c.kind === 'sound') Speech.speak(c.w.word);
        open.push(el);
        if (open.length < 2) return;

        moves++;
        Util.$('.m-moves', body).textContent = moves;
        const [a, b] = open.map(x => cards[+x.dataset.i]);
        if (a.id === b.id) {
          open.forEach(x => x.classList.add('matched'));
          open = [];
          found++;
          Util.$('.m-found', body).textContent = found;
          Sound.play('correct');
          if (c.kind !== 'sound') setTimeout(() => Speech.speak(a.w.word), 150);
          if (found === chosen.length) setTimeout(() => finish(moves, chosen.length, t0), 700);
        } else {
          lock = true;
          setTimeout(() => {
            open.forEach(x => { x.classList.remove('flipped'); x.setAttribute('aria-label', 'Hidden card'); });
            open = [];
            lock = false;
          }, 1100);
        }
      };
    }

    function finish(moves, pairs, t0) {
      clearInterval(timer);
      const secs = Math.round((Date.now() - t0) / 1000);
      const stars = moves <= pairs * 1.5 ? 3 : moves <= pairs * 2.2 ? 2 : 1;
      Sound.play('win');
      UI.confetti();
      body.innerHTML = `
        <div class="card results pop-in">
          <div class="stars">${'⭐'.repeat(stars)}${'<span class="star-empty">★</span>'.repeat(3 - stars)}</div>
          <h2>You found all ${pairs} pairs! 🎉</h2>
          <p class="score">${moves} moves · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</p>
          <div class="btn-row center">
            <button type="button" class="btn primary" data-do="again">🔁 Play again</button>
            <button type="button" class="btn" data-do="setup">⚙️ Change setup</button>
            <a class="btn ghost" href="#/list/${ctx.list.id}">🧩 More activities</a>
          </div>
        </div>`;
      Util.$('[data-do=again]', body).onclick = () => play(lastSetup.pairs, lastSetup.mode);
      Util.$('[data-do=setup]', body).onclick = setup;
    }

    setup();
    return () => clearInterval(timer);
  },
};
