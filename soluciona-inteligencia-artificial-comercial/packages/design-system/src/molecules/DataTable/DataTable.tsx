// @soluciona/design-system/src/molecules/DataTable/DataTable.tsx
// DataTable - Tabla de datos avanzada (versión simplificada sin TanStack por ahora)

'use client';

import { forwardRef, ReactNode, useState, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@/atoms/Button';
import { Input } from '@/atoms/Input';
import { Checkbox } from '@/atoms/Checkbox';
import { Select } from '@/atoms/Select';
import { Skeleton } from '@/atoms/Skeleton';
import { Icon } from '@/atoms/Icon';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface Column<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  loading?: boolean;
  pagination?: {
    pageSize?: number;
    serverSide?: boolean;
  };
  sorting?: {
    defaultColumn?: keyof T;
    defaultDirection?: 'asc' | 'desc';
  };
  filtering?: {
    globalFilter?: string;
  };
  selection?: {
    mode?: 'single' | 'multiple';
    selected?: Set<string>;
    onChange?: (selected: Set<string>) => void;
  };
  actions?: Array<{
    label: string;
    icon?: ReactNode;
    onClick: (row: T) => void;
    disabled?: (row: T) => boolean;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  }>;
  emptyState?: ReactNode;
  toolbar?: ReactNode;
  className?: string;
  rowClassName?: (row: T) => string;
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  loading = false,
  pagination,
  sorting,
  filtering,
  selection,
  actions,
  emptyState,
  toolbar,
  className,
  rowClassName
}: DataTableProps<T>) {
  const [sortingState, setSortingState] = useState<{ id: string; desc: boolean } | null>(null);
  const [globalFilter, setGlobalFilter] = useState(filtering?.globalFilter || '');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(pagination?.pageSize || 25);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(selection?.selected || new Set());

  // Filtrado global
  const filteredData = useMemo(() => {
    if (!globalFilter) return data;
    const search = globalFilter.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const value = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor as keyof T];
        return String(value).toLowerCase().includes(search);
      })
    );
  }, [data, globalFilter, columns]);

  // Ordenamiento
  const sortedData = useMemo(() => {
    if (!sortingState) return filteredData;
    return [...filteredData].sort((a, b) => {
      const col = columns.find(c => c.id === sortingState!.id);
      if (!col || !col.sortable) return 0;
      const aVal = col.accessor(a);
      const bVal = col.accessor(b);
      if (aVal < bVal) return sortingState.desc ? 1 : -1;
      if (aVal > bVal) return sortingState.desc ? -1 : 1;
      return 0;
    });
  }, [filteredData, sortingState, columns]);

  // Paginación
  const pageCount = Math.ceil(sortedData.length / pageSize);
  const paginatedData = pagination?.serverSide
    ? sortedData
    : sortedData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const handleSort = (columnId: string) => {
    const col = columns.find(c => c.id === columnId);
    if (!col?.sortable) return;
    setSortingState(prev => ({
      id: columnId,
      desc: prev?.id === columnId ? !prev.desc : false
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(paginatedData.map(getRowId)));
    } else {
      setSelectedRows(new Set());
    }
    selection?.onChange?.(checked ? new Set(paginatedData.map(getRowId)) : new Set());
  };

  const handleSelectRow = (rowId: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) newSelected.add(rowId);
    else newSelected.delete(rowId);
    setSelectedRows(newSelected);
    selection?.onChange?.(newSelected);
  };

  const handleSelectRowChange = (rowId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSelectRow(rowId, e.target.checked);
  };

  const pageCount = Math.ceil(sortedData.length / pageSize);

  const renderEmptyState = () => {
    if (emptyState) return emptyState;
    return (
      <tbody>
        <tr>
          <td colSpan={columns.length + (selection ? 1 : 0)} className="py-12 text-center">
            <Skeleton variant="text" width="40%" height={20} className="mx-auto mb-4" />
            <p className="text-text-tertiary">No hay datos disponibles</p>
          </td>
        </tr>
      </tbody>
    );

  const renderLoadingState = () => (
    <tbody>
      {Array.from({ length: pageSize }).map((_, i) => (
        <tr key={i}>
          {columns.map((col, j) => (
            <td key={j}><Skeleton variant="text" width="80%" height={16} /></td>
          ))}
        </tr>
      ))}
    </tbody>
  );

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border-default bg-bg-surface', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border-default">
        {toolbar}
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar en toda la tabla..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            startIcon={<Icon icon={Search} size="sm" />}
            className="w-full"
          />
        </div>
        {toolbar}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" role="grid">
          <thead className="bg-bg-elevated border-b border-border-default">
            <tr>
              {selection && (
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    indeterminate={selectedRows.size > 0 && selectedRows.size < paginatedData.length}
                    onChange={handleSelectAll}
                    aria-label="Seleccionar todas las filas"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider',
                    'border-b border-border-subtle',
                    col.sortable && 'cursor-pointer select-none hover:text-text-primary',
                    col.headerClassName
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.id)}
                >
                  <div className="flex items-center gap-2">
                    {col.header}
                    {col.sortable && (
                      <span className="flex items-center">
                        {sortingState?.id === col.id ? (
                          sortingState.desc ? <Icon icon={ChevronDown} size="xs" /> : <Icon icon={ChevronUp} size="xs" />
                        ) : (
                          <Icon icon={ChevronUp} size="xs" className="text-text-tertiary" />
                        )}
                      </span>
                    )}
                  </th>
                ))}
              {actions && actions.length > 0 && (
                <th className="w-1 px-0">Acciones</th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <Skeleton variant="table-row" />
            ) : paginatedData.length === 0 ? (
              renderEmptyState()
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={getRowId(row)}
                  className={cn(
                    'transition-colors duration-100',
                    'hover:bg-bg-elevated/50',
                    selectedRows.has(getRowId(row)) && 'bg-brand-primary/5',
                    rowClassName?.(row)
                  )}
                >
                  {selection && (
                    <td className="w-12 px-4">
                      <Checkbox
                        checked={selectedRows.has(getRowId(row))}
                        onChange={handleSelectRowChange(getRowId(row))}
                        aria-label="Seleccionar fila"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn('px-4 py-3 align-top', col.className)}
                    >
                      {col.cell ? col.cell(row) : String(col.accessor(row))}
                    </td>
                  ))}
                  {actions && actions.length > 0 && (
                    <td className="w-1 px-0">
                      <div className="flex items-center justify-center gap-1">
                        {actions.map((action, i) => (
                          <Button
                            key={i}
                            variant={action.variant || 'ghost'}
                            size="sm"
                            onClick={() => action.onClick(row)}
                            disabled={action.disabled?.(row)}
                            startIcon={action.icon}
                            className="p-1.5"
                          >
                            {action.icon && !action.label ? null : action.label}
                          </Button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {pagination && !pagination.serverSide && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
          <div className="text-sm text-text-tertiary">
            Mostrando {pageIndex * pageSize + 1} a {Math.min((pageIndex + 1) * pageSize, sortedData.length)} de {sortedData.length} resultados
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPageIndex(p => Math.max(0, p - 1))} disabled={pageIndex === 0} aria-label="Página anterior">
              <Icon icon={ChevronLeft} size="sm" />
            </Button>
            <span className="text-sm text-text-secondary px-2">Página {pageIndex + 1} de {pageCount}</span>
            <Button variant="ghost" size="sm" onClick={() => setPageIndex(p => Math.min(pageCount - 1, p + 1))} disabled={pageIndex >= pageCount - 1} aria-label="Página siguiente">
              <Icon icon={ChevronRight} size="sm" />
            </Button>
            <Select
              value={String(pageSize)}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPageIndex(0); }}
              options={[
                { value: '10', label: '10 por página' },
                { value: '25', label: '25 por página' },
                { value: '50', label: '50 por página' },
                { value: '100', label: '100 por página' }
              ]}
              size="sm"
              className="w-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}

DataTable.displayName = 'DataTable';

export { DataTable };