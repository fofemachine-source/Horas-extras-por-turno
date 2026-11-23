// Navbar.tsx — Barra superior do app U&M Mineração e Construção / App Luis
import React from "react";

export const Navbar: React.FC = () => {
  return (
    <header className="w-full bg-[#0F4A33] text-white border-b-4 border-[#0A3A22] shadow-md">
      <div className="max-w-[1180px] mx-auto px-5 py-3 flex items-center gap-3.5">
        {/* Placa branca com logotipo U&M */}
        <div
          className="bg-white rounded-lg h-10 px-3 flex items-center justify-center font-bold text-[#0F4A33] text-xl tracking-tight shadow-xs select-none"
          title="U&M Mineração e Construção"
        >
          <span className="font-extrabold tracking-tighter">U&amp;M</span>
        </div>

        {/* Título do sistema e selo App Luis */}
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold text-white tracking-normal m-0 leading-tight">
              Horas extras por turno
            </h1>
            <span className="text-[11px] font-semibold tracking-[0.08em] text-[#CFE5D2] bg-white/12 border border-white/25 rounded-[6px] px-2 py-0.5 align-middle select-none">
              APP LUIS
            </span>
          </div>
          <small className="block text-[13px] text-[#CFE5D2] font-normal mt-0.5">
            U&amp;M Mineração e Construção
          </small>
        </div>
      </div>
    </header>
  );
};
