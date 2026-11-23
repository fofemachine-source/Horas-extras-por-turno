import {
  type DadosPainel,
  type Pessoa,
  type Cadastro,
  type BlocoExcesso,
  type LinhaExcesso,
  type LinhaSabadoConsecutivo,
  type LinhaHeFolga,
  turnoInfo,
  dataSerial,
  fmtHM,
} from "./horasExtrasParser";

// Gerador pseudoaleatório Mulberry32 determinístico
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRIMEIROS_NOMES = [
  "JOÃO", "CARLOS", "JÚLIA", "MATEUS", "BRUNA", "LUANA", "SÉRGIO", "RAFAEL",
  "MARCOS", "ANA", "PAULO", "LUCAS", "FERNANDA", "RODRIGO", "GABRIEL", "BEATRIZ",
  "DIEGO", "THIAGO", "FELIPE", "JULIANA", "ALEXANDRE", "RENATO", "PATRÍCIA", "MARCELO",
  "VANESSA", "LEANDRO", "DANIEL", "CAMILA", "LEONARDO", "ALINE", "EDUARDO", "LETÍCIA"
];

const SOBRENOMES = [
  "AMOSTRA", "SIMULADO", "PADRÃO", "EXEMPLO", "TESTE", "MODELO", "PILOTO", "DEMO",
  "FIGURATIVO", "ESBOÇO", "FICHA", "FICTÍCIO", "ENSÁIO", "MOCK"
];

const FUNCOES = [
  "MOTORISTA OP. BASICO", "OPERADOR DE ESCAVADEIRA", "MECANICO DE MANUTENCAO",
  "TECNICO DE SEGURANCA", "AUXILIAR DE ALMOXARIFADO", "OPERADOR DE TRATOR",
  "ELETRICISTA DE AUTOS", "BORRACHEIRO", "LUBRIFICADOR", "APONTADOR DE CAMPO",
  "SUPERVISOR DE OPERACOES", "LIDER DE TURNO", "SOLDADOR INDUSTRIAL"
];

const SECOES = [
  "OPERAÇÃO DE MINA", "MANUTENÇÃO PESADA", "SUPRIMENTOS / ALMOXARIFADO",
  "SESMT / SEGURANÇA", "ADMINISTRAÇÃO DE OBRA", "PRODUÇÃO E INFRAESTRUTURA"
];

export function gerarDadosExemplo(): DadosPainel {
  const rng = mulberry32(20261023);

  function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(rng() * arr.length)];
  }

  function round2(v: number): number {
    return Math.round(v * 100) / 100;
  }

  // Turnos conforme especificação:
  // A (140 pessoas, 92% com HE, média de 15h)
  // B (150, 95%, 13h)
  // C (145, 55%, 2,5h)
  // D (150, 90%, 2h)
  // Adm - Manut (110, 100%, 11h)
  // Adm - Supri (115, 15%, 9h)
  // Adm - Adm (35, 55%, 14h)
  // Adm - Prod (30, 90%, 9h)
  // Adm - Sesmt (16, 100%, 3h)
  // Afastado (6, sem HE)

  interface TurnoSpec {
    rawName: string;
    count: number;
    pctHE: number;
    targetMedia: number;
    pct100Ratio: number; // proporção de e100 vs e60
    secaoPadrao: string;
  }

  const specs: TurnoSpec[] = [
    { rawName: "Turno A", count: 140, pctHE: 0.92, targetMedia: 14.43, pct100Ratio: 0.75, secaoPadrao: "OPERAÇÃO DE MINA" },
    { rawName: "Turno B", count: 150, pctHE: 0.92, targetMedia: 11.37, pct100Ratio: 0.76, secaoPadrao: "OPERAÇÃO DE MINA" },
    { rawName: "Turno C", count: 145, pctHE: 0.55, targetMedia: 1.47, pct100Ratio: 0.76, secaoPadrao: "OPERAÇÃO DE MINA" },
    { rawName: "Turno D", count: 150, pctHE: 0.92, targetMedia: 1.85, pct100Ratio: 0.75, secaoPadrao: "OPERAÇÃO DE MINA" },
    { rawName: "Adm - Manut", count: 110, pctHE: 1.00, targetMedia: 10.63, pct100Ratio: 0.37, secaoPadrao: "MANUTENÇÃO PESADA" },
    { rawName: "Adm - Supri", count: 115, pctHE: 0.15, targetMedia: 1.05, pct100Ratio: 0.50, secaoPadrao: "SUPRIMENTOS / ALMOXARIFADO" },
    { rawName: "Adm - Adm", count: 35, pctHE: 0.55, targetMedia: 7.97, pct100Ratio: 0.37, secaoPadrao: "ADMINISTRAÇÃO DE OBRA" },
    { rawName: "Adm - Prod", count: 30, pctHE: 0.90, targetMedia: 7.78, pct100Ratio: 0.35, secaoPadrao: "PRODUÇÃO E INFRAESTRUTURA" },
    { rawName: "Adm - Sesmt", count: 16, pctHE: 1.00, targetMedia: 3.14, pct100Ratio: 0.40, secaoPadrao: "SESMT / SEGURANÇA" },
    { rawName: "Afastado", count: 6, pctHE: 0, targetMedia: 0, pct100Ratio: 0, secaoPadrao: "ADMINISTRAÇÃO DE OBRA" },
  ];

  const people: Pessoa[] = [];
  const cad: Cadastro[] = [];
  let chapaIndex = 1001;

  // Let's create specific top candidates to mirror the exact top 10 from the screenshot
  const specificTopTen = [
    { nome: "JOÃO AMOSTRA", total: 25.41, e100: 19.00, e60: 6.41, turno: "Turno A", funcao: "OPERADOR DE ESCAVADEIRA" },
    { nome: "JOÃO SIMULADO", total: 25.39, e100: 19.50, e60: 5.89, turno: "Turno A", funcao: "MOTORISTA OP. BASICO" },
    { nome: "JÚLIA PADRÃO", total: 25.31, e100: 18.90, e60: 6.41, turno: "Turno A", funcao: "OPERADOR DE TRATOR" },
    { nome: "CARLOS EXEMPLO", total: 25.09, e100: 18.80, e60: 6.29, turno: "Turno A", funcao: "LIDER DE TURNO" },
    { nome: "SÉRGIO AMOSTRA", total: 25.00, e100: 18.50, e60: 6.50, turno: "Turno A", funcao: "MOTORISTA OP. BASICO" },
    { nome: "MATEUS PADRÃO", total: 24.95, e100: 18.40, e60: 6.55, turno: "Turno A", funcao: "OPERADOR DE ESCAVADEIRA" },
    { nome: "BRUNA EXEMPLO", total: 24.89, e100: 18.20, e60: 6.69, turno: "Turno A", funcao: "SUPERVISOR DE OPERACOES" },
    { nome: "LUANA TESTE", total: 24.25, e100: 18.00, e60: 6.25, turno: "Turno A", funcao: "OPERADOR DE TRATOR" },
    { nome: "SÉRGIO AMOSTRA", total: 24.23, e100: 18.10, e60: 6.13, turno: "Turno A", funcao: "MOTORISTA OP. BASICO" },
    { nome: "RAFAEL AMOSTRA", total: 24.20, e100: 18.00, e60: 6.20, turno: "Turno A", funcao: "OPERADOR DE ESCAVADEIRA" },
  ];

  let topIdx = 0;

  for (const sp of specs) {
    const tInfo = turnoInfo(sp.rawName)!;
    const numWithHE = Math.round(sp.count * sp.pctHE);
    const targetTotal = sp.count * sp.targetMedia;

    // Distribute among collaborators
    const values: number[] = new Array(sp.count).fill(0);

    if (sp.rawName === "Turno A") {
      // Put our top 10 here
      for (let i = 0; i < specificTopTen.length && i < sp.count; i++) {
        values[i] = specificTopTen[i].total;
      }
      const topSum = specificTopTen.reduce((a, b) => a + b.total, 0);
      const remainingTarget = Math.max(0, targetTotal - topSum);
      const remainingHE = Math.max(1, numWithHE - specificTopTen.length);
      const avgRem = remainingTarget / remainingHE;
      for (let i = specificTopTen.length; i < numWithHE; i++) {
        const factor = 0.5 + rng(); // 0.5 to 1.5
        values[i] = round2(avgRem * factor);
      }
    } else if (numWithHE > 0) {
      // Generate distributed values around targetMedia
      const avgHE = targetTotal / numWithHE;
      let currentSum = 0;
      for (let i = 0; i < numWithHE; i++) {
        // Vary randomly between 0.3 and 1.8
        const factor = 0.3 + rng() * 1.5;
        let val = round2(avgHE * factor);
        if (sp.rawName === "Turno B" && val > 21.82) val = 21.82;
        if (sp.rawName === "Turno C" && val > 4.25) val = 4.25;
        if (sp.rawName === "Turno D" && val > 3.38) val = 3.38;
        if (sp.rawName === "Adm - Adm" && val > 22.40) val = 22.40;
        if (sp.rawName === "Adm - Manut" && val > 18.58) val = 18.58;
        if (sp.rawName === "Adm - Prod" && val > 14.64) val = 14.64;
        values[i] = val;
        currentSum += val;
      }
      // Re-scale slightly so that the group sum hits targetTotal closely
      if (currentSum > 0) {
        const scale = targetTotal / currentSum;
        for (let i = 0; i < numWithHE; i++) {
          values[i] = round2(values[i] * scale);
        }
      }
    }

    for (let i = 0; i < sp.count; i++) {
      let nome: string;
      let funcao: string;
      let total = values[i] || 0;
      let e100 = 0;
      let e60 = 0;

      if (sp.rawName === "Turno A" && topIdx < specificTopTen.length && i < specificTopTen.length) {
        const spec = specificTopTen[topIdx++];
        nome = spec.nome;
        funcao = spec.funcao;
        total = spec.total;
        e100 = spec.e100;
        e60 = spec.e60;
      } else {
        const pNome = randomChoice(PRIMEIROS_NOMES);
        const sNome1 = randomChoice(SOBRENOMES);
        const sNome2 = randomChoice(SOBRENOMES);
        nome = `${pNome} ${sNome1} ${sNome2}`;
        funcao = randomChoice(FUNCOES);
        if (total > 0) {
          // split according to pct100Ratio with slight variation
          const ratio = Math.max(0.1, Math.min(0.9, sp.pct100Ratio + (rng() - 0.5) * 0.2));
          e100 = round2(total * ratio);
          e60 = round2(total - e100);
        }
      }

      const chapa = chapaIndex++;
      const secao = sp.secaoPadrao;
      const baseCol = "Obra Exemplo";

      people.push({
        chapa,
        nome,
        funcao,
        e100,
        e60,
        total,
        base: baseCol,
        turno: tInfo,
        secao,
      });

      // Corresponding Cadastro row in Planilha1
      const sit = sp.rawName === "Afastado" ? "P" : rng() < 0.94 ? "A" : rng() < 0.5 ? "F" : "P";
      const letra = tInfo.group === "Turnos" ? tInfo.short : "A";
      const codHor = tInfo.group === "Turnos" ? 100 + tInfo.order : 201;
      // Admissão dates between 2018 and 2024
      const admDays = 43000 + Math.floor(rng() * 2500);

      cad.push({
        chapa,
        nome,
        funcao,
        sit,
        hor: codHor,
        letra,
        adm: dataSerial(admDays),
        admSort: admDays,
        secao,
      });
    }
  }

  // Excesso de carga horária
  // 3 blocos: Seg. a quinta-feira (limite de 1h), Sexta feira (2h) e Sábado (8h)
  const blocks: BlocoExcesso[] = [
    { title: "Seg. a quinta-feira", limit: 1, n: 0, sum: 0 },
    { title: "Sexta feira", limit: 2, n: 0, sum: 0 },
    { title: "Sábado", limit: 8, n: 0, sum: 0 },
  ];

  const rows: LinhaExcesso[] = [];
  const excessTargetCounts = [22, 12, 7]; // total 41 occurrences!

  const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  for (let b = 0; b < blocks.length; b++) {
    const blk = blocks[b];
    const targetN = excessTargetCounts[b];
    for (let k = 0; k < targetN; k++) {
      const p = randomChoice(people.filter((x) => x.turno.key !== "Afastado"));
      const limit = blk.limit!;
      // hours executed: limit + excess (0.2 to 2.5h)
      const excess = round2(0.2 + rng() * 2.3);
      const hrs = round2(limit + excess);
      blk.n++;
      blk.sum += hrs;

      const dateSerialNum = 46280 + Math.floor(rng() * 28);
      const ds = diasSemana[b === 0 ? Math.floor(rng() * 4) : b === 1 ? 4 : 5];

      rows.push({
        bloco: blk.title,
        limite: limit,
        mat: typeof p.chapa === "number" ? p.chapa : parseInt(String(p.chapa), 10) || 1000 + k,
        nome: p.nome,
        funcao: p.funcao,
        letra: p.turno.short,
        ds,
        data: dataSerial(dateSerialNum),
        dataSort: dateSerialNum,
        ent: "07:00",
        int1: "11:30",
        int2: "12:30",
        sai: "17:30",
        hrs,
        acima: excess,
        secao: p.secao,
      });
    }
  }

  // Sábados Consecutivos (dados de exemplo)
  const sabados: LinhaSabadoConsecutivo[] = [
    {
      bloco: "Sábado",
      mat: 21006,
      nome: "ALDICELE SANTOS DA SILVA FERREIRA",
      funcao: "MECANICO III",
      letra: "A",
      ds: "SAB",
      data: "19/09/2026",
      dataSort: 46284,
      ent: "05:30",
      int1: "11:00",
      int2: "12:00",
      sai: "18:00",
      secao: "UMCAMINA Turma 2",
    },
    {
      bloco: "Sábado",
      mat: 21006,
      nome: "ALDICELE SANTOS DA SILVA FERREIRA",
      funcao: "MECANICO III",
      letra: "A",
      ds: "SAB",
      data: "26/09/2026",
      dataSort: 46291,
      ent: "05:30",
      int1: "11:00",
      int2: "12:00",
      sai: "17:30",
      secao: "UMCAMINA Turma 2",
    },
    {
      bloco: "Sábado",
      mat: 22306,
      nome: "ANTONIO LUIZ DA SILVA CARVALHO",
      funcao: "ELETRICISTA III",
      letra: "B",
      ds: "SAB",
      data: "19/09/2026",
      dataSort: 46284,
      ent: "06:55",
      int1: "11:00",
      int2: "12:00",
      sai: "19:29",
      secao: "UMCAMINA Turma 2",
    },
    {
      bloco: "Sábado",
      mat: 22306,
      nome: "ANTONIO LUIZ DA SILVA CARVALHO",
      funcao: "ELETRICISTA III",
      letra: "B",
      ds: "SAB",
      data: "26/09/2026",
      dataSort: 46291,
      ent: "07:00",
      int1: "11:30",
      int2: "12:30",
      sai: "18:30",
      secao: "UMCAMINA Turma 2",
    },
    {
      bloco: "Sábado",
      mat: 22306,
      nome: "ANTONIO LUIZ DA SILVA CARVALHO",
      funcao: "ELETRICISTA III",
      letra: "B",
      ds: "SAB",
      data: "03/10/2026",
      dataSort: 46298,
      ent: "06:55",
      int1: "11:00",
      int2: "12:00",
      sai: "19:29",
      secao: "UMCAMINA Turma 2",
    },
    {
      bloco: "Sábado",
      mat: 25353,
      nome: "ITALO CASSIO PEREIRA DE NASCIMENTO",
      funcao: "MOTORISTA",
      letra: "C",
      ds: "SAB",
      data: "26/09/2026",
      dataSort: 46291,
      ent: "05:30",
      int1: "11:00",
      int2: "12:00",
      sai: "18:00",
      secao: "UMCAMINA",
    },
    {
      bloco: "Sábado",
      mat: 25353,
      nome: "ITALO CASSIO PEREIRA DE NASCIMENTO",
      funcao: "MOTORISTA",
      letra: "C",
      ds: "SAB",
      data: "03/10/2026",
      dataSort: 46298,
      ent: "05:30",
      int1: "11:00",
      int2: "12:00",
      sai: "18:00",
      secao: "UMCAMINA",
    },
    {
      bloco: "Sábado",
      mat: 25353,
      nome: "ITALO CASSIO PEREIRA DE NASCIMENTO",
      funcao: "MOTORISTA",
      letra: "C",
      ds: "SAB",
      data: "10/10/2026",
      dataSort: 46305,
      ent: "05:40",
      int1: "11:00",
      int2: "12:00",
      sai: "17:40",
      secao: "UMCAMINA",
    },
    {
      bloco: "Sábado",
      mat: 19469,
      nome: "VINICIUS SILVA VIEIRA",
      funcao: "ELETRICISTA III",
      letra: "B",
      ds: "SAB",
      data: "19/09/2026",
      dataSort: 46284,
      ent: "07:13",
      int1: "11:00",
      int2: "12:00",
      sai: "18:25",
      secao: "UMCAMINA Turma 2",
    },
    {
      bloco: "Sábado",
      mat: 19469,
      nome: "VINICIUS SILVA VIEIRA",
      funcao: "ELETRICISTA III",
      letra: "B",
      ds: "SAB",
      data: "26/09/2026",
      dataSort: 46291,
      ent: "07:15",
      int1: "11:00",
      int2: "12:00",
      sai: "18:30",
      secao: "UMCAMINA Turma 2",
    },
    {
      bloco: "Sábado",
      mat: 26534,
      nome: "STHANLEY SOUZA DE OLIVEIRA",
      funcao: "MOTORISTA",
      letra: "D",
      ds: "SAB",
      data: "19/09/2026",
      dataSort: 46284,
      ent: "06:49",
      int1: "11:00",
      int2: "12:00",
      sai: "19:00",
      secao: "UMCAMINA",
    },
    {
      bloco: "Sábado",
      mat: 26534,
      nome: "STHANLEY SOUZA DE OLIVEIRA",
      funcao: "MOTORISTA",
      letra: "D",
      ds: "SAB",
      data: "26/09/2026",
      dataSort: 46291,
      ent: "06:45",
      int1: "11:00",
      int2: "12:00",
      sai: "19:00",
      secao: "UMCAMINA",
    },
    {
      bloco: "Sábado",
      mat: 26534,
      nome: "STHANLEY SOUZA DE OLIVEIRA",
      funcao: "MOTORISTA",
      letra: "D",
      ds: "SAB",
      data: "03/10/2026",
      dataSort: 46298,
      ent: "06:50",
      int1: "11:00",
      int2: "12:00",
      sai: "18:45",
      secao: "UMCAMINA",
    },
    {
      bloco: "Sábado",
      mat: 27110,
      nome: "CARLOS HENRIQUE LIMA",
      funcao: "OPERADOR DE ESCAVADEIRA",
      letra: "A",
      ds: "SAB",
      data: "03/10/2026",
      dataSort: 46298,
      ent: "07:00",
      int1: "12:00",
      int2: "13:00",
      sai: "17:00",
      secao: "OPERAÇÃO DE MINA",
    },
    {
      bloco: "Sábado",
      mat: 27110,
      nome: "CARLOS HENRIQUE LIMA",
      funcao: "OPERADOR DE ESCAVADEIRA",
      letra: "A",
      ds: "SAB",
      data: "10/10/2026",
      dataSort: 46305,
      ent: "07:00",
      int1: "—",
      int2: "—",
      sai: "15:30",
      secao: "OPERAÇÃO DE MINA",
    },
  ];

  // H.E Durante Folga (dados de exemplo)
  const folga: LinhaHeFolga[] = [
    {
      bloco: "Folga",
      mat: 24101,
      nome: "JOÃO AMOSTRA",
      funcao: "OPERADOR DE TRATOR",
      letra: "A",
      ds: "DOM",
      data: "20/09/2026",
      dataSort: 46285,
      ent: "08:00",
      int1: "12:00",
      int2: "13:00",
      sai: "17:00",
      hrs: 8,
      hrsFormatted: fmtHM(8),
      secao: "UMCAMINA",
      status: "TREINAMENTO RAC",
    },
    {
      bloco: "Folga",
      mat: 24180,
      nome: "LUCAS FERREIRA",
      funcao: "MECANICO DE MANUTENCAO",
      letra: "B",
      ds: "DOM",
      data: "20/09/2026",
      dataSort: 46285,
      ent: "08:00",
      int1: "—",
      int2: "—",
      sai: "12:00",
      hrs: 4,
      hrsFormatted: fmtHM(4),
      secao: "MANUTENÇÃO PESADA",
      status: "EXAME PERIÓDICO",
    },
    {
      bloco: "Folga",
      mat: 25010,
      nome: "CARLOS EXEMPLO",
      funcao: "MOTORISTA OP. BASICO",
      letra: "A",
      ds: "DOM",
      data: "27/09/2026",
      dataSort: 46292,
      ent: "08:00",
      int1: "12:00",
      int2: "13:00",
      sai: "16:30",
      hrs: 7.5,
      hrsFormatted: fmtHM(7.5),
      secao: "UMCAMINA",
      status: "TREINAMENTO NR-22",
    },
    {
      bloco: "Folga",
      mat: 25112,
      nome: "MATEUS PADRÃO",
      funcao: "ELETRICISTA DE AUTOS",
      letra: "C",
      ds: "DOM",
      data: "27/09/2026",
      dataSort: 46292,
      ent: "08:00",
      int1: "—",
      int2: "—",
      sai: "11:30",
      hrs: 3.5,
      hrsFormatted: fmtHM(3.5),
      secao: "MANUTENÇÃO PESADA",
      status: "EXAME CLÍNICO",
    },
    {
      bloco: "Folga",
      mat: 25203,
      nome: "SÉRGIO AMOSTRA",
      funcao: "SOLDADOR INDUSTRIAL",
      letra: "A",
      ds: "DOM",
      data: "04/10/2026",
      dataSort: 46299,
      ent: "07:30",
      int1: "11:30",
      int2: "12:30",
      sai: "16:00",
      hrs: 7.5,
      hrsFormatted: fmtHM(7.5),
      secao: "SESMT / SEGURANÇA",
      status: "TREINAMENTO RAC",
    },
    {
      bloco: "Folga",
      mat: 25304,
      nome: "RAFAEL AMOSTRA",
      funcao: "OPERADOR DE ESCAVADEIRA",
      letra: "B",
      ds: "DOM",
      data: "04/10/2026",
      dataSort: 46299,
      ent: "08:00",
      int1: "—",
      int2: "—",
      sai: "12:30",
      hrs: 4.5,
      hrsFormatted: fmtHM(4.5),
      secao: "UMCAMINA",
      status: "AUDIOMETRIA",
    },
    {
      bloco: "Folga",
      mat: 25415,
      nome: "JÚLIA PADRÃO",
      funcao: "TECNICO DE SEGURANCA",
      letra: "A",
      ds: "DOM",
      data: "11/10/2026",
      dataSort: 46306,
      ent: "08:00",
      int1: "12:00",
      int2: "13:00",
      sai: "17:00",
      hrs: 8,
      hrsFormatted: fmtHM(8),
      secao: "SESMT / SEGURANÇA",
      status: "TREINAMENTO NR-22",
    },
    {
      bloco: "Folga",
      mat: 25526,
      nome: "LUANA TESTE",
      funcao: "APONTADOR DE CAMPO",
      letra: "C",
      ds: "DOM",
      data: "11/10/2026",
      dataSort: 46306,
      ent: "08:00",
      int1: "—",
      int2: "—",
      sai: "11:00",
      hrs: 3,
      hrsFormatted: fmtHM(3),
      secao: "OPERAÇÃO DE MINA",
      status: "EXAME PERIÓDICO",
    },
    {
      bloco: "Folga",
      mat: 25637,
      nome: "BRUNA EXEMPLO",
      funcao: "SUPERVISOR DE OPERACOES",
      letra: "D",
      ds: "SEG",
      data: "12/10/2026",
      dataSort: 46307,
      ent: "08:00",
      int1: "12:00",
      int2: "13:00",
      sai: "16:00",
      hrs: 7,
      hrsFormatted: fmtHM(7),
      secao: "OPERAÇÃO DE MINA",
      status: "TREINAMENTO RAC",
    },
  ];

  return {
    people,
    cad,
    exc: { blocks, rows },
    sabados,
    folga,
    names: {
      base: "Base",
      media: "Média",
      cad: "Planilha1",
      exc: "Excesso de carga horária",
      sabados: "SÁBADOS CONSECUTIVOS",
      folga: "H.E DURANTE FOLGA",
    },
    obra: "Exemplo",
    periodo: "16/09/2026 A 14/10/2026",
    demo: true,
  };
}

