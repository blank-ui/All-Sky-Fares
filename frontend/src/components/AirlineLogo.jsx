import React, { useState, useEffect } from "react";
import { Plane } from "lucide-react";
import { getAirlineInfo } from "@/lib/airlineLogos";

export function AirlineLogo({
  booking,
  code,
  name,
  logo,
  size = 40,
  className = "",
  showBadge = true,
}) {
  const info = getAirlineInfo(booking || { code, airline: name, airline_logo: logo });
  const [imgSrc, setImgSrc] = useState(info.logo);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(info.logo);
    setHasError(false);
  }, [info.logo, info.code]);

  const handleError = () => {
    // Try secondary fallback if available
    if (imgSrc === info.logo && info.fallbackLogo && info.fallbackLogo !== info.logo) {
      setImgSrc(info.fallbackLogo);
    } else {
      setHasError(true);
    }
  };

  if (!imgSrc || hasError) {
    return (
      <div
        className={`rounded-2xl bg-gradient-to-br from-sky-500/15 via-blue-500/10 to-indigo-600/20 border border-sky-400/30 text-sky-700 dark:text-cyan-300 font-extrabold font-mono flex items-center justify-center shrink-0 shadow-xs ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(10, Math.floor(size * 0.34)),
        }}
        title={info.name || info.code}
      >
        {info.code && info.code !== "FL" ? (
          <span>{info.code.slice(0, 2)}</span>
        ) : (
          <Plane size={Math.floor(size * 0.45)} className="transform -rotate-45" />
        )}
      </div>
    );
  }

  const containerClasses = showBadge
    ? `rounded-2xl bg-white p-1.5 border border-slate-200/90 dark:border-white/10 shadow-xs flex items-center justify-center shrink-0 overflow-hidden ${className}`
    : `flex items-center justify-center shrink-0 overflow-hidden ${className}`;

  return (
    <div
      className={containerClasses}
      style={{ width: size, height: size }}
      title={info.name || info.code}
    >
      <img
        src={imgSrc}
        alt={info.name || info.code}
        className="w-full h-full object-contain"
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
}

export default AirlineLogo;
