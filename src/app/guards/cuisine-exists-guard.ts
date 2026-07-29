import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { isCuisineStyle } from '../library/cuisine-categories';

/**
 * Protects the cuisine list. Only the categories of the cookbook grid have a
 * page, so a hand-typed or outdated cuisine belongs back on the overview.
 * @param route Activated route carrying the 'cuisine' path parameter.
 * @returns True for a known cuisine, otherwise a redirect to the cookbook.
 */
export const cuisineExistsGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  return isCuisineStyle(route.paramMap.get('cuisine') ?? undefined)
    ? true
    : router.createUrlTree(['/library']);
};
