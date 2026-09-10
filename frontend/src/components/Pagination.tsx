import { ChevronLeft, ChevronRight } from "lucide-react";

/** Desktop pagination for long lists. */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
  onPageSize,
  locale = "id",
  testid = "pagination",
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize?: (size: number) => void;
  locale?: "id" | "en";
  testid?: string;
}) {
  const isId = locale === "id";
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const windowStart = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => windowStart + index).filter((value) => value >= 1 && value <= pageCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-3" data-testid={testid}>
      <p className="text-[11px] font-semibold text-muted-foreground" data-testid={`${testid}-summary`}>
        {isId ? `Menampilkan ${from}–${to} dari ${total}` : `Showing ${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center gap-1.5">
        {onPageSize && (
          <select
            data-testid={`${testid}-page-size`}
            value={pageSize}
            onChange={(event) => onPageSize(Number(event.target.value))}
            className="mr-2 h-8 rounded-lg border border-border bg-background px-2 text-[11px] font-semibold"
            aria-label={isId ? "Baris per halaman" : "Rows per page"}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / {isId ? "hal" : "page"}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          data-testid={`${testid}-prev`}
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((value) => (
          <button
            key={value}
            type="button"
            data-testid={`${testid}-page-${value}`}
            onClick={() => onPage(value)}
            className={`h-8 min-w-8 rounded-lg px-2 font-data text-[11px] font-bold ${value === page ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          data-testid={`${testid}-next`}
          onClick={() => onPage(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
