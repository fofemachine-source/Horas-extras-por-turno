// exportExcel.ts — Geração do arquivo Excel estilizado com xlsx-js-style
import * as XLSX from "xlsx-js-style";
import {
  type DadosPainel,
  agregar,
  fmtDec,
  fmtInt,
} from "./horasExtrasParser";

export function exportarExcel(
  dados: DadosPainel,
  baseMedia: "todos" | "comhe",
  ordemGrafico: "turno" | "valor"
) {
  const wb = XLSX.utils.book_new();

  const fontDefault = { name: "Arial", sz: 10 };
  const fontHeader = { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } };
  const fillHeader = { fgColor: { rgb: "1E5631" } };
  const fillGroup = { fgColor: { rgb: "F3EBD8" } };
  const fillKpi = { fgColor: { rgb: "E6EFE8" } };
  const fontKpiNum = { name: "Arial", sz: 20, bold: true, color: { rgb: "1E5631" } };
  const fontBold = { name: "Arial", sz: 10, bold: true };
  const borderThin = {
    top: { style: "thin", color: { rgb: "E2D5B8" } },
    bottom: { style: "thin", color: { rgb: "E2D5B8" } },
    left: { style: "thin", color: { rgb: "E2D5B8" } },
    right: { style: "thin", color: { rgb: "E2D5B8" } },
  };

  // ==========================================
  // 1. ABA MÉDIA
  // ==========================================
  const a = agregar(dados, baseMedia);
  const k = a.kpi;
  const sTot = (k.e100 + k.e60) || 1;
  const pct100 = Math.round((k.e100 / sTot) * 100);
  const pct60 = Math.round((k.e60 / sTot) * 100);

  const mediaWsData: unknown[][] = [];

  // Título e metadados
  mediaWsData.push(["Média total de HE por turno"]);
  mediaWsData.push([`Obra: ${dados.obra || "-"}    Período: ${dados.periodo || "-"}`]);
  mediaWsData.push([]);

  // 4 blocos de indicadores
  mediaWsData.push([
    "Horas extras no período",
    "",
    baseMedia === "comhe" ? "Média por colaborador com HE" : "Média por colaborador",
    "",
    "Colaboradores com HE",
    "",
    "Extra 100% / Extra 60%",
  ]);

  mediaWsData.push([
    fmtDec(k.total),
    "",
    fmtDec(a.mediaGeral),
    "",
    `${fmtInt(k.nHE)} / ${fmtInt(k.n)}`,
    "",
    `${pct100}% / ${pct60}%`,
  ]);

  mediaWsData.push([]);
  mediaWsData.push([`Base da média: ${baseMedia === "comhe" ? "Só quem fez HE" : "Todos"}`]);
  mediaWsData.push([`Ordem do gráfico: ${ordemGrafico === "turno" ? "Por turno" : "Maior para menor"}`]);
  mediaWsData.push([]);

  // Tabela Resumo por Turno
  const tableHeaderRowIdx = mediaWsData.length;
  mediaWsData.push([
    "Turno",
    "Colaboradores",
    "Com HE",
    "Extra 100%",
    "Extra 60%",
    "Total",
    "Média",
    "Maior individual",
  ]);

  let pv: string | null = null;
  const T = { n: 0, nHE: 0, e100: 0, e60: 0, total: 0, max: 0 };
  const groupRowIndices: number[] = [];

  a.grupos.forEach((g) => {
    if (g.group !== pv) {
      groupRowIndices.push(mediaWsData.length);
      mediaWsData.push([g.group, "", "", "", "", "", "", ""]);
      pv = g.group;
    }
    T.n += g.n;
    T.nHE += g.nHE;
    T.e100 += g.e100;
    T.e60 += g.e60;
    T.total += g.total;
    T.max = Math.max(T.max, g.max);

    mediaWsData.push([
      g.group === "Administrativo" ? g.short : g.label,
      g.n,
      g.nHE,
      g.e100,
      g.e60,
      g.total,
      g.media,
      g.max,
    ]);
  });

  const totalRowIdx = mediaWsData.length;
  mediaWsData.push([
    "Total geral",
    T.n,
    T.nHE,
    T.e100,
    T.e60,
    T.total,
    a.mediaGeral,
    T.max,
  ]);

  mediaWsData.push([]);
  mediaWsData.push(["Valores em horas decimais (15,50 = 15h30). Afastados ficam fora das médias."]);

  const wsMedia = XLSX.utils.aoa_to_sheet(mediaWsData);

  // Styling wsMedia
  const mediaRef = XLSX.utils.decode_range(wsMedia["!ref"] || "A1:H30");

  // Title styles
  if (wsMedia["A1"]) {
    wsMedia["A1"].s = { font: { name: "Arial", sz: 16, bold: true, color: { rgb: "0F4A33" } } };
  }
  if (wsMedia["A2"]) {
    wsMedia["A2"].s = { font: { name: "Arial", sz: 10, italic: true, color: { rgb: "6E665A" } } };
  }

  // Indicator labels row: row index 3
  for (let c = 0; c <= 6; c += 2) {
    const addr = XLSX.utils.encode_cell({ r: 3, c });
    if (wsMedia[addr]) {
      wsMedia[addr].s = {
        font: { name: "Arial", sz: 9, bold: true, color: { rgb: "6E665A" } },
        fill: fillKpi,
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  }
  // Indicator values row: row index 4
  for (let c = 0; c <= 6; c += 2) {
    const addr = XLSX.utils.encode_cell({ r: 4, c });
    if (wsMedia[addr]) {
      wsMedia[addr].s = {
        font: fontKpiNum,
        fill: fillKpi,
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  }

  // Table header styling
  for (let c = 0; c <= 7; c++) {
    const addr = XLSX.utils.encode_cell({ r: tableHeaderRowIdx, c });
    if (wsMedia[addr]) {
      wsMedia[addr].s = {
        font: fontHeader,
        fill: fillHeader,
        alignment: { horizontal: c === 0 ? "left" : "right" },
      };
    }
  }

  // Group rows styling
  groupRowIndices.forEach((rIdx) => {
    for (let c = 0; c <= 7; c++) {
      const addr = XLSX.utils.encode_cell({ r: rIdx, c });
      if (wsMedia[addr]) {
        wsMedia[addr].s = {
          font: { name: "Arial", sz: 10, bold: true, color: { rgb: "6E665A" } },
          fill: fillGroup,
        };
      }
    }
  });

  // Table data rows formatting
  for (let r = tableHeaderRowIdx + 1; r < totalRowIdx; r++) {
    if (groupRowIndices.includes(r)) continue;
    for (let c = 0; c <= 7; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = wsMedia[addr];
      if (cell) {
        cell.s = { font: fontDefault, border: borderThin, alignment: { horizontal: c === 0 ? "left" : "right" } };
        if (c >= 3) {
          cell.z = "0.00";
        }
      }
    }
  }

  // Total row styling
  for (let c = 0; c <= 7; c++) {
    const addr = XLSX.utils.encode_cell({ r: totalRowIdx, c });
    const cell = wsMedia[addr];
    if (cell) {
      cell.s = {
        font: fontBold,
        fill: { fgColor: { rgb: "E6F0E7" } },
        border: {
          top: { style: "medium", color: { rgb: "1E5B3E" } },
          bottom: { style: "double", color: { rgb: "1E5B3E" } },
        },
        alignment: { horizontal: c === 0 ? "left" : "right" },
      };
      if (c >= 3) {
        cell.z = "0.00";
      }
    }
  }

  wsMedia["!cols"] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, wsMedia, "Média");

  // ==========================================
  // 2. ABA BASE
  // ==========================================
  const baseHeaders = [
    "Chapa",
    "Funcionário",
    "Função",
    "Extra 100%",
    "Extra 60%",
    "Total",
    "Base",
    "Turno",
    "Seção",
  ];
  const baseRows: unknown[][] = [baseHeaders];
  let totE100 = 0;
  let totE60 = 0;
  let totTotal = 0;

  dados.people.forEach((p) => {
    totE100 += p.e100;
    totE60 += p.e60;
    totTotal += p.total;
    baseRows.push([
      p.chapa,
      p.nome,
      p.funcao,
      p.e100,
      p.e60,
      p.total,
      p.base,
      p.turno.label,
      p.secao,
    ]);
  });

  // Linha final Total
  const baseTotalRowIdx = baseRows.length;
  baseRows.push([
    "Total",
    "",
    "",
    totE100,
    totE60,
    totTotal,
    "",
    "",
    "",
  ]);

  const wsBase = XLSX.utils.aoa_to_sheet(baseRows);

  // Autofiltro na aba Base (linhas de dados antes da linha Total)
  wsBase["!autofilter"] = {
    ref: `A1:I${baseTotalRowIdx}`,
  };

  // Header style Base
  for (let c = 0; c < baseHeaders.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (wsBase[addr]) {
      wsBase[addr].s = {
        font: fontHeader,
        fill: fillHeader,
        alignment: { horizontal: c === 0 || (c >= 3 && c <= 5) ? "right" : "left" },
      };
    }
  }

  // Base rows style and numbers
  for (let r = 1; r < baseTotalRowIdx; r++) {
    for (let c = 0; c < baseHeaders.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = wsBase[addr];
      if (cell) {
        cell.s = {
          font: fontDefault,
          border: borderThin,
          alignment: { horizontal: c === 0 || (c >= 3 && c <= 5) ? "right" : "left" },
        };
        if (c >= 3 && c <= 5) {
          cell.z = "0.00";
        }
      }
    }
  }

  // Base Total row
  for (let c = 0; c < baseHeaders.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: baseTotalRowIdx, c });
    const cell = wsBase[addr];
    if (cell) {
      cell.s = {
        font: fontBold,
        fill: { fgColor: { rgb: "E6F0E7" } },
        border: {
          top: { style: "medium", color: { rgb: "1E5B3E" } },
          bottom: { style: "double", color: { rgb: "1E5B3E" } },
        },
        alignment: { horizontal: c >= 3 && c <= 5 ? "right" : "left" },
      };
      if (c >= 3 && c <= 5) {
        cell.z = "0.00";
      }
    }
  }

  wsBase["!cols"] = [
    { wch: 10 },
    { wch: 32 },
    { wch: 28 },
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
    { wch: 16 },
    { wch: 16 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, wsBase, dados.names.base || "Base");

  // ==========================================
  // 3. ABA PLANILHA1 (se existir)
  // ==========================================
  if (dados.cad && dados.cad.length > 0) {
    const cadHeaders = [
      "Chapa",
      "Nome",
      "Função",
      "Situação",
      "Cód. horário",
      "Letra",
      "Admissão",
      "Descrição seção",
    ];
    const cadRows: unknown[][] = [cadHeaders];
    dados.cad.forEach((c) => {
      cadRows.push([
        c.chapa,
        c.nome,
        c.funcao,
        c.sit,
        c.hor,
        c.letra,
        c.adm,
        c.secao,
      ]);
    });

    const wsCad = XLSX.utils.aoa_to_sheet(cadRows);

    for (let c = 0; c < cadHeaders.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (wsCad[addr]) {
        wsCad[addr].s = {
          font: fontHeader,
          fill: fillHeader,
          alignment: { horizontal: c === 0 || c === 4 ? "right" : "left" },
        };
      }
    }

    for (let r = 1; r < cadRows.length; r++) {
      for (let c = 0; c < cadHeaders.length; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = wsCad[addr];
        if (cell) {
          cell.s = {
            font: fontDefault,
            border: borderThin,
            alignment: { horizontal: c === 0 || c === 4 ? "right" : "left" },
          };
        }
      }
    }

    wsCad["!cols"] = [
      { wch: 10 },
      { wch: 32 },
      { wch: 28 },
      { wch: 10 },
      { wch: 14 },
      { wch: 8 },
      { wch: 14 },
      { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(wb, wsCad, dados.names.cad || "Planilha1");
  }

  // ==========================================
  // 4. ABA EXCESSO DE CARGA HORÁRIA (se existir)
  // ==========================================
  if (dados.exc && dados.exc.rows.length > 0) {
    const excRows: unknown[][] = [];
    const blockTitleRowIndices: number[] = [];
    const blockHeaderRowIndices: number[] = [];
    const redCellCoords: { r: number; c: number }[] = [];

    const excCols = [
      "Mat.",
      "Nome",
      "Função",
      "D.S",
      "Data",
      "Entrada",
      "Interv.",
      "Interv.",
      "Saída",
      "Horas executadas",
      "Acima do limite",
      "Seção",
    ];

    dados.exc.blocks.forEach((blk) => {
      const rowsForBlock = dados.exc!.rows.filter((r) => r.bloco === blk.title);
      if (!rowsForBlock.length) return;

      // Linha de título do bloco
      blockTitleRowIndices.push(excRows.length);
      excRows.push([
        `${blk.title}${blk.limit != null ? ` — limite de ${blk.limit}h` : ""}`,
      ]);

      // Header do bloco
      blockHeaderRowIndices.push(excRows.length);
      excRows.push(excCols);

      rowsForBlock.forEach((r) => {
        const currentR = excRows.length;
        if (r.acima != null && r.acima > 0) {
          redCellCoords.push({ r: currentR, c: 10 });
        }
        excRows.push([
          r.mat,
          r.nome,
          r.funcao,
          r.ds,
          r.data,
          r.ent,
          r.int1,
          r.int2,
          r.sai,
          r.hrs,
          r.acima != null ? (r.acima > 0 ? `+${fmtDec(r.acima)}` : fmtDec(r.acima)) : "",
          r.secao,
        ]);
      });

      excRows.push([]); // Espaço entre blocos
    });

    const wsExc = XLSX.utils.aoa_to_sheet(excRows);

    // Styling
    blockTitleRowIndices.forEach((rIdx) => {
      const addr = XLSX.utils.encode_cell({ r: rIdx, c: 0 });
      if (wsExc[addr]) {
        wsExc[addr].s = {
          font: { name: "Arial", sz: 12, bold: true, color: { rgb: "8F6A1F" } },
          fill: { fgColor: { rgb: "F1E8D6" } },
        };
      }
    });

    blockHeaderRowIndices.forEach((rIdx) => {
      for (let c = 0; c < excCols.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: rIdx, c });
        if (wsExc[addr]) {
          wsExc[addr].s = {
            font: fontHeader,
            fill: fillHeader,
            alignment: { horizontal: c === 0 || c === 9 || c === 10 ? "right" : "left" },
          };
        }
      }
    });

    redCellCoords.forEach(({ r, c }) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (wsExc[addr]) {
        wsExc[addr].s = {
          font: { name: "Arial", sz: 10, bold: true, color: { rgb: "B23A30" } },
          border: borderThin,
          alignment: { horizontal: "right" },
        };
      }
    });

    wsExc["!cols"] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 26 },
      { wch: 10 },
      { wch: 13 },
      { wch: 9 },
      { wch: 9 },
      { wch: 9 },
      { wch: 9 },
      { wch: 16 },
      { wch: 16 },
      { wch: 28 },
    ];

    XLSX.utils.book_append_sheet(wb, wsExc, dados.names.exc || "Excesso de carga horária");
  }

  // ==========================================
  // 5. ABA SÁBADOS CONSECUTIVOS (se existir)
  // ==========================================
  if (dados.sabados && dados.sabados.length > 0) {
    const sabCols = ["Mat.", "Nome", "Função", "Letra", "D.S", "Data", "Entrada", "Interv.", "Interv.", "Saída", "Seção"];
    const sabRows: unknown[][] = [sabCols];
    dados.sabados.forEach((r) => {
      sabRows.push([r.mat, r.nome, r.funcao, r.letra, r.ds, r.data, r.ent, r.int1, r.int2, r.sai, r.secao]);
    });
    const wsSab = XLSX.utils.aoa_to_sheet(sabRows);
    for (let c = 0; c < sabCols.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (wsSab[addr]) {
        wsSab[addr].s = {
          font: fontHeader,
          fill: fillHeader,
          alignment: { horizontal: c === 0 ? "right" : "left" },
        };
      }
    }
    for (let r = 1; r < sabRows.length; r++) {
      for (let c = 0; c < sabCols.length; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = wsSab[addr];
        if (cell) {
          cell.s = {
            font: fontDefault,
            border: borderThin,
            alignment: { horizontal: c === 0 ? "right" : "left" },
          };
        }
      }
    }
    wsSab["!cols"] = [
      { wch: 10 }, { wch: 30 }, { wch: 26 }, { wch: 8 }, { wch: 8 },
      { wch: 13 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSab, dados.names.sabados || "SÁBADOS CONSECUTIVOS");
  }

  // ==========================================
  // 6. ABA H.E DURANTE FOLGA (se existir)
  // ==========================================
  if (dados.folga && dados.folga.length > 0) {
    const folgaCols = ["Mat.", "Nome", "Função", "Letra", "D.S", "Data", "Entrada", "Interv.", "Interv.", "Saída", "Horas executadas", "Seção", "Status"];
    const folgaRows: unknown[][] = [folgaCols];
    dados.folga.forEach((r) => {
      folgaRows.push([r.mat, r.nome, r.funcao, r.letra, r.ds, r.data, r.ent, r.int1, r.int2, r.sai, r.hrsFormatted || fmtDec(r.hrs), r.secao, r.status]);
    });
    const wsFolga = XLSX.utils.aoa_to_sheet(folgaRows);
    for (let c = 0; c < folgaCols.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (wsFolga[addr]) {
        wsFolga[addr].s = {
          font: fontHeader,
          fill: fillHeader,
          alignment: { horizontal: c === 0 || c === 10 ? "right" : "left" },
        };
      }
    }
    for (let r = 1; r < folgaRows.length; r++) {
      for (let c = 0; c < folgaCols.length; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = wsFolga[addr];
        if (cell) {
          cell.s = {
            font: fontDefault,
            border: borderThin,
            alignment: { horizontal: c === 0 || c === 10 ? "right" : "left" },
          };
        }
      }
    }
    wsFolga["!cols"] = [
      { wch: 10 }, { wch: 30 }, { wch: 26 }, { wch: 8 }, { wch: 8 },
      { wch: 13 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 16 }, { wch: 28 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, wsFolga, dados.names.folga || "H.E DURANTE FOLGA");
  }

  // Gera o nome do arquivo
  const per = (dados.periodo || "").replace(/\s*a\s*/i, "_a_").replace(/[^0-9_a]/gi, "-").replace(/-+/g, "-");
  const filename = dados.demo
    ? `Horas_extras_exemplo_${per || "periodo"}.xlsx`
    : `Horas_extras_${per || "periodo"}.xlsx`;

  XLSX.writeFile(wb, filename);
  return filename;
}
