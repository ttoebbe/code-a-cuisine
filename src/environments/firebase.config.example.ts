/**
 * Template for firebase.config.ts, which holds the web config of the recipe
 * library and stays out of version control.
 *
 * Copy this file to firebase.config.ts by hand and fill in the six values from
 * the Firebase console (Project settings > Your apps > Web app > SDK setup and
 * configuration > Config) — no npm script creates the copy for you, and the
 * build fails on the missing import until it exists.
 *
 * In GitHub Actions the file is generated instead: ci.yml copies this example
 * as-is because it only compiles, while deploy-frontend.yml writes the
 * FIREBASE_CONFIG secret and refuses to deploy a config that still holds the
 * TODO- placeholders below. See docs/firebase.md.
 */
export const firebaseConfig = {
  apiKey: 'TODO-firebase-api-key',
  authDomain: 'TODO-project-id.firebaseapp.com',
  projectId: 'TODO-project-id',
  storageBucket: 'TODO-project-id.firebasestorage.app',
  messagingSenderId: 'TODO-sender-id',
  appId: 'TODO-app-id',
};
