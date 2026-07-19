"use client";

import React, { useState, useEffect } from 'react';
import { useLiveExams } from '@/lib/hooks/useLiveExams';
import { Loader2, AlertCircle, Clock, PlusCircle, RefreshCw, PlayCircle } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

// Helper to format ms to mm:ss
function formatTimeLeft(ms) {
    if (ms === null || ms === undefined) return "Unlimited (Practice)";
    if (ms <= 0) return "00:00 (Time Up)";
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function LiveExamsPage() {
    const { liveExams, loading, error, refreshLiveExams, extendTime, extendAttempt } = useLiveExams();
    const [localTimers, setLocalTimers] = useState({});
    const [actionLoading, setActionLoading] = useState(null);

    // Sync local timers when liveExams updates
    useEffect(() => {
        const newTimers = {};
        liveExams.forEach(exam => {
            if (exam.time_left !== null) {
                newTimers[exam.student_id + '_' + exam.course_id + '_' + exam.lecture_id + '_' + exam.test_type] = exam.time_left;
            }
        });
        setLocalTimers(newTimers);
    }, [liveExams]);

    // Tick local timers down every second
    useEffect(() => {
        const interval = setInterval(() => {
            setLocalTimers(prev => {
                const next = { ...prev };
                for (const key in next) {
                    if (next[key] > 0) {
                        next[key] = Math.max(0, next[key] - 1000);
                    }
                }
                return next;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleExtendTime = async (exam) => {
        const key = exam.student_id + '_' + exam.course_id + '_' + exam.lecture_id + '_' + exam.test_type + '_time';
        setActionLoading(key);
        const res = await extendTime(exam.student_id, exam.course_id, exam.lecture_id, exam.test_type, 10 * 60 * 1000);
        if (res.success) {
            toast.success("+10 Mins Added!");
        } else {
            toast.error(res.message || "Failed to add time");
        }
        setActionLoading(null);
    };

    const handleExtendAttempt = async (exam) => {
        const key = exam.student_id + '_' + exam.course_id + '_' + exam.lecture_id + '_' + exam.test_type + '_attempt';
        setActionLoading(key);
        const res = await extendAttempt(exam.student_id, exam.course_id, exam.lecture_id, exam.test_type);
        if (res.success) {
            toast.success("+1 Attempt Added!");
        } else {
            toast.error(res.message || "Failed to add attempt");
        }
        setActionLoading(null);
    };

    if (loading && liveExams.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-500 font-medium text-lg">Loading Live Exams Board...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto mt-10 neu-raised p-8 text-center text-red-500 border-red-200">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-semibold text-lg">{error}</p>
                <button onClick={refreshLiveExams} className="mt-4 px-4 py-2 bg-[var(--neu-danger-soft)] text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn pb-20 p-6">
            <Toaster position="top-right" />
            
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                        <span className="w-12 h-12 rounded-2xl neu-chip neu-chip-danger flex items-center justify-center shrink-0"><PlayCircle className="w-6 h-6" /></span>
                        Live Exam Board
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Monitor active test takers, real-time progress, and grant time/attempt extensions.</p>
                </div>
                <button 
                    onClick={refreshLiveExams}
                    className="flex items-center gap-2 px-4 py-2 neu-raised rounded-xl neu-hover transition-all font-semibold text-gray-700 dark:text-gray-300 shadow-sm"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Now
                </button>
            </div>

            <div className="neu-raised overflow-hidden rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-900/50 border-b border-[var(--neu-divider)]">
                                <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-300 text-sm uppercase tracking-wider">Student</th>
                                <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-300 text-sm uppercase tracking-wider">Exam Details</th>
                                <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-300 text-sm uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-300 text-sm uppercase tracking-wider">Time Left</th>
                                <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-300 text-sm uppercase tracking-wider">Attempts</th>
                                <th className="px-6 py-4 font-bold text-gray-600 dark:text-gray-300 text-sm uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                            {liveExams.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 font-medium">
                                        <PlayCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                        No active test takers at the moment.
                                    </td>
                                </tr>
                            ) : (
                                liveExams.map(exam => {
                                    const key = exam.student_id + '_' + exam.course_id + '_' + exam.lecture_id + '_' + exam.test_type;
                                    const timerKeyTime = key + '_time';
                                    const timerKeyAttempt = key + '_attempt';
                                    const localTime = localTimers[key];
                                    const isTimeUp = localTime <= 0 && localTime !== null && localTime !== undefined;

                                    return (
                                        <tr key={key} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 dark:text-white">{exam.student_name}</div>
                                                <div className="text-xs text-gray-500 font-mono mt-1">{exam.uni_reg_id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">{exam.course_name}</div>
                                                <div className="text-sm text-blue-600 dark:text-blue-400 mt-1 line-clamp-1">{exam.lecture_name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${exam.test_type === 'coding' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {exam.test_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`flex items-center gap-2 font-mono text-lg font-bold ${isTimeUp ? 'text-red-500' : 'text-[var(--neu-success)] dark:text-[var(--neu-success)]'}`}>
                                                    <Clock className="w-5 h-5" />
                                                    {formatTimeLeft(localTime)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-700 dark:text-gray-300">
                                                    <span className="text-lg">{exam.current_attempt}</span>
                                                    <span className="text-gray-400 mx-1">/</span>
                                                    <span>{exam.allowed_attempts}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {exam.time_left !== null && (
                                                        <button 
                                                            onClick={() => handleExtendTime(exam)}
                                                            disabled={actionLoading === timerKeyTime}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--neu-success-soft)] dark:bg-emerald-900/20 text-emerald-700 dark:text-[var(--neu-success)] border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-[var(--neu-success-soft)] dark:hover:bg-emerald-900/40 transition-colors text-sm font-bold disabled:opacity-50"
                                                        >
                                                            {actionLoading === timerKeyTime ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                                                            10 Mins
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleExtendAttempt(exam)}
                                                        disabled={actionLoading === timerKeyAttempt}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--neu-achieve-soft)] dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-[var(--neu-achieve-soft)] dark:hover:bg-blue-900/40 transition-colors text-sm font-bold disabled:opacity-50"
                                                    >
                                                        {actionLoading === timerKeyAttempt ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                                                        1 Attempt
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
