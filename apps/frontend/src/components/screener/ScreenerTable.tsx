import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";

import type { ScreenerResult } from "@/types/screener";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  data: ScreenerResult[];
};

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, ScreenerResult>();

const columns = columnHelper.columns([
  columnHelper.accessor("symbol", {
    header: "Symbol",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),

  columnHelper.accessor("direction", {
    header: "Direction",
    cell: (info) => {
      const direction = info.getValue();

      return (
        <span
          className={
            direction === "LONG"
              ? "font-medium text-emerald-400"
              : "font-medium text-red-400"
          }
        >
          {direction}
        </span>
      );
    },
  }),

  columnHelper.accessor("score", {
    header: "Score",
    cell: (info) => (
      <span className="font-mono font-semibold">
        {info.getValue().toFixed(2)}
      </span>
    ),
  }),

  columnHelper.accessor((row) => row.market.markPrice, {
    id: "price",
    header: "Price",
    cell: (info) => {
      const price = info.getValue();

      return price.toLocaleString("en-US", {
        minimumFractionDigits: price >= 1 ? 2 : 2,
        maximumFractionDigits: price >= 1000 ? 2 : price >= 1 ? 4 : 8,
      });
    },
  }),

  columnHelper.accessor((row) => row.market.priceChangePercent, {
    id: "change",
    header: "24H",
    cell: (info) => {
      const value = info.getValue();

      return (
        <span className={value >= 0 ? "text-emerald-400" : "text-red-400"}>
          {value >= 0 ? "+" : ""}
          {value.toFixed(2)}%
        </span>
      );
    },
  }),

  columnHelper.accessor((row) => row.market.fundingRate, {
    id: "funding",
    header: "Funding",
    cell: (info) => `${(info.getValue() * 100).toFixed(4)}%`,
  }),

  columnHelper.accessor((row) => row.market.openInterest, {
    id: "openInterest",
    header: "Open Interest",
    cell: (info) => {
      const value = info.getValue();

      if (value === null) {
        return "—";
      }

      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(value);
    },
  }),

  columnHelper.accessor((row) => row.market.basis, {
    id: "basis",
    header: "Basis",
    cell: (info) => `${(info.getValue() * 100).toFixed(4)}%`,
  }),
]);

export function ScreenerTable({ data }: Props) {
  const table = useTable({
    features,
    data,
    columns,

    initialState: {
      sorting: [
        {
          id: "score",
          desc: true,
        },
      ],
    },
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      onClick={() => header.column.toggleSorting()}
                      className="flex items-center gap-1 font-medium"
                    >
                      <table.FlexRender header={header} />

                      {{
                        asc: "↑",
                        desc: "↓",
                      }[header.column.getIsSorted() as "asc" | "desc"] ?? null}
                    </button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No markets found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
