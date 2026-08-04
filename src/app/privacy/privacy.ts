import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Privacy policy page. Covers the three places where visitor data is touched:
 * the hoster's server logs, the Gemini call behind the generator and the
 * publicly readable recipe library in Firestore.
 */
@Component({
  selector: 'app-privacy',
  imports: [],
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Privacy {}
