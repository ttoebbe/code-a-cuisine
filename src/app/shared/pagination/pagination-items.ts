/**
 * One entry of the page bar. `page` is null for the gap marker that stands in
 * for the page numbers left out between the edges and the current window.
 */
export interface PaginationItem {
  page: number | null;
}

/** Pages shown on each side of the current one. */
const WINDOW_SIZE = 1;

/**
 * Builds the entries of the page bar: the first page, the last page, a window
 * around the current one, and a gap marker wherever numbers were left out.
 * @param current Page currently shown, 1-based.
 * @param total Number of available pages, at least 1.
 * @returns Page numbers and gap markers in display order.
 */
export function buildPaginationItems(current: number, total: number): PaginationItem[] {
  return insertGaps(collectVisiblePages(current, total));
}

/**
 * Collects the page numbers the bar shows. The window is pushed back inside
 * the range at the edges, so the bar keeps its width on the first and last page.
 * @param current Page currently shown, 1-based.
 * @param total Number of available pages, at least 1.
 * @returns Visible page numbers in ascending order, without duplicates.
 */
function collectVisiblePages(current: number, total: number): number[] {
  const span = 2 * WINDOW_SIZE;
  const lastStart = Math.max(total - span, 1);
  const start = Math.min(Math.max(current - WINDOW_SIZE, 1), lastStart);
  const visible = new Set<number>([1, total]);
  for (let page = start; page <= Math.min(start + span, total); page++) visible.add(page);
  return [...visible].sort((first, second) => first - second);
}

/**
 * Turns page numbers into bar entries, marking every skipped range with a gap.
 * @param pages Visible page numbers in ascending order.
 * @returns Entries of the page bar, gaps included.
 */
function insertGaps(pages: number[]): PaginationItem[] {
  const items: PaginationItem[] = [];
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) items.push({ page: null });
    items.push({ page });
  });
  return items;
}
