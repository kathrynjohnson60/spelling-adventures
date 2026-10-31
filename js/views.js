/* =====================================================================
   Spelling Adventures — views.js
   The non-game screens:
     • home     – dashboard: all lists grouped by grade + quick-launch buttons
     • hub      – one list: its words, missed words, and every activity
     • editor   – create / edit a list (one-by-one or paste a whole list)
     • settings – sound, speech, game theme, backup & restore
   ===================================================================== */
'use strict';

/* "Have a class code?" box for students (only when accounts are set up). */
function joinBoxHTML() {
  if (!Cloud.enabled) return '';
  return `
    <section class="card join-card">
      <h2>🎒 Have a class code?</h2>
      <form class="join-form" autocomplete="off">
        <input name="code" maxlength="8" placeholder="e.g. K7M2QX" aria-label="Class code" autocapitalize="characters" spellcheck="false">
        <button type="submit" class="btn primary">Get my list</button>
      </form>
    </section>`;
}
function bindJoinBox(main) {
  const f = Util.$('.join-form', main);
  if (!f) return;
  f.onsubmit = e => {
    e.preventDefault();
    const code = f.code.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) return UI.toast('A class code has 6 letters and numbers.');
    App.go(`#/join/${code}`);
  };
}

const Views = {
  /* ================= HOME DASHBOARD ================= */
  home(main) {
    const lists = Store.lists;
    const totalWords = lists.reduce((n, l) => n + l.words.length, 0);
    const needsPractice = lists.map(l => ({ l, m: Store.missedWords(l) })).filter(x => x.m.length);
    const quick = ['test', 'escape', 'match', 'scramble', 'balloon', 'flashcards'];

    if (!lists.length) {
      main.innerHTML = `
        <section class="welcome card pop-in">
          <div class="welcome-art" aria-hidden="true">🚀📚✏️🌈</div>
          <h1>Welcome to Spelling Adventures!</h1>
          <p>Make a spelling list, and the app turns it into tests, games, flashcards, and sentences — instantly.</p>
          <div class="btn-row center">
            <a class="btn primary big" href="#/new">➕ Make my first list</a>
            <button type="button" class="btn big" data-do="samples">✨ Try sample lists</button>
          </div>
          <p class="muted small">${Cloud.enabled
            ? 'Teachers and parents: <a href="#/account">sign in</a> to save lists to your account. Students: use your class code below.'
            : 'Everything is saved in this browser on this device. No account needed.'}</p>
        </section>
        ${joinBoxHTML()}`;
      Util.$('[data-do=samples]', main).onclick = () => { Store.addSamples(); UI.toast('✨ Added 6 sample lists'); App.route(); };
      bindJoinBox(main);
      return;
    }

    const byGrade = GRADES.map(g => ({ g, lists: lists.filter(l => l.grade === g.id).sort((a, b) => a.name.localeCompare(b.name)) }))
      .filter(x => x.lists.length);

    main.innerHTML = `
      <section class="dash-hero card">
        <div>
          <h1>Ready for an adventure? 🗺️</h1>
          <p class="muted">${Util.plural(lists.length, 'list')} · ${Util.plural(totalWords, 'word')} · pick a list and choose a game!</p>
          ${Cloud.enabled ? `<p class="muted small">${Cloud.user
            ? `☁️ Saved to ${Util.esc(Cloud.user.displayName || Cloud.user.email || 'your account')}’s account`
            : '💾 Saved in this browser · <a href="#/account">sign in</a> to save lists to your account'}</p>` : ''}
        </div>
        <a class="btn primary big" href="#/new">➕ New list</a>
      </section>

      ${joinBoxHTML()}

      ${needsPractice.length ? `
        <section class="card practice-banner">
          <h2>🎯 Practice missed words</h2>
          <p class="muted">Words missed in any activity show up here until they’re spelled correctly.</p>
          <div class="practice-rows">
            ${needsPractice.map(({ l, m }) => `
              <div class="practice-row">
                <div><b>${Util.esc(l.name)}</b> <span class="muted">· ${gradeInfo(l.grade).short}</span><br>
                  <span class="missed-words">${m.slice(0, 6).map(w => Util.esc(w.word)).join(', ')}${m.length > 6 ? '…' : ''}</span></div>
                <a class="btn small primary" href="#/list/${l.id}?missed=1">🎯 Practice ${m.length}</a>
              </div>`).join('')}
          </div>
        </section>` : ''}

      ${byGrade.length > 1 ? `
        <nav class="grade-filter chip-row" aria-label="Filter by grade">
          <button type="button" class="chip active" data-grade="all">All grades</button>
          ${byGrade.map(({ g }) => `<button type="button" class="chip" data-grade="${g.id}">${g.emoji} ${g.label}</button>`).join('')}
        </nav>` : ''}

      ${byGrade.map(({ g, lists: gl }) => `
        <section class="grade-section" data-section="${g.id}">
          <h2 class="grade-title" style="--g:${g.color}"><span>${g.emoji}</span> ${g.label}</h2>
          <div class="list-grid">
            ${gl.map(l => {
              const missed = Store.missedWords(l).length;
              return `
              <article class="list-card" style="--g:${g.color}">
                <a class="lc-main" href="#/list/${l.id}">
                  <h3>${Util.esc(l.name)}</h3>
                  <p class="lc-words">${l.words.slice(0, 8).map(w => Util.esc(w.word)).join(' · ')}${l.words.length > 8 ? ' …' : ''}</p>
                </a>
                <div class="lc-meta">
                  <span class="badge">${Util.plural(l.words.length, 'word')}</span>
                  ${l.origin === 'class' ? `<span class="badge class">🎒 Class list${l.from ? ' · ' + Util.esc(l.from) : ''}</span>` : ''}
                  ${l.shareCode ? `<span class="badge shared">🔗 Shared · ${l.shareCode}</span>` : ''}
                  ${missed ? `<a class="badge missed" href="#/list/${l.id}?missed=1">🎯 ${missed} to practice</a>` : ''}
                </div>
                <div class="lc-launch">
                  ${quick.map(k => `<button type="button" class="quick" data-launch="${k}" data-list="${l.id}" title="${Activities[k].title}" style="--act:${Activities[k].color}">
                    <span aria-hidden="true">${Activities[k].icon}</span><small>${Activities[k].title.split(' ')[0]}</small></button>`).join('')}
                  <a class="quick more" href="#/list/${l.id}" title="All activities"><span aria-hidden="true">🧩</span><small>All</small></a>
                </div>
                <div class="lc-actions">
                  ${l.origin === 'class'
                    ? `<button type="button" class="btn small ghost danger-text" data-del="${l.id}">🗑 Remove</button>`
                    : `<a class="btn small ghost" href="#/edit/${l.id}">✏️ Edit</a>
                       <button type="button" class="btn small ghost" data-dup="${l.id}">⧉ Duplicate</button>
                       <button type="button" class="btn small ghost danger-text" data-del="${l.id}">🗑 Delete</button>`}
                </div>
              </article>`;
            }).join('')}
          </div>
        </section>`).join('')}`;

    main.onclick = async e => {
      const launch = e.target.closest('[data-launch]');
      if (launch) return App.launch(launch.dataset.launch, launch.dataset.list);
      const dup = e.target.closest('[data-dup]');
      if (dup) { const c = Store.duplicateList(dup.dataset.dup); UI.toast(`⧉ Made “${c.name}”`); return App.go(`#/edit/${c.id}`); }
      const del = e.target.closest('[data-del]');
      if (del) {
        const l = Store.getList(del.dataset.del);
        const msg = l.origin === 'class'
          ? `Remove “${Util.esc(l.name)}” from this device? You can get it again with the class code ${Util.esc(l.classCode)}.`
          : `Delete “${Util.esc(l.name)}” and its ${Util.plural(l.words.length, 'word')}? This can’t be undone.${l.shareCode ? ' Its class code will also stop working.' : ''}`;
        if (await UI.confirm(msg, l.origin === 'class' ? '🗑 Remove' : '🗑 Delete', true)) {
          Store.deleteList(l.id);
          UI.toast(l.origin === 'class' ? 'List removed' : 'List deleted');
          App.route();
        }
        return;
      }
      const chip = e.target.closest('[data-grade]');
      if (chip) {
        Util.$$('[data-grade]', main).forEach(c => c.classList.toggle('active', c === chip));
        Util.$$('[data-section]', main).forEach(s => { s.hidden = chip.dataset.grade !== 'all' && s.dataset.section !== chip.dataset.grade; });
      }
    };
    bindJoinBox(main);
  },

  /* ================= LIST HUB ================= */
  hub(main, id, query) {
    const list = Store.getList(id);
    if (!list) return Views.notFound(main);
    const g = gradeInfo(list.grade);
    let useMissed = query.get('missed') === '1';

    const draw = () => {
      const missed = Store.missedWords(list);
      if (!missed.length) useMissed = false;
      const missedSet = new Set(missed.map(w => Util.norm(w.word)));
      const setSize = useMissed ? missed.length : list.words.length;
      main.innerHTML = `
        <section class="card hub-head" style="--g:${g.color}">
          <a class="btn ghost small" href="#/">⬅ <span class="hide-sm">All lists</span></a>
          <div class="hub-title">
            <span class="grade-pill">${g.emoji} ${g.label}</span>
            <h1>${Util.esc(list.name)}</h1>
            ${list.origin === 'class' ? `<p class="muted small">🎒 Class list${list.from ? ' from ' + Util.esc(list.from) : ''} · code ${Util.esc(list.classCode)}</p>` : ''}
          </div>
          <div class="btn-row">
            ${list.origin === 'class'
              ? `<button type="button" class="btn small" data-do="refresh">🔄 Get latest from teacher</button>
                 <button type="button" class="btn small ghost danger-text" data-do="del">🗑 Remove</button>`
              : `${Cloud.user ? `<button type="button" class="btn small primary" data-do="share">🔗 ${list.shareCode ? 'Shared · ' + list.shareCode : 'Share with students'}</button>` : ''}
                 <a class="btn small" href="#/edit/${list.id}">✏️ Edit</a>
                 <button type="button" class="btn small" data-do="dup">⧉ Duplicate</button>
                 <button type="button" class="btn small ghost danger-text" data-do="del">🗑 Delete</button>`}
          </div>
        </section>

        <section class="card">
          <h2>📋 Words <span class="muted">(${list.words.length}) · tap a word to hear it</span></h2>
          <div class="chip-row">
            ${list.words.map(w => `<button type="button" class="chip word-chip ${missedSet.has(Util.norm(w.word)) ? 'missed' : ''}" data-say="${Util.esc(w.word)}">
              ${missedSet.has(Util.norm(w.word)) ? '🎯 ' : ''}${Util.esc(w.word)}</button>`).join('')}
          </div>
        </section>

        <section class="card practice-set">
          <h2>Which words should we practice?</h2>
          <div class="seg" role="radiogroup">
            <button type="button" class="seg-btn ${!useMissed ? 'active' : ''}" data-set="all" role="radio" aria-checked="${!useMissed}">📚 All words (${list.words.length})</button>
            <button type="button" class="seg-btn ${useMissed ? 'active' : ''}" data-set="missed" role="radio" aria-checked="${useMissed}" ${missed.length ? '' : 'disabled'}>
              🎯 Missed words (${missed.length})</button>
          </div>
          ${missed.length ? `<button type="button" class="linkish small" data-do="clear-missed">Clear missed words</button>`
            : '<p class="muted small">No missed words yet. Words missed in any activity will appear here. 🎉</p>'}
        </section>

        <section class="act-grid">
          ${ACT_ORDER.map(k => {
            const A = Activities[k];
            const tooFew = setSize < (A.minWords || 1);
            return `<button type="button" class="act-tile" data-launch="${k}" style="--act:${A.color}" ${tooFew ? 'disabled' : ''}>
              <span class="act-tile-icon" aria-hidden="true">${A.icon}</span>
              <span class="act-tile-title">${A.title}</span>
              <span class="act-tile-desc">${tooFew ? `Needs at least ${A.minWords} words` : A.desc}</span>
            </button>`;
          }).join('')}
        </section>`;
    };

    main.onclick = async e => {
      const say = e.target.closest('[data-say]');
      if (say) return Speech.speak(say.dataset.say);
      const set = e.target.closest('[data-set]');
      if (set && !set.disabled) { useMissed = set.dataset.set === 'missed'; return draw(); }
      const launch = e.target.closest('[data-launch]');
      if (launch) return App.launch(launch.dataset.launch, list.id, null, useMissed);
      const b = e.target.closest('[data-do]');
      if (!b) return;
      if (b.dataset.do === 'dup') { const c = Store.duplicateList(list.id); UI.toast(`⧉ Made “${c.name}”`); App.go(`#/edit/${c.id}`); }
      if (b.dataset.do === 'share') return Views.shareDialog(list);
      if (b.dataset.do === 'refresh') return App.go(`#/join/${list.classCode}`);
      const isClass = list.origin === 'class';
      if (b.dataset.do === 'del' && await UI.confirm(isClass
        ? `Remove “${Util.esc(list.name)}” from this device? You can get it again with the class code ${Util.esc(list.classCode)}.`
        : `Delete “${Util.esc(list.name)}”? This can’t be undone.${list.shareCode ? ' Its class code will also stop working.' : ''}`, isClass ? '🗑 Remove' : '🗑 Delete', true)) {
        Store.deleteList(list.id); UI.toast(isClass ? 'List removed' : 'List deleted'); App.go('#/');
      }
      if (b.dataset.do === 'clear-missed' && await UI.confirm('Clear the missed-words list for this spelling list?', 'Clear')) {
        Store.clearMissed(list.id); useMissed = false; draw();
      }
    };
    draw();
  },

  /* ================= LIST EDITOR ================= */
  editor(main, id) {
    const existing = id ? Store.getList(id) : null;
    if (id && !existing) return Views.notFound(main);
    if (existing && existing.origin === 'class') {
      main.innerHTML = `<section class="card center"><h1>🎒 This is your teacher’s list</h1>
        <p class="muted">Class lists can’t be changed here. Use <b>Duplicate</b> to make your own copy you can edit.</p>
        <a class="btn primary" href="#/list/${existing.id}">⬅ Back to the list</a></section>`;
      return;
    }
    const draft = existing ? JSON.parse(JSON.stringify(existing)) : { id: Util.uid(), name: '', grade: '1', words: [] };
    let dirty = false;
    const markDirty = () => { dirty = true; };
    App.isDirty = () => dirty;

    main.innerHTML = `
      <form class="editor card" autocomplete="off">
        <div class="editor-head">
          <h1>${existing ? '✏️ Edit list' : '➕ New spelling list'}</h1>
        </div>
        <div class="field-row">
          <label class="field grow">List name
            <input name="name" maxlength="80" placeholder="e.g. Week 5 – Short Vowels" value="${Util.esc(draft.name)}" required>
          </label>
          <label class="field">Grade
            <select name="grade">${GRADES.map(g => `<option value="${g.id}" ${g.id === draft.grade ? 'selected' : ''}>${g.emoji} ${g.label}</option>`).join('')}</select>
          </label>
        </div>

        <h2>Words <span class="muted word-count"></span></h2>
        <div class="add-one">
          <input class="add-input" placeholder="Type a word and press Enter" aria-label="New word" autocapitalize="off" autocorrect="off" spellcheck="false">
          <button type="button" class="btn primary" data-do="add">➕ Add word</button>
        </div>

        <details class="paste-box">
          <summary>📋 Paste a whole list at once</summary>
          <p class="muted small">One word per line, or separated by commas. To add a definition, put a dash after the word.
            For a sentence too, use the | key:<br>
            <code>planet</code> &nbsp; <code>planet - a large object that circles a star</code> &nbsp;
            <code>planet | a large object that circles a star | Earth is a planet.</code></p>
          <textarea rows="6" class="paste-input" placeholder="cat&#10;hat - something you wear on your head&#10;map | a drawing of a place | We used a map to find the park."></textarea>
          <button type="button" class="btn" data-do="paste">➕ Add these words</button>
        </details>

        <div class="word-rows"></div>

        <div class="editor-bar">
          <button type="button" class="btn ghost" data-do="cancel">Cancel</button>
          <button type="submit" class="btn primary big">💾 Save list</button>
        </div>
      </form>`;

    const form = Util.$('form', main);
    const rowsEl = Util.$('.word-rows', main);

    function drawRows() {
      Util.$('.word-count', main).textContent = `(${draft.words.length})`;
      if (!draft.words.length) {
        rowsEl.innerHTML = '<p class="empty-words">No words yet — add some above! ✏️</p>';
        return;
      }
      rowsEl.innerHTML = draft.words.map((w, i) => `
        <div class="word-row" data-i="${i}">
          <span class="num">${i + 1}</span>
          <input class="w-word" data-k="word" value="${Util.esc(w.word)}" aria-label="Word ${i + 1}" autocapitalize="off" spellcheck="false">
          <input class="w-def" data-k="definition" value="${Util.esc(w.definition)}" placeholder="Definition (optional)" aria-label="Definition for word ${i + 1}">
          <input class="w-say" data-k="say" value="${Util.esc(w.say || '')}" placeholder="Say it like… (optional)" title="If the voice says this word wrong, type how it sounds, like duz for does. Students still see the real spelling." aria-label="How to pronounce word ${i + 1}" autocapitalize="off" spellcheck="false">
          <div class="w-sen-wrap">
            <input class="w-sen" data-k="sentence" value="${Util.esc(w.sentence)}" placeholder="Example sentence (optional)" aria-label="Example sentence for word ${i + 1}">
            <button type="button" class="icon-btn" data-row="suggest" title="Suggest a sentence">✨</button>
          </div>
          <select class="w-pos" data-k="pos" aria-label="Word type for word ${i + 1}" title="Word type (helps the sentence builder)">
            ${Object.entries(Sentences.TYPES).map(([k, v]) => `<option value="${k}" ${k === (w.pos || 'auto') ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
          <div class="row-btns">
            <button type="button" class="icon-btn" data-row="say" title="Hear it">🔊</button>
            <button type="button" class="icon-btn" data-row="up" title="Move up" ${i === 0 ? 'disabled' : ''}>▲</button>
            <button type="button" class="icon-btn danger-text" data-row="del" title="Remove word">✕</button>
          </div>
        </div>`).join('');
    }

    function addWords(items) {
      const have = new Set(draft.words.map(w => Util.norm(w.word)));
      let added = 0;
      items.forEach(it => {
        const word = it.word.trim().replace(/\s+/g, ' ');
        if (!word || have.has(Util.norm(word))) return;
        have.add(Util.norm(word));
        draft.words.push({ word, definition: it.definition || '', sentence: it.sentence || '', say: '', pos: 'auto' });
        added++;
      });
      if (added) markDirty();
      drawRows();
      return added;
    }

    /** Turn pasted text into words. Supports lines, commas, "word - definition", "word | def | sentence", tabs. */
    function parsePaste(text) {
      let lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const hasDefs = lines.some(l => /\t| [-–—:] |\|/.test(l));
      if (!hasDefs) lines = lines.flatMap(l => l.split(/[,;]/)).map(s => s.trim()).filter(Boolean);
      return lines.map(line => {
        line = line.replace(/^\s*(\d+[.)]|[-*•])\s+/, ''); // drop "1." or bullet at the start
        let parts;
        if (line.includes('|')) parts = line.split('|');
        else if (line.includes('\t')) parts = line.split('\t');
        else { const m = line.split(/ [-–—:] /); parts = [m[0], m.slice(1).join(' - ')]; }
        return { word: (parts[0] || '').trim(), definition: (parts[1] || '').trim(), sentence: (parts[2] || '').trim() };
      }).filter(x => x.word && x.word.length <= 40);
    }

    const addInput = Util.$('.add-input', main);
    const addOne = () => {
      const v = addInput.value.trim();
      if (!v) return addInput.focus();
      const items = v.includes(',') ? parsePaste(v) : [{ word: v }];
      if (!addWords(items)) UI.toast('That word is already on the list.');
      addInput.value = '';
      addInput.focus();
    };
    addInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addOne(); } });

    form.addEventListener('input', e => {
      markDirty();
      const row = e.target.closest('.word-row');
      if (row && e.target.dataset.k) draft.words[+row.dataset.i][e.target.dataset.k] = e.target.value;
    });
    form.addEventListener('change', e => {
      const row = e.target.closest('.word-row');
      if (row && e.target.dataset.k) draft.words[+row.dataset.i][e.target.dataset.k] = e.target.value;
    });

    form.addEventListener('click', async e => {
      const b = e.target.closest('[data-do], [data-row]');
      if (!b) return;
      if (b.dataset.do === 'add') return addOne();
      if (b.dataset.do === 'paste') {
        const ta = Util.$('.paste-input', main);
        const n = addWords(parsePaste(ta.value));
        UI.toast(n ? `➕ Added ${Util.plural(n, 'word')}` : 'No new words found.');
        if (n) ta.value = '';
        return;
      }
      if (b.dataset.do === 'cancel') return App.go(existing ? `#/list/${existing.id}` : '#/');
      const row = b.closest('.word-row');
      if (!row) return;
      const i = +row.dataset.i;
      const w = draft.words[i];
      if (b.dataset.row === 'say') Speech.speak(w.say || w.word);
      if (b.dataset.row === 'del') { draft.words.splice(i, 1); markDirty(); drawRows(); }
      if (b.dataset.row === 'up' && i > 0) { [draft.words[i - 1], draft.words[i]] = [draft.words[i], draft.words[i - 1]]; markDirty(); drawRows(); }
      if (b.dataset.row === 'suggest') {
        const grade = Util.$('[name=grade]', form).value;
        const s = Sentences.generate({ ...w, sentence: '' }, grade, 1)[0];
        w.sentence = s;
        Util.$('.w-sen', row).value = s;
        markDirty();
      }
    });

    form.onsubmit = e => {
      e.preventDefault();
      // Pick up anything typed in the "add word" box but not yet added.
      if (addInput.value.trim()) addOne();
      draft.name = Util.$('[name=name]', form).value.trim();
      draft.grade = Util.$('[name=grade]', form).value;
      draft.words = draft.words.filter(w => w.word.trim());
      if (!draft.name) { UI.toast('Please give your list a name.'); return Util.$('[name=name]', form).focus(); }
      if (!draft.words.length) { UI.toast('Add at least one word.'); return addInput.focus(); }
      const saved = Store.saveList(draft);
      dirty = false;
      UI.toast('💾 List saved!', 'good');
      App.go(`#/list/${saved.id}`);
    };

    drawRows();
    if (!existing) Util.$('[name=name]', form).focus();
  },

  /* ================= SETTINGS ================= */
  settings(main) {
    const s = Store.settings;
    main.innerHTML = `
      <section class="card settings">
        <h1>⚙️ Settings</h1>

        <h2>🔊 Sound & speech</h2>
        <label class="switch-row"><input type="checkbox" data-set="sound" ${s.sound ? 'checked' : ''}><span class="switch"></span> Sound effects</label>
        <label class="field">Speaking speed: <b class="rate-label">${s.rate.toFixed(2)}×</b>
          <input type="range" min="0.5" max="1.3" step="0.05" value="${s.rate}" data-set="rate">
        </label>
        <label class="field">Voice
          <select data-set="voiceURI" class="voice-select"></select>
        </label>
        <button type="button" class="btn" data-do="test-voice">🗣️ Test the voice</button>
        ${Speech.supported ? '' : '<p class="warn">⚠️ This browser can’t read words aloud. Try Chrome, Edge, or Safari.</p>'}
        <p class="warn voice-warn" hidden>⚠️ This browser only has basic voices, which sometimes say words wrong.
          For the clearest voice, open Spelling Adventures in <b>Microsoft Edge</b> (its “Natural” voices are best) or <b>Google Chrome</b>.</p>
        <p class="muted small">Still saying a word wrong? Open the list editor and type how the word sounds in its
          <b>Say it like…</b> box (for example <i>duz</i> for “does”). Students still see the real spelling.</p>

        <h2>🏃 Escape the Danger</h2>
        <p class="muted">Pick the scene the game starts with. Students can also switch scenes while they play.</p>
        <div class="theme-picker">
          ${Object.entries(ESCAPE_THEMES).map(([k, t]) => `
            <label class="theme-option">
              <input type="radio" name="theme" value="${k}" ${s.theme === k ? 'checked' : ''}>
              <span class="theme-card" style="background-image:url('${IMG_DIR}backgrounds/${t.bg}');background-position:${t.bgPos}"><b>${t.icon} ${t.label}</b></span>
            </label>`).join('')}
        </div>
        <label class="switch-row"><input type="checkbox" data-set="chaseTimer" ${s.chaseTimer ? 'checked' : ''}><span class="switch"></span>
          Danger creeps closer if no one types for a while</label>

        <h2>📝 Spelling Test</h2>
        <label class="switch-row"><input type="checkbox" data-set="testFeedback" ${s.testFeedback ? 'checked' : ''}><span class="switch"></span>
          Show right / wrong after each word (turn off for a “real” test)</label>

        <h2>💾 Backup & move lists</h2>
        <p class="muted">Lists are saved in this browser only. Download a backup file to keep them safe or to move them to another computer or tablet.</p>
        <div class="btn-row">
          <button type="button" class="btn" data-do="export">⬇️ Download backup</button>
          <label class="btn">⬆️ Load backup file<input type="file" accept=".json,application/json" data-do="import" hidden></label>
          <button type="button" class="btn" data-do="samples">✨ Add sample lists</button>
        </div>
        <h2 class="danger-text">Danger zone</h2>
        <button type="button" class="btn danger" data-do="reset">🗑 Delete all lists and settings</button>
      </section>`;

    const voiceSel = Util.$('.voice-select', main);
    const fillVoices = () => {
      const best = Speech.ranked()[0];
      voiceSel.innerHTML = `<option value="">Automatic — clearest voice${best ? ` (${Util.esc(best.name)})` : ''}</option>` +
        Speech.ranked().map(v => `<option value="${Util.esc(v.voiceURI)}" ${v.voiceURI === s.voiceURI ? 'selected' : ''}>${Speech.score(v) >= 25 ? '★ ' : ''}${Util.esc(v.name)} (${v.lang})</option>`).join('');
      Util.$('.voice-warn', main).hidden = !Speech.supported || !Speech.voices.length || !Speech.onlyBasicVoices();
    };
    fillVoices();
    Speech.onVoices(() => { if (voiceSel.isConnected) fillVoices(); });

    main.addEventListener('input', e => {
      const k = e.target.dataset.set;
      if (k === 'rate') { Store.setSetting('rate', +e.target.value); Util.$('.rate-label', main).textContent = (+e.target.value).toFixed(2) + '×'; }
    });
    main.addEventListener('change', e => {
      const el = e.target;
      const k = el.dataset.set;
      if (el.name === 'theme') Store.setSetting('theme', el.value);
      else if (k && el.type === 'checkbox') Store.setSetting(k, el.checked);
      else if (k && k !== 'rate') Store.setSetting(k, el.value);
      if (el.dataset.do === 'import' && el.files[0]) {
        const reader = new FileReader();
        reader.onload = () => {
          try { const n = Store.importData(reader.result); UI.toast(`⬆️ Loaded ${Util.plural(n, 'list')}`, 'good'); }
          catch (err) { UI.toast('That file is not a Spelling Adventures backup.', 'bad'); }
          el.value = '';
        };
        reader.readAsText(el.files[0]);
      }
      if (k === 'sound' && el.checked) Sound.play('correct');
    });
    main.addEventListener('click', async e => {
      const b = e.target.closest('[data-do]');
      if (!b) return;
      if (b.dataset.do === 'test-voice') Speech.speak('Hello! Let’s spell the word adventure.');
      if (b.dataset.do === 'export') {
        const blob = new Blob([Store.exportData()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `spelling-adventures-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
      if (b.dataset.do === 'samples') { Store.addSamples(); UI.toast('✨ Added 6 sample lists'); }
      if (b.dataset.do === 'reset' && await UI.confirm('This deletes <b>every</b> list, missed word, and setting saved in this browser. Download a backup first if you might need them.'
          + (Cloud.user ? '<br><br>You’ll also be signed out. Lists saved to your account are <b>not</b> deleted — they come back when you sign in.' : ''), '🗑 Delete everything', true)) {
        if (Cloud.user) await Cloud.signOut();
        Store.resetAll();
        UI.toast('Everything was deleted.');
        App.go('#/');
      }
    });
  },

  /* ================= ACCOUNT (teachers & parents) ================= */
  account(main) {
    if (!Cloud.enabled) {
      main.innerHTML = `
        <section class="card settings">
          <h1>👤 Accounts</h1>
          <p>Accounts aren’t available here. ${/^https?:$/.test(location.protocol)
            ? 'They haven’t been set up for this copy of the app yet (see SETUP-ACCOUNTS.md).'
            : 'Open the website version of Spelling Adventures to sign in.'}</p>
          <p class="muted">Lists are being saved in this browser only.</p>
        </section>`;
      return;
    }
    const u = Cloud.user;
    if (u) {
      const own = Store.lists.filter(l => l.origin !== 'class');
      main.innerHTML = `
        <section class="card settings">
          <h1>👤 My account</h1>
          <p>Signed in as <b>${Util.esc(u.displayName || u.email || 'you')}</b>${u.displayName && u.email ? ` <span class="muted">(${Util.esc(u.email)})</span>` : ''}.</p>
          <p>☁️ Your ${Util.plural(own.length, 'list')} ${own.length === 1 ? 'is' : 'are'} saved to your account and will appear on any computer or tablet where you sign in.</p>
          <p class="muted">To give a list to students, open the list and choose <b>🔗 Share with students</b>. Students don’t need accounts.</p>
          <div class="btn-row">
            <a class="btn primary" href="#/">📚 My lists</a>
            <button type="button" class="btn" data-do="signout">🚪 Sign out</button>
          </div>
        </section>`;
      Util.$('[data-do=signout]', main).onclick = async () => {
        await Cloud.signOut();
        UI.toast('Signed out. Your lists are still saved in your account.');
        App.go('#/');
      };
      return;
    }

    let mode = 'signin';   // 'signin' | 'create'
    const draw = () => {
      main.innerHTML = `
        <section class="card settings account-card">
          <h1>👤 Sign in</h1>
          <p>Accounts are for <b>teachers and parents</b>. Sign in to save your spelling lists to your account
            so they appear on every device, and to share lists with students using a class code.</p>
          <p class="muted small">🎒 Students don’t need an account. They use the class code from their teacher on the home page.</p>

          <button type="button" class="btn big google-btn" data-do="google">
            <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Sign in with Google
          </button>

          <div class="or-line"><span>or use your email</span></div>

          <div class="seg" role="tablist">
            <button type="button" class="seg-btn ${mode === 'signin' ? 'active' : ''}" data-mode="signin">Sign in</button>
            <button type="button" class="seg-btn ${mode === 'create' ? 'active' : ''}" data-mode="create">Create an account</button>
          </div>
          <form class="account-form" autocomplete="on">
            ${mode === 'create' ? `<label class="field">Your name <span class="muted small">(students see this on shared lists, e.g. “Mrs. Johnson”)</span>
              <input name="name" autocomplete="name" maxlength="60"></label>` : ''}
            <label class="field">Email <input name="email" type="email" autocomplete="email" required></label>
            <label class="field">Password ${mode === 'create' ? '<span class="muted small">(at least 6 characters)</span>' : ''}
              <input name="password" type="password" autocomplete="${mode === 'create' ? 'new-password' : 'current-password'}" required minlength="6"></label>
            <div class="form-msg" aria-live="polite"></div>
            <div class="btn-row">
              <button type="submit" class="btn primary">${mode === 'create' ? '✨ Create my account' : '🔑 Sign in'}</button>
              ${mode === 'signin' ? '<button type="button" class="linkish" data-do="reset">Forgot your password?</button>' : ''}
            </div>
          </form>
        </section>`;

      const msg = Util.$('.form-msg', main);
      const show = (text, bad) => { msg.textContent = text; msg.className = `form-msg ${bad ? 'bad' : 'good'}`; };
      const busy = on => Util.$$('button', main).forEach(b => { b.disabled = on; });

      Util.$('[data-do=google]', main).onclick = async () => {
        busy(true);
        try { await Cloud.signInGoogle(); App.go('#/'); }
        catch (e) { show(Cloud.friendly(e), true); }
        busy(false);
      };
      Util.$$('[data-mode]', main).forEach(b => { b.onclick = () => { mode = b.dataset.mode; draw(); }; });
      const form = Util.$('.account-form', main);
      form.onsubmit = async e => {
        e.preventDefault();
        const f = new FormData(form);
        busy(true);
        try {
          if (mode === 'create') await Cloud.createEmail(String(f.get('name') || '').trim(), f.get('email'), f.get('password'));
          else await Cloud.signInEmail(f.get('email'), f.get('password'));
          App.go('#/');
        } catch (err) { show(Cloud.friendly(err), true); }
        busy(false);
      };
      const reset = Util.$('[data-do=reset]', main);
      if (reset) reset.onclick = async () => {
        const email = Util.$('[name=email]', form).value.trim();
        if (!email) return show('Type your email above first, then choose “Forgot your password?”', true);
        try { await Cloud.resetPassword(email); show('📧 We sent a password-reset link to ' + email + '.', false); }
        catch (err) { show(Cloud.friendly(err), true); }
      };
    };
    draw();
  },

  /* ================= JOIN WITH A CLASS CODE (students) ================= */
  async join(main, code) {
    main.innerHTML = `<section class="card center pop-in"><div class="welcome-art">🎒</div><h1>Getting your class list…</h1></section>`;
    if (!Cloud.enabled) {
      main.innerHTML = `<section class="card center"><h1>Class codes aren’t available here</h1><p class="muted">Open the website version of Spelling Adventures to use a class code.</p><a class="btn primary" href="#/">🏠 Home</a></section>`;
      return;
    }
    try {
      const shared = await Cloud.fetchShared(code);
      const l = Store.saveClassList(shared);
      UI.toast(`🎒 Got “${l.name}”${shared.from ? ' from ' + shared.from : ''}!`, 'good');
      App.go(`#/list/${l.id}`);
    } catch (e) {
      main.innerHTML = `
        <section class="card center pop-in">
          <div class="welcome-art">🔍</div>
          <h1>Hmm, that didn’t work</h1>
          <p>${Util.esc(e.message || 'Please check your internet connection and try again.')}</p>
          <a class="btn primary" href="#/">🏠 Back to home</a>
        </section>`;
    }
  },

  /** Teachers: share a list with students (class code + link). */
  async shareDialog(list) {
    let code;
    try { code = await Cloud.share(list); }
    catch (e) { return UI.toast('⚠️ ' + (e.message || 'Could not share the list.'), 'bad'); }
    const link = Cloud.shareLink(code);
    const choice = await UI.modal({
      title: '🔗 Share with students',
      html: `
        <p>Students can get <b>${Util.esc(list.name)}</b> two ways. They don’t need an account.</p>
        <p class="share-code" aria-label="Class code">${code.split('').join(' ')}</p>
        <p class="center muted small">1) On the Spelling Adventures home page, type this class code, or</p>
        <p class="share-link"><input readonly value="${Util.esc(link)}" aria-label="Class link"></p>
        <p class="center muted small">2) open this link (post it in Google Classroom, email it, etc.).</p>
        <p class="muted small">When you edit this list, students get the changes the next time they choose “Get latest from teacher.”</p>`,
      buttons: [
        { label: '🚫 Stop sharing', value: 'stop', cls: 'ghost danger-text' },
        { label: '📋 Copy link', value: 'copy', cls: '' },
        { label: 'Done', value: 'done', cls: 'primary' },
      ],
    });
    if (choice === 'copy') {
      try { await navigator.clipboard.writeText(link); UI.toast('📋 Link copied!', 'good'); }
      catch (e) { UI.toast('Select the link and copy it with Ctrl+C.'); }
    }
    if (choice === 'stop' && await UI.confirm(`Stop sharing “${Util.esc(list.name)}”? Students who already have it keep their copy, but the code ${code} will stop working.`, 'Stop sharing', true)) {
      await Cloud.unshare(Store.getList(list.id));
      UI.toast('Sharing stopped.');
      App.route();
    }
  },

  notFound(main) {
    main.innerHTML = `
      <section class="card center pop-in">
        <div class="welcome-art">🧭</div>
        <h1>We couldn’t find that list</h1>
        <p class="muted">It may have been deleted.</p>
        <a class="btn primary" href="#/">🏠 Back to my lists</a>
      </section>`;
  },
};
