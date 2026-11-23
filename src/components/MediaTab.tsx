// MediaTab.tsx — Aba Média com KPIs, Gráfico SVG interativo, Totais e Resumo
import React, { useId, useState, useEffect, useRef } from "react";
import {
  type DadosPainel,
  type GrupoTurno,
  type Pessoa,
  agregar,
  fmtDec,
  fmtHM,
  fmtInt,
  nomeCurto,
} from "../lib/horasExtrasParser";

interface MediaTabProps {
  dados: DadosPainel;
  formatoHora: "dec" | "hm";
  baseMedia: "todos" | "comhe";
  setBaseMedia: (base: "todos" | "comhe") => void;
  ordemGrafico: "turno" | "valor";
  setOrdemGrafico: (ordem: "turno" | "valor") => void;
}

export const MediaTab: React.FC<MediaTabProps> = ({
  dados,
  formatoHora,
  baseMedia,
  setBaseMedia,
  ordemGrafico,
  setOrdemGrafico,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(850);
  const [hoveredGroup, setHoveredGroup] = useState<GrupoTurno | null>(null);

  // Resize observer to get accurate width for responsive SVG chart
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const H = (val: number) => (formatoHora === "hm" ? fmtHM(val) : fmtDec(val));
  const I = (val: number) => fmtInt(val);

  const a = agregar(dados, baseMedia);
  const k = a.kpi;
  const sTot = k.e100 + k.e60 || 1;
  const pct100 = Math.round((k.e100 / sTot) * 100);
  const pct60 = Math.round((k.e60 / sTot) * 100);

  // Determine items for chart
  const items = a.grupos.slice();
  if (ordemGrafico === "valor") {
    items.sort((x, y) => y.media - x.media);
  }

  // Calculate SVG chart parameters
  const refVal = a.mediaGeral;
  const maxMedia = Math.max(refVal, ...items.map((i) => i.media)) * 1.12 || 1;

  // Nice round step for gridlines
  const calcStep = (max: number) => {
    const r = max / 5;
    const p = Math.pow(10, Math.floor(Math.log10(r)));
    const f = r / p;
    const mult = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
    return mult * p;
  };

  const gridStep = calcStep(maxMedia);
  const gridLines: number[] = [];
  for (let v = gridStep; v < maxMedia; v += gridStep) {
    gridLines.push(v);
  }

  const isSmallScreen = containerWidth < 620;
  const isGrouped = ordemGrafico === "turno";
  const svgHeight = 380;
  const marginTop = 34;
  const marginBottom = isGrouped ? 74 : 50;
  const gap = isGrouped ? 28 : 0;

  // Calculate number of unique groups in grouped order
  const distinctGroups: string[] = [];
  items.forEach((i) => {
    if (!distinctGroups.includes(i.group)) {
      distinctGroups.push(i.group);
    }
  });
  const nGroups = isGrouped ? distinctGroups.length : 1;

  const availableWidth = Math.max(containerWidth, 320);
  const slot = (availableWidth - 24 - gap * (nGroups - 1)) / items.length;
  const barWidth = Math.min(64, Math.max(16, slot * 0.6));

  const getY = (v: number) =>
    marginTop + (svgHeight - marginTop - marginBottom) * (1 - v / maxMedia);
  const baseY = getY(0);
  const refY = getY(refVal);

  // Group spans for category brackets
  const groupSpans: { g: string; a: number; b: number }[] = [];
  let currX = 12;
  let prevGroup: string | null = null;
  const columnPositions: { item: GrupoTurno; cx: number; t: number }[] = [];

  items.forEach((item) => {
    if (isGrouped && prevGroup !== null && item.group !== prevGroup) {
      currX += gap;
    }
    if (isGrouped) {
      if (!groupSpans.length || groupSpans[groupSpans.length - 1].g !== item.group) {
        groupSpans.push({ g: item.group, a: currX, b: currX + slot });
      } else {
        groupSpans[groupSpans.length - 1].b = currX + slot;
      }
    }
    prevGroup = item.group;

    const cx = currX + slot / 2;
    const t = getY(item.media);
    columnPositions.push({ item, cx, t });
    currX += slot;
  });

  const badgeText = `Média geral ${H(refVal)}`;
  const badgeWidth = badgeText.length * 7.4 + 16;

  // Totals for the Summary table
  const summaryTotal = {
    n: 0,
    nHE: 0,
    e100: 0,
    e60: 0,
    total: 0,
    max: 0,
  };
  a.grupos.forEach((g) => {
    summaryTotal.n += g.n;
    summaryTotal.nHE += g.nHE;
    summaryTotal.e100 += g.e100;
    summaryTotal.e60 += g.e60;
    summaryTotal.total += g.total;
    summaryTotal.max = Math.max(summaryTotal.max, g.max);
  });

  // Top 10 individual employees
  const top10Employees = a.ativos
    .filter((p) => p.total > 0)
    .sort((x, y) => y.total - x.total)
    .slice(0, 10);

  const maxTotalTurno =
    Math.max(...a.grupos.map((g) => g.total)) || 1;
  const maxTotalIndividual =
    Math.max(...top10Employees.map((p) => p.total)) || 1;

  let lastRenderedGroup: string | null = null;

  return (
    <div className="space-y-6">
      {/* Faixa de aviso calculada direto da aba Base */}
      <div className="bg-[#FFF8E6] border border-[#E8D39A] rounded-[8px] p-3 text-[14px] text-[#2B2925] shadow-2xs">
        Esta aba é calculada direto da aba Base a cada envio, então a média nunca
        fica desatualizada como na tabela dinâmica do Excel.
      </div>

      {/* 5.1 Faixa de 4 indicadores (KPIs) */}
      <section
        aria-label="Indicadores gerais"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-[#FBF7EE] border border-[#E2D5B8] rounded-[10px] overflow-hidden shadow-[0_3px_10px_rgba(60,45,20,0.1)] divide-y sm:divide-y-0 sm:divide-x divide-[#E2D5B8]"
      >
        {/* KPI 1: Total de HE */}
        <div className="p-5">
          <div className="font-condensed font-bold text-[38px] text-[#1E5B3E] leading-none tabular-nums">
            {H(k.total)}
          </div>
          <div className="text-[14px] text-[#6E665A] mt-1.5 font-medium">
            horas extras no período
          </div>
        </div>

        {/* KPI 2: Média Geral */}
        <div className="p-5">
          <div className="font-condensed font-bold text-[38px] text-[#1E5B3E] leading-none tabular-nums">
            {H(a.mediaGeral)}
          </div>
          <div className="text-[14px] text-[#6E665A] mt-1.5 font-medium">
            {baseMedia === "comhe"
              ? "média por colaborador com HE"
              : "média por colaborador"}
          </div>
        </div>

        {/* KPI 3: Colaboradores com HE */}
        <div className="p-5">
          <div className="font-condensed font-bold text-[38px] text-[#1E5B3E] leading-none tabular-nums">
            {I(k.nHE)} / {I(k.n)}
          </div>
          <div className="text-[14px] text-[#6E665A] mt-1.5 font-medium">
            colaboradores com HE
          </div>
        </div>

        {/* KPI 4: 100% vs 60% */}
        <div className="p-5">
          <div className="font-condensed font-bold text-[38px] text-[#1E5B3E] leading-none tabular-nums">
            {pct100}% / {pct60}%
          </div>
          <div className="text-[14px] text-[#6E665A] mt-1.5 font-medium">
            Extra 100% / Extra 60%
          </div>
          {/* Split bar */}
          <div className="flex h-2 rounded-[4px] overflow-hidden mt-2.5 bg-[#E6F0E7]">
            <div
              style={{ width: `${pct100}%` }}
              className="bg-[#1E5B3E] h-full"
              title={`Extra 100%: ${pct100}% (${H(k.e100)} h)`}
            />
            <div
              style={{ width: `${pct60}%` }}
              className="bg-[#A9CDB0] h-full"
              title={`Extra 60%: ${pct60}% (${H(k.e60)} h)`}
            />
          </div>
        </div>
      </section>

      {/* 5.1.2 Painel "Média total de HE por turno" */}
      <section className="bg-[#FBF7EE] border border-[#E2D5B8] rounded-[10px] p-[22px] shadow-[0_3px_10px_rgba(60,45,20,0.1)]">
        {/* Cabeçalho do painel com seletores */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
          <div>
            <h2 className="font-condensed text-[26px] font-bold text-[#2B2925] leading-none mb-1">
              Média total de HE por turno
            </h2>
            <p className="text-[14px] text-[#6E665A] m-0">
              {baseMedia === "comhe"
                ? "Média de horas extras considerando só quem fez HE no período."
                : "Média de horas extras por colaborador, incluindo quem não fez HE."}
              {a.afastados > 0 && ` Afastados ficam fora do cálculo (${a.afastados}).`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor: Base da média */}
            <div className="inline-flex border border-[#E2D5B8] rounded-[6px] overflow-hidden bg-[#FFFDF7] shadow-2xs">
              <button
                type="button"
                onClick={() => setBaseMedia("todos")}
                aria-pressed={baseMedia === "todos"}
                className={`text-[14px] font-medium px-3 py-1.5 transition-colors cursor-pointer ${
                  baseMedia === "todos"
                    ? "bg-[#1E5B3E] text-white"
                    : "text-[#6E665A] hover:bg-black/5"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setBaseMedia("comhe")}
                aria-pressed={baseMedia === "comhe"}
                className={`text-[14px] font-medium px-3 py-1.5 transition-colors cursor-pointer ${
                  baseMedia === "comhe"
                    ? "bg-[#1E5B3E] text-white"
                    : "text-[#6E665A] hover:bg-black/5"
                }`}
              >
                Só quem fez HE
              </button>
            </div>

            {/* Seletor: Ordem */}
            <div className="inline-flex border border-[#E2D5B8] rounded-[6px] overflow-hidden bg-[#FFFDF7] shadow-2xs">
              <button
                type="button"
                onClick={() => setOrdemGrafico("turno")}
                aria-pressed={ordemGrafico === "turno"}
                className={`text-[14px] font-medium px-3 py-1.5 transition-colors cursor-pointer ${
                  ordemGrafico === "turno"
                    ? "bg-[#1E5B3E] text-white"
                    : "text-[#6E665A] hover:bg-black/5"
                }`}
              >
                Por turno
              </button>
              <button
                type="button"
                onClick={() => setOrdemGrafico("valor")}
                aria-pressed={ordemGrafico === "valor"}
                className={`text-[14px] font-medium px-3 py-1.5 transition-colors cursor-pointer ${
                  ordemGrafico === "valor"
                    ? "bg-[#1E5B3E] text-white"
                    : "text-[#6E665A] hover:bg-black/5"
                }`}
              >
                Maior → menor
              </button>
            </div>
          </div>
        </div>

        {/* Legenda do gráfico */}
        <div className="flex flex-wrap items-center gap-4 text-[14px] text-[#6E665A] my-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[#1E5B3E] inline-block" />
            Acima da média geral
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[#A9CDB0] inline-block" />
            Abaixo da média geral
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0 border-t-2 border-dashed border-[#B8892B] inline-block" />
            Média geral
          </span>
        </div>

        {/* Container do Gráfico SVG Handcrafted */}
        <div ref={containerRef} className="w-full relative mt-2">
          {isSmallScreen ? (
            /* Versão mobile horizontal para telas < 620px */
            <div className="space-y-3 pt-2">
              {items.map((i) => {
                const isAbove = i.media >= refVal;
                const widthPct = Math.min(100, (i.media / maxMedia) * 100);
                const refPct = Math.min(100, (refVal / maxMedia) * 100);
                return (
                  <div
                    key={i.key}
                    className="grid grid-cols-[110px_1fr_60px] gap-2 items-center text-[14px]"
                  >
                    <div className="truncate font-medium text-[#2B2925]" title={i.label}>
                      {i.label}
                    </div>
                    <div className="h-[18px] bg-[#E6F0E7] rounded-[3px] relative flex overflow-hidden">
                      <span
                        style={{ width: `${widthPct}%` }}
                        className={`h-full ${isAbove ? "bg-[#1E5B3E]" : "bg-[#A9CDB0]"}`}
                      />
                      {/* Linha tracejada da média */}
                      <span
                        style={{ left: `${refPct}%` }}
                        className="absolute top-0 bottom-0 border-l-2 border-dashed border-[#B8892B]"
                        title={`Média geral: ${H(refVal)}`}
                      />
                    </div>
                    <div className="font-semibold text-right tabular-nums text-[#2B2925]">
                      {H(i.media)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Gráfico de Colunas SVG responsivo */
            <svg
              viewBox={`0 0 ${availableWidth} ${svgHeight}`}
              width="100%"
              height={svgHeight}
              role="img"
              aria-label="Média total de horas extras por turno"
              className="overflow-visible select-none"
            >
              <defs>
                <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.1" />
                </filter>
              </defs>

              {/* Linhas de grade horizontais */}
              {gridLines.map((val) => {
                const y = getY(val);
                return (
                  <line
                    key={val}
                    x1="12"
                    x2={availableWidth - 12}
                    y1={y}
                    y2={y}
                    stroke="#E2D5B8"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Linha de base zero */}
              <line
                x1="12"
                x2={availableWidth - 12}
                y1={baseY}
                y2={baseY}
                stroke="#6E665A"
                strokeWidth="1"
              />

              {/* Colunas do gráfico */}
              {columnPositions.map(({ item, cx, t }) => {
                const isAbove = item.media >= refVal;
                const r = Math.min(4, Math.max(0, baseY - t));
                const barColor = isAbove ? "#1E5B3E" : "#A9CDB0";
                const isHovered = hoveredGroup?.key === item.key;

                return (
                  <g
                    key={item.key}
                    tabIndex={0}
                    role="graphics-symbol"
                    aria-label={`${item.label}: Média ${H(item.media)} horas extras`}
                    onMouseEnter={() => setHoveredGroup(item)}
                    onMouseLeave={() => setHoveredGroup(null)}
                    onFocus={() => setHoveredGroup(item)}
                    onBlur={() => setHoveredGroup(null)}
                    className="cursor-pointer transition-transform duration-150 focus:outline-none"
                  >
                    <title>
                      {`${item.label} | Média: ${H(item.media)} h | Total: ${H(item.total)} h | ${I(item.nHE)} de ${I(item.n)} com HE`}
                    </title>

                    {/* Barra da coluna com topo arredondado */}
                    <path
                      d={`M${cx - barWidth / 2},${baseY} V${t + r} Q${cx - barWidth / 2},${t} ${cx - barWidth / 2 + r},${t} H${cx + barWidth / 2 - r} Q${cx + barWidth / 2},${t} ${cx + barWidth / 2},${t + r} V${baseY} Z`}
                      fill={barColor}
                      filter={isHovered ? "url(#shadowFilter)" : undefined}
                      opacity={hoveredGroup && !isHovered ? 0.75 : 1}
                      className="transition-opacity"
                    />

                    {/* Valor acima da coluna */}
                    <text
                      x={cx}
                      y={t - 8}
                      textAnchor="middle"
                      fontSize="15"
                      fontWeight="700"
                      fill="#2B2925"
                      className="tabular-nums font-sans"
                    >
                      {H(item.media)}
                    </text>

                    {/* Nome curto embaixo da coluna */}
                    <text
                      x={cx}
                      y={baseY + 22}
                      textAnchor="middle"
                      fontSize="15"
                      fontWeight="600"
                      fill="#2B2925"
                      className="font-sans"
                    >
                      {item.short}
                    </text>
                  </g>
                );
              })}

              {/* Chaves e rótulos de grupo (na ordem por turno) */}
              {isGrouped &&
                groupSpans.map((p, idx) => {
                  const bracketY = baseY + 40;
                  const midX = (p.a + p.b) / 2;
                  return (
                    <g key={idx}>
                      <path
                        d={`M${p.a + 6},${bracketY - 5} V${bracketY} H${p.b - 6} V${bracketY - 5}`}
                        fill="none"
                        stroke="#E2D5B8"
                        strokeWidth="1.5"
                      />
                      <text
                        x={midX}
                        y={bracketY + 20}
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight="500"
                        fill="#6E665A"
                        className="font-sans"
                      >
                        {p.g}
                      </text>
                    </g>
                  );
                })}

              {/* Linha tracejada da Média Geral e etiqueta dourada */}
              <line
                x1="12"
                x2={availableWidth - 12}
                y1={refY}
                y2={refY}
                stroke="#B8892B"
                strokeWidth="2"
                strokeDasharray="6 5"
              />

              {/* Etiqueta dourada à direita */}
              <rect
                x={availableWidth - 12 - badgeWidth}
                y={refY - 24}
                width={badgeWidth}
                height="20"
                rx="4"
                fill="#B8892B"
              />
              <text
                x={availableWidth - 12 - badgeWidth / 2}
                y={refY - 10}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill="#FFFFFF"
                className="font-sans select-none"
              >
                {badgeText}
              </text>
            </svg>
          )}
        </div>
      </section>

      {/* 5.1.3 Dois painéis lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel Esquerdo: Total de horas por turno */}
        <section className="bg-[#FBF7EE] border border-[#E2D5B8] rounded-[10px] p-[22px] shadow-[0_3px_10px_rgba(60,45,20,0.1)]">
          <h2 className="font-condensed text-[26px] font-bold text-[#2B2925] leading-none mb-1">
            Total de horas por turno
          </h2>
          <p className="text-[14px] text-[#6E665A] mb-3">
            Soma das horas extras do período, separando Extra 100% e Extra 60%.
          </p>

          <div className="flex items-center gap-4 text-[13px] text-[#6E665A] mb-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[2px] bg-[#1E5B3E]" />
              Extra 100%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[2px] bg-[#A9CDB0]" />
              Extra 60%
            </span>
          </div>

          <div className="space-y-2.5">
            {a.grupos
              .slice()
              .sort((x, y) => y.total - x.total)
              .map((g) => {
                const w100 = (g.e100 / maxTotalTurno) * 100;
                const w60 = (g.e60 / maxTotalTurno) * 100;
                return (
                  <div
                    key={g.key}
                    className="grid grid-cols-[minmax(90px,auto)_1fr_auto] gap-3 items-center text-[14px]"
                  >
                    <div
                      className="truncate font-medium text-[#2B2925] max-w-[130px] sm:max-w-[160px]"
                      title={g.label}
                    >
                      {g.label}
                    </div>

                    <div className="h-[18px] bg-[#E6F0E7] rounded-[3px] flex overflow-hidden">
                      <div
                        style={{ width: `${w100}%` }}
                        className="bg-[#1E5B3E] h-full"
                        title={`Extra 100%: ${H(g.e100)} h`}
                      />
                      <div
                        style={{ width: `${w60}%` }}
                        className="bg-[#A9CDB0] h-full"
                        title={`Extra 60%: ${H(g.e60)} h`}
                      />
                    </div>

                    <div className="font-semibold text-right tabular-nums text-[#2B2925] min-w-[65px]">
                      {H(g.total)}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* Painel Direito: Maiores totais individuais */}
        <section className="bg-[#FBF7EE] border border-[#E2D5B8] rounded-[10px] p-[22px] shadow-[0_3px_10px_rgba(60,45,20,0.1)]">
          <h2 className="font-condensed text-[26px] font-bold text-[#2B2925] leading-none mb-1">
            Maiores totais individuais
          </h2>
          <p className="text-[14px] text-[#6E665A] mb-5">
            Os 10 colaboradores com mais horas extras no período.
          </p>

          <div className="space-y-2.5">
            {top10Employees.map((p, idx) => {
              const widthPct = (p.total / maxTotalIndividual) * 100;
              const shortName = nomeCurto(p.nome);
              return (
                <div
                  key={`${p.chapa}-${idx}`}
                  className="grid grid-cols-[minmax(110px,auto)_1fr_auto] gap-3 items-center text-[14px]"
                >
                  <div
                    className="truncate font-medium text-[#2B2925] max-w-[130px] sm:max-w-[170px]"
                    title={`${p.nome}${p.funcao ? ` — ${p.funcao}` : ""}`}
                  >
                    {shortName}
                  </div>

                  <div className="h-[18px] bg-[#E6F0E7] rounded-[3px] flex overflow-hidden">
                    <div
                      style={{ width: `${widthPct}%` }}
                      className="bg-[#3D7F52] h-full transition-all duration-300"
                      title={`${p.nome} (${p.funcao}): ${H(p.total)} h`}
                    />
                  </div>

                  <div className="font-semibold text-right tabular-nums text-[#2B2925] min-w-[65px]">
                    {H(p.total)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 5.1.4 Painel "Resumo por turno" */}
      <section className="bg-[#FBF7EE] border border-[#E2D5B8] rounded-[10px] p-[22px] shadow-[0_3px_10px_rgba(60,45,20,0.1)]">
        <h2 className="font-condensed text-[26px] font-bold text-[#2B2925] leading-none mb-4">
          Resumo por turno
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[15px] tabular-nums">
            <thead>
              <tr className="bg-[#1E5B3E] text-white">
                <th className="py-2.5 px-3 text-left font-semibold whitespace-nowrap">
                  Turno
                </th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                  Colaboradores
                </th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                  Com HE
                </th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                  Extra 100%
                </th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                  Extra 60%
                </th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                  Total
                </th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                  Média
                </th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                  Maior individual
                </th>
              </tr>
            </thead>
            <tbody>
              {a.grupos.map((g) => {
                const isNewGroup = g.group !== lastRenderedGroup;
                if (isNewGroup) {
                  lastRenderedGroup = g.group;
                }

                return (
                  <React.Fragment key={g.key}>
                    {isNewGroup && (
                      <tr className="bg-[#F3EBD8]">
                        <td
                          colSpan={8}
                          className="py-1.5 px-3 font-semibold text-[#6E665A] text-[13px]"
                        >
                          {g.group}
                        </td>
                      </tr>
                    )}
                    <tr className="hover:bg-amber-100/30 border-b border-[#E2D5B8] even:bg-[#F3EBD8]/45">
                      <td className="py-2 px-3 text-left font-medium text-[#2B2925]">
                        {g.group === "Administrativo" ? g.short : g.label}
                      </td>
                      <td className="py-2 px-3 text-right">{I(g.n)}</td>
                      <td className="py-2 px-3 text-right">{I(g.nHE)}</td>
                      <td className="py-2 px-3 text-right">{H(g.e100)}</td>
                      <td className="py-2 px-3 text-right">{H(g.e60)}</td>
                      <td className="py-2 px-3 text-right font-semibold">
                        {H(g.total)}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">
                        {H(g.media)}
                      </td>
                      <td className="py-2 px-3 text-right">{H(g.max)}</td>
                    </tr>
                  </React.Fragment>
                );
              })}

              {/* Linha final Total geral */}
              <tr className="border-t-2 border-[#1E5B3E] font-bold bg-[#FBF7EE]">
                <td className="py-2.5 px-3 text-left text-[#1E5B3E]">Total geral</td>
                <td className="py-2.5 px-3 text-right">{I(summaryTotal.n)}</td>
                <td className="py-2.5 px-3 text-right">{I(summaryTotal.nHE)}</td>
                <td className="py-2.5 px-3 text-right">{H(summaryTotal.e100)}</td>
                <td className="py-2.5 px-3 text-right">{H(summaryTotal.e60)}</td>
                <td className="py-2.5 px-3 text-right text-[#1E5B3E]">
                  {H(summaryTotal.total)}
                </td>
                <td className="py-2.5 px-3 text-right text-[#1E5B3E]">
                  {H(a.mediaGeral)}
                </td>
                <td className="py-2.5 px-3 text-right">{H(summaryTotal.max)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[14px] text-[#6E665A] mt-3 mb-0">
          {formatoHora === "hm"
            ? "Valores em horas (horas e minutos)."
            : "Valores em horas decimais (15,50 = 15h30)."}
        </p>
      </section>
    </div>
  );
};
