import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import type { RecipeRequest } from '../models/recipe-request.interface';
import type {
  RecipeErrorResponse,
  RecipeResponse,
  RecipeSuccessResponse,
} from '../models/recipe-response.interface';

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
    return this.http.post<unknown>(environment.recipeWebhookUrl, request).pipe(
      timeout(environment.webhookTimeoutMs),
      map((body: unknown) => this.readResponse(body)),
      catchError((error: unknown) => of(this.toErrorResponse(error))),
    );
  }

  /**
   * Accepts a completed call, or turns an unusable body into an error envelope.
   * The workflow answers with HTTP 200 on failure too, so its error envelope
   * lands in this branch by design.
   * @param body Parsed response body of a call that answered with HTTP 200.
   * @returns The success envelope, or an error envelope for the UI.
   */
  private readResponse(body: unknown): RecipeResponse {
    if (this.isSuccessResponse(body)) return body;
    return this.toErrorResponse({ error: body });
  }

  /**
   * Type guard for the success envelope defined in the JSON contract. The
   * workflow answers with HTTP 200 even on failure, so an unchecked body would
   * reach the UI as a successful run and break the result screens.
   * @param body Parsed response body of a completed call.
   * @returns True when the body carries at least one recipe.
   */
  private isSuccessResponse(body: unknown): body is RecipeSuccessResponse {
    if (typeof body !== 'object' || body === null) return false;
    const candidate = body as Partial<RecipeSuccessResponse>;
    return (
      candidate.status === 'ok' && Array.isArray(candidate.recipes) && candidate.recipes.length > 0
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
