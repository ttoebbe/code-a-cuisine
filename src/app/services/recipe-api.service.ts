import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import type { RecipeRequest } from '../models/recipe-request.interface';
import type { RecipeErrorResponse, RecipeResponse } from '../models/recipe-response.interface';

/** Fallback envelope for failures that never reached the workflow. */
function buildTransportError(): RecipeErrorResponse {
  return {
    status: 'error',
    code: 'internal_error',
    message: 'The recipe service is not reachable right now. Please try again in a moment.',
    retryAfter: null,
  };
}

/**
 * Single entry point to the n8n recipe workflow. Owns the HTTP call so no
 * component talks to the webhook directly, and normalises every failure into
 * the RecipeErrorResponse envelope the UI already understands.
 */
@Injectable({ providedIn: 'root' })
export class RecipeApiService {
  private readonly http = inject(HttpClient);

  /**
   * Requests recipe suggestions from the n8n workflow.
   * @param request Payload assembled from the generator wizard.
   * @returns Stream that always emits exactly one RecipeResponse and never errors.
   */
  generateRecipes(request: RecipeRequest): Observable<RecipeResponse> {
    return this.http.post<RecipeResponse>(environment.recipeWebhookUrl, request).pipe(
      timeout(environment.webhookTimeoutMs),
      catchError((error: unknown) => of(this.toErrorResponse(error))),
    );
  }

  /**
   * Unwraps an n8n error envelope from a failed HTTP call, or falls back to a
   * generic transport error when the response carries no usable body.
   * @param error Error thrown by HttpClient or the timeout operator.
   * @returns Error envelope for the UI.
   */
  private toErrorResponse(error: unknown): RecipeErrorResponse {
    const body = (error as { error?: unknown })?.error;
    return this.isErrorResponse(body) ? body : buildTransportError();
  }

  /**
   * Type guard for the error envelope defined in the JSON contract.
   * @param body Parsed response body of a failed call.
   * @returns True when the body follows the RecipeErrorResponse shape.
   */
  private isErrorResponse(body: unknown): body is RecipeErrorResponse {
    if (typeof body !== 'object' || body === null) return false;
    const candidate = body as Partial<RecipeErrorResponse>;
    return candidate.status === 'error' && typeof candidate.code === 'string';
  }
}
