'use client';
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, BarChart3, BookOpen, Code, FileText, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, AlertTriangle, AlertCircle, HelpCircle, Users, Layers, Target,
  TrendingUp, Search, RefreshCw, Zap, Award, Activity, Clock, MonitorPlay, Book
} from 'lucide-react';
import useSWR from 'swr';
import { API_CONFIG } from '@/utils/api';
import { swrFetcher } from '@/utils/fetcher';

/* =========================================================================
   THEME TOKENS (matches batch-analytics)
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
  amber: '#d97706',
  amberLight: '#fffbeb',
  purple: '#7c3aed',
  purpleLight: '#f5f3ff',
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

function Badge({ children, variant = 'blue' }) {
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
      {children}
    </span>
  );
}

function ProgressBar({ value, max = 100, color, height = 'h-2' }) {
  const pct = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;
  return (
    <div className={cn('w-full bg-gray-100 rounded-full overflow-hidden', height)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700 ease-out', height)}
        style={{ width: `${pct}%`, backgroundColor: color || theme.primary }}
      />
    </div>
  );
}

function StackedBar({ segments, height = 'h-3' }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) return <div className={cn('w-full bg-gray-100 rounded-full', height)} />;

  return (
    <div className={cn('w-full bg-gray-100 rounded-full overflow-hidden flex', height)}>
      {segments.map((seg, i) => {
        const pct = (seg.value / total) * 100;
        if (pct <= 0) return null;
        return (
          <div
            key={i}
            className={cn('h-full transition-all duration-700 ease-out', height)}
            style={{ width: `${pct}%`, backgroundColor: seg.color }}
            title={`${seg.label}: ${seg.value} (${Math.round(pct)}%)`}
          />
        );
      })}
    </div>
  );
}

function AnimatedNumber({ value, duration = 800 }) {
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
  return <>{display}</>;
}

function KPICard({ label, value, icon: Icon, color, subtitle }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex items-start justify-between hover:shadow-md hover:border-gray-300 transition-all duration-200 group">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-bold text-gray-900 tracking-tight">
          <AnimatedNumber value={value} />
        </p>
        {subtitle && <p className="text-[12px] text-gray-500">{subtitle}</p>}
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

/* =========================================================================
   MCQ QUESTION ROW
   ========================================================================= */


/* =========================================================================
   CODING QUESTION ROW
   ========================================================================= */



/* =========================================================================
   UNIT ACCORDION
   ========================================================================= */


/* =========================================================================
   UNIT ACCORDION
   ========================================================================= */
function UnitAccordion({ unit, totalEnrolled, defaultOpen = false, batchId, courseId }) {
  const [expanded, setExpanded] = useState(defaultOpen);

  const successRate = unit.performance?.success_rate || 0;
  const barColor = successRate >= 75 ? theme.success : successRate >= 50 ? theme.warning : theme.danger;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-5 px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-50 border border-amber-200 flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-sm font-extrabold text-amber-700">{unit.position || '?'}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-gray-900">{unit.unit_name}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-md">
              {unit.total_sub_units} sub-units
            </span>
            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-md">
              {unit.total_questions} questions
            </span>
          </div>
        </div>

        {/* Unit Health Bar */}
        <div className="hidden sm:block w-48 mx-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase text-gray-400">Unit Health</span>
            <span className="text-xs font-bold" style={{ color: barColor }}>{successRate}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${successRate}%`, backgroundColor: barColor }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 pl-4 border-l border-gray-100">
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-3 sm:p-5 space-y-3">
          {unit.sub_units.map((su, idx) => (
            <LectureAccordion key={idx} lecture={su} batchId={batchId} courseId={courseId} />
          ))}
        </div>
      )}
    </div>
  );
}

function LectureAccordion({ lecture, batchId, courseId }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('mcq');
  const { data: fetchedData, isLoading: loading } = useSWR(
    expanded ? [`${API_CONFIG.baseUrl.admin}${API_CONFIG.v2.questionAnalysisLecture(batchId, courseId, lecture.lecture_id)}`, 'GET'] : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const data = fetchedData || null;

  const mcq = data?.mcq || [];
  const coding = data?.coding || [];

  const mcqAttempted = mcq.reduce((acc, q) => acc + (q.attempted || 0), 0);
  const mcqCorrect = mcq.reduce((acc, q) => acc + (q.correct || 0), 0);
  const mcqSuccessRate = mcqAttempted > 0 ? Math.round((mcqCorrect / mcqAttempted) * 100) : 0;

  const codingAttempted = coding.reduce((acc, q) => acc + (q.attempted || 0), 0);
  const codingSolved = coding.reduce((acc, q) => acc + (q.fully_solved || 0), 0);
  const codingSuccessRate = codingAttempted > 0 ? Math.round((codingSolved / codingAttempted) * 100) : 0;

  const displayTab = activeTab === 'mcq' && mcq.length === 0 && coding.length > 0 ? 'coding' : 
                     activeTab === 'coding' && coding.length === 0 && mcq.length > 0 ? 'mcq' : 
                     activeTab;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden mb-4 hover:shadow-md transition-shadow">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 sm:px-6 sm:py-5 text-left group"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-black shadow-md shadow-gray-900/20">
            {lecture.position}
          </div>
          <div className="w-48 sm:w-auto min-w-[200px]">
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors tracking-tight truncate">
              {lecture.lecture_name}
            </h3>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">
              Lecture Sub-Unit
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {data && (
            <div className="hidden lg:flex items-center gap-8 mr-6">
               {/* MCQ Metric */}
               <div className="w-28">
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] font-bold text-gray-400 uppercase">MCQ</span>
                   <span className="text-[10px] font-bold text-blue-700">{mcqSuccessRate}%</span>
                 </div>
                 <div className="w-full h-1.5 rounded-full bg-blue-50 overflow-hidden">
                   <div className="h-full bg-blue-500 rounded-full" style={{ width: `${mcqSuccessRate}%` }} />
                 </div>
               </div>
               
               {/* Coding Metric */}
               <div className="w-28">
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] font-bold text-gray-400 uppercase">Coding</span>
                   <span className="text-[10px] font-bold text-purple-700">{codingSuccessRate}%</span>
                 </div>
                 <div className="w-full h-1.5 rounded-full bg-purple-50 overflow-hidden">
                   <div className="h-full bg-purple-500 rounded-full" style={{ width: `${codingSuccessRate}%` }} />
                 </div>
               </div>
            </div>
          )}
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border shrink-0",
            expanded ? "bg-gray-900 text-white border-gray-800 rotate-180" : "bg-white text-gray-400 border-gray-200 group-hover:border-gray-300"
          )}>
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="p-6 border-t border-gray-100 bg-[#fbfbfb] animate-in slide-in-from-top-4 duration-300 shadow-inner">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-16 text-gray-400">
               <div className="relative w-12 h-12 mb-4">
                 <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                 <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
               </div>
               <p className="font-semibold tracking-wide animate-pulse">Analyzing lecture data...</p>
             </div>
          ) : !data ? (
             <div className="text-center text-red-500 py-8 font-semibold flex flex-col items-center">
               <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
               Failed to load lecture analytics.
             </div>
          ) : mcq.length === 0 && coding.length === 0 ? (
             <div className="text-center text-gray-400 py-12 flex flex-col items-center">
               <BookOpen className="w-12 h-12 mb-3 opacity-20" />
               <p className="font-semibold text-lg">No Questions Found</p>
               <p className="text-sm">This lecture does not contain any active questions.</p>
             </div>
          ) : (
             <div className="space-y-6">
               <div className="flex bg-gray-200/50 p-1.5 rounded-xl w-fit">
                 {mcq.length > 0 && (
                   <button
                     onClick={() => setActiveTab('mcq')}
                     className={cn("px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2", displayTab === 'mcq' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                   >
                     <FileText className="w-4 h-4" /> Multiple Choice ({mcq.length})
                   </button>
                 )}
                 {coding.length > 0 && (
                   <button
                     onClick={() => setActiveTab('coding')}
                     className={cn("px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2", displayTab === 'coding' ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                   >
                     <Code className="w-4 h-4" /> Coding Questions ({coding.length})
                   </button>
                 )}
               </div>

               <div className="space-y-4">
                 {displayTab === 'mcq' && mcq.map((q, i) => <MCQQuestionRow key={q.question_id} q={q} index={i} />)}
                 {displayTab === 'coding' && coding.map((q, i) => <CodingQuestionRow key={q.question_id} q={q} index={i} />)}
               </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
}

function MCQQuestionRow({ q, index }) {
  const [expanded, setExpanded] = useState(false);
  const totalAssigned = q.assigned || 0;
  const successRate = q.attempted > 0 ? Math.round((q.correct / q.attempted) * 100) : 0;
  const attemptRate = totalAssigned > 0 ? Math.round((q.attempted / totalAssigned) * 100) : 0;
  const notAttempted = totalAssigned - q.attempted;

  const rateColor = successRate >= 75 ? theme.success : successRate >= 50 ? theme.warning : theme.danger;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-blue-700">Q{q.question_index}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate" title={q.question_body}>
            {q.question_body || `MCQ Question ${q.question_index}`}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {q.difficulty && <Badge variant={q.difficulty === 'hard' ? 'red' : q.difficulty === 'medium' ? 'yellow' : 'green'}>{q.difficulty}</Badge>}
            <span className="text-[11px] text-gray-500">
              {q.attempted}/{totalAssigned} attempted
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: rateColor }}>{successRate}%</p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase">Success</p>
          </div>
          <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform duration-200', expanded && 'rotate-180')} />
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 pt-4 border-t border-gray-100 bg-gray-50/50 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Stacked bar */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
              <span>Performance Distribution</span>
              <span>{totalAssigned} Students</span>
            </div>
            <StackedBar
              height="h-5"
              segments={[
                { value: q.correct, color: theme.success, label: 'Correct' },
                { value: q.incorrect, color: theme.danger, label: 'Incorrect' },
                { value: notAttempted, color: '#e5e7eb', label: 'Not Attempted' },
              ]}
            />
          </div>

          {/* Stat cards - Glassmorphic */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white/60 backdrop-blur-md border border-white shadow-sm ring-1 ring-gray-100/50 text-center hover:bg-white/80 transition-colors">
              <div className="flex items-center justify-center gap-1.5 text-blue-600 mb-1.5">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-gray-900">{totalAssigned}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Assigned</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/60 backdrop-blur-md border border-white shadow-sm ring-1 ring-gray-100/50 text-center hover:bg-white/80 transition-colors">
              <div className="flex items-center justify-center gap-1.5 text-amber-600 mb-1.5">
                <Target className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-gray-900">{q.attempted}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Attempted</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/60 backdrop-blur-md border border-white shadow-sm ring-1 ring-gray-100/50 text-center hover:bg-white/80 transition-colors">
              <div className="flex items-center justify-center gap-1.5 text-green-600 mb-1.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-green-700">{q.correct}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Correct</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/60 backdrop-blur-md border border-white shadow-sm ring-1 ring-gray-100/50 text-center hover:bg-white/80 transition-colors">
              <div className="flex items-center justify-center gap-1.5 text-red-600 mb-1.5">
                <XCircle className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-red-700">{q.incorrect}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Incorrect</p>
            </div>
          </div>

          <StudentTable students={q.students} />
        </div>
      )}
    </div>
  );
}

function CodingQuestionRow({ q, index }) {
  const [expanded, setExpanded] = useState(false);
  const totalAssigned = q.assigned || 0;
  const successRate = q.attempted > 0 ? Math.round((q.fully_solved / q.attempted) * 100) : 0;
  const attemptRate = totalAssigned > 0 ? Math.round((q.attempted / totalAssigned) * 100) : 0;
  const notAttempted = totalAssigned - q.attempted;

  const rateColor = successRate >= 75 ? theme.success : successRate >= 50 ? theme.warning : theme.danger;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0">
          <Code className="w-4 h-4 text-purple-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate" title={q.topic}>
            {q.topic || `Coding Question ${q.question_index}`}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {q.difficulty && <Badge variant={q.difficulty === 'hard' ? 'red' : q.difficulty === 'medium' ? 'yellow' : 'green'}>{q.difficulty}</Badge>}
            <span className="text-[11px] text-gray-500">
              {q.attempted}/{totalAssigned} attempted
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: rateColor }}>{successRate}%</p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase">Solved</p>
          </div>
          <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform duration-200', expanded && 'rotate-180')} />
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 pt-4 border-t border-gray-100 bg-gray-50/50 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
              <span>Performance Distribution</span>
              <span>{totalAssigned} Students</span>
            </div>
            <StackedBar
              height="h-5"
              segments={[
                { value: q.fully_solved, color: theme.success, label: 'Fully Solved' },
                { value: q.partially_solved, color: theme.warning, label: 'Partially Solved' },
                { value: q.not_solved, color: theme.danger, label: 'Failed' },
                { value: notAttempted, color: '#e5e7eb', label: 'Not Attempted' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-white/60 backdrop-blur-md border border-white shadow-sm ring-1 ring-gray-100/50 text-center hover:bg-white/80 transition-colors">
              <p className="text-2xl font-black text-gray-900">{totalAssigned}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Assigned</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/60 backdrop-blur-md border border-white shadow-sm ring-1 ring-gray-100/50 text-center hover:bg-white/80 transition-colors">
              <p className="text-2xl font-black text-gray-900">{q.attempted}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Attempted</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/60 backdrop-blur-md border border-white shadow-sm ring-1 ring-gray-100/50 text-center hover:bg-white/80 transition-colors">
              <p className="text-2xl font-black text-green-700">{q.fully_solved}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Solved</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/60 backdrop-blur-md border border-white shadow-sm ring-1 ring-gray-100/50 text-center hover:bg-white/80 transition-colors">
              <p className="text-2xl font-black text-amber-600">{q.partially_solved}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Partial</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/60 backdrop-blur-md border border-white shadow-sm ring-1 ring-gray-100/50 text-center hover:bg-white/80 transition-colors">
              <p className="text-2xl font-black text-red-700">{q.not_solved}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Failed</p>
            </div>
          </div>

          <StudentTable students={q.students} />
        </div>
      )}
    </div>
  );
}

function StudentTable({ students }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = useMemo(() => {
    if (!students) return [];
    let res = students;
    if (filter !== 'All') {
      res = res.filter(s => s.status === filter || (filter === 'Correct' && s.status === 'Fully Solved'));
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      res = res.filter(s => 
        s.student_name?.toLowerCase().includes(term) ||
        s.status?.toLowerCase().includes(term)
      );
    }
    return res;
  }, [students, searchTerm, filter]);

  if (!students || students.length === 0) return null;

  const filters = ['All', 'Correct', 'Partially Solved', 'Incorrect', 'Not Attempted'];

  return (
    <div className="mt-8 border border-gray-200/60 rounded-xl overflow-hidden bg-white/50 backdrop-blur-sm shadow-sm">
      <div className="bg-white/80 px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 border",
                filter === f 
                  ? "bg-gray-900 text-white border-gray-900 shadow-md" 
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white/50 w-full sm:w-64 transition-all"
          />
        </div>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50/80 text-gray-500 font-semibold sticky top-0 backdrop-blur-md z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <tr>
              <th className="px-5 py-3.5">Student Name</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Score</th>
              <th className="px-5 py-3.5">Time Spent</th>
              <th className="px-5 py-3.5 text-right">Attempts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((s, i) => (
              <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-5 py-3 font-medium text-gray-900 group-hover:text-blue-700 transition-colors">{s.student_name}</td>
                <td className="px-5 py-3">
                  <Badge variant={
                    s.status === 'Correct' || s.status === 'Fully Solved' ? 'green' : 
                    s.status === 'Partially Solved' ? 'yellow' : 
                    s.status === 'Not Attempted' ? 'gray' : 'red'
                  }>{s.status}</Badge>
                </td>
                <td className="px-5 py-3 text-gray-600 font-medium">{s.score}</td>
                <td className="px-5 py-3 text-gray-500">{s.time_spent}</td>
                <td className="px-5 py-3 text-right text-gray-500 font-medium">{s.attempts}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <Search className="w-8 h-8 mb-3 opacity-20" />
                    <p>No students match your criteria.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================================
   COURSE PERFORMANCE OVERVIEW
   ========================================================================= */
function CoursePerformanceOverview({ performance }) {
  if (!performance) return null;

  const { mcq_success_rate, coding_success_rate, overall_success_rate } = performance;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6 flex flex-col md:flex-row gap-8">
      {/* Overall Score */}
      <div className="w-full md:w-1/3 flex flex-col justify-center items-center p-4 rounded-xl bg-gray-50 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Overall Success Rate</h3>
        <div className="flex items-end gap-1">
          <span className="text-5xl font-black" style={{ color: overall_success_rate >= 75 ? theme.success : overall_success_rate >= 50 ? theme.warning : theme.danger }}>
            {overall_success_rate}%
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2 font-medium">Aggregated across all assessments</p>
      </div>

      {/* Breakdown Bars */}
      <div className="w-full md:w-2/3 flex flex-col justify-center gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-gray-800">MCQ Proficiency</span>
            </div>
            <span className="text-sm font-bold text-blue-700">{mcq_success_rate}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-blue-50 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${mcq_success_rate}%`, background: 'linear-gradient(90deg, #3b82f6, #2563eb)' }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-bold text-gray-800">Coding Proficiency</span>
            </div>
            <span className="text-sm font-bold text-purple-700">{coding_success_rate}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-purple-50 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${coding_success_rate}%`, background: 'linear-gradient(90deg, #a855f7, #7e22ce)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   MAIN CONTENT COMPONENT
   ========================================================================= */
function QuestionAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const batch_id = searchParams.get('batch_id');

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showLoader, setShowLoader] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Initializing Question Analysis...');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Fetch courses for this batch ──────────────────────────────────────
  const courseParams = new URLSearchParams({ batch_id: batch_id || '' }).toString();
  const { data: courseData, isLoading: coursesLoading } = useSWR(
    batch_id ? [`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getPracticeCoursesByBatch}?${courseParams}`, 'GET'] : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  const courses = useMemo(() => {
    if (!courseData) return [];
    if (Array.isArray(courseData)) return courseData;
    if (courseData.courses) return courseData.courses;
    return [];
  }, [courseData]);

  // Auto-select first course
  useEffect(() => {
    if (courses.length > 0 && !selectedCourse) {
      setSelectedCourse(courses[0]);
    }
  }, [courses, selectedCourse]);

  // ── Fetch question analysis for selected course ───────────────────────
  const analysisParams = selectedCourse
    ? new URLSearchParams({ batch_id, course_id: selectedCourse.course_id }).toString()
    : null;

  const { data: analysisData, isLoading: analysisLoading, error: analysisError, mutate } = useSWR(
    analysisParams ? [`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.questionAnalysis}?${analysisParams}`, 'GET'] : null,
    swrFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  const isLoading = coursesLoading || analysisLoading;

  // ── Loader animation (same pattern as batch-analytics) ────────────────
  useEffect(() => {
    if (isLoading) {
      setShowLoader(true);
      setProgress(0);
      const msgs = [
        'Fetching Course Structure...',
        'Loading Question Database...',
        'Aggregating Student Submissions...',
        'Computing Success Rates...',
        'Building Analytics Dashboard...',
      ];
      let idx = 0;
      setStatusMsg(msgs[0]);
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 7, 92));
        idx = Math.min(idx + 1, msgs.length - 1);
        setStatusMsg(msgs[idx]);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
      setStatusMsg('Analytics Ready.');
      const t = setTimeout(() => setShowLoader(false), 500);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  // ── Computed KPIs ─────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!analysisData) return { totalUnits: 0, totalQuestions: 0, totalMcq: 0, totalCoding: 0, enrolled: 0 };
    let totalMcq = 0, totalCoding = 0;
    for (const unit of (analysisData.units || [])) {
      for (const su of unit.sub_units) {
        totalMcq += su.total_mcq;
        totalCoding += su.total_coding;
      }
    }
    return {
      totalUnits: analysisData.units?.length || 0,
      totalQuestions: totalMcq + totalCoding,
      totalMcq,
      totalCoding,
      enrolled: analysisData.total_enrolled || 0,
    };
  }, [analysisData]);

  // ── Filter units by search ────────────────────────────────────────────
  const filteredUnits = useMemo(() => {
    if (!analysisData?.units) return [];
    if (!searchQuery.trim()) return analysisData.units;
    const q = searchQuery.toLowerCase();
    return analysisData.units.filter(u =>
      u.unit_name.toLowerCase().includes(q) ||
      u.sub_units.some(su => su.lecture_name.toLowerCase().includes(q))
    );
  }, [analysisData, searchQuery]);

  // ── Loading screen ────────────────────────────────────────────────────
  if (showLoader) {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#1a1c23] via-[#1e2028] to-[#14151a] flex items-center justify-center font-sans">
        <div className="w-full max-w-md px-8 text-center space-y-6">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-amber-500/20">
            <Layers className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-xl font-bold text-white mb-1">Question Analysis Engine</h1>
            <p className="text-sm text-gray-400">{statusMsg}</p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 font-mono">{progress}%</p>
          </div>

          {/* Dots animation */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-amber-500"
                style={{
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                  opacity: 0.4,
                }}
              />
            ))}
          </div>
        </div>

        <style jsx>{`
          @keyframes pulse {
            0%, 80%, 100% { opacity: 0.4; transform: scale(1); }
            40% { opacity: 1; transform: scale(1.3); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#f8f9fa] font-sans flex flex-col overflow-hidden">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Question Analysis</h1>
              </div>
              {analysisData?.course_name && (
                <p className="text-sm text-gray-500 mt-0.5 ml-[46px]">{analysisData.course_name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search units..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300 w-64 transition-all"
              />
            </div>

            {/* Refresh */}
            <Tooltip text="Refresh Data">
              <button
                onClick={() => mutate()}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

          {/* ── Course Selector ───────────────────────────────────────── */}
          {courses.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-gray-800">Select Course</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {courses.map(course => (
                  <button
                    key={course.course_id}
                    onClick={() => setSelectedCourse(course)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200',
                      selectedCourse?.course_id === course.course_id
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-200'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                    )}
                  >
                    {course.course_name || course.course_title || 'Untitled'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── KPI Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard label="Enrolled Students" value={kpis.enrolled} icon={Users} color={theme.primary} />
            <KPICard label="Total Units" value={kpis.totalUnits} icon={Layers} color={theme.amber} />
            <KPICard label="Total Questions" value={kpis.totalQuestions} icon={Target} color={theme.purple} />
            <KPICard label="MCQ Questions" value={kpis.totalMcq} icon={FileText} color={theme.primary} />
            <KPICard label="Coding Questions" value={kpis.totalCoding} icon={Code} color={theme.purple} />
          </div>

          <CoursePerformanceOverview performance={analysisData?.course_performance} />

          {/* ── Error State ───────────────────────────────────────────── */}
          {analysisError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Failed to load question analysis</p>
                <p className="text-xs text-red-600 mt-0.5">{analysisError.message || 'Please try again'}</p>
              </div>
              <button
                onClick={() => mutate()}
                className="ml-auto px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-semibold transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* ── Units List ────────────────────────────────────────────── */}
          {filteredUnits.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-bold text-gray-900">Unit Breakdown</h2>
                <Badge variant="yellow">{filteredUnits.length} Units</Badge>
              </div>
              {filteredUnits.map((unit, i) => (
                <UnitAccordion
                  batchId={batch_id}
                  courseId={selectedCourse?.course_id}
                  key={unit.unit_id}
                  unit={unit}
                  totalEnrolled={analysisData?.total_enrolled || 0}
                  defaultOpen={i === 0}
                />
              ))}
            </div>
          ) : analysisData && !analysisLoading ? (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-500 font-medium">
                {searchQuery ? 'No units match your search' : 'No units found for this course'}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   PAGE WRAPPER (with Suspense for useSearchParams)
   ========================================================================= */
export default function QuestionAnalysisPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[100] bg-[#1a1c23] flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg animate-pulse">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <p className="text-sm font-medium text-gray-300 animate-pulse">Loading Question Analysis...</p>
        </div>
      </div>
    }>
      <QuestionAnalysisContent />
    </Suspense>
  );
}
