import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Home page hero. Entry point of the app — offers the generator CTA and a
 * cross-sell link into the recipe library.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
