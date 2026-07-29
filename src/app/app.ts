import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Header } from './header/header';
import { Footer } from './footer/footer';

/** Colour the header and footer take from the page they frame. */
export type ShellTheme = 'green' | 'light';

/** Reads the shell theme of the deepest activated route; defaults to light. */
function readShellTheme(route: ActivatedRoute): ShellTheme {
  let current = route;
  while (current.firstChild) {
    current = current.firstChild;
  }
  return current.snapshot.data['shell'] === 'green' ? 'green' : 'light';
}

/** App shell: fixed header and footer around the routed page. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.app--green]': "shellTheme() === 'green'" },
})
export class App {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /**
   * Active route's shell theme; drives the header and footer colours. The
   * initial navigation blocks the bootstrap, so the first value comes from the
   * activated route itself and the shell never paints in the wrong colour.
   */
  protected readonly shellTheme = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => readShellTheme(this.route)),
    ),
    { initialValue: readShellTheme(this.route) },
  );
}
