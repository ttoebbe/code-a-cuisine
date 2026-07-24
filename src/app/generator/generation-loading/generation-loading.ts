import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Full-screen curtain shown while the n8n workflow is running. It covers the
 * app shell on purpose, so the wizard stays untouched underneath and the user
 * cannot submit a second run.
 */
@Component({
  selector: 'app-generation-loading',
  templateUrl: './generation-loading.html',
  styleUrl: './generation-loading.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerationLoading {}
