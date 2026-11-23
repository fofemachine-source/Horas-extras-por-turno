// App.tsx — Painel de Horas Extras por Turno (U&M Mineração e Construção / App Luis)
import React, { useState, useRef } from "react";
import {
  Share2,
  FileSpreadsheet,
  UploadCloud,
  AlertTriangle,
} from "lucide-react";
import { Navbar } from "./components/Navbar";
import { UploadDropzone } from "./components/UploadDropzone";
import { MediaTab } from "./components/MediaTab";
import { BaseTab } from "./components/BaseTab";
import { Planilha1Tab } from "./components/Planilha1Tab";
import { ExcessoTab } from "./components/ExcessoTab";
import {
  type DadosPainel,
  lerRelatorioHoras,
  fmtInt,
} from "./lib/horasExtrasParser";
import { baixarHtmlCompartilhado } from "./lib/visualizadorCompartilhado";
import { gerarDadosExemplo } from "./lib/demoData";
import { exportarExcel } from "./lib/exportExcel";

export const App: React.FC = () => {
  const [dados, setDados] = useState<DadosPainel | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<"media" | "base" | "cad" | "exc">("media");
  const [formatoHora, setFormatoHora] = useState<"dec" | "hm">("dec");
  const [baseMedia, setBaseMedia] = useState<"todos" | "comhe">("todos");
  const [ordemGrafico, setOrdemGrafico] = useState<"turno" | "valor">("turno");
  const [isReading, setIsReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);


  // Manipulador de leitura de arquivo
  const handleFileSelect = async (file: File) => {
    setIsReading(true);
    setReadError(null);
    try {
      const parsed = await lerRelatorioHoras(file);
      setDados(parsed);
      setAbaAtiva("media");
    } catch (err: unknown) {
      console.error("Erro ao ler planilha:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível ler o arquivo. Verifique se é uma planilha válida.";
      setReadError(msg);
    } finally {
      setIsReading(false);
    }
  };

  // Carregar prévia de exemplo
  const handleLoadDemo = () => {
    setReadError(null);
    const demo = gerarDadosExemplo();
    setDados(demo);
    setAbaAtiva("media");
  };

  // Botão Compartilhar com planilha fixada
  const handleShare = () => {
    if (!dados) return;
    try {
      baixarHtmlCompartilhado(dados);
    } catch (err) {
      console.error("Erro ao compartilhar:", err);
    }
  };

  // Botão Baixar Excel
  const handleExportExcel = () => {
    if (!dados) return;
    try {
      exportarExcel(dados, baseMedia, ordemGrafico);
    } catch (err) {
      console.error("Erro ao exportar Excel:", err);
    }
  };

  // Botão Enviar outro arquivo
  const handleOtherFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      e.target.value = ""; // Permite selecionar o mesmo arquivo novamente
      handleFileSelect(file);
    }
  };

  // Lista de abas disponíveis
  const tabsList = [
    { key: "media", label: "Média", count: 0 },
    { key: "base", label: dados?.names.base || "Base", count: dados?.people.length || 0 },
    ...(dados?.cad
      ? [{ key: "cad", label: dados.names.cad || "Planilha1", count: dados.cad.length }]
      : []),
    ...(dados?.exc
      ? [
          {
            key: "exc",
            label: dados.names.exc || "Excesso de carga horária",
            count: dados.exc.rows.length,
          },
        ]
      : []),
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-[#EFE6D2]">
      {/* 1. Barra superior corporativa */}
      <Navbar />

      {/* Input oculto para "Enviar outro arquivo" */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept=".xlsx, .xls, .xlsm"
        className="hidden"
        onChange={handleOtherFileInput}
      />

      {/* 2. Conteúdo centralizado */}
      <main className="flex-1 max-w-[1180px] w-full mx-auto px-5 pt-7 pb-14">
        {/* 3. Cabeçalho do painel */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-[#B8892B] pb-4 mb-5">
          <div>
            <h1 className="font-condensed font-bold text-[36px] sm:text-[44px] text-[#2B2925] leading-none m-0">
              Painel de horas extras
            </h1>
            <div className="text-[15px] text-[#6E665A] mt-1.5 font-medium">
              {dados ? (
                <>
                  {dados.obra && `Obra ${dados.obra}`}
                  {dados.obra && dados.periodo && "  |  "}
                  {dados.periodo && `Período ${dados.periodo}`}
                </>
              ) : (
                "Envie o relatório de total de horas exportado do sistema de ponto."
              )}
            </div>
          </div>

          {/* Ações à direita (apenas quando houver dados) */}
          {dados && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Botão Compartilhar com gradiente dourado */}
              <button
                type="button"
                onClick={handleShare}
                title="Gera um arquivo HTML independente com os dados fixados"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[7px] text-[15px] font-semibold text-white border border-[#8F6A1F] shadow-[0_4px_12px_rgba(143,106,31,0.3)] transition-all cursor-pointer active:scale-[0.98]"
                style={{
                  background:
                    "linear-gradient(135deg, #D9B45A, #B8892B 55%, #8F6A1F)",
                }}
              >
                <Share2 className="w-4 h-4 text-white shrink-0" />
                <span>Compartilhar</span>
              </button>

              {/* Seletor segmentado de formato de hora */}
              <div
                role="group"
                aria-label="Formato de exibição das horas"
                className="inline-flex border border-[#E2D5B8] rounded-[6px] overflow-hidden bg-[#FFFDF7] shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setFormatoHora("dec")}
                  aria-pressed={formatoHora === "dec"}
                  className={`text-[14px] font-medium px-3 py-1.5 transition-colors cursor-pointer ${
                    formatoHora === "dec"
                      ? "bg-[#1E5B3E] text-white"
                      : "text-[#6E665A] hover:bg-black/5"
                  }`}
                >
                  15,20
                </button>
                <button
                  type="button"
                  onClick={() => setFormatoHora("hm")}
                  aria-pressed={formatoHora === "hm"}
                  className={`text-[14px] font-medium px-3 py-1.5 transition-colors cursor-pointer ${
                    formatoHora === "hm"
                      ? "bg-[#1E5B3E] text-white"
                      : "text-[#6E665A] hover:bg-black/5"
                  }`}
                >
                  15h12
                </button>
              </div>

              {/* Botão Baixar Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[7px] text-[15px] font-semibold text-white bg-[#1E5B3E] hover:bg-[#184831] transition-colors shadow-2xs cursor-pointer active:scale-[0.98]"
              >
                <FileSpreadsheet className="w-4 h-4 text-white shrink-0" />
                <span>Baixar Excel</span>
              </button>

              {/* Botão Enviar outro arquivo */}
              <button
                type="button"
                onClick={() => hiddenFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[7px] text-[15px] font-semibold text-[#1E5B3E] bg-transparent border-[1.5px] border-[#1E5B3E] hover:bg-[#1E5B3E]/10 transition-colors cursor-pointer active:scale-[0.98]"
              >
                <UploadCloud className="w-4 h-4 text-[#1E5B3E] shrink-0" />
                <span>Enviar outro arquivo</span>
              </button>
            </div>
          )}
        </div>


        {/* Notificação de Demonstração */}
        {dados?.demo && (
          <div className="mb-4 p-3 bg-[#FFF8E6] border border-[#E8D39A] rounded-[8px] text-[14px] text-[#2B2925] flex items-center gap-2.5 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-[#B8892B] shrink-0" />
            <span>
              Prévia com dados fictícios. Envie o relatório do ponto para ver os
              números reais.
            </span>
          </div>
        )}

        {/* 5. Renderização condicional: Tela de Envio OU Painel com Abas */}
        {!dados ? (
          <UploadDropzone
            onFileSelect={handleFileSelect}
            onLoadDemo={handleLoadDemo}
            errorMessage={readError}
            isLoading={isReading}
          />
        ) : (
          <div>
            {/* Barra de Abas */}
            <nav
              role="tablist"
              aria-label="Abas do relatório"
              className="flex gap-1 overflow-x-auto border-b-2 border-[#E2D5B8] mb-5 scrollbar-none"
            >
              {tabsList.map((t) => {
                const isActive = abaAtiva === t.key;
                return (
                  <button
                    key={t.key}
                    role="tab"
                    id={`tab-${t.key}`}
                    aria-controls={`panel-${t.key}`}
                    aria-selected={isActive}
                    onClick={() =>
                      setAbaAtiva(t.key as "media" | "base" | "cad" | "exc")
                    }
                    className={`font-semibold text-[15px] px-4 py-2.5 border-b-[3px] -mb-[2px] cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? "text-[#1E5B3E] border-[#B8892B]"
                        : "text-[#6E665A] border-transparent hover:text-[#2B2925]"
                    }`}
                  >
                    <span>{t.label}</span>
                    {t.count > 0 && (
                      <span className="text-[13px] font-medium text-[#6E665A] tabular-nums">
                        {fmtInt(t.count)}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Conteúdo da Aba Ativa */}
            <div
              role="tabpanel"
              id={`panel-${abaAtiva}`}
              aria-labelledby={`tab-${abaAtiva}`}
            >
              {abaAtiva === "media" && (
                <MediaTab
                  dados={dados}
                  formatoHora={formatoHora}
                  baseMedia={baseMedia}
                  setBaseMedia={setBaseMedia}
                  ordemGrafico={ordemGrafico}
                  setOrdemGrafico={setOrdemGrafico}
                />
              )}

              {abaAtiva === "base" && (
                <BaseTab
                  people={dados.people}
                  sheetName={dados.names.base || "Base"}
                  formatoHora={formatoHora}
                />
              )}

              {abaAtiva === "cad" && dados.cad && (
                <Planilha1Tab
                  cad={dados.cad}
                  sheetName={dados.names.cad || "Planilha1"}
                />
              )}

              {abaAtiva === "exc" && dados.exc && (
                <ExcessoTab
                  exc={dados.exc}
                  sabados={dados.sabados}
                  folga={dados.folga}
                  sheetName={dados.names.exc || "Excesso de carga horária"}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
