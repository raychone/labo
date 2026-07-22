import { clsx } from "clsx";
import { type ReactNode } from "react";

import { Button } from "./button.js";
import { EmptyState, ErrorState, LoadingState } from "./feedback.js";

export type SortDirection = "ascending" | "descending";

export interface DataTableColumn<TRow> {
  readonly align?: "center" | "left" | "right";
  readonly header: ReactNode;
  readonly id: string;
  readonly isSortable?: boolean;
  readonly renderCell: (row: TRow) => ReactNode;
}

export interface DataTableSort {
  readonly columnId: string;
  readonly direction: SortDirection;
}

export interface DataTablePagination {
  readonly onPageChange: (page: number) => void;
  readonly page: number;
  readonly pageCount: number;
}

export interface DataTableProps<TRow> {
  readonly columns: readonly DataTableColumn<TRow>[];
  readonly emptyMessage?: ReactNode;
  readonly error?: ReactNode;
  readonly getRowKey: (row: TRow) => string;
  readonly isLoading?: boolean;
  readonly onRowAction?: (row: TRow) => void;
  readonly onSortChange?: (sort: DataTableSort) => void;
  readonly pagination?: DataTablePagination;
  readonly rowActionLabel?: string;
  readonly rows: readonly TRow[];
  readonly sort?: DataTableSort;
}

export function DataTable<TRow>({
  columns,
  emptyMessage = "No records found.",
  error,
  getRowKey,
  isLoading = false,
  onRowAction,
  onSortChange,
  pagination,
  rowActionLabel = "Open",
  rows,
  sort,
}: DataTableProps<TRow>): ReactNode {
  if (isLoading) {
    return <LoadingState text="Loading table" />;
  }

  if (error !== undefined) {
    return <ErrorState description={error} title="Table could not be loaded" />;
  }

  if (rows.length === 0) {
    return <EmptyState description={emptyMessage} title="No data" />;
  }

  function toggleSort(columnId: string): void {
    const nextDirection: SortDirection =
      sort?.columnId === columnId && sort.direction === "ascending" ? "descending" : "ascending";
    onSortChange?.({ columnId, direction: nextDirection });
  }

  return (
    <div className="dl-data-table">
      <div className="dl-data-table__scroll" role="region" aria-label="Data table" tabIndex={0}>
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th className={clsx(column.align && `dl-table-cell--${column.align}`)} key={column.id} scope="col">
                  {column.isSortable ? (
                    <button
                      aria-sort={sort?.columnId === column.id ? sort.direction : undefined}
                      className="dl-data-table__sort"
                      onClick={() => toggleSort(column.id)}
                      type="button"
                    >
                      {column.header}
                      <span aria-hidden="true">
                        {sort?.columnId === column.id && sort.direction === "descending" ? "↓" : "↑"}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
              {onRowAction ? <th scope="col">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td className={clsx(column.align && `dl-table-cell--${column.align}`)} key={column.id}>
                    {column.renderCell(row)}
                  </td>
                ))}
                {onRowAction ? (
                  <td>
                    <Button onClick={() => onRowAction(row)} size="small" variant="ghost">
                      {rowActionLabel}
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination ? (
        <div className="dl-data-table__pagination">
          <Button
            disabled={pagination.page <= 1}
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            size="small"
            variant="outline"
          >
            Previous
          </Button>
          <span>
            Page {pagination.page} of {pagination.pageCount}
          </span>
          <Button
            disabled={pagination.page >= pagination.pageCount}
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            size="small"
            variant="outline"
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
