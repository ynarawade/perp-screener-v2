import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Minus,
  Search,
  SlidersHorizontal,
} from "lucide-react";

export type StrategyDirection = "LONG" | "SHORT";

export type Signal = "STRONG_BUY" | "BUY" | "WATCH" | "SELL" | "STRONG_SELL";

export type Direction = "BULLISH" | "BEARISH" | "NEUTRAL";

export type ScoreComponent = {
  name: string;
  score: number;
  reason: string;
};

export type LiquidationSample = {
  timestamp: number;
  longNotional: number;
  shortNotional: number;
};

export type ScreenerMarketData = {
  markPrice: number;
  indexPrice: number;
  lastPrice: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  fundingRate: number;
  openInterest: number | null;
  basis: number;
  liquidations: LiquidationSample[];
};

export type ScreenerResult = {
  symbol: string;
  score: number;
  signal: Signal;
  direction: Direction;
  components: ScoreComponent[];
  market: ScreenerMarketData;
};

export type ScreenerResponse = {
  data: ScreenerResult[];
};

type Props = {
  data: ScreenerResult[];
};

// ==========================================
// Custom Hooks
// ==========================================

function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const features = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, ScreenerResult>();

function SignalBadge({ signal }: { signal: Signal }) {
  const configs: Record<
    Signal,
    { label: string; className: string; dotClass: string }
  > = {
    STRONG_BUY: {
      label: "Strong Buy",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/15",
      dotClass: "bg-emerald-500",
    },
    BUY: {
      label: "Buy",
      className:
        "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400/90 dark:bg-emerald-500/10",
      dotClass: "bg-emerald-500/80",
    },
    WATCH: {
      label: "Watch",
      className:
        "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
      dotClass: "bg-amber-500",
    },
    SELL: {
      label: "Sell",
      className:
        "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400/90 dark:bg-rose-500/10",
      dotClass: "bg-rose-500/80",
    },
    STRONG_SELL: {
      label: "Strong Sell",
      className:
        "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-500/15",
      dotClass: "bg-rose-500",
    },
  };

  const config = configs[signal];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase backdrop-blur-xs transition-all ${config.className}`}
    >
      <span className={`size-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
}

const columns = columnHelper.columns([
  columnHelper.accessor("symbol", {
    header: "Asset",

    filterFn: (row, columnId, filterValue: string) => {
      if (!filterValue) return true;

      return row
        .getValue<string>(columnId)
        .toLowerCase()
        .includes(filterValue.toLowerCase());
    },

    cell: (info) => {
      const base = info.getValue().replace("USDT", "");

      return (
        <div className="flex items-baseline gap-1 font-mono">
          <span className="font-semibold tracking-tight text-foreground text-sm">
            {base}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground/60 uppercase">
            /USDT
          </span>
        </div>
      );
    },
  }),

  columnHelper.accessor("score", {
    header: "Score",

    cell: (info) => {
      const score = info.getValue();

      const scoreColor =
        score >= 70
          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
          : score >= 40
            ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
            : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]";

      return (
        <div className="flex items-center gap-2.5">
          <span className="w-9 text-right font-mono text-xs font-bold tabular-nums text-foreground">
            {score.toFixed(1)}
          </span>

          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/60 p-[1px]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${scoreColor}`}
              style={{
                width: `${Math.min(Math.max(score, 0), 100)}%`,
              }}
            />
          </div>
        </div>
      );
    },
  }),

  columnHelper.accessor("signal", {
    header: "Signal",

    cell: (info) => <SignalBadge signal={info.getValue()} />,
  }),

  columnHelper.accessor("direction", {
    header: "Direction",

    filterFn: (row, columnId, filterValue: Direction[]) => {
      if (!filterValue || filterValue.length === 0) {
        return true;
      }

      return filterValue.includes(row.getValue<Direction>(columnId));
    },

    cell: (info) => {
      const direction = info.getValue();

      if (direction === "BULLISH") {
        return (
          <div className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
            <ArrowUp className="size-3 stroke-[2.5]" />
            <span className="text-xs font-semibold">Bullish</span>
          </div>
        );
      }

      if (direction === "BEARISH") {
        return (
          <div className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-rose-600 dark:text-rose-400">
            <ArrowDown className="size-3 stroke-[2.5]" />
            <span className="text-xs font-semibold">Bearish</span>
          </div>
        );
      }

      return (
        <div className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-muted-foreground">
          <Minus className="size-3 stroke-[2.5]" />
          <span className="text-xs font-medium">Neutral</span>
        </div>
      );
    },
  }),

  columnHelper.accessor((row) => row.market.markPrice, {
    id: "price",

    header: "Mark Price",

    cell: (info) => {
      const price = info.getValue();

      return (
        <span className="font-mono text-xs font-medium tabular-nums text-foreground">
          $
          {price.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: price >= 1000 ? 2 : price >= 1 ? 4 : 8,
          })}
        </span>
      );
    },
  }),

  columnHelper.accessor((row) => row.market.priceChangePercent, {
    id: "change",

    header: "24h Chg",

    cell: (info) => {
      const value = info.getValue();
      const isPositive = value >= 0;

      return (
        <span
          className={`inline-flex items-center font-mono text-xs font-semibold tabular-nums ${
            isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {isPositive ? "+" : ""}
          {value.toFixed(2)}%
        </span>
      );
    },
  }),

  columnHelper.accessor((row) => row.market.fundingRate, {
    id: "funding",

    header: "Funding",

    cell: (info) => {
      const value = info.getValue();

      return (
        <span
          className={`font-mono text-xs font-medium tabular-nums ${
            value > 0
              ? "text-rose-600 dark:text-rose-400"
              : value < 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
          }`}
        >
          {value > 0 ? "+" : ""}
          {(value * 100).toFixed(4)}%
        </span>
      );
    },
  }),

  columnHelper.accessor((row) => row.market.openInterest, {
    id: "openInterest",

    header: "Open Int",

    cell: (info) => {
      const value = info.getValue();

      if (value === null) {
        return <span className="text-muted-foreground/50">—</span>;
      }

      return (
        <span className="font-mono text-xs font-medium tabular-nums text-foreground">
          $
          {new Intl.NumberFormat("en-US", {
            notation: "compact",
            maximumFractionDigits: 2,
          }).format(value)}
        </span>
      );
    },
  }),

  columnHelper.accessor((row) => row.market.basis, {
    id: "basis",

    header: "Basis",

    cell: (info) => {
      const value = info.getValue();

      return (
        <span
          className={`font-mono text-xs font-medium tabular-nums ${
            value < 0
              ? "text-emerald-600 dark:text-emerald-400"
              : value > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-muted-foreground"
          }`}
        >
          {value > 0 ? "+" : ""}
          {(value * 100).toFixed(4)}%
        </span>
      );
    },
  }),
]);

const DIRECTIONS: {
  label: string;
  value: Direction;
}[] = [
  {
    label: "Bullish",
    value: "BULLISH",
  },
  {
    label: "Bearish",
    value: "BEARISH",
  },
  {
    label: "Neutral",
    value: "NEUTRAL",
  },
];

export function ScreenerTable({ data }: Props) {
  const [columnFilters, setColumnFilters] = useState<
    { id: string; value: unknown }[]
  >([]);

  // Search input state
  const [searchTerm, setSearchTerm] = useState("");

  // Debounced search value
  const debouncedSearch = useDebounce(searchTerm, 500);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useTable({
    features,

    data,

    columns,

    state: {
      columnFilters,
      pagination,
    },

    onColumnFiltersChange: setColumnFilters,

    onPaginationChange: setPagination,

    initialState: {
      sorting: [
        {
          id: "score",
          desc: true,
        },
      ],
    },
  });

  useEffect(() => {
    table.getColumn("symbol")?.setFilterValue(debouncedSearch);
  }, [debouncedSearch]);

  useEffect(() => {
    setPagination((current) => {
      if (current.pageIndex === 0) {
        return current;
      }

      return {
        ...current,
        pageIndex: 0,
      };
    });
  }, [columnFilters]);

  const pageCount = table.getPageCount();

  useEffect(() => {
    if (pageCount <= 0) {
      return;
    }

    setPagination((current) => {
      const lastPageIndex = pageCount - 1;

      if (current.pageIndex <= lastPageIndex) {
        return current;
      }

      return {
        ...current,
        pageIndex: lastPageIndex,
      };
    });
  }, [pageCount]);

  const selectedDirections =
    (table.getColumn("direction")?.getFilterValue() as Direction[]) ?? [];

  const handleDirectionToggle = (direction: Direction) => {
    let next: Direction[];

    if (selectedDirections.includes(direction)) {
      next = selectedDirections.filter((item) => item !== direction);
    } else {
      next = [...selectedDirections, direction];
    }

    table
      .getColumn("direction")
      ?.setFilterValue(next.length > 0 ? next : undefined);
  };

  const handleSelectAllDirections = () => {
    table.getColumn("direction")?.setFilterValue(undefined);
  };

  const isAllSelected = selectedDirections.length === 0;

  const pageIndex = pagination.pageIndex;

  const currentPage = pageIndex + 1;

  return (
    <div className="flex flex-col gap-3 font-sans antialiased">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />

          <input
            type="text"
            placeholder="Search asset symbol..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-8.5 w-full rounded-md border border-input/60 bg-background/50 pl-8 pr-3 text-xs text-foreground shadow-2xs transition-all placeholder:text-muted-foreground/60 focus:border-ring focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Direction Filter */}
        <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1 backdrop-blur-xs">
          <div className="flex items-center gap-1 px-1.5 text-muted-foreground">
            <SlidersHorizontal className="size-3" />
            <span className="text-[11px] font-semibold uppercase tracking-wider hidden md:inline">
              Direction:
            </span>
          </div>

          {/* All */}
          <button
            type="button"
            onClick={handleSelectAllDirections}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              isAllSelected
                ? "bg-background text-foreground shadow-xs ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            }`}
          >
            All
          </button>

          {/* Directions */}
          {DIRECTIONS.map((item) => {
            const isSelected = selectedDirections.includes(item.value);

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => handleDirectionToggle(item.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-background text-foreground shadow-xs ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-border/80 bg-card/50 shadow-xs backdrop-blur-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-border/60 bg-muted/30 hover:bg-muted/30"
                >
                  {headerGroup.headers.map((header) => {
                    const isSorted = header.column.getIsSorted();

                    return (
                      <TableHead
                        key={header.id}
                        className="h-9 whitespace-nowrap px-3.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 select-none"
                      >
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            onClick={() => header.column.toggleSorting()}
                            className="group flex items-center gap-1.5 transition-colors hover:text-foreground focus:outline-none"
                          >
                            <table.FlexRender header={header} />

                            {isSorted === "asc" ? (
                              <ArrowUp className="size-3 text-primary stroke-[2.5]" />
                            ) : isSorted === "desc" ? (
                              <ArrowDown className="size-3 text-primary stroke-[2.5]" />
                            ) : (
                              <ArrowUpDown className="size-3 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                            )}
                          </button>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-border/40 transition-colors hover:bg-muted/40"
                  >
                    {row.getAllCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="whitespace-nowrap px-3.5 py-2.5"
                      >
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-xs text-muted-foreground/70"
                  >
                    No matching assets found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 bg-muted/10 px-4 py-2.5 text-xs text-muted-foreground">
          {/* Page Information */}
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span>Page</span>
            <span className="font-bold text-foreground">
              {pageCount > 0 ? currentPage : 0}
            </span>
            <span>of</span>
            <span className="font-bold text-foreground">{pageCount}</span>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            {/* First */}
            <button
              type="button"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="rounded-md border border-transparent p-1 transition-all hover:border-border hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              title="First Page"
            >
              <ChevronsLeft className="size-3.5" />
            </button>

            {/* Previous */}
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-md border border-transparent p-1 transition-all hover:border-border hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              title="Previous Page"
            >
              <ChevronLeft className="size-3.5" />
            </button>

            {/* Next */}
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-md border border-transparent p-1 transition-all hover:border-border hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              title="Next Page"
            >
              <ChevronRight className="size-3.5" />
            </button>

            {/* Last */}
            <button
              type="button"
              onClick={() => table.setPageIndex(Math.max(0, pageCount - 1))}
              disabled={!table.getCanNextPage()}
              className="rounded-md border border-transparent p-1 transition-all hover:border-border hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              title="Last Page"
            >
              <ChevronsRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
