import type { ReactNode } from 'react';
import { Spinner } from './Spinner';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  empty?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({ columns, rows, rowKey, loading, empty = 'No records', onRowClick }: TableProps<T>) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.04em] text-faint">
            {columns.map((c) => (
              <th key={c.header} className="px-4 py-3 font-medium">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10">
                <div className="flex justify-center">
                  <Spinner />
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-faint">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={
                  'border-b border-line last:border-0 ' +
                  (onRowClick ? 'cursor-pointer hover:bg-surface2' : '')
                }
              >
                {columns.map((c) => (
                  <td key={c.header} className={'px-4 py-3 ' + (c.className ?? '')}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
