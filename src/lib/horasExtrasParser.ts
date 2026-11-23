// horasExtrasParser.ts — Leitor do "relatório de total de horas" (Excel) do Painel de Horas Extras.
// Abas esperadas: Base, Média, Planilha1 (cadastro) e Excesso de carga horária.
// Usa xlsx 0.18.5. Roda no navegador: o arquivo não sai do computador.
import * as XLSX from "xlsx";

export interface Turno { key: string; label: string; short: string; group: string; order: number }
export interface Pessoa {
  chapa: string | number; nome: string; funcao: string;
  e100: number; e60: number; total: number; base: string; turno: Turno; secao: string;
}
export interface Cadastro {
  chapa: string | number; nome: string; funcao: string; sit: string; hor: string | number;
  letra: string; adm: string; admSort: number; secao: string;
}
export interface BlocoExcesso { title: string; limit: number | null; n: number; sum: number }
export interface LinhaExcesso {
  bloco: string; limite: number | null; mat: number; nome: string; funcao: string; letra: string; ds: string;
  data: string; dataSort: number; ent: string; int1: string; int2: string; sai: string;
  hrs: number; acima: number | null; secao: string;
}
export interface LinhaSabadoConsecutivo {
  bloco: string; mat: number | string; nome: string; funcao: string; letra: string; ds: string;
  data: string; dataSort: number; ent: string; int1: string; int2: string; sai: string;
  secao: string;
}
export interface LinhaHeFolga {
  bloco: string; mat: number | string; nome: string; funcao: string; letra: string; ds: string;
  data: string; dataSort: number; ent: string; int1: string; int2: string; sai: string;
  hrs: number; hrsFormatted: string; secao: string; status: string;
}
export interface DadosPainel {
  people: Pessoa[]; cad: Cadastro[] | null; exc: { blocks: BlocoExcesso[]; rows: LinhaExcesso[] } | null;
  sabados?: LinhaSabadoConsecutivo[] | null;
  folga?: LinhaHeFolga[] | null;
  names: {
    base: string | null; media: string | null; cad: string | null; exc: string | null;
    sabados?: string | null; folga?: string | null;
  };
  obra: string; periodo: string; demo?: boolean;
}

export const SITUACOES: Record<string, string> = {
  A: "Ativo", F: "Férias", P: "Afastado (previdência)", Z: "Admissão próximo mês",
  I: "Aposentadoria por invalidez", E: "Licença maternidade", T: "Afastado (acidente)", D: "Demitido",
};

const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const num = (v: unknown): number => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(/\./g, "").replace(",", "."));
  return isFinite(n) ? n : 0;
};
/** Fração de dia do Excel -> "HH:MM" */
const relogio = (frac: unknown) => {
  if (typeof frac !== "number") return frac ? String(frac) : "";
  const t = Math.round((frac % 1) * 1440);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
/** Número de série do Excel -> "dd/mm/aaaa" */
export const dataSerial = (v: unknown) => {
  if (typeof v !== "number") return v ? String(v) : "";
  const d = new Date(Math.round((v - 25569) * 864e5));
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
};

// ---------- formatação de horas ----------
export const fmtDec = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtHM = (n: number) => {
  const neg = n < 0, t = Math.round(Math.abs(n) * 60);
  return (neg ? "-" : "") + Math.floor(t / 60) + "h" + String(t % 60).padStart(2, "0");
};
export const fmtInt = (n: number) => n.toLocaleString("pt-BR");

/** Classifica o texto da coluna Turno. */
export function turnoInfo(raw: unknown): Turno | null {
  const t = String(raw ?? "").trim(), n = norm(t);
  if (!t) return null;
  if (n.startsWith("afastad")) return { key: "Afastado", label: "Afastado", short: "Afastado", group: "Afastados", order: 99 };
  const tm = /^turno\s+([a-z])$/.exec(n);
  if (tm) return turnoInfo(tm[1]);
  if (/^[a-z]$/.test(n)) return { key: t.toUpperCase(), label: "Turno " + t.toUpperCase(), short: t.toUpperCase(), group: "Turnos", order: n.charCodeAt(0) - 96 };
  if (n.startsWith("adm")) {
    const rest = t.replace(/^adm\.?\s*-?\s*/i, "").replace(/\.$/, "").trim() || "Adm";
    return { key: "Adm - " + rest, label: "Adm - " + rest, short: rest, group: "Administrativo", order: 50 };
  }
  return { key: t, label: t, short: t, group: "Outros", order: 80 };
}

type Linha = unknown[];
const linhasDaAba = (wb: XLSX.WorkBook, nome: string) =>
  XLSX.utils.sheet_to_json<Linha>(wb.Sheets[nome], { header: 1, raw: true, defval: null });

function acharCabecalho(rows: Linha[], need: string[], from = 0) {
  for (let i = from; i < Math.min(rows.length, from + 40); i++) {
    const cells = (rows[i] || []).map(norm);
    if (need.every(n => cells.some(c => c === n || c.startsWith(n)))) return i;
  }
  return -1;
}
function valorMeta(rows: Linha[], ate: number, rotulo: string) {
  for (let i = 0; i < ate; i++) {
    const r = rows[i] || [];
    for (let j = 0; j < r.length; j++) if (norm(r[j]).startsWith(rotulo))
      for (let k = j + 1; k < r.length; k++) if (r[k] != null && r[k] !== "") return String(r[k]);
  }
  return "";
}

export async function lerRelatorioHoras(arquivo: File): Promise<DadosPainel> {
  const wb = XLSX.read(new Uint8Array(await arquivo.arrayBuffer()), { type: "array" });
  return lerWorkbook(wb);
}

export function lerWorkbook(wb: XLSX.WorkBook): DadosPainel {
  const names: DadosPainel["names"] = { base: null, media: null, cad: null, exc: null, sabados: null, folga: null };
  wb.SheetNames.forEach(n => {
    const k = norm(n);
    if (k === "base") names.base = n;
    else if (k.startsWith("media")) names.media = n;
    else if (k.includes("excesso")) names.exc = n;
    else if (k.includes("sabado") || k.includes("sab.") || k.includes("consecutiv")) names.sabados = n;
    else if (k.includes("folga") || k.includes("treinamento") || k.includes("exame")) names.folga = n;
    else if (!names.cad && acharCabecalho(linhasDaAba(wb, n), ["chapa", "nome", "situacao"]) >= 0) names.cad = n;
  });

  // Busca de contingência por cabeçalho nas demais abas caso o nome varie
  if (!names.sabados) {
    for (const n of wb.SheetNames) {
      if (n === names.base || n === names.media || n === names.cad || n === names.exc || n === names.folga) continue;
      const rws = linhasDaAba(wb, n);
      if (acharCabecalho(rws, ["mat", "letra", "d.s"]) >= 0 || acharCabecalho(rws, ["mat", "entrada", "saida"]) >= 0) {
        names.sabados = n;
        break;
      }
    }
  }

  if (!names.folga) {
    for (const n of wb.SheetNames) {
      if (n === names.base || n === names.media || n === names.cad || n === names.exc || n === names.sabados) continue;
      const rws = linhasDaAba(wb, n);
      if (acharCabecalho(rws, ["mat", "status"]) >= 0 || acharCabecalho(rws, ["mat", "horas exec"]) >= 0) {
        names.folga = n;
        break;
      }
    }
  }

  if (!names.base) names.base = wb.SheetNames[0];

  // Helper para hora limpa (vazio vira '—')
  const horaLimpa = (v: unknown): string => {
    if (v == null || v === "" || v === "-" || v === "—") return "—";
    if (typeof v === "number") {
      if (v < 1) return relogio(v) || "—";
      const h = Math.floor(v);
      const m = Math.round((v % 1) * 60);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    const s = String(v).trim();
    if (!s || s === "-" || s === "—") return "—";
    const hmMatch = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s);
    if (hmMatch) return `${hmMatch[1].padStart(2, "0")}:${hmMatch[2]}`;
    return s || "—";
  };

  const dataSortVal = (v: unknown): number => {
    if (typeof v === "number") return v;
    if (v instanceof Date) return v.getTime();
    if (typeof v === "string") {
      const parts = v.trim().split("/");
      if (parts.length === 3) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
      }
    }
    return 0;
  };

  // ----- Base -----
  const rows = linhasDaAba(wb, names.base);
  const h = acharCabecalho(rows, ["turno", "total"]);
  if (h < 0) throw new Error(`Não encontrei as colunas “Turno” e “Total” na aba “${names.base}”. Confira se é o relatório de total de horas.`);
  const head = rows[h].map(norm);
  const col = (...ns: string[]) => { for (const n of ns) { const i = head.indexOf(n); if (i >= 0) return i; } return -1; };
  const c = { chapa: col("chapa", "mat.", "matricula"), nome: col("funcionario", "nome"), funcao: col("funcao"),
    e100: col("extra 100%"), e60: col("extra 60%"), total: col("total"), base: col("base"), turno: col("turno"), secao: col("secao") };
  const people: Pessoa[] = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i]; if (!r) continue;
    const ti = turnoInfo(r[c.turno]);
    const nome = c.nome >= 0 ? r[c.nome] : null;
    if (!ti || (nome == null && (c.chapa < 0 || r[c.chapa] == null))) continue;
    const e100 = c.e100 >= 0 ? num(r[c.e100]) : 0, e60 = c.e60 >= 0 ? num(r[c.e60]) : 0;
    people.push({
      chapa: c.chapa >= 0 ? (r[c.chapa] as string | number) ?? "" : "", nome: String(nome ?? "").trim(),
      funcao: c.funcao >= 0 ? String(r[c.funcao] ?? "") : "", e100, e60,
      total: c.total >= 0 ? num(r[c.total]) : e100 + e60,
      base: c.base >= 0 ? String(r[c.base] ?? "") : "", turno: ti, secao: c.secao >= 0 ? String(r[c.secao] ?? "") : "",
    });
  }
  if (!people.length) throw new Error(`A aba “${names.base}” não tem linhas de colaboradores com turno preenchido.`);

  // ----- Planilha1 (cadastro) -----
  let cad: Cadastro[] | null = null;
  if (names.cad) {
    const cr = linhasDaAba(wb, names.cad), ch = acharCabecalho(cr, ["chapa", "nome", "situacao"]);
    const hd = cr[ch].map(norm), ix = (n: string) => hd.findIndex(x => x === n || x.startsWith(n));
    const ci = { chapa: ix("chapa"), nome: ix("nome"), funcao: ix("funcao"), sit: ix("situacao"), hor: ix("codhorario"), letra: ix("letra"), adm: ix("admissao"), secao: ix("descricao") };
    cad = [];
    for (let i = ch + 1; i < cr.length; i++) {
      const r = cr[i]; if (!r || r[ci.chapa] == null || r[ci.nome] == null) continue;
      cad.push({
        chapa: r[ci.chapa] as string | number, nome: String(r[ci.nome]).trim(), funcao: String(r[ci.funcao] ?? ""),
        sit: String(r[ci.sit] ?? "").trim(), hor: (r[ci.hor] as string | number) ?? "", letra: String(r[ci.letra] ?? "").trim(),
        adm: dataSerial(r[ci.adm]), admSort: typeof r[ci.adm] === "number" ? (r[ci.adm] as number) : 0, secao: String(r[ci.secao] ?? ""),
      });
    }
  }

  // ----- Excesso de carga horária (blocos com limite) -----
  let exc: DadosPainel["exc"] = null;
  if (names.exc) {
    const er = linhasDaAba(wb, names.exc);
    let bloco: BlocoExcesso | null = null;
    let hd: { mat: number; nome: number; funcao: number; letra: number; ds: number; data: number; ent: number; sai: number; hrs: number; secao: number; iv: number[] } | null = null;
    const out: { blocks: BlocoExcesso[]; rows: LinhaExcesso[] } = { blocks: [], rows: [] };
    for (let i = 0; i < er.length; i++) {
      const r = er[i] || [];
      const txt = r.find(v => typeof v === "string" && norm(v).startsWith("excesso")) as string | undefined;
      if (txt) {
        const m = /limite\s*de\s*(\d+(?:[.,]\d+)?)\s*h/i.exec(norm(txt));
        let title = txt.replace(/^excesso de carga hor[aá]ria de\s*/i, "").replace(/\(.*$/, "").replace(/[-–\s]+$/, "").trim();
        title = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
        bloco = { title, limit: m ? num(m[1]) : null, n: 0, sum: 0 }; out.blocks.push(bloco); continue;
      }
      const nr = r.map(norm);
      if (nr.some(x => x.startsWith("mat")) && nr.includes("d.s")) {
        const iv: number[] = []; nr.forEach((x, j) => { if (x.startsWith("interv")) iv.push(j); });
        hd = { mat: nr.findIndex(x => x.startsWith("mat")), nome: nr.indexOf("nome"), funcao: nr.indexOf("funcao"), letra: nr.indexOf("letra"),
          ds: nr.indexOf("d.s"), data: nr.indexOf("data"), ent: nr.indexOf("entrada"), sai: nr.findIndex(x => x.startsWith("saida")),
          hrs: nr.findIndex(x => x.startsWith("horas exec")), secao: nr.findIndex(x => x.startsWith("secao")), iv };
        if (!bloco) { bloco = { title: "Geral", limit: null, n: 0, sum: 0 }; out.blocks.push(bloco); }
        continue;
      }
      if (!hd || !bloco || typeof r[hd.mat] !== "number") continue;
      let hrs = r[hd.hrs] as unknown; hrs = typeof hrs === "number" ? (hrs < 1 ? hrs * 24 : hrs) : 0;
      const h2 = hrs as number;
      const acima = bloco.limit != null ? h2 - bloco.limit : null;
      bloco.n++; bloco.sum += h2;
      out.rows.push({
        bloco: bloco.title, limite: bloco.limit, mat: r[hd.mat] as number, nome: String(r[hd.nome] ?? ""), funcao: String(r[hd.funcao] ?? ""),
        letra: String(r[hd.letra] ?? ""), ds: String(r[hd.ds] ?? ""), data: dataSerial(r[hd.data]),
        dataSort: typeof r[hd.data] === "number" ? (r[hd.data] as number) : 0,
        ent: relogio(r[hd.ent]), int1: relogio(r[hd.iv[0]]), int2: relogio(r[hd.iv[1]]), sai: relogio(r[hd.sai]),
        hrs: h2, acima, secao: hd.secao >= 0 ? String(r[hd.secao] ?? "") : "",
      });
    }
    out.blocks = out.blocks.filter(b => b.n);
    exc = out.rows.length ? out : null;
  }

  // ----- Sábados Consecutivos -----
  let sabados: LinhaSabadoConsecutivo[] | null = null;
  if (names.sabados) {
    const sr = linhasDaAba(wb, names.sabados);
    let headIdx = -1;
    for (let i = 0; i < Math.min(sr.length, 30); i++) {
      const cells = (sr[i] || []).map(norm);
      if (cells.some(c => c === "mat" || c === "mat." || c.startsWith("mat"))) {
        headIdx = i;
        break;
      }
    }
    if (headIdx >= 0) {
      const hd = sr[headIdx].map(norm);
      const cMat = hd.findIndex(x => x.startsWith("mat"));
      const cNome = hd.findIndex(x => x.startsWith("nome") || x.startsWith("funciona"));
      const cFuncao = hd.findIndex(x => x.startsWith("func"));
      const cLetra = hd.findIndex(x => x === "letra" || x.startsWith("letra"));
      const cDs = hd.findIndex(x => x === "d.s" || x === "ds" || x.startsWith("d.s"));
      const cData = hd.findIndex(x => x.startsWith("data"));
      const cEnt = hd.findIndex(x => x.startsWith("ent"));
      const cSai = hd.findIndex(x => x.startsWith("sai"));
      const cSecao = hd.findIndex(x => x.includes("secao"));
      const ivCols: number[] = [];
      hd.forEach((x, colIdx) => {
        if (x.includes("interv") || x.startsWith("int")) ivCols.push(colIdx);
      });
      sabados = [];
      for (let i = headIdx + 1; i < sr.length; i++) {
        const r = sr[i];
        if (!r) continue;
        const rawMat = cMat >= 0 ? r[cMat] : null;
        if (rawMat == null || String(rawMat).trim() === "") break; // parar ao Mat. vazio
        sabados.push({
          bloco: cDs >= 0 && r[cDs] ? String(r[cDs]).trim() : "Sábado",
          mat: typeof rawMat === "number" ? rawMat : String(rawMat).trim(),
          nome: cNome >= 0 ? String(r[cNome] ?? "").trim() : "",
          funcao: cFuncao >= 0 ? String(r[cFuncao] ?? "").trim() : "",
          letra: cLetra >= 0 ? String(r[cLetra] ?? "").trim() : "",
          ds: cDs >= 0 ? String(r[cDs] ?? "").trim() : "SAB",
          data: cData >= 0 ? dataSerial(r[cData]) : "",
          dataSort: cData >= 0 ? dataSortVal(r[cData]) : 0,
          ent: cEnt >= 0 ? horaLimpa(r[cEnt]) : "—",
          int1: ivCols[0] != null ? horaLimpa(r[ivCols[0]]) : "—",
          int2: ivCols[1] != null ? horaLimpa(r[ivCols[1]]) : "—",
          sai: cSai >= 0 ? horaLimpa(r[cSai]) : "—",
          secao: cSecao >= 0 ? String(r[cSecao] ?? "").trim() : "",
        });
      }
    }
  }

  // ----- H.E Durante Folga -----
  let folga: LinhaHeFolga[] | null = null;
  if (names.folga) {
    const fr = linhasDaAba(wb, names.folga);
    let headIdx = -1;
    for (let i = 0; i < Math.min(fr.length, 30); i++) {
      const cells = (fr[i] || []).map(norm);
      if (cells.some(c => c === "mat" || c === "mat." || c.startsWith("mat"))) {
        headIdx = i;
        break;
      }
    }
    if (headIdx >= 0) {
      const hd = fr[headIdx].map(norm);
      const cMat = hd.findIndex(x => x.startsWith("mat"));
      const cNome = hd.findIndex(x => x.startsWith("nome") || x.startsWith("funciona"));
      const cFuncao = hd.findIndex(x => x.startsWith("func"));
      const cLetra = hd.findIndex(x => x === "letra" || x.startsWith("letra"));
      const cDs = hd.findIndex(x => x === "d.s" || x === "ds" || x.startsWith("d.s"));
      const cData = hd.findIndex(x => x.startsWith("data"));
      const cEnt = hd.findIndex(x => x.startsWith("ent"));
      const cSai = hd.findIndex(x => x.startsWith("sai"));
      const cHrs = hd.findIndex(x => x.includes("exec") || x.includes("horas"));
      const cSecao = hd.findIndex(x => x.includes("secao"));
      const cStatus = hd.findIndex(x => x.includes("status") || x.includes("situacao"));
      const ivCols: number[] = [];
      hd.forEach((x, colIdx) => {
        if (x.includes("interv") || x.startsWith("int")) ivCols.push(colIdx);
      });
      folga = [];
      for (let i = headIdx + 1; i < fr.length; i++) {
        const r = fr[i];
        if (!r) continue;
        const rawMat = cMat >= 0 ? r[cMat] : null;
        if (rawMat == null || String(rawMat).trim() === "") break; // parar ao Mat. vazio
        const hrsRaw = cHrs >= 0 ? r[cHrs] : 0;
        const hrsNum = typeof hrsRaw === "number" ? (hrsRaw < 1 ? hrsRaw * 24 : hrsRaw) : num(hrsRaw);
        folga.push({
          bloco: cDs >= 0 && r[cDs] ? String(r[cDs]).trim() : "Folga",
          mat: typeof rawMat === "number" ? rawMat : String(rawMat).trim(),
          nome: cNome >= 0 ? String(r[cNome] ?? "").trim() : "",
          funcao: cFuncao >= 0 ? String(r[cFuncao] ?? "").trim() : "",
          letra: cLetra >= 0 ? String(r[cLetra] ?? "").trim() : "",
          ds: cDs >= 0 ? String(r[cDs] ?? "").trim() : "",
          data: cData >= 0 ? dataSerial(r[cData]) : "",
          dataSort: cData >= 0 ? dataSortVal(r[cData]) : 0,
          ent: cEnt >= 0 ? horaLimpa(r[cEnt]) : "—",
          int1: ivCols[0] != null ? horaLimpa(r[ivCols[0]]) : "—",
          int2: ivCols[1] != null ? horaLimpa(r[ivCols[1]]) : "—",
          sai: cSai >= 0 ? horaLimpa(r[cSai]) : "—",
          hrs: hrsNum,
          hrsFormatted: fmtHM(hrsNum),
          secao: cSecao >= 0 ? String(r[cSecao] ?? "").trim() : "",
          status: cStatus >= 0 && r[cStatus] != null ? String(r[cStatus]).trim() : "Realizado",
        });
      }
    }
  }

  return { people, cad, exc, sabados, folga, names, obra: valorMeta(rows, h, "obra"), periodo: valorMeta(rows, h, "data") };
}


// ---------- agregação da aba Média ----------
export interface GrupoTurno {
  key: string; label: string; short: string; group: string; order: number;
  n: number; nHE: number; e100: number; e60: number; total: number; media: number; max: number;
}
/** base = "todos" (média sobre todos os ativos) ou "comhe" (só quem fez HE). Afastados ficam fora. */
export function agregar(d: DadosPainel, base: "todos" | "comhe") {
  const ativos = d.people.filter(p => p.turno.key !== "Afastado");
  const pool = base === "comhe" ? ativos.filter(p => p.total > 0) : ativos;
  const mapa = new Map<string, { info: Turno; all: Pessoa[]; pool: Pessoa[] }>();
  for (const p of ativos) { if (!mapa.has(p.turno.key)) mapa.set(p.turno.key, { info: p.turno, all: [], pool: [] }); mapa.get(p.turno.key)!.all.push(p); }
  for (const p of pool) mapa.get(p.turno.key)!.pool.push(p);
  const grupos: GrupoTurno[] = [...mapa.values()].map(g => {
    const soma = g.pool.reduce((a, p) => a + p.total, 0);
    return { key: g.info.key, label: g.info.label, short: g.info.short, group: g.info.group, order: g.info.order,
      n: g.all.length, nHE: g.all.filter(p => p.total > 0).length,
      e100: g.all.reduce((a, p) => a + p.e100, 0), e60: g.all.reduce((a, p) => a + p.e60, 0),
      total: g.all.reduce((a, p) => a + p.total, 0), media: g.pool.length ? soma / g.pool.length : 0,
      max: Math.max(0, ...g.all.map(p => p.total)) };
  });
  grupos.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "pt-BR"));
  const mediaGeral = pool.length ? pool.reduce((a, p) => a + p.total, 0) / pool.length : 0;
  const soma = (k: "total" | "e100" | "e60") => ativos.reduce((a, p) => a + p[k], 0);
  return {
    grupos, mediaGeral, ativos, afastados: d.people.length - ativos.length,
    kpi: { total: soma("total"), e100: soma("e100"), e60: soma("e60"), nHE: ativos.filter(p => p.total > 0).length, n: ativos.length },
  };
}

/** Nome curto para o ranking: primeiro + último nome. */
export const nomeCurto = (n: string) => { const p = n.split(/\s+/).filter(Boolean); return p.length <= 2 ? n : p[0] + " " + p[p.length - 1]; };
