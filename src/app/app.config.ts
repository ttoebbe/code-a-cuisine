import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  provideRouter,
  withComponentInputBinding,
  withEnabledBlockingInitialNavigation,
} from '@angular/router';

import { routes } from './app.routes';
import { provideFirestore } from './firebase/firestore.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withFetch()),
    // Blocking initial navigation: the shell takes its colour from the routed
    // page, so it must not paint before that route is known.
    provideRouter(routes, withComponentInputBinding(), withEnabledBlockingInitialNavigation()),
    provideFirestore(),
  ],
};
