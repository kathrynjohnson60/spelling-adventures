/* =====================================================================
   Extra word games
     • Word Scramble   – tap letter tiles to unscramble the word
     • Missing Letters – fill in the 1–3 missing letters
     • Balloon Pop     – hangman-style, but wrong guesses just pop balloons
     • Speed Round     – spell as many as you can before time runs out
     • Listen & Type   – audio only, no pictures or hints
   Every game reports right/wrong to the shared "missed words" list.
   ===================================================================== */
'use strict';

/* Shared "hear it / hint" buttons used by several games. */
function wordTools(w, ctx, { hint = true } = {}) {
  return `
    <div class="btn-row center tools">
      <button type="button" class="btn small" data-tool="hear">🔊 Hear it</button>
      ${hint ? `<button type="button" class="btn small" data-tool="meaning">📖 Meaning</button>` : ''}
    </div>
    <div class="hint-box" hidden></div>`;
}
function handleTool(e, w, ctx, body) {
  const b = e.target.closest('[data-tool]');
  if (!b) return false;
  if (b.dataset.tool === 'hear') Speech.speak(w.word);
  if (b.dataset.tool === 'meaning') {
    const box = Util.$('.hint-box', body);
    const s = Sentences.blankSentence(w, ctx.grade);
    box.hidden = false;
    box.innerHTML = w.definition ? `📖 ${Util.esc(w.definition)}` : `💬 ${Util.esc(s.blanked)}`;
    Speech.speak(w.definition || s.sentence);
  }
  return true;
}

/* ---------------------------------------------------------------- */
Activities.scramble = {
  title: 'Word Scramble',
  icon: '🔀',
  color: '#fd79a8',
  desc: 'Unscramble the letter tiles.',
  minWords: 1,

  start(root, ctx) {
    const { body } = UI.shell(root, ctx, this);
    let current = null; // keyboard handler for the current round

    UI.rounds(body, ctx, Util.shuffle(ctx.words), (w, api) => {
      const target = w.word.split('');
      // Shuffle until the order differs from the real word (when possible).
      let tiles = Util.shuffle(target);
      for (let k = 0; k < 12 && tiles.join('') === w.word && new Set(target).size > 1; k++) tiles = Util.shuffle(target);
      let placed = [];      // indexes into tiles, in answer order
      let tries = 0;
      let hints = 0;
      let done = false;

      body.innerHTML = `
        <div class="card play-card pop-in">
          ${UI.progress(api.index, api.total)}
          <p class="muted center">Tap the tiles (or type) to spell the word.</p>
          <div class="answer-slots"></div>
          <div class="tile-pool"></div>
          ${wordTools(w, ctx)}
          <div class="feedback" aria-live="polite"></div>
          <div class="btn-row center">
            <button type="button" class="btn ghost" data-do="clear">↩ Clear</button>
            <button type="button" class="btn" data-do="hint">💡 Hint</button>
            <button type="button" class="btn primary" data-do="check">✅ Check</button>
          </div>
        </div>`;
      const fb = Util.$('.feedback', body);
      setTimeout(() => Speech.speak(w.word), 300);

      function draw(markWrong = false) {
        Util.$('.answer-slots', body).innerHTML = target.map((ch, i) => {
          const t = placed[i];
          const letter = t === undefined ? '' : tiles[t];
          const wrong = markWrong && letter && letter.toLowerCase() !== ch.toLowerCase();
          return `<button type="button" class="tile slot-tile ${letter ? 'full' : ''} ${wrong ? 'wrong' : ''} ${done ? 'right' : ''}" data-slot="${i}">${Util.esc(letter)}</button>`;
        }).join('');
        Util.$('.tile-pool', body).innerHTML = tiles.map((ch, i) =>
          `<button type="button" class="tile ${placed.includes(i) ? 'used' : ''}" data-tile="${i}" ${placed.includes(i) ? 'disabled' : ''}>${Util.esc(ch)}</button>`).join('');
      }

      function add(i) {
        if (done || placed.includes(i) || placed.length >= target.length) return;
        placed.push(i);
        Sound.play('click');
        draw();
        if (placed.length === target.length) check();
      }

      function check() {
        if (done) return;
        const built = placed.map(i => tiles[i]).join('');
        if (placed.length < target.length) { fb.className = 'feedback'; fb.textContent = 'Use all the tiles first!'; return; }
        if (Util.norm(built) === Util.norm(w.word)) {
          done = true;
          draw();
          Sound.play('correct');
          fb.className = 'feedback good';
          fb.innerHTML = `✅ Yes! <b>${Util.esc(w.word)}</b>`;
          setTimeout(() => api.done(tries === 0 && hints === 0, built), 1200);
        } else {
          tries++;
          Sound.play('wrong');
          draw(true);
          Util.$('.answer-slots', body).classList.add('shake');
          setTimeout(() => Util.$('.answer-slots', body)?.classList.remove('shake'), 500);
          if (tries >= 3) {
            done = true;
            fb.className = 'feedback bad';
            fb.innerHTML = `The word is <b>${Util.esc(w.word)}</b>. <button type="button" class="btn small" data-do="next">➡ Next</button>`;
          } else {
            fb.className = 'feedback bad';
            fb.textContent = 'Not quite! Tap a red tile to move it back, then try again.';
          }
        }
      }

      current = e => {
        if (e.key === 'Backspace') { e.preventDefault(); if (!done && placed.length) { placed.pop(); draw(); } return; }
        if (e.key === 'Enter') { e.preventDefault(); return check(); }
        if (e.key.length !== 1) return;
        const i = tiles.findIndex((ch, k) => ch.toLowerCase() === e.key.toLowerCase() && !placed.includes(k));
        if (i >= 0) add(i);
      };

      body.onclick = e => {
        if (handleTool(e, w, ctx, body)) return;
        const tile = e.target.closest('[data-tile]');
        if (tile) return add(+tile.dataset.tile);
        const slot = e.target.closest('[data-slot]');
        if (slot && !done) { placed.splice(+slot.dataset.slot, 1); draw(); return; }
        const b = e.target.closest('[data-do]');
        if (!b) return;
        if (b.dataset.do === 'clear' && !done) { placed = []; draw(); }
        if (b.dataset.do === 'check') check();
        if (b.dataset.do === 'next') api.done(false, placed.map(i => tiles[i]).join(''));
        if (b.dataset.do === 'hint' && !done) {
          hints++;
          // Keep the correct beginning, then add the next correct letter.
          let keep = 0;
          while (keep < placed.length && tiles[placed[keep]].toLowerCase() === target[keep].toLowerCase()) keep++;
          placed = placed.slice(0, keep);
          if (keep < target.length) {
            const i = tiles.findIndex((ch, k) => ch.toLowerCase() === target[keep].toLowerCase() && !placed.includes(k));
            if (i >= 0) add(i); else draw();
          }
        }
      };
      draw();
    });

    const off = UI.onKeys(e => current && current(e));
    return off;
  },
};

/* ---------------------------------------------------------------- */
Activities.missing = {
  title: 'Missing Letters',
  icon: '🔍',
  color: '#0984e3',
  desc: 'Fill in the missing letters.',
  minWords: 1,

  start(root, ctx) {
    const { body } = UI.shell(root, ctx, this);

    UI.rounds(body, ctx, Util.shuffle(ctx.words), (w, api) => {
      const chars = w.word.split('');
      const letterIdx = chars.map((c, i) => (Util.isLetter(c) ? i : -1)).filter(i => i >= 0);
      const count = letterIdx.length <= 4 ? 1 : letterIdx.length <= 8 ? 2 : 3;
      const blanks = new Set(Util.shuffle(letterIdx).slice(0, Math.min(count, letterIdx.length)));
      let tries = 0;
      let done = false;

      body.innerHTML = `
        <div class="card play-card pop-in">
          ${UI.progress(api.index, api.total)}
          <p class="muted center">Which ${blanks.size === 1 ? 'letter is' : 'letters are'} missing?</p>
          <form class="missing-word" autocomplete="off">
            ${chars.map((c, i) => blanks.has(i)
              ? `<input class="blank-in" data-i="${i}" maxlength="1" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Missing letter">`
              : `<span class="given-letter">${Util.esc(c)}</span>`).join('')}
            <button type="submit" hidden></button>
          </form>
          ${wordTools(w, ctx)}
          <div class="feedback" aria-live="polite"></div>
          <div class="btn-row center"><button type="button" class="btn primary big" data-do="check">✅ Check</button></div>
        </div>`;
      const inputs = Util.$$('.blank-in', body);
      const fb = Util.$('.feedback', body);
      inputs[0].focus();
      setTimeout(() => Speech.speak(w.word), 300);

      inputs.forEach((inp, k) => {
        inp.addEventListener('input', () => {
          inp.value = inp.value.slice(-1);
          inp.classList.remove('wrong');
          if (inp.value && inputs[k + 1]) inputs[k + 1].focus();
        });
        inp.addEventListener('keydown', e => {
          if (e.key === 'Backspace' && !inp.value && inputs[k - 1]) inputs[k - 1].focus();
        });
      });

      function check() {
        if (done) return;
        if (inputs.some(i => !i.value)) { fb.className = 'feedback'; fb.textContent = 'Fill in every box first!'; return; }
        let allRight = true;
        inputs.forEach(inp => {
          const right = inp.value.toLowerCase() === chars[+inp.dataset.i].toLowerCase();
          inp.classList.toggle('wrong', !right);
          inp.classList.toggle('right', right);
          if (!right) allRight = false;
        });
        const given = chars.map((c, i) => (blanks.has(i) ? Util.$(`.blank-in[data-i="${i}"]`, body).value : c)).join('');
        if (allRight) {
          done = true;
          Sound.play('correct');
          fb.className = 'feedback good';
          fb.innerHTML = `✅ Great! <b>${Util.esc(w.word)}</b>`;
          setTimeout(() => api.done(tries === 0, given), 1200);
        } else {
          tries++;
          Sound.play('wrong');
          if (tries >= 2) {
            done = true;
            inputs.forEach(inp => { inp.value = chars[+inp.dataset.i]; inp.disabled = true; });
            fb.className = 'feedback bad';
            fb.innerHTML = `The word is <b>${Util.esc(w.word)}</b>. <button type="button" class="btn small" data-do="next">➡ Next</button>`;
            Util.$('[data-do=next]', body).focus();
            body._given = given;
          } else {
            fb.className = 'feedback bad';
            fb.textContent = 'Almost! Fix the red box and try again.';
            (inputs.find(i => i.classList.contains('wrong')) || inputs[0]).select();
          }
        }
      }

      Util.$('.missing-word', body).onsubmit = e => { e.preventDefault(); check(); };
      body.onclick = e => {
        if (handleTool(e, w, ctx, body)) return;
        const b = e.target.closest('[data-do]');
        if (b && b.dataset.do === 'check') check();
        if (b && b.dataset.do === 'next') api.done(false, body._given);
      };
    });
  },
};

/* ---------------------------------------------------------------- */
Activities.balloon = {
  title: 'Balloon Pop',
  icon: '🎈',
  color: '#e17055',
  desc: 'Guess the letters before the balloons pop!',
  minWords: 1,

  start(root, ctx) {
    const { body } = UI.shell(root, ctx, this);
    const BALLOONS = 6;
    const COLORS = [0, 60, 120, 200, 270, 320];
    let current = null;

    UI.rounds(body, ctx, Util.shuffle(ctx.words), (w, api) => {
      const chars = w.word.split('');
      const guessed = new Set();
      let wrong = 0;
      let done = false;

      body.innerHTML = `
        <div class="card play-card pop-in">
          ${UI.progress(api.index, api.total)}
          <div class="balloon-scene">
            <div class="balloons">${COLORS.map((h, i) => `<span class="balloon" data-b="${i}" style="--h:${h}deg">🎈</span>`).join('')}</div>
            <div class="basket">🧒<br>🧺</div>
            <div class="grass">🌼🌱🌷🌱🌼🌱🌷</div>
          </div>
          <div class="word-slots small"></div>
          ${wordTools(w, ctx)}
          <div class="feedback" aria-live="polite"></div>
          <div class="kb-wrap"></div>
        </div>`;
      const fb = Util.$('.feedback', body);
      const kb = UI.keyboard(guess);
      Util.$('.kb-wrap', body).appendChild(kb);
      setTimeout(() => Speech.speak(w.word), 300);

      function draw(reveal = false) {
        Util.$('.word-slots', body).innerHTML = chars.map(c => {
          const show = !Util.isLetter(c) || guessed.has(c.toLowerCase());
          return `<span class="slot ${show ? 'filled' : reveal ? 'missed' : ''}">${show || reveal ? Util.esc(c) : ''}</span>`;
        }).join('');
        Util.$('.basket', body).style.transform = `translateY(${wrong * 9}px)`;
      }

      function guess(letter) {
        letter = letter.toLowerCase();
        if (done || !Util.isLetter(letter) || guessed.has(letter)) return;
        guessed.add(letter);
        kb.disable(letter);
        if (chars.some(c => c.toLowerCase() === letter)) {
          kb.mark(letter, 'good');
          Sound.play('correct');
          draw();
          if (chars.every(c => !Util.isLetter(c) || guessed.has(c.toLowerCase()))) {
            done = true;
            Sound.play('win');
            fb.className = 'feedback good';
            fb.innerHTML = `🎉 You spelled <b>${Util.esc(w.word)}</b>!`;
            setTimeout(() => api.done(wrong < 3, w.word), 1500);
          }
        } else {
          kb.mark(letter, 'bad');
          const b = Util.$(`.balloon[data-b="${wrong}"]`, body);
          if (b) { b.classList.add('popped'); b.textContent = '💥'; }
          wrong++;
          Sound.play('pop');
          draw();
          if (wrong >= BALLOONS) {
            done = true;
            draw(true);
            Sound.play('lose');
            fb.className = 'feedback bad';
            fb.innerHTML = `Bump! A soft landing in the flowers. 🌼 The word is <b>${Util.esc(w.word)}</b>.
              <button type="button" class="btn small" data-do="next">➡ Next</button>`;
          }
        }
      }

      current = e => {
        if (e.key === 'Enter' && done && Util.$('[data-do=next]', body)) return api.done(false, '');
        if (e.key.length === 1) guess(e.key);
      };
      body.onclick = e => {
        if (handleTool(e, w, ctx, body)) return;
        if (e.target.closest('[data-do=next]')) api.done(false, '');
      };
      draw();
    });

    return UI.onKeys(e => current && current(e));
  },
};

/* ---------------------------------------------------------------- */
Activities.speed = {
  title: 'Speed Round',
  icon: '⚡',
  color: '#fdcb6e',
  desc: 'How many words can you spell before time runs out?',
  minWords: 1,

  start(root, ctx) {
    const { body } = UI.shell(root, ctx, this);
    let timer = null;

    function setup() {
      clearInterval(timer);
      body.innerHTML = `
        <div class="card setup-card pop-in center">
          <h2>⚡ Speed Round</h2>
          <p>Hear a word, type it, press <b>Enter</b>. Go as fast as you can!</p>
          <div class="choice-row center">
            ${[60, 90, 120].map((s, i) => `<label class="choice"><input type="radio" name="secs" value="${s}" ${i === 0 ? 'checked' : ''}>
              <span>${s / 60 === 1 ? '1 minute' : s === 90 ? '1½ minutes' : '2 minutes'}<small>Best: ${Store.getBest(ctx.list.id, 'speed' + s)}${ctx.subset ? ' (full list)' : ''}</small></span></label>`).join('')}
          </div>
          <div class="btn-row center"><button type="button" class="btn primary big" data-do="go">🏁 Ready, set, go!</button></div>
        </div>`;
      Util.$('[data-do=go]', body).onclick = () => countdown(+Util.$('input[name=secs]:checked', body).value);
    }

    async function countdown(secs) {
      for (const n of ['3', '2', '1', 'Go!']) {
        body.innerHTML = `<div class="countdown pop-in">${n}</div>`;
        Sound.play(n === 'Go!' ? 'correct' : 'tick');
        await Util.sleep(650);
        if (!body.isConnected) return;
      }
      play(secs);
    }

    function play(secs) {
      let queue = Util.shuffle(ctx.words);
      let w = null;
      let score = 0;
      const rows = [];
      const end = Date.now() + secs * 1000;

      body.innerHTML = `
        <div class="card play-card">
          <div class="speed-top">
            <span class="speed-score">⭐ <b>0</b></span>
            <div class="bar timer-bar"><i style="width:100%"></i></div>
            <span class="speed-time">${secs}s</span>
          </div>
          <button type="button" class="big-speaker" data-do="hear" aria-label="Hear the word">🔊</button>
          <form class="answer-form" autocomplete="off">
            <input class="answer-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Type the word" placeholder="Type and press Enter">
            <button type="submit" class="btn primary big">⏎</button>
          </form>
          <div class="feedback" aria-live="polite"></div>
          <div class="btn-row center"><button type="button" class="btn ghost" data-do="pass">⏭ Pass</button></div>
        </div>`;
      const input = Util.$('.answer-input', body);
      const fb = Util.$('.feedback', body);

      function nextWord() {
        if (!queue.length) queue = Util.shuffle(ctx.words);
        w = queue.pop();
        input.value = '';
        input.focus();
        Speech.speak(w.word);
      }
      function answer(given) {
        const ok = Util.norm(given) === Util.norm(w.word);
        rows.push({ w, ok, given });
        ctx.record(w.word, ok);
        if (ok) {
          score++;
          Util.$('.speed-score b', body).textContent = score;
          Sound.play('correct');
          fb.className = 'feedback good';
          fb.textContent = '✅ ' + w.word;
        } else {
          Sound.play('wrong');
          fb.className = 'feedback bad';
          fb.innerHTML = `❌ It's <b>${Util.esc(w.word)}</b>`;
        }
        nextWord();
      }

      Util.$('.answer-form', body).onsubmit = e => {
        e.preventDefault();
        if (input.value.trim()) answer(input.value);
      };
      body.onclick = e => {
        const b = e.target.closest('[data-do]');
        if (!b) return;
        if (b.dataset.do === 'hear') { Speech.speak(w.word); input.focus(); }
        if (b.dataset.do === 'pass') answer('');
      };

      timer = setInterval(() => {
        const left = Math.max(0, end - Date.now());
        Util.$('.timer-bar i', body).style.width = (left / (secs * 1000)) * 100 + '%';
        Util.$('.speed-time', body).textContent = Math.ceil(left / 1000) + 's';
        if (left <= 10000) Util.$('.timer-bar', body).classList.add('low');
        if (left <= 0) {
          clearInterval(timer);
          Speech.stop();
          const isBest = !ctx.subset && Store.setBest(ctx.list.id, 'speed' + secs, score);
          UI.results(body, ctx, {
            rows,
            title: isBest ? `🏆 New best score: ${score}!` : `Time's up! You spelled ${score} ${score === 1 ? 'word' : 'words'}!`,
            scoreText: `${score} correct in ${secs} seconds`,
          });
        }
      }, 200);
      nextWord();
    }

    setup();
    return () => clearInterval(timer);
  },
};

/* ---------------------------------------------------------------- */
Activities.listen = {
  title: 'Listen & Type',
  icon: '🎧',
  color: '#a29bfe',
  desc: 'Audio-only practice — just listen and type.',
  minWords: 1,

  start(root, ctx) {
    const { body } = UI.shell(root, ctx, this);

    UI.rounds(body, ctx, Util.shuffle(ctx.words), (w, api) => {
      let tries = 0;
      let done = false;
      body.innerHTML = `
        <div class="card play-card pop-in">
          ${UI.progress(api.index, api.total)}
          <div class="listen-buttons">
            <button type="button" class="big-speaker" data-do="hear" aria-label="Play the word">🎧</button>
            <button type="button" class="btn" data-do="slow">🐢 Slowly</button>
          </div>
          <form class="answer-form" autocomplete="off">
            <input class="answer-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Type what you hear" placeholder="Type what you hear">
            <button type="submit" class="btn primary big">✅ Check</button>
          </form>
          <div class="feedback" aria-live="polite"></div>
        </div>`;
      const input = Util.$('.answer-input', body);
      const fb = Util.$('.feedback', body);
      input.focus();
      setTimeout(() => Speech.speak(w.word), 300);

      Util.$('.answer-form', body).onsubmit = e => {
        e.preventDefault();
        if (done) return api.done(false, input.value);
        const given = input.value.trim();
        if (!given) return input.focus();
        if (Util.norm(given) === Util.norm(w.word)) {
          done = true;
          Sound.play('correct');
          fb.className = 'feedback good';
          fb.innerHTML = `✅ Perfect! <b>${Util.esc(w.word)}</b>`;
          setTimeout(() => api.done(tries === 0, given), 1100);
        } else if (tries === 0) {
          tries++;
          Sound.play('wrong');
          fb.className = 'feedback bad';
          fb.textContent = '👂 Close! Listen again and try once more.';
          input.select();
          setTimeout(() => Speech.speak(w.word, { rate: 0.7 }), 400);
        } else {
          done = true;
          Sound.play('wrong');
          fb.className = 'feedback bad';
          fb.innerHTML = `The word is <b>${Util.esc(w.word)}</b>
            <div class="diff-line">${Util.letterDiff(given, w.word)}</div>
            <small>Press Enter or tap Next to keep going.</small>
            <div><button type="button" class="btn small" data-do="next">➡ Next</button></div>`;
          input.disabled = false;
          input.readOnly = true;
          input.focus();
        }
      };
      body.onclick = e => {
        const b = e.target.closest('[data-do]');
        if (!b) return;
        if (b.dataset.do === 'hear') Speech.speak(w.word);
        if (b.dataset.do === 'slow') Speech.speak(w.word, { rate: 0.5 });
        if (b.dataset.do === 'next') api.done(false, input.value);
        if (!done) input.focus();
      };
    });
  },
};
