// ExcessoTab.tsx — Visualização da aba Excesso de Carga Horária com filtros Sábados Consecutivos e H.E Durante Folga
import React, { useState, useMemo } from "react";
import {
  type BlocoExcesso,
  type LinhaExcesso,
  type LinhaSabadoConsecutivo,
  type LinhaHeFolga,
  fmtHM,
  fmtInt,
} from "../lib/horasExtrasParser";
import { DataTable, type ColumnDef, type FilterDef } from "./DataTable";

interface ExcessoTabProps {
  exc: { blocks: BlocoExcesso[]; rows: LinhaExcesso[] };
  sabados?: LinhaSabadoConsecutivo[] | null;
  folga?: LinhaHeFolga[] | null;
  sheetName: string;
}

export const ExcessoTab: React.FC<ExcessoTabProps> = ({
  exc,
  sabados = [],
  folga = [],
  sheetName,
}) => {
  const [subFiltro, setSubFiltro] = useState<"sabados" | "folga" | null>(null);

  const numSabados = sabados?.length ?? 0;
  const numFolga = folga?.length ?? 0;

  const toggleSabados = () => {
    if (numSabados === 0) return;
    setSubFiltro((prev) => (prev === "sabados" ? null : "sabados"));
  };

  const toggleFolga = () => {
    if (numFolga === 0) return;
    setSubFiltro((prev) => (prev === "folga" ? null : "folga"));
  };

  // 1. Cartões dos 3 blocos do topo (permanecem fixos e inalterados em todas as visualizações)
  const middleContent = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 my-4">
      {exc.blocks.map((b) => (
        <div
          key={b.title}
          className="border border-[#E2D5B8] border-l-4 border-l-[#B8892B] rounded-[8px] p-4 bg-gradient-to-b from-[#FBF7EE] to-[#F1E8D6] shadow-2xs"
        >
          <h3 className="font-condensed text-[20px] font-bold text-[#2B2925] m-0 mb-1 leading-tight">
            {b.title}
          </h3>
          <div className="text-[14px] text-[#6E665A]">
            {b.limit != null ? `Limite de ${fmtInt(b.limit)}h` : "Sem limite informado"}
          </div>
          <div className="font-condensed text-[32px] font-bold text-[#8F6A1F] leading-none my-1 tabular-nums">
            {fmtInt(b.n)}
          </div>
          <div className="text-[14px] text-[#6E665A]">
            {b.n === 1 ? "ocorrência" : "ocorrências"}, média de{" "}
            {b.n > 0 ? fmtHM(b.sum / b.n) : "0h00"} executadas
          </div>
        </div>
      ))}
    </div>
  );

  // 2. Botões de filtro tipo "liga/desliga" (toggle/chip)
  // Localizados logo à direita do seletor Período e antes de "X linhas"
  const buttonBaseClass =
    "inline-flex items-center justify-center font-bold text-[15px] px-3.5 py-2 rounded-[6px] transition-colors whitespace-nowrap cursor-pointer select-none";

  const toolbarExtra = (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Botão Sábados consecutivos */}
      <button
        type="button"
        onClick={toggleSabados}
        disabled={numSabados === 0}
        aria-pressed={subFiltro === "sabados"}
        title={
          numSabados === 0
            ? "Aba SÁBADOS CONSECUTIVOS não encontrada na planilha"
            : subFiltro === "sabados"
            ? "Clique para desativar e voltar para a lista normal"
            : "Clique para filtrar sábados consecutivos"
        }
        className={
          numSabados === 0
            ? `${buttonBaseClass} bg-[#FFFDF7] text-[#6E665A]/50 border border-[#D8CDB0]/60 cursor-not-allowed opacity-60`
            : subFiltro === "sabados"
            ? `${buttonBaseClass} bg-[#1E5B3E] text-white border border-[#1E5B3E] shadow-2xs active:scale-[0.98]`
            : `${buttonBaseClass} bg-[#FFFDF7] text-[#2B2925] border border-[#D8CDB0] hover:bg-[#F5ECE0] active:scale-[0.98]`
        }
      >
        Sábados consecutivos ({numSabados})
      </button>

      {/* Botão H.E durante folga */}
      <button
        type="button"
        onClick={toggleFolga}
        disabled={numFolga === 0}
        aria-pressed={subFiltro === "folga"}
        title={
          numFolga === 0
            ? "Aba H.E DURANTE FOLGA não encontrada na planilha"
            : subFiltro === "folga"
            ? "Clique para desativar e voltar para a lista normal"
            : "Clique para filtrar H.E durante folga"
        }
        className={
          numFolga === 0
            ? `${buttonBaseClass} bg-[#FFFDF7] text-[#6E665A]/50 border border-[#D8CDB0]/60 cursor-not-allowed opacity-60`
            : subFiltro === "folga"
            ? `${buttonBaseClass} bg-[#1E5B3E] text-white border border-[#1E5B3E] shadow-2xs active:scale-[0.98]`
            : `${buttonBaseClass} bg-[#FFFDF7] text-[#2B2925] border border-[#D8CDB0] hover:bg-[#F5ECE0] active:scale-[0.98]`
        }
      >
        H.E durante folga ({numFolga})
      </button>
    </div>
  );

  // 3. Configurações para a visualização NORMAL (Excesso de carga horária)
  const columnsExcesso: ColumnDef<LinhaExcesso>[] = [
    { key: "mat", label: "Mat.", isNumeric: true },
    { key: "nome", label: "Nome" },
    { key: "funcao", label: "Função" },
    { key: "ds", label: "D.S" },
    {
      key: "data",
      label: "Data",
      sortValue: (r) => r.dataSort,
    },
    { key: "ent", label: "Entrada" },
    { key: "int1", label: "Interv." },
    { key: "int2", label: "Interv." },
    { key: "sai", label: "Saída" },
    {
      key: "hrs",
      label: "Horas executadas",
      isNumeric: true,
      render: (r) => fmtHM(r.hrs),
    },
    {
      key: "acima",
      label: "Acima do limite",
      isNumeric: true,
      sortValue: (r) => (r.acima == null ? -999 : r.acima),
      render: (r) => {
        if (r.acima == null) return "";
        const formatted = fmtHM(r.acima);
        return r.acima > 0 ? `+${formatted}` : formatted;
      },
      cellClassName: (r) => (r.acima != null && r.acima > 0 ? "text-[#B23A30] font-bold" : ""),
    },
    { key: "secao", label: "Seção" },
  ];

  const filtersExcesso: FilterDef<LinhaExcesso>[] = [
    {
      key: "bloco",
      label: "Período",
      getValue: (r) => r.bloco,
      sortOptions: (a, b) => {
        const idxA = exc.blocks.findIndex((x) => x.title === a);
        const idxB = exc.blocks.findIndex((x) => x.title === b);
        return idxA - idxB;
      },
    },
  ];

  // 4. Configurações para o filtro "SÁBADOS CONSECUTIVOS"
  // Colunas: Mat. | Nome | Função | Letra | D.S | Data | Entrada | Interv. | Interv. | Saída | Seção
  // Ordenar por Nome e depois por Data, para que os sábados de cada funcionário fiquem juntos.
  const columnsSabados: ColumnDef<LinhaSabadoConsecutivo>[] = [
    { key: "mat", label: "Mat.", isNumeric: true },
    {
      key: "nome",
      label: "Nome",
      // Ordenação secundária por Data automática ao ordenar por Nome
      sortValue: (r) => `${r.nome}_${String(r.dataSort).padStart(12, "0")}`,
    },
    { key: "funcao", label: "Função" },
    { key: "letra", label: "Letra" },
    { key: "ds", label: "D.S" },
    {
      key: "data",
      label: "Data",
      sortValue: (r) => r.dataSort,
    },
    { key: "ent", label: "Entrada" },
    { key: "int1", label: "Interv." },
    { key: "int2", label: "Interv." },
    { key: "sai", label: "Saída" },
    { key: "secao", label: "Seção" },
  ];

  const filtersSabados: FilterDef<LinhaSabadoConsecutivo>[] = [
    {
      key: "bloco",
      label: "Período",
      getValue: (r) => r.bloco,
    },
  ];

  // Alternância de fundo por funcionário para que sábados do mesmo funcionário compartilhem a mesma cor
  const rowClassNameSabados = (
    row: LinhaSabadoConsecutivo,
    _idx: number,
    allSortedRows: LinhaSabadoConsecutivo[]
  ): string => {
    let group = 0;
    let currentKey = "";
    for (const r of allSortedRows) {
      const k = String(r.mat || r.nome);
      if (k !== currentKey) {
        currentKey = k;
        group++;
      }
      if (r === row) break;
    }
    return group % 2 === 0 ? "bg-[#F3EBD8]/45" : "bg-transparent";
  };

  // 5. Configurações para o filtro "H.E DURANTE FOLGA"
  // Colunas: Mat. | Nome | Função | Letra | D.S | Data | Entrada | Interv. | Interv. | Saída | Horas executadas | Seção | Status
  const columnsFolga: ColumnDef<LinhaHeFolga>[] = [
    { key: "mat", label: "Mat.", isNumeric: true },
    { key: "nome", label: "Nome" },
    { key: "funcao", label: "Função" },
    { key: "letra", label: "Letra" },
    { key: "ds", label: "D.S" },
    {
      key: "data",
      label: "Data",
      sortValue: (r) => r.dataSort,
    },
    { key: "ent", label: "Entrada" },
    { key: "int1", label: "Interv." },
    { key: "int2", label: "Interv." },
    { key: "sai", label: "Saída" },
    {
      key: "hrs",
      label: "Horas executadas",
      isNumeric: true,
      render: (r) => r.hrsFormatted || fmtHM(r.hrs),
    },
    { key: "secao", label: "Seção" },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className="inline-block text-[12px] font-semibold px-2.5 py-0.5 rounded-full select-none bg-[#E6F0E7] text-[#1E5B3E] border border-[#1E5B3E]/20 shadow-2xs">
          {r.status || "Folga"}
        </span>
      ),
    },
  ];

  const filtersFolga: FilterDef<LinhaHeFolga>[] = [
    {
      key: "bloco",
      label: "Período",
      getValue: (r) => r.bloco,
    },
  ];

  // Renderização da tabela de acordo com o subfiltro ativo
  if (subFiltro === "sabados") {
    return (
      <DataTable<LinhaSabadoConsecutivo>
        title="SÁBADOS CONSECUTIVOS"
        description="Funcionários que trabalharam em sábados seguidos no período."
        rows={sabados || []}
        columns={columnsSabados}
        searchPlaceholder="Buscar por nome, matrícula ou seção"
        searchFields={["nome", "mat", "funcao", "secao"]}
        filters={filtersSabados}
        initialSortKey="nome"
        initialSortDir={1}
        middleContent={middleContent}
        toolbarExtra={toolbarExtra}
        rowClassName={rowClassNameSabados}
      />
    );
  }

  if (subFiltro === "folga") {
    return (
      <DataTable<LinhaHeFolga>
        title="H.E DURANTE FOLGA"
        description="Treinamentos e exames realizados no dia de folga."
        rows={folga || []}
        columns={columnsFolga}
        searchPlaceholder="Buscar por nome, matrícula ou seção"
        searchFields={["nome", "mat", "funcao", "secao", "status"]}
        filters={filtersFolga}
        initialSortKey="data"
        initialSortDir={1}
        middleContent={middleContent}
        toolbarExtra={toolbarExtra}
      />
    );
  }

  return (
    <DataTable<LinhaExcesso>
      title={sheetName || "EXCESSO DE CARGA HORÁRIA"}
      description="Jornadas que passaram do limite do dia. A coluna “Acima do limite” mostra quanto cada registro excedeu."
      rows={exc.rows}
      columns={columnsExcesso}
      searchPlaceholder="Buscar por nome, matrícula ou seção"
      searchFields={["nome", "mat", "funcao", "secao"]}
      filters={filtersExcesso}
      initialSortKey="acima"
      initialSortDir={-1}
      middleContent={middleContent}
      toolbarExtra={toolbarExtra}
    />
  );
};
