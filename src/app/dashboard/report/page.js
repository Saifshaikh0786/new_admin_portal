"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { API_CONFIG } from "@/utils/api";
import { getAdminToken } from "@/utils/cookies";
import { Loader2, AlertCircle, ArrowLeft, Download, Clock, Focus, MonitorOff, ShieldAlert, CheckCircle2, XCircle, Terminal, FileCode2, History } from "lucide-react";
import html2pdf from "html2pdf.js";

export default function DeepDiveReportPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    
    const studentId = searchParams.get("student_id");
    const courseId = searchParams.get("course_id");

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Accordion State
    const [expandedSubmission, setExpandedSubmission] = useState(null);

    useEffect(() => {
        if (!authLoading && user && studentId && courseId) {
            fetchDeepDiveData();
        }
    }, [authLoading, user, studentId, courseId]);

    const fetchDeepDiveData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAdminToken();
            const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.analytics.studentDeepDive}`, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({
                    student_id: studentId,
                    course_id: courseId
                })
            });
            const resData = await res.json();
            
            if (resData.success) {
                setData(resData.data);
            } else {
                setError(resData.message || "Failed to load deep dive report.");
            }
        } catch (e) {
            setError("Network error while fetching report.");
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = () => {
        const element = document.getElementById("report-content");
        const opt = {
            margin: 10,
            filename: `DeepDive_${data?.student?.reg_id || studentId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        // Add a temporary class to hide export buttons during PDF gen
        element.classList.add("print-mode");
        html2pdf().set(opt).from(element).save().then(() => {
            element.classList.remove("print-mode");
        });
    };

    if (loading || authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh]">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Compiling Deep Dive Report...</p>
                <p className="text-xs text-gray-400 mt-2">Merging attempts, submissions, and proctoring logs</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="max-w-3xl mx-auto mt-10">
                <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="glass-panel p-12 text-center text-red-500 border-red-200">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-semibold text-lg">{error || "Data not found"}</p>
                </div>
            </div>
        );
    }

    const { student, attempts, submissions, proctoring } = data;

    // Derived Exam Stats from proctoring[0] if available
    const examLog = proctoring && proctoring.length > 0 ? proctoring[0] : null;

    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-20 z-20 bg-slate-50/80 dark:bg-[#0B1120]/80 backdrop-blur-md py-4 -mx-4 px-4 sm:-mx-8 sm:px-8">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>
                
                <div className="flex gap-2 print-hide">
                    <button onClick={handleExportPDF} className="btn-primary flex items-center gap-2 shadow-lg shadow-blue-500/20">
                        <Download className="w-4 h-4" /> Export as PDF
                    </button>
                </div>
            </div>

            {/* Main Report Container */}
            <div id="report-content" className="max-w-6xl mx-auto space-y-8 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-slate-800">
                
                {/* 1. Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-gray-200 dark:border-slate-800 pb-8">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                            {student?.student_name?.charAt(0) || "S"}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">{student?.student_name}</h1>
                            <p className="text-blue-600 dark:text-blue-400 font-mono text-lg">{student?.reg_id}</p>
                            <div className="flex gap-4 mt-2 text-sm text-gray-500 font-medium">
                                <span>Batch: {student?.batch || "N/A"}</span>
                                <span>Section: {student?.section || "N/A"}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500 mb-1 uppercase font-semibold">Course Under Review</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{student?.course_name || courseId}</div>
                    </div>
                </div>

                {/* 2. Overview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Course Progress */}
                    <div className="bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700">
                        <p className="text-xs text-gray-500 font-bold uppercase mb-2">Overall Progress</p>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-gray-900 dark:text-white">{student?.overall_course_percent || 0}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full mt-4 overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${student?.overall_course_percent || 0}%` }}/>
                        </div>
                    </div>

                    {/* Time Tracking */}
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-2 flex items-center gap-1"><Clock className="w-4 h-4"/> Time Utilization</p>
                        <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{student?.time_utilization_percent || 0}%</div>
                        <p className="text-sm text-emerald-600/80 mt-2 font-medium">
                            {Math.round((student?.time_spent || 0)/60)}m spent / {Math.round((student?.total_duration || 0)/60)}m allowed
                        </p>
                    </div>

                    {/* Exam Attempts */}
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase mb-2 flex items-center gap-1"><History className="w-4 h-4"/> Attempts Used</p>
                        <div className="text-3xl font-black text-amber-700 dark:text-amber-300">
                            {attempts?.length || 0} <span className="text-lg font-medium text-amber-600/60">/ {student?.allowed_attempts || 1}</span>
                        </div>
                    </div>

                    {/* Proctoring Flags */}
                    <div className={`p-5 rounded-2xl border ${examLog && (examLog.tab_switches_count > 3 || examLog.focus_lost_count > 5) ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30' : 'bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-700'}`}>
                        <p className={`text-xs font-bold uppercase mb-2 flex items-center gap-1 ${examLog && (examLog.tab_switches_count > 3 || examLog.focus_lost_count > 5) ? 'text-red-600' : 'text-gray-500'}`}>
                            <ShieldAlert className="w-4 h-4"/> Security Flags
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <div>
                                <div className="text-2xl font-black text-gray-900 dark:text-white">{examLog?.tab_switches_count || 0}</div>
                                <div className="text-[10px] text-gray-500 uppercase font-semibold">Tab Switch</div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-gray-900 dark:text-white">{examLog?.focus_lost_count || 0}</div>
                                <div className="text-[10px] text-gray-500 uppercase font-semibold">Focus Lost</div>
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-gray-200 dark:border-slate-800" />

                {/* 3. Attempt History */}
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Attempt History</h3>
                    {attempts && attempts.length > 0 ? (
                        <div className="space-y-3">
                            {attempts.map((att, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold">
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{new Date(att.attempt_time || att.created_at).toLocaleString()}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">ID: {att.id || att.attempt_id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-gray-900 dark:text-white text-lg">
                                            {att.marks || att.score || 0} <span className="text-sm font-normal text-gray-500">Marks</span>
                                        </div>
                                        <span className="badge bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300 text-[10px]">{att.type || "unknown"}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic">No formal attempts recorded.</p>
                    )}
                </div>

                <hr className="border-gray-200 dark:border-slate-800" />

                {/* 4. Submissions Details */}
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-blue-500" /> Coding Submissions Deep Dive
                    </h3>
                    
                    {submissions && submissions.length > 0 ? (
                        <div className="space-y-4">
                            {submissions.map((sub, idx) => {
                                const isExpanded = expandedSubmission === idx;
                                const isPassed = sub.status === "passed" || sub.status === "accepted";
                                
                                return (
                                    <div key={idx} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                        {/* Accordion Header */}
                                        <button 
                                            onClick={() => setExpandedSubmission(isExpanded ? null : idx)}
                                            className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                {isPassed ? (
                                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                                ) : (
                                                    <XCircle className="w-6 h-6 text-red-500" />
                                                )}
                                                <div className="text-left">
                                                    <p className="font-bold text-gray-900 dark:text-white">{sub.question_title || `Question ID: ${sub.question_id}`}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{new Date(sub.created_at).toLocaleString()} • Lang: {sub.language || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="text-sm font-semibold text-gray-500">
                                                {isExpanded ? "Collapse" : "Expand Code"}
                                            </div>
                                        </button>

                                        {/* Accordion Body */}
                                        {isExpanded && (
                                            <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
                                                
                                                {/* Test Cases summary if available */}
                                                {(sub.test_cases_passed !== undefined) && (
                                                    <div className="mb-4 flex gap-4">
                                                        <span className="badge bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                            {sub.test_cases_passed} Passed
                                                        </span>
                                                        <span className="badge bg-red-100 text-red-700 border border-red-200">
                                                            {(sub.total_test_cases || 0) - (sub.test_cases_passed || 0)} Failed
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="relative">
                                                    <div className="absolute top-0 right-0 p-2 bg-gray-800/50 rounded-bl-lg text-xs text-gray-400 font-mono">
                                                        {sub.language || 'code'}
                                                    </div>
                                                    <pre className="p-4 rounded-xl bg-[#0d1117] text-gray-300 font-mono text-sm overflow-x-auto custom-scrollbar">
                                                        <code>{sub.code || sub.submission_code || "// No code provided"}</code>
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl text-gray-500">
                            <FileCode2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p>No coding submissions found for this course.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
