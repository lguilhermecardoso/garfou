/**
 * Computes the windowed list of page numbers to render in pagination
 * controls, with "ellipsis" markers for gaps. Always includes page 1,
 * the last page, and a few pages around the current one.
 *
 * e.g. getPageWindow(5, 20) -> [1, "ellipsis", 4, 5, 6, "ellipsis", 20]
 */
export function getPageWindow(
  current: number,
  totalPages: number,
  siblings = 1
): (number | "ellipsis")[] {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let i = current - siblings; i <= current + siblings; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(sorted[i]);
  }

  return result;
}
