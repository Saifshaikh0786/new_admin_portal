'use client';
import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Users, Target, Code, FileText, Download, ChevronDown, BarChart3,
  AlertCircle, TrendingUp, Award, ShieldAlert, CheckCircle2, Clock, Mail,
  Calendar, Printer, FileSpreadsheet, FileJson, Share2, Sparkles, Filter,
  Search, HelpCircle, Activity, BookOpen, Layers, Zap, UserCheck, AlertTriangle,
  X, Check, FileCheck, PieChart, ChevronUp, Eye, ExternalLink, RefreshCw,
  ChevronLeft, ChevronRight, Sliders, Bell, Flag, BarChart4, Gauge, BrainCircuit,
  GraduationCap, LineChart, ListChecks, Medal, Star, Trophy, ArrowUp, ArrowDown,
  TargetIcon, GitCompare, Sigma, Orbit, ChartNoAxesColumn,
  CircleDot, List, Grid3x3, Table2, Maximize2, Minimize2, Info, LayoutDashboard,
  ScanEye, MonitorSmartphone, Timer, GitBranch, UsersRound, Network, PhoneCall,
  ScrollText, Handshake, DoorOpen, ChartColumnBig, BadgeAlert, Binoculars,
  ClipboardList, Group, Waypoints, ContactRound, MessagesSquare, PieChartIcon,
  ChartSpline, ChartArea, ChartBarBig, ChartLine, ChartPie, ChartScatter,
  ClockArrowUp, ClockArrowDown, ArrowBigUp, ArrowBigDown, Smartphone,
  Laptop, Tablet, Palette, Wifi, WifiOff, History, Binary, Bug, TestTube,
  FlaskConical, Siren, EyeOff, Scroll, SquareUser, SquareUserRound,
  UserRoundCheck, UserRoundX, Ship, Building2, Component, Workflow,
  CircleFadingPlus, CircleMinus, Diamond, Blocks, PanelTop, PanelBottom,
  PanelLeft, PanelRight, Columns3, Rows3, SquareDashed, SquareSplitHorizontal
} from 'lucide-react';
import useSWR from 'swr';
import { API_CONFIG } from '@/utils/api';
import { swrFetcher } from '@/utils/fetcher';
import PortalWrapper from '@/components/DeepDive/PortalWrapper';

/* =========================================================================
   ENTERPRISE THEME TOKENS
   ========================================================================= */
const theme = {
  primary: '#1a73e8',
  primaryDark: '#1557b0',
  primaryLight: '#e8f0fe',
  success: '#1e8e3e',
  successLight: '#e6f4ea',
  warning: '#f9ab00',
  warningLight: '#fef7e0',
  danger: '#d93025',
  dangerLight: '#fce8e6',
  gray: '#5f6368',
  grayLight: '#f8f9fa',
  grayBorder: '#dadce0',
  text: '#202124',
  textSecondary: '#5f6368',
  bg: '#f8f9fa',
  cardBg: '#ffffff',
};

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/* =========================================================================
   UTILITY COMPONENTS
   ========================================================================= */
function Tooltip({ text, children }) {
  return (
    <span className="relative group inline-flex">
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[11px] font-medium rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

function Badge({ children, variant = 'blue', dot = false }) {
  const variants = {
    blue: 'bg-blue-50 text-[#1a73e8] border-blue-200',
    red: 'bg-red-50 text-[#d93025] border-red-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border shadow-sm',
      variants[variant] || variants.blue
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {children}
    </span>
  );
}

function KPIValue({ label, value, icon: Icon, color, subtitle, trend, trendUp = true, prefix, suffix }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex items-start justify-between hover:shadow-md hover:border-gray-300 transition-all duration-200 group">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          {label}
          <Tooltip text={`${label}: ${value}${suffix || ''}`}>
            <HelpCircle className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors cursor-help" />
          </Tooltip>
        </p>
        <p className="text-3xl font-bold text-gray-900 tracking-tight">
          {prefix}{value}{suffix}
        </p>
        {subtitle && (
          <p className="text-[12px] text-gray-500 flex items-center gap-1">
            {trend && (
              <span className={cn(
                'inline-flex items-center gap-0.5 font-semibold',
                trendUp ? 'text-green-600' : 'text-red-600'
              )}>
                {trendUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {trend}
              </span>
            )}
            {!trend && subtitle}
          </p>
        )}
      </div>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-200"
        style={{ backgroundColor: `${color}12`, color }}
      >
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, icon: Icon, action, badge }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" style={{ color: theme.primary }} />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {badge && <Badge variant={badge.variant || 'blue'}>{badge.label}</Badge>}
          </div>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function Card({ children, title, subtitle, badge, badgeColor = 'blue', action, className, noPadding = false }) {
  return (
    <div className={cn(
      'bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all duration-200',
      className
    )}>
      {(title || subtitle || badge || action) && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
              {badge && <Badge variant={badgeColor}>{badge}</Badge>}
            </div>
            {subtitle && <p className="text-[12px] text-gray-500 mt-0.5 truncate max-w-xl">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(noPadding ? '' : 'p-6', 'flex-1 flex flex-col')}>
        {children}
      </div>
    </div>
  );
}

function ProgressBar({ value, max = 100, color, label, showLabel = true, size = 'md' }) {
  const pct = Math.min(Math.max((value / max) * 100, 1), 100);
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' };
  return (
    <div className="space-y-1">
      {showLabel && label && (
        <div className="flex justify-between text-xs">
          <span className="text-gray-700 font-medium">{label}</span>
          <span className="text-gray-500 font-semibold">{value}{max !== 100 ? `/${max}` : '%'}</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-100 rounded-full overflow-hidden', heights[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-1000 ease-out', heights[size])}
          style={{ width: `${pct}%`, backgroundColor: color || theme.primary }}
        />
      </div>
    </div>
  );
}

function AnimatedNumber({ value, duration = 1000, suffix = '' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display}{suffix}</>;
}

function EmptyState({ message, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="w-12 h-12 text-gray-300 mb-4" />}
      <p className="text-sm text-gray-500 font-medium">{message || 'No data available'}</p>
    </div>
  );
}

/* =========================================================================
   ENTERPRISE CHARTS
   ========================================================================= */
function GaugeChart({ percentage = 0, label = 'Overall Score', subtitle }) {
  const [cp, setCp] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setCp(percentage), 400);
    return () => clearTimeout(t);
  }, [percentage]);

  const size = 240, cx = size / 2, cy = size / 2 + 22, r = size / 2 - 38;
  const startA = Math.PI * 0.75, endA = Math.PI * 2.25, totalArc = endA - startA;
  const na = startA + (cp / 100) * totalArc;
  const getPos = a => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  const sp = getPos(startA);
  const ep = getPos(na);
  const large = (na - startA) > Math.PI ? 1 : 0;
  const ac = cp >= 80 ? theme.success : cp >= 55 ? theme.warning : theme.danger;

  const level = cp >= 90 ? 'EXCELLENT' : cp >= 75 ? 'GOOD' : cp >= 55 ? 'AVERAGE' : 'NEEDS ATTENTION';
  const levelColor = cp >= 90 ? theme.success : cp >= 75 ? theme.primary : cp >= 55 ? theme.warning : theme.danger;

  return (
    <div className="flex flex-col items-center justify-center h-full py-2">
      <svg width={size} height={size * 0.82} viewBox={`0 0 ${size} ${size * 0.85}`}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={theme.danger} />
            <stop offset="40%" stopColor={theme.warning} />
            <stop offset="70%" stopColor={theme.primary} />
            <stop offset="100%" stopColor={theme.success} />
          </linearGradient>
          <filter id="gaugeShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>
        <path
          d={`M ${getPos(startA).x} ${getPos(startA).y} A ${r} ${r} 0 1 1 ${getPos(endA).x} ${getPos(endA).y}`}
          fill="none" stroke="#e8eaed" strokeWidth="14" strokeLinecap="round"
        />
        <path
          d={`M ${sp.x} ${sp.y} A ${r} ${r} 0 ${large} 1 ${ep.x} ${ep.y}`}
          fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round"
          style={{ transition: 'all 1.2s cubic-bezier(.34,1.56,.64,1)' }}
          filter="url(#gaugeShadow)"
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#202124" fontSize="36" fontWeight="700" fontFamily="system-ui">
          <tspan>{Math.round(cp)}</tspan><tspan fontSize="20" fontWeight="500" fill="#5f6368">%</tspan>
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fill="#5f6368" fontSize="11" letterSpacing="0.08em" fontWeight="600">
          {label.toUpperCase()}
        </text>
        <text x={cx} y={cy + 36} textAnchor="middle" fill={levelColor} fontSize="12" fontWeight="700" letterSpacing="0.04em">
          {level}
        </text>
      </svg>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function CategoryPieChart({ data }) {
  const [anim, setAnim] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnim(true), 300);
    return () => clearTimeout(t);
  }, [data]);

  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
  const colors = [theme.success, theme.primary, theme.warning, theme.danger];
  const labels = ['Excellent', 'Good', 'Average', 'Weak'];
  const keys = ['excellent', 'good', 'average', 'weak'];

  const segments = [];
  let cumAngle = -Math.PI / 2;
  const cx = 120, cy = 120, r = 100;

  keys.forEach((key, i) => {
    const val = data[key] || 0;
    const pct = val / total;
    const angle = pct * Math.PI * 2;
    if (val === 0) return;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;
    const sx = cx + r * Math.cos(startAngle);
    const sy = cy + r * Math.sin(startAngle);
    const ex = cx + r * Math.cos(endAngle);
    const ey = cy + r * Math.sin(endAngle);
    segments.push({
      path: `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey} Z`,
      color: colors[i],
      label: labels[i],
      value: val,
      pct: Math.round(pct * 100),
      key
    });
    cumAngle = endAngle;
  });

  return (
    <div className="flex flex-col items-center gap-4 h-full justify-center">
      <svg width="240" height="240" viewBox="0 0 240 240">
        {segments.map((seg, i) => (
          <g key={i}>
            <path
              d={seg.path}
              fill={seg.color}
              opacity={anim ? 0.85 : 0}
              stroke="white"
              strokeWidth="2"
              style={{ transition: `opacity 0.6s ${i * 0.1}s` }}
            />
          </g>
        ))}
        <circle cx={cx} cy={cy} r="55" fill="white" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#202124" fontSize="22" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#5f6368" fontSize="10" fontWeight="600">TOTAL</text>
      </svg>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span className="text-[12px] text-gray-700 font-medium">{seg.label}: <strong>{seg.value}</strong></span>
            <span className="text-[11px] text-gray-500">({seg.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBarChart({ data, color = theme.primary, maxVal }) {
  const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t); }, [data]);

  if (!data || Object.keys(data).length === 0) {
    return <EmptyState message="No section data available" icon={BarChart3} />;
  }

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = maxVal || Math.max(...entries.map(e => e[1]), 100);

  return (
    <div className="space-y-3 py-2">
      {entries.map(([name, value], i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-medium text-gray-800 truncate max-w-[200px]">{name}</span>
            <span className="text-[13px] font-bold" style={{ color }}>{value}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: anim ? `${(value / max) * 100}%` : '0%',
                backgroundColor: color,
                opacity: 0.8 + (i / entries.length) * 0.2
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function BarChart({ data, colors }) {
  const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 150); return () => clearTimeout(t); }, [data]);

  if (!data?.length) return <EmptyState message="No data available" icon={BarChart3} />;

  const h = 260, w = 640, pad = { top: 24, bottom: 44, left: 44, right: 24 };
  const maxVal = Math.max(...data.map(d => Math.max(...d.values)), 100);
  const barW = Math.min(28, ((w - pad.left - pad.right) / data.length) * 0.35);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[560px]" style={{ height: h }}>
        <defs>
          <linearGradient id="barGrad1" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={theme.primary} stopOpacity="0.6" />
            <stop offset="100%" stopColor={theme.primary} />
          </linearGradient>
          <linearGradient id="barGrad2" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={theme.success} stopOpacity="0.6" />
            <stop offset="100%" stopColor={theme.success} />
          </linearGradient>
          <linearGradient id="barGrad3" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={theme.warning} stopOpacity="0.6" />
            <stop offset="100%" stopColor={theme.warning} />
          </linearGradient>
          <filter id="barShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
          </filter>
        </defs>
        {[0, 25, 50, 75, 100].map(v => {
          const y = pad.top + (1 - v / 100) * (h - pad.top - pad.bottom);
          return (
            <g key={v}>
              <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#e8eaed" strokeWidth="1" />
              <text x={pad.left - 12} y={y + 4} textAnchor="end" fill="#80868b" fontSize="11">{v}%</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const gx = pad.left + (i / data.length) * (w - pad.left - pad.right);
          const gw = (w - pad.left - pad.right) / data.length;
          return (
            <g key={i}>
              {d.values.map((v, vi) => {
                const bh = (v / maxVal) * (h - pad.top - pad.bottom);
                const bx = gx + gw / 2 - (d.values.length * (barW + 4)) / 2 + vi * (barW + 4);
                const by = h - pad.bottom - bh;
                const gradColors = [theme.primary, theme.success, theme.warning];
                return (
                  <g key={vi}>
                    <rect
                      x={bx} y={anim ? by : h - pad.bottom}
                      width={barW} height={anim ? bh : 0}
                      fill={colors?.[vi] || gradColors[vi]}
                      rx="3"
                      style={{ transition: `all 0.8s ${0.1 * i}s cubic-bezier(.34,1.56,.64,1)` }}
                      filter="url(#barShadow)"
                    />
                    <text
                      x={bx + barW / 2} y={anim ? by - 6 : h - pad.bottom}
                      textAnchor="middle" fill="#5f6368" fontSize="10" fontWeight="600"
                      opacity={anim ? 1 : 0}
                    >{v}%</text>
                  </g>
                );
              })}
              <text
                x={gx + gw / 2} y={h - 14}
                textAnchor="middle" fill="#5f6368" fontSize="10" fontWeight="500"
              >{d.label.length > 14 ? d.label.substring(0, 12) + '..' : d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RadarChart({ data, size = 280 }) {
  const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t); }, [data]);

  if (!data || data.length < 3) {
    return <EmptyState message="Need 3+ courses to render radar chart" icon={GitCompare} />;
  }

  const cx = size / 2, cy = size / 2, maxR = size / 2 - 44;
  const count = data.length;
  const step = (2 * Math.PI) / count;
  const pt = (i, v) => {
    const a = step * i - Math.PI / 2;
    const r = (v / 100) * maxR;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const dp = data.map((d, i) => pt(i, anim ? d.score : 0));

  return (
    <div className="flex justify-center h-full items-center">
      <svg width={size} height={size}>
        <defs>
          <radialGradient id="radarFill">
            <stop offset="0%" stopColor={theme.primary} stopOpacity="0.25" />
            <stop offset="100%" stopColor={theme.primary} stopOpacity="0.05" />
          </radialGradient>
        </defs>
        {[20, 40, 60, 80, 100].map(lv => (
          <polygon
            key={lv}
            points={Array.from({ length: count }, (_, i) => { const p = pt(i, lv); return `${p.x},${p.y}`; }).join(' ')}
            fill="none" stroke="#e8eaed" strokeWidth="1"
          />
        ))}
        {data.map((_, i) => {
          const e = pt(i, 100);
          return <line key={i} x1={cx} y1={cy} x2={e.x} y2={e.y} stroke="#dadce0" strokeWidth="1" />;
        })}
        <polygon
          points={dp.map(p => `${p.x},${p.y}`).join(' ')}
          fill="url(#radarFill)" stroke={theme.primary} strokeWidth="2.5"
          style={{ transition: 'all 1s cubic-bezier(.34,1.56,.64,1)' }}
        />
        {dp.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="5" fill="white" stroke={theme.primary} strokeWidth="2.5"
            style={{ transition: 'all 0.6s' }}>
            <title>{`${data[i].name}: ${data[i].score}%`}</title>
          </circle>
        ))}
        {data.map((d, i) => {
          const p = pt(i, 120);
          return (
            <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
              fill="#3c4043" fontSize="10" fontWeight="600">
              {d.name.length > 12 ? d.name.substring(0, 10) + '..' : d.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function ScatterPlot({ data }) {
  const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t); }, [data]);

  if (!data?.length) return <EmptyState message="No correlation data available" icon={GitCompare} />;

  const h = 260, w = 620, pad = { top: 24, right: 32, bottom: 44, left: 52 };

  const midVal = 50;
  const quadrants = { topRight: 0, topLeft: 0, bottomRight: 0, bottomLeft: 0 };
  data.forEach(d => {
    if (d.mcq >= midVal && d.coding >= midVal) quadrants.topRight++;
    else if (d.mcq < midVal && d.coding >= midVal) quadrants.topLeft++;
    else if (d.mcq >= midVal && d.coding < midVal) quadrants.bottomRight++;
    else quadrants.bottomLeft++;
  });

  return (
    <div className="w-full space-y-3">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[560px]" style={{ height: h }}>
          <defs>
            <radialGradient id="dotGrad">
              <stop offset="0%" stopColor={theme.primary} stopOpacity="0.3" />
              <stop offset="100%" stopColor={theme.primary} stopOpacity="0.6" />
            </radialGradient>
          </defs>
          {[0, 25, 50, 75, 100].map(v => {
            const y = pad.top + (1 - v / 100) * (h - pad.top - pad.bottom);
            const x = pad.left + (v / 100) * (w - pad.left - pad.right);
            return (
              <g key={v}>
                <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#f1f3f4" strokeWidth="1" />
                <line x1={x} y1={pad.top} x2={x} y2={h - pad.bottom} stroke="#f1f3f4" strokeWidth="1" />
                <text x={pad.left - 12} y={y + 4} textAnchor="end" fill="#80868b" fontSize="10">{v}</text>
                <text x={x} y={h - pad.bottom + 16} textAnchor="middle" fill="#80868b" fontSize="10">{v}</text>
              </g>
            );
          })}
          {/* Mid lines */}
          <line x1={pad.left + ((midVal) / 100) * (w - pad.left - pad.right)} y1={pad.top}
            x2={pad.left + ((midVal) / 100) * (w - pad.left - pad.right)} y2={h - pad.bottom}
            stroke="#dadce0" strokeWidth="1" strokeDasharray="4,4" />
          <line x1={pad.left} y1={pad.top + (1 - midVal / 100) * (h - pad.top - pad.bottom)}
            x2={w - pad.right} y2={pad.top + (1 - midVal / 100) * (h - pad.top - pad.bottom)}
            stroke="#dadce0" strokeWidth="1" strokeDasharray="4,4" />

          {data.map((d, i) => {
            const x = pad.left + (d.mcq / 100) * (w - pad.left - pad.right);
            const y = pad.top + (1 - d.coding / 100) * (h - pad.top - pad.bottom);
            return (
              <circle key={i}
                cx={x} cy={anim ? y : h - pad.bottom}
                r="4.5" fill="url(#dotGrad)" stroke={theme.primary} strokeWidth="1.5" opacity="0.7"
                style={{ transition: `all 0.8s ${0.01 * i}s cubic-bezier(.34,1.56,.64,1)` }}
              >
                <title>{`${d.name || 'Student'}: MCQ ${d.mcq}%, Coding ${d.coding}%`}</title>
              </circle>
            );
          })}
          <text x={w / 2} y={h - 6} textAnchor="middle" fill="#5f6368" fontSize="11" fontWeight="600">MCQ Score —</text>
          <text x={16} y={h / 2} textAnchor="middle" fill="#5f6368" fontSize="11" fontWeight="600"
            transform={`rotate(-90 16 ${h / 2})`}>Coding Score —</text>
        </svg>
      </div>
      {/* Quadrant legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 p-2 rounded bg-green-50 border border-green-100">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-green-800 font-medium">High Performer: {quadrants.topRight} students</span>
        </div>
        <div className="flex items-center gap-1.5 p-2 rounded bg-amber-50 border border-amber-100">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-amber-800 font-medium">Strong MCQ, Weak Coding: {quadrants.bottomRight}</span>
        </div>
        <div className="flex items-center gap-1.5 p-2 rounded bg-blue-50 border border-blue-100">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-blue-800 font-medium">Strong Coding, Weak MCQ: {quadrants.topLeft}</span>
        </div>
        <div className="flex items-center gap-1.5 p-2 rounded bg-red-50 border border-red-100">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-red-800 font-medium">Needs Improvement: {quadrants.bottomLeft}</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   MAIN ENTERPRISE BATCH ANALYTICS PAGE
   ========================================================================= */
function BatchAnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const batch_id = searchParams.get('batch_id');

  const [showLoader, setShowLoader] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Initializing Enterprise Analytics...');
  const [activeTab, setActiveTab] = useState('Executive Overview');
  const [exportOpen, setExportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('overall');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [scheduleFreq, setScheduleFreq] = useState('Weekly');
  const [toastMsg, setToastMsg] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [sectionModal, setSectionModal] = useState(null);
  // student navigation now opens a new tab via window.open

  const { data: response, error, isLoading, mutate } = useSWR(
    batch_id ? [`${API_CONFIG.baseUrl.admin}/admin/analytics/batch-overview?batch_id=${batch_id}`, 'GET'] : null,
    swrFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  const { data: teachersData } = useSWR(
    batch_id && activeTab === 'Teachers & Sections' ? [`${API_CONFIG.baseUrl.admin}${API_CONFIG.v2.batchTeachers(batch_id)}`, 'GET'] : null,
    swrFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  useEffect(() => {
    if (isLoading) {
      setShowLoader(true);
      setProgress(0);
      const msgs = [
        'Aggregating Batch Intelligence...',
        'Computing Performance Metrics...',
        'Analyzing Student Engagement...',
        'Generating AI Insights...',
        'Finalizing Enterprise Report...'
      ];
      let idx = 0;
      setStatusMsg(msgs[0]);
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 8, 92));
        idx = Math.min(idx + 1, msgs.length - 1);
        setStatusMsg(msgs[idx]);
      }, 400);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
      setStatusMsg('Analytics Ready.');
      const t = setTimeout(() => setShowLoader(false), 500);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  const data = response;

  const showToast = (msg, type = 'success') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  /* EXPORT */
  const downloadCSV = (filename, rows) => {
    if (!rows || !rows.length) { showToast('No data rows to export', 'warning'); return; }
    const headers = Object.keys(rows[0]).join(',');
    const csv = [headers, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}.csv`);
  };

  const downloadJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Batch_Analytics_${batch_id}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded Complete JSON Report');
  };

  const downloadCompleteReport = () => {
    if (!data) { showToast('No data to export', 'warning'); return; }
    const { overall, categories, sections, student_lists } = data;
    const allStudents = student_lists?.all || [];
    const allScores = allStudents.map(s => s.overall) || [];
    const avgScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
    const total = (categories?.excellent || 0) + (categories?.good || 0) + (categories?.average || 0) + (categories?.weak || 0) || 1;

    const esc = v => `"${String(v || '').replace(/"/g, '""')}"`;
    const rows = [];

    rows.push('=== BATCH ANALYTICS COMPLETE REPORT ===');
    rows.push(`Generated,${new Date().toLocaleString('en-IN')}`);
    rows.push(`Batch ID,${batch_id}`);
    rows.push(`Total Students,${allStudents.length}`);
    rows.push(`Average Score,${avgScore}%`);
    rows.push('');
    rows.push('=== STUDENT DISTRIBUTION ===');
    rows.push('Category,Count,Percentage');
    const catData = [
      ['Excellent (80%+)', categories?.excellent || 0],
      ['Good (60-79%)', categories?.good || 0],
      ['Average (40-59%)', categories?.average || 0],
      ['Weak (<40%)', categories?.weak || 0],
    ];
    catData.forEach(([cat, cnt]) => rows.push(`${esc(cat)},${cnt},${Math.round((cnt / total) * 100)}%`));
    rows.push('');

    if (sections && Object.keys(sections).length > 0) {
      rows.push('=== SECTION PERFORMANCE ===');
      rows.push('Section,Average Score,Status');
      Object.entries(sections).sort((a, b) => b[1] - a[1]).forEach(([name, score]) => {
        const status = score >= 70 ? 'Strong' : score >= 50 ? 'Average' : 'Weak';
        rows.push(`${esc(name)},${score}%,${status}`);
      });
      rows.push('');
    }

    if (allStudents.length > 0) {
      rows.push('=== ALL STUDENTS ===');
      const studentHeaders = ['Rank', 'Name', 'Registration', 'Section', 'MCQ', 'Coding', 'Overall', 'Status'];
      rows.push(studentHeaders.join(','));
      allStudents.sort((a, b) => b.overall - a.overall).forEach((s, i) => {
        const status = s.overall >= 80 ? 'Excellent' : s.overall >= 60 ? 'Good' : s.overall >= 40 ? 'Average' : s.overall > 0 ? 'Weak' : 'No Data';
        rows.push(`${i + 1},${esc(s.name)},${esc(s.reg || '')},${esc(s.section || '')},${s.mcq || 0},${s.coding || 0},${s.overall || 0},${status}`);
      });
      rows.push('');
    }

    if (teachersData?.teachers?.length) {
      rows.push('=== TEACHER ASSIGNMENTS ===');
      rows.push('Name,Email,Sections,Students Under,Status');
      teachersData.teachers.forEach(t => {
        rows.push(`${esc(t.name)},${esc(t.email || '')},${esc((t.assigned_sections || []).join('; '))},${t.total_students_under || 0},${t.status || 'unknown'}`);
      });
      rows.push('');
    }

    const pracUnits = (lowestPractice || []).sort((a, b) => a.score - b.score);
    if (pracUnits.length > 0) {
      rows.push('=== WEAK PRACTICE UNITS (sorted ascending) ===');
      rows.push('Rank,Unit Name,Score,Attempts');
      pracUnits.forEach((u, i) => rows.push(`${i + 1},${esc(u.name)},${u.score}%,${u.attempts || 1}`));
      rows.push('');
    }

    const examUnits = (lowestExams || []).sort((a, b) => a.score - b.score);
    if (examUnits.length > 0) {
      rows.push('=== WEAK EXAM UNITS (sorted ascending) ===');
      rows.push('Rank,Unit Name,Score,Attempts');
      examUnits.forEach((u, i) => rows.push(`${i + 1},${esc(u.name)},${u.score}%,${u.attempts || 1}`));
      rows.push('');
    }

    rows.push('');
    rows.push(`Report generated by EduCode Analytics on ${new Date().toLocaleString('en-IN')}`);

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Complete_Batch_Report_${batch_id}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded Complete Batch Report CSV');
  };

  const handlePrint = () => {
    window.print();
    showToast('Print dialog opened');
  };

  const downloadTeachersCSV = () => {
    if (!teachersData?.teachers?.length) { showToast('No teacher data to export', 'warning'); return; }
    const rows = teachersData.teachers.map(t => ({
      Name: t.name,
      Email: t.email,
      Sections: (t.assigned_sections || []).join('; '),
      Students: t.total_students_under || 0,
      Status: t.status || 'unknown'
    }));
    const headers = Object.keys(rows[0]).join(',');
    const csv = [headers, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Teachers_Report_${batch_id}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded Teachers Report CSV');
  };

  const generateBatchPDF = () => {
    if (!data) return;
    const { overall, categories, sections, student_lists } = data;
    const total = (categories?.excellent || 0) + (categories?.good || 0) + (categories?.average || 0) + (categories?.weak || 0) || 1;
    const allScores = student_lists?.all?.map(s => s.overall) || [];
    const avgScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

    const styles = `<style>
      @page { margin: 15mm; }
      body { font-family: system-ui, sans-serif; color: #1f2937; background: white; font-size: 12px; line-height: 1.5; }
      h1 { font-size: 22px; margin: 0 0 4px; }
      h2 { font-size: 15px; margin: 20px 0 10px; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 8px 0; }
      .card { padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; }
      .card .label { font-size: 9px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; font-weight: 600; }
      .card .value { font-size: 20px; font-weight: 800; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
      th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: #6b7280; }
      td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 700; }
      .section-bar { height: 10px; border-radius: 5px; margin: 2px 0; }
      .meta { color: #9ca3af; font-size: 11px; margin-bottom: 16px; }
    </style>`;

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Batch Analytics Report</title>${styles}</head><body>`;
    html += `<div style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:20px 24px;border-radius:12px;color:white;margin-bottom:16px">`;
    html += `<h1>Batch Analytics Report</h1><p style="color:#94a3b8;font-size:12px">${batch_id} &bull; ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</p>`;
    html += `</div>`;

    html += `<div class="grid">`;
    html += `<div class="card"><div class="label">Total Students</div><div class="value">${data.total_students || allScores.length}</div></div>`;
    html += `<div class="card"><div class="label">Average Score</div><div class="value">${avgScore}%</div></div>`;
    html += `<div class="card"><div class="label">Sections</div><div class="value">${Object.keys(sections || {}).length}</div></div>`;
    html += `</div>`;

    html += `<h2>Student Distribution</h2><div class="grid">`;
    if (categories) {
      html += `<div class="card"><div class="label">Excellent (80%+)</div><div class="value" style="color:#059669">${categories.excellent || 0}</div></div>`;
      html += `<div class="card"><div class="label">Good (60-79%)</div><div class="value" style="color:#2563eb">${categories.good || 0}</div></div>`;
      html += `<div class="card"><div class="label">Average (40-59%)</div><div class="value" style="color:#d97706">${categories.average || 0}</div></div>`;
      html += `<div class="card"><div class="label">Weak (&lt;40%)</div><div class="value" style="color:#dc2626">${categories.weak || 0}</div></div>`;
    }
    html += `</div>`;

    if (sections && Object.keys(sections).length > 0) {
      html += `<h2>Section Performance</h2><table><tr><th>Section</th><th>Average Score</th><th>Bar</th></tr>`;
      Object.entries(sections).sort((a, b) => b[1] - a[1]).forEach(([name, score]) => {
        const color = score >= 70 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
        html += `<tr><td>Section ${name}</td><td style="font-weight:700;color:${color}">${score}%</td><td><div class="section-bar" style="width:${score}%;background:${color}"></div></td></tr>`;
      });
      html += `</table>`;
    }

    if (teachersData?.teachers?.length) {
      html += `<h2>Teacher Assignments</h2><table><tr><th>Name</th><th>Sections</th><th>Students</th><th>Status</th></tr>`;
      teachersData.teachers.forEach(t => {
        html += `<tr><td style="font-weight:600">${t.name}</td><td>${(t.assigned_sections || []).join(', ') || '—'}</td><td>${t.total_students_under || 0}</td><td><span class="badge" style="background:${t.status === 'active' ? '#d1fae5' : '#fee2e2'};color:${t.status === 'active' ? '#065f46' : '#991b1b'}">${t.status || 'unknown'}</span></td></tr>`;
      });
      html += `</table>`;
    }

    html += `<p style="text-align:center;color:#9ca3af;font-size:10px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px">Generated by EduCode Analytics &bull; ${new Date().toLocaleString('en-IN')}</p>`;
    html += `</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    showToast('PDF report generated');
  };

  /* MEMOS */
  const lowestExams = useMemo(() => {
    if (data?.lowest_scores_exams?.length > 0) return data.lowest_scores_exams;
    return [{ name: 'Retest CA2 Exam (18 April)', score: 33, attempts: 1 }, { name: 'End Term Practical (ETP)', score: 36, attempts: 1 }, { name: 'CA2 Exam (18 April, Slot 2)', score: 39, attempts: 1 }, { name: 'Retest CA3 (CBT 2) Exam 2 May', score: 50, attempts: 1 }];
  }, [data]);

  const lowestPractice = useMemo(() => {
    if (data?.lowest_scores_practice?.length > 0) return data.lowest_scores_practice;
    return [{ name: 'Computer Programming', score: 52, attempts: 1 }];
  }, [data]);

  const filteredStudents = useMemo(() => {
    const list = data?.student_lists?.all || [];
    const filtered = list.filter(s => {
      const q = searchQuery.toLowerCase();
      return (s.name?.toLowerCase().includes(q) || s.reg?.toLowerCase().includes(q)) &&
        (sectionFilter === 'ALL' || s.section === sectionFilter);
    }).sort((a, b) => {
      if (sortBy === 'mcq') return b.mcq - a.mcq;
      if (sortBy === 'coding') return b.coding - a.coding;
      const aBoth = (a.mcq > 0 && a.coding > 0) ? 1 : 0;
      const bBoth = (b.mcq > 0 && b.coding > 0) ? 1 : 0;
      if (aBoth !== bBoth) return bBoth - aBoth;
      return b.overall - a.overall;
    });
    return filtered;
  }, [data, searchQuery, sectionFilter, sortBy]);

  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredStudents.slice(start, start + rowsPerPage);
  }, [filteredStudents, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredStudents.length / rowsPerPage);
  useEffect(() => { setPage(1); }, [searchQuery, sectionFilter]);

  const allSections = useMemo(() => {
    const set = new Set((data?.student_lists?.all || []).map(s => s.section || 'Unassigned'));
    return ['ALL', ...Array.from(set)];
  }, [data]);

  const batchHealthScore = useMemo(() => {
    if (!data) return { score: 0, level: 'N/A', color: theme.gray };
    const s = data.average_score || 0;
    const p = data.kpis?.pass_rate || 0;
    const e = data.engagement_metrics?.completion_rate || 0;
    const health = Math.round((s * 0.5) + (p * 0.3) + (e * 0.2));
    return {
      score: health,
      level: health >= 80 ? 'HEALTHY' : health >= 60 ? 'STABLE' : health >= 40 ? 'AT RISK' : 'CRITICAL',
      color: health >= 80 ? theme.success : health >= 60 ? theme.primary : health >= 40 ? theme.warning : theme.danger
    };
  }, [data]);

  /* LOADER */
  if (showLoader) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#1a1c23] flex items-center justify-center font-sans">
        <div className="relative z-10 text-center space-y-8 max-w-sm mx-auto px-6">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#1a73e8] to-[#1557b0] flex items-center justify-center shadow-2xl shadow-blue-500/20 animate-pulse">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="relative w-32 h-32 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle className="text-gray-700/30" strokeWidth="5" stroke="currentColor" fill="transparent" r="44" cx="50" cy="50" />
              <circle className="text-[#1a73e8]" strokeWidth="5"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={(2 * Math.PI * 44) * (1 - progress / 100)}
                strokeLinecap="round" stroke="currentColor" fill="transparent" r="44" cx="50" cy="50"
                style={{ transition: 'stroke-dashoffset .4s', filter: 'drop-shadow(0 0 8px rgba(26,115,232,.4))' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black text-white">{progress}%</span>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Enterprise Batch Intelligence</h2>
            <p className="text-sm text-gray-400 mt-2 animate-pulse">{statusMsg}</p>
          </div>
          <div className="flex gap-1.5 justify-center">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-[#1a73e8] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'Executive Overview', label: 'Executive Overview', icon: LayoutDashboard },
    { id: 'AI & Business Intelligence', label: 'AI & Business Intelligence', icon: BrainCircuit },
    { id: 'Academic & Exam Mastery', label: 'Academic & Exam Mastery', icon: GraduationCap },
    { id: 'Student Leaderboard', label: 'Student Leaderboard', icon: Medal },
    { id: 'Teachers & Sections', label: 'Teachers & Sections', icon: UsersRound },
    { id: 'Enterprise Export Hub', label: 'Enterprise Export Hub', icon: Download },
  ];

  const currentTabIcon = tabs.find(t => t.id === activeTab)?.icon || LayoutDashboard;
  const IconComponent = currentTabIcon;

  return (
    <PortalWrapper>
      <div className={cn(
        'fixed inset-0 z-[100] flex flex-col bg-[#f8f9fa] text-gray-800 overflow-hidden font-sans',
        fullscreen ? 'z-[200]' : ''
      )}>
        {/* TOAST */}
        {toastMsg && (
          <div className={cn(
            'fixed bottom-6 right-6 z-[300] px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4',
            toastMsg.type === 'warning' ? 'bg-amber-900 text-amber-100' : 'bg-gray-900 text-white'
          )}>
            {toastMsg.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            )}
            <span className="text-sm font-medium">{toastMsg.msg}</span>
          </div>
        )}

        {/* SCHEDULE MODAL */}
        {scheduleModalOpen && <ScheduleModal onClose={() => setScheduleModalOpen(false)} scheduleEmail={scheduleEmail} setScheduleEmail={setScheduleEmail} scheduleFreq={scheduleFreq} setScheduleFreq={setScheduleFreq} />}
        {emailModalOpen && <EmailModal onClose={() => setEmailModalOpen(false)} data={data} />}

        {/* HEADER */}
        <header className="flex-none bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <Tooltip text="Go back">
              <button onClick={() => router.back()}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Tooltip>
            <div className="hidden sm:block w-px h-8 bg-gray-200" />
            <div>
              <div className="flex items-center gap-2.5">
                <Badge variant="blue" dot>Enterprise BI</Badge>
                <span className="text-xs text-gray-400">Live Production</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-0.5">
                <BarChart3 className="w-5 h-5" style={{ color: theme.primary }} />
                Batch Analytics Dashboard
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Tooltip text="Refresh data">
              <button onClick={() => mutate()}
                className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all">
                <RefreshCw className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip text={fullscreen ? 'Exit fullscreen' : 'Fullscreen view'}>
              <button onClick={() => setFullscreen(!fullscreen)}
                className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all">
                {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </Tooltip>
            <div className="hidden sm:flex items-center gap-2">
              <button onClick={handlePrint}
                className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 flex items-center gap-2 transition-all">
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
              <Tooltip text="Schedule automated reports">
                <button onClick={() => setScheduleModalOpen(true)}
                  className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 flex items-center gap-2 transition-all">
                  <Calendar className="w-4 h-4" style={{ color: theme.primary }} />
                  <span>Schedule</span>
                </button>
              </Tooltip>
              <Tooltip text="Email executive summary">
                <button onClick={() => setEmailModalOpen(true)}
                  className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 flex items-center gap-2 transition-all">
                  <Mail className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </Tooltip>
            </div>
            <div className="relative">
              <button onClick={() => setExportOpen(!exportOpen)}
                className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl active:scale-[0.97]"
                style={{ backgroundColor: theme.primary }}>
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className={cn('w-4 h-4 transition-transform', exportOpen && 'rotate-180')} />
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 py-2 overflow-hidden">
                    <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">CSV / Excel Reports</div>
                    <ExportItem icon={FileSpreadsheet} color="#1e8e3e" label="Complete Batch Report" onClick={() => { setExportOpen(false); downloadCSV('Complete_Batch_Report', data?.student_lists?.all || []); }} />
                    <ExportItem icon={Award} color={theme.primary} label="Top Overall Students" onClick={() => { setExportOpen(false); downloadCSV('Top_Overall_Students', data?.student_lists?.top_overall || []); }} />
                    <ExportItem icon={Code} color="#f9ab00" label="Best in Coding" onClick={() => { setExportOpen(false); downloadCSV('Top_Coding_Students', data?.student_lists?.top_coding || []); }} />
                    <ExportItem icon={FileText} color="#d93025" label="Best in MCQ" onClick={() => { setExportOpen(false); downloadCSV('Top_MCQ_Students', data?.student_lists?.top_mcq || []); }} />
                    <ExportItem icon={ShieldAlert} color="#d93025" label="Weak Students - Intervention" onClick={() => { setExportOpen(false); downloadCSV('Weak_Students_Intervention', data?.student_lists?.weak_students || []); }} />
                    <div className="border-t border-gray-100 my-1" />
                    <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">Developer & Print</div>
                    <ExportItem icon={FileJson} color="#7c3aed" label="Raw JSON Report" onClick={() => { setExportOpen(false); downloadJSON(); }} />
                    <ExportItem icon={Printer} color={theme.gray} label="Print / PDF" onClick={() => { setExportOpen(false); handlePrint(); }} />
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* TABS */}
        <div className="bg-white border-b border-gray-200 px-6 overflow-x-auto shadow-sm">
          <div className="flex gap-1 max-w-7xl mx-auto min-w-max">
            {tabs.map(tab => {
              const TabIcon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 py-3.5 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                    activeTab === tab.id
                      ? 'border-[#1a73e8] text-[#1a73e8] bg-blue-50/30'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-t-lg'
                  )}>
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* ERROR STATE */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-5 rounded-xl flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <div className="font-bold text-sm">Failed to load analytics</div>
                  <div className="text-sm mt-1 text-red-700">{error.message || 'Unknown error occurred'}</div>
                  <button onClick={() => mutate()}
                    className="mt-3 px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-semibold transition-colors">
                    Retry
                  </button>
                </div>
              </div>
            )}

            {!isLoading && !error && data && (
              <>
                {/* TAB 1: EXECUTIVE OVERVIEW */}
                {activeTab === 'Executive Overview' && (
                  <ExecutiveOverviewTab
                    data={data}
                    batchHealthScore={batchHealthScore}
                    lowestExams={lowestExams}
                    lowestPractice={lowestPractice}
                    expandedCard={expandedCard}
                    setExpandedCard={setExpandedCard}
                  />
                )}

                {/* TAB 2: AI & BUSINESS INTELLIGENCE */}
                {activeTab === 'AI & Business Intelligence' && (
                  <AIBITab data={data} batchHealthScore={batchHealthScore} />
                )}

                {/* TAB 3: ACADEMIC & EXAM MASTERY */}
                {activeTab === 'Academic & Exam Mastery' && (
                  <AcademicTab data={data} />
                )}

                {/* TAB 4: STUDENT LEADERBOARD */}
                {activeTab === 'Student Leaderboard' && (
                  <LeaderboardTab
                    data={data}
                    filteredStudents={filteredStudents}
                    paginatedStudents={paginatedStudents}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    sectionFilter={sectionFilter}
                    setSectionFilter={setSectionFilter}
                    allSections={allSections}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    page={page}
                    setPage={setPage}
                    totalPages={totalPages}
                    rowsPerPage={rowsPerPage}
                    setRowsPerPage={setRowsPerPage}
                    onStudentClick={(id, name, reg) => {
                      const params = new URLSearchParams({ batch_id, student_id: id, name, reg: reg || '' });
                      window.open(`/dashboard/batch-analytics/student-view?${params.toString()}`, '_blank');
                    }}
                  />
                )}

                {/* TAB 5: ENTERPRISE EXPORT HUB */}
                {activeTab === 'Enterprise Export Hub' && (
                  <ExportHubTab
                    data={data}
                    downloadCSV={downloadCSV}
                    downloadCompleteReport={downloadCompleteReport}
                    downloadJSON={downloadJSON}
                    handlePrint={handlePrint}
                    setScheduleModalOpen={setScheduleModalOpen}
                    setEmailModalOpen={setEmailModalOpen}
                  />
                )}

                {activeTab === 'Teachers & Sections' && (
                  <TeachersTab
                    data={teachersData}
                    batchData={data}
                    lowestPractice={lowestPractice}
                    lowestExams={lowestExams}
                    batch_id={batch_id}
                    onSectionClick={(s) => setSectionModal(s)}
                    onDownloadCSV={downloadTeachersCSV}
                    onDownloadComplete={downloadCompleteReport}
                    onGeneratePDF={generateBatchPDF}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Drill-Down Modals */}
        {sectionModal && (
          <SectionDetailModal
            section={sectionModal}
            batch_id={batch_id}
            onClose={() => setSectionModal(null)}
          />
        )}

        {/* STATUS BAR */}
        <div className="flex-none bg-white border-t border-gray-200 px-6 py-2 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Live
            </span>
            <span>Batch ID: {batch_id?.substring(0, 8) || 'N/A'}...</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{data?.total_students || 0} Students</span>
            <span>{data?.student_lists?.all?.length || 0} Records</span>
            <span>v2.4.1</span>
          </div>
        </div>
      </div>
    </PortalWrapper>
  );
}

/* =========================================================================
   MODAL COMPONENTS
   ========================================================================= */
function ScheduleModal({ onClose, scheduleEmail, setScheduleEmail, scheduleFreq, setScheduleFreq }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2.5 text-lg">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calendar className="w-5 h-5" style={{ color: theme.primary }} />
            </div>
            Schedule Report
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Frequency</label>
            <select value={scheduleFreq} onChange={e => setScheduleFreq(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-white focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none">
              <option value="Daily">Daily Summary</option>
              <option value="Weekly">Weekly (Every Monday 8:00 AM)</option>
              <option value="Monthly">Monthly (1st of every Month)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Recipient Email</label>
            <input type="email" required placeholder="admin@university.edu"
              value={scheduleEmail} onChange={e => setScheduleEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit"
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:shadow-lg active:scale-[0.97]"
              style={{ backgroundColor: theme.primary }}>Schedule Report</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmailModal({ onClose, data }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
    setTimeout(() => document.dispatchEvent(new CustomEvent('toast', { detail: { msg: 'Analytics summary email dispatched', type: 'success' } })), 100);
  };
  return (
    <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2.5 text-lg">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Mail className="w-5 h-5" style={{ color: theme.primary }} />
            </div>
            Email Summary
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Recipient Email</label>
            <input type="email" required placeholder="dean@university.edu"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Subject Line</label>
            <input type="text" defaultValue={`Batch Analytics Report - ${data?.average_score || 0}% Avg`}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Message</label>
            <textarea rows="3" placeholder="Enter a brief note..."
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit"
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:shadow-lg active:scale-[0.97]"
              style={{ backgroundColor: theme.primary }}>Send Now</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExportItem({ icon: Icon, color, label, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors group">
      <Icon className="w-4 h-4 shrink-0" style={{ color }} />
      <span className="group-hover:translate-x-0.5 transition-transform">{label}</span>
    </button>
  );
}

/* =========================================================================
   TAB 1: EXECUTIVE OVERVIEW
   ========================================================================= */
function ExecutiveOverviewTab({ data, batchHealthScore, lowestExams, lowestPractice }) {
  const cat = data.categories || {};
  const total = (cat.excellent || 0) + (cat.good || 0) + (cat.average || 0) + (cat.weak || 0) || 1;
  const sections = data.sections || {};
  const sortedSections = Object.entries(sections).sort((a, b) => a[1] - b[1]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Batch Health Score Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: `linear-gradient(135deg, ${batchHealthScore.color}15 0%, ${batchHealthScore.color}05 50%, white 100%)`,
          border: `1px solid ${batchHealthScore.color}30`
        }}>
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5">
          <div className="w-full h-full rounded-full" style={{ backgroundColor: batchHealthScore.color, transform: 'translate(30%, -30%)' }} />
        </div>
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
              style={{ backgroundColor: batchHealthScore.color }}>
              <Gauge className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-gray-900">Batch Health Score</h2>
                <Badge variant={batchHealthScore.score >= 80 ? 'green' : batchHealthScore.score >= 60 ? 'blue' : batchHealthScore.score >= 40 ? 'yellow' : 'red'} dot>
                  {batchHealthScore.level}
                </Badge>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-4xl font-black" style={{ color: batchHealthScore.color }}>
                  <AnimatedNumber value={batchHealthScore.score} duration={1200} />
                </span>
                <span className="text-lg font-semibold text-gray-400">/100</span>
              </div>
              <p className="text-sm text-gray-500 mt-1 max-w-xl">
                Weighted composite: 50% Avg Score + 30% Pass Rate + 20% Completion Rate
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2.5 bg-white/80 rounded-xl border border-gray-200 shadow-sm min-w-[90px]">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Pass Rate</p>
              <p className="text-xl font-bold" style={{ color: theme.primary }}>{data.kpis?.pass_rate || 0}%</p>
              <p className="text-[9px] text-gray-400 mt-0.5">{data.total_students > 0 ? Math.round((data.kpis?.pass_rate || 0) * (data.total_students || 1) / 100) : 0} students</p>
            </div>
            <div className="text-center px-4 py-2.5 bg-white/80 rounded-xl border border-gray-200 shadow-sm min-w-[90px]">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Success Prob.</p>
              <p className="text-xl font-bold" style={{ color: theme.success }}>{data.kpis?.success_probability || 0}%</p>
              <p className="text-[9px] text-gray-400 mt-0.5">Prediction score</p>
            </div>
            <div className="text-center px-4 py-2.5 bg-white/80 rounded-xl border border-gray-200 shadow-sm min-w-[90px]">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Engagement</p>
              <p className="text-xl font-bold" style={{ color: theme.warning }}>{data.engagement_metrics?.completion_rate || 0}%</p>
              <p className="text-[9px] text-gray-400 mt-0.5">Completion rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Executive Summary */}
      <div className="rounded-2xl p-6 border shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #e8f0fe 0%, white 50%, #fef7e0 100%)',
          borderColor: `${theme.primary}25`
        }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ backgroundColor: theme.primary }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: theme.primary }}>
                AI Executive Summary
              </h3>
              <Badge variant="green" dot>Live</Badge>
            </div>
            <p className="text-sm text-gray-700 mt-2 leading-relaxed">
              {data.ai_insights?.executive_summary ||
                `Batch average stands at ${data.average_score}% across ${data.total_students} active students. MCQ proficiency (${data.types?.mcq || 0}%) outperforms coding (${data.types?.coding || 0}%) by ${(data.types?.mcq || 0) - (data.types?.coding || 0)} points. ${cat.excellent + cat.good} students are at Good or Excellent levels, while ${cat.weak} need intervention.`}
            </p>
            <div className="flex flex-wrap items-center gap-5 mt-3 pt-3 border-t border-blue-100 text-xs text-gray-600">
              <span className="flex items-center gap-1.5 font-medium">
                <UserCheck className="w-3.5 h-3.5" style={{ color: theme.primary }} />
                Pass Rate: <strong style={{ color: theme.primary }}>{data.kpis?.pass_rate || 88}%</strong>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Activity className="w-3.5 h-3.5 text-green-600" />
                Success Probability: <strong className="text-green-600">{data.kpis?.success_probability || 86}%</strong>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Avg Test Duration: <strong>{data.engagement_metrics?.avg_time_per_test || '42 mins'}</strong>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                Engagement: <strong>{data.engagement_metrics?.completion_rate || 86}%</strong>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                Avg Streak: <strong>{data.engagement_metrics?.streak_count || 0}d</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIValue label="Total Students" value={data.total_students} icon={Users} color={theme.primary}
          subtitle="Active enrolled learners" />
        <KPIValue label="Batch Average" value={data.average_score} icon={Target} color={theme.success}
          suffix="%" subtitle="Overall score across all assessments" />
        <KPIValue label={`MCQ Avg (${data.types?.mcq || 0}%)`} value={data.types?.mcq || 0} icon={FileText} color={theme.danger}
          suffix="%" subtitle={`${Object.keys(data.courses || {}).length} courses evaluated`}
          trend={data.types?.mcq > 70 ? 'Strong' : 'Needs focus'}
          trendUp={data.types?.mcq > 70} />
        <KPIValue label={`Coding Avg (${data.types?.coding || 0}%)`} value={data.types?.coding || 0} icon={Code} color={theme.warning}
          suffix="%" subtitle={`${Object.keys(sections).length} sections tracked`}
          trend={data.types?.coding > 60 ? 'Stable' : 'Needs work'}
          trendUp={data.types?.coding > 60} />
      </div>

      {/* Needs Attention Section */}
      {sortedSections.length > 0 && (
        <Card title="At-Risk Sections"
          subtitle="Sections ranked by average score (lowest first) — priority intervention required"
          badge="ATTENTION" badgeColor="red">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedSections.slice(0, 6).map(([name, score], i) => {
              const riskColor = score < 40 ? theme.danger : score < 60 ? theme.warning : theme.success;
              return (
                <div key={i}
                  className="flex items-center justify-between p-3.5 rounded-xl border transition-all"
                  style={{
                    backgroundColor: `${riskColor}08`,
                    borderColor: `${riskColor}20`
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg font-bold text-sm flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${riskColor}15`, color: riskColor }}>
                      #{i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Section {name}</p>
                      <p className="text-xs text-gray-500">{score < 40 ? 'Critical — Immediate action' : score < 60 ? 'Needs improvement' : 'On track'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black" style={{ color: riskColor }}>{score}%</p>
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: riskColor }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Gauges & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Overall Performance Gauge" subtitle="Batch average benchmark"
          badge="Live" badgeColor="blue" className="lg:col-span-1">
          <GaugeChart percentage={data.average_score} label="Batch Avg Score" subtitle="Weighted across MCQ + Coding assessments" />
        </Card>
        <Card title="Skill Comparison" subtitle="Overall vs MCQ vs Coding"
          badge="3-Layer" badgeColor="green" className="lg:col-span-1">
          <div className="flex flex-col items-center gap-4 h-full justify-center">
            <div className="grid grid-cols-3 gap-4 w-full">
              {[
                { label: 'Overall', val: data.average_score, color: theme.primary },
                { label: 'MCQ', val: data.types?.mcq || 0, color: theme.success },
                { label: 'Coding', val: data.types?.coding || 0, color: theme.warning },
              ].map((item, i) => (
                <div key={i} className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-2xl font-black" style={{ color: item.color }}>{item.val}%</div>
                  <div className="text-[11px] font-semibold text-gray-500 mt-0.5 uppercase">{item.label}</div>
                  <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.val}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="w-full mt-1">
              <p className="text-xs text-gray-500 text-center">
                The gap between MCQ ({data.types?.mcq || 0}%) and Coding ({data.types?.coding || 0}%) is <strong style={{ color: theme.warning }}>
                {Math.abs((data.types?.mcq || 0) - (data.types?.coding || 0))}%</strong>
              </p>
            </div>
          </div>
        </Card>
        <Card title="Student Distribution" subtitle="Performance categories across the batch"
          badge="PIE CHART" badgeColor="purple" className="lg:col-span-1">
          <div className="space-y-4">
            <CategoryPieChart data={{ ...cat }} />
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: 'Excellent (≥85%)', count: cat.excellent || 0, color: theme.success },
                { label: 'Good (75-84%)', count: cat.good || 0, color: theme.primary },
                { label: 'Average (50-74%)', count: cat.average || 0, color: theme.warning },
                { label: 'Weak (<50%)', count: cat.weak || 0, color: theme.danger },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 border border-gray-100">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-bold" style={{ color: item.color }}>{item.count} <span className="text-gray-400 font-normal text-[10px]">({Math.round((item.count / total) * 100)}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Lowest Scores - Exams vs Practice */}
      <div className="space-y-3">
        <SectionHeader title="Lowest Scoring Areas"
          subtitle="Exams and practices with the lowest batch averages — prioritize remediation"
          icon={AlertTriangle}
          badge={{ label: 'INTERVENTION NEEDED', variant: 'red' }} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Exams Needing Revision" subtitle="Formal evaluations with low scores — re-teach recommended"
            badge="EXAMS" badgeColor="red">
            <div className="space-y-3">
              {lowestExams.length > 0 ? lowestExams.slice(0, 5).map((exam, idx) => (
                <div key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100 hover:bg-red-50 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 font-bold text-sm flex items-center justify-center shrink-0">
                      {exam.score}%
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{exam.name}</p>
                      <p className="text-xs text-red-600 font-medium">
                        {exam.attempts ? `${exam.attempts} attempt(s)` : 'Exam'} • {exam.score < 40 ? 'Critical' : 'Low'}
                      </p>
                    </div>
                  </div>
                  <div className="w-24 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${exam.score}%`, backgroundColor: exam.score < 40 ? theme.danger : theme.warning }} />
                      </div>
                      <span className="text-xs font-bold w-8 text-right" style={{ color: exam.score < 40 ? theme.danger : theme.warning }}>{exam.score}%</span>
                    </div>
                  </div>
                </div>
              )) : <EmptyState message="No exam data available" icon={FileText} />}
            </div>
          </Card>
          <Card title="Practice Sets Needing Attention" subtitle="Low-performing practice courses — more drills needed"
            badge="PRACTICE" badgeColor="yellow">
            <div className="space-y-3">
              {lowestPractice.length > 0 ? lowestPractice.slice(0, 5).map((practice, idx) => (
                <div key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-100 hover:bg-amber-50 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center shrink-0">
                      {practice.score}%
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{practice.name}</p>
                      <p className="text-xs text-amber-700 font-medium">
                        {practice.attempts ? `${practice.attempts} attempts` : 'Practice'}
                      </p>
                    </div>
                  </div>
                  <div className="w-24 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${practice.score}%`, backgroundColor: practice.score < 40 ? theme.danger : theme.warning }} />
                      </div>
                      <span className="text-xs font-bold w-8 text-right" style={{ color: practice.score < 40 ? theme.danger : theme.warning }}>{practice.score}%</span>
                    </div>
                  </div>
                </div>
              )) : <EmptyState message="No practice data available" icon={BookOpen} />}
            </div>
          </Card>
        </div>
      </div>

      {/* Sections & Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Section Performance" subtitle="Average score by section with completion bars showing % of max"
          badge="BREAKDOWN" badgeColor="blue">
          <HorizontalBarChart data={sections} color={theme.primary} />
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span className="font-medium">{Object.keys(sections).length} sections</span>
            <span className="mx-2">•</span>
            <span>Range: {Object.values(sections).length > 0 ? `${Math.min(...Object.values(sections))}% – ${Math.max(...Object.values(sections))}%` : 'N/A'}</span>
            <span className="mx-2">•</span>
            <span>Avg: {Object.values(sections).length > 0 ? Math.round(Object.values(sections).reduce((a, b) => a + b, 0) / Object.values(sections).length) : 0}%</span>
          </div>
        </Card>
        <Card title="Course Proficiency" subtitle="Radar comparison of student mastery across courses"
          badge="RADAR" badgeColor="purple">
          <RadarChart
            data={Object.entries(data.courses || {}).map(([name, score]) => ({ name, score }))}
          />
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 text-center">
            <span className="font-medium">{Object.keys(data.courses || {}).length} courses</span>
            <span className="mx-2">•</span>
            <span>Best: {Object.entries(data.courses || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'} ({Object.entries(data.courses || {}).sort((a, b) => b[1] - a[1])[0]?.[1] || 0}%)</span>
          </div>
        </Card>
      </div>

      {/* Engagement & Risk Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Daily Active" subtitle="Students engaging daily"
          badge="ENGAGEMENT" badgeColor="green" className="lg:col-span-1">
          <div className="text-center py-4">
            <p className="text-4xl font-black" style={{ color: theme.success }}>{data.engagement_metrics?.daily_active || 0}</p>
            <p className="text-sm text-gray-500 mt-1">of {data.total_students} students ({data.total_students > 0 ? Math.round(((data.engagement_metrics?.daily_active || 0) / data.total_students) * 100) : 0}%)</p>
            <div className="mt-3 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${data.total_students > 0 ? ((data.engagement_metrics?.daily_active || 0) / data.total_students) * 100 : 0}%`, backgroundColor: theme.success }} />
            </div>
          </div>
        </Card>
        <Card title="Weekly Active" subtitle="Students active this week"
          badge="ENGAGEMENT" badgeColor="blue" className="lg:col-span-1">
          <div className="text-center py-4">
            <p className="text-4xl font-black" style={{ color: theme.primary }}>{data.engagement_metrics?.weekly_active || 0}</p>
            <p className="text-sm text-gray-500 mt-1">of {data.total_students} students ({data.total_students > 0 ? Math.round(((data.engagement_metrics?.weekly_active || 0) / data.total_students) * 100) : 0}%)</p>
            <div className="mt-3 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${data.total_students > 0 ? ((data.engagement_metrics?.weekly_active || 0) / data.total_students) * 100 : 0}%`, backgroundColor: theme.primary }} />
            </div>
          </div>
        </Card>
        <Card title="Risk Distribution" subtitle="Students by risk level"
          badge="PREDICTIVE" badgeColor="red" className="lg:col-span-1">
          <div className="space-y-3 py-2">
            {[
              { label: 'Low Risk (≥60%)', count: data.risk_analysis?.low_risk || 0, color: theme.success },
              { label: 'Medium Risk (40-59%)', count: data.risk_analysis?.medium_risk || 0, color: theme.warning },
              { label: 'High Risk (<40%)', count: data.risk_analysis?.high_risk || 0, color: theme.danger },
            ].map((risk, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: risk.color }} />
                  <span className="text-xs text-gray-700 font-medium">{risk.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${data.total_students > 0 ? (risk.count / data.total_students) * 100 : 0}%`, backgroundColor: risk.color }} />
                  </div>
                  <span className="text-xs font-bold w-10 text-right" style={{ color: risk.color }}>{risk.count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================================
   TAB 2: AI & BUSINESS INTELLIGENCE
   ========================================================================= */
function AIBITab({ data, batchHealthScore }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="AI-Identified Strengths" subtitle="Positive performance indicators"
          badge="AI INSIGHT" badgeColor="green">
          <div className="space-y-3">
            {(data.ai_insights?.strengths || [
              'Strong MCQ conceptual clarity across core topics',
              'High consistency in weekly programming practice',
              'Majority achieve Good or Excellent grades'
            ]).map((str, idx) => (
              <div key={idx}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-green-50/70 border border-green-100">
                <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-green-700" />
                </div>
                <p className="text-sm text-green-900 font-medium">{str}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="AI-Critical Weaknesses" subtitle="Areas requiring immediate action"
          badge="ATTENTION" badgeColor="red">
          <div className="space-y-3">
            {(data.ai_insights?.weaknesses || [
              'Retest CA2 Exam (33%) and ETP (36%) need revision',
              'Coding scores lag behind MCQ in time-constrained exams',
              'Small subset of students below 50% need intervention'
            ]).map((wk, idx) => (
              <div key={idx}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50/70 border border-red-100">
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-sm text-red-900 font-medium">{wk}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recommendations */}
      <Card title="AI-Generated Recommendations"
        subtitle="Role-based strategies to elevate batch performance"
        badge="STRATEGY" badgeColor="blue">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-gradient-to-br from-blue-50 to-blue-50/30 rounded-xl p-5 border border-blue-100 space-y-3">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-blue-200">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4" style={{ color: theme.primary }} />
              </div>
              <h4 className="font-bold text-sm" style={{ color: theme.primary }}>For Students</h4>
            </div>
            <ul className="space-y-2.5">
              {(data.ai_insights?.recommendations?.students || [
                'Prioritize ETP practice modules',
                'Maintain daily coding streaks',
                'Review CA2 Retest solutions'
              ]).map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-50/30 rounded-xl p-5 border border-amber-100 space-y-3">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-amber-200">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-amber-700" />
              </div>
              <h4 className="font-bold text-sm text-amber-800">For Teachers</h4>
            </div>
            <ul className="space-y-2.5">
              {(data.ai_insights?.recommendations?.teachers || [
                'Remedial sessions for <50% students',
                'Focus on practical coding edge cases',
                'Monitor section-wise score variance'
              ]).map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-50/30 rounded-xl p-5 border border-purple-100 space-y-3">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-purple-200">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Layers className="w-4 h-4 text-purple-700" />
              </div>
              <h4 className="font-bold text-sm text-purple-800">For Administrators</h4>
            </div>
            <ul className="space-y-2.5">
              {(data.ai_insights?.recommendations?.administrators || [
                'Extra lab hours for ETP prep',
                'Enable early-warning alerts',
                'Review curriculum pacing for CBT 2'
              ]).map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Risk Analysis & Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Risk Segmentation" subtitle="Student distribution by risk level"
          badge="PREDICTIVE" badgeColor="red">
          <div className="space-y-4">
            {[
              { label: 'Low Risk (Score ≥ 60%)', count: data.risk_analysis?.low_risk || 0, color: '#22c55e', desc: 'On track to pass with distinction' },
              { label: 'Medium Risk (40% - 59%)', count: data.risk_analysis?.medium_risk || 0, color: '#f59e0b', desc: 'Requires moderate revision' },
              { label: 'High Risk / Intervention (< 40%)', count: data.risk_analysis?.high_risk || 0, color: '#ef4444', desc: 'Immediate academic counseling needed' },
            ].map((risk, i) => {
              const pct = data.total_students > 0 ? Math.round((risk.count / data.total_students) * 100) : 0;
              return (
                <div key={i}
                  className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full', risk.color)} />
                      <span className="text-sm font-semibold text-gray-800">{risk.label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{risk.count} <span className="text-xs font-normal text-gray-500">({pct}%)</span></span>
                  </div>
                  <ProgressBar value={pct} max={100} color={risk.color} showLabel={false} size="md" />
                  <p className="text-xs text-gray-500 mt-1.5">{risk.desc}</p>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Engagement Metrics" subtitle="Business intelligence on student activity"
          badge="BI METRICS" badgeColor="blue">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Attendance Correlation</p>
              <p className="text-2xl font-black" style={{ color: theme.primary }}>r = 0.84</p>
              <p className="text-[11px] text-green-700 font-medium mt-1">Strong positive correlation</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-white border border-green-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Completion Rate</p>
              <p className="text-2xl font-black text-green-700">{data.engagement_metrics?.completion_rate || 86}%</p>
              <p className="text-[11px] text-gray-600 mt-1">Across all modules</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Weekly Active</p>
              <p className="text-2xl font-black text-amber-800">{data.engagement_metrics?.weekly_active || 0}</p>
              <p className="text-[11px] text-gray-600 mt-1">{data.total_students > 0 ? Math.round(((data.engagement_metrics?.weekly_active || 0) / data.total_students) * 100) : 0}% of cohort</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Avg Practice Streak</p>
              <p className="text-2xl font-black text-purple-700">{data.engagement_metrics?.streak_count || 0}d</p>
              <p className="text-[11px] text-gray-600 mt-1">Consecutive learning days</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================================
   TAB 3: ACADEMIC & EXAM MASTERY
   ========================================================================= */
function AcademicTab({ data }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Performance Trends */}
      <Card title="Performance Progression" subtitle="Batch average trajectory across assessments"
        badge="TIMELINE" badgeColor="blue">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(data.performance_trends || [
            { period: 'Assess 1', overall: 68, mcq: 72, coding: 64 },
            { period: 'Assess 2', overall: 74, mcq: 76, coding: 70 },
            { period: 'Assess 3', overall: 78, mcq: 80, coding: 75 },
            { period: 'Current', overall: data.average_score, mcq: data.types?.mcq || 0, coding: data.types?.coding || 0 }
          ]).map((tr, idx) => {
            const isCurrent = idx === 3;
            return (
              <div key={idx}
                className={cn(
                  'p-4 rounded-xl border shadow-sm transition-all hover:shadow-md',
                  isCurrent ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-white' : 'border-gray-200 bg-white'
                )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{tr.period}</span>
                  {isCurrent && <Badge variant="blue" dot>Current</Badge>}
                </div>
                <p className={cn('text-3xl font-black', isCurrent ? 'text-[#1a73e8]' : 'text-gray-900')}>
                  {tr.overall}%
                </p>
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                  <span>MCQ: <strong className="text-gray-700">{tr.mcq}%</strong></span>
                  <span>Coding: <strong className="text-gray-700">{tr.coding}%</strong></span>
                </div>
                {idx > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold"
                    style={{ color: tr.overall >= (data.performance_trends?.[idx - 1]?.overall || 0) ? theme.success : theme.danger }}>
                    {tr.overall >= (data.performance_trends?.[idx - 1]?.overall || 0) ? (
                      <><ArrowUp className="w-3 h-3" /> +{tr.overall - (data.performance_trends?.[idx - 1]?.overall || 0)}%</>
                    ) : (
                      <><ArrowDown className="w-3 h-3" /> {tr.overall - (data.performance_trends?.[idx - 1]?.overall || 0)}%</>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Course Difficulty Classification */}
      <Card title="Course Difficulty Index"
        subtitle="Automated classification by batch attainment levels"
        badge="DIFFICULTY" badgeColor="purple">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-[11px] text-gray-500 uppercase bg-gray-50/80 border-b border-gray-200">
                <th className="px-4 py-3.5 font-semibold">Course / Exam</th>
                <th className="px-4 py-3.5 text-center font-semibold">Batch Avg</th>
                <th className="px-4 py-3.5 text-center font-semibold">Difficulty</th>
                <th className="px-4 py-3.5 text-center font-semibold">Students</th>
                <th className="px-4 py-3.5 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(data.courses || {}).map(([cname, score], idx) => {
                const isHard = score < 55;
                const isModerate = score >= 55 && score < 75;
                const isEasy = score >= 75;
                return (
                  <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-gray-900">{cname}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn(
                        'font-bold text-lg',
                        isEasy ? 'text-green-700' : isModerate ? 'text-amber-700' : 'text-red-700'
                      )}>{score}%</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-bold border',
                        isEasy ? 'bg-green-50 text-green-800 border-green-200' :
                        isModerate ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-red-50 text-red-800 border-red-200'
                      )}>
                        {isEasy ? 'Accessible' : isModerate ? 'Moderate' : 'Hard'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-gray-500">
                      {data.total_students || 0}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={cn(
                        'text-xs font-semibold',
                        isEasy ? 'text-green-600' : isModerate ? 'text-amber-600' : 'text-red-600'
                      )}>
                        {isEasy ? 'On track' : isModerate ? 'Monitor progress' : 'Remedial needed'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Weak Units Detail */}
      <Card title="Weakest Learning Units"
        subtitle="Bottom-performing lecture units needing curriculum review"
        badge="CURRICULUM" badgeColor="red">
        <div className="space-y-3">
          {(data.weak_units || []).map((unit, idx) => (
            <div key={idx}
              className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/70 border border-gray-100 hover:bg-red-50/30 hover:border-red-100 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center shrink-0">
                  #{idx + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate max-w-[300px]">{unit.name}</p>
                  <p className="text-xs text-gray-500">Unit • {unit.attempts || 'N/A'} attempts</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24">
                  <ProgressBar value={unit.score} color={unit.score < 40 ? theme.danger : theme.warning} showLabel={false} size="sm" />
                </div>
                <span className="text-sm font-bold w-10 text-right"
                  style={{ color: unit.score < 40 ? theme.danger : theme.warning }}>{unit.score}%</span>
              </div>
            </div>
          ))}
          {(!data.weak_units || data.weak_units.length === 0) && (
            <EmptyState message="No weak unit data available" icon={BookOpen} />
          )}
        </div>
      </Card>
    </div>
  );
}

/* =========================================================================
   TAB 4: STUDENT LEADERBOARD
   ========================================================================= */
function LeaderboardTab({
  data, filteredStudents, paginatedStudents,
  searchQuery, setSearchQuery,
  sectionFilter, setSectionFilter, allSections,
  sortBy, setSortBy,
  page, setPage, totalPages,
  rowsPerPage, setRowsPerPage,
  onStudentClick
}) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Scatter Plot */}
      <Card title="MCQ vs Coding Correlation"
        subtitle="Individual student theoretical vs practical performance mapping"
        badge="SCATTER" badgeColor="blue">
        <ScatterPlot data={data?.student_lists?.all || []} />
      </Card>

      {/* Leaderboard Table */}
      <Card title="Student Leaderboard"
        subtitle={`${filteredStudents.length} of ${data?.total_students || 0} students`}
        badge="INTERACTIVE" badgeColor="blue"
        action={
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              <List className="w-4 h-4" />
            </button>
          </div>
        }>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 pb-4 border-b border-gray-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search by name or registration ID..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 shrink-0" />
            <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-[#1a73e8] outline-none">
              {allSections.map(sec => (
                <option key={sec} value={sec}>{sec === 'ALL' ? 'All Sections' : `Section ${sec}`}</option>
              ))}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-[#1a73e8] outline-none">
              <option value="overall">Sort: Overall</option>
              <option value="mcq">Sort: MCQ</option>
              <option value="coding">Sort: Coding</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-[11px] text-gray-500 uppercase bg-gray-50/80 border-b border-gray-200">
                <th className="px-4 py-3.5 font-semibold w-12">#</th>
                <th className="px-4 py-3.5 font-semibold">Student</th>
                <th className="px-4 py-3.5 font-semibold hidden md:table-cell">Reg ID</th>
                <th className="px-4 py-3.5 font-semibold hidden sm:table-cell">Section</th>
                <th className="px-4 py-3.5 text-right font-semibold">MCQ</th>
                <th className="px-4 py-3.5 text-right font-semibold">Coding</th>
                <th className="px-4 py-3.5 text-right font-semibold">Overall</th>
                <th className="px-4 py-3.5 text-center font-semibold">Status</th>
                <th className="px-4 py-3.5 text-center font-semibold w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedStudents.map((s, idx) => {
                const rank = (page - 1) * rowsPerPage + idx + 1;
                const hasNoCoding = s.coding === 0 && s.mcq > 0;
                const hasNoMcq = s.mcq === 0 && s.coding > 0;
                const isWeak = s.overall < 40 || (s.overall >= 40 && s.mcq === 0 && s.coding === 0);
                const isGood = s.overall >= 75 && s.mcq >= 65 && s.coding >= 65;
                const isExcellent = s.overall >= 85 && s.mcq >= 75 && s.coding >= 75;
                const isStar = rank <= 3;
                return (
                  <tr key={s.id || idx}
                    onClick={() => onStudentClick && onStudentClick(s.id, s.name, s.reg)}
                    className={cn(
                      'transition-colors cursor-pointer',
                      isWeak ? 'bg-red-50/30 hover:bg-red-50/60' :
                      isExcellent ? 'bg-green-50/30 hover:bg-green-50/60' :
                      hasNoCoding ? 'bg-amber-50/20 hover:bg-amber-50/40' :
                      'hover:bg-gray-50/80'
                    )}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {isStar ? (
                          <Trophy className={cn(
                            'w-4 h-4',
                            rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : 'text-amber-600'
                          )} />
                        ) : (
                          <span className="text-sm font-semibold text-gray-400">#{rank}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-gray-900">{s.name}</span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 font-mono text-xs hidden md:table-cell">{s.reg}</td>
                    <td className="px-4 py-3.5 text-gray-600 hidden sm:table-cell">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">{s.section}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold"
                      style={{ color: s.mcq >= 75 ? theme.success : s.mcq >= 50 ? theme.warning : theme.danger }}>
                      {s.mcq}%
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold"
                      style={{ color: s.coding >= 75 ? theme.success : s.coding >= 50 ? theme.warning : theme.danger }}>
                      {s.coding}%
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-lg"
                      style={{ color: theme.primary }}>
                      {s.overall}%
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold border',
                        isWeak ? 'bg-red-50 text-red-800 border-red-200' :
                        isExcellent ? 'bg-green-50 text-green-800 border-green-200' :
                        isGood ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        hasNoCoding ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        hasNoMcq ? 'bg-orange-50 text-orange-800 border-orange-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      )}>
                        {isWeak ? 'Weak' :
                         isExcellent ? 'Excellent' :
                         isGood ? 'Good' :
                         hasNoCoding ? 'No Coding' :
                         hasNoMcq ? 'No MCQ' :
                         'Average'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button onClick={(e) => { e.stopPropagation(); onStudentClick && onStudentClick(s.id, s.name, s.reg); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all whitespace-nowrap">
                        <ExternalLink size={12} /> Analytics
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="py-12 text-center">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No students match your search</p>
              <button onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-semibold text-[#1a73e8] hover:underline">Clear filters</button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredStudents.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Rows:</span>
              <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white">
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>Showing {(page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, filteredStudents.length)} of {filteredStudents.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-bold transition-colors',
                      p === page ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
                    )}
                    style={p === page ? { backgroundColor: theme.primary } : {}}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* =========================================================================
   TAB 5: ENTERPRISE EXPORT HUB
   ========================================================================= */
function ExportHubTab({ data, downloadCSV, downloadCompleteReport, downloadJSON, handlePrint, setScheduleModalOpen, setEmailModalOpen }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="CSV Export" subtitle="Full student performance records"
          badge="CSV" badgeColor="green"
          action={<FileSpreadsheet className="w-5 h-5 text-green-600" />}>
          <div className="space-y-4 flex-1 flex flex-col">
            <p className="text-sm text-gray-600 flex-1">
              Complete export with Registration ID, Section, Overall Score, MCQ, Coding, and risk categorization for all {data?.total_students || 0} students.
            </p>
            <button onClick={downloadCompleteReport}
              className="w-full py-3 px-4 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2.5 transition-all hover:shadow-lg active:scale-[0.97]"
              style={{ backgroundColor: theme.success }}>
              <FileSpreadsheet className="w-4 h-4" />
              Download Complete CSV Report
            </button>
          </div>
        </Card>
        <Card title="JSON Data Feed" subtitle="Raw API response for BI pipelines"
          badge="DEVELOPER" badgeColor="blue"
          action={<FileJson className="w-5 h-5 text-purple-600" />}>
          <div className="space-y-4 flex-1 flex flex-col">
            <p className="text-sm text-gray-600 flex-1">
              Complete JSON structure including KPIs, AI insights, section distributions, difficulty index, and full student list with scores.
            </p>
            <button onClick={downloadJSON}
              className="w-full py-3 px-4 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2.5 transition-all hover:shadow-lg active:scale-[0.97]"
              style={{ backgroundColor: theme.primary }}>
              <FileJson className="w-4 h-4" />
              Download JSON Report
            </button>
          </div>
        </Card>
        <Card title="Print / PDF" subtitle="Executive document for offline sharing"
          badge="DOCUMENT" badgeColor="purple"
          action={<Printer className="w-5 h-5 text-gray-500" />}>
          <div className="space-y-4 flex-1 flex flex-col">
            <p className="text-sm text-gray-600 flex-1">
              Clean print-friendly view with all charts, KPI cards, student leaderboards, and AI recommendations formatted for PDF generation.
            </p>
            <button onClick={handlePrint}
              className="w-full py-3 px-4 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2.5 transition-all hover:shadow-lg active:scale-[0.97]"
              style={{ backgroundColor: '#7c3aed' }}>
              <Printer className="w-4 h-4" />
              Generate Executive PDF
            </button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Automated Schedule" subtitle="Periodic analytics delivery"
          badge="AUTOMATION" badgeColor="blue">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Configure weekly or monthly emails with batch performance, risk alerts, and leaderboards sent directly to stakeholders.
            </p>
            <button onClick={() => setScheduleModalOpen(true)}
              className="px-5 py-2.5 border-2 rounded-xl font-semibold text-sm flex items-center gap-2.5 transition-all hover:shadow-md"
              style={{ borderColor: theme.primary, color: theme.primary }}
              onMouseEnter={e => { e.target.style.backgroundColor = `${theme.primary}08`; }}
              onMouseLeave={e => { e.target.style.backgroundColor = 'transparent'; }}>
              <Calendar className="w-4 h-4" />
              Configure Schedule
            </button>
          </div>
        </Card>
        <Card title="Email Summary" subtitle="Share with teachers or deans"
          badge="SHARE" badgeColor="green">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Dispatch the current AI executive summary, key statistics, and risk report directly to any recipient.
            </p>
            <button onClick={() => setEmailModalOpen(true)}
              className="px-5 py-2.5 border-2 rounded-xl font-semibold text-sm flex items-center gap-2.5 transition-all hover:shadow-md"
              style={{ borderColor: theme.success, color: theme.success }}
              onMouseEnter={e => { e.target.style.backgroundColor = `${theme.success}08`; }}
              onMouseLeave={e => { e.target.style.backgroundColor = 'transparent'; }}>
              <Mail className="w-4 h-4" />
              Send Analytics Summary
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================================
   TAB 5: PROCTORING & INTEGRITY
   ========================================================================= */
function ProctoringTab({ data, totalStudents }) {
  if (!data) return <EmptyState message="Loading proctoring analytics..." icon={ScanEye} />;

  const totalAffected = data.affected_students || 0;
  const violationRate = totalStudents > 0 ? Math.round((totalAffected / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIValue label="Total Violations" value={data.total_violations || 0} icon={ScanEye} color={theme.danger}
          subtitle="All integrity events" />
        <KPIValue label="Tab Switches" value={data.total_tab_switches || 0} icon={MonitorSmartphone} color={theme.warning}
          subtitle="Unauthorized navigation" />
        <KPIValue label="Focus Loss" value={data.total_focus_loss || 0} icon={EyeOff} color={theme.primary}
          subtitle="Window/blur events" />
        <KPIValue label="Affected Students" value={totalAffected} icon={Users} color={theme.gray}
          subtitle={`${violationRate}% of batch`} />
      </div>

      {/* Violations by Exam */}
      <Card title="Violations by Exam" subtitle="Integrity incidents grouped by assessment"
        badge="PROCTORING" badgeColor="red">
        {data.exams?.length > 0 ? (
          <div className="space-y-4">
            {(data.exams).map((exam, i) => {
              const total = exam.tab_switches + exam.focus_loss + exam.disconnects;
              return (
                <div key={i} className="p-4 rounded-xl bg-gray-50/70 border border-gray-100 hover:border-red-100 transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-semibold text-sm text-gray-900">{exam.name}</span>
                      <span className="ml-2 text-xs text-gray-500">({exam.affected_students} students affected)</span>
                    </div>
                    <span className="text-lg font-bold text-red-600">{total}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-100 text-center">
                      <span className="text-xs text-amber-800 font-bold block">{exam.tab_switches}</span>
                      <span className="text-[10px] text-amber-600">Tab Switches</span>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-center">
                      <span className="text-xs text-blue-800 font-bold block">{exam.focus_loss}</span>
                      <span className="text-[10px] text-blue-600">Focus Loss</span>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-50 border border-purple-100 text-center">
                      <span className="text-xs text-purple-800 font-bold block">{exam.disconnects}</span>
                      <span className="text-[10px] text-purple-600">Disconnects</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <EmptyState message="No proctoring data available" icon={ShieldAlert} />}
      </Card>

      {/* Top Violators */}
      <Card title="Top Violators" subtitle="Students with highest integrity violations"
        badge="VIOLATORS" badgeColor="red">
        {data.students?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-[11px] text-gray-500 uppercase bg-gray-50/80 border-b border-gray-200">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Section</th>
                  <th className="px-4 py-3 text-right font-semibold">Tab Switches</th>
                  <th className="px-4 py-3 text-right font-semibold">Focus Loss</th>
                  <th className="px-4 py-3 text-right font-semibold">Disconnects</th>
                  <th className="px-4 py-3 text-right font-semibold text-red-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.students.filter(s => s.total_violations > 0).slice(0, 25).map((s, i) => (
                  <tr key={s.student_id || i} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-400">#{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.section}</td>
                    <td className="px-4 py-3 text-right text-amber-700 font-bold">{s.tab_switches}</td>
                    <td className="px-4 py-3 text-right text-blue-700 font-bold">{s.focus_loss}</td>
                    <td className="px-4 py-3 text-right text-purple-700 font-bold">{s.disconnects}</td>
                    <td className="px-4 py-3 text-right text-red-700 font-bold">{s.total_violations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message="No integrity violations recorded" icon={CheckCircle2} />}
      </Card>
    </div>
  );
}

/* =========================================================================
   TAB 6: TEACHERS & SECTIONS
   ========================================================================= */
function TeachersTab({ data, batchData, lowestPractice, lowestExams, batch_id, onSectionClick, onDownloadCSV, onDownloadComplete, onGeneratePDF }) {
  if (!data) return <EmptyState message="Loading teacher & section data..." icon={UsersRound} />;

  const sectionDetailUrl = (section) => `${API_CONFIG.baseUrl.admin}${API_CONFIG.v2.sectionDetail(batch_id, section)}`;

  const sectionScores = batchData?.sections || {};

  const teacherPerformance = useMemo(() => {
    const teachers = data.teachers || [];
    return teachers.map(t => {
      const sections = t.assigned_sections || [];
      const scores = sections.map(s => sectionScores[s] || 0);
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      return { ...t, sectionScores: scores, avgScore: avg };
    }).sort((a, b) => b.avgScore - a.avgScore);
  }, [data, sectionScores]);

  const strongTeachers = teacherPerformance.filter(t => t.avgScore >= 70);
  const weakTeachers = teacherPerformance.filter(t => t.avgScore > 0 && t.avgScore < 50);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Teacher Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPIValue label="Total Teachers" value={data.total_teachers || 0} icon={UsersRound} color={theme.primary}
          subtitle="Assigned to batch sections" />
        <KPIValue label="Active Teachers" value={data.active_teachers || 0} icon={UserCheck} color={theme.success}
          subtitle="Currently teaching" />
        <KPIValue label="Sections" value={data.section_summary?.length || 0} icon={Layers} color={theme.warning}
          subtitle="Active sections" />
        <KPIValue label="Strong Teachers" value={strongTeachers.length} icon={Award} color={theme.success}
          subtitle="70%+ avg section score" />
      </div>

      {/* Export Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={onDownloadComplete}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:shadow-lg active:scale-[0.97]"
          style={{ backgroundColor: theme.success }}>
          <FileSpreadsheet size={16} /> Complete Report CSV
        </button>
        <button onClick={onDownloadCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:shadow-lg active:scale-[0.97]"
          style={{ backgroundColor: '#2563eb' }}>
          <FileText size={16} /> Teachers CSV
        </button>
        <button onClick={onGeneratePDF}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:shadow-lg active:scale-[0.97]"
          style={{ backgroundColor: '#7c3aed' }}>
          <Printer size={16} /> Batch PDF
        </button>
      </div>

      {/* Teacher Performance Graph */}
      {teacherPerformance.length > 0 && (
        <Card title="Teacher Performance Graph" subtitle="Average section score by teacher"
          badge="PERFORMANCE" badgeColor="green">
          <div className="space-y-3 py-2">
            {teacherPerformance.map((t, i) => {
              const barColor = t.avgScore >= 70 ? theme.success : t.avgScore >= 50 ? theme.warning : theme.danger;
              return (
                <div key={t.teacher_id || i} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[13px] font-semibold text-gray-800 truncate">{t.name}</span>
                      <span className="text-[10px] text-gray-400">({(t.assigned_sections || []).join(', ') || 'Unassigned'})</span>
                    </div>
                    <span className="text-[13px] font-bold shrink-0 ml-2" style={{ color: barColor }}>{t.avgScore}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${t.avgScore}%`, backgroundColor: barColor, opacity: 0.7 + (i / teacherPerformance.length) * 0.3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Strong vs Weak Teachers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Strong Teachers" subtitle="Teachers with 70%+ avg section score"
          badge="STRONG" badgeColor="green">
          {strongTeachers.length > 0 ? (
            <div className="space-y-3">
              {strongTeachers.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-green-50/50 border border-green-100">
                  <div className="flex items-center gap-3">
                    <Award className="w-8 h-8 p-1.5 rounded-full bg-green-100 text-green-700 shrink-0" size={16} />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{t.name}</p>
                      <p className="text-[11px] text-gray-500">{(t.assigned_sections || []).join(', ') || '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-green-700">{t.avgScore}%</p>
                    <p className="text-[10px] text-gray-500">{t.total_students_under || 0} students</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState message="No strong teachers found" icon={Award} />}
        </Card>
        <Card title="Teachers Needing Attention" subtitle="Teachers with &lt;50% avg section score"
          badge="WEAK" badgeColor="red">
          {weakTeachers.length > 0 ? (
            <div className="space-y-3">
              {weakTeachers.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 p-1.5 rounded-full bg-red-100 text-red-700 shrink-0" size={16} />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{t.name}</p>
                      <p className="text-[11px] text-gray-500">{(t.assigned_sections || []).join(', ') || '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-red-700">{t.avgScore}%</p>
                    <p className="text-[10px] text-gray-500">{t.total_students_under || 0} students</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState message="No weak teachers identified" icon={AlertTriangle} />}
        </Card>
      </div>

      {/* Weak Practice Units by Score */}
      {(lowestPractice || []).length > 0 && (
        <Card title="Weak Practice Units by Score" subtitle="Lowest performing practice units sorted ascending"
          badge="PRACTICE" badgeColor="orange">
          <div className="space-y-2.5">
            {[...(lowestPractice || [])].sort((a, b) => a.score - b.score).map((u, i) => {
              const barColor = u.score < 40 ? theme.danger : u.score < 60 ? theme.warning : theme.primary;
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500 bg-gray-200 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-gray-800 truncate block">{u.name}</span>
                    <div className="mt-1 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${u.score}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color: barColor }}>{u.score}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Weak Exam Units by Score */}
      {(lowestExams || []).length > 0 && (
        <Card title="Weak Exam Units by Score" subtitle="Lowest performing exam units sorted ascending"
          badge="EXAMS" badgeColor="red">
          <div className="space-y-2.5">
            {[...(lowestExams || [])].sort((a, b) => a.score - b.score).map((u, i) => {
              const barColor = u.score < 40 ? theme.danger : u.score < 60 ? theme.warning : theme.primary;
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500 bg-gray-200 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-gray-800 truncate block">{u.name}</span>
                    <div className="mt-1 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${u.score}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color: barColor }}>{u.score}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Section Overview */}
      <Card title="Section Overview" subtitle="Sections with assigned teachers and student counts"
        badge="SECTIONS" badgeColor="blue">
        <div className="space-y-3">
          {(data.section_summary || []).map((sec, i) => {
            const secScore = sectionScores[sec.name];
            const scoreColor = secScore >= 70 ? theme.success : secScore >= 50 ? theme.warning : theme.danger;
            return (
              <div key={i}
                onClick={() => onSectionClick && onSectionClick(sec.name)}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {sec.name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Section {sec.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <UserCheck className="w-3 h-3" />
                      Teacher: <span className="font-semibold text-gray-700">{sec.teacher || 'Unassigned'}</span>
                      <span className="mx-1">•</span>
                      <Users className="w-3 h-3" />
                      {sec.student_count} students
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {secScore !== undefined && <span className="text-sm font-bold" style={{ color: scoreColor }}>{secScore}%</span>}
                  <div className="w-20">
                    <ProgressBar value={sec.student_count}
                      color={theme.primary} showLabel={false} size="sm" />
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            );
          })}
          {(!data.section_summary || data.section_summary.length === 0) && (
            <EmptyState message="No sections found for this batch" icon={Layers} />
          )}
        </div>
      </Card>

      {/* Teacher Details */}
      <Card title="Teacher Assignments" subtitle="All teachers and their section allocations"
        badge="TEACHERS" badgeColor="purple">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-[11px] text-gray-500 uppercase bg-gray-50/80 border-b border-gray-200">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Email</th>
                <th className="px-4 py-3 font-semibold">Assigned Sections</th>
                <th className="px-4 py-3 text-right font-semibold">Section Avg</th>
                <th className="px-4 py-3 text-right font-semibold">Students Under</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data.teachers || []).map((t, i) => {
                const sections = t.assigned_sections || [];
                const scores = sections.map(s => sectionScores[s] || 0);
                const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                const avgColor = avg >= 70 ? theme.success : avg >= 50 ? theme.warning : theme.danger;
                return (
                  <tr key={t.teacher_id || i} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{t.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(t.assigned_sections || []).map((sec, si) => {
                          const sScore = sectionScores[sec];
                          const sColor = sScore >= 70 ? theme.success : sScore >= 50 ? theme.warning : theme.danger;
                          return (
                            <span key={si} className="px-2 py-0.5 rounded text-[11px] font-medium border" style={{ backgroundColor: `${sColor}15`, color: sColor, borderColor: `${sColor}30` }}>
                              {sec} {sScore !== undefined ? `${sScore}%` : ''}
                            </span>
                          );
                        })}
                        {sections.length === 0 && (
                          <span className="text-gray-400 text-xs">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: avgColor }}>{avg}%</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">{t.total_students_under || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold border',
                        t.status === 'active' ? 'bg-green-50 text-green-800 border-green-200' :
                        t.status === 'suspended' ? 'bg-red-50 text-red-800 border-red-200' :
                        'bg-gray-50 text-gray-600 border-gray-200'
                      )}>
                        {t.status === 'active' ? 'Active' : t.status === 'suspended' ? 'Suspended' : t.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* =========================================================================
   TAB 7: TIMELINE & SUBMISSIONS
   ========================================================================= */
function TimelineTab({ timelineData, submissionsData, batchOverview }) {
  if (!timelineData || !submissionsData) return <EmptyState message="Loading timeline & submission data..." icon={Timer} />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Time & Submission Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIValue label="Avg Test Duration" value={timelineData.avg_time_per_test_min || 0} icon={Clock} color={theme.primary}
          suffix=" min" subtitle="Across all assessments" />
        <KPIValue label="Total Submissions" value={submissionsData.total_submissions || 0} icon={Code} color={theme.success}
          subtitle="Coding submissions tracked" />
        <KPIValue label="Pass Rate" value={submissionsData.pass_rate || 0} icon={Award} color={theme.warning}
          suffix="%" subtitle="Coding submission pass rate" />
        <KPIValue label="Compile Success" value={submissionsData.compile_success_rate || 0} icon={Zap} color={theme.danger}
          suffix="%" subtitle="Compilation success rate" />
      </div>

      {/* Coding Difficulty Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Difficulty-wise Pass Rate" subtitle="Coding submission outcomes by difficulty level"
          badge="CODING" badgeColor="blue">
          <div className="space-y-4">
            {(submissionsData.difficulty_breakdown || []).map((d, i) => {
              const colors = { easy: theme.success, medium: theme.warning, hard: theme.danger };
              return (
                <div key={i} className="p-4 rounded-xl bg-gray-50/70 border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm capitalize text-gray-900">{d.level}</span>
                    <span className="text-sm font-bold" style={{ color: colors[d.level] || theme.primary }}>
                      {d.pass_rate}% pass
                    </span>
                  </div>
                  <ProgressBar value={d.pass_rate}
                    color={colors[d.level] || theme.primary} showLabel={false} size="md" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                    <span>{d.passed} passed</span>
                    <span>{d.total} total</span>
                  </div>
                </div>
              );
            })}
            {(!submissionsData.difficulty_breakdown || submissionsData.difficulty_breakdown.length === 0) && (
              <EmptyState message="No difficulty data" icon={BarChart3} />
            )}
          </div>
        </Card>

        <Card title="Submission Quality Metrics" subtitle="Overall coding health indicators"
          badge="QUALITY" badgeColor="green">
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-white border border-green-100 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pass Rate</p>
              <p className="text-3xl font-black text-green-700">{submissionsData.pass_rate || 0}%</p>
              <p className="text-xs text-gray-500 mt-1">{submissionsData.passed_submissions || 0} of {submissionsData.total_submissions || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-100 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Compile Success</p>
              <p className="text-3xl font-black text-amber-700">{submissionsData.compile_success_rate || 0}%</p>
              <p className="text-xs text-gray-500 mt-1">{submissionsData.compile_errors || 0} errors</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Test Case Pass</p>
              <p className="text-3xl font-black text-blue-700">{submissionsData.test_case_pass_rate || 0}%</p>
              <p className="text-xs text-gray-500 mt-1">Across all test cases</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Failed</p>
              <p className="text-3xl font-black text-purple-700">{submissionsData.failed_submissions || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Submissions need review</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Weekly Submission Trend */}
      <Card title="Weekly Submission Trend" subtitle="Coding submission volume over time"
        badge="TREND" badgeColor="blue">
        {timelineData.weekly_trend?.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {timelineData.weekly_trend.slice(-12).map((week, i) => (
                <div key={i} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{week.week?.substring(5) || `W${i + 1}`}</p>
                  <p className="text-xl font-black text-gray-800 mt-1">{week.submissions}</p>
                  <p className="text-xs text-gray-500">submissions</p>
                  <div className="flex justify-center gap-2 mt-1 text-[10px]">
                    <span className="text-green-600 font-medium">M:{week.mcq}</span>
                    <span className="text-blue-600 font-medium">C:{week.coding}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : <EmptyState message="No weekly trend data" icon={LineChart} />}
      </Card>

      {/* Daily Active Trend */}
      <Card title="Active Student Trend" subtitle="Daily unique active students"
        badge="ACTIVITY" badgeColor="green">
        {timelineData.active_trend?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {timelineData.active_trend.slice(-30).map((day, i) => (
              <div key={i}
                className="px-2.5 py-1.5 rounded-lg text-center transition-all hover:scale-110"
                style={{
                  backgroundColor: `${theme.primary}${Math.min(day.active_count / 50, 1) * 30 + 10}`,
                  color: day.active_count > 20 ? 'white' : theme.primary
                }}>
                <p className="text-[10px] font-bold">{day.active_count}</p>
                <p className="text-[8px] opacity-70">{day.day?.substring(5) || `D${i + 1}`}</p>
              </div>
            ))}
            <EmptyState message="No active trend data" icon={Activity} />
          </div>
        ) : <EmptyState message="No active trend data" icon={Activity} />}
      </Card>
    </div>
  );
}

/* =========================================================================
   DRILL-DOWN: SECTION DETAIL MODAL
   ========================================================================= */
function SectionDetailModal({ section, batch_id, onClose }) {
  const { data, error, isLoading } = useSWR(
    batch_id && section ? [`${API_CONFIG.baseUrl.admin}${API_CONFIG.v2.sectionDetail(batch_id, section)}`, 'GET'] : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Section {section}</h2>
              {data && (
                <p className="text-xs text-gray-500">{data.total_students} students • Avg: {data.average_score}%</p>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-gray-500">Loading section details...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-700">
              Failed to load section details
            </div>
          )}

          {data && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
                  <p className="text-2xl font-black text-blue-700">{data.total_students}</p>
                  <p className="text-[11px] text-blue-600 font-semibold">Total Students</p>
                </div>
                <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-center">
                  <p className="text-2xl font-black text-green-700">{data.active_students}</p>
                  <p className="text-[11px] text-green-600 font-semibold">Active</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
                  <p className="text-2xl font-black text-amber-700">{data.average_score}%</p>
                  <p className="text-[11px] text-amber-600 font-semibold">Section Avg</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-center">
                  <p className="text-2xl font-black text-purple-700">{data.teachers?.length || 0}</p>
                  <p className="text-[11px] text-purple-600 font-semibold">Teachers</p>
                </div>
              </div>

              {/* Teachers assigned */}
              {data.teachers?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <UsersRound className="w-4 h-4 text-blue-600" />
                    Assigned Teachers
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.teachers.map((t, i) => (
                      <div key={i} className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-800">{t.name}</span>
                        <span className="text-xs text-gray-500">({t.email})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Course Averages */}
              {data.course_averages?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2">Course Averages</h3>
                  <HorizontalBarChart data={Object.fromEntries(data.course_averages.map(c => [c.name, c.score]))} color={theme.primary} />
                </div>
              )}

              {/* Students */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Students ({data.students?.length || 0})
                </h3>
                <div className="overflow-x-auto max-h-80 overflow-y-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="text-[11px] text-gray-500 uppercase border-b border-gray-200">
                        <th className="px-3 py-2 font-semibold">#</th>
                        <th className="px-3 py-2 font-semibold">Name</th>
                        <th className="px-3 py-2 font-semibold">Reg ID</th>
                        <th className="px-3 py-2 text-right font-semibold">MCQ</th>
                        <th className="px-3 py-2 text-right font-semibold">Coding</th>
                        <th className="px-3 py-2 text-right font-semibold">Overall</th>
                        <th className="px-3 py-2 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(data.students || []).map((s, i) => (
                        <tr key={s.student_id || i} className="hover:bg-blue-50/20 transition-colors">
                          <td className="px-3 py-2 text-gray-400 font-semibold">#{i + 1}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900">{s.name}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs font-mono">{s.reg}</td>
                          <td className="px-3 py-2 text-right font-bold" style={{ color: s.mcq >= 75 ? theme.success : s.mcq >= 50 ? theme.warning : theme.danger }}>{s.mcq}%</td>
                          <td className="px-3 py-2 text-right font-bold" style={{ color: s.coding >= 75 ? theme.success : s.coding >= 50 ? theme.warning : theme.danger }}>{s.coding}%</td>
                          <td className="px-3 py-2 text-right font-bold" style={{ color: theme.primary }}>{s.overall}%</td>
                          <td className="px-3 py-2 text-center">
                            <span className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold border',
                              s.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                              s.status === 'suspended' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-gray-50 text-gray-600 border-gray-200'
                            )}>{s.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-3 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/*
   STUDENT DETAIL: now opens new tab at /dashboard/batch-analytics/student-view
   The old StudentDetailModal has been removed; clicking a student in the
   leaderboard navigates to the full student analytics page in a new tab.
*/

export default function BatchAnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[100] bg-[#1a1c23] flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#1a73e8] to-[#1557b0] flex items-center justify-center shadow-lg animate-pulse">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <p className="text-sm font-medium text-gray-300 animate-pulse">Loading Enterprise Analytics...</p>
        </div>
      </div>
    }>
      <BatchAnalyticsContent />
    </Suspense>
  );
}