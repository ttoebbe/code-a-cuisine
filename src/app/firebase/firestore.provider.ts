import { InjectionToken, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

/**
 * Firestore instance of the recipe library. Only RecipeLibraryService injects
 * it, so no component ever talks to Firestore directly.
 */
export const FIRESTORE = new InjectionToken<Firestore>('Firestore of the recipe library');

/**
 * Boots the Firebase app once and hands out its Firestore instance.
 * Reuses an existing app so a hot reload does not initialise twice.
 * @returns Firestore of the configured project.
 */
function createFirestore(): Firestore {
  const app = getApps().length > 0 ? getApp() : initializeApp(environment.firebase);
  return getFirestore(app);
}

/**
 * Registers Firestore for the application injector.
 * @returns Providers to spread into app.config.ts.
 */
export function provideFirestore(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: FIRESTORE, useFactory: createFirestore }]);
}
