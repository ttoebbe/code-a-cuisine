import { InjectionToken, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeFirestore, type Firestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

/**
 * Firestore instance of the recipe library. Only RecipeLibraryService injects
 * it, so no component ever talks to Firestore directly.
 */
export const FIRESTORE = new InjectionToken<Firestore>('Firestore of the recipe library');

/**
 * Boots the Firebase app once and hands out its Firestore instance.
 * Reuses an existing app so a hot reload does not initialise twice.
 * Long polling is forced: WebKit accepts the streaming listen channel with a
 * 200 but never delivers a chunk, so the cookbook hangs on "Loading recipes…"
 * in Safari. Long polling is a little chattier but works in every engine.
 * @returns Firestore of the configured project.
 */
function createFirestore(): Firestore {
  const app = getApps().length > 0 ? getApp() : initializeApp(environment.firebase);
  return initializeFirestore(app, { experimentalForceLongPolling: true });
}

/**
 * Registers Firestore for the application injector.
 * @returns Providers to spread into app.config.ts.
 */
export function provideFirestore(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: FIRESTORE, useFactory: createFirestore }]);
}
