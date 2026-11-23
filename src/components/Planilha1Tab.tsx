// Planilha1Tab.tsx — Visualização da aba Planilha1 (Cadastro)
import React, { useMemo } from "react";
import { type Cadastro, SITUACOES, fmtInt } from "../lib/horasExtrasParser";
import { DataTable, type ColumnDef, type FilterDef } from "./DataTable";

interface Planilha1TabProps {
  cad: Cadastro[];
  sheetName: string;
}

export const Planilha1Tab: React.FC<Planilha1TabProps> = ({ cad, sheetName }) => {
  // Contagem das situações para a faixa de indicadores
  const situationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    cad.forEach((c) => {
      counts[c.sit] = (counts[c.sit] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [cad]);

  // Faixa de KPIs no topo
  const topContent = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-[#FBF7EE] border border-[#E2D5B8] rounded-[10px] overflow-hidden shadow-[0_3px_10px_rgba(60,45,20,0.1)] divide-y sm:divide-y-0 sm:divide-x divide-[#E2D5B8] mb-6">
      <div className="p-5">
        <div className="font-condensed font-bold text-[38px] text-[#1E5B3E] leading-none tabular-nums">
          {fmtInt(cad.length)}
        </div>
        <div className="text-[14px] text-[#6E665A] mt-1.5 font-medium">
          colaboradores no cadastro
        </div>
      </div>

      {situationCounts.map(([sitKey, count]) => {
        const desc = SITUACOES[sitKey] || `Situação ${sitKey}`;
        return (
          <div key={sitKey} className="p-5">
            <div className="font-condensed font-bold text-[38px] text-[#1E5B3E] leading-none tabular-nums">
              {fmtInt(count)}
            </div>
            <div className="text-[14px] text-[#6E665A] mt-1.5 font-medium">
              {desc} ({sitKey})
            </div>
          </div>
        );
      })}
    </div>
  );

  const columns: ColumnDef<Cadastro>[] = [
    { key: "chapa", label: "Chapa", isNumeric: true },
    { key: "nome", label: "Nome" },
    { key: "funcao", label: "Função" },
    {
      key: "sit",
      label: "Situação",
      render: (r) => {
        const isAtivo = r.sit === "A";
        return (
          <span
            title={SITUACOES[r.sit] || ""}
            className={`inline-block text-[13px] font-semibold px-2 py-0.5 rounded-full select-none ${
              isAtivo
                ? "bg-[#E6F0E7] text-[#1E5B3E]"
                : "bg-[rgba(184,137,43,0.18)] text-[#8F6A1F]"
            }`}
          >
            {r.sit}
          </span>
        );
      },
    },
    { key: "hor", label: "Cód. horário", isNumeric: true },
    { key: "letra", label: "Letra" },
    {
      key: "adm",
      label: "Admissão",
      sortValue: (r) => r.admSort,
    },
    { key: "secao", label: "Descrição seção" },
  ];

  const filters: FilterDef<Cadastro>[] = [
    {
      key: "sit",
      label: "Situação",
      getValue: (r) => r.sit,
      formatOption: (v) => `${v} - ${SITUACOES[v] || "?"}`,
    },
    {
      key: "letra",
      label: "Letra",
      getValue: (r) => r.letra,
    },
  ];

  return (
    <DataTable<Cadastro>
      title={sheetName || "Planilha1"}
      description="Cadastro de colaboradores da obra: situação, horário, letra de turno e seção."
      rows={cad}
      columns={columns}
      searchPlaceholder="Buscar por nome, chapa, função ou seção"
      searchFields={["nome", "chapa", "funcao", "secao"]}
      filters={filters}
      initialSortKey="nome"
      initialSortDir={1}
      topContent={topContent}
    />
  );
};
