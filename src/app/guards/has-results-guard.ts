import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { RecipeGenerationService } from '../services/recipe-generation.service';

/**
 * Protects the result screens. The suggestions only live in memory, so a
 * direct hit or a reload has nothing to show and belongs in the wizard.
 * @returns True when suggestions exist, otherwise a redirect to the generator.
 */
export const hasResultsGuard: CanActivateFn = () => {
  const generation = inject(RecipeGenerationService);
  const router = inject(Router);
  return generation.hasResults() ? true : router.createUrlTree(['/generator']);
};
