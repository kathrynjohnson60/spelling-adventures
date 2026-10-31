/* =====================================================================
   Spelling Adventures — cloud.js
   Teacher & parent accounts, using Firebase (Google's free service).

     • Sign in with Google, or with an email and password.
     • Signed in: lists are saved to the account (Firestore) and show up on
       any device where the teacher signs in. A copy is kept in the browser
       so the app still opens quickly and works offline.
     • Class codes: a teacher shares a list; students type the code (or open
       the link) to get that list on their device. Students never sign in,
       and nothing about students is stored online.

   Online data:
     users/{uid}/lists/{listId}  – a teacher's own lists (private to them)
     shared/{CODE}               – a list a teacher shared (anyone with the code can read it)

   If js/firebase-config.js has no settings (or the page is opened straight
   from a file), accounts are switched off and everything works as before.
   ===================================================================== */
'use strict';

const Cloud = (() => {
  const enabled = typeof FIREBASE_CONFIG !== 'undefined' && !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey)
    && typeof firebase !== 'undefined' && /^https?:$/.test(location.protocol);
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O or 1/I/L, so codes are easy to read aloud
  let auth = null;
  let db = null;
  let user = null;
  let ready = false;
  const listeners = [];

  function init() {
    if (!enabled) return;
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
      // Keep a copy on this device so lists load fast and edits made offline sync later.
      db.enablePersistence({ synchronizeTabs: true }).catch(() => { /* private windows etc. */ });
      auth.onAuthStateChanged(async u => {
        const was = user;
        user = u;
        // Show the signed-in (or signed-out) state right away…
        ready = true;
        listeners.forEach(fn => fn(u));
        // …then load the account's lists and refresh again.
        try {
          if (u) await onSignedIn(u, !!was);
          else Store.leaveAccount();
        } catch (e) {
          console.error(e);
          UI.toast('⚠️ Could not load your account’s lists. Check your internet connection.', 'bad');
        }
        if (user === u) listeners.forEach(fn => fn(u));
      });
    } catch (e) {
      console.error('Firebase could not start', e);
    }
  }

  /* ---------- account lists ---------- */
  const listsRef = uid => db.collection('users').doc(uid).collection('lists');

  /** The parts of a list that are saved online. */
  function toCloud(l) {
    return {
      name: l.name, grade: l.grade, created: l.created || Date.now(), updated: l.updated || Date.now(),
      shareCode: l.shareCode || null,
      words: l.words.map(w => ({ word: w.word, definition: w.definition || '', sentence: w.sentence || '', say: w.say || '', pos: w.pos || 'auto' })),
    };
  }

  async function onSignedIn(u, alreadyHadUser) {
    const snap = await listsRef(u.uid).get();
    let cloudLists = snap.docs.map(d => ({ ...d.data(), id: d.id }));

    // Lists made on this device before signing in: offer to add them to the account.
    // (Lists already in the account, or already shared, are left alone.)
    const deviceLists = Store.lists.filter(l => l.origin !== 'class' && !l.account && !cloudLists.some(c => c.id === l.id));
    if (deviceLists.length && !alreadyHadUser) {
      const add = await UI.modal({
        title: '📚 Add this device’s lists to your account?',
        html: `<p>This browser has <b>${Util.plural(deviceLists.length, 'spelling list')}</b> that ${deviceLists.length === 1 ? 'isn’t' : 'aren’t'} in your account yet:</p>
               <p class="muted">${deviceLists.slice(0, 8).map(l => Util.esc(l.name)).join(', ')}${deviceLists.length > 8 ? '…' : ''}</p>
               <p>Add ${deviceLists.length === 1 ? 'it' : 'them'} so ${deviceLists.length === 1 ? 'it shows' : 'they show'} up wherever you sign in?</p>`,
        buttons: [
          { label: 'Not now', value: false, cls: 'ghost' },
          { label: '☁️ Add to my account', value: true, cls: 'primary' },
        ],
      });
      if (add) {
        const batch = db.batch();
        deviceLists.forEach(l => batch.set(listsRef(u.uid).doc(l.id), toCloud(l)));
        await batch.commit();
        cloudLists = cloudLists.concat(deviceLists.filter(l => !cloudLists.some(c => c.id === l.id)));
        UI.toast(`☁️ Added ${Util.plural(deviceLists.length, 'list')} to your account`, 'good');
      } else {
        Store.stashDeviceLists(deviceLists);
      }
    }
    // Lists created or shared while the question above was showing are already in the account.
    const madeMeanwhile = Store.lists.filter(l => l.account === u.uid && !cloudLists.some(c => c.id === l.id));
    Store.useAccountLists(u.uid, cloudLists.concat(madeMeanwhile));
  }

  /** Called by Store whenever a list is created or changed. */
  function listSaved(l) {
    if (!user || l.origin === 'class') return;
    listsRef(user.uid).doc(l.id).set(toCloud(l)).catch(err => {
      console.error(err);
      UI.toast('⚠️ Saved on this device, but not to your account yet. It will try again when you’re online.', 'bad');
    });
    if (l.shareCode) {
      db.collection('shared').doc(l.shareCode).set({ ownerUid: user.uid, from: teacherName(), ...sharedFields(l) }).catch(console.error);
    }
  }

  function listDeleted(l) {
    if (!user || l.origin === 'class') return;
    listsRef(user.uid).doc(l.id).delete().catch(console.error);
    if (l.shareCode) db.collection('shared').doc(l.shareCode).delete().catch(console.error);
  }

  /* ---------- class codes ---------- */
  const sharedFields = l => {
    const c = toCloud(l);
    return { name: c.name, grade: c.grade, words: c.words, updated: Date.now() };
  };
  const teacherName = () => (user && (user.displayName || '')) || '';

  function newCode() {
    let s = '';
    const r = crypto.getRandomValues(new Uint32Array(6));
    r.forEach(n => { s += CODE_CHARS[n % CODE_CHARS.length]; });
    return s;
  }

  /** Share a list with students. Returns its class code. */
  async function share(l) {
    if (!user) throw new Error('Sign in to share lists.');
    let code = l.shareCode;
    if (!code) {
      for (let tries = 0; tries < 5 && !code; tries++) {
        const c = newCode();
        const exists = await db.collection('shared').doc(c).get();
        if (!exists.exists) code = c;
      }
      if (!code) throw new Error('Could not make a class code. Please try again.');
    }
    await db.collection('shared').doc(code).set({ ownerUid: user.uid, from: teacherName(), ...sharedFields(l) });
    if (l.shareCode !== code) Store.saveList({ ...l, shareCode: code });
    return code;
  }

  async function unshare(l) {
    if (!user || !l.shareCode) return;
    await db.collection('shared').doc(l.shareCode).delete();
    Store.saveList({ ...l, shareCode: '' });
  }

  /** Students: fetch a shared list by its code (no sign-in needed). */
  async function fetchShared(code) {
    const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length !== 6) throw new Error('A class code has 6 letters and numbers.');
    const doc = await db.collection('shared').doc(c).get();
    if (!doc.exists) throw new Error('We couldn’t find that class code. Check it with your teacher.');
    return { code: c, ...doc.data() };
  }

  function shareLink(code) {
    return `${location.origin}${location.pathname.replace(/index\.html$/, '')}#/join/${code}`;
  }

  /* ---------- signing in and out ---------- */
  const FRIENDLY = {
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/user-not-found': 'No account uses that email. Choose “Create an account” instead.',
    'auth/wrong-password': 'That password isn’t right. Try again, or reset it.',
    'auth/invalid-credential': 'That email or password isn’t right. Try again, or reset your password.',
    'auth/email-already-in-use': 'An account already uses that email. Choose “Sign in” instead.',
    'auth/weak-password': 'Please use a password with at least 6 characters.',
    'auth/too-many-requests': 'Too many tries. Please wait a few minutes and try again.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.',
    'auth/popup-closed-by-user': 'The Google sign-in window was closed before finishing.',
    'auth/network-request-failed': 'No internet connection. Please check it and try again.',
    'auth/unauthorized-domain': 'This web address isn’t allowed to sign in yet. Add it under Firebase → Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed': 'This sign-in method isn’t turned on yet in Firebase.',
  };
  const friendly = e => FRIENDLY[e && e.code] || (e && e.message) || 'Something went wrong. Please try again.';

  return {
    enabled,
    init,
    get user() { return user; },
    get ready() { return ready || !enabled; },
    onChange(fn) { listeners.push(fn); },
    friendly,
    signInGoogle: () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()),
    signInEmail: (email, pw) => auth.signInWithEmailAndPassword(email, pw),
    createEmail: async (name, email, pw) => {
      const cred = await auth.createUserWithEmailAndPassword(email, pw);
      if (name) await cred.user.updateProfile({ displayName: name });
      return cred;
    },
    resetPassword: email => auth.sendPasswordResetEmail(email),
    signOut: () => auth.signOut(),
    listSaved,
    listDeleted,
    share,
    unshare,
    fetchShared,
    shareLink,
  };
})();
