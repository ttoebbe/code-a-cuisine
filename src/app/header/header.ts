import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * App-shell header. Design-true layout: brand logo only, no navigation menu.
 * Logo is a router link back to the home route.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {}
