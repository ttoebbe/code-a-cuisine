import { Routes } from '@angular/router';
import { hasResultsGuard } from './guards/has-results-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home').then((m) => m.Home),
    title: 'Code à Cuisine',
  },
  {
    path: 'generator',
    loadComponent: () => import('./generator/generator').then((m) => m.Generator),
    title: 'Generator · Code à Cuisine',
  },
  {
    path: 'results',
    loadComponent: () => import('./results/results').then((m) => m.Results),
    canActivate: [hasResultsGuard],
    title: 'Recipe results · Code à Cuisine',
  },
  {
    // The back link of a suggestion leads to the result list; the same view is
    // reused from the cookbook later on with backTo: 'cookbook'.
    path: 'results/:index',
    loadComponent: () => import('./recipe-view/recipe-view').then((m) => m.RecipeView),
    canActivate: [hasResultsGuard],
    data: { backTo: 'results' },
    title: 'Recipe · Code à Cuisine',
  },
  {
    path: 'library',
    loadComponent: () => import('./library/library').then((m) => m.Library),
    title: 'Library · Code à Cuisine',
  },
  {
    path: 'imprint',
    loadComponent: () => import('./imprint/imprint').then((m) => m.Imprint),
    title: 'Imprint · Code à Cuisine',
  },
  { path: '**', redirectTo: '' },
];
