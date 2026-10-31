/* =====================================================================
   Flashcards
   Two tabs:
     • Print – 4 or 6 cards per page with dashed cut lines.
         - Double-sided: fronts page, then a backs page arranged so that
           the backs line up when printed on both sides (flip on long edge).
         - Fold-over: word on the left, back on the right, fold down the middle.
         - Word only: just the fronts.
     • Study – flip through big cards on screen.
   ===================================================================== */
'use strict';

Activities.flashcards = {
  title: 'Flashcards',
  icon: '🗂️',
  color: '#00cec9',
  desc: 'Print flashcards or flip through them on screen.',
  minWords: 1,

  start(root, ctx) {
    const { body } = UI.shell(root, ctx, this);
    const opts = { tab: 'print', perPage: 6, back: 'definition', layout: 'double', showTitle: true };
    const words = ctx.words.slice();

    // Generate one sentence per word up front so the preview and the printout match.
    const sentence = new Map(words.map(w => [w.word, w.sentence || Sentences.generate(w, ctx.grade, 1)[0]]));
    const backText = w => {
      const def = w.definition;
      const sen = sentence.get(w.word);
      if (opts.back === 'definition') return def ? { def } : { sen };
      if (opts.back === 'sentence') return { sen };
      return { def, sen };
    };
    const backHTML = w => {
      if (!w) return '';
      const b = backText(w);
      return `${b.def ? `<p class="fc-def">${Util.esc(b.def)}</p>` : ''}${b.sen ? `<p class="fc-sen">${Sentences.highlight(b.sen, w.word)}</p>` : ''}`;
    };

    body.innerHTML = `
      <div class="tabs no-print" role="tablist">
        <button type="button" class="tab" data-tab="print">🖨️ Print cards</button>
        <button type="button" class="tab" data-tab="study">👀 Study on screen</button>
      </div>
      <div class="fc-content"></div>`;
    const content = Util.$('.fc-content', body);

    /* ---------- printing ---------- */
    function chunk(arr, n) { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }

    function pagesHTML() {
      const title = opts.showTitle ? `<div class="fc-page-title">${Util.esc(ctx.list.name)} · ${gradeInfo(ctx.grade).label}</div>` : '';
      const rows = opts.perPage / 2;
      const front = w => `<div class="fc-card front">${w ? `<span class="fc-word">${Util.esc(w.word)}</span>` : ''}</div>`;
      const back = w => `<div class="fc-card back">${backHTML(w)}</div>`;
      const html = [];

      if (opts.layout === 'fold') {
        // One card per row: word | back. Cut on the dashed lines, fold on the dotted line.
        chunk(words, opts.perPage).forEach((group, p) => {
          html.push(`<div class="fc-page fold" style="--rows:${opts.perPage}">${title}
            <div class="fc-grid">${group.map(w => `
              <div class="fc-fold"><div class="fc-card front"><span class="fc-word">${Util.esc(w.word)}</span></div>
              <div class="fc-card back">${backHTML(w)}</div></div>`).join('')}</div>
            <div class="fc-page-foot">✂ Cut on the dashed lines · fold on the dotted line · page ${p + 1}</div></div>`);
        });
        return html.join('');
      }

      chunk(words, opts.perPage).forEach((group, p) => {
        html.push(`<div class="fc-page" style="--rows:${rows}">${title}
          <div class="fc-grid">${group.map(front).join('')}</div>
          <div class="fc-page-foot">✂ Cut on the dashed lines · fronts · page ${p + 1}</div></div>`);
        if (opts.layout === 'double') {
          // Swap left/right in each row so backs line up when printed double-sided.
          const cells = [];
          for (let r = 0; r < Math.ceil(group.length / 2); r++) {
            const a = group[r * 2];
            const b = group[r * 2 + 1];
            cells.push(b ? back(b) : '<div class="fc-card back empty"></div>', back(a));
          }
          html.push(`<div class="fc-page" style="--rows:${rows}">${title}
            <div class="fc-grid">${cells.join('')}</div>
            <div class="fc-page-foot">backs · page ${p + 1} · print double-sided, flip on long edge</div></div>`);
        }
      });
      return html.join('');
    }

    function renderPrint() {
      content.innerHTML = `
        <div class="card fc-controls no-print">
          <div class="control-grid">
            <label>Cards per page
              <select data-opt="perPage"><option value="4">4 big cards</option><option value="6">6 cards</option></select></label>
            <label>Layout
              <select data-opt="layout">
                <option value="double">Double-sided (front & back pages)</option>
                <option value="fold">Fold-over (word | back side by side)</option>
                <option value="word">Word only (no back)</option>
              </select></label>
            <label>Back of card shows
              <select data-opt="back">
                <option value="definition">Definition (or sentence if none)</option>
                <option value="sentence">Example sentence</option>
                <option value="both">Definition + sentence</option>
              </select></label>
            <label class="check"><input type="checkbox" data-opt="showTitle"> Show list name on each page</label>
          </div>
          <div class="btn-row">
            <button type="button" class="btn primary big" data-do="print">🖨️ Print flashcards</button>
            <button type="button" class="btn ghost" data-do="regen">🔄 New example sentences</button>
          </div>
          <p class="muted small">Tip: in the print window, set margins to “Default” and turn off “Headers and footers”.</p>
        </div>
        <div class="fc-preview">${pagesHTML()}</div>`;
      Util.$$('[data-opt]', content).forEach(el => {
        const k = el.dataset.opt;
        if (el.type === 'checkbox') el.checked = opts[k]; else el.value = String(opts[k]);
        el.disabled = k === 'back' && opts.layout === 'word';
        el.onchange = () => {
          opts[k] = el.type === 'checkbox' ? el.checked : k === 'perPage' ? +el.value : el.value;
          renderPrint();
        };
      });
      Util.$('[data-do=print]', content).onclick = () => window.print();
      Util.$('[data-do=regen]', content).onclick = () => {
        words.forEach(w => { if (!w.sentence) sentence.set(w.word, Sentences.generate(w, ctx.grade, 1)[0]); });
        renderPrint();
      };
    }

    /* ---------- study mode ---------- */
    let order = words.slice();
    let i = 0;
    function renderStudy() {
      const w = order[i];
      content.innerHTML = `
        <div class="study pop-in">
          <p class="muted center">Card ${i + 1} of ${order.length} · tap the card to flip it</p>
          <button type="button" class="study-card" aria-label="Flip card">
            <span class="study-inner">
              <span class="study-face study-front"><span class="fc-word">${Util.esc(w.word)}</span><small>${emojiFor(w.word)}</small></span>
              <span class="study-face study-back">${backHTML(w) || '<p>Add a definition in the list editor!</p>'}</span>
            </span>
          </button>
          <div class="btn-row center">
            <button type="button" class="btn" data-do="prev" ${i === 0 ? 'disabled' : ''}>⬅ Back</button>
            <button type="button" class="btn" data-do="say">🔊 Say it</button>
            <button type="button" class="btn" data-do="shuffle">🔀 Shuffle</button>
            <button type="button" class="btn primary" data-do="next">${i === order.length - 1 ? '🔁 Start over' : 'Next ➡'}</button>
          </div>
        </div>`;
      Util.$('.study-card', content).onclick = e => { e.currentTarget.classList.toggle('flipped'); Sound.play('flip'); };
    }

    body.onclick = e => {
      const tab = e.target.closest('[data-tab]');
      if (tab) { opts.tab = tab.dataset.tab; return show(); }
      const b = e.target.closest('[data-do]');
      if (!b || opts.tab !== 'study') return;
      if (b.dataset.do === 'prev' && i > 0) i--;
      if (b.dataset.do === 'next') i = i < order.length - 1 ? i + 1 : 0;
      if (b.dataset.do === 'shuffle') { order = Util.shuffle(words); i = 0; }
      if (b.dataset.do === 'say') return Speech.speak(order[i].word);
      renderStudy();
    };

    function show() {
      Util.$$('[data-tab]', body).forEach(t => t.classList.toggle('active', t.dataset.tab === opts.tab));
      if (opts.tab === 'print') renderPrint(); else renderStudy();
    }
    show();
  },
};
