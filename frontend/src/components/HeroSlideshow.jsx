import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, MapPin, Sparkles, Plane, Compass } from "lucide-react";

export const DESTINATIONS = [
  {
    id: "amalfi",
    name: "Amalfi Coast",
    country: "Italy",
    airport: "NAP",
    airportName: "Naples International",
    tagline: "Mediterranean Coastal Horizons",
    description: "Pastel cliffside villages hanging over cerulean seas and lemon groves.",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1920&q=85",
    color: "#0284c7",
    suggestedOrigin: "LHR",
  },
  {
    id: "santorini",
    name: "Santorini",
    country: "Greece",
    airport: "JTR",
    airportName: "Santorini Thira Airport",
    tagline: "Sun-Drenched Aegean Caldera",
    description: "Whitewashed domes, dramatic volcanic cliffs, and legendary golden sunsets.",
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1920&q=85",
    color: "#0369a1",
    suggestedOrigin: "LHR",
  },
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    airport: "KIX",
    airportName: "Kansai International",
    tagline: "Imperial Temples & Bamboo Groves",
    description: "Quiet Zen gardens, thousand-year shrines, and ethereal misty mountain trails.",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1920&q=85",
    color: "#ea580c",
    suggestedOrigin: "JFK",
  },
  {
    id: "swiss-alps",
    name: "Zermatt & Swiss Alps",
    country: "Switzerland",
    airport: "GVA",
    airportName: "Geneva International",
    tagline: "Towering Alpine Majestic Peaks",
    description: "Crisp mountain air, pristine powder glaciers, and scenic glass-roof rail journeys.",
    image: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=1920&q=85",
    color: "#38bdf8",
    suggestedOrigin: "LHR",
  },
  {
    id: "maldives",
    name: "Malé & Atolls",
    country: "Maldives",
    airport: "MLE",
    airportName: "Velana International",
    tagline: "Azure Overwater Island Escapes",
    description: "Endless crystal lagoons, private overwater villas, and bioluminescent bays.",
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1920&q=85",
    color: "#0ea5e9",
    suggestedOrigin: "DXB",
  },
  {
    id: "banff",
    name: "Banff & Lake Louise",
    country: "Canada",
    airport: "YYC",
    airportName: "Calgary International",
    tagline: "Turquoise Glacial Wilderness",
    description: "Deep pine valleys framed by rugged Rocky Mountain spires and silent lakes.",
    image: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1920&q=85",
    color: "#0284c7",
    suggestedOrigin: "JFK",
  },
  {
    id: "bali",
    name: "Bali",
    country: "Indonesia",
    airport: "DPS",
    airportName: "Ngurah Rai International",
    tagline: "Lush Emerald Forest Terraces",
    description: "Spiritual cliffside temples, sacred waterfalls, and world-renowned surf breaks.",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1920&q=85",
    color: "#f97316",
    suggestedOrigin: "SIN",
  }
];

// Unsplash resizes on request; phones get a phone-sized photo instead of the 1920px original.
const HERO_WIDTHS = [480, 750, 1080, 1600, 2200];
// Large sizes sit under dark overlays, so lower quality isn't visible there. index.html builds the same URLs.
const heroSrc = (url, w) => url.replace(/w=\d+&q=\d+/, `w=${w}&q=${w > 1080 ? 40 : 55}`);
const heroSrcSet = (url) => HERO_WIDTHS.map((w) => `${heroSrc(url, w)} ${w}w`).join(", ");

export function HeroSlideshow({ activeIndex: controlledIndex, onChangeIndex: controlledOnChange, onSelectRoute }) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const activeIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;
  const onChangeIndex = controlledOnChange || setInternalIndex;
  const current = DESTINATIONS[activeIndex] || DESTINATIONS[0];
  // Slides already shown stay mounted, so going back doesn't fetch the photo again.
  const [seen, setSeen] = useState(() => new Set([0]));
  // Fetch the next photo only after the first screen has loaded, so it doesn't compete with it.
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWarm(true), 2500);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    setSeen((prev) => (prev.has(activeIndex) ? prev : new Set(prev).add(activeIndex)));
  }, [activeIndex]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      onChangeIndex((prev) => (prev + 1) % DESTINATIONS.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [isPaused, onChangeIndex]);

  const prev = () => {
    onChangeIndex((prev) => (prev - 1 + DESTINATIONS.length) % DESTINATIONS.length);
  };

  const next = () => {
    onChangeIndex((prev) => (prev + 1) % DESTINATIONS.length);
  };

  return (
    <div 
      className="absolute inset-0 overflow-hidden select-none pointer-events-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background slide images with Ken Burns zoom animation */}
      {DESTINATIONS.map((dest, idx) => {
        const isActive = idx === activeIndex;
        // Only the photo on screen and the next one are downloaded; the rest load as the slideshow reaches them.
        if (!isActive && !seen.has(idx) && !(warm && idx === (activeIndex + 1) % DESTINATIONS.length)) return null;
        return (
          <div
            key={dest.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? "opacity-100 z-0" : "opacity-0 -z-10"
            }`}
          >
            <img
              src={heroSrc(dest.image, 1600)}
              srcSet={heroSrcSet(dest.image)}
              sizes="100vw"
              alt=""
              decoding="async"
              fetchPriority={idx === 0 ? "high" : "low"}
              className={`w-full h-full object-cover object-center transition-transform duration-[7000ms] ease-out ${
                isActive ? "scale-105" : "scale-100"
              }`}
            />
            {/* Ambient spatial gradient overlays tailored for maximum text legibility across all photography */}
            {/* Light enough to see the destination; darkest at the bottom where the search card sits.
                The headline carries its own text shadow, so it stays readable over bright photos. */}
            <div className="absolute inset-0 bg-slate-950/25 dark:bg-slate-950/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-slate-950/50 opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 via-transparent to-slate-950/30" />
            <div className="absolute inset-0 bg-radial-vignette opacity-40" />
          </div>
        );
      })}

      {/* Interactive Controls & Destination Indicators (Bottom-Right / Floating Dock) */}
      <div className="pointer-events-auto absolute top-24 right-6 xl:right-12 z-20 hidden lg:flex items-center gap-2">
        <button
          onClick={prev}
          aria-label="Previous destination"
          className="w-9 h-9 rounded-full liquid-glass-btn flex items-center justify-center text-white/80 hover:text-white transition-all shadow-lg active:scale-90"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass-pill backdrop-blur-lg">
          {DESTINATIONS.map((dest, i) => (
            <button
              key={dest.id}
              onClick={() => onChangeIndex(i)}
              aria-label={`Jump to ${dest.name}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex 
                  ? "w-6 bg-gradient-to-r from-sky-400 to-orange-400" 
                  : "w-1.5 bg-white/40 hover:bg-white/80"
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          aria-label="Next destination"
          className="w-9 h-9 rounded-full liquid-glass-btn flex items-center justify-center text-white/80 hover:text-white transition-all shadow-lg active:scale-90"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

/** "Explore now" pill for the current slide; sits in the hero content so it never covers the headline. */
export function DestinationTag({ index, onSelectRoute }) {
  const current = DESTINATIONS[index] || DESTINATIONS[0];
  return (
    <div className="flex w-full max-w-[22rem] sm:max-w-[30rem] items-center gap-3 rounded-full border border-white/20 bg-slate-950/45 py-1.5 pl-1.5 pr-1.5 text-left text-white shadow-xl backdrop-blur-md" data-testid="explore-now">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
        <Compass size={16} className="animate-spin-slow text-sky-200" />
      </span>
      <span className="min-w-0 flex-1 truncate text-xs sm:text-sm">
        <span className="hidden sm:inline font-bold uppercase tracking-wider text-sky-200">Explore now</span>
        <span className="hidden sm:inline mx-1.5 text-white/40">·</span>
        <span className="font-semibold text-white">{current.name}, {current.country}</span>
        <span className="ml-1 hidden min-[400px]:inline font-mono text-white/70">({current.airport})</span>
      </span>
      {onSelectRoute && (
        <button
          onClick={() => onSelectRoute(current.suggestedOrigin, current.airport)}
          className="flex shrink-0 items-center gap-1 rounded-full bg-orange-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-md transition hover:bg-orange-600 active:scale-95"
          title={`Find flights to ${current.name}`}
        >
          <Plane size={12} />
          <span className="text-white">See fares</span>
        </button>
      )}
    </div>
  );
}

export default HeroSlideshow;
