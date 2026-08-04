import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Imprint page. Structure and contact details follow German §5 TMG
 * requirements for a private, non-commercial project; the privacy policy
 * lives on its own route and is linked from here.
 */
@Component({
  selector: 'app-imprint',
  imports: [RouterLink],
  templateUrl: './imprint.html',
  styleUrl: './imprint.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Imprint {}
