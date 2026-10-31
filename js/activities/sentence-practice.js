/* =====================================================================
   Sentence Generator
   Three tabs:
     • Sentences     – pick a word, see 3–5 sentences that use it
     • Story         – a short paragraph that uses several list words
     • Fill the Blank – "use it in a sentence" practice; type the missing word
   Sentences come from sentences.js (no internet needed).
   ===================================================================== */
'use strict';

Activities.sentences = {
  title: 'Sentence Builder',
  icon: '💬',
  color: '#55a3ff',
  desc: 'See each word used in sentences and stories.',
  minWords: 1,

  start(root, ctx) {
    const { body } = UI.shell(root, ctx, this);
    const state = { tab: 'sentences', word: ctx.words[0], count: 4, sentences: [], story: null };

    body.innerHTML = `
      <div class="tabs" role="tablist">
        <button type="button" class="tab" data-tab="sentences">💬 Sentences</button>
        <button type="button" class="tab" data-tab="story">📚 Story</button>
        <button type="button" class="tab" data-tab="blank">✏️ Fill the blank</button>
      </div>
      <div class="sp-content"></div>`;
    const content = Util.$('.sp-content', body);

    /* ---------- Sentences tab ---------- */
    function renderSentences(regen = true) {
      if (regen) state.sentences = Sentences.generate(state.word, ctx.grade, state.count);
      content.innerHTML = `
        <div class="card">
          <p class="muted">Pick a word:</p>
          <div class="chip-row">${ctx.words.map((w, i) =>
            `<button type="button" class="chip ${w === state.word ? 'active' : ''}" data-word="${i}">${Util.esc(w.word)}</button>`).join('')}</div>
        </div>
        <div class="card sentence-card pop-in">
          <div class="sentence-head">
            <h2>${Util.esc(state.word.word)} <button type="button" class="btn small" data-say="${Util.esc(state.word.word)}">🔊</button></h2>
            ${state.word.definition ? `<p class="muted">📖 ${Util.esc(state.word.definition)}</p>` : ''}
          </div>
          <ol class="sentence-list">
            ${state.sentences.map(s => `<li><span>${Sentences.highlight(s, state.word.word)}</span>
              <button type="button" class="btn small ghost" data-say="${Util.esc(s)}" aria-label="Read sentence aloud">🔊</button></li>`).join('')}
          </ol>
          <div class="btn-row">
            <label class="inline">How many?
              <select data-opt="count">${[3, 4, 5].map(n => `<option ${n === state.count ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <button type="button" class="btn primary" data-do="regen">🔄 New sentences</button>
          </div>
          <p class="muted small">Sentence not quite right? Add your own example sentence or choose the word type in the list editor.</p>
        </div>`;
      Util.$('[data-opt=count]', content).onchange = e => { state.count = +e.target.value; renderSentences(); };
    }

    /* ---------- Story tab ---------- */
    function renderStory(regen = true) {
      if (regen || !state.story) {
        const picks = Util.shuffle(ctx.words).slice(0, Math.min(ctx.words.length, gradeInfo(ctx.grade).band === 1 ? 3 : 5));
        state.story = Sentences.story(picks, ctx.grade);
      }
      const { sentences, words } = state.story;
      let html = sentences.map(s => Util.esc(s)).join(' ');
      words.forEach(w => {
        const re = new RegExp(`(^|[^a-z])(${Util.reEsc(Util.esc(w.word))})(?![a-z])`, 'gi');
        html = html.replace(re, '$1<mark>$2</mark>');
      });
      content.innerHTML = `
        <div class="card story-card pop-in">
          <h2>📚 A story with your words</h2>
          <p class="story-text">${html}</p>
          <p class="muted">Words used: ${words.map(w => `<b>${Util.esc(w.word)}</b>`).join(', ')}</p>
          <div class="btn-row">
            <button type="button" class="btn" data-do="read-story">🔊 Read it to me</button>
            <button type="button" class="btn primary" data-do="new-story">🔄 New story</button>
          </div>
        </div>`;
    }

    /* ---------- Fill the blank tab ---------- */
    function renderBlank() {
      content.innerHTML = '<div class="blank-area"></div>';
      const area = Util.$('.blank-area', content);
      UI.rounds(area, ctx, Util.shuffle(ctx.words), (w, api) => {
        const { sentence, blanked } = Sentences.blankSentence(w, ctx.grade);
        let tries = 0;
        area.innerHTML = `
          <div class="card play-card pop-in">
            ${UI.progress(api.index, api.total)}
            <p class="blank-sentence">${Util.esc(blanked).replace('_______', '<span class="blank-line">______</span>')}</p>
            <div class="btn-row center"><button type="button" class="btn small" data-say-s>🔊 Read the sentence</button></div>
            <form class="answer-form" autocomplete="off">
              <input class="answer-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Missing word" placeholder="Type the missing word">
              <button type="submit" class="btn primary big">✅ Check</button>
            </form>
            <div class="feedback" aria-live="polite"></div>
          </div>`;
        const input = Util.$('.answer-input', area);
        const fb = Util.$('.feedback', area);
        input.focus();
        Util.$('[data-say-s]', area).onclick = () => { Speech.speak(sentence); input.focus(); };
        Speech.speak(sentence);
        Util.$('.answer-form', area).onsubmit = e => {
          e.preventDefault();
          const given = input.value.trim();
          if (!given) return;
          if (Util.norm(given) === Util.norm(w.word)) {
            Sound.play('correct');
            fb.className = 'feedback good';
            fb.innerHTML = `✅ ${Sentences.highlight(sentence, w.word)}`;
            input.disabled = true;
            setTimeout(() => api.done(tries === 0, given), 1500);
          } else if (++tries < 2) {
            Sound.play('wrong');
            fb.className = 'feedback bad';
            fb.textContent = 'Not quite — check your spelling and try again!';
            input.select();
          } else {
            Sound.play('wrong');
            input.disabled = true;
            fb.className = 'feedback bad';
            fb.innerHTML = `The word is <b>${Util.esc(w.word)}</b>: ${Sentences.highlight(sentence, w.word)}
              <div><button type="button" class="btn small" data-next>➡ Next</button></div>`;
            Util.$('[data-next]', area).onclick = () => api.done(false, given);
            Util.$('[data-next]', area).focus();
          }
        };
      }, { title: 'Fill-the-blank complete!' });
    }

    /* ---------- events ---------- */
    body.addEventListener('click', e => {
      const tab = e.target.closest('[data-tab]');
      if (tab) { state.tab = tab.dataset.tab; return show(); }
      const say = e.target.closest('[data-say]');
      if (say) return Speech.speak(say.dataset.say);
      const chip = e.target.closest('[data-word]');
      if (chip) { state.word = ctx.words[+chip.dataset.word]; Speech.speak(state.word.word); return renderSentences(); }
      const b = e.target.closest('[data-do]');
      if (!b) return;
      if (b.dataset.do === 'regen') renderSentences();
      if (b.dataset.do === 'new-story') renderStory();
      if (b.dataset.do === 'read-story') Speech.speak(state.story.sentences.join(' '));
    });

    function show() {
      Util.$$('[data-tab]', body).forEach(t => t.classList.toggle('active', t.dataset.tab === state.tab));
      if (state.tab === 'sentences') renderSentences();
      else if (state.tab === 'story') renderStory();
      else renderBlank();
    }
    show();
  },
};
