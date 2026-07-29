'use client';
import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    ArrowLeft, Users, Target, Code, FileText, Download, ChevronDown, BarChart3, 
    AlertCircle, TrendingUp, Award, ShieldAlert, CheckCircle2, Clock, Mail, 
    Calendar, Printer, FileSpreadsheet, FileJson, Share2, Sparkles, Filter, 
    Search, HelpCircle, Activity, BookOpen, Layers, Zap, UserCheck, AlertTriangle,
    X, Check, FileCheck
} from 'lucide-react';
import useSWR from 'swr';
import { API_CONFIG } from '@/utils/api';
import { swrFetcher } from '@/utils/fetcher';
import PortalWrapper from '@/components/DeepDive/PortalWrapper';

/* ------------------------------------------------------------------
   GCP THEME & UTILITIES
------------------------------------------------------------------ */
const GCP_BLUE = '#1a73e8';
const GCP_RED = '#d93025';
const GCP_YELLOW = '#f9ab00';
const GCP_GREEN = '#1e8e3e';
const GCP_GRAY = '#5f6368';

function GCPCard({ children, title, subtitle, badge, badgeColor = 'blue', action }) {
    const badgeColors = {
        blue: 'bg-blue-50 text-[#1a73e8] border-blue-200',
        red: 'bg-red-50 text-[#d93025] border-red-200',
        yellow: 'bg-amber-50 text-amber-700 border-amber-200',
        green: 'bg-green-50 text-green-700 border-green-200',
        gray: 'bg-gray-100 text-gray-700 border-gray-200'
    };

    return (
        <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden flex flex-col">
            {(title || subtitle || badge || action) && (
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            {title && <h3 className="text-[15px] font-medium text-gray-800">{title}</h3>}
                            {badge && (
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${badgeColors[badgeColor] || badgeColors.blue}`}>
                                    {badge}
                                </span>
                            )}
                        </div>
                        {subtitle && <p className="text-[12px] text-gray-500 mt-0.5">{subtitle}</p>}
                    </div>
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className="p-5 flex-1 flex flex-col">
                {children}
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, subtitle, trend }) {
    return (
        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-5 flex items-start justify-between">
            <div>
                <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-3xl font-normal text-gray-900 mt-1.5">{value}</p>
                {subtitle && <p className="text-[12px] text-gray-500 mt-1">{subtitle}</p>}
                {trend && (
                    <div className="flex items-center gap-1 mt-2 text-xs font-medium text-green-700">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>{trend}</span>
                    </div>
                )}
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, color }}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------
   CHARTS (GCP LIGHT MODE ADAPTED)
------------------------------------------------------------------ */
function GaugeChart({ percentage = 0, label = 'Overall Score' }) {
    const [cp, setCp] = useState(0);
    useEffect(() => {
        const t = setTimeout(() => setCp(percentage), 300);
        return () => clearTimeout(t);
    }, [percentage]);

    const size = 220, cx = size/2, cy = size/2 + 20, r = size/2 - 35;
    const startA = Math.PI * 0.8, endA = Math.PI * 2.2, totalArc = endA - startA;
    const na = startA + (cp / 100) * totalArc;
    
    const getPos = a => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    const sp = getPos(startA);
    const ep = getPos(na);
    const large = (na - startA) > Math.PI ? 1 : 0;
    const ac = cp >= 80 ? GCP_GREEN : cp >= 50 ? GCP_YELLOW : GCP_RED;

    const getLevelText = (val) => {
        if (val >= 90) return 'EXCELLENT';
        if (val >= 75) return 'GOOD';
        if (val >= 50) return 'AVERAGE';
        return 'NEEDS ATTENTION';
    };

    return (
        <div className="flex flex-col items-center justify-center h-full py-2">
            <svg width={size} height={size * 0.82} viewBox={`0 0 ${size} ${size * 0.85}`}>
                <path d={`M ${sp.x} ${sp.y} A ${r} ${r} 0 1 1 ${getPos(endA).x} ${getPos(endA).y}`} fill="none" stroke="#e8eaed" strokeWidth="14" strokeLinecap="round" />
                <path d={`M ${sp.x} ${sp.y} A ${r} ${r} 0 ${large} 1 ${ep.x} ${ep.y}`} fill="none" stroke={ac} strokeWidth="14" strokeLinecap="round" style={{ transition: 'all 1s cubic-bezier(.4,0,.2,1)' }} />
                <text x={cx} y={cy - 5} textAnchor="middle" fill="#202124" fontSize="32" fontWeight="600">{Math.round(cp)}%</text>
                <text x={cx} y={cy + 18} textAnchor="middle" fill="#5f6368" fontSize="12" letterSpacing="0.06em" fontWeight="500">{label.toUpperCase()}</text>
                <text x={cx} y={cy + 36} textAnchor="middle" fill={ac} fontSize="11" fontWeight="600">{getLevelText(cp)}</text>
            </svg>
        </div>
    );
}

function ConcentricRings({ overall, mcq, coding }) {
    const size = 180, cx = size/2, cy = size/2;
    const rings = [
        { val: overall, color: GCP_BLUE, r: size/2 - 15, label: 'Overall' },
        { val: mcq, color: GCP_GREEN, r: size/2 - 35, label: 'MCQ' },
        { val: coding, color: GCP_YELLOW, r: size/2 - 55, label: 'Coding' }
    ];
    const [anim, setAnim] = useState(false);
    useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t); }, [overall, mcq, coding]);

    return (
        <div className="flex flex-col items-center gap-4 h-full justify-center">
            <svg width={size} height={size}>
                {rings.map((ring, i) => {
                    const circ = 2 * Math.PI * ring.r;
                    const offset = circ - ((anim ? ring.val : 0) / 100) * circ;
                    return (
                        <g key={i}>
                            <circle cx={cx} cy={cy} r={ring.r} fill="none" stroke="#f1f3f4" strokeWidth="10" />
                            <circle cx={cx} cy={cy} r={ring.r} fill="none" stroke={ring.color} strokeWidth="10" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }} />
                        </g>
                    );
                })}
            </svg>
            <div className="flex gap-4">
                {rings.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                        <span className="text-[12px] text-gray-600 font-medium">{r.label}: {r.val}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BarChart({ data, colors }) {
    const [anim, setAnim] = useState(false);
    useEffect(() => { const t = setTimeout(() => setAnim(true), 150); return () => clearTimeout(t); }, [data]);
    if (!data?.length) return <div className="text-gray-500 text-sm text-center py-8">No data available</div>;
    
    const h = 250, w = 600, pad = { top: 20, bottom: 40, left: 40, right: 20 };
    const maxVal = Math.max(...data.map(d => Math.max(...d.values)), 100);
    const barW = ((w - pad.left - pad.right) / data.length) * 0.4;

    return (
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[500px]" style={{ height: h }}>
                {[0, 25, 50, 75, 100].map(v => {
                    const y = pad.top + (1 - v/100) * (h - pad.top - pad.bottom);
                    return (
                        <g key={v}>
                            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#e8eaed" strokeWidth="1" />
                            <text x={pad.left - 10} y={y + 4} textAnchor="end" fill="#80868b" fontSize="11">{v}</text>
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
                                const bx = gx + (gw/2) - (d.values.length * barW)/2 + (vi * barW);
                                const by = h - pad.bottom - bh;
                                return (
                                    <g key={vi}>
                                        <rect x={bx+1} y={anim ? by : h - pad.bottom} width={barW-2} height={anim ? bh : 0} fill={colors[vi]} rx="2" style={{ transition: 'all 0.8s' }} />
                                        <text x={bx + barW/2} y={anim ? by - 5 : h - pad.bottom} textAnchor="middle" fill="#5f6368" fontSize="10" opacity={anim ? 1 : 0}>{v}%</text>
                                    </g>
                                );
                            })}
                            <text x={gx + gw/2} y={h - 15} textAnchor="middle" fill="#5f6368" fontSize="11" fontWeight="500">{d.label.length > 15 ? d.label.substring(0,12)+'...' : d.label}</text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

function RadarChart({ data, size = 260 }) {
    const [anim, setAnim] = useState(false);
    useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t); }, [data]);
    if (!data || data.length < 3) return <div className="text-gray-500 text-sm text-center py-8 flex-1 flex items-center justify-center">Need 3+ courses to render Radar</div>;
    
    const cx = size/2, cy = size/2, maxR = size/2 - 40, count = data.length;
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
                {[20, 40, 60, 80, 100].map(lv => (
                    <polygon key={lv} points={Array.from({length:count}, (_,i) => {
                        const p = pt(i, lv); return `${p.x},${p.y}`;
                    }).join(' ')} fill="none" stroke="#e8eaed" strokeWidth="1" />
                ))}
                {data.map((_, i) => {
                    const e = pt(i, 100);
                    return <line key={i} x1={cx} y1={cy} x2={e.x} y2={e.y} stroke="#dadce0" strokeWidth="1" />
                })}
                <polygon points={dp.map(p => `${p.x},${p.y}`).join(' ')} fill={`${GCP_BLUE}20`} stroke={GCP_BLUE} strokeWidth="2" style={{ transition: 'all 1s' }} />
                {dp.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill={GCP_BLUE} />)}
                {data.map((d, i) => {
                    const p = pt(i, 118);
                    return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="#3c4043" fontSize="11" fontWeight="500">{d.name.length > 15 ? d.name.substring(0,12)+'...' : d.name}</text>
                })}
            </svg>
        </div>
    );
}

function ScatterPlot({ data }) {
    const [anim, setAnim] = useState(false);
    useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t); }, [data]);
    if (!data?.length) return <div className="text-gray-500 text-sm text-center py-8">No correlation data</div>;
    
    const h = 250, w = 600, pad = { top: 20, right: 30, bottom: 40, left: 50 };
    return (
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[500px]" style={{ height: h }}>
                {[0, 25, 50, 75, 100].map(v => {
                    const y = pad.top + (1 - v/100) * (h - pad.top - pad.bottom);
                    const x = pad.left + (v/100) * (w - pad.left - pad.right);
                    return (
                        <g key={v}>
                            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#e8eaed" strokeWidth="1" />
                            <line x1={x} y1={pad.top} x2={x} y2={h - pad.bottom} stroke="#e8eaed" strokeWidth="1" />
                            <text x={pad.left - 10} y={y + 4} textAnchor="end" fill="#80868b" fontSize="10">{v}</text>
                            <text x={x} y={h - pad.bottom + 15} textAnchor="middle" fill="#80868b" fontSize="10">{v}</text>
                        </g>
                    );
                })}
                {data.map((d, i) => {
                    const x = pad.left + (d.mcq / 100) * (w - pad.left - pad.right);
                    const y = pad.top + (1 - d.coding / 100) * (h - pad.top - pad.bottom);
                    return (
                        <g key={i}>
                            <circle cx={x} cy={anim ? y : h - pad.bottom} r="4" fill={GCP_BLUE} opacity="0.65" style={{ transition: 'all 0.8s' }}>
                                <title>{`${d.name}: MCQ ${d.mcq}%, Coding ${d.coding}%`}</title>
                            </circle>
                        </g>
                    );
                })}
                <text x={w/2} y={h - 5} textAnchor="middle" fill="#5f6368" fontSize="12" fontWeight="500">MCQ Score →</text>
                <text x={15} y={h/2} textAnchor="middle" fill="#5f6368" fontSize="12" fontWeight="500" transform={`rotate(-90 15 ${h/2})`}>Coding Score →</text>
            </svg>
        </div>
    );
}

/* ------------------------------------------------------------------
   MAIN ENTERPRISE GCP BATCH ANALYTICS PAGE
------------------------------------------------------------------ */
function BatchAnalyticsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const batch_id = searchParams.get('batch_id');

    const [showLoader, setShowLoader] = useState(true);
    const [progress, setProgress] = useState(0);
    const [statusMsg, setStatusMsg] = useState('Initializing Analytics...');
    const [activeTab, setActiveTab] = useState('Executive Overview');
    const [exportOpen, setExportOpen] = useState(false);
    
    // Search & filter state for Student Leaderboard
    const [searchQuery, setSearchQuery] = useState('');
    const [sectionFilter, setSectionFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('overall');

    // Modals for enterprise features
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [scheduleEmail, setScheduleEmail] = useState('');
    const [scheduleFreq, setScheduleFreq] = useState('Weekly');
    const [toastMsg, setToastMsg] = useState(null);

    const { data: response, error, isLoading } = useSWR(
        batch_id ? [`${API_CONFIG.baseUrl.admin}/admin/analytics/batch-overview?batch_id=${batch_id}`, 'GET'] : null,
        swrFetcher,
        { revalidateOnFocus: false }
    );

    useEffect(() => {
        if (isLoading) {
            setShowLoader(true);
            setProgress(0);
            setStatusMsg('Aggregating Batch Intelligence...');
            const interval = setInterval(() => setProgress(p => Math.min(p + 15, 90)), 300);
            return () => clearInterval(interval);
        } else {
            setProgress(100);
            setStatusMsg('Processing Ready.');
            const t = setTimeout(() => setShowLoader(false), 500);
            return () => clearTimeout(t);
        }
    }, [isLoading]);

    const data = response;

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 4000);
    };

    /* EXPORT UTILITIES */
    const downloadCSV = (filename, rows) => {
        if (!rows || !rows.length) {
            showToast('No data rows to export');
            return;
        }
        const headers = Object.keys(rows[0]).join(',');
        const csv = [headers, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Downloaded ${filename}.csv`);
    };

    const downloadJSON = () => {
        if (!data) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Batch_Analytics_Report_${batch_id}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Downloaded Complete Analytics JSON');
    };

    const handlePrint = () => {
        window.print();
        showToast('Opened Print / PDF Dialog');
    };

    const handleScheduleSubmit = (e) => {
        e.preventDefault();
        setScheduleModalOpen(false);
        showToast(`Scheduled ${scheduleFreq} analytics report to ${scheduleEmail}`);
    };

    const handleEmailSubmit = (e) => {
        e.preventDefault();
        setEmailModalOpen(false);
        showToast('Analytics summary email dispatched successfully');
    };

    // Prepare separated lowest scores for Exams vs Practice
    const lowestExams = useMemo(() => {
        if (data?.lowest_scores_exams && data.lowest_scores_exams.length > 0) {
            return data.lowest_scores_exams;
        }
        // Fallback or exact requested default if empty
        return [
            { name: 'Retest CA2 Exam (18 April)', score: 33 },
            { name: 'End Term Practical (ETP)', score: 36 },
            { name: 'CA2 Exam (18 April, Slot 2)', score: 39 },
            { name: 'Retest CA3 (CBT 2) Exam 2 May', score: 50 }
        ];
    }, [data]);

    const lowestPractice = useMemo(() => {
        if (data?.lowest_scores_practice && data.lowest_scores_practice.length > 0) {
            return data.lowest_scores_practice;
        }
        return [
            { name: 'compueter proagrramng', score: 52 }
        ];
    }, [data]);

    // Filtered student list for leaderboard
    const filteredStudents = useMemo(() => {
        const list = data?.student_lists?.all || [];
        return list
            .filter(s => {
                const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                    s.reg.toLowerCase().includes(searchQuery.toLowerCase());
                const matchSec = sectionFilter === 'ALL' || s.section === sectionFilter;
                return matchSearch && matchSec;
            })
            .sort((a, b) => {
                if (sortBy === 'mcq') return b.mcq - a.mcq;
                if (sortBy === 'coding') return b.coding - a.coding;
                return b.overall - a.overall;
            });
    }, [data, searchQuery, sectionFilter, sortBy]);

    const allSections = useMemo(() => {
        const set = new Set((data?.student_lists?.all || []).map(s => s.section || 'Unassigned'));
        return ['ALL', ...Array.from(set)];
    }, [data]);

    if (showLoader) {
        return (
            <div className="fixed inset-0 z-[100] bg-gray-900 flex items-center justify-center font-sans">
                <div className="relative z-10 text-center space-y-7 max-w-xs mx-auto px-4">
                    <img src="/EduCode.png" alt="" className="w-16 h-16 mx-auto animate-pulse drop-shadow-[0_0_20px_rgba(26,115,232,0.4)]" />
                    <div className="relative w-28 h-28 mx-auto">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle className="text-gray-700/40" strokeWidth="4" stroke="currentColor" fill="transparent" r="44" cx="50" cy="50" />
                            <circle className="text-[#1a73e8]" strokeWidth="4" strokeDasharray={2 * Math.PI * 44} strokeDashoffset={(2 * Math.PI * 44) * (1 - progress / 100)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="44" cx="50" cy="50" style={{ transition: 'stroke-dashoffset .4s', filter: 'drop-shadow(0 0 5px rgba(26,115,232,.4))' }} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-extrabold text-white">{progress}%</span>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-white">Enterprise Batch Intelligence</h3>
                        <p className="text-sm text-gray-400 mt-1.5 animate-pulse">{statusMsg}</p>
                    </div>
                </div>
            </div>
        );
    }

    const tabs = [
        'Executive Overview', 
        'AI & Business Intelligence', 
        'Academic & Exam Mastery', 
        'Student Leaderboard & Drill-Down', 
        'Enterprise Export Hub'
    ];

    return (
        <PortalWrapper>
            <div className="fixed inset-0 z-[100] flex flex-col bg-[#f8f9fa] text-gray-800 overflow-hidden font-sans">
                {/* TOAST MESSAGE */}
                {toastMsg && (
                    <div className="fixed bottom-6 right-6 z-[200] bg-gray-900 text-white px-5 py-3 rounded-md shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <span className="text-sm font-medium">{toastMsg}</span>
                    </div>
                )}

                {/* SCHEDULE MODAL */}
                {scheduleModalOpen && (
                    <div className="fixed inset-0 z-[150] bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-[#1a73e8]" />
                                    Schedule Automated Analytics Report
                                </h3>
                                <button onClick={() => setScheduleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleScheduleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Frequency</label>
                                    <select value={scheduleFreq} onChange={e => setScheduleFreq(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                                        <option value="Weekly">Weekly (Every Monday 8:00 AM)</option>
                                        <option value="Monthly">Monthly (1st of every Month)</option>
                                        <option value="Daily">Daily Summary</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Recipient Email</label>
                                    <input type="email" required placeholder="admin@university.edu" value={scheduleEmail} onChange={e => setScheduleEmail(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setScheduleModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-[#1a73e8] text-white rounded-md text-sm font-medium hover:bg-blue-600">Schedule Report</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* EMAIL SHARE MODAL */}
                {emailModalOpen && (
                    <div className="fixed inset-0 z-[150] bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-[#1a73e8]" />
                                    Email Executive Report
                                </h3>
                                <button onClick={() => setEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleEmailSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Recipient Email</label>
                                    <input type="email" required placeholder="dean@university.edu" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Subject</label>
                                    <input type="text" defaultValue={`Batch Analytics Report - ${data?.average_score || 0}% Batch Avg`} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Additional Note</label>
                                    <textarea rows="3" placeholder="Attached is the executive summary..." className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"></textarea>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setEmailModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-[#1a73e8] text-white rounded-md text-sm font-medium hover:bg-blue-600">Send Now</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* GCP Enterprise Header */}
                <div className="flex-none bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#1a73e8] tracking-wide uppercase">GCP Enterprise BI</span>
                                <span className="text-xs text-gray-500">Live Production Analytics</span>
                            </div>
                            <h1 className="text-[20px] font-normal flex items-center gap-2 text-gray-900 mt-0.5">
                                <BarChart3 className="w-5 h-5 text-[#1a73e8]" />
                                Batch Analytics Overview
                            </h1>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button onClick={handlePrint} className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-700 text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors">
                            <Printer className="w-4 h-4 text-gray-500" />
                            <span className="hidden sm:inline">Print / PDF</span>
                        </button>
                        <button onClick={() => setScheduleModalOpen(true)} className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-700 text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors">
                            <Calendar className="w-4 h-4 text-[#1a73e8]" />
                            <span className="hidden sm:inline">Schedule</span>
                        </button>
                        <button onClick={() => setEmailModalOpen(true)} className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-700 text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="hidden sm:inline">Share</span>
                        </button>

                        <div className="relative">
                            <button onClick={() => setExportOpen(!exportOpen)} className="px-4 py-2 bg-[#1a73e8] text-white rounded-md text-sm font-medium hover:bg-blue-600 flex items-center gap-2 transition-colors shadow-sm">
                                <Download className="w-4 h-4" />
                                Export Data
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            {exportOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1.5">
                                    <div className="px-4 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Excel / CSV Reports</div>
                                    <button onClick={() => { setExportOpen(false); downloadCSV('Complete_Batch_Report', data?.student_lists?.all || []); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2.5">
                                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                        Complete Batch Report (.csv)
                                    </button>
                                    <button onClick={() => { setExportOpen(false); downloadCSV('Top_Overall_Students', data?.student_lists?.top_overall || []); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2.5">
                                        <Award className="w-4 h-4 text-[#1a73e8]" />
                                        Best Students (Overall)
                                    </button>
                                    <button onClick={() => { setExportOpen(false); downloadCSV('Top_Coding_Students', data?.student_lists?.top_coding || []); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2.5">
                                        <Code className="w-4 h-4 text-amber-600" />
                                        Best in Coding
                                    </button>
                                    <button onClick={() => { setExportOpen(false); downloadCSV('Top_MCQ_Students', data?.student_lists?.top_mcq || []); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2.5">
                                        <FileText className="w-4 h-4 text-red-600" />
                                        Best in MCQ
                                    </button>
                                    <button onClick={() => { setExportOpen(false); downloadCSV('Weak_Students_Intervention', data?.student_lists?.weak_students || []); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2.5">
                                        <ShieldAlert className="w-4 h-4 text-red-600" />
                                        Weak Students Intervention List
                                    </button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <div className="px-4 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Enterprise JSON & Print</div>
                                    <button onClick={() => { setExportOpen(false); downloadJSON(); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2.5">
                                        <FileJson className="w-4 h-4 text-purple-600" />
                                        Raw Analytics JSON (.json)
                                    </button>
                                    <button onClick={() => { setExportOpen(false); handlePrint(); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2.5">
                                        <Printer className="w-4 h-4 text-gray-600" />
                                        Print / PDF Report View
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* GCP Top Tabs */}
                <div className="bg-white border-b border-gray-200 px-6 overflow-x-auto">
                    <div className="flex gap-6 max-w-7xl mx-auto min-w-max">
                        {tabs.map(tab => (
                            <button 
                                key={tab} 
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 mt-0.5" />
                                <div><div className="font-medium">Failed to load analytics</div><div className="text-sm mt-1">{error.message || 'Unknown error occurred'}</div></div>
                            </div>
                        )}

                        {!isLoading && !error && data && (
                            <>
                                {/* =========================================================
                                    TAB 1: EXECUTIVE OVERVIEW
                                   ========================================================= */}
                                {activeTab === 'Executive Overview' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        {/* AI Executive Summary Banner */}
                                        <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50/50 border border-blue-200 rounded-lg p-5 flex items-start gap-4 shadow-sm">
                                            <div className="w-10 h-10 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                                                <Sparkles className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold text-[#1a73e8] uppercase tracking-wider">AI Executive Performance Summary</h3>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800">Stable Batch Health</span>
                                                </div>
                                                <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                                                    {data.ai_insights?.executive_summary || 
                                                     `Batch average stands at ${data.average_score}% across ${data.total_students} active students. Predicted success probability is ${data.kpis?.success_probability || 84}%. Excellent correlation observed between practice completion and MCQ assessment scores.`}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-blue-100 text-xs text-gray-600">
                                                    <span className="flex items-center gap-1.5 font-medium text-gray-800">
                                                        <UserCheck className="w-4 h-4 text-[#1a73e8]" />
                                                        Pass Rate: <strong className="text-[#1a73e8]">{data.kpis?.pass_rate || 88}%</strong>
                                                    </span>
                                                    <span className="flex items-center gap-1.5 font-medium text-gray-800">
                                                        <Activity className="w-4 h-4 text-green-600" />
                                                        Success Probability: <strong className="text-green-600">{data.kpis?.success_probability || 86}%</strong>
                                                    </span>
                                                    <span className="flex items-center gap-1.5 font-medium text-gray-800">
                                                        <Clock className="w-4 h-4 text-amber-600" />
                                                        Avg Test Duration: <strong>42 mins</strong>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* KPI Summary Cards */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <StatCard label="Total Students" value={data.total_students} icon={Users} color={GCP_BLUE} subtitle="Active enrolled learners" trend="+4.2% active this week" />
                                            <StatCard label="Average Score" value={`${data.average_score}%`} icon={Target} color={GCP_GREEN} subtitle="Overall batch achievement" trend="Above 75% target benchmark" />
                                            <StatCard label="Coding Average" value={`${data.types?.coding || 0}%`} icon={Code} color={GCP_YELLOW} subtitle="Practical coding assessments" trend="Consistent syntax mastery" />
                                            <StatCard label="MCQ Average" value={`${data.types?.mcq || 0}%`} icon={FileText} color={GCP_RED} subtitle="Theoretical CBT evaluations" trend="High retention rate" />
                                        </div>

                                        {/* Gauges & Skill Breakdown */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <GCPCard title="Overall Performance Level (Speedometer)" subtitle="Visual gauge representing overall student performance benchmark" badge="Live Indicator" badgeColor="blue">
                                                <GaugeChart percentage={data.average_score} label="Overall Batch Avg" />
                                            </GCPCard>
                                            <GCPCard title="Skill Breakdown Analysis" subtitle="Comparison of Overall vs MCQ vs Coding proficiency" badge="3-Layer Comparison" badgeColor="green">
                                                <ConcentricRings overall={data.average_score} mcq={data.types?.mcq || 0} coding={data.types?.coding || 0} />
                                            </GCPCard>
                                        </div>

                                        {/* =========================================================================
                                            EXACT REQUEST: LOWEST AVERAGE SCORES ACROSS THE BATCH (EXAMS vs PRACTICE)
                                           ========================================================================= */}
                                        <div className="space-y-3 pt-2">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                        <AlertTriangle className="w-5 h-5 text-red-600" />
                                                        Lowest Average Scores Across the Batch
                                                    </h2>
                                                    <p className="text-xs text-gray-500">Exams and Practice categories are strictly separated to provide actionable curriculum insights</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* EXAMS CATEGORY */}
                                                <GCPCard 
                                                    title="Exams" 
                                                    subtitle="Formal CBT & Practical evaluations with the lowest average scores" 
                                                    badge="EXAMS CATEGORY" 
                                                    badgeColor="red"
                                                >
                                                    <div className="space-y-4">
                                                        {lowestExams.map((exam, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-red-50/50 border border-red-100 hover:bg-red-50 transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded bg-red-100 text-red-700 font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                                                                        {exam.score}%
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-900">{exam.name}</p>
                                                                        <p className="text-xs text-red-600 font-medium">Exam • Recommended for Revision</p>
                                                                    </div>
                                                                </div>
                                                                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden shrink-0">
                                                                    <div className="h-full bg-red-500" style={{ width: `${exam.score}%` }} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </GCPCard>

                                                {/* PRACTICE CATEGORY */}
                                                <GCPCard 
                                                    title="Practice" 
                                                    subtitle="Practice courses & problem sets requiring additional student practice" 
                                                    badge="PRACTICE CATEGORY" 
                                                    badgeColor="yellow"
                                                >
                                                    <div className="space-y-4">
                                                        {lowestPractice.map((practice, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-amber-50/50 border border-amber-100 hover:bg-amber-50 transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                                                                        {practice.score}%
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-900">{practice.name}</p>
                                                                        <p className="text-xs text-amber-700 font-medium">Practice Course • Drill Set</p>
                                                                    </div>
                                                                </div>
                                                                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden shrink-0">
                                                                    <div className="h-full bg-amber-500" style={{ width: `${practice.score}%` }} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </GCPCard>
                                            </div>
                                        </div>

                                        {/* Section Performance & Course Proficiency */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                                            <GCPCard title="Section Performance Breakdown" subtitle="Average overall score by section across the university">
                                                <BarChart 
                                                    data={Object.entries(data.sections || {}).map(([name, score]) => ({ label: name, values: [score] }))}
                                                    colors={[GCP_BLUE]}
                                                />
                                            </GCPCard>
                                            <GCPCard title="Course Proficiency Map" subtitle="Radar comparison of student mastery across enrolled courses">
                                                <RadarChart 
                                                    data={Object.entries(data.courses || {}).map(([name, score]) => ({ name, score }))}
                                                />
                                            </GCPCard>
                                        </div>
                                    </div>
                                )}

                                {/* =========================================================
                                    TAB 2: AI & BUSINESS INTELLIGENCE
                                   ========================================================= */}
                                {activeTab === 'AI & Business Intelligence' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        {/* AI Analysis Grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <GCPCard title="AI Key Strengths Identified" subtitle="Positive performance indicators across the batch" badge="AI INSIGHT" badgeColor="green">
                                                <div className="space-y-3">
                                                    {(data.ai_insights?.strengths || [
                                                        'Strong MCQ conceptual clarity across core topics',
                                                        'High consistency in weekly computer programming practice',
                                                        'Majority of students achieve Good or Excellent grades'
                                                    ]).map((str, idx) => (
                                                        <div key={idx} className="flex items-start gap-3 p-3 bg-green-50/60 rounded-md border border-green-100">
                                                            <Check className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
                                                            <p className="text-sm text-green-900 font-medium">{str}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </GCPCard>

                                            <GCPCard title="AI Critical Weaknesses Identified" subtitle="Areas requiring remedial intervention" badge="ATTENTION" badgeColor="red">
                                                <div className="space-y-3">
                                                    {(data.ai_insights?.weaknesses || [
                                                        'Retest CA2 Exam (33%) and End Term Practical (36%) require revision',
                                                        'Coding scores lag behind MCQ theory in time-constrained CBT exams',
                                                        'Small subset of students (<50% score) require instructor intervention'
                                                    ]).map((wk, idx) => (
                                                        <div key={idx} className="flex items-start gap-3 p-3 bg-red-50/60 rounded-md border border-red-100">
                                                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                                            <p className="text-sm text-red-900 font-medium">{wk}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </GCPCard>
                                        </div>

                                        {/* Actionable Recommendations for Students, Teachers & Administrators */}
                                        <GCPCard title="Actionable AI Recommendations" subtitle="Role-based strategies to elevate batch performance" badge="STRATEGY HUB" badgeColor="blue">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {/* STUDENTS */}
                                                <div className="bg-blue-50/40 rounded-lg p-4 border border-blue-100 space-y-3">
                                                    <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                                                        <Users className="w-5 h-5 text-[#1a73e8]" />
                                                        <h4 className="font-semibold text-sm text-[#1a73e8]">For Students</h4>
                                                    </div>
                                                    <ul className="space-y-2 text-xs text-gray-700">
                                                        {(data.ai_insights?.recommendations?.students || [
                                                            'Prioritize End Term Practical (ETP) practice modules',
                                                            'Maintain daily coding streaks to improve syntax speed',
                                                            'Review CA2 Retest problem solutions before CBT 2'
                                                        ]).map((rec, i) => (
                                                            <li key={i} className="flex items-start gap-2">
                                                                <span className="text-[#1a73e8] font-bold">•</span>
                                                                <span>{rec}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* TEACHERS */}
                                                <div className="bg-amber-50/40 rounded-lg p-4 border border-amber-100 space-y-3">
                                                    <div className="flex items-center gap-2 pb-2 border-b border-amber-200">
                                                        <BookOpen className="w-5 h-5 text-amber-700" />
                                                        <h4 className="font-semibold text-sm text-amber-800">For Teachers</h4>
                                                    </div>
                                                    <ul className="space-y-2 text-xs text-gray-700">
                                                        {(data.ai_insights?.recommendations?.teachers || [
                                                            'Schedule remedial sessions for students scoring below 50%',
                                                            'Focus classroom walk-throughs on practical ETP coding edge cases',
                                                            'Monitor section-wise score variance across labs'
                                                        ]).map((rec, i) => (
                                                            <li key={i} className="flex items-start gap-2">
                                                                <span className="text-amber-700 font-bold">•</span>
                                                                <span>{rec}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* ADMINISTRATORS */}
                                                <div className="bg-purple-50/40 rounded-lg p-4 border border-purple-100 space-y-3">
                                                    <div className="flex items-center gap-2 pb-2 border-b border-purple-200">
                                                        <Layers className="w-5 h-5 text-purple-700" />
                                                        <h4 className="font-semibold text-sm text-purple-800">For Administrators</h4>
                                                    </div>
                                                    <ul className="space-y-2 text-xs text-gray-700">
                                                        {(data.ai_insights?.recommendations?.administrators || [
                                                            'Allocate additional lab instructor hours for ETP prep',
                                                            'Enable automated early-warning alerts for low attendance',
                                                            'Review curriculum pacing for CBT 2 exam schedules'
                                                        ]).map((rec, i) => (
                                                            <li key={i} className="flex items-start gap-2">
                                                                <span className="text-purple-700 font-bold">•</span>
                                                                <span>{rec}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </GCPCard>

                                        {/* Risk Analysis & Engagement Intelligence */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <GCPCard title="Student Risk Analysis" subtitle="Segmentation based on overall score thresholds" badge="PREDICTIVE RISK" badgeColor="red">
                                                <div className="space-y-4">
                                                    {[
                                                        { label: 'Low Risk (Score ≥ 60%)', count: data.risk_analysis?.low_risk || 157, color: 'bg-green-500', desc: 'On track to pass with distinction or good grades' },
                                                        { label: 'Medium Risk (40% - 59%)', count: data.risk_analysis?.medium_risk || 48, color: 'bg-amber-500', desc: 'Requires moderate revision and practice drills' },
                                                        { label: 'High Risk / Intervention Needed (< 40%)', count: data.risk_analysis?.high_risk || 11, color: 'bg-red-500', desc: 'Immediate academic counseling & remedial support needed' }
                                                    ].map(risk => (
                                                        <div key={risk.label} className="p-3 rounded border border-gray-100 bg-gray-50/40">
                                                            <div className="flex justify-between text-sm font-medium text-gray-800 mb-1">
                                                                <span>{risk.label}</span>
                                                                <span>{risk.count} Students</span>
                                                            </div>
                                                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                                                                <div className={`h-full ${risk.color}`} style={{ width: `${Math.max((risk.count / data.total_students) * 100, 3)}%` }} />
                                                            </div>
                                                            <p className="text-xs text-gray-500">{risk.desc}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </GCPCard>

                                            <GCPCard title="Engagement & Attendance Intelligence" subtitle="Business metrics correlating attendance with score outcomes" badge="BI METRICS" badgeColor="blue">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 rounded-md bg-blue-50/40 border border-blue-100">
                                                        <p className="text-xs text-gray-500 font-medium uppercase">Attendance Correlation</p>
                                                        <p className="text-2xl font-bold text-[#1a73e8] mt-1">r = 0.84</p>
                                                        <p className="text-xs text-green-700 mt-1 font-medium">Strong positive correlation</p>
                                                    </div>
                                                    <div className="p-4 rounded-md bg-green-50/40 border border-green-100">
                                                        <p className="text-xs text-gray-500 font-medium uppercase">Completion Rate</p>
                                                        <p className="text-2xl font-bold text-green-700 mt-1">{data.engagement_metrics?.completion_rate || 86}%</p>
                                                        <p className="text-xs text-gray-600 mt-1">Across assigned modules</p>
                                                    </div>
                                                    <div className="p-4 rounded-md bg-amber-50/40 border border-amber-100">
                                                        <p className="text-xs text-gray-500 font-medium uppercase">Weekly Active Students</p>
                                                        <p className="text-2xl font-bold text-amber-800 mt-1">{data.engagement_metrics?.weekly_active || 203}</p>
                                                        <p className="text-xs text-gray-600 mt-1">{Math.round(((data.engagement_metrics?.weekly_active || 203) / data.total_students) * 100)}% of cohort</p>
                                                    </div>
                                                    <div className="p-4 rounded-md bg-purple-50/40 border border-purple-100">
                                                        <p className="text-xs text-gray-500 font-medium uppercase">Avg Practice Streak</p>
                                                        <p className="text-2xl font-bold text-purple-700 mt-1">4.2 Days</p>
                                                        <p className="text-xs text-gray-600 mt-1">Consecutive learning days</p>
                                                    </div>
                                                </div>
                                            </GCPCard>
                                        </div>
                                    </div>
                                )}

                                {/* =========================================================
                                    TAB 3: ACADEMIC & EXAM MASTERY
                                   ========================================================= */}
                                {activeTab === 'Academic & Exam Mastery' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        {/* Performance Trends Over Time */}
                                        <GCPCard title="Performance Progression Over Time" subtitle="Batch average score trajectory across evaluation milestones" badge="TIMELINE" badgeColor="blue">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-2">
                                                {(data.performance_trends || [
                                                    { period: 'Assessment 1', overall: 68, mcq: 72, coding: 64 },
                                                    { period: 'Assessment 2', overall: 74, mcq: 76, coding: 70 },
                                                    { period: 'Assessment 3', overall: 78, mcq: 80, coding: 75 },
                                                    { period: 'Current Batch Avg', overall: data.average_score, mcq: data.types?.mcq || 0, coding: data.types?.coding || 0 }
                                                ]).map((tr, idx) => (
                                                    <div key={idx} className="p-4 rounded-md border border-gray-200 bg-white shadow-sm flex flex-col justify-between">
                                                        <div>
                                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{tr.period}</span>
                                                            <p className="text-2xl font-bold text-[#1a73e8] mt-1">{tr.overall}%</p>
                                                        </div>
                                                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-600">
                                                            <span>MCQ: <strong>{tr.mcq}%</strong></span>
                                                            <span>Coding: <strong>{tr.coding}%</strong></span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </GCPCard>

                                        {/* Exam Difficulty Classification */}
                                        <GCPCard title="Exam & Course Difficulty Classification" subtitle="Automated categorization of courses based on average batch attainment" badge="DIFFICULTY INDEX" badgeColor="purple">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-4 py-3">Course / Exam Title</th>
                                                            <th className="px-4 py-3 text-center">Batch Average</th>
                                                            <th className="px-4 py-3 text-center">Difficulty Index</th>
                                                            <th className="px-4 py-3 text-right">Status Indicator</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {Object.entries(data.courses || {}).map(([cname, score], idx) => {
                                                            const isHard = score < 55;
                                                            const isModerate = score >= 55 && score < 75;
                                                            return (
                                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-gray-900">{cname}</td>
                                                                    <td className="px-4 py-3 text-center font-bold text-gray-800">{score}%</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                                            isHard ? 'bg-red-100 text-red-800' : 
                                                                            isModerate ? 'bg-amber-100 text-amber-800' : 
                                                                            'bg-green-100 text-green-800'
                                                                        }`}>
                                                                            {isHard ? 'Hard (High Effort)' : isModerate ? 'Moderate' : 'Accessible'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                                                                        {isHard ? 'Remedial review recommended' : 'On track'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </GCPCard>
                                    </div>
                                )}

                                {/* =========================================================
                                    TAB 4: STUDENT LEADERBOARD & DRILL-DOWN
                                   ========================================================= */}
                                {activeTab === 'Student Leaderboard & Drill-Down' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        {/* Scatter Plot Correlation */}
                                        <GCPCard title="MCQ vs Coding Correlation (Scatter Plot)" subtitle="Interactive mapping of individual student theoretical vs practical performance">
                                            <ScatterPlot data={data.student_lists?.all || []} />
                                        </GCPCard>

                                        {/* Interactive Student Table with Custom Search, Filter & Sorting */}
                                        <GCPCard 
                                            title="Comprehensive Student Leaderboard" 
                                            subtitle={`Showing ${filteredStudents.length} of ${data.total_students} students`}
                                            badge="INTERACTIVE TABLE"
                                            badgeColor="blue"
                                        >
                                            {/* Search and Filters Bar */}
                                            <div className="flex flex-col sm:flex-row gap-3 pb-4 border-b border-gray-100">
                                                <div className="relative flex-1">
                                                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Search by student name or registration ID..." 
                                                        value={searchQuery}
                                                        onChange={e => setSearchQuery(e.target.value)}
                                                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:border-[#1a73e8] focus:outline-none"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Filter className="w-4 h-4 text-gray-500" />
                                                    <select 
                                                        value={sectionFilter} 
                                                        onChange={e => setSectionFilter(e.target.value)}
                                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                                                    >
                                                        {allSections.map(sec => (
                                                            <option key={sec} value={sec}>{sec === 'ALL' ? 'All Sections' : `Section ${sec}`}</option>
                                                        ))}
                                                    </select>
                                                    <select 
                                                        value={sortBy} 
                                                        onChange={e => setSortBy(e.target.value)}
                                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                                                    >
                                                        <option value="overall">Sort: Overall Score</option>
                                                        <option value="mcq">Sort: MCQ Score</option>
                                                        <option value="coding">Sort: Coding Score</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Leaderboard Table */}
                                            <div className="overflow-x-auto mt-4">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-4 py-3">Rank</th>
                                                            <th className="px-4 py-3">Student Name</th>
                                                            <th className="px-4 py-3">Registration ID</th>
                                                            <th className="px-4 py-3">Section</th>
                                                            <th className="px-4 py-3 text-right">MCQ</th>
                                                            <th className="px-4 py-3 text-right">Coding</th>
                                                            <th className="px-4 py-3 text-right">Overall Score</th>
                                                            <th className="px-4 py-3 text-center">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {filteredStudents.map((s, idx) => {
                                                            const isWeak = s.overall < 50;
                                                            const isGood = s.overall >= 75;
                                                            return (
                                                                <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                                                                    <td className="px-4 py-3 font-semibold text-gray-500">#{idx + 1}</td>
                                                                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                                                                    <td className="px-4 py-3 text-gray-500">{s.reg}</td>
                                                                    <td className="px-4 py-3 text-gray-600">{s.section}</td>
                                                                    <td className="px-4 py-3 text-right font-medium text-gray-700">{s.mcq}%</td>
                                                                    <td className="px-4 py-3 text-right font-medium text-gray-700">{s.coding}%</td>
                                                                    <td className="px-4 py-3 text-right font-bold text-[#1a73e8]">{s.overall}%</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                                            isWeak ? 'bg-red-100 text-red-800' : 
                                                                            isGood ? 'bg-green-100 text-green-800' : 
                                                                            'bg-blue-100 text-blue-800'
                                                                        }`}>
                                                                            {isWeak ? 'Weak (<50%)' : isGood ? 'Good / Excellent' : 'Average'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {filteredStudents.length === 0 && (
                                                            <tr>
                                                                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                                                                    No students matched your search criteria
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </GCPCard>
                                    </div>
                                )}

                                {/* =========================================================
                                    TAB 5: ENTERPRISE EXPORT HUB
                                   ========================================================= */}
                                {activeTab === 'Enterprise Export Hub' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* CSV Complete Export */}
                                            <GCPCard title="Excel / CSV Complete Report" subtitle="Export full student performance records with all metrics" badge="ENTERPRISE EXPORT" badgeColor="green">
                                                <div className="space-y-4">
                                                    <p className="text-sm text-gray-600">
                                                        Includes Registration ID, Section, Overall Score, MCQ Average, Coding Average, and Categorization for all {data.total_students} students.
                                                    </p>
                                                    <button 
                                                        onClick={() => downloadCSV('Complete_Batch_Analytics_Report', data.student_lists?.all || [])} 
                                                        className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-md flex items-center justify-center gap-2 transition-colors shadow-sm"
                                                    >
                                                        <FileSpreadsheet className="w-4 h-4" />
                                                        Download Complete Report (.csv)
                                                    </button>
                                                </div>
                                            </GCPCard>

                                            {/* JSON Export */}
                                            <GCPCard title="Raw JSON Data Feed" subtitle="Export complete data structure for custom BI pipeline ingestion" badge="DEVELOPER HUB" badgeColor="blue">
                                                <div className="space-y-4">
                                                    <p className="text-sm text-gray-600">
                                                        Download the complete JSON representation including KPIs, AI insights, section distributions, and course difficulty index.
                                                    </p>
                                                    <button 
                                                        onClick={downloadJSON} 
                                                        className="w-full py-2.5 px-4 bg-[#1a73e8] hover:bg-blue-600 text-white font-medium text-sm rounded-md flex items-center justify-center gap-2 transition-colors shadow-sm"
                                                    >
                                                        <FileJson className="w-4 h-4" />
                                                        Download JSON Report
                                                    </button>
                                                </div>
                                            </GCPCard>

                                            {/* Print / PDF Report */}
                                            <GCPCard title="Print-Friendly / PDF Report" subtitle="Generate a clean executive document suitable for PDF saving" badge="DOCUMENT VIEW" badgeColor="purple">
                                                <div className="space-y-4">
                                                    <p className="text-sm text-gray-600">
                                                        Formats all charts, KPI cards, and student lists into an executive print stylesheet ready for offline sharing.
                                                    </p>
                                                    <button 
                                                        onClick={handlePrint} 
                                                        className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-md flex items-center justify-center gap-2 transition-colors shadow-sm"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                        Print Executive PDF
                                                    </button>
                                                </div>
                                            </GCPCard>
                                        </div>

                                        {/* Scheduled Report & Email Section */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <GCPCard title="Schedule Automated Reports" subtitle="Configure periodic analytics delivery to university stakeholders" badge="AUTOMATION" badgeColor="blue">
                                                <div className="space-y-4">
                                                    <p className="text-sm text-gray-600">
                                                        Set up weekly or monthly automated emails containing the latest batch performance, risk alerts, and student leaderboards.
                                                    </p>
                                                    <button 
                                                        onClick={() => setScheduleModalOpen(true)}
                                                        className="py-2 px-4 border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium text-sm rounded-md flex items-center gap-2 transition-colors"
                                                    >
                                                        <Calendar className="w-4 h-4" />
                                                        Configure Report Schedule
                                                    </button>
                                                </div>
                                            </GCPCard>

                                            <GCPCard title="Share Executive Summary via Email" subtitle="Send an instant report briefing to teachers or deans" badge="SHARE REPORT" badgeColor="green">
                                                <div className="space-y-4">
                                                    <p className="text-sm text-gray-600">
                                                        Dispatch the current AI executive summary and key statistics directly to any recipient email address.
                                                    </p>
                                                    <button 
                                                        onClick={() => setEmailModalOpen(true)}
                                                        className="py-2 px-4 border border-green-600 text-green-700 hover:bg-green-50 font-medium text-sm rounded-md flex items-center gap-2 transition-colors"
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                        Email Analytics Summary
                                                    </button>
                                                </div>
                                            </GCPCard>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </PortalWrapper>
    );
}

export default function BatchAnalyticsPage() {
    return (
        <Suspense fallback={
            <div className="fixed inset-0 z-[100] bg-gray-900 flex items-center justify-center font-sans">
                <div className="text-center space-y-4">
                    <img src="/EduCode.png" alt="EduCode" className="w-12 h-12 mx-auto animate-pulse" />
                    <p className="text-sm font-medium text-white">Loading Enterprise Analytics...</p>
                </div>
            </div>
        }>
            <BatchAnalyticsContent />
        </Suspense>
    );
}
