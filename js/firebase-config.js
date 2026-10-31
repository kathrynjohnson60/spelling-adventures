/* =====================================================================
   Spelling Adventures — firebase-config.js
   Connects the app to Kathryn's Firebase project so teachers and parents
   can sign in and save their lists to an account (see SETUP-ACCOUNTS.md).

   Paste the "firebaseConfig" values from the Firebase console below.
   These values are NOT passwords. Every web app that uses Firebase shares
   them publicly; what keeps each account's lists private is the security
   rules in firestore.rules.

   While this is left as null, the app works exactly as before: no sign-in,
   and lists are saved only in the browser.
   ===================================================================== */
'use strict';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCyqpWzUR4QIT_5Ih6XvCGDvJFvMwC_K8w',
  authDomain: 'spelling-adventures-b7574.firebaseapp.com',
  projectId: 'spelling-adventures-b7574',
  storageBucket: 'spelling-adventures-b7574.firebasestorage.app',
  messagingSenderId: '295690089259',
  appId: '1:295690089259:web:b357c4e23f9c85ce0b4b6e',
};
