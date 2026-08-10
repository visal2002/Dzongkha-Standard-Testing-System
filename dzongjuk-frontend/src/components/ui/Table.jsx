import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';
import Input from './Input';
import Button from './Button';

export default function DataTable({
  data = [],
  columns = [],
  searchable = true,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  loading = false,
  emptyMessage = 'No data found',
  toolbar,
  onExport,
}) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex;
  const totalFiltered = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      {(searchable || toolbar || onExport) && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {searchable && (
            <div className="w-full sm:w-64">
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                icon={<Search size={14} />}
              />
            </div>
          )}
          <div className="flex w-full sm:w-auto items-center justify-end gap-2 sm:ml-auto">
            {toolbar}
            {onExport && (
              <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={onExport}>
                Export
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-surface-border bg-surface-bg">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-text-primary transition-colors' : ''}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-text-muted">
                            {header.column.getIsSorted() === 'asc' ? <ChevronUp size={12} /> :
                             header.column.getIsSorted() === 'desc' ? <ChevronDown size={12} /> :
                             <ChevronsUpDown size={12} />}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-surface-border bg-surface-card">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-[var(--color-surface-border)] animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-text-muted bg-surface-card">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-surface-border)] flex items-center justify-center text-text-muted">
                      <Search size={20} />
                    </div>
                    <p className="text-sm font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-surface-border bg-surface-card hover:bg-[var(--color-surface-card-hover)] transition-colors"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 text-text-primary">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 text-sm">
          <p className="text-text-muted text-xs">
            {totalFiltered} result{totalFiltered !== 1 ? 's' : ''}
            {globalFilter ? ' found' : ' total'}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="sm"
              icon={<ChevronLeft size={14} />}
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            />
            {Array.from({ length: Math.min(pageCount, 5) }).map((_, i) => {
              const page = i;
              return (
                <button
                  key={page}
                  onClick={() => table.setPageIndex(page)}
                  className={[
                    'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                    currentPage === page
                      ? 'bg-[#F59E0B] text-white'
                      : 'text-text-secondary hover:bg-[var(--color-surface-border)]',
                  ].join(' ')}
                >
                  {page + 1}
                </button>
              );
            })}
            <Button
              variant="ghost" size="sm"
              icon={<ChevronRight size={14} />}
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
