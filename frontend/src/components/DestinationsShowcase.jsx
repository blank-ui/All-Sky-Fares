import React, { useState } from "react";
import { ArrowRight, Star, Plane, MapPin, Compass, Shield, Clock, Heart, Sparkles } from "lucide-react";
import { DESTINATIONS } from "./HeroSlideshow";

const CATEGORIES = [
  { id: "all", label: "All Destinations" },
  { id: "beach", label: "Islands & Beaches" },
  { id: "alpine", label: "Mountain & Alpine" },
  { id: "cultural", label: "Cultural Wonders" }
];

const CURATED_TRIPS = [
  {
    title: "Amalfi Coast & Capri",
    country: "Italy",
    category: "beach",
    iata: "NAP",
    days: "7 Days",
    rating: "4.95",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80",
    tag: "Trending"
  },
  {
    title: "Kyoto & Arashiyama",
    country: "Japan",
    category: "cultural",
    iata: "KIX",
    days: "10 Days",
    rating: "4.98",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80",
    tag: "Cultural Classic"
  },
  {
    title: "Santorini & Oia Caldera",
    country: "Greece",
    category: "beach",
    iata: "JTR",
    days: "6 Days",
    rating: "4.92",
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80",
    tag: "Sunset Favorite"
  },
  {
    title: "Zermatt & Matterhorn",
    country: "Switzerland",
    category: "alpine",
    iata: "GVA",
    days: "5 Days",
    rating: "4.97",
    image: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=800&q=80",
    tag: "Alpine Bliss"
  },
  {
    title: "Banff & Glacial Valleys",
    country: "Canada",
    category: "alpine",
    iata: "YYC",
    days: "8 Days",
    rating: "4.94",
    image: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=800&q=80",
    tag: "Pure Wilderness"
  },
  {
    title: "Maldives Private Atolls",
    country: "Maldives",
    category: "beach",
    iata: "MLE",
    days: "6 Days",
    rating: "4.99",
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=800&q=80",
    tag: "Ultra Luxury"
  }
];

export function DestinationsShowcase({ onSelectRoute }) {
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = activeCategory === "all" 
    ? CURATED_TRIPS 
    : CURATED_TRIPS.filter(t => t.category === activeCategory);

  return (
    <section className="pt-14 pb-6 sm:pt-16 px-4 sm:px-8 max-w-7xl mx-auto relative z-10">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400 mb-2">
            <Sparkles size={15} />
            <span>CURATED TRAVEL PORTFOLIO</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium text-slate-900 dark:text-white leading-tight">
            Where will your next <em className="italic text-sky-500 font-normal">journey</em> begin?
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-xl text-base">
            Handpicked routes and flight connections negotiated directly with premier airline alliances.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="relative flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none md:flex-wrap md:overflow-visible lg:justify-end [mask-image:linear-gradient(to_right,black_82%,transparent)] md:[mask-image:none]">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md"
                  : "bg-slate-200/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Spatial Destination Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {filtered.map((trip, idx) => (
          <div
            key={idx}
            className="liquid-glass-card group flex flex-col cursor-pointer"
            onClick={() => onSelectRoute && onSelectRoute("LHR", trip.iata)}
          >
            {/* Card Image with Ambient Sheen */}
            <div className="relative h-64 overflow-hidden rounded-t-2xl">
              <img
                src={trip.image}
                alt={trip.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
              
              {/* Badge Tag */}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-800 dark:text-slate-100 shadow-sm border border-white/20">
                  {trip.tag}
                </span>
              </div>

              {/* IATA & Rating Pill */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/60 backdrop-blur-md text-white text-xs font-bold border border-white/10">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <span>{trip.rating}</span>
              </div>

              {/* Location Name Overlaid on Image Bottom */}
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="flex items-center gap-1 text-[11px] text-sky-300 font-semibold uppercase tracking-wider mb-0.5">
                  <MapPin size={12} />
                  <span>{trip.country} ({trip.iata})</span>
                </div>
                <h3 className="text-xl font-bold font-serif leading-tight text-white drop-shadow-[0_2px_6px_rgba(2,6,23,0.6)]">
                  {trip.title}
                </h3>
              </div>
            </div>

            {/* Card Content & Action Footer */}
            <div className="p-5 flex items-center justify-between mt-auto">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Live fares
                </span>
                <span className="text-base font-bold text-slate-900 dark:text-white">See today's prices</span>
              </div>

              <button
                type="button"
                className="w-10 h-10 rounded-full bg-sky-500/10 hover:bg-sky-500 text-sky-600 hover:text-white dark:text-sky-400 dark:hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm group-hover:translate-x-1"
                aria-label={`Find flights to ${trip.title}`}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="mt-16 liquid-glass rounded-3xl p-6 sm:p-10 border border-white/40 dark:border-white/10 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-500 shrink-0">
              <Shield size={24} />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">Price Transparency</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                The price you see includes airline taxes and our service fee. Airline fees for checked bags or seats are shown by the airline.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-400/30 flex items-center justify-center text-orange-500 shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">24/7 Human Flight Concierge</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                When weather shifts or flights reschedule, our experienced operations desk steps in immediately.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-500 shrink-0">
              <Compass size={24} />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">Global Airline Alliances</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Direct connections across Star Alliance, SkyTeam, Oneworld, and top low-cost carriers worldwide.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DestinationsShowcase;
