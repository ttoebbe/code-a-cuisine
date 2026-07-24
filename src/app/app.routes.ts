import { Routes } from '@angular/router';

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
