// DataTable.tsx — Tabela genérica para as abas Base, Planilha1 e Excesso
import React, { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { fmtInt } from "../lib/horasExtrasParser";

export interface ColumnDef<T> {
  key: string;
  label: string;
  isNumeric?: boolean;
  sortValue?: (row: T) => string | number;
  render?: (row: T) => React.ReactNode;
  total?: (rows: T[]) => React.ReactNode;
  cellClassName?: (row: T) => string;
}

export interface FilterDef<T> {
  key: string;
  label: string;
  allOptionLabel?: string;
  getValue: (row: T) => string;
  formatOption?: (value: string) => string;
  sortOptions?: (a: string, b: string) => number;
}

interface DataTableProps<T> {
  title: string;
  description: string;
  rows: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder: string;
  searchFields: (keyof T | string)[];
  filters?: FilterDef<T>[];
  initialSortKey?: string;
  initialSortDir?: 1 | -1; // 1 = asc, -1 = desc
  hasTotalRow?: boolean;
  pageSize?: number;
  topContent?: React.ReactNode;
  middleContent?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
  rowClassName?: (row: T, index: number, allSortedRows: T[]) => string;
}

const normalize = (val: unknown) =>
  String(val ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function DataTable<T extends object>({
  title,
  description,
  rows,
  columns,
  searchPlaceholder,
  searchFields,
  filters = [],
  initialSortKey,
  initialSortDir = 1,
  hasTotalRow = false,
  pageSize = 50,
  topContent,
  middleContent,
  toolbarExtra,
  rowClassName,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | undefined>(initialSortKey);
  const [sortDir, setSortDir] = useState<1 | -1>(initialSortDir);
  const [page, setPage] = useState(0);

  // Compute available filter options
  const filterOptionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    filters.forEach((f) => {
      const set = new Set<string>();
      rows.forEach((r) => {
        const v = f.getValue(r);
        if (v !== "") set.add(v);
      });
      const opts = Array.from(set);
      if (f.sortOptions) {
        opts.sort(f.sortOptions);
      } else {
        opts.sort((a, b) => a.localeCompare(b, "pt-BR"));
      }
      map[f.key] = opts;
    });
    return map;
  }, [rows, filters]);

  // Filter and search
  const filteredRows = useMemo(() => {
    const q = normalize(searchTerm);
    return rows.filter((r) => {
      // Search check
      if (q) {
        const matches = searchFields.some((field) => {
          const val = (r as Record<string, unknown>)[field as string];
          return normalize(val).includes(q);
        });
        if (!matches) return false;
      }

      // Filters check
      for (const f of filters) {
        const selected = activeFilters[f.key];
        if (selected && selected !== "") {
          if (String(f.getValue(r)) !== selected) return false;
        }
      }
      return true;
    });
  }, [rows, searchTerm, activeFilters, searchFields, filters]);

  // Sort
  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filteredRows;

    const getVal =
      col.sortValue ||
      ((r: T) => (r as Record<string, unknown>)[col.key] as string | number);

    return [...filteredRows].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * sortDir;
      }
      return String(va).localeCompare(String(vb), "pt-BR") * sortDir;
    });
  }, [filteredRows, sortKey, sortDir, columns]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRows = sortedRows.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize
  );

  const handleHeaderClick = (col: ColumnDef<T>) => {
    if (sortKey === col.key) {
      setSortDir((prev) => (prev === 1 ? -1 : 1));
    } else {
      setSortKey(col.key);
      setSortDir(col.isNumeric ? -1 : 1);
    }
    setPage(0);
  };

  const handleFilterChange = (key: string, val: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: val }));
    setPage(0);
  };

  return (
    <div className="space-y-4">
      {topContent}

      <section className="bg-[#FBF7EE] border border-[#E2D5B8] rounded-[10px] p-[22px] shadow-[0_3px_10px_rgba(60,45,20,0.1)]">
        <h2 className="font-condensed text-[26px] font-bold text-[#2B2925] leading-none mb-1">
          {title}
        </h2>
        <p className="text-[14px] text-[#6E665A] mb-4">{description}</p>

        {middleContent}

        {/* Toolbar: Busca + Filtros + Contador de Linhas */}
        <div className="flex flex-wrap items-center gap-2.5 my-3">
          <div className="relative flex-1 min-w-[220px] max-w-[340px]">
            <Search className="w-4 h-4 text-[#6E665A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              className="w-full bg-[#FFFDF7] border border-[#D8CDB0] rounded-[6px] pl-9 pr-3 py-2 text-[15px] font-bold text-[#2B2925] focus:outline-none placeholder:font-normal placeholder:text-[#6E665A]/70"
            />
          </div>

          {filters.map((f) => (
            <select
              key={f.key}
              value={activeFilters[f.key] || ""}
              onChange={(e) => handleFilterChange(f.key, e.target.value)}
              className="bg-[#FFFDF7] border border-[#D8CDB0] rounded-[6px] px-3 py-2 text-[15px] font-bold text-[#2B2925] focus:outline-none cursor-pointer"
            >
              <option value="">
                {f.label}: {f.allOptionLabel || "todos"}
              </option>
              {(filterOptionsMap[f.key] || []).map((opt) => (
                <option key={opt} value={opt}>
                  {f.formatOption ? f.formatOption(opt) : opt}
                </option>
              ))}
            </select>
          ))}

          {toolbarExtra}

          <span className="ml-auto text-[14px] text-[#6E665A] font-medium tabular-nums">
            {fmtInt(filteredRows.length)}{" "}
            {filteredRows.length === 1 ? "linha" : "linhas"}
          </span>
        </div>

        {/* Tabela com rolagem horizontal */}
        <div className="overflow-x-auto rounded-[6px] border border-[#E2D5B8]">
          <table className="w-full border-collapse text-[15px] tabular-nums">
            <thead>
              <tr className="bg-[#1E5B3E] text-white select-none">
                {columns.map((col) => {
                  const isSorted = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleHeaderClick(col)}
                      aria-sort={
                        isSorted
                          ? sortDir === 1
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      className={`py-2.5 px-3 font-semibold whitespace-nowrap cursor-pointer hover:bg-[#184831] transition-colors ${
                        col.isNumeric ? "text-right" : "text-left"
                      }`}
                    >
                      <span>{col.label}</span>
                      {isSorted && (
                        <span className="ml-1 text-[12px]">
                          {sortDir === 1 ? "▲" : "▼"}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-8 text-center text-[#6E665A] font-medium"
                  >
                    Nenhum registro encontrado com os critérios selecionados.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rIdx) => {
                  const rowCustomClass = rowClassName
                    ? rowClassName(row, rIdx, sortedRows)
                    : "even:bg-[#F3EBD8]/45";
                  return (
                    <tr
                      key={rIdx}
                      className={`hover:bg-amber-100/30 border-b border-[#E2D5B8] ${rowCustomClass}`}
                    >
                    {columns.map((col) => {
                      const customClass = col.cellClassName
                        ? col.cellClassName(row)
                        : "";
                      return (
                        <td
                          key={col.key}
                          className={`py-2 px-3 ${
                            col.isNumeric ? "text-right" : "text-left"
                          } ${customClass}`}
                        >
                          {col.render
                            ? col.render(row)
                            : (String((row as Record<string, unknown>)[col.key] ?? ""))}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}

              {/* Linha final Total se aplicável */}
              {hasTotalRow && filteredRows.length > 0 && (
                <tr className="border-t-2 border-[#1E5B3E] font-bold bg-[#FBF7EE]">
                  {columns.map((col, idx) => (
                    <td
                      key={col.key}
                      className={`py-2.5 px-3 text-[#1E5B3E] ${
                        col.isNumeric ? "text-right" : "text-left"
                      }`}
                    >
                      {idx === 0
                        ? "Total"
                        : col.total
                        ? col.total(filteredRows)
                        : ""}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 mt-3.5 text-[14px] text-[#6E665A]">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 font-medium px-3 py-1.5 border border-[#E2D5B8] bg-[#FFFDF7] rounded-[6px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <span className="px-1 tabular-nums font-medium">
              Página {currentPage + 1} de {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="inline-flex items-center gap-1 font-medium px-3 py-1.5 border border-[#E2D5B8] bg-[#FFFDF7] rounded-[6px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 cursor-pointer"
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
