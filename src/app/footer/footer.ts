import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * App-shell footer. Minimal by design: copyright note plus the imprint link
 * (required by Lastenheft "Weitere Seiten → Impressum"). Uses the small-text
 * type token (14px) allowed for meta content.
 */
@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly currentYear = new Date().getFullYear();
}
