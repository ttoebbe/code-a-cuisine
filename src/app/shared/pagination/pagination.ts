import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { buildPaginationItems } from './pagination-items';

/**
 * Numbered page bar of a list view (User Story 12). It only reports the page
 * the visitor picked; holding and slicing the data stays with the list itself,
 * so the same bar serves every paginated view.
 */
@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  /** Page currently shown, 1-based. */
  readonly currentPage = input.required<number>();

  /** Number of available pages, at least 1. */
  readonly totalPages = input.required<number>();

  /** Page the visitor asked for. */
  readonly pageChange = output<number>();

  /** Page numbers and gap markers of the bar. */
  protected readonly items = computed(() =>
    buildPaginationItems(this.currentPage(), this.totalPages()),
  );

  /** True while a page precedes the current one. */
  protected readonly hasPrevious = computed(() => this.currentPage() > 1);

  /** True while a page follows the current one. */
  protected readonly hasNext = computed(() => this.currentPage() < this.totalPages());

  /**
   * Reports the requested page, ignoring the current one and out-of-range values.
   * @param page Page the visitor picked, 1-based.
   */
  protected selectPage(page: number): void {
    if (page === this.currentPage() || page < 1 || page > this.totalPages()) return;
    this.pageChange.emit(page);
  }
}
