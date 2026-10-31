/* =====================================================================
   Spelling Adventures — app.js
   Starts the app and switches screens based on the address bar "hash":

     #/                      home dashboard
     #/new                   new list
     #/edit/<id>             edit a list
     #/list/<id>[?missed=1]  one list + all activities
     #/play/<activity>/<id>[?missed=1]   run an activity
     #/settings              settings
     #/account               sign in / my account (teachers & parents)
     #/join/<CODE>           students: get a list with a class code

   Using the hash means the browser Back button works and nothing needs
   a web server — just open index.html.
   ===================================================================== */
'use strict';

const App = {
  cleanup: null,       // function returned by the running activity (stops timers, key listeners)
  isDirty: null,       // the editor sets this so we can warn about unsaved changes
  pending: null,       // a custom word set (e.g. "missed words from this game") for the next launch
  currentHash: '',
  ignoreNext: false,

  init() {
    Store.load();
    Speech.init();
    Speech.refreshPronunciations();
    // Accounts: show the Sign in button (if set up) and refresh the screen when someone signs in or out.
    const acct = Util.$('#account-nav');
    if (acct) acct.hidden = !Cloud.enabled;
    Cloud.onChange(u => {
      if (acct) {
        Util.$('span', acct).textContent = u ? 'My Account' : 'Sign in';
        acct.title = u ? 'My Account (sign out here)' : 'Sign in';
        acct.classList.toggle('signed-in', !!u);
      }
      // Don't interrupt a game or the list editor; everything else re-draws with the right lists.
      const page = (location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]) || 'home';
      if (['home', 'list', 'account', 'settings'].includes(page)) this.route();
    });
    Cloud.init();
    window.addEventListener('hashchange', () => this.route());
    window.addEventListener('beforeunload', e => {
      if (this.isDirty && this.isDirty()) { e.preventDefault(); e.returnValue = ''; }
    });
    this.route();
  },

  go(hash) {
    if (location.hash === hash) this.route();
    else location.hash = hash;
  },

  /** Start an activity. `words` = custom set (optional); `missed` = use the list's missed words. */
  launch(act, listId, words = null, missed = false) {
    this.pending = words ? { act, listId, words } : null;
    this.go(`#/play/${act}/${listId}${missed ? '?missed=1' : ''}`);
  },

  route() {
    if (this.ignoreNext) { this.ignoreNext = false; return; }
    // Unsaved changes in the editor? Ask before leaving.
    if (this.isDirty && this.isDirty() && location.hash !== this.currentHash) {
      if (!window.confirm('You have unsaved changes. Leave without saving?')) {
        this.ignoreNext = true;
        location.hash = this.currentHash;
        return;
      }
    }
    this.isDirty = null;
    this.currentHash = location.hash;

    if (this.cleanup) { try { this.cleanup(); } catch (e) { console.error(e); } this.cleanup = null; }
    Speech.stop();

    // Swap in a fresh, empty <main> so no click handlers carry over between screens.
    const old = Util.$('#app');
    const main = old.cloneNode(false);
    old.replaceWith(main);
    window.scrollTo(0, 0);

    const [path, queryString] = location.hash.replace(/^#\/?/, '').split('?');
    const query = new URLSearchParams(queryString || '');
    const parts = path.split('/').filter(Boolean);
    const page = parts[0] || 'home';

    Util.$$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === page));
    document.body.dataset.page = page;

    switch (page) {
      case 'new': return Views.editor(main, null);
      case 'edit': return Views.editor(main, parts[1]);
      case 'list': return Views.hub(main, parts[1], query);
      case 'settings': return Views.settings(main);
      case 'account': return Views.account(main);
      case 'join': return Views.join(main, parts[1]);
      case 'play': return this.play(main, parts[1], parts[2], query.get('missed') === '1');
      default: return Views.home(main);
    }
  },

  play(main, act, listId, missedOnly) {
    const list = Store.getList(listId);
    const A = Activities[act];
    if (!list || !A) return Views.notFound(main);

    let words;
    let subset = false;
    if (this.pending && this.pending.act === act && this.pending.listId === listId) {
      words = this.pending.words; subset = true;
    } else if (missedOnly) {
      words = Store.missedWords(list); subset = true;
    } else {
      words = list.words;
    }
    this.pending = null;
    if (subset && words.length === list.words.length) subset = false;

    if (words.length < (A.minWords || 1)) {
      main.innerHTML = `
        <section class="card center pop-in">
          <div class="welcome-art">${missedOnly ? '🎉' : '✏️'}</div>
          <h1>${missedOnly && !words.length ? 'No missed words to practice!' : `${A.title} needs at least ${A.minWords} words`}</h1>
          <p class="muted">${missedOnly ? 'Great job — try the full list instead.' : 'Add more words to this list first.'}</p>
          <div class="btn-row center">
            <a class="btn primary" href="#/list/${list.id}">🧩 Back to activities</a>
          </div>
        </section>`;
      return;
    }

    const ctx = {
      act,
      list,
      grade: list.grade,
      words,
      subset,
      record: (word, ok) => Store.record(list.id, word, ok),
      restart: (w) => this.launch(act, list.id, w || (subset ? words : null)),
      launch: (otherAct, w) => this.launch(otherAct, list.id, w),
    };
    document.body.dataset.page = 'play';
    const cleanup = A.start(main, ctx);
    this.cleanup = typeof cleanup === 'function' ? cleanup : null;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  if (!Speech.supported) setTimeout(() => UI.toast('⚠️ This browser can’t read words aloud. Try Chrome, Edge, or Safari.'), 800);
});
