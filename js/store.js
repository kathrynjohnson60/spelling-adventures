/* =====================================================================
   Spelling Adventures — store.js
   Everything the app remembers lives in the browser's localStorage
   under one key, so lists survive closing the tab (no login needed).

   Saved shape:
     lists:    [{ id, name, grade, words:[{word, definition, sentence, pos}], created, updated }]
     settings: { sound, rate, voiceURI, theme, chaseTimer, testFeedback }
     missed:   { listId: { "word": timesMissed } }   ← shared by every activity
     best:     { listId: { speed60: 12, … } }        ← high scores
   ===================================================================== */
'use strict';

const GRADES = [
  { id: '1', label: '1st Grade', short: '1st', emoji: '🐣', band: 1, color: '#ff7aa8' },
  { id: '2', label: '2nd Grade', short: '2nd', emoji: '🐢', band: 1, color: '#ffa53d' },
  { id: '3', label: '3rd Grade', short: '3rd', emoji: '🦊', band: 2, color: '#f2c200' },
  { id: '4', label: '4th Grade', short: '4th', emoji: '🦉', band: 2, color: '#35c46a' },
  { id: '5', label: '5th Grade', short: '5th', emoji: '🚀', band: 3, color: '#2fa8ff' },
  { id: '6', label: '6th Grade', short: '6th', emoji: '🐉', band: 3, color: '#8e6cff' },
  { id: 'custom', label: 'Custom', short: 'Custom', emoji: '⭐', band: 2, color: '#14b8a6' },
];
const gradeInfo = id => GRADES.find(g => g.id === String(id)) || GRADES[GRADES.length - 1];

/* Ready-made lists so a teacher can try every activity right away. */
const SAMPLE_LISTS = [
  {
    name: 'Short a Words', grade: '1', words: [
      { word: 'cat', definition: 'A small furry pet that says meow.', pos: 'noun' },
      { word: 'hat', definition: 'Something you wear on your head.', pos: 'noun' },
      { word: 'map', definition: 'A picture that shows where places are.', pos: 'noun' },
      { word: 'bag', definition: 'Something you carry things in.', pos: 'noun' },
      { word: 'ran', definition: 'Moved fast on your feet.', pos: 'past' },
      { word: 'sad', definition: 'Feeling unhappy.', pos: 'adjective' },
      { word: 'can', definition: 'Able to do something.', pos: 'other', sentence: 'I can ride my bike all by myself.' },
      { word: 'the', definition: 'A word that points to a certain thing.', pos: 'other' },
    ],
  },
  {
    name: 'Long e Teams (ee, ea)', grade: '2', words: [
      { word: 'green', definition: 'The color of grass and leaves.', pos: 'color' },
      { word: 'sheep', definition: 'A farm animal with a woolly coat.', pos: 'noun' },
      { word: 'beach', definition: 'Sandy land next to the ocean.', pos: 'noun', sentence: 'We built a sandcastle at the beach.' },
      { word: 'dream', definition: 'Pictures and stories in your mind while you sleep.', pos: 'noun' },
      { word: 'sleep', definition: 'To rest with your eyes closed.', pos: 'verb' },
      { word: 'teeth', definition: 'The hard white parts in your mouth you chew with.', pos: 'plural' },
      { word: 'please', definition: 'A polite word you use when asking for something.', pos: 'other' },
      { word: 'three', definition: 'The number after two.', pos: 'other' },
    ],
  },
  {
    name: 'Compound Words', grade: '3', words: [
      { word: 'sunshine', definition: 'The light and warmth from the sun.', pos: 'abstract' },
      { word: 'rainbow', definition: 'An arch of colors in the sky after rain.', pos: 'noun' },
      { word: 'football', definition: 'A game played with an oval ball.', pos: 'noun' },
      { word: 'backpack', definition: 'A bag you wear on your back.', pos: 'noun' },
      { word: 'birthday', definition: 'The day you were born, celebrated every year.', pos: 'noun', sentence: 'We had cake and balloons for my birthday.' },
      { word: 'butterfly', definition: 'An insect with large, colorful wings.', pos: 'noun' },
      { word: 'playground', definition: 'An outdoor place with swings and slides.', pos: 'noun' },
      { word: 'sometimes', definition: 'Now and then; not always.', pos: 'other' },
    ],
  },
  {
    name: 'Suffixes: -ful, -ly, -ness', grade: '4', words: [
      { word: 'careful', definition: 'Paying close attention so you do not make a mistake.', pos: 'adjective' },
      { word: 'quickly', definition: 'In a fast way.', pos: 'adverb' },
      { word: 'kindness', definition: 'Being friendly, generous, and caring.', pos: 'abstract' },
      { word: 'beautiful', definition: 'Very pretty or pleasing to see or hear.', pos: 'adjective' },
      { word: 'thoughtful', definition: 'Thinking about the feelings of others.', pos: 'adjective' },
      { word: 'slowly', definition: 'In a way that is not fast.', pos: 'adverb' },
      { word: 'darkness', definition: 'The state of having little or no light.', pos: 'abstract' },
      { word: 'helpful', definition: 'Giving help; useful.', pos: 'adjective' },
    ],
  },
  {
    name: 'Science Words', grade: '5', words: [
      { word: 'energy', definition: 'The power to do work or make something move or change.', pos: 'abstract' },
      { word: 'gravity', definition: 'The force that pulls objects toward each other.', pos: 'abstract' },
      { word: 'habitat', definition: 'The natural home of a plant or animal.', pos: 'noun' },
      { word: 'observe', definition: 'To watch something carefully.', pos: 'verb' },
      { word: 'predict', definition: 'To say what you think will happen.', pos: 'verb' },
      { word: 'temperature', definition: 'How hot or cold something is.', pos: 'abstract' },
      { word: 'evaporate', definition: 'To change from a liquid into a gas.', pos: 'verb', sentence: 'The puddle will evaporate in the hot sun.' },
      { word: 'organism', definition: 'Any living thing.', pos: 'noun' },
    ],
  },
  {
    name: 'Greek & Latin Roots', grade: '6', words: [
      { word: 'biography', definition: 'The true story of a person’s life, written by someone else.', pos: 'noun' },
      { word: 'telescope', definition: 'A tool that makes faraway things look closer.', pos: 'noun' },
      { word: 'transport', definition: 'To carry something from one place to another.', pos: 'verb', sentence: 'Trucks transport fresh food to the grocery store.' },
      { word: 'autograph', definition: 'A person’s own signature.', pos: 'noun' },
      { word: 'microscope', definition: 'A tool that makes tiny things look bigger.', pos: 'noun' },
      { word: 'democracy', definition: 'Government by the people, who vote for leaders.', pos: 'abstract' },
      { word: 'spectator', definition: 'A person who watches an event.', pos: 'noun' },
      { word: 'construct', definition: 'To build or put together.', pos: 'verb' },
    ],
  },
];

const Store = (() => {
  const KEY = 'spellingAdventures.v1';
  const DEFAULT_SETTINGS = {
    sound: true,           // sound effects on/off
    rate: 0.85,            // speech speed (0.5 – 1.3)
    voiceURI: '',          // chosen voice ('' = automatic)
    theme: 'castle',       // Escape the Danger theme: castle | lake | forest | river
    chaseTimer: true,      // danger slowly creeps closer if the player waits
    testFeedback: true,    // show right/wrong after each test word
  };
  const fresh = () => ({ lists: [], settings: { ...DEFAULT_SETTINGS }, missed: {}, best: {} });
  let data = fresh();
  let warned = false;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        data = { ...fresh(), ...d, settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) } };
        data.lists = (data.lists || []).map(clean);
        // "Ocean Escape" became "Lake Escape" (10/31) — carry the saved choice over.
        if (data.settings.theme === 'ocean') data.settings.theme = 'lake';
        delete data.settings.oceanDanger;
      }
    } catch (e) {
      console.warn('Could not read saved data', e);
    }
  }

  function save() {
    if (typeof Speech !== 'undefined') Speech.refreshPronunciations();
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      if (!warned) UI.toast('⚠️ Could not save — browser storage is full or blocked.', 'bad');
      warned = true;
    }
  }

  /** Make sure a list has the right shape (protects against old saves and imported files). */
  function clean(list) {
    const words = (list.words || [])
      .map(w => (typeof w === 'string' ? { word: w } : w))
      .filter(w => w && String(w.word || '').trim())
      .map(w => ({
        word: String(w.word).trim().replace(/\s+/g, ' ').slice(0, 40),
        definition: String(w.definition || '').trim().slice(0, 300),
        sentence: String(w.sentence || '').trim().slice(0, 300),
        say: String(w.say || '').trim().slice(0, 60),   // optional "say it like" spelling for the voice
        pos: w.pos || 'auto',
      }));
    return {
      id: list.id || Util.uid(),
      name: String(list.name || 'My Spelling List').trim().slice(0, 80) || 'My Spelling List',
      grade: GRADES.some(g => g.id === String(list.grade)) ? String(list.grade) : 'custom',
      words,
      created: list.created || Date.now(),
      updated: list.updated || Date.now(),
    };
  }

  return {
    load,
    save,
    clean,

    /* ----- settings ----- */
    get settings() { return data.settings; },
    setSetting(key, value) { data.settings[key] = value; save(); },

    /* ----- lists ----- */
    get lists() { return data.lists; },
    getList(id) { return data.lists.find(l => l.id === id); },
    saveList(list) {
      const l = clean({ ...list, updated: Date.now() });
      const i = data.lists.findIndex(x => x.id === l.id);
      if (i >= 0) data.lists[i] = l; else data.lists.push(l);
      save();
      return l;
    },
    deleteList(id) {
      data.lists = data.lists.filter(l => l.id !== id);
      delete data.missed[id];
      delete data.best[id];
      save();
    },
    duplicateList(id) {
      const src = this.getList(id);
      if (!src) return null;
      const copy = clean({ ...JSON.parse(JSON.stringify(src)), id: Util.uid(), name: `${src.name} (copy)`, created: Date.now() });
      data.lists.push(copy);
      save();
      return copy;
    },

    /* ----- missed words: every activity reports here ----- */
    missedFor(listId) { return data.missed[listId] || {}; },
    missedWords(list) {
      const m = this.missedFor(list.id);
      return list.words.filter(w => m[Util.norm(w.word)] > 0);
    },
    /** A miss adds to the count (max 2); each correct answer takes one away. */
    record(listId, word, correct) {
      const key = Util.norm(word);
      const m = data.missed[listId] || (data.missed[listId] = {});
      if (correct) {
        if (m[key]) { m[key]--; if (m[key] <= 0) delete m[key]; }
      } else {
        m[key] = Math.min((m[key] || 0) + 1, 2);
      }
      save();
    },
    clearMissed(listId) { delete data.missed[listId]; save(); },

    /* ----- high scores ----- */
    getBest(listId, key) { return (data.best[listId] || {})[key] || 0; },
    setBest(listId, key, value) {
      const b = data.best[listId] || (data.best[listId] = {});
      if (value > (b[key] || 0)) { b[key] = value; save(); return true; }
      return false;
    },

    /* ----- backup / restore ----- */
    exportData() {
      return JSON.stringify({ app: 'Spelling Adventures', version: 1, exported: new Date().toISOString(), lists: data.lists }, null, 2);
    },
    importData(text) {
      const d = JSON.parse(text);
      const lists = Array.isArray(d) ? d : d.lists;
      if (!Array.isArray(lists)) throw new Error('No spelling lists found in that file.');
      let n = 0;
      lists.forEach(l => {
        const c = clean(l);
        if (!c.words.length) return;
        if (this.getList(c.id)) c.id = Util.uid();
        data.lists.push(c);
        n++;
      });
      save();
      return n;
    },
    resetAll() {
      data = fresh();
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    },
    addSamples() {
      SAMPLE_LISTS.forEach(l => data.lists.push(clean({ ...JSON.parse(JSON.stringify(l)), id: Util.uid() })));
      save();
    },
  };
})();
