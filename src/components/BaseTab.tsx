// BaseTab.tsx — Visualização da aba Base de colaboradores
import React from "react";
import { type Pessoa, fmtDec, fmtHM } from "../lib/horasExtrasParser";
import { DataTable, type ColumnDef, type FilterDef } from "./DataTable";

interface BaseTabProps {
  people: Pessoa[];
  sheetName: string;
  formatoHora: "dec" | "hm";
}

export const BaseTab: React.FC<BaseTabProps> = ({
  people,
  sheetName,
  formatoHora,
}) => {
  const H = (val: number) => (formatoHora === "hm" ? fmtHM(val) : fmtDec(val));

  const columns: ColumnDef<Pessoa>[] = [
    { key: "chapa", label: "Chapa", isNumeric: true },
    { key: "nome", label: "Funcionário" },
    { key: "funcao", label: "Função" },
    {
      key: "e100",
      label: "Extra 100%",
      isNumeric: true,
      render: (r) => H(r.e100),
      total: (rows) => H(rows.reduce((sum, r) => sum + r.e100, 0)),
    },
    {
      key: "e60",
      label: "Extra 60%",
      isNumeric: true,
      render: (r) => H(r.e60),
      total: (rows) => H(rows.reduce((sum, r) => sum + r.e60, 0)),
    },
    {
      key: "total",
      label: "Total",
      isNumeric: true,
      render: (r) => <span className="font-semibold">{H(r.total)}</span>,
      total: (rows) => (
        <span className="font-bold">
          {H(rows.reduce((sum, r) => sum + r.total, 0))}
        </span>
      ),
    },
    { key: "base", label: "Base" },
    {
      key: "turno",
      label: "Turno",
      sortValue: (r) => String(r.turno.order).padStart(3, "0") + r.turno.label,
      render: (r) => r.turno.label,
    },
    { key: "secao", label: "Seção" },
  ];

  const filters: FilterDef<Pessoa>[] = [
    {
      key: "turno",
      label: "Turno",
      allOptionLabel: "todos",
      getValue: (r) => r.turno.label,
      sortOptions: (a, b) => {
        const orderA = people.find((p) => p.turno.label === a)?.turno.order || 0;
        const orderB = people.find((p) => p.turno.label === b)?.turno.order || 0;
        return orderA - orderB || a.localeCompare(b, "pt-BR");
      },
    },
    {
      key: "secao",
      label: "Seção",
      allOptionLabel: "todas",
      getValue: (r) => r.secao,
    },
  ];

  return (
    <DataTable<Pessoa>
      title={sheetName || "Base"}
      description="Horas extras de cada colaborador no período. Clique no título de uma coluna para ordenar."
      rows={people}
      columns={columns}
      searchPlaceholder="Buscar por nome, chapa, função ou seção"
      searchFields={["nome", "chapa", "funcao", "secao"]}
      filters={filters}
      initialSortKey="total"
      initialSortDir={-1}
      hasTotalRow={true}
    />
  );
};
