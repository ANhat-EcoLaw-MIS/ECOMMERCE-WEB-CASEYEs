import type { MarqueeCase } from './models/onboarding.model';

export const MARQUEE_ROWS = [
  {
    id: 'row-1',
    direction: 'left',
    cases: [
      {
        id: 'cyber-chrome',
        badge: 'HOLO CHROME',
        titleLines: ['CYBER', 'PUNK'],
        subtitle: 'Neo Tokyo • 01',
        footerLabel: 'CasEYE Lab',
        footerDetail: 'iPhone 16 Pro',
        styleKey: 'y2k',
        caseClass:
          'w-[210px] h-[350px] shrink-0 rounded-[36px] p-3 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition-all duration-500 bg-onboarding-carbon border border-white/20',
        artworkClass:
          'absolute inset-0 bg-gradient-to-br from-violet-600/40 via-fuchsia-500/20 to-cyan-500/30',
        cameraClass:
          'w-14 h-14 rounded-2xl backdrop-blur-md p-1.5 flex flex-col justify-between z-10 shadow-lg bg-onboarding-deep/85 border border-white/10',
        badgeClass:
          'px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[9px] font-mono tracking-widest text-white uppercase',
        titleClass:
          'text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-cyan-300 font-display leading-tight',
        subtitleClass: 'font-body text-base md:text-lg text-white/80 leading-relaxed',
        footerClass:
          'relative z-10 flex items-center justify-between text-[9px] text-white/80 px-2.5 py-1.5 bg-black/50 rounded-full backdrop-blur-md border border-white/10',
      },
      {
        id: 'acid-bolt',
        badge: 'HIGH VOLTAGE',
        titleLines: ['ACID', 'BOLT ⚡'],
        subtitle: 'Streetwear Series',
        footerLabel: 'Raw Studio',
        footerDetail: 'Galaxy S24',
        styleKey: 'grunge',
        caseClass:
          'w-[210px] h-[350px] shrink-0 rounded-[36px] p-3 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition-all duration-500 bg-sky-950 border border-cyan-400/30',
        artworkClass:
          'absolute inset-0 bg-gradient-to-b from-sky-400/40 via-blue-800/40 to-black',
        cameraClass:
          'w-14 h-14 rounded-2xl backdrop-blur-md p-1.5 flex flex-col justify-between z-10 shadow-lg bg-black/75 border border-sky-400/30',
        badgeClass:
          'px-2 py-0.5 rounded-full bg-sky-400/20 backdrop-blur-md text-[9px] font-mono tracking-widest text-sky-200 uppercase',
        titleClass:
          'text-2xl font-black tracking-tight text-sky-200 font-display leading-tight',
        subtitleClass: 'font-body text-base md:text-lg text-white/80 leading-relaxed',
        footerClass:
          'relative z-10 flex items-center justify-between text-[9px] text-sky-100 px-2.5 py-1.5 bg-black/60 rounded-full backdrop-blur-md border border-sky-400/20',
      },
      {
        id: 'pastel-clay',
        badge: 'DREAMSCAPE',
        titleLines: ['CLOUD', 'NINE 🌸'],
        subtitle: '3D Puffy Clay',
        footerLabel: 'Pastel Club',
        footerDetail: 'iPhone 15',
        styleKey: 'pastel',
        caseClass:
          'w-[210px] h-[350px] shrink-0 rounded-[36px] p-3 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition-all duration-500 bg-gradient-to-br from-rose-200 via-amber-100 to-pink-200 border border-white',
        artworkClass:
          'absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none -skew-x-12',
        cameraClass:
          'w-14 h-14 rounded-2xl backdrop-blur-md p-1.5 flex flex-col justify-between z-10 shadow-lg bg-white/80 border border-rose-200 shadow-md',
        badgeClass:
          'px-2 py-0.5 rounded-full bg-white/70 backdrop-blur-md text-[9px] font-mono tracking-widest text-rose-800 uppercase',
        titleClass:
          'text-2xl font-black tracking-tight text-rose-800 font-display leading-tight',
        subtitleClass: 'font-body text-base md:text-lg text-rose-900/80 leading-relaxed',
        footerClass:
          'relative z-10 flex items-center justify-between text-[9px] text-rose-900 px-2.5 py-1.5 bg-white/85 rounded-full shadow-sm border border-rose-200/80',
      },
      {
        id: 'lavender-flow',
        badge: 'SIGNATURE',
        titleLines: ['LAVENDER', 'FLOW ✨'],
        subtitle: 'Liquid Gradient',
        footerLabel: 'CasEYE Vibe',
        footerDetail: '15 Pro Max',
        styleKey: 'y2k',
        caseClass:
          'w-[210px] h-[350px] shrink-0 rounded-[36px] p-3 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition-all duration-500 bg-brand-900 border border-purple-400/40',
        artworkClass:
          'absolute inset-0 bg-gradient-to-b from-brand-600/60 via-brand-800 to-onboarding-deep',
        cameraClass:
          'w-14 h-14 rounded-2xl backdrop-blur-md p-1.5 flex flex-col justify-between z-10 shadow-lg bg-black/60 border border-purple-300/30',
        badgeClass:
          'px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[9px] font-mono tracking-widest text-brand-200 uppercase',
        titleClass: 'text-2xl font-black tracking-tight text-white font-display leading-tight',
        subtitleClass: 'font-body text-base md:text-lg text-white/80 leading-relaxed',
        footerClass:
          'relative z-10 flex items-center justify-between text-[9px] text-white/90 px-2.5 py-1.5 bg-white/15 rounded-full backdrop-blur-md border border-white/20',
      },
      {
        id: 'mint-opal',
        badge: 'MINERAL OPAL',
        titleLines: ['AURORA', 'MINT 🌿'],
        subtitle: 'Tactical Finish',
        footerLabel: 'Rugged Spec',
        footerDetail: 'Xiaomi 14',
        styleKey: 'gorpcore',
        caseClass:
          'w-[210px] h-[350px] shrink-0 rounded-[36px] p-3 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition-all duration-500 bg-gradient-to-tr from-emerald-100 via-teal-50 to-cyan-100 border border-teal-200',
        artworkClass:
          'absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none -skew-x-12',
        cameraClass:
          'w-14 h-14 rounded-2xl backdrop-blur-md p-1.5 flex flex-col justify-between z-10 shadow-lg bg-white/80 border border-teal-300 shadow-md',
        badgeClass:
          'px-2 py-0.5 rounded-full bg-teal-100 backdrop-blur-md text-[9px] font-mono tracking-widest text-teal-800 uppercase',
        titleClass:
          'text-2xl font-black tracking-tight text-teal-900 font-display leading-tight',
        subtitleClass: 'font-body text-base md:text-lg text-teal-900/80 leading-relaxed',
        footerClass:
          'relative z-10 flex items-center justify-between text-[9px] text-teal-900 px-2.5 py-1.5 bg-white/85 rounded-full shadow-sm border border-teal-200',
      },
      {
        id: 'minimal-typo',
        badge: 'SWISS GRID',
        titleLines: ['NO', 'RULES.'],
        subtitle: 'Typo Edition 01',
        footerLabel: 'Minimalist',
        footerDetail: 'Titan Grip',
        styleKey: 'minimal',
        caseClass:
          'w-[210px] h-[350px] shrink-0 rounded-[36px] p-3 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition-all duration-500 bg-zinc-950 border border-zinc-700/60',
        artworkClass:
          'absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none -skew-x-12',
        cameraClass:
          'w-14 h-14 rounded-2xl backdrop-blur-md p-1.5 flex flex-col justify-between z-10 shadow-lg bg-black border border-zinc-700 shadow-md',
        badgeClass:
          'px-2 py-0.5 rounded-full bg-zinc-800 backdrop-blur-md text-[9px] font-mono tracking-widest text-zinc-300 uppercase',
        titleClass:
          'text-2xl font-black font-mono tracking-wider text-zinc-100 uppercase leading-tight',
        subtitleClass: 'font-body text-base md:text-lg text-zinc-300 leading-relaxed',
        footerClass:
          'relative z-10 flex items-center justify-between text-[9px] text-zinc-300 px-2.5 py-1.5 bg-zinc-900 rounded-full border border-zinc-700/60',
      },
    ] satisfies readonly MarqueeCase[],
  },
  {
    id: 'row-2',
    direction: 'right',
    cases: [
      {
        id: 'neo-acid',
        badge: 'CYBER MECHA',
        titleLines: ['NEO', 'ACID ⚡'],
        subtitle: 'Series 02',
        footerLabel: 'Neo Tokyo',
        footerDetail: 'iPhone 16 Pro',
        styleKey: 'grunge',
        caseClass:
          'w-[210px] h-[350px] shrink-0 rounded-[36px] p-3 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition-all duration-500 bg-emerald-950 border border-lime-400/40',
        artworkClass: 'absolute inset-0 bg-gradient-to-t from-lime-500/20 via-black to-emerald-950/40',
        cameraClass:
          'w-14 h-14 rounded-2xl backdrop-blur-md p-1.5 flex flex-col justify-between z-10 shadow-lg bg-black/80 border border-lime-400/30',
        badgeClass:
          'px-2 py-0.5 rounded-full bg-lime-400/20 backdrop-blur-md text-[9px] font-mono tracking-widest text-lime-400 uppercase',
        titleClass: 'text-2xl font-black text-lime-400 font-display leading-tight',
        subtitleClass: 'font-body text-base md:text-lg text-white/80 leading-relaxed',
        footerClass:
          'relative z-10 flex items-center justify-between text-[9px] text-lime-200 px-2.5 py-1.5 bg-black/70 rounded-full backdrop-blur-md border border-lime-400/20',
      },
      {
        id: 'holo-glow',
        badge: 'RESIN FINISH',
        titleLines: ['HOLO', 'GLOW ✨'],
        subtitle: 'Prism Reflection',
        footerLabel: 'CasEYE Rare',
        footerDetail: 'iPhone 15 Pro',
        styleKey: 'y2k',
        caseClass:
          'w-[210px] h-[350px] shrink-0 rounded-[36px] p-3 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition-all duration-500 bg-gradient-to-b from-purple-200 via-indigo-100 to-pink-200 border border-white/80',
        artworkClass:
          'absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none -skew-x-12',
        cameraClass:
          'w-14 h-14 rounded-2xl backdrop-blur-md p-1.5 flex flex-col justify-between z-10 shadow-lg bg-white/80 border border-purple-200 shadow-md',
        badgeClass:
          'px-2 py-0.5 rounded-full bg-indigo-600/10 backdrop-blur-md text-[9px] font-mono tracking-widest text-indigo-900 uppercase font-semibold',
        titleClass: 'text-2xl font-black text-indigo-950 font-display leading-tight',
        subtitleClass: 'font-body text-base md:text-lg text-indigo-900/80 leading-relaxed',
        footerClass:
          'relative z-10 flex items-center justify-between text-[9px] text-indigo-900 px-2.5 py-1.5 bg-white/85 rounded-full border border-purple-200/80 shadow-sm',
      },
      {
        id: 'studio-mono',
        badge: 'ATELIER',
        titleLines: ['M.', ''],
        subtitle: 'STUDIO EDITION',
        footerLabel: 'Custom Name',
        footerDetail: 'Matte Silk',
        styleKey: 'minimal',
        caseClass:
          'w-[210px] h-[350px] shrink-0 rounded-[36px] p-3 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition-all duration-500 bg-stone-100 border border-stone-300',
        artworkClass:
          'absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none -skew-x-12',
        cameraClass:
          'w-14 h-14 rounded-2xl backdrop-blur-md p-1.5 flex flex-col justify-between z-10 shadow-lg bg-stone-200/90 border border-stone-300 shadow-md',
        badgeClass:
          'px-2 py-0.5 rounded-full bg-stone-200 backdrop-blur-md text-[9px] font-mono tracking-widest text-stone-700 uppercase',
        titleClass: 'text-3xl font-serif text-stone-900 leading-tight',
        subtitleClass: 'font-body text-base md:text-lg text-stone-800 leading-relaxed',
        footerClass:
          'relative z-10 flex items-center justify-between text-[9px] text-stone-800 px-2.5 py-1.5 bg-white/95 rounded-full shadow-sm border border-stone-300',
      },
      {
        id: 'retro-dusk',
        badge: 'SYNTHWAVE',
        titleLines: ['RETRO', 'DUSK 🪐'],
        subtitle: 'Sunset Horizon',
        footerLabel: 'Galaxy Ultra',
        footerDetail: 'S24 Series',
        styleKey: 'y2k',
        caseClass:
          'w-[210px] h-[350px] shrink-0 rounded-[36px] p-3 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition-all duration-500 bg-gradient-to-br from-amber-400 via-rose-500 to-indigo-700 border border-white/40',
        artworkClass:
          'absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none -skew-x-12',
        cameraClass:
          'w-14 h-14 rounded-2xl backdrop-blur-md p-1.5 flex flex-col justify-between z-10 shadow-lg bg-black/60 border border-white/20',
        badgeClass:
          'px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-md text-[9px] font-mono tracking-widest text-amber-200 uppercase',
        titleClass: 'text-2xl font-black text-white font-display leading-tight',
        subtitleClass: 'font-body text-base md:text-lg text-white/80 leading-relaxed',
        footerClass:
          'relative z-10 flex items-center justify-between text-[9px] text-white px-2.5 py-1.5 bg-black/50 rounded-full backdrop-blur-md border border-white/20',
      },
      {
        id: 'tactical-ops',
        badge: 'OUTDOOR HYBRID',
        titleLines: ['TACTICAL', 'OPS 🧭'],
        subtitle: 'CORDURA™ Armor',
        footerLabel: 'Armor Spec',
        footerDetail: 'Drop 4.5m',
        styleKey: 'gorpcore',
        caseClass:
          'w-[210px] h-[350px] shrink-0 rounded-[36px] p-3 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition-all duration-500 bg-onboarding-panel border border-emerald-900/50',
        artworkClass:
          'absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none -skew-x-12',
        cameraClass:
          'w-14 h-14 rounded-2xl backdrop-blur-md p-1.5 flex flex-col justify-between z-10 shadow-lg bg-black/80 border border-emerald-800 shadow-md',
        badgeClass:
          'px-2 py-0.5 rounded-full bg-emerald-950/80 backdrop-blur-md text-[9px] font-mono tracking-widest text-emerald-400 uppercase',
        titleClass:
          'text-2xl font-black font-mono text-emerald-400 tracking-wider leading-tight',
        subtitleClass: 'font-body text-base md:text-lg text-emerald-100/80 leading-relaxed',
        footerClass:
          'relative z-10 flex items-center justify-between text-[9px] text-emerald-200 px-2.5 py-1.5 bg-zinc-900 rounded-full border border-emerald-900/40',
      },
      {
        id: 'manga-pop-art',
        badge: 'HARAJUKU ART',
        titleLines: ['MANGA', 'DREAM 🎨'],
        subtitle: 'Halftone Screentone',
        footerLabel: 'CasEYE Pop',
        footerDetail: 'iPhone 15',
        styleKey: 'anime',
        caseClass:
          'w-[210px] h-[350px] shrink-0 rounded-[36px] p-3 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition-all duration-500 bg-gradient-to-tr from-pink-300 via-purple-300 to-indigo-300 border border-white/80',
        artworkClass:
          'absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none -skew-x-12',
        cameraClass:
          'w-14 h-14 rounded-2xl backdrop-blur-md p-1.5 flex flex-col justify-between z-10 shadow-lg bg-white/80 border border-pink-200 shadow-md',
        badgeClass:
          'px-2 py-0.5 rounded-full bg-white/70 backdrop-blur-md text-[9px] font-mono tracking-widest text-purple-900 uppercase font-semibold',
        titleClass: 'text-2xl font-black text-purple-900 font-display leading-tight',
        subtitleClass: 'font-body text-base md:text-lg text-purple-900/80 leading-relaxed',
        footerClass:
          'relative z-10 flex items-center justify-between text-[9px] text-purple-900 px-2.5 py-1.5 bg-white/85 rounded-full border border-pink-200 shadow-sm',
      },
    ] satisfies readonly MarqueeCase[],
  },
] as const;

export type MarqueeRow = (typeof MARQUEE_ROWS)[number];
