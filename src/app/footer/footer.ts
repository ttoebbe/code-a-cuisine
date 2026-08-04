import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * App-shell footer. Minimal by design: copyright note plus the legal links
 * (imprint, required by Lastenheft "Weitere Seiten → Impressum", and the
 * privacy policy). Uses the small-text type token (14px) for meta content.
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
