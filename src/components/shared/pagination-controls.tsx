"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
}

/**
 * Page/pageSize navigation for server-rendered tables. Reads and writes the
 * `page`/`pageSize` query params (preserving any other params already set,
 * e.g. date filters), triggering a server re-render via router.push.
 */
export function PaginationControls({
  page,
  pageSize,
  total,
  pageSizeOptions = [20, 40, 50, 100],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(nextPage: number, nextPageSize: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    params.set("pageSize", String(nextPageSize));
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <span>Exibir</span>
        <select
          value={pageSize}
          onChange={(e) => navigate(1, Number(e.target.value))}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>
          de {total} registro{total === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(Math.max(1, page - 1), pageSize)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Anterior
        </button>
        <span className="text-sm text-neutral-500">
          Página {page} de {totalPages}
        </span>
        <button
          onClick={() => navigate(Math.min(totalPages, page + 1), pageSize)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próxima
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
