/* =====================================================================
   Digital Spelling Test
   The computer reads each word ("word … sentence … word"), the student
   types it. Buttons: Say it again, Say it slowly, Use it in a sentence,
   Define it, Skip. Ends with a score and "practice missed words".
   ===================================================================== */
'use strict';

Activities.test = {
  title: 'Spelling Test',
  icon: '📝',
  color: '#6c5ce7',
  desc: 'Listen to each word and type it.',
  minWords: 1,

  start(root, ctx) {
    const { body } = UI.shell(root, ctx, this);
    const words = Util.shuffle(ctx.words);

    // Keep one sentence per word so "use it in a sentence" is consistent.
    const sentences = new Map();
    const sentenceFor = w => {
      if (!sentences.has(w.word)) sentences.set(w.word, Sentences.blankSentence(w, ctx.grade));
      return sentences.get(w.word);
    };

    UI.rounds(body, ctx, words, (w, api) => {
      let locked = false;
      body.innerHTML = `
        <div class="card play-card pop-in">
          ${UI.progress(api.index, api.total)}
          <button type="button" class="big-speaker" data-do="context" aria-label="Hear the word">🔊</button>
          <p class="muted center">Listen carefully, then type the word.</p>
          <form class="answer-form" autocomplete="off">
            <input class="answer-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off"
                   spellcheck="false" aria-label="Type the word" placeholder="Type the word here">
            <button type="submit" class="btn primary big">✅ Check</button>
          </form>
          <div class="feedback" aria-live="polite"></div>
          <div class="btn-row center tools">
            <button type="button" class="btn" data-do="again">🔁 Say it again</button>
            <button type="button" class="btn" data-do="slow">🐢 Say it slowly</button>
            <button type="button" class="btn" data-do="sentence">💬 Use it in a sentence</button>
            <button type="button" class="btn" data-do="define">📖 Define it</button>
            <button type="button" class="btn ghost" data-do="skip">⏭ Skip</button>
          </div>
          <div class="hint-box" hidden></div>
        </div>`;

      const input = Util.$('.answer-input', body);
      const feedback = Util.$('.feedback', body);
      const hint = Util.$('.hint-box', body);
      input.focus();
      Speech.sayInContext(w.word, sentenceFor(w).sentence);

      const showHint = html => { hint.hidden = false; hint.innerHTML = html; };

      const finish = (ok, given) => {
        locked = true;
        Util.$$('button, input', body).forEach(b => { b.disabled = true; });
        const showFeedback = Store.settings.testFeedback;
        if (showFeedback) {
          feedback.className = `feedback ${ok ? 'good' : 'bad'}`;
          feedback.innerHTML = ok
            ? `✅ Correct! <b>${Util.esc(w.word)}</b>`
            : `❌ The word is <b>${Util.esc(w.word)}</b>${given ? `<div class="diff-line">${Util.letterDiff(given, w.word)}</div>` : ''}`;
          Sound.play(ok ? 'correct' : 'wrong');
        } else {
          feedback.className = 'feedback';
          feedback.textContent = '✏️ Answer saved';
        }
        setTimeout(() => api.done(ok, given), showFeedback && !ok ? 2200 : 1100);
      };

      Util.$('.answer-form', body).onsubmit = e => {
        e.preventDefault();
        if (locked) return;
        const given = input.value.trim();
        if (!given) {
          input.classList.add('shake');
          setTimeout(() => input.classList.remove('shake'), 500);
          UI.toast('Type the word first — or press Skip.');
          return input.focus();
        }
        finish(Util.norm(given) === Util.norm(w.word), given);
      };

      Util.$('.tools', body).onclick = Util.$('[data-do="context"]', body).onclick = e => {
        const b = e.target.closest('[data-do]');
        if (!b || locked) return;
        const s = sentenceFor(w);
        switch (b.dataset.do) {
          case 'context': Speech.sayInContext(w.word, s.sentence); break;
          case 'again': Speech.speak(w.word); break;
          case 'slow': Speech.speak(w.word, { rate: 0.55 }); break;
          case 'sentence':
            showHint(`💬 ${Util.esc(s.blanked)}`);
            Speech.speak(s.sentence);
            break;
          case 'define':
            if (w.definition) {
              showHint(`📖 <b>Definition:</b> ${Util.esc(w.definition)}`);
              Speech.speak(`${w.word}. ${w.definition}`);
            } else {
              showHint(`📖 No definition saved for this word. Here it is in a sentence:<br>${Util.esc(s.blanked)}`);
              Speech.speak(s.sentence);
            }
            break;
          case 'skip': finish(false, ''); break;
        }
        if (b.dataset.do !== 'skip') input.focus();
      };
    }, { title: 'Test complete!' });
  },
};
