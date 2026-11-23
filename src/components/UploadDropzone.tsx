// UploadDropzone.tsx — Tela de envio da planilha de ponto
import React, { useRef, useState } from "react";
import { FileSpreadsheet, Upload, AlertCircle, Sparkles } from "lucide-react";

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  onLoadDemo: () => void;
  errorMessage: string | null;
  isLoading: boolean;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFileSelect,
  onLoadDemo,
  errorMessage,
  isLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileSelect(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      e.target.value = ""; // Permite escolher o mesmo arquivo de novo
      onFileSelect(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-6 text-center">
      {/* Área de arrastar e clicar */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label="Área para enviar planilha de ponto"
        className={`relative transition-colors duration-200 cursor-pointer rounded-[10px] p-14 border-2 border-dashed ${
          isDragging
            ? "bg-[#E6F0E7] border-[#1E5B3E]"
            : "bg-[rgba(248,242,228,0.92)] border-[#D9B45A] hover:bg-[#F5ECE0]"
        } shadow-sm focus:outline-none`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .xlsm"
          className="hidden"
          onChange={handleInputChange}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-full bg-[#E6F0E7] text-[#1E5B3E] flex items-center justify-center mb-1 shadow-inner">
            <Upload className="w-8 h-8 animate-pulse" />
          </div>

          <h2 className="font-condensed text-[26px] font-bold text-[#2B2925] tracking-tight">
            {isLoading
              ? "Processando planilha..."
              : "Arraste a planilha aqui ou clique para escolher"}
          </h2>

          <p className="text-[15px] text-[#6E665A] max-w-lg leading-relaxed">
            Formato esperado: o relatório de total de horas com as abas{" "}
            <span className="font-semibold text-[#2B2925]">Base</span>,{" "}
            <span className="font-semibold text-[#2B2925]">Média</span>,{" "}
            <span className="font-semibold text-[#2B2925]">Planilha1</span> e{" "}
            <span className="font-semibold text-[#2B2925]">Excesso de carga horária</span>.
          </p>

          <p className="text-[13px] text-[#6E665A]/90 mt-2 bg-white/60 px-3 py-1.5 rounded-md border border-[#E2D5B8]">
            🔒 O arquivo é lido no seu navegador. Nenhum dado é enviado para servidor.
          </p>

          <span className="text-[12px] text-[#6E665A] tracking-wider uppercase font-medium">
            Formatos aceitos: .xlsx, .xls, .xlsm
          </span>
        </div>
      </div>

      {/* Erro de leitura */}
      {errorMessage && (
        <div
          role="alert"
          className="mt-4 p-4 rounded-[8px] bg-red-50 border border-[#B23A30]/30 text-[#B23A30] text-sm text-left flex items-start gap-2.5 animate-fadeIn"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block">Erro ao ler o arquivo:</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Botão de dados de exemplo */}
      <div className="mt-8 pt-6 border-t border-[#E2D5B8]/60 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onLoadDemo}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[7px] text-[15px] font-semibold text-[#1E5B3E] border-[1.5px] border-[#1E5B3E] hover:bg-[#1E5B3E]/10 transition-colors cursor-pointer active:scale-[0.99]"
        >
          <Sparkles className="w-4 h-4 text-[#B8892B]" />
          Ver prévia com dados de exemplo
        </button>
        <span className="text-[13px] text-[#6E665A]">
          Nomes e números fictícios, só para conhecer o painel.
        </span>
      </div>
    </div>
  );
};
