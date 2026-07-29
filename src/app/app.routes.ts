import { Routes } from '@angular/router';
import { cuisineExistsGuard } from './guards/cuisine-exists-guard';
import { hasResultsGuard } from './guards/has-results-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home').then((m) => m.Home),
    // Header and footer take the colour of the page they frame; only the two
    // green pages say so, every other route falls back to the light shell.
    data: { shell: 'green' },
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
    data: { shell: 'green' },
    title: 'Recipe results · Code à Cuisine',
  },
  {
    // A suggestion is addressed by its position in the result list and its
    // back link leads there; the cookbook route below reuses the same view.
    path: 'results/:index',
    loadComponent: () => import('./recipe-view/recipe-view').then((m) => m.RecipeView),
    canActivate: [hasResultsGuard],
    data: { backTo: 'results' },
    title: 'Recipe · Code à Cuisine',
  },
  {
    path: 'library',
    loadComponent: () => import('./library/library').then((m) => m.Library),
    title: 'Cookbook · Code à Cuisine',
  },
  {
    // Declared before 'library/:id' so the three segments read as a category
    // page rather than as a recipe that happens to be called "cuisine".
    path: 'library/cuisine/:cuisine',
    loadComponent: () =>
      import('./library/cuisine-recipes/cuisine-recipes').then((m) => m.CuisineRecipes),
    canActivate: [cuisineExistsGuard],
    title: 'Cuisine · Code à Cuisine',
  },
  {
    // A stored recipe is addressed by its Firestore document id, so the view
    // survives a reload and the link can be shared.
    path: 'library/:id',
    loadComponent: () => import('./recipe-view/recipe-view').then((m) => m.RecipeView),
    data: { backTo: 'cookbook' },
    title: 'Recipe · Code à Cuisine',
  },
  {
    path: 'imprint',
    loadComponent: () => import('./imprint/imprint').then((m) => m.Imprint),
    title: 'Imprint · Code à Cuisine',
  },
  { path: '**', redirectTo: '' },
];
