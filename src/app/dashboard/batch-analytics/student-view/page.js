'use client';
import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Award, BarChart3, TrendingUp, BookOpen, Code, AlertTriangle,
  Target, Star, Trophy, ArrowUp, ArrowDown, Shield, CheckCircle2, Clock,
  Zap, AlertCircle, FileText, Mail, PhoneCall, Calendar, Timer, Layers,
  Activity, Siren, EyeOff, WifiOff, Users, PieChart, LineChart,
  ChevronRight, Lightbulb, Rocket, Medal, Gem, Crosshair, Route, Brain,
  Info, Flame, Table2, XCircle
} from 'lucide-react';
import useSWR from 'swr';
import { API_CONFIG } from '@/utils/api';
import { swrFetcher } from '@/utils/fetcher';

const C = { mcq: '#1e8e3e', mcqLight: '#34d853', coding: '#1a73e8', codingLight: '#4b8ff5', orange: '#f9ab00', orangeLight: '#fbc94a', blue: '#1a73e8', purple: '#8b5cf6', pink: '#ec4899', red: '#d93025', yellow: '#f9ab00', gray: '#5f6368' };
const CHART_PALETTE = ['#1e8e3e', '#1a73e8', '#f9ab00', '#8b5cf6', '#d93025', '#f9ab00', '#1a73e8', '#ec4899'];

const isPractice = (sub) => sub?.sub_type !== 'exam';

function AnimatedNumber({ value, duration = 1200, suffix = '', prefix = '' }) {
  const [d, setD] = useState(0); const r = useRef(null);
  useEffect(() => {
    const e = Number(value) || 0; const s = performance.now();
    const a = (n) => { const p = Math.min((n - s) / duration, 1); setD(Math.round(e * (1 - Math.pow(1 - p, 3)))); if (p < 1) r.current = requestAnimationFrame(a) };
    r.current = requestAnimationFrame(a); return () => r.current && cancelAnimationFrame(r.current);
  }, [value, duration]);
  return <>{prefix}{d}{suffix}</>;
}

function GlassCard({ children, className = '', onClick }) {
  return (
    <div onClick={onClick} className={`relative overflow-hidden rounded-2xl bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700/50 shadow-sm dark:shadow-none ${onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 active:scale-[0.995]' : ''} transition-all duration-300 ${className}`}>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Sparkline({ data = [], color = C.mcq, width = 80, height = 24 }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  return <svg width={width} height={height} className="inline-block"><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" /></svg>;
}

function SummaryCard({ title, value, subtitle, icon, accentColor, sparkData, calcDesc }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium dark:text-gray-400 font-bold uppercase tracking-wider">{title}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-white leading-none">{value}</div>
          {subtitle && <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium dark:text-gray-400 mt-1">{subtitle}</div>}
        </div>
        {sparkData?.length >= 2 && <Sparkline data={sparkData} color={accentColor} width={70} height={28} />}
      </div>
      {calcDesc && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/30">
          <div className="flex items-start gap-1">
            <Info className="text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" size={10} />
            <span className="text-[9px] text-gray-400 dark:text-gray-400 leading-tight">{calcDesc}</span>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function StrengthItem({ rank, name, percentage, color, type }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all">
      <span className="w-7 h-7 flex items-center justify-center rounded-full text-[11px] font-bold shrink-0" style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}25` }}>{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-gray-900 dark:text-white truncate">{name}</div>
        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium dark:text-gray-400 truncate">{type}</div>
      </div>
      <div className="text-right shrink-0">
        <span className="text-[13px] font-bold" style={{ color }}>{percentage}%</span>
        <div className="w-16 h-1 bg-gray-200 dark:bg-gray-600/30 rounded-full mt-1 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${percentage}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

function HeatmapTile({ name, pct, unitShort }) {
  const bg = pct >= 80 ? 'bg-green-500/20 border-green-500/30 text-green-800 dark:text-green-300' : pct >= 60 ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300' : pct >= 40 ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-800 dark:text-yellow-300' : pct > 0 ? 'bg-red-500/20 border-red-500/30 text-red-800 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600/30 text-gray-500 dark:text-gray-500';
  return (
    <div className={`rounded-xl p-2.5 border text-center backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-default ${bg}`} title={`${name} — ${pct}%`}>
      <span className="text-[8px] font-bold uppercase tracking-wider opacity-70">{unitShort}</span>
      <div className="text-base font-extrabold">{pct}%</div>
      <span className="text-[8px] opacity-60 truncate block max-w-[80px]">{name}</span>
    </div>
  );
}

function PulseDot({ color, size = 7 }) {
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size * 2.5, height: size * 2.5 }}>
      <span className="absolute inline-flex rounded-full opacity-35 animate-ping" style={{ width: size * 2, height: size * 2, backgroundColor: color }} />
      <span className="relative inline-flex rounded-full" style={{ width: size, height: size, backgroundColor: color }} />
    </span>
  );
}

/* ═══ GRADE HELPER ═══ */
const GRADE = (pct) => {
  if (pct >= 90) return { letter: 'A+', color: 'text-emerald-600', bg: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/40', glow: 'shadow-emerald-500/20', desc: 'Outstanding!' };
  if (pct >= 80) return { letter: 'A', color: 'text-emerald-600', bg: 'from-emerald-500/15 to-emerald-600/5', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/15', desc: 'Excellent!' };
  if (pct >= 70) return { letter: 'B', color: 'text-blue-600', bg: 'from-blue-500/15 to-blue-600/5', border: 'border-blue-500/30', glow: 'shadow-blue-500/15', desc: 'Good Job!' };
  if (pct >= 60) return { letter: 'C', color: 'text-yellow-600', bg: 'from-yellow-500/15 to-yellow-600/5', border: 'border-yellow-500/30', glow: 'shadow-yellow-500/15', desc: 'Fair' };
  if (pct >= 40) return { letter: 'D', color: 'text-orange-600', bg: 'from-orange-500/15 to-orange-600/5', border: 'border-orange-500/30', glow: 'shadow-orange-500/15', desc: 'Needs Work' };
  return { letter: 'F', color: 'text-red-600', bg: 'from-red-500/15 to-red-600/5', border: 'border-red-500/30', glow: 'shadow-red-500/15', desc: 'Keep Trying' };
};

const GRADE_CRITERIA = [
  { range: '\u2013', letter: 'A+', color: '#10b981' },
  { range: '80\u201389%', letter: 'A', color: '#10b981' },
  { range: '70\u201379%', letter: 'B', color: '#3b82f6' },
  { range: '60\u201369%', letter: 'C', color: '#eab308' },
  { range: '40\u201359%', letter: 'D', color: '#f97316' },
  { range: '0\u201339%', letter: 'F', color: '#ef4444' },
];

/* ═══ CONCENTRIC RINGS ═══ */
function ConcentricRings({ overall = 0, mcq = 0, coding = 0, size = 200 }) {
  const cx = size / 2, cy = size / 2;
  const rings = [
    { val: overall, color: C.orange, r: size / 2 - 15, label: 'Overall', w: 9 },
    { val: mcq, color: C.mcq, r: size / 2 - 32, label: 'MCQ', w: 9 },
    { val: coding, color: C.coding, r: size / 2 - 49, label: 'Coding', w: 9 }
  ];
  const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t) }, [overall, mcq, coding]);
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size}>
        {rings.map((ring, i) => {
          const circ = 2 * Math.PI * ring.r;
          const offset = circ - ((anim ? ring.val : 0) / 100) * circ;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={ring.r} fill="none" stroke="#e5e7eb" strokeWidth={ring.w} opacity="0.25" />
              <circle cx={cx} cy={cy} r={ring.r} fill="none" stroke={ring.color} strokeWidth={ring.w} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 3px ${ring.color}44)` }} />
            </g>
          );
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" fill="#374151" fontSize="16" fontWeight="800">{overall}%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#9ca3af" fontSize="8">OVERALL</text>
      </svg>
      <div className="flex gap-4">
        {rings.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium dark:text-gray-400">{r.label}: {r.val}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ SKILL MATRIX ═══ */
function SkillMatrix({ units }) {
  if (!units?.length) return null;
  return (
    <div className="space-y-2.5">
      {units.map((u, i) => (
        <div key={u.id} className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-orange-500 w-14 shrink-0 truncate">U{i + 1}</span>
          <div className="flex-1 flex gap-0.5">
            {u.subUnits.map(s => {
              const p = s.overallPct;
              const bg = p >= 80 ? 'bg-green-500' : p >= 60 ? 'bg-green-500/60' : p >= 40 ? 'bg-yellow-500/60' : p > 0 ? 'bg-red-500/60' : 'bg-gray-200';
              return (
                <div key={s.id} className={`h-5 rounded flex-1 ${bg} transition-all hover:scale-y-125 cursor-default relative group min-w-[6px]`} title={`${s.name}: ${p}%`}>
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-gray-800 border border-gray-600 rounded text-[8px] text-white whitespace-nowrap z-20 shadow-lg">{s.name}: {p}%</div>
                </div>
              );
            })}
          </div>
          <span className="text-[11px] font-bold text-gray-700 w-9 text-right">{u.overallPct}%</span>
        </div>
      ))}
    </div>
  );
}

/* ═══ ACHIEVEMENTS ═══ */
function AchievementBadges({ data }) {
  const badges = useMemo(() => {
    if (!data) return [];
    const { overall, units } = data;
    const b = [];
    b.push({ icon: <Award size={16} />, title: 'Completionist', desc: overall.completion >= 100 ? 'All done!' : `${overall.completion}% done`, color: C.yellow, unlocked: overall.completion >= 100 });
    b.push({ icon: <Gem size={16} />, title: 'High Achiever', desc: overall.overallPct >= 80 ? '80%+ overall!' : 'Need 80%+', color: C.mcq, unlocked: overall.overallPct >= 80 });
    b.push({ icon: <Medal size={16} />, title: 'MCQ Master', desc: overall.mcqPct >= 90 ? '90%+ MCQs!' : 'Need 90%+', color: '#f59e0b', unlocked: overall.mcqPct >= 90 });
    b.push({ icon: <Code size={16} />, title: 'Code Wizard', desc: overall.codPct >= 90 ? '90%+ Coding!' : 'Need 90%+', color: C.coding, unlocked: overall.codPct >= 90 });
    const perf = units.some(u => u.overallPct >= 95);
    b.push({ icon: <Star size={16} />, title: 'Perfectionist', desc: perf ? 'Perfect unit!' : 'Need 95%+', color: C.purple, unlocked: perf });
    const cons = units.filter(u => u.subUnits.length > 0).every(u => u.overallPct >= 50);
    b.push({ icon: <Shield size={16} />, title: 'Consistent', desc: cons ? 'All 50%+' : 'Need 50%+ all', color: C.blue, unlocked: cons });
    b.push({ icon: <Rocket size={16} />, title: 'Warrior', desc: overall.completed >= 10 ? '10+ tests!' : `${overall.completed}/10`, color: C.pink, unlocked: overall.completed >= 10 });
    const bal = Math.abs(overall.mcqPct - overall.codPct) <= 15 && overall.mcqPct > 0;
    b.push({ icon: <Crosshair size={16} />, title: 'Balanced', desc: bal ? 'MCQ\u2248Coding!' : 'Balance scores', color: C.orangeLight, unlocked: bal });
    return b;
  }, [data]);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {badges.map((b, i) => (
        <div key={i} className={`relative p-3 rounded-xl border text-center transition-all duration-300 ${
          b.unlocked
            ? 'bg-gradient-to-br from-gray-50 dark:from-gray-700/50 to-white dark:to-gray-800/50 border-gray-200 dark:border-gray-600/30 hover:shadow-md'
            : 'bg-gray-50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-700/30 opacity-40 grayscale'
        }`}>
          {b.unlocked && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 border-2 border-white dark:border-gray-900 shadow-sm" />}
          <div className={`mb-1 flex justify-center ${b.unlocked ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>{b.icon}</div>
          <div className={`text-[10px] font-bold ${b.unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-500'}`}>{b.title}</div>
          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{b.desc}</div>
        </div>
      ))}
    </div>
  );
}

/* ═══ AI INSIGHTS ═══ */
function AIInsights({ data }) {
  const insights = useMemo(() => {
    if (!data) return [];
    const tips = [];
    const { overall, units, strengths, weaknesses } = data;
    if (overall.completed === 0) return [{ icon: <BookOpen size={16} className="text-blue-500" />, type: 'info', title: 'Getting Started', text: 'Begin by attempting practice tests. Your analytics will populate as you progress.' }];
    if (overall.overallPct >= 80) tips.push({ icon: <Trophy size={16} className="text-yellow-500" />, type: 'success', title: 'Top Performance', text: `Maintaining ${overall.overallPct}% overall demonstrates strong command across topics. Continue this trajectory.` });
    else if (overall.overallPct >= 60) tips.push({ icon: <TrendingUp size={16} className="text-blue-500" />, type: 'info', title: 'Solid Foundation', text: `At ${overall.overallPct}%, you have a solid base. Targeted practice on weaker areas can push you above 80%.` });
    else if (overall.overallPct > 0) tips.push({ icon: <AlertTriangle size={16} className="text-orange-500" />, type: 'warn', title: 'Improvement Needed', text: `Current score of ${overall.overallPct}% indicates gaps in foundational concepts. Prioritize reviewing materials before re-attempting.` });
    const gap = Math.abs(overall.mcqPct - overall.codPct);
    if (gap > 25) {
      const w = overall.mcqPct > overall.codPct ? 'Coding' : 'MCQ';
      tips.push({ icon: <Crosshair size={16} className="text-purple-500" />, type: 'warn', title: 'Skill Imbalance Detected', text: `${gap}% disparity between MCQ and Coding performance. Allocate additional practice time to ${w} to achieve balanced proficiency.` });
    } else if (gap <= 10 && overall.mcqPct > 0) tips.push({ icon: <Shield size={16} className="text-emerald-500" />, type: 'success', title: 'Balanced Skills', text: `MCQ (${overall.mcqPct}%) and Coding (${overall.codPct}%) scores are well-balanced, indicating comprehensive understanding.` });
    const sorted = [...units].filter(u => u.subUnits.length > 0).sort((a, b) => b.overallPct - a.overallPct);
    if (sorted.length >= 2) tips.push({ icon: <Star size={16} className={`${sorted[0].overallPct >= sorted[sorted.length - 1].overallPct ? 'text-yellow-500' : 'text-blue-500'}`} />, type: 'info', title: 'Best vs Worst Unit', text: `"${sorted[0].name}" (${sorted[0].overallPct}%) vs "${sorted[sorted.length - 1].name}" (${sorted[sorted.length - 1].overallPct}%). ${sorted[0].overallPct - sorted[sorted.length - 1].overallPct > 30 ? 'Large gap\u2014focus on the weaker unit.' : 'Relatively balanced across units.'}` });
    if (strengths.length) tips.push({ icon: <Award size={16} className="text-emerald-500" />, type: 'success', title: 'Area of Strength', text: `"${strengths[0].name}" at ${strengths[0].pct}% is your strongest topic. Keep it up!` });
    if (weaknesses.length && weaknesses[0].pct > 0) tips.push({ icon: <AlertTriangle size={16} className="text-red-500" />, type: 'warn', title: 'Area for Improvement', text: `"${weaknesses[0].name}" at ${weaknesses[0].pct}% needs attention. Consider reviewing materials and re-attempting.` });
    return tips;
  }, [data]);
  const typeStyles = { info: 'border-blue-500/20 bg-blue-500/8', success: 'border-emerald-500/20 bg-emerald-500/8', warn: 'border-amber-500/20 bg-amber-500/8' };
  if (!insights.length) return null;
  return (
    <div className="space-y-2.5">
      {insights.map((tip, i) => (
        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${typeStyles[tip.type] || typeStyles.info}`}>
          <div className="shrink-0 mt-0.5">{tip.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-gray-800">{tip.title}</div>
            <div className="text-[11px] text-gray-600 leading-relaxed mt-0.5">{tip.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══ IMPROVEMENT VELOCITY ═══ */
function ImprovementVelocity({ data }) {
  const analysis = useMemo(() => {
    if (!data) return null;
    const tv = []; let totM = 0, mC = 0, totCo = 0, coC = 0;
    data.units.forEach(u => u.subUnits.forEach(s => {
      if (s.mcqAttempts?.length >= 2) {
        const sorted = [...s.mcqAttempts].sort((a, b) => a.attempt - b.attempt);
        const vel = Math.round((sorted[sorted.length - 1].percentage - sorted[0].percentage) / (sorted.length - 1) * 10) / 10;
        totM += vel; mC++;
        tv.push({ name: s.name, unit: u.short, type: 'MCQ', first: sorted[0].percentage, last: sorted[sorted.length - 1].percentage, attempts: sorted.length, velocity: vel, color: C.mcq });
      }
      if (s.codAttempts?.length >= 2) {
        const sorted = [...s.codAttempts].sort((a, b) => a.attempt - b.attempt);
        const vel = Math.round((sorted[sorted.length - 1].percentage - sorted[0].percentage) / (sorted.length - 1) * 10) / 10;
        totCo += vel; coC++;
        tv.push({ name: s.name, unit: u.short, type: 'Coding', first: sorted[0].percentage, last: sorted[sorted.length - 1].percentage, attempts: sorted.length, velocity: vel, color: C.coding });
      }
    }));
    return {
      tv, avgM: mC ? Math.round(totM / mC * 10) / 10 : 0, avgC: coC ? Math.round(totCo / coC * 10) / 10 : 0,
      fast: [...tv].filter(t => t.velocity > 0).sort((a, b) => b.velocity - a.velocity).slice(0, 5),
      slow: [...tv].filter(t => t.velocity <= 0 && t.attempts >= 2).sort((a, b) => a.velocity - b.velocity).slice(0, 5),
      has: tv.length > 0
    };
  }, [data]);
  const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t) }, []);
  if (!analysis?.has) return <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100"><Info className="text-blue-500" size={14} /><p className="text-[13px] text-blue-700">Need 2+ attempts on at least one topic.</p></div>;
  const { avgM, avgC, fast, slow, tv } = analysis;
  const VBar = ({ item }) => {
    const mx = Math.max(...tv.map(t => Math.abs(t.velocity)), 1);
    const bw = anim ? Math.min(Math.abs(item.velocity) / mx * 100, 100) : 0;
    const pos = item.velocity > 0;
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${pos ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          {pos ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-gray-900 truncate">{item.name}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: `${item.color}15`, color: item.color }}>{item.type}</span>
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">{item.unit} {'\u2022'} {item.first}% {'\u2192'} {item.last}% ({item.attempts} attempts)</div>
          <div className="mt-1 h-1 bg-gray-200/50 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${bw}%`, backgroundColor: pos ? C.mcq : C.red }} />
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-[14px] font-bold ${pos ? 'text-green-600' : 'text-red-600'}`}>{pos ? '+' : ''}{item.velocity}%</div>
          <div className="text-[9px] text-slate-600 dark:text-slate-400 font-medium">/attempt</div>
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/15 to-transparent border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium font-bold uppercase tracking-wider">MCQ Speed</span>
            <span>{'📝'}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${avgM > 0 ? 'text-green-500' : avgM < 0 ? 'text-red-500' : 'text-gray-500'}`}>{avgM > 0 ? '+' : ''}{avgM}%</span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">/attempt</span>
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium mt-1">{avgM > 5 ? 'Rapid improvement!' : avgM > 2 ? 'Good progress' : avgM > 0 ? 'Slowly improving' : avgM === 0 ? 'No change' : 'Declining'}</div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/15 to-transparent border border-cyan-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium font-bold uppercase tracking-wider">Coding Speed</span>
            <span>{'💻'}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${avgC > 0 ? 'text-cyan-500' : avgC < 0 ? 'text-red-500' : 'text-gray-500'}`}>{avgC > 0 ? '+' : ''}{avgC}%</span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">/attempt</span>
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium mt-1">{avgC > 5 ? 'Rapid improvement!' : avgC > 2 ? 'Good progress' : avgC > 0 ? 'Slowly improving' : avgC === 0 ? 'No change' : 'Declining'}</div>
        </div>
      </div>
      {fast.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Rocket size={14} className="text-green-600" />
            <span className="text-[13px] font-bold text-green-700">Fastest Improving</span>
          </div>
          <div className="space-y-2">{fast.map((item, i) => <VBar key={`f${i}`} item={item} />)}</div>
        </div>
      )}
      {slow.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-orange-500" />
            <span className="text-[13px] font-bold text-orange-600">Slow / Declining</span>
          </div>
          <div className="space-y-2">{slow.map((item, i) => <VBar key={`s${i}`} item={item} />)}</div>
        </div>
      )}
      {tv.length > 3 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-blue-500" />
            <span className="text-[13px] font-bold text-blue-700">All Velocities</span>
          </div>
          <svg viewBox={`0 0 600 ${Math.max(tv.length * 26 + 16, 100)}`} className="w-full" style={{ height: Math.max(tv.length * 26 + 16, 100) }}>
            {(() => {
              const sorted = [...tv].sort((a, b) => b.velocity - a.velocity);
              const mx2 = Math.max(...sorted.map(t => Math.abs(t.velocity)), 1);
              const midX = 320, barMax = 180, rowH = 24, tp = 8;
              return sorted.map((t, i) => {
                const y = tp + i * rowH;
                const w2 = anim ? (Math.abs(t.velocity) / mx2) * barMax : 0;
                const pos = t.velocity >= 0;
                const bx = pos ? midX : midX - w2;
                const col = pos ? C.mcq : C.red;
                return (
                  <g key={i}>
                    <text x={90} y={y + 14} textAnchor="end" fill="#6b7280" fontSize="9" fontWeight="500">{t.name.length > 14 ? `${t.name.slice(0, 14)}\u2026` : t.name}</text>
                    <rect x={97} y={y + 4} width={22} height={14} rx="4" fill={t.type === 'MCQ' ? `${C.mcq}20` : `${C.coding}20`} />
                    <text x={108} y={y + 14} textAnchor="middle" fill={t.type === 'MCQ' ? C.mcq : C.coding} fontSize="8" fontWeight="700">{t.type === 'MCQ' ? 'MCQ' : 'COD'}</text>
                    <line x1={midX} y1={y + 2} x2={midX} y2={y + rowH - 2} stroke="#d1d5db" strokeWidth="0.4" />
                    <rect x={bx} y={y + 5} width={w2} height={12} rx="3" fill={col} opacity="0.7" style={{ transition: 'width 0.8s, x 0.8s cubic-bezier(.4,0,.2,1)' }} />
                    <text x={pos ? midX + w2 + 5 : midX - w2 - 5} y={y + 14} textAnchor={pos ? 'start' : 'end'} fill={col} fontSize="9" fontWeight="700">{pos ? '+' : ''}{t.velocity}%</text>
                  </g>
                );
              });
            })()}
          </svg>
        </div>
      )}
    </div>
  );
}

/* ═══ GAUGE ═══ */
function GaugeChart({ percentage = 0, size = 200, label = 'Score' }) {
  const [needlePct, setNeedlePct] = useState(0); const animRef = useRef(null);
  useEffect(() => { let pos = 0, vel = 0; const target = Math.min(percentage, 100); const stiff = 0.008, damp = 0.88; const step = () => { vel = (vel + (target - pos) * stiff) * damp; pos += vel; setNeedlePct(Math.max(0, Math.min(pos, 105))); if (Math.abs(target - pos) > 0.3 || Math.abs(vel) > 0.05) animRef.current = requestAnimationFrame(step); else setNeedlePct(target) }; const t = setTimeout(() => { animRef.current = requestAnimationFrame(step) }, 400); return () => { clearTimeout(t); animRef.current && cancelAnimationFrame(animRef.current) } }, [percentage]);
  const cx = size / 2, cy = size / 2 + 8, r = size / 2 - 28; const startA = Math.PI * 0.78, endA = Math.PI * 2.22, totalArc = endA - startA;
  const getPos = a => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }); const cp = Math.max(0, Math.min(needlePct, 100)); const na = startA + (cp / 100) * totalArc;
  const zones = [{ from: 0, to: 30, color: '#d93025' }, { from: 30, to: 50, color: '#f9ab00' }, { from: 50, to: 70, color: '#f9ab00' }, { from: 70, to: 85, color: '#1a73e8' }, { from: 85, to: 100, color: '#1e8e3e' }];
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10);
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.78} viewBox={`0 0 ${size} ${size * 0.82}`}>
        {zones.map((z, i) => { const s = startA + (z.from / 100) * totalArc; const e2 = startA + (z.to / 100) * totalArc; const sp = getPos(s), ep = getPos(e2); const large = (e2 - s) > Math.PI ? 1 : 0; return <path key={i} d={`M ${sp.x} ${sp.y} A ${r} ${r} 0 ${large} 1 ${ep.x} ${ep.y}`} fill="none" stroke={z.color} strokeWidth="8" strokeLinecap="round" opacity="0.2" />; })}
        {(() => { const ep = getPos(na); const large = (na - startA) > Math.PI ? 1 : 0; const sp = getPos(startA); const ac = cp >= 85 ? C.mcq : cp >= 70 ? C.blue : cp >= 50 ? C.yellow : cp >= 30 ? C.orange : C.red; return <path d={`M ${sp.x} ${sp.y} A ${r} ${r} 0 ${large} 1 ${ep.x} ${ep.y}`} fill="none" stroke={ac} strokeWidth="8" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${ac}55)` }} />; })()}
        {ticks.map(v => { const angle = startA + (v / 100) * totalArc; const isMajor = v % 20 === 0; const oR = r + 12, iR = r + (isMajor ? 4 : 7); const ox = cx + oR * Math.cos(angle), oy = cy + oR * Math.sin(angle); const ix = cx + iR * Math.cos(angle), iy = cy + iR * Math.sin(angle); return (<g key={v}><line x1={ix} y1={iy} x2={ox} y2={oy} stroke={isMajor ? "#9ca3af" : "#d1d5db"} strokeWidth={isMajor ? "1.5" : "0.8"} strokeLinecap="round" />{isMajor && (() => { const lr = r + 22; return <text x={cx + lr * Math.cos(angle)} y={cy + lr * Math.sin(angle)} textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" fontSize="9" fontWeight="500">{v}</text>; })()}</g>) })}
        {(() => { const nl = r - 18, nx = cx + nl * Math.cos(na), ny = cy + nl * Math.sin(na); const tl = 12, tx = cx - tl * Math.cos(na), ty = cy - tl * Math.sin(na); return (<g><line x1={tx} y1={ty} x2={nx} y2={ny} stroke="#f9ab00" strokeWidth="2.5" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px rgba(249,115,22,.5))' }} /><circle cx={cx} cy={cy} r="7" fill="#f9ab00" stroke="#fff" strokeWidth="3" /><circle cx={cx} cy={cy} r="2.5" fill="white" /></g>) })()}
        <text x={cx} y={cy + r - 36} textAnchor="middle" fill="#374151" fontSize="26" fontWeight="800">{percentage}%</text>
        <text x={cx} y={cy + r - 18} textAnchor="middle" fill="#6b7280" fontSize="12" fontWeight="600">{label}</text>
      </svg>
      <div className="flex gap-2 mt-1">{zones.map((z, i) => (<div key={i} className="flex items-center gap-0.5"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: z.color }} /><span className="text-[7px] text-gray-400">{z.from}-{z.to}%</span></div>))}</div>
    </div>
  );
}

/* ═══ DONUT ═══ */
function CustomDonutChart({ percentage = 0, color, label, size = 150, strokeWidth = 12 }) {
  const [ap, setAp] = useState(0); const r = (size - strokeWidth) / 2, circ = 2 * Math.PI * r;
  useEffect(() => { const t = setTimeout(() => setAp(percentage), 100); return () => clearTimeout(t) }, [percentage]);
  return (<div className="flex flex-col items-center"><div className="relative" style={{ width: size, height: size }}><svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="#e5e7eb" strokeWidth={strokeWidth} opacity="0.4" /><circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circ} strokeDashoffset={circ - (ap / 100) * circ} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 5px ${color}44)` }} /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-xl font-bold text-gray-900 dark:text-white"><AnimatedNumber value={percentage} suffix="%" /></span><span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium dark:text-gray-400 uppercase tracking-wider mt-0.5">{label}</span></div></div></div>);
}

/* ═══ RADAR ═══ */
function CustomRadarChart({ data, size = 260, color = C.orange }) {
  const [anim, setAnim] = useState(false); const cx = size / 2, cy = size / 2, maxR = size / 2 - 40, count = data.length;
  useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t) }, [data]);
  if (count < 3) return <div className="text-gray-500 text-sm text-center py-8">Need 3+ units</div>;
  const step = (2 * Math.PI) / count; const pt = (i, v) => { const a = step * i - Math.PI / 2; const r = (v / 100) * maxR; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) } }; const dp = data.map((d, i) => pt(i, anim ? d.score : 0));
  return (<div className="flex justify-center"><svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{[20, 40, 60, 80, 100].map(lv => { const pts = Array.from({ length: count }, (_, i) => { const p = pt(i, lv); return `${p.x},${p.y}` }).join(' '); return <polygon key={lv} points={pts} fill="none" stroke="#d1d5db" strokeWidth="0.6" /> })}{data.map((_, i) => { const e = pt(i, 100); return <line key={i} x1={cx} y1={cy} x2={e.x} y2={e.y} stroke="#e5e7eb" strokeWidth="0.4" /> })}<polygon points={dp.map(p => `${p.x},${p.y}`).join(' ')} fill={`${color}18`} stroke={color} strokeWidth="2" style={{ transition: 'all 1s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${color}33)` }} />{dp.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} stroke="#fff" strokeWidth="2" style={{ transition: 'all 1s cubic-bezier(.4,0,.2,1)' }} />)}{data.map((d, i) => { const p = pt(i, 118); return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="#6b7280" fontSize="10" fontWeight="500">{d.subject}</text> })}</svg></div>);
}

/* ═══ BAR CHART ═══ */
function CustomBarChart({ data, keys, colors, height = 280, showLegend = true }) {
  const [hov, setHov] = useState(null); const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 100); return () => clearTimeout(t) }, [data]);
  if (!data?.length) return <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">No data</div>;
  const pad = { top: 20, right: 20, bottom: 40, left: 45 };
  return (<div className="w-full"><div style={{ height: `${height}px` }}><svg viewBox={`0 0 600 ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">{[0, 25, 50, 75, 100].map(t => { const y = pad.top + (1 - t / 100) * (height - pad.top - pad.bottom); return (<g key={t}><line x1={pad.left} y1={y} x2={580} y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 4" /><text x={pad.left - 8} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="10">{t}%</text></g>) })}{data.map((item, i) => { const gx = pad.left + (i / data.length) * (600 - pad.left - pad.right); const gw = (600 - pad.left - pad.right) / data.length; return (<g key={i}>{keys.map((key, ki) => { const val = item[key] || 0; const bh = (val / 100) * (height - pad.top - pad.bottom); const bw = gw * 0.28; const bx = gx + (gw - keys.length * (bw + 4)) / 2 + ki * (bw + 4); const by = height - pad.bottom - bh; const ih = hov === `${i}-${ki}`; const gid = `bg${i}${ki}`; return (<g key={ki} onMouseEnter={() => setHov(`${i}-${ki}`)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}><defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={colors[ki]} stopOpacity="0.95" /><stop offset="100%" stopColor={colors[ki]} stopOpacity="0.55" /></linearGradient></defs><rect x={bx} width={bw} rx="4" y={anim ? by : height - pad.bottom} height={anim ? bh : 0} fill={`url(#${gid})`} opacity={ih ? 1 : 0.8} style={{ transition: 'y 0.8s cubic-bezier(.4,0,.2,1), height 0.8s cubic-bezier(.4,0,.2,1), opacity 0.15s' }} />{ih && <><rect x={bx - 2} width={bw + 4} rx="5" y={by - 2} height={bh + 4} fill="none" stroke={colors[ki]} strokeWidth="1.2" opacity="0.4" /><rect x={bx - 10} y={by - 24} width={bw + 20} height={18} rx="5" fill="#1f2937" stroke={colors[ki]} strokeWidth="0.6" /><text x={bx + bw / 2} y={by - 11} textAnchor="middle" fill={colors[ki]} fontSize="10" fontWeight="bold">{val}%</text></>}</g>) })}<text x={gx + gw / 2} y={height - pad.bottom + 18} textAnchor="middle" fill="#6b7280" fontSize="10">{item.name}</text></g>) })}</svg></div>{showLegend && <div className="flex items-center justify-center gap-5 mt-2">{keys.map((k, i) => (<div key={k} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[i] }} /><span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{k}</span></div>))}</div>}</div>);
}

/* ═══ FUNNEL ═══ */
function FunnelChart({ total, attempted, passed, aced, height = 200 }) {
  const [anim, setAnim] = useState(false); useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t) }, [total]);
  const w = 500, h = height; const stages = [{ label: 'Total Tests', value: total, color: C.blue }, { label: 'Attempted', value: attempted, color: C.orange }, { label: 'Scored 50%+', value: passed, color: C.yellow }, { label: 'Scored 80%+', value: aced, color: C.mcq }];
  const mx = Math.max(total, 1), sH = (h - 20) / stages.length, centerX = w / 2;
  return (<svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>{stages.map((s, i) => { const ratio = anim ? s.value / mx : 0; const bW = Math.max(ratio * (w - 200), 4); const y = 10 + i * sH; const barX = centerX - bW / 2; return (<g key={i}><rect x={barX} y={y + 2} width={bW} height={sH - 10} rx="6" fill={s.color} opacity="0.6" style={{ transition: 'all 0.8s cubic-bezier(.4,0,.2,1)' }} /><text x={centerX} y={y + sH / 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="13" fontWeight="800" opacity={anim ? 1 : 0} style={{ transition: 'opacity 0.5s 0.3s' }}>{s.value}</text><text x={w - 15} y={y + sH / 2} textAnchor="end" dominantBaseline="middle" fill="#9ca3af" fontSize="10" fontWeight="500">{s.label}</text></g>) })}</svg>);
}

/* ═══ SCATTER ═══ */
function ScatterPlot({ data, height = 260 }) {
  const [hov, setHov] = useState(null); const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t) }, [data]);
  if (!data?.length) return <div className="text-gray-500 text-center py-8 text-sm">No data with both MCQ & Coding scores</div>;
  const pad = { top: 20, right: 25, bottom: 35, left: 45 }, w = 500, h = height;
  return (<svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>{[0, 25, 50, 75, 100].map(v => { const y = pad.top + (1 - v / 100) * (h - pad.top - pad.bottom); const x = pad.left + (v / 100) * (w - pad.left - pad.right); return (<g key={v}><line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="0.4" strokeDasharray="3 3" /><line x1={x} y1={pad.top} x2={x} y2={h - pad.bottom} stroke="#e5e7eb" strokeWidth="0.4" strokeDasharray="3 3" /><text x={pad.left - 8} y={y + 3} textAnchor="end" fill="#9ca3af" fontSize="8">{v}</text><text x={x} y={h - pad.bottom + 13} textAnchor="middle" fill="#9ca3af" fontSize="8">{v}</text></g>) })}<line x1={pad.left} y1={h - pad.bottom} x2={w - pad.right} y2={pad.top} stroke="#d1d5db" strokeWidth="0.8" strokeDasharray="5 4" opacity="0.4" />{data.map((d, i) => { const x = pad.left + (d.mcq / 100) * (w - pad.left - pad.right); const y = pad.top + (1 - d.coding / 100) * (h - pad.top - pad.bottom); const ih = hov === i; const cy2 = anim ? y : h - pad.bottom; return (<g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}><line x1={x} y1={cy2} x2={x} y2={h - pad.bottom} stroke={CHART_PALETTE[i % CHART_PALETTE.length]} strokeWidth="0.6" strokeDasharray="2 2" opacity={ih ? 0.6 : 0.25} style={{ transition: 'y1 0.8s cubic-bezier(.4,0,.2,1)' }} /><line x1={pad.left} y1={cy2} x2={x} y2={cy2} stroke={CHART_PALETTE[i % CHART_PALETTE.length]} strokeWidth="0.6" strokeDasharray="2 2" opacity={ih ? 0.6 : 0.25} style={{ transition: 'y1 0.8s cubic-bezier(.4,0,.2,1)' }} /><circle cx={x} cy={cy2} r={ih ? 6 : 4} fill={CHART_PALETTE[i % CHART_PALETTE.length]} stroke="#fff" strokeWidth="2" opacity={ih ? 1 : 0.7} style={{ transition: 'all 0.8s cubic-bezier(.4,0,.2,1)', filter: ih ? `drop-shadow(0 0 6px ${CHART_PALETTE[i % CHART_PALETTE.length]}66)` : 'none' }} />{ih && <><rect x={x + 8} y={cy2 - 22} width={Math.max(d.name.length * 7 + 16, 90)} height={18} rx="5" fill="#1f2937" stroke={CHART_PALETTE[i % CHART_PALETTE.length]} strokeWidth="0.6" /><text x={x + 16} y={cy2 - 9} fill={CHART_PALETTE[i % CHART_PALETTE.length]} fontSize="9" fontWeight="bold">{d.name} (MCQ:{d.mcq} Cod:{d.coding})</text></>}</g>) })}<text x={pad.left + (w - pad.left - pad.right) / 2} y={h - 4} textAnchor="middle" fill="#9ca3af" fontSize="9">MCQ % →</text><text x={10} y={pad.top + (h - pad.top - pad.bottom) / 2} textAnchor="middle" fill="#9ca3af" fontSize="9" transform={`rotate(-90, 10, ${pad.top + (h - pad.top - pad.bottom) / 2})`}>Coding % →</text></svg>);
}

/* ═══ BUTTERFLY ═══ */
function ButterflyChart({ data, height = 300 }) {
  const [anim, setAnim] = useState(false); useEffect(() => { const t = setTimeout(() => setAnim(true), 150); return () => clearTimeout(t) }, [data]);
  if (!data?.length) return null; const pad = { top: 20, bottom: 10 }, h = Math.max(height, data.length * 40 + 30), w = 600, mid = w / 2, maxBar = (w / 2) - 80, rowH = (h - pad.top - pad.bottom) / data.length;
  return (<svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}><line x1={mid} y1={pad.top} x2={mid} y2={h - pad.bottom} stroke="#d1d5db" strokeWidth="0.8" />{data.map((d, i) => { const y = pad.top + i * rowH + rowH / 2; const mw = anim ? (d.mcq / 100) * maxBar : 0; const cw = anim ? (d.coding / 100) * maxBar : 0; return (<g key={i}><rect x={mid - mw} y={y - 9} width={mw} height={18} rx="4" fill={C.mcq} opacity="0.75" style={{ transition: 'x 0.8s, width 0.8s cubic-bezier(.4,0,.2,1)' }} /><text x={mid - mw - 5} y={y + 4} textAnchor="end" fill={C.mcq} fontSize="9" fontWeight="600">{d.mcq}%</text><rect x={mid} y={y - 9} width={cw} height={18} rx="4" fill={C.coding} opacity="0.75" style={{ transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} /><text x={mid + cw + 5} y={y + 4} textAnchor="start" fill={C.coding} fontSize="9" fontWeight="600">{d.coding}%</text><text x={mid} y={y - 14} textAnchor="middle" fill="#6b7280" fontSize="9">{d.name}</text></g>) })}<text x={mid - maxBar / 2} y={12} textAnchor="middle" fill={C.mcq} fontSize="10" fontWeight="700">← MCQ</text><text x={mid + maxBar / 2} y={12} textAnchor="middle" fill={C.coding} fontSize="10" fontWeight="700">Coding →</text></svg>);
}

/* ═══ POLAR ═══ */
function PolarAreaChart({ data, size = 260 }) {
  const [anim, setAnim] = useState(false); useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t) }, [data]);
  if (!data?.length) return null; const cx = size / 2, cy = size / 2, maxR = size / 2 - 30, sa = (2 * Math.PI) / data.length;
  return (<div className="flex justify-center"><svg width={size} height={size}>{[25, 50, 75, 100].map(lv => <circle key={lv} cx={cx} cy={cy} r={(lv / 100) * maxR} fill="none" stroke="#d1d5db" strokeWidth="0.4" />)}{data.map((d, i) => { const s = sa * i - Math.PI / 2; const e = s + sa; const r = anim ? (d.value / 100) * maxR : 0; const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s), x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e); const large = sa > Math.PI ? 1 : 0; const color = CHART_PALETTE[i % CHART_PALETTE.length]; return (<g key={i}><path d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={color} opacity="0.45" stroke={color} strokeWidth="0.8" style={{ transition: 'all 1s cubic-bezier(.4,0,.2,1)' }} />{(() => { const m = s + sa / 2; const lr = maxR + 16; return <text x={cx + lr * Math.cos(m)} y={cy + lr * Math.sin(m)} textAnchor="middle" dominantBaseline="middle" fill="#6b7280" fontSize="9">{d.name}</text> })()}</g>) })}</svg></div>);
}

/* ═══ HISTOGRAM ═══ */
function HistogramChart({ data, color = C.orange, height = 200 }) {
  const [anim, setAnim] = useState(false); useEffect(() => { const t = setTimeout(() => setAnim(true), 100); return () => clearTimeout(t) }, [data]);
  const bins = [0, 0, 0, 0, 0]; const labels = ['0-20', '21-40', '41-60', '61-80', '81-100'];
  (data || []).forEach(v => { bins[Math.min(Math.floor(v / 20), 4)]++ }); const mx = Math.max(...bins, 1);
  const pad = { top: 15, right: 15, bottom: 32, left: 28 }, w = 400, h = height, cW = w - pad.left - pad.right, cH = h - pad.top - pad.bottom, bw = cW / bins.length - 6;
  return (<svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>{bins.map((c, i) => { const bH = (c / mx) * cH; const x = pad.left + i * (cW / bins.length) + 3; const y = h - pad.bottom - bH; return (<g key={i}><rect x={x} y={anim ? y : h - pad.bottom} width={bw} height={anim ? bH : 0} rx="3" fill={color} opacity="0.65" style={{ transition: 'y 0.7s, height 0.7s cubic-bezier(.4,0,.2,1)' }} /><text x={x + bw / 2} y={anim ? y - 5 : h - pad.bottom - 5} textAnchor="middle" fill={color} fontSize="9" fontWeight="700" style={{ transition: 'y 0.7s' }}>{c}</text><text x={x + bw / 2} y={h - pad.bottom + 14} textAnchor="middle" fill="#9ca3af" fontSize="8">{labels[i]}</text></g>) })}</svg>);
}

/* ═══ LOLLIPOP ═══ */
function LollipopChart({ data, color, height }) {
  const [anim, setAnim] = useState(false); useEffect(() => { const t = setTimeout(() => setAnim(true), 150); return () => clearTimeout(t) }, [data]);
  if (!data?.length) return null; const h = height || data.length * 34 + 20, w = 500, pad = { left: 120, right: 50, top: 8, bottom: 8 }, rowH = (h - pad.top - pad.bottom) / data.length;
  return (<svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>{data.map((d, i) => { const y = pad.top + i * rowH + rowH / 2; const le = pad.left + (anim ? (d.value / 100) : 0) * (w - pad.left - pad.right); return (<g key={i}><text x={pad.left - 8} y={y + 3} textAnchor="end" fill="#6b7280" fontSize="9" fontWeight="500">{d.name.length > 16 ? d.name.slice(0, 16) + '…' : d.name}</text><line x1={pad.left} y1={y} x2={le} y2={y} stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" style={{ transition: 'x2 0.8s cubic-bezier(.4,0,.2,1)' }} /><circle cx={le} cy={y} r="4.5" fill={color} stroke="#fff" strokeWidth="2" style={{ transition: 'cx 0.8s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 2px ${color}55)` }} /><text x={le + 9} y={y + 3} fill={color} fontSize="9" fontWeight="700" style={{ transition: 'x 0.8s' }}>{d.value}%</text></g>) })}</svg>);
}

/* ═══ AREA CHART ═══ */
function CustomAreaChart({ data, dataKey = 'percentage', color, height = 150 }) {
  const [anim, setAnim] = useState(false); useEffect(() => { const t = setTimeout(() => setAnim(true), 100); return () => clearTimeout(t) }, [data]);
  if (!data || data.length < 2) return <div className="text-gray-500 text-sm text-center py-4">Need 2+ attempts</div>;
  const pd = { top: 15, right: 15, bottom: 30, left: 35 }, w = 400, h = height, cW = w - pd.left - pd.right, cH = h - pd.top - pd.bottom;
  const mx = Math.max(...data.map(d => d[dataKey] || 0), 10);
  const pts = data.map((d, i) => ({ x: pd.left + (i / (data.length - 1)) * cW, y: pd.top + (1 - (d[dataKey] || 0) / (mx || 1)) * cH, val: d[dataKey] || 0, label: d.attempt || i + 1 }));
  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${anim ? p.y : h - pd.bottom}`).join(' ');
  const areaD = lineD + ` L ${pts[pts.length - 1].x} ${h - pd.bottom} L ${pts[0].x} ${h - pd.bottom} Z`;
  return (<svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}><defs><linearGradient id={`ag${color}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0.02" /></linearGradient></defs>{[0, 25, 50, 75, 100].filter(v => v <= mx + 10).map(v => { const y = pd.top + (1 - v / (mx || 1)) * cH; return (<g key={v}><line x1={pd.left} y1={y} x2={w - pd.right} y2={y} stroke="#e5e7eb" strokeWidth="0.4" strokeDasharray="3 3" /><text x={pd.left - 6} y={y + 3} textAnchor="end" fill="#9ca3af" fontSize="9">{v}</text></g>) })}<path d={areaD} fill={`url(#ag${color})`} style={{ transition: 'all 0.8s cubic-bezier(.4,0,.2,1)' }} /><path d={lineD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={{ transition: 'all 0.8s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 3px ${color}55)` }} />{pts.map((p, i) => (<g key={i}><circle cx={p.x} cy={anim ? p.y : h - pd.bottom} r="3.5" fill={color} stroke="#fff" strokeWidth="2" style={{ transition: 'cy 0.8s cubic-bezier(.4,0,.2,1)' }} /><text x={p.x} y={h - pd.bottom + 14} textAnchor="middle" fill="#9ca3af" fontSize="8">#{p.label}</text></g>))}</svg>);
}

/* ═══ TABLE HELPERS ═══ */
function buildMcqTableBody(units) {
  let n = 0;
  return units.flatMap(u => u.subUnits.filter(s => s.hasMcq).map(s => {
    n++;
    const p = s.mcqBest?.percentage || 0;
    const lv = p >= 80 ? 'Strong' : p >= 50 ? 'Average' : p > 0 ? 'Weak' : '—';
    const lc = p >= 80 ? 'text-green-600' : p >= 50 ? 'text-yellow-600' : p > 0 ? 'text-red-600' : 'text-gray-400';
    return (
      <tr key={`${u.id}-${s.id}`} className="hover:bg-blue-50/30">
        <td className="border-b border-gray-100 px-3 py-2 text-center text-gray-400">{n}</td>
        <td className="border-b border-gray-100 px-3 py-2 text-orange-500 text-[11px]">{u.name}</td>
        <td className="border-b border-gray-100 px-3 py-2 font-medium">{s.name}</td>
        <td className="border-b border-gray-100 px-3 py-2 text-center text-green-600">{s.mcqBest?.obtained ?? '—'}</td>
        <td className="border-b border-gray-100 px-3 py-2 text-center">{s.mcqBest?.total ?? '—'}</td>
        <td className="border-b border-gray-100 px-3 py-2 text-center font-bold text-green-600">{p}%</td>
        <td className="border-b border-gray-100 px-3 py-2 text-center">{s.mcqAttempts.length}</td>
        <td className={`border-b border-gray-100 px-3 py-2 text-center font-semibold ${lc}`}>{lv}</td>
      </tr>
    );
  }));
}

function buildCodingTableBody(units) {
  let n = 0;
  return units.flatMap(u => u.subUnits.filter(s => s.hasCoding).map(s => {
    n++;
    const p = s.codBest?.percentage || 0;
    const lv = p >= 80 ? 'Strong' : p >= 50 ? 'Average' : p > 0 ? 'Weak' : '—';
    const lc = p >= 80 ? 'text-green-600' : p >= 50 ? 'text-yellow-600' : p > 0 ? 'text-red-600' : 'text-gray-400';
    return (
      <tr key={`${u.id}-${s.id}`} className="hover:bg-blue-50/30">
        <td className="border-b border-gray-100 px-3 py-2 text-center text-gray-400">{n}</td>
        <td className="border-b border-gray-100 px-3 py-2 text-orange-500 text-[11px]">{u.name}</td>
        <td className="border-b border-gray-100 px-3 py-2 font-medium">{s.name}</td>
        <td className="border-b border-gray-100 px-3 py-2 text-center text-green-600">{s.codBest?.obtained ?? '—'}</td>
        <td className="border-b border-gray-100 px-3 py-2 text-center">{s.codBest?.total ?? '—'}</td>
        <td className="border-b border-gray-100 px-3 py-2 text-center font-bold text-blue-600">{p}%</td>
        <td className="border-b border-gray-100 px-3 py-2 text-center">{s.codAttempts.length}</td>
        <td className={`border-b border-gray-100 px-3 py-2 text-center font-semibold ${lc}`}>{lv}</td>
      </tr>
    );
  }));
}

/* ═══ PROCESS ANALYTICS ═══ */
function processAnalytics(units, resultMap, todayIST) {
  let tMO = 0, tMM = 0, tCO = 0, tCM = 0, completed = 0, totalAv = 0;
  const opened = units.filter(u => { const s = u['start-date']; if (!s || !todayIST) return true; return todayIST >= s });
  const unitData = opened.map((unit, idx) => {
    let uMO = 0, uMM = 0, uCO = 0, uCM = 0;
    const pSubs = unit.subUnits.filter(isPractice);
    const subs = pSubs.map(sub => {
      const hM = Number(sub['mcq-question-to-show'] || 0) > 0;
      const hC = Number(sub['questions-to-show'] || 0) > 0;
      const parse = raw => { if (!raw || typeof raw !== 'object') return []; return Object.keys(raw).sort((a, b) => +a - +b).map(k => ({ attempt: +k, obtained: +(raw[k]?.marks_obtained || 0), total: +(raw[k]?.total || 0), percentage: +(raw[k]?.percentage || 0) })) };
      const mA = parse(resultMap.get(`${unit.id}-${sub.id}-mcq`));
      const cA = parse(resultMap.get(`${unit.id}-${sub.id}-coding`));
      const best = arr => arr.length ? arr.reduce((a, b) => b.percentage > a.percentage ? b : a) : null;
      const mB = best(mA), cB = best(cA);
      if (hM) { totalAv++; if (mB) completed++ }
      if (hC) { totalAv++; if (cB) completed++ }
      if (hM && mB) { uMO += mB.obtained; uMM += mB.total }
      if (hC && cB) { uCO += cB.obtained; uCM += cB.total }
      let s = 0, c = 0; if (mB) { s += mB.percentage; c++ } if (cB) { s += cB.percentage; c++ }
      return { id: sub.id, name: sub['sub-unit-name'], hasMcq: hM, hasCoding: hC, mcqBest: mB, codBest: cB, mcqAttempts: mA, codAttempts: cA, overallPct: c ? Math.round(s / c) : 0 };
    });
    tMO += uMO; tMM += uMM; tCO += uCO; tCM += uCM;
    const mP = uMM ? Math.round(uMO / uMM * 100) : 0; const cP = uCM ? Math.round(uCO / uCM * 100) : 0;
    let o = 0, n = 0; if (uMM) { o += mP; n++ } if (uCM) { o += cP; n++ }
    return { id: unit.id, name: unit['unit-name'], short: `Unit ${idx + 1}`, mcqObt: uMO, mcqMax: uMM, mcqPct: mP, codObt: uCO, codMax: uCM, codPct: cP, overallPct: n ? Math.round(o / n) : 0, subUnits: subs };
  });
  const oM = tMM ? Math.round(tMO / tMM * 100) : 0; const oC = tCM ? Math.round(tCO / tCM * 100) : 0;
  let og = 0, nc = 0; if (tMM) { og += oM; nc++ } if (tCM) { og += oC; nc++ }
  const overall = { overallPct: nc ? Math.round(og / nc) : 0, mcqPct: oM, codPct: oC, mcqObt: tMO, mcqMax: tMM, codObt: tCO, codMax: tCM, completion: totalAv ? Math.round((completed / totalAv) * 100) : 0, completed, total: totalAv };
  const allScores = unitData.flatMap(u => u.subUnits.filter(s => s.overallPct > 0).map(s => s.overallPct));
  const allMcqScores = unitData.flatMap(u => u.subUnits.filter(s => s.mcqBest?.percentage > 0).map(s => s.mcqBest.percentage));
  const allCodScores = unitData.flatMap(u => u.subUnits.filter(s => s.codBest?.percentage > 0).map(s => s.codBest.percentage));
  const allItems = unitData.flatMap(u => u.subUnits.filter(s => s.overallPct > 0).map(s => ({ name: s.name, type: s.hasMcq && s.hasCoding ? 'Both' : s.hasMcq ? 'MCQ' : 'Coding', pct: s.overallPct, unit: u.short })));
  const strengths = [...allItems].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const weaknesses = [...allItems].sort((a, b) => a.pct - b.pct).slice(0, 5);
  const funnel = { total: totalAv, attempted: completed, scored50: allItems.filter(i => i.pct >= 50).length, scored80: allItems.filter(i => i.pct >= 80).length };
  return { overall, units: unitData, strengths, weaknesses, funnel, allScores, allMcqScores, allCodScores, totalAv, completed };
}

/* ═══ CONSISTENCY ANALYSIS ═══ */
function ConsistencyAnalysis({ data }) { const analysis = useMemo(() => { if (!data) return null; const scores = []; data.units.forEach(u => u.subUnits.forEach(s => { if (s.overallPct > 0) scores.push(s.overallPct) })); if (scores.length < 2) return null; const avg = scores.reduce((a, b) => a + b, 0) / scores.length; const stdDev = Math.sqrt(scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length); return { consistency: Math.max(0, Math.round(100 - stdDev * 1.5)), stdDev: Math.round(stdDev), avg: Math.round(avg), maxScore: Math.max(...scores), minScore: Math.min(...scores) } }, [data]); if (!analysis) return <p className="text-gray-400 text-sm italic">Need 2+ attempted topics</p>; const cc = analysis.consistency >= 80 ? C.mcq : analysis.consistency >= 60 ? C.blue : analysis.consistency >= 40 ? C.yellow : C.red; const cl = analysis.consistency >= 80 ? 'Very Consistent' : analysis.consistency >= 60 ? 'Fairly Consistent' : analysis.consistency >= 40 ? 'Inconsistent' : 'Very Inconsistent'; return (<div className="space-y-4"><div className="flex items-center gap-4"><CustomDonutChart percentage={analysis.consistency} color={cc} label="Consistency" size={90} strokeWidth={7} /><div className="flex-1 space-y-2"><div className="text-base font-bold" style={{ color: cc }}>{cl}</div><div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Scores vary by ±{analysis.stdDev}%</div><div className="grid grid-cols-3 gap-2 text-center"><div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100"><div className="text-sm font-bold text-gray-800">{analysis.avg}%</div><div className="text-[7px] text-gray-500 uppercase">AVG</div></div><div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-100/50"><div className="text-sm font-bold text-emerald-700">{analysis.maxScore}%</div><div className="text-[7px] text-emerald-600/70 uppercase">BEST</div></div><div className="p-1.5 rounded-lg bg-red-50 border border-red-100/50"><div className="text-sm font-bold text-red-700">{analysis.minScore}%</div><div className="text-[7px] text-red-600/70 uppercase">WORST</div></div></div></div></div></div>) }

/* ═══ STUDY PRIORITY PLANNER ═══ */
function StudyPriorityPlanner({ data }) { const plan = useMemo(() => { if (!data) return []; const items = []; data.units.forEach(u => u.subUnits.forEach(s => { const m = s.mcqBest?.percentage ?? null; const c = s.codBest?.percentage ?? null; if (m === null && c === null) return; let p = 100 - s.overallPct; if (s.overallPct < 40 && s.overallPct > 0) p += 15; items.push({ name: s.name, unit: u.short, avg: s.overallPct, mcqPct: m, codPct: c, priority: p }) })); return items.sort((a, b) => b.priority - a.priority).slice(0, 10) }, [data]); if (!plan.length) return <p className="text-gray-400 text-sm italic">No attempted topics yet.</p>; const pc = p => p >= 70 ? C.red : p >= 50 ? C.orange : p >= 30 ? C.yellow : C.blue; const pl = p => p >= 70 ? 'URGENT' : p >= 50 ? 'HIGH' : p >= 30 ? 'MEDIUM' : 'LOW'; return (<div className="space-y-2">{plan.map((item, i) => (<div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 border border-gray-100 hover:bg-gray-50 transition-all"><div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: `${pc(item.priority)}15`, color: pc(item.priority) }}>{i + 1}</div><div className="flex-1 min-w-0"><div className="text-[13px] font-medium text-gray-800 truncate">{item.name}</div><div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">{item.unit} • {item.avg}%</div></div><span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: `${pc(item.priority)}15`, color: pc(item.priority) }}>{pl(item.priority)}</span></div>))}</div>) }

/* ═══ WEAK POINT DEEP DIVE ═══ */
function WeakPointDeepDive({ data }) { const analysis = useMemo(() => { if (!data) return null; const all = []; data.units.forEach(u => u.subUnits.forEach(s => { const m = s.mcqBest?.percentage ?? null; const c = s.codBest?.percentage ?? null; if (m === null && c === null) return; all.push({ name: s.name, unit: u.name, unitShort: u.short, mcqPct: m, codPct: c, avg: s.overallPct, mcqAttempts: s.mcqAttempts?.length || 0, codAttempts: s.codAttempts?.length || 0, hasMcq: s.hasMcq, hasCoding: s.hasCoding }) })); const critical = all.filter(s => s.avg < 40 && s.avg > 0).sort((a, b) => a.avg - b.avg); const improve = all.filter(s => s.avg >= 40 && s.avg < 60).sort((a, b) => a.avg - b.avg); const mcqW = all.filter(s => s.mcqPct !== null && s.codPct !== null && s.codPct - s.mcqPct > 25); const codW = all.filter(s => s.mcqPct !== null && s.codPct !== null && s.mcqPct - s.codPct > 25); const struggling = all.filter(s => (s.mcqAttempts + s.codAttempts) >= 3 && s.avg < 60).sort((a, b) => (b.mcqAttempts + b.codAttempts) - (a.mcqAttempts + a.codAttempts)); const boost = (() => { if (!critical.length && !improve.length) return 0; let b = 0;[...critical, ...improve].forEach(s => { b += (70 - s.avg) }); return Math.round(b / Math.max(all.length, 1)) })(); return { critical, improve, mcqW, codW, struggling, boost, total: all.length } }, [data]); if (!analysis) return null; const { critical, improve, mcqW, codW, struggling, boost, total } = analysis; if (total === 0) return <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/[0.04] border border-blue-500/10"><BookOpen className="text-blue-400" size={14} /><p className="text-sm text-blue-300">No tests attempted yet.</p></div>; return (<div className="space-y-4">{boost > 0 && <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-emerald-500/[0.08] to-transparent border border-emerald-500/15"><div className="w-11 h-11 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0"><ArrowUp size={18} /></div><div><div className="text-sm font-bold text-emerald-400">+{boost}% Potential Boost</div><div className="text-[11px] text-gray-400">Improving weak areas to 70% could raise overall by ~{boost}%</div></div></div>}{critical.length > 0 && <div><div className="flex items-center gap-2 mb-2"><XCircle className="text-red-400" size={14} /><span className="text-[13px] font-bold text-red-400">Critical ({critical.length})</span></div><div className="space-y-1.5">{critical.map((s, i) => (<div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-red-500/[0.03] border border-red-500/10"><div className="w-7 h-7 rounded-full bg-red-500/15 flex items-center justify-center text-red-400 text-[10px] font-bold shrink-0">{s.avg}%</div><div className="flex-1 min-w-0"><div className="text-[13px] font-medium text-white truncate">{s.name}</div><div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{s.unit}</div></div></div>))}</div></div>}{improve.length > 0 && <div><div className="flex items-center gap-2 mb-2"><AlertCircle className="text-yellow-400" size={14} /><span className="text-[13px] font-bold text-yellow-400">Needs Improvement ({improve.length})</span></div><div className="space-y-1.5">{improve.map((s, i) => (<div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/[0.03] border border-yellow-500/10"><div className="w-7 h-7 rounded-full bg-yellow-500/15 flex items-center justify-center text-yellow-400 text-[10px] font-bold shrink-0">{s.avg}%</div><div className="flex-1 min-w-0"><div className="text-[13px] font-medium text-white truncate">{s.name}</div><div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{s.unit}</div></div></div>))}</div></div>}{(mcqW.length > 0 || codW.length > 0) && <div><div className="flex items-center gap-2 mb-2"><Crosshair className="text-purple-400" size={14} /><span className="text-[13px] font-bold text-purple-400">Skill Gaps</span></div><div className="space-y-1.5">{mcqW.map((s, i) => (<div key={`m${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/[0.03] border border-purple-500/10"><div className="flex-1 min-w-0"><div className="text-[13px] font-medium text-white truncate">{s.name}</div><div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">MCQ {s.codPct - s.mcqPct}% lower than Coding</div></div></div>))}{codW.map((s, i) => (<div key={`c${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/[0.03] border border-purple-500/10"><div className="flex-1 min-w-0"><div className="text-[13px] font-medium text-white truncate">{s.name}</div><div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Coding {s.mcqPct - s.codPct}% lower than MCQ</div></div></div>))}</div></div>}{struggling.length > 0 && <div><div className="flex items-center gap-2 mb-2"><Brain className="text-pink-400" size={14} /><span className="text-[13px] font-bold text-pink-400">Struggling (3+ attempts, {'<'}60%)</span></div><div className="space-y-1.5">{struggling.slice(0, 5).map((s, i) => (<div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-pink-500/[0.03] border border-pink-500/10"><div className="w-7 h-7 rounded-full bg-pink-500/15 flex items-center justify-center text-pink-400 text-[10px] font-bold shrink-0">{s.mcqAttempts + s.codAttempts}x</div><div className="flex-1"><div className="text-[13px] font-medium text-white truncate">{s.name}</div><div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{s.unit} • {s.avg}%</div></div></div>))}</div></div>}{critical.length === 0 && improve.length === 0 && struggling.length === 0 && <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15"><CheckCircle2 className="text-emerald-400" size={18} /><p className="text-sm text-emerald-300">No critical weak points!</p></div>}</div>) }

/* ═══ MAIN PAGE ═══ */
function StudentAnalyticsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const batchId = searchParams.get('batch_id');
  const studentId = searchParams.get('student_id');
  const studentName = searchParams.get('name');

  const [section, setSection] = useState('overview');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressPct, setProgressPct] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Loading...');
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode) }, [darkMode]);
  const [todayIST, setTodayIST] = useState('');

  const { data: apiData, error } = useSWR(
    batchId && studentId ? [`${API_CONFIG.baseUrl.admin}${API_CONFIG.v2.studentFullAnalytics(batchId, studentId)}`, 'GET'] : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    (async () => {
      const now = new Date();
      const ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
      setTodayIST(`${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`);
    })();
  }, []);

  useEffect(() => {
    if (!apiData) return;
    try {
      setProgressPct(10);
      setStatusMsg('Processing course data...');

      const course = apiData.course;
      const units = Object.entries(course.units || {}).map(([uid, u]) => ({
        id: uid, ...u,
        subUnits: Object.entries(u['sub-units'] || {}).map(([sid, s]) => ({ id: sid, ...s }))
      }));

      setProgressPct(30);
      setStatusMsg('Processing results...');

      const resultMap = new Map();
      Object.entries(apiData.results || {}).forEach(([key, value]) => {
        const parts = key.split('|');
        if (parts.length === 2) {
          units.forEach(u => {
            u.subUnits.forEach(s => {
              if (s.id === parts[0]) {
                resultMap.set(`${u.id}-${s.id}-${parts[1]}`, value);
              }
            });
          });
        }
      });

      setProgressPct(70);
      setStatusMsg('Computing analytics...');

      const ad = processAnalytics(units, resultMap, todayIST);
      setAnalyticsData(ad);

      setProgressPct(100);
      setTimeout(() => setLoading(false), 300);
    } catch (e) {
      console.error('Analytics processing error:', e);
      setLoading(false);
    }
  }, [apiData, todayIST]);

  const goBack = () => router.push('/dashboard');

  if (!studentId) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Student Selected</h2>
          <button onClick={goBack} className="px-4 py-2 bg-[#1a73e8] text-white rounded-xl text-sm font-semibold hover:bg-[#1557b0] transition-colors">Go Back</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-7 max-w-xs mx-auto px-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#1a73e8] to-[#1557b0] flex items-center justify-center shadow-lg animate-pulse">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <div className="relative w-28 h-28 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle className="text-gray-200 dark:text-gray-600" strokeWidth="4" stroke="currentColor" fill="transparent" r="44" cx="50" cy="50" />
              <circle className="text-[#1a73e8]" strokeWidth="4" strokeDasharray={2 * Math.PI * 44} strokeDashoffset={(2 * Math.PI * 44) * (1 - progressPct / 100)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="44" cx="50" cy="50" style={{ transition: 'stroke-dashoffset .4s', filter: 'drop-shadow(0 0 5px rgba(26,115,232,.4))' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-extrabold text-gray-900 dark:text-white">{progressPct}%</span>
            </div>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Student Analytics</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 animate-pulse">{statusMsg}</p>
          </div>
          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#1a73e8] to-[#1e8e3e] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData || error) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center">
        <GlassCard className="p-8 max-w-sm text-center">
          <h2 className="text-xl font-bold text-red-500 dark:text-red-400 mb-3">No Data</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-5 text-sm">Unable to load analytics for {studentName || 'this student'}</p>
          <button onClick={goBack} className="px-5 py-2 bg-[#1a73e8] text-white rounded-xl font-semibold hover:bg-[#1557b0] transition shadow-lg">Go Back</button>
        </GlassCard>
      </div>
    );
  }

  const { overall, strengths, weaknesses, funnel, allScores, allMcqScores, allCodScores, units } = analyticsData;
  const gradePct = Math.round((overall.overallPct + overall.completion) / 2);
  const grade = GRADE(gradePct);
  const barData = units.map(u => ({ name: u.short, MCQ: u.mcqPct, Coding: u.codPct }));
  const radarData = units.map(u => ({ subject: u.short, score: u.overallPct }));
  const scatterData = units.flatMap(u => u.subUnits.filter(s => s.mcqBest && s.codBest).map(s => ({ name: s.name, mcq: s.mcqBest.percentage, coding: s.codBest.percentage })));
  const butterflyData = units.map(u => ({ name: u.short, mcq: u.mcqPct, coding: u.codPct }));
  const polarData = units.map(u => ({ name: u.short, value: u.overallPct }));
  const selUnit = units.find(u => u.id === selectedUnit) || null;
  const subBarData = selUnit?.subUnits.map((s, i) => ({ name: `T${i + 1}`, MCQ: s.mcqBest?.percentage || 0, Coding: s.codBest?.percentage || 0 })) || [];

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-gray-900 text-white' : 'bg-[#f8f9fa] text-gray-900'}`}>
      {darkMode && <style>{`
        .text-gray-900 { color: #fff !important; }
        .text-gray-700 { color: #e5e7eb !important; }
        .text-gray-600 { color: #d1d5db !important; }
        .text-gray-500 { color: #9ca3af !important; }
        .text-gray-400 { color: #6b7280 !important; }
        .bg-gray-50 { background-color: rgba(31,41,55,0.5) !important; }
        .bg-gray-100 { background-color: rgba(55,65,81,0.4) !important; }
        .bg-gray-200, .bg-gray-200\\/50 { background-color: rgba(75,85,99,0.3) !important; }
        .border-gray-100 { border-color: rgba(75,85,99,0.25) !important; }
        .border-gray-200 { border-color: rgba(75,85,99,0.3) !important; }
        .border-gray-300 { border-color: rgba(75,85,99,0.4) !important; }
        .hover\\:bg-gray-100\\/50:hover { background-color: rgba(55,65,81,0.4) !important; }
        .hover\\:bg-blue-50\\/30:hover { background-color: rgba(30,64,175,0.15) !important; }
        thead.bg-gray-100 { background-color: rgba(55,65,81,0.6) !important; }
        svg text[fill="#9ca3af"] { fill: #6b7280 !important; }
        svg text[fill="#6b7280"] { fill: #9ca3af !important; }
        svg text[fill="#374151"] { fill: #e5e7eb !important; }
        svg text[fill="#1f2937"] { fill: #fff !important; }
        .bg-warning { background-color: rgba(251,191,36,0.1) !important; }
        .text-warning { color: #fbbf24 !important; }
        .bg-white\\/5 { background-color: rgba(255,255,255,0.05) !important; }
        .border-white\\/10 { border-color: rgba(255,255,255,0.1) !important; }
      `}</style>}
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-[#151B2B] border-b border-gray-200 dark:border-gray-700/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button onClick={goBack}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400  dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-sm font-bold text-gray-900 dark:text-white">{apiData?.student?.name || studentName || 'Student'}</h1>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium dark:text-gray-400">{apiData?.student?.reg || ''} &bull; Section {apiData?.student?.section || ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setDarkMode(!darkMode)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-all text-sm">
                {darkMode ? '\u2600\uFE0F' : '\uD83C\uDF19'}
              </button>
              <span className="text-[10px] px-2 py-1 rounded-full border font-semibold" style={{
                backgroundColor: apiData?.student?.status === 'active' ? '#e6f4ea' : '#fce8e6',
                color: apiData?.student?.status === 'active' ? '#1e8e3e' : '#d93025',
                borderColor: apiData?.student?.status === 'active' ? '#1e8e3e30' : '#d9302530'
              }}>{apiData?.student?.status || 'active'}</span>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-gray-100 dark:border-gray-700/30">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {[
              { key: 'overview', label: 'Overview', icon: <BarChart3 size={14} />, color: C.orange },
              { key: 'weakpoints', label: 'Weak Points', icon: <Crosshair size={14} />, color: C.red },
              { key: 'mcq', label: 'MCQ', icon: <Target size={14} />, color: C.mcq },
              { key: 'coding', label: 'Coding', icon: <Code size={14} />, color: C.coding },
            ].map(t => (
              <button key={t.key} onClick={() => { setSection(t.key); setSelectedUnit(null) }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold border transition-all duration-200 ${
                  section === t.key
                    ? 'text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 border-transparent bg-slate-50 hover:bg-slate-100 dark:bg-gray-800/50 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white'
                }`}
                style={section === t.key ? { backgroundColor: t.color, borderColor: t.color } : {}}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
          <Info className="text-blue-500 dark:text-blue-400 shrink-0" size={14} />
          <p className="text-[11px] text-blue-700 dark:text-blue-300">Showing <strong>practice data only</strong> for opened units. Scores based on <strong>attempted tests only</strong>.</p>
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {section === 'overview' && (
          <div className="space-y-6">
            {/* Row 1: Grade + Gauge + Concentric Rings + Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Practice Grade */}
              <div className="lg:col-span-3">
                <GlassCard className="p-5 h-full flex flex-col items-center justify-center">
                  <span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium font-bold uppercase tracking-wider mb-2">Practice Grade</span>
                  <div className={`w-full rounded-2xl bg-gradient-to-br ${grade.bg} border ${grade.border} p-5 text-center shadow-sm`}>
                    <div className={`text-6xl font-black ${grade.color}`}>{grade.letter}</div>
                    <div className={`text-sm font-semibold ${grade.color} mt-1`}>{grade.desc}</div>
                    <div className="text-[9px] text-slate-600 dark:text-slate-400 font-medium mt-2">{gradePct}%</div>
                    <div className="w-full h-1.5 bg-gray-200/50 rounded-full mt-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${gradePct}%`, backgroundColor: gradePct >= 80 ? C.mcq : gradePct >= 60 ? C.blue : gradePct >= 40 ? C.orange : C.red }} />
                    </div>
                  </div>
                  <div className="mt-3 w-full space-y-1">
                    {GRADE_CRITERIA.map((g, i) => (
                      <div key={i} className="flex items-center justify-between px-2">
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">{g.range}</span>
                        <span className="text-[9px] font-bold" style={{ color: g.color }}>{g.letter}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
              {/* Gauge */}
              <div className="lg:col-span-3">
                <GlassCard className="p-5 h-full flex flex-col items-center justify-center">
                  <span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium font-bold uppercase tracking-wider mb-1">Overall Practice Score</span>
                  <GaugeChart percentage={overall.overallPct} size={200} label="Practice" />
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-1 text-center">Avg of MCQ & Coding % (attempted only)</span>
                </GlassCard>
              </div>
              {/* Concentric Score Rings */}
              <div className="lg:col-span-3">
                <GlassCard className="p-5 h-full flex flex-col items-center justify-center">
                  <span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium font-bold uppercase tracking-wider mb-1">Score Rings</span>
                  <ConcentricRings overall={overall.overallPct} mcq={overall.mcqPct} coding={overall.codPct} size={180} />
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-1">3 concentric donuts showing layered scores</span>
                </GlassCard>
              </div>
              {/* Summary Cards */}
              <div className="lg:col-span-3 grid grid-cols-2 gap-3">
                <SummaryCard title="MCQ Score" value={<AnimatedNumber value={overall.mcqPct} suffix="%" />} subtitle={`${overall.mcqObt}/${overall.mcqMax}`} icon="📝" accentColor={C.mcq} sparkData={units.map(u => u.mcqPct)} calcDesc="Marks obtained / total marks of attempted MCQ tests x 100" />
                <SummaryCard title="Coding Score" value={<AnimatedNumber value={overall.codPct} suffix="%" />} subtitle={`${overall.codObt}/${overall.codMax}`} icon="💻" accentColor={C.coding} sparkData={units.map(u => u.codPct)} calcDesc="Marks obtained / total marks of attempted Coding tests x 100" />
                <SummaryCard title="Completion" value={<AnimatedNumber value={overall.completion} suffix="%" />} subtitle={`${overall.completed}/${overall.total} tests`} icon="✅" accentColor={C.blue} calcDesc="Tests attempted / total available practice tests x 100" />
                <SummaryCard title="Aced (80%+)" value={<AnimatedNumber value={funnel.scored80} />} subtitle={`of ${funnel.attempted} attempted`} icon="🏆" accentColor={C.yellow} calcDesc="Count of tests where best attempt scored >= 80%" />
              </div>
            </div>

            {/* Achievements */}
            <GlassCard className="p-5">
              <h3 className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Award size={16} className="text-yellow-500" />Achievements</h3>
              <AchievementBadges data={analyticsData} />
            </GlassCard>

            {/* Performance Insights + Improvement Velocity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Brain size={16} className="text-purple-500" />Performance Insights</h3>
                <AIInsights data={analyticsData} />
              </GlassCard>
              <GlassCard className="p-5">
                <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-green-500" />Improvement Velocity</h3>
                <ImprovementVelocity data={analyticsData} />
              </GlassCard>
            </div>

            {/* Skill Matrix + Funnel + Histogram */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <GlassCard className="p-5">
                <h3 className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Layers size={16} className="text-orange-500" />Skill Matrix</h3>
                <SkillMatrix units={units} />
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-3 text-center">Green = strong, Red = weak, Gray = unattempted</p>
              </GlassCard>
              <GlassCard className="p-5 flex flex-col items-center">
                <h3 className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100 mb-3">Test Funnel</h3>
                <FunnelChart total={funnel.total} attempted={funnel.attempted} passed={funnel.scored50} aced={funnel.scored80} height={180} />
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-2 text-center">Progression from total to attempted to scored 50%+ to 80%+</p>
              </GlassCard>
              <GlassCard className="p-5">
                <h3 className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100 mb-3">Score Distribution</h3>
                <HistogramChart data={allScores} color={C.orange} height={165} />
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-2 text-center">How scores spread across 5 ranges</p>
              </GlassCard>
            </div>

            {/* 3 Bottom Donuts: Overall, MCQ, Coding */}
            <GlassCard className="p-5">
              <h3 className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100 mb-4 text-center">Score Overview</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CustomDonutChart percentage={overall.overallPct} color={C.orange} label="Overall" size={150} strokeWidth={12} />
                <CustomDonutChart percentage={overall.mcqPct} color={C.mcq} label="MCQ" size={150} strokeWidth={12} />
                <CustomDonutChart percentage={overall.codPct} color={C.coding} label="Coding" size={150} strokeWidth={12} />
              </div>
            </GlassCard>

            {/* Bar + Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><BarChart3 className="text-orange-500" size={16} />Unit Performance</h3>
                <CustomBarChart data={barData} keys={['MCQ', 'Coding']} colors={[C.mcq, C.coding]} />
              </GlassCard>
              <GlassCard className="p-5">
                <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Target className="text-orange-500" size={16} />Strength Radar</h3>
                {radarData.length >= 3 ? <CustomRadarChart data={radarData} size={260} color={C.orange} /> : <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">Need 3+ units for radar</div>}
              </GlassCard>
            </div>

            {/* Scatter + Butterfly */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-1">MCQ vs Coding Correlation</h3>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium mb-3">Each dot = topic with both scores. Diagonal line = perfectly balanced.</p>
                {scatterData.length > 0 ? <ScatterPlot data={scatterData} height={260} /> : <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">No topics with both scores yet</div>}
              </GlassCard>
              <GlassCard className="p-5">
                <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3">MCQ vs Coding</h3>
                <ButterflyChart data={butterflyData} height={Math.max(200, butterflyData.length * 50)} />
              </GlassCard>
            </div>

            {/* Polar + Histogram */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3">Polar Map</h3>
                <PolarAreaChart data={polarData} size={240} />
              </GlassCard>
              <GlassCard className="p-5">
                <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3">Score Spread</h3>
                <HistogramChart data={allScores} color={C.orange} height={190} />
              </GlassCard>
            </div>

            {/* Heatmap */}
            <GlassCard className="p-5">
              <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Flame className="text-orange-500" size={16} />Heatmap</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {units.flatMap(u => u.subUnits.map(s => <HeatmapTile key={`${u.id}-${s.id}`} name={s.name} pct={s.overallPct} unitShort={u.short} />))}
              </div>
            </GlassCard>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Trophy className="text-yellow-500" size={16} />Top Strengths</h3>
                <div className="space-y-2">{strengths.length ? strengths.map((s, i) => <StrengthItem key={i} rank={i + 1} name={s.name} percentage={s.pct} color={C.mcq} type={`${s.type} | ${s.unit}`} />) : <p className="text-gray-500 text-sm italic">No data</p>}</div>
              </GlassCard>
              <GlassCard className="p-5">
                <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><AlertTriangle className="text-red-500" size={16} />Weaknesses</h3>
                <div className="space-y-2">{weaknesses.length ? weaknesses.map((s, i) => <StrengthItem key={i} rank={i + 1} name={s.name} percentage={s.pct} color={C.red} type={`${s.type} | ${s.unit}`} />) : <p className="text-gray-500 text-sm italic">No data</p>}</div>
              </GlassCard>
            </div>

            {/* Unit Cards */}
            <div>
              <h3 className="text-base font-bold mb-3 flex items-center gap-2"><Star className="text-orange-500" size={16} />Drill Into Units</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {units.map((u, i) => {
                  const ia = selectedUnit === u.id;
                  return (
                    <GlassCard key={u.id} onClick={() => setSelectedUnit(ia ? null : u.id)} className={`p-4 ${ia ? 'border-orange-500/50' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-orange-500 uppercase tracking-wider">Unit {i + 1}</span>
                        <ChevronRight className={`text-gray-400 transition-transform duration-200 ${ia ? 'rotate-90 text-orange-500' : ''}`} size={14} />
                      </div>
                      <h4 className="text-[13px] font-semibold text-gray-900 mb-3 line-clamp-2">{u.name}</h4>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[{ v: u.overallPct, l: 'All', c: 'text-orange-500' }, { v: u.mcqPct, l: 'MCQ', c: 'text-green-600' }, { v: u.codPct, l: 'Cod', c: 'text-blue-600' }].map(x => (
                          <div key={x.l} className="text-center p-1.5 rounded-lg bg-gray-50"><div className={`text-base font-bold ${x.c}`}>{x.v}%</div><div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium uppercase">{x.l}</div></div>
                        ))}
                      </div>
                      <div className="mt-2 h-0.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-blue-500 rounded-full transition-all duration-700" style={{ width: `${u.overallPct}%` }} />
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>

            {/* Expanded unit */}
            {selUnit && (
              <GlassCard className="p-5 border-orange-500/30 space-y-5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[13px] font-bold">📋</span>
                  <h3 className="text-base font-bold text-gray-900">{selUnit.name}</h3>
                </div>
                <LollipopChart data={selUnit.subUnits.filter(s => s.overallPct > 0).map(s => ({ name: s.name, value: s.overallPct }))} color={C.orange} />
                {subBarData.length > 0 && <CustomBarChart data={subBarData} keys={['MCQ', 'Coding']} colors={[C.mcq, C.coding]} height={240} />}
                <div className="rounded-xl bg-gray-50 border border-gray-200 overflow-x-auto">
                  <table className="min-w-full text-[12px] text-gray-700">
                    <thead className="bg-gray-100 text-gray-500">
                      <tr>{['#', 'Topic', 'MCQ', 'Coding', 'Overall', 'Level'].map(h => <th key={h} className="px-3 py-2.5 border-b border-gray-200 text-center text-[11px] font-semibold">{h}</th>)}</tr>
                    </thead>
                    <tbody>{selUnit.subUnits.map((s, i) => { const p = s.overallPct; const lbl = p >= 80 ? 'Strong' : p >= 50 ? 'Average' : p > 0 ? 'Weak' : '\u2014'; const clr = p >= 80 ? 'text-green-600' : p >= 50 ? 'text-yellow-600' : p > 0 ? 'text-red-600' : 'text-gray-400'; return (<tr key={s.id} className="hover:bg-blue-50/30"><td className="px-3 py-2 border-b border-gray-100 text-center text-gray-400">{i + 1}</td><td className="px-3 py-2 border-b border-gray-100 font-medium">{s.name}</td><td className="px-3 py-2 border-b border-gray-100 text-center text-green-600">{s.mcqBest ? `${s.mcqBest.percentage}%` : <span className="text-gray-400">\u2014</span>}</td><td className="px-3 py-2 border-b border-gray-100 text-center text-blue-600">{s.codBest ? `${s.codBest.percentage}%` : <span className="text-gray-400">\u2014</span>}</td><td className="px-3 py-2 border-b border-gray-100 text-center font-bold text-orange-500">{p}%</td><td className={`px-3 py-2 border-b border-gray-100 text-center font-semibold ${clr}`}>{lbl}</td></tr>) })}</tbody>
                  </table>
                </div>
                {selUnit.subUnits.filter(s => s.mcqAttempts.length > 1 || s.codAttempts.length > 1).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2"><TrendingUp className="text-yellow-500" size={14} />Trends</h4>
                    {selUnit.subUnits.filter(s => s.mcqAttempts.length > 1 || s.codAttempts.length > 1).map(s => (
                      <GlassCard key={s.id} className="p-3">
                        <h5 className="text-[13px] font-semibold text-gray-900 mb-2">{s.name}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {s.mcqAttempts.length > 1 && <div><span className="text-[9px] text-green-600 font-bold uppercase mb-1 block flex items-center gap-1"><PulseDot color={C.mcq} size={4} />MCQ</span><CustomAreaChart data={s.mcqAttempts} color={C.mcq} height={120} /></div>}
                          {s.codAttempts.length > 1 && <div><span className="text-[9px] text-blue-600 font-bold uppercase mb-1 block flex items-center gap-1"><PulseDot color={C.coding} size={4} />Coding</span><CustomAreaChart data={s.codAttempts} color={C.coding} height={120} /></div>}
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}
          </div>
        )}

        {/* ═══ WEAK POINTS ═══ */}
        {section === 'weakpoints' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Target className="text-orange-500" size={16} />Consistency Analysis</h3>
                <ConsistencyAnalysis data={analyticsData} />
              </GlassCard>
              <GlassCard className="p-5">
                <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Zap size={16} className="text-yellow-400" />Study Priority Planner</h3>
                <StudyPriorityPlanner data={analyticsData} />
              </GlassCard>
            </div>
            <GlassCard className="p-5">
              <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><TrendingUp className="text-green-500" size={16} />Learning Speed</h3>
              <ImprovementVelocity data={analyticsData} />
            </GlassCard>
            <GlassCard className="p-5">
              <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Crosshair className="text-red-400" size={16} />Weak Point Deep Dive</h3>
              <WeakPointDeepDive data={analyticsData} />
            </GlassCard>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-1">MCQ vs Coding Balance</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-3">Dots with crosshairs — diagonal = balanced</p>
                {scatterData.length > 0 ? <ScatterPlot data={scatterData} height={240} /> : <div className="h-[180px] flex items-center justify-center text-gray-500 text-sm">No topics with both scores</div>}
              </GlassCard>
              <GlassCard className="p-5">
                <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3">Score Spread</h3>
                <HistogramChart data={allScores} color={C.orange} height={190} />
              </GlassCard>
            </div>
            <GlassCard className="p-5">
              <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3"><Flame className="text-red-400 inline mr-2" size={16} />Heatmap</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {units.flatMap(u => u.subUnits.map(s => <HeatmapTile key={`${u.id}-${s.id}`} name={s.name} pct={s.overallPct} unitShort={u.short} />))}
              </div>
            </GlassCard>
            <GlassCard className="p-5">
              <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Layers size={16} className="text-orange-400" />Skill Matrix</h3>
              <SkillMatrix units={units} />
            </GlassCard>
          </div>
        )}

        {/* ═══ MCQ ═══ */}
        {section === 'mcq' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryCard title="MCQ Score" value={<AnimatedNumber value={overall.mcqPct} suffix="%" />} subtitle={`${overall.mcqObt}/${overall.mcqMax}`} icon="📝" accentColor={C.mcq} sparkData={units.map(u => u.mcqPct)} calcDesc="Sum of best MCQ marks ÷ sum of MCQ totals × 100" />
              <SummaryCard title="Best Unit" value={<AnimatedNumber value={[...units].sort((a, b) => b.mcqPct - a.mcqPct)[0]?.mcqPct || 0} suffix="%" />} subtitle={[...units].sort((a, b) => b.mcqPct - a.mcqPct)[0]?.name || '—'} icon="🏆" accentColor={C.mcq} calcDesc="Unit with highest MCQ percentage" />
              <SummaryCard title="Weakest" value={<AnimatedNumber value={[...units].filter(u => u.mcqMax > 0).sort((a, b) => a.mcqPct - b.mcqPct)[0]?.mcqPct ?? 0} suffix="%" />} subtitle={[...units].filter(u => u.mcqMax > 0).sort((a, b) => a.mcqPct - b.mcqPct)[0]?.name || '—'} icon="⚠️" accentColor={C.red} calcDesc="Unit with lowest MCQ percentage" />
              <GlassCard className="p-4"><div className="text-[9px] text-slate-600 dark:text-slate-400 font-medium font-bold uppercase tracking-wider mb-1.5">Distribution</div><HistogramChart data={allMcqScores} color={C.mcq} height={90} /></GlassCard>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard className="p-5"><h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3"><BarChart3 className="text-green-500 inline mr-2" size={16} />MCQ by Unit</h3><CustomBarChart data={units.map(u => ({ name: u.short, Score: u.mcqPct }))} keys={['Score']} colors={[C.mcq]} showLegend={false} /></GlassCard>
              <GlassCard className="p-5 flex flex-col items-center justify-center"><span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium font-bold uppercase tracking-wider mb-1">MCQ Accuracy</span><GaugeChart percentage={overall.mcqPct} size={180} label="MCQ Score" /><span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-1">Total MCQ marks obtained ÷ max × 100</span></GlassCard>
            </div>
            <GlassCard className="p-5"><h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3">🎯 MCQ Ranking</h3><LollipopChart data={units.flatMap(u => u.subUnits.filter(s => s.hasMcq && s.mcqBest).map(s => ({ name: s.name, value: s.mcqBest.percentage }))).sort((a, b) => b.value - a.value).slice(0, 15)} color={C.mcq} /></GlassCard>
            <GlassCard className="p-5">
              <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3">All MCQ Topics</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-[12px] text-gray-700">
                  <thead className="bg-gray-100 text-gray-500">
                    <tr>{['#', 'Unit', 'Topic', 'Score', 'Total', '%', 'Attempts', 'Level'].map(h => <th key={h} className="px-3 py-2.5 border-b border-gray-200 text-center text-[11px] font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>{buildMcqTableBody(units)}</tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}

        {/* ═══ CODING ═══ */}
        {section === 'coding' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryCard title="Coding Score" value={<AnimatedNumber value={overall.codPct} suffix="%" />} subtitle={`${overall.codObt}/${overall.codMax}`} icon="💻" accentColor={C.coding} sparkData={units.map(u => u.codPct)} calcDesc="Sum of best Coding marks ÷ sum of Coding totals × 100" />
              <SummaryCard title="Best Unit" value={<AnimatedNumber value={[...units].sort((a, b) => b.codPct - a.codPct)[0]?.codPct || 0} suffix="%" />} subtitle={[...units].sort((a, b) => b.codPct - a.codPct)[0]?.name || '—'} icon="🏆" accentColor={C.coding} calcDesc="Unit with highest Coding percentage" />
              <SummaryCard title="Weakest" value={<AnimatedNumber value={[...units].filter(u => u.codMax > 0).sort((a, b) => a.codPct - b.codPct)[0]?.codPct ?? 0} suffix="%" />} subtitle={[...units].filter(u => u.codMax > 0).sort((a, b) => a.codPct - b.codPct)[0]?.name || '—'} icon="⚠️" accentColor={C.red} calcDesc="Unit with lowest Coding percentage" />
              <GlassCard className="p-4"><div className="text-[9px] text-slate-600 dark:text-slate-400 font-medium font-bold uppercase tracking-wider mb-1.5">Distribution</div><HistogramChart data={allCodScores} color={C.coding} height={90} /></GlassCard>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard className="p-5"><h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3"><BarChart3 className="text-blue-500 inline mr-2" size={16} />Coding by Unit</h3><CustomBarChart data={units.map(u => ({ name: u.short, Score: u.codPct }))} keys={['Score']} colors={[C.coding]} showLegend={false} /></GlassCard>
              <GlassCard className="p-5 flex flex-col items-center justify-center"><span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium font-bold uppercase tracking-wider mb-1">Coding Accuracy</span><GaugeChart percentage={overall.codPct} size={180} label="Coding Score" /><span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-1">Total Coding marks obtained ÷ max × 100</span></GlassCard>
            </div>
            <GlassCard className="p-5"><h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-1">MCQ vs Coding per Topic</h3><p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-3">Below diagonal = coding weaker than MCQ</p>{scatterData.length > 0 ? <ScatterPlot data={scatterData} height={260} /> : <div className="h-[180px] flex items-center justify-center text-gray-500 text-sm">No topics with both scores</div>}</GlassCard>
            <GlassCard className="p-5"><h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3">Coding Ranking</h3><LollipopChart data={units.flatMap(u => u.subUnits.filter(s => s.hasCoding && s.codBest).map(s => ({ name: s.name, value: s.codBest.percentage }))).sort((a, b) => b.value - a.value).slice(0, 15)} color={C.coding} /></GlassCard>
            <GlassCard className="p-5">
              <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 mb-3">All Coding Topics</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-[12px] text-gray-700">
                  <thead className="bg-gray-100 text-gray-500">
                    <tr>{['#', 'Unit', 'Topic', 'Score', 'Total', '%', 'Attempts', 'Level'].map(h => <th key={h} className="px-3 py-2.5 border-b border-gray-200 text-center text-[11px] font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>{buildCodingTableBody(units)}</tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#1a73e8] to-[#1557b0] flex items-center justify-center shadow-lg animate-pulse">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <p className="text-sm font-medium text-gray-500 animate-pulse">Loading Student Analytics...</p>
        </div>
      </div>
    }>
      <StudentAnalyticsView />
    </Suspense>
  );
}
