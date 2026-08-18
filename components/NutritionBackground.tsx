'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface CalcKeyParticle {
  id: string;
  icon?: string;
  label: string;
  sub: string;
  type: 'brand' | 'animal' | 'nutrient' | 'operator' | 'feed';
  top: string;
  left?: string;
  right?: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  delay: number;
  duration: number;
  rotate: number;
  accent: 'brand_navy' | 'brand_green' | 'navy' | 'green' | 'amber' | 'cyan' | 'rose' | 'slate';
}

const KEYS_DATA: CalcKeyParticle[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // ── LEFT SIDE: TWO STAGGERED COLUMNS (OUTER & INNER) ───────────────────
  // ═══════════════════════════════════════════════════════════════════════

  // Left Column 1 (Outer: 1.5% – 7%)
  { id: 'cow', icon: '🐄', label: 'COW', sub: 'Dairy & Beef', type: 'animal', top: '3%', left: '2%', size: 'lg', delay: 0, duration: 13, rotate: -5, accent: 'green' },
  { id: 'cp', label: 'CP', sub: 'Protein %', type: 'nutrient', top: '16%', left: '3%', size: 'md', delay: 1.2, duration: 11, rotate: 4, accent: 'navy' },
  { id: 'buffalo', icon: '🐃', label: 'BUFFALO', sub: 'Nili-Ravi', type: 'animal', top: '29%', left: '1.5%', size: 'lg', delay: 2.5, duration: 14, rotate: -6, accent: 'navy' },
  { id: 'me', label: 'ME', sub: 'Energy Mcal', type: 'nutrient', top: '42%', left: '3.5%', size: 'md', delay: 0.7, duration: 12, rotate: 6, accent: 'amber' },
  { id: 'goat', icon: '🐐', label: 'GOAT', sub: 'Beetal/Teddy', type: 'animal', top: '55%', left: '2%', size: 'lg', delay: 3.0, duration: 15, rotate: -4, accent: 'green' },
  { id: 'ndf', label: 'NDF', sub: 'Fiber %', type: 'nutrient', top: '68%', left: '3.5%', size: 'md', delay: 1.8, duration: 11, rotate: 5, accent: 'green' },
  { id: 'dm', label: 'DM', sub: 'Dry Matter', type: 'nutrient', top: '81%', left: '1.5%', size: 'lg', delay: 2.1, duration: 13, rotate: -5, accent: 'cyan' },
  { id: 'berseem', icon: '🌿', label: 'BERSEEM', sub: 'Fresh Clover', type: 'feed', top: '93%', left: '3%', size: 'md', delay: 1.0, duration: 12, rotate: 4, accent: 'green' },

  // Left Column 2 (Inner: 9% – 18% — fills the inner corridor)
  { id: 'rumicalc', icon: '🧮', label: 'RumiCalc', sub: 'Ration & TMR', type: 'brand', top: '8%', left: '11%', size: 'xl', delay: 0.3, duration: 12, rotate: 3, accent: 'brand_navy' },
  { id: 'tdn', label: 'TDN', sub: 'Digestible', type: 'nutrient', top: '22%', left: '12%', size: 'sm', delay: 1.6, duration: 14, rotate: -5, accent: 'navy' },
  { id: 'corn', icon: '🌽', label: 'CORN', sub: 'Grain Starch', type: 'feed', top: '35%', left: '10.5%', size: 'md', delay: 2.8, duration: 13, rotate: 6, accent: 'amber' },
  { id: 'dmi', label: 'DMI', sub: 'Intake kg', type: 'nutrient', top: '48%', left: '12.5%', size: 'sm', delay: 0.9, duration: 12, rotate: -4, accent: 'cyan' },
  { id: 'wheat_bran', icon: '🌾', label: 'CHOKER', sub: 'Wheat Bran', type: 'feed', top: '61%', left: '11%', size: 'md', delay: 2.2, duration: 15, rotate: 5, accent: 'amber' },
  { id: 'rumi_feed', icon: '🌾', label: 'Rumi Feed', sub: 'NRC Formulation', type: 'brand', top: '74%', left: '10%', size: 'lg', delay: 2.4, duration: 14, rotate: -4, accent: 'brand_navy' },
  { id: 'lysine', label: 'LYSINE', sub: 'Amino Acid', type: 'nutrient', top: '87%', left: '12%', size: 'sm', delay: 1.5, duration: 13, rotate: 6, accent: 'rose' },

  // ═══════════════════════════════════════════════════════════════════════
  // ── RIGHT SIDE: TWO STAGGERED COLUMNS (INNER & OUTER) ──────────────────
  // ═══════════════════════════════════════════════════════════════════════

  // Right Column 1 (Inner: 9% – 18% — fills the inner corridor)
  { id: 'sabtain', icon: '🎙️', label: 'Sabtain Animal Talk', sub: 'Livestock Care', type: 'brand', top: '9%', right: '11%', size: 'xl', delay: 0.5, duration: 13, rotate: -4, accent: 'brand_green' },
  { id: 'fat', label: 'FAT', sub: 'Lipids %', type: 'nutrient', top: '23%', right: '12%', size: 'sm', delay: 1.1, duration: 12, rotate: 5, accent: 'amber' },
  { id: 'silage', icon: '🌽', label: 'SILAGE', sub: 'Maize Fodder', type: 'feed', top: '36%', right: '10.5%', size: 'md', delay: 2.6, duration: 14, rotate: -6, accent: 'green' },
  { id: 'starch', label: 'STARCH', sub: 'Carbs', type: 'nutrient', top: '49%', right: '12.5%', size: 'sm', delay: 1.3, duration: 11, rotate: 4, accent: 'amber' },
  { id: 'sat_urdu', icon: '🐄', label: 'Sabtain Animal Talk', sub: 'سبطین اینیمل ٹاک', type: 'brand', top: '62%', right: '10%', size: 'xl', delay: 1.7, duration: 15, rotate: -5, accent: 'brand_green' },
  { id: 'salt', icon: '🧂', label: 'MINERALS', sub: 'Premix & Salt', type: 'feed', top: '75%', right: '11.5%', size: 'md', delay: 2.9, duration: 13, rotate: 6, accent: 'cyan' },
  { id: 'rs', label: '₨/kg', sub: 'Least Cost', type: 'operator', top: '88%', right: '12%', size: 'md', delay: 1.4, duration: 12, rotate: -4, accent: 'green' },

  // Right Column 2 (Outer: 1.5% – 7%)
  { id: 'sheep', icon: '🐑', label: 'SHEEP', sub: 'Kajli/Meat', type: 'animal', top: '4%', right: '2%', size: 'lg', delay: 0.6, duration: 14, rotate: 6, accent: 'amber' },
  { id: 'ca', label: 'Ca', sub: 'Calcium', type: 'nutrient', top: '17%', right: '3.5%', size: 'md', delay: 2.0, duration: 12, rotate: -7, accent: 'rose' },
  { id: 'bull', icon: '🐂', label: 'BULL', sub: 'Fattening', type: 'animal', top: '30%', right: '1.5%', size: 'lg', delay: 1.5, duration: 15, rotate: 5, accent: 'navy' },
  { id: 'p', label: 'P', sub: 'Phosphorus', type: 'nutrient', top: '43%', right: '3.5%', size: 'sm', delay: 0.4, duration: 10, rotate: -5, accent: 'navy' },
  { id: 'forage', icon: '🌿', label: 'FORAGE', sub: 'Silage/Hay', type: 'feed', top: '56%', right: '2%', size: 'lg', delay: 2.7, duration: 13, rotate: 7, accent: 'green' },
  { id: 'ash', label: 'ASH', sub: 'Minerals', type: 'nutrient', top: '69%', right: '3.5%', size: 'sm', delay: 0.8, duration: 11, rotate: -6, accent: 'slate' },
  { id: 'wanda', icon: '⚙️', label: 'WANDA', sub: 'Concentrate', type: 'feed', top: '82%', right: '1.5%', size: 'lg', delay: 2.3, duration: 14, rotate: 6, accent: 'navy' },
  { id: 'adf', label: 'ADF', sub: 'Fiber %', type: 'nutrient', top: '94%', right: '3%', size: 'md', delay: 1.9, duration: 13, rotate: -5, accent: 'green' },
];

export function NutritionBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
      style={{
        backgroundColor: '#f8fafc',
      }}
    >
      {/* ── High-Tech Calculator Blueprint Grid ───────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #0e3b5e 1px, transparent 1px),
            linear-gradient(to bottom, #0e3b5e 1px, transparent 1px)
          `,
          backgroundSize: '44px 44px',
        }}
      />

      {/* ── Precision Mathematical Crosshairs / Dots Pattern ──────────────── */}
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: `radial-gradient(circle at center, #0e3b5e 1.5px, transparent 1.5px)`,
          backgroundSize: '22px 22px',
        }}
      />

      {/* ── Large Subtle Ambient Watermark Typography ──────────────────────── */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 opacity-[0.022] pointer-events-none font-mono">
        <div className="flex justify-between items-center text-3xl sm:text-5xl font-black uppercase tracking-widest text-[#0e3b5e]">
          <span>RumiCalc</span>
          <span>Sabtain Animal Talk</span>
        </div>
        <div className="flex justify-center text-4xl sm:text-7xl font-black uppercase tracking-[0.22em] text-[#0e3b5e]/60">
          Precision Livestock Nutrition
        </div>
        <div className="flex justify-between items-center text-2xl sm:text-4xl font-black uppercase tracking-widest text-[#558b2f]">
          <span>Dairy & Fattening TMR</span>
          <span>رومی کیلک</span>
        </div>
      </div>

      {/* ── Atmospheric Radial Glow Gradients ──────────────────────────────── */}
      <div className="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full bg-gradient-to-br from-[#0e3b5e]/12 via-[#0e3b5e]/4 to-transparent blur-3xl" />
      <div className="absolute -top-32 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-[#558b2f]/14 via-[#558b2f]/4 to-transparent blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-radial from-[#0e3b5e]/3 via-transparent to-transparent blur-2xl" />
      <div className="absolute -bottom-32 left-1/3 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-[#558b2f]/10 to-transparent blur-3xl" />

      {/* ── Floating Animated Calculator Keycaps ───────────────────────────── */}
      {mounted && (
        <div className="relative w-full h-full">
          {KEYS_DATA.map((k) => {
            const sizeClasses =
              k.size === 'xl'
                ? 'px-3.5 py-2 min-w-[94px]'
                : k.size === 'lg'
                  ? 'px-3 py-1.5 min-w-[80px]'
                  : k.size === 'md'
                    ? 'px-2.5 py-1.5 min-w-[66px]'
                    : 'px-2 py-1 min-w-[52px]';

            const fontClasses =
              k.size === 'xl'
                ? 'text-[13.5px]'
                : k.size === 'lg'
                  ? 'text-[12.5px]'
                  : k.size === 'md'
                    ? 'text-[11.5px]'
                    : 'text-[10px]';

            const accentClasses = {
              brand_navy: 'border-[#0e3b5e]/35 text-[#0e3b5e] bg-gradient-to-b from-white via-[#0e3b5e]/5 to-slate-100 shadow-[#0e3b5e]/15 ring-1 ring-[#0e3b5e]/15',
              brand_green: 'border-[#558b2f]/35 text-[#33691e] bg-gradient-to-b from-[#f4f8ee] via-[#558b2f]/10 to-white shadow-[#558b2f]/15 ring-1 ring-[#558b2f]/15',
              navy: 'border-[#0e3b5e]/25 text-[#0e3b5e] bg-gradient-to-b from-white/95 to-slate-50/90 hover:border-[#0e3b5e]',
              green: 'border-[#558b2f]/30 text-[#4d7c0f] bg-gradient-to-b from-[#f4f8ee]/95 to-white/90 hover:border-[#558b2f]',
              amber: 'border-amber-400/35 text-amber-800 bg-gradient-to-b from-amber-50/95 to-white/90 hover:border-amber-500',
              cyan: 'border-cyan-400/30 text-cyan-800 bg-gradient-to-b from-cyan-50/95 to-white/90 hover:border-cyan-500',
              rose: 'border-rose-300/35 text-rose-800 bg-gradient-to-b from-rose-50/95 to-white/90 hover:border-rose-500',
              slate: 'border-slate-300/40 text-slate-700 bg-gradient-to-b from-white/90 to-slate-100/90 hover:border-slate-400',
            }[k.accent];

            const indicatorColor = {
              brand_navy: 'bg-[#0e3b5e]',
              brand_green: 'bg-[#558b2f]',
              navy: 'bg-[#0e3b5e]',
              green: 'bg-[#558b2f]',
              amber: 'bg-amber-500',
              cyan: 'bg-cyan-500',
              rose: 'bg-rose-500',
              slate: 'bg-slate-400',
            }[k.accent];

            return (
              <motion.div
                key={k.id}
                initial={{
                  opacity: 0,
                  y: 20,
                  rotate: k.rotate,
                }}
                animate={{
                  opacity: [0.45, 0.85, 0.55, 0.9, 0.45],
                  y: [0, -20, -6, -26, 0],
                  x: [0, 6, -5, 6, 0],
                  rotate: [k.rotate, k.rotate + 3, k.rotate - 3, k.rotate + 1.5, k.rotate],
                }}
                transition={{
                  duration: k.duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: k.delay,
                }}
                style={{
                  position: 'absolute',
                  top: k.top,
                  left: k.left,
                  right: k.right,
                }}
                className={`
                  hidden md:flex flex-col items-center justify-center rounded-xl border
                  shadow-[0_5px_15px_rgba(14,59,94,0.06),0_1px_2px_rgba(14,59,94,0.08),inset_0_1px_0_rgba(255,255,255,0.95)]
                  backdrop-blur-sm transition-all duration-300 pointer-events-auto cursor-default
                  hover:scale-115 hover:opacity-100 hover:shadow-xl hover:z-30 group ${sizeClasses} ${accentClasses}
                `}
              >
                {/* Micro Key Indicator Header (LED dot + tag) */}
                <div className="w-full flex items-center justify-between gap-1 mb-0.5 opacity-70">
                  <span className={`w-1.5 h-1.5 rounded-full ${indicatorColor} shadow-xs group-hover:scale-125 transition-transform animate-pulse`} />
                  <span className="text-[6.5px] font-mono tracking-wider uppercase font-extrabold text-slate-400">
                    {k.type === 'brand' ? 'brand' : k.type === 'animal' ? 'animal' : k.type === 'feed' ? 'diet' : k.type === 'operator' ? 'calc' : 'nrc'}
                  </span>
                </div>

                {/* Key Cap Icon + Label */}
                <div className="flex items-center gap-1">
                  {k.icon && <span className="text-sm leading-none group-hover:scale-110 transition-transform">{k.icon}</span>}
                  <span className={`font-mono font-black tracking-tight leading-none ${fontClasses}`}>
                    {k.label}
                  </span>
                </div>

                {/* Key Cap Subtitle */}
                {k.sub && (
                  <span className="text-[7px] font-bold tracking-wider uppercase opacity-80 mt-0.5 whitespace-nowrap">
                    {k.sub}
                  </span>
                )}

                {/* 3D Keycap top surface highlight */}
                <div className="absolute inset-x-1 top-0.5 h-[1px] bg-white/90 rounded-full" />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
