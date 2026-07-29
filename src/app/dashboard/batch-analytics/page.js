'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, Target, Users, BookOpen, Layers, AlertCircle, Code, FileText, BarChart3, TrendingUp } from 'lucide-react';
import { API_CONFIG } from '@/utils/api';
import { swrFetcher } from '@/utils/fetcher';
import PortalWrapper from '@/components/DeepDive/PortalWrapper';
import { CircularProgress } from '@/components/DeepDive/CircularProgress';

function StatCard({ label, value, icon: Icon, colorClass }) {
    return (
        <div className="neu-flat p-6 rounded-2xl flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <div className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-1">{label}</div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">{value}</div>
            </div>
        </div>
    );
}

export default function BatchAnalyticsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const batch_id = searchParams.get('batch_id');

    const { data: response, error, isLoading } = useSWR(
        batch_id ? `${API_CONFIG.baseUrl.admin}/admin/analytics/batch-overview?batch_id=${batch_id}` : null,
        swrFetcher,
        { revalidateOnFocus: false }
    );

    const data = response?.data;

    return (
        <PortalWrapper>
            <div className="h-full flex flex-col bg-[var(--neu-bg)] text-gray-900 dark:text-white">
                {/* Header */}
                <div className="flex-none neu-flat border-b border-[var(--neu-divider)] px-8 py-5 flex items-center justify-between z-10 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-xl neu-raised flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <BarChart3 className="w-6 h-6 text-[var(--neu-achieve)]" />
                                Batch Analytics Overview
                            </h1>
                            <p className="text-xs text-gray-500 mt-1">Aggregated performance data for all students in the batch</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="max-w-7xl mx-auto space-y-8">
                        
                        {isLoading && (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-gray-500 flex flex-col items-center gap-3">
                                    <CircularProgress progress={100} size={40} className="animate-spin opacity-50" />
                                    <span className="text-sm font-bold tracking-widest uppercase">Analyzing Batch Data...</span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="neu-flat p-6 rounded-2xl border-l-4 border-red-500 text-red-500 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold">Failed to load analytics</div>
                                    <div className="text-sm opacity-80 mt-1">{error.message || 'Unknown error occurred'}</div>
                                </div>
                            </div>
                        )}

                        {!isLoading && !error && data && (
                            <>
                                {/* Top Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <StatCard label="Total Students" value={data.total_students} icon={Users} colorClass="bg-blue-500/10 text-blue-500" />
                                    <StatCard label="Average Score" value={`${data.average_score}%`} icon={Target} colorClass="bg-green-500/10 text-green-500" />
                                    <StatCard label="Coding Average" value={`${data.types?.coding || 0}%`} icon={Code} colorClass="bg-violet-500/10 text-violet-500" />
                                    <StatCard label="MCQ Average" value={`${data.types?.mcq || 0}%`} icon={FileText} colorClass="bg-orange-500/10 text-orange-500" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Student Categorization */}
                                    <div className="lg:col-span-1 space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2">Student Performance Categories</h3>
                                        <div className="neu-flat p-6 rounded-2xl space-y-4">
                                            {[
                                                { label: 'Excellent (≥90%)', val: data.categories?.excellent || 0, color: 'bg-green-500' },
                                                { label: 'Good (75-89%)', val: data.categories?.good || 0, color: 'bg-blue-500' },
                                                { label: 'Average (50-74%)', val: data.categories?.average || 0, color: 'bg-yellow-500' },
                                                { label: 'Weak (<50%)', val: data.categories?.weak || 0, color: 'bg-red-500' }
                                            ].map((cat, i) => {
                                                const pct = data.total_students > 0 ? Math.round((cat.val / data.total_students) * 100) : 0;
                                                return (
                                                    <div key={i}>
                                                        <div className="flex justify-between text-xs font-bold mb-1">
                                                            <span>{cat.label}</span>
                                                            <span className="text-gray-500">{cat.val} students ({pct}%)</span>
                                                        </div>
                                                        <div className="h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                                            <div className={`h-full ${cat.color}`} style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Weak Points */}
                                    <div className="lg:col-span-2 space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                            Major Weak Points (Units)
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {data.weak_units && data.weak_units.length > 0 ? (
                                                data.weak_units.map((unit, i) => (
                                                    <div key={i} className="neu-flat p-4 rounded-xl flex items-center justify-between border-l-4 border-red-500/50">
                                                        <div className="truncate pr-4 text-sm font-bold" title={unit.name}>{unit.name}</div>
                                                        <div className="flex-shrink-0 text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded-md text-xs">
                                                            Avg {unit.score}%
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-full text-center text-gray-500 text-sm py-4 italic">No weak points identified yet.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Course Wise */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-[var(--neu-achieve)]" />
                                            Course Wise Average
                                        </h3>
                                        <div className="neu-flat p-6 rounded-2xl space-y-4">
                                            {Object.entries(data.courses || {}).map(([cName, score], i) => (
                                                <div key={i} className="flex items-center gap-4">
                                                    <div className="flex-1 truncate text-sm font-bold">{cName}</div>
                                                    <div className="w-24 text-right">
                                                        <div className="text-xs font-bold text-[var(--neu-achieve)]">{score}%</div>
                                                        <div className="h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden mt-1">
                                                            <div className="h-full bg-[var(--neu-achieve)]" style={{ width: `${score}%` }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {Object.keys(data.courses || {}).length === 0 && (
                                                <div className="text-sm text-gray-500 italic text-center">No course data</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Section Wise */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-cyan-500" />
                                            Section Wise Average
                                        </h3>
                                        <div className="neu-flat p-6 rounded-2xl space-y-4">
                                            {Object.entries(data.sections || {}).map(([sName, score], i) => (
                                                <div key={i} className="flex items-center gap-4">
                                                    <div className="flex-1 truncate text-sm font-bold">{sName}</div>
                                                    <div className="w-24 text-right">
                                                        <div className="text-xs font-bold text-cyan-500">{score}%</div>
                                                        <div className="h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden mt-1">
                                                            <div className="h-full bg-cyan-500" style={{ width: `${score}%` }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {Object.keys(data.sections || {}).length === 0 && (
                                                <div className="text-sm text-gray-500 italic text-center">No section data</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </PortalWrapper>
    );
}
