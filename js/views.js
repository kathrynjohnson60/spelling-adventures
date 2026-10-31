/* =====================================================================
   Spelling Adventures — views.js
   The non-game screens:
     • home     – dashboard: all lists grouped by grade + quick-launch buttons
     • hub      – one list: its words, missed words, and every activity
     • editor   – create / edit a list (one-by-one or paste a whole list)
     • settings – sound, speech, game theme, backup & restore
   ===================================================================== */
'use strict';

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
          <p class="muted small">Everything is saved in this browser on this device. No account needed.</p>
        </section>`;
      Util.$('[data-do=samples]', main).onclick = () => { Store.addSamples(); UI.toast('✨ Added 6 sample lists'); App.route(); };
      return;
    }

    const byGrade = GRADES.map(g => ({ g, lists: lists.filter(l => l.grade === g.id).sort((a, b) => a.name.localeCompare(b.name)) }))
      .filter(x => x.lists.length);

    main.innerHTML = `
      <section class="dash-hero card">
        <div>
          <h1>Ready for an adventure? 🗺️</h1>
          <p class="muted">${Util.plural(lists.length, 'list')} · ${Util.plural(totalWords, 'word')} · pick a list and choose a game!</p>
        </div>
        <a class="btn primary big" href="#/new">➕ New list</a>
      </section>

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
                  ${missed ? `<a class="badge missed" href="#/list/${l.id}?missed=1">🎯 ${missed} to practice</a>` : ''}
                </div>
                <div class="lc-launch">
                  ${quick.map(k => `<button type="button" class="quick" data-launch="${k}" data-list="${l.id}" title="${Activities[k].title}" style="--act:${Activities[k].color}">
                    <span aria-hidden="true">${Activities[k].icon}</span><small>${Activities[k].title.split(' ')[0]}</small></button>`).join('')}
                  <a class="quick more" href="#/list/${l.id}" title="All activities"><span aria-hidden="true">🧩</span><small>All</small></a>
                </div>
                <div class="lc-actions">
                  <a class="btn small ghost" href="#/edit/${l.id}">✏️ Edit</a>
                  <button type="button" class="btn small ghost" data-dup="${l.id}">⧉ Duplicate</button>
                  <button type="button" class="btn small ghost danger-text" data-del="${l.id}">🗑 Delete</button>
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
        if (await UI.confirm(`Delete “${Util.esc(l.name)}” and its ${Util.plural(l.words.length, 'word')}? This can’t be undone.`, '🗑 Delete', true)) {
          Store.deleteList(l.id);
          UI.toast('List deleted');
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
          </div>
          <div class="btn-row">
            <a class="btn small" href="#/edit/${list.id}">✏️ Edit</a>
            <button type="button" class="btn small" data-do="dup">⧉ Duplicate</button>
            <button type="button" class="btn small ghost danger-text" data-do="del">🗑 Delete</button>
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
      if (b.dataset.do === 'del' && await UI.confirm(`Delete “${Util.esc(list.name)}”? This can’t be undone.`, '🗑 Delete', true)) {
        Store.deleteList(list.id); UI.toast('List deleted'); App.go('#/');
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
      if (b.dataset.do === 'reset' && await UI.confirm('This deletes <b>every</b> list, missed word, and setting saved in this browser. Download a backup first if you might need them.', '🗑 Delete everything', true)) {
        Store.resetAll();
        UI.toast('Everything was deleted.');
        App.go('#/');
      }
    });
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
