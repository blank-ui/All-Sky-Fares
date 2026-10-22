import React from "react";
import logoImg from "@/assets/logo.png";

export function Logo({ size = 38, showText = false, className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <img
        src={logoImg}
        alt="AllSkyFares"
        className="rounded-xl object-contain shadow-sm hover:scale-105 transition-transform duration-300"
        style={{
          width: size,
          height: size,
          aspectRatio: "1 / 1",
        }}
      />
      {showText && (
        <div className="flex flex-col text-left leading-none tracking-wider">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-800 dark:text-slate-100">
            ALL SKY
          </span>
          <span className="text-[13px] font-black uppercase tracking-[0.16em] bg-gradient-to-r from-sky-500 to-orange-500 bg-clip-text text-transparent">
            FARES
          </span>
        </div>
      )}
    </div>
  );
}

export default Logo;
