"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { API_CONFIG } from "@/utils/api";
import { getAdminToken } from "@/utils/cookies";
import { Loader2, AlertCircle, ArrowLeft, Download, Clock, Focus, MonitorOff, ShieldAlert, CheckCircle2, XCircle, Terminal, FileCode2, History } from "lucide-react";

function StudentReportContent() {
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
    const [expandedMcq, setExpandedMcq] = useState(null);
    const [expandedAttempt, setExpandedAttempt] = useState(null);
    
    // Lazy Loading State
    const [codingDetailsCache, setCodingDetailsCache] = useState({});
    const [attemptMetadataCache, setAttemptMetadataCache] = useState({});
    const [loadingDetails, setLoadingDetails] = useState({});

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

    const handleExpandSubmission = async (idx, questionId) => {
        if (expandedSubmission === idx) {
            setExpandedSubmission(null);
            return;
        }
        setExpandedSubmission(idx);
        if (questionId && !codingDetailsCache[questionId] && !loadingDetails[questionId]) {
            setLoadingDetails(prev => ({ ...prev, [questionId]: true }));
            try {
                const token = getAdminToken();
                const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
                const res = await fetch(`${API_CONFIG.baseUrl.admin}/admin/analytics/question-coding-details`, {
                    method: "POST",
                    headers,
                    credentials: "include",
                    body: JSON.stringify({ question_id: questionId })
                });
                const resData = await res.json();
                if (resData.success && resData.data) {
                    setCodingDetailsCache(prev => ({ ...prev, [questionId]: resData.data }));
                }
            } catch (e) {
                console.error("Failed to load question details:", e);
            } finally {
                setLoadingDetails(prev => ({ ...prev, [questionId]: false }));
            }
        }
    };

    const handleExpandMcq = (idx) => {
        setExpandedMcq(expandedMcq === idx ? null : idx);
    };

    const handleExpandAttempt = async (idx, resultIds) => {
        if (expandedAttempt === idx) {
            setExpandedAttempt(null);
            return;
        }
        setExpandedAttempt(idx);

        if (!attemptMetadataCache[idx] && resultIds && resultIds.length > 0) {
            try {
                const token = getAdminToken();
                const res = await fetch(`${API_CONFIG.baseUrl.admin}/admin/analytics/result-metadata`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify({ result_ids: resultIds })
                });
                const resData = await res.json();
                if (resData.success) {
                    setAttemptMetadataCache(prev => ({ ...prev, [idx]: resData.data }));
                }
            } catch (err) {
                console.error("Failed to load attempt metadata:", err);
            }
        }
    };

    const handleExportPDF = async () => {
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
        const html2pdf = (await import("html2pdf.js")).default;
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
    const codingSubmissions = submissions ? submissions.filter(s => s.question?.question_type === 'coding' || !s.question?.question_type) : [];
    const mcqSubmissions = submissions ? submissions.filter(s => s.question?.question_type === 'mcq') : [];

    // Derived Exam Stats from proctoring[0] if available
    const examLog = proctoring && proctoring.length > 0 ? proctoring[0] : null;

    return (
        <div className="space-y-4 animate-fadeIn pb-20">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print-hide">
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
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{attempts?.[0]?.course_name || courseId}</div>
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
                            {attempts.map((att, idx) => {
                                const isExpanded = expandedAttempt === idx;
                                const metaDataList = attemptMetadataCache[idx];
                                return (
                                <div key={idx} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden mb-3 bg-gray-50 dark:bg-slate-800/50">
                                    <button onClick={() => handleExpandAttempt(idx, att.result_ids)} className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-left">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold">
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{new Date(att.submitted_at).toLocaleString()}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">ID: {att.result_ids?.length ? att.result_ids[0] + (att.result_ids.length > 1 ? ` (+${att.result_ids.length - 1} more)` : '') : att.result_id || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900 dark:text-white text-lg">
                                                {att.marks_obtained || 0} <span className="text-sm font-normal text-gray-500">Marks</span>
                                            </div>
                                            <div className="flex justify-end gap-2 mt-1">
                                                {att.submit_reason && <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] uppercase tracking-wider font-bold">{att.submit_reason}</span>}
                                                <span className="text-xs text-blue-500 font-medium">{isExpanded ? "Hide Metadata" : "View Metadata"}</span>
                                            </div>
                                        </div>
                                    </button>
                                    {isExpanded && (
                                        <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
                                            {metaDataList ? (
                                                <div className="space-y-4">
                                                    {metaDataList.map((meta, mIdx) => (
                                                        <div key={mIdx} className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                                                            <p className="font-bold text-gray-900 dark:text-white mb-3 text-xs uppercase tracking-wider">Result ID: <span className="font-mono text-blue-500">{meta.result_id}</span></p>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="overflow-hidden">
                                                                    <p className="font-bold text-[10px] text-gray-500 uppercase mb-1">Start Config</p>
                                                                    <pre className="text-xs p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg overflow-x-auto custom-scrollbar font-mono">{JSON.stringify(meta.start_config, null, 2)}</pre>
                                                                </div>
                                                                <div className="overflow-hidden">
                                                                    <p className="font-bold text-[10px] text-gray-500 uppercase mb-1">End Config / Analytics</p>
                                                                    <pre className="text-xs p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg overflow-x-auto custom-scrollbar font-mono">{JSON.stringify(meta.analytics || meta.end_config, null, 2)}</pre>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex justify-center items-center py-4">
                                                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                );
                            })}
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
                    
                    {codingSubmissions && codingSubmissions.length > 0 ? (
                        <div className="space-y-4">
                            {codingSubmissions.map((sub, idx) => {
                                const isExpanded = expandedSubmission === idx;
                                const isPassed = sub.compile_status === "passed" || sub.compile_status === "accepted";
                                
                                return (
                                    <div key={idx} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                        {/* Accordion Header */}
                                        <button 
                                            onClick={() => handleExpandSubmission(idx, sub.question_id)}
                                            className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                {isPassed ? (
                                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                                ) : (
                                                    <XCircle className="w-6 h-6 text-red-500" />
                                                )}
                                                <div className="text-left">
                                                    <p className="font-bold text-gray-900 dark:text-white line-clamp-1">{sub.question?.topic || (sub.question?.question_body ? sub.question.question_body.replace(/<[^>]*>?/gm, '').substring(0, 50) + "..." : `Question ID: ${sub.question_id}`)}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'Unknown Date'} • Lang: {sub.language || sub.question?.compiler_code?.language || 'Code'}</p>
                                                </div>
                                            </div>
                                            <div className="text-sm font-semibold text-gray-500">
                                                {isExpanded ? "Collapse" : "Expand Code"}
                                            </div>
                                        </button>

                                        {/* Accordion Body */}
                                        {isExpanded && (
                                            <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 relative">
                                                {loadingDetails[sub.question_id] && (
                                                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
                                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                                    </div>
                                                )}
                                                
                                                {(() => {
                                                    const qDetails = { ...(sub.question || {}), ...(codingDetailsCache[sub.question_id] || {}) };
                                                    return (
                                                        <>
                                                            {/* Question Complete Details */}
                                                            <div className="mb-6 space-y-4 text-sm text-gray-800 dark:text-gray-200">
                                                                {qDetails.description && (
                                                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                                                                        <h4 className="font-bold uppercase tracking-wider text-xs text-gray-500 mb-2">Description</h4>
                                                                        <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: qDetails.description }} />
                                                                    </div>
                                                                )}
                                                    
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {qDetails.input_format && (
                                                                        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                                                                            <h4 className="font-bold uppercase tracking-wider text-xs text-gray-500 mb-2">Input Format</h4>
                                                                            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: qDetails.input_format }} />
                                                                        </div>
                                                                    )}
                                                                    {qDetails.output_format && (
                                                                        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                                                                            <h4 className="font-bold uppercase tracking-wider text-xs text-gray-500 mb-2">Output Format</h4>
                                                                            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: qDetails.output_format }} />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {qDetails.code_constraint && (
                                                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                                                                        <h4 className="font-bold uppercase tracking-wider text-xs text-gray-500 mb-2">Constraints</h4>
                                                                        <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: qDetails.code_constraint }} />
                                                                    </div>
                                                                )}

                                                                {(qDetails.has_whitelist || qDetails.has_blacklist) && (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {qDetails.has_whitelist && (
                                                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                                                                                <h4 className="font-bold uppercase tracking-wider text-xs text-emerald-600 dark:text-emerald-400 mb-2">Whitelist</h4>
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {qDetails.whitelist?.map((w, i) => <span key={i} className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-xs font-mono">{w}</span>)}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {qDetails.has_blacklist && (
                                                                            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800/50">
                                                                                <h4 className="font-bold uppercase tracking-wider text-xs text-red-600 dark:text-red-400 mb-2">Blacklist</h4>
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {qDetails.blacklist?.map((b, i) => <span key={i} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-mono">{b}</span>)}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                {/* Test Cases summary if available */}
                                                {(sub.passed_test_cases !== null && sub.passed_test_cases !== undefined) && (
                                                    <div className="mb-4 flex gap-4">
                                                        <span className="badge bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
                                                            {sub.passed_test_cases} Passed
                                                        </span>
                                                        <span className="badge bg-red-100 text-red-700 border border-red-200 px-3 py-1 rounded-full text-xs font-bold">
                                                            {(sub.total_test_cases || 0) - (sub.passed_test_cases || 0)} Failed
                                                        </span>
                                                    </div>
                                                )}

                                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                                {/* Student Code */}
                                                                <div className="relative border border-blue-200 dark:border-blue-900/50 rounded-xl overflow-hidden shadow-sm">
                                                                    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 flex justify-between items-center">
                                                                        <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Student Written Code</span>
                                                                        <span className="text-xs font-mono text-blue-800 dark:text-blue-300 bg-blue-200/50 dark:bg-blue-900/60 px-2 py-1 rounded">{sub.language || 'Code'}</span>
                                                                    </div>
                                                                    <pre className="p-4 bg-blue-900/5 text-blue-900 dark:text-blue-100 font-mono text-sm overflow-x-auto custom-scrollbar h-full min-h-[300px]">
                                                                        <code>{sub.submitted_code || "// No code provided"}</code>
                                                                    </pre>
                                                                </div>

                                                                {/* Reference Code */}
                                                                <div className="relative border border-emerald-200 dark:border-emerald-900/50 rounded-xl overflow-hidden shadow-sm">
                                                                    <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center">
                                                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Reference Code (Compiler Code)</span>
                                                                        {qDetails.compiler_code?.language && <span className="text-xs font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-200/50 dark:bg-emerald-900/60 px-2 py-1 rounded">{qDetails.compiler_code.language}</span>}
                                                                    </div>
                                                                    <pre className="p-4 bg-emerald-900/5 text-emerald-900 dark:text-emerald-100 font-mono text-sm overflow-x-auto custom-scrollbar h-full min-h-[300px]">
                                                                        <code>{qDetails.compiler_code?.code || (typeof qDetails.compiler_code === 'string' ? qDetails.compiler_code : null) || "// No reference code available"}</code>
                                                                    </pre>
                                                                </div>
                                                            </div>

                                                {/* Test Cases Results */}
                                                {sub.full_result && Array.isArray(sub.full_result) && sub.full_result.length > 0 && (
                                                    <div className="mt-6 space-y-4">
                                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Test Cases Run</h4>
                                                        <div className="grid grid-cols-1 gap-4">
                                                            {sub.full_result.map((tc, tcIdx) => {
                                                                const key = Object.keys(tc)[0];
                                                                if (!key) return null;
                                                                const res = tc[key];
                                                                if (!res) return null;
                                                                const isPassed = res.testCasePassed;
                                                                return (
                                                                    <div key={tcIdx} className={`p-4 rounded-xl border ${isPassed ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-900/10' : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/10'}`}>
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <span className={`font-semibold text-sm ${isPassed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                                                                {key.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                                                                            </span>
                                                                            {isPassed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                                                        </div>
                                                                        {res.input !== undefined && (
                                                                            <div className="mb-2">
                                                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Input</span>
                                                                                <pre className="mt-1 p-2 bg-white dark:bg-slate-800 rounded text-xs font-mono overflow-x-auto text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-slate-700">{res.input || 'Hidden'}</pre>
                                                                            </div>
                                                                        )}
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <div>
                                                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expected Output</span>
                                                                                <pre className="mt-1 p-2 bg-white dark:bg-slate-800 rounded text-xs font-mono overflow-x-auto text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-slate-700">{res.expectedOutput || 'Hidden'}</pre>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actual Output</span>
                                                                                <pre className="mt-1 p-2 bg-white dark:bg-slate-800 rounded text-xs font-mono overflow-x-auto text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-slate-700">{res.userOutput || (res.compilerMessage ? 'Compilation Error' : 'No Output')}</pre>
                                                                            </div>
                                                                        </div>
                                                                        {res.compilerMessage && (
                                                                            <div className="mt-3">
                                                                                <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Error / Compiler Message</span>
                                                                                <pre className="mt-1 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs font-mono text-red-700 dark:text-red-300 overflow-x-auto border border-red-200 dark:border-red-800/50 whitespace-pre-wrap">{res.compilerMessage}</pre>
                                                                            </div>
                                                                        )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
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

                {/* 5. MCQ Submissions Details */}
                {mcqSubmissions && mcqSubmissions.length > 0 && (
                    <>
                        <hr className="border-gray-200 dark:border-slate-800" />
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileCode2 className="w-5 h-5 text-violet-500" /> MCQ Submissions Deep Dive
                            </h3>
                            
                            <div className="space-y-4">
                                {mcqSubmissions.map((sub, idx) => {
                                    const isExpanded = expandedMcq === idx;
                                    const isPassed = sub.score > 0;
                                    const options = sub.question?.options || [];
                                    const selectedOptionText = sub.submitted_code;
                                    
                                    return (
                                        <div key={idx} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                            {/* Accordion Header */}
                                            <button 
                                                onClick={() => setExpandedMcq(isExpanded ? null : idx)}
                                                className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    {isPassed ? (
                                                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                                    ) : (
                                                        <XCircle className="w-6 h-6 text-red-500" />
                                                    )}
                                                    <div className="text-left">
                                                        <p className="font-bold text-gray-900 dark:text-white line-clamp-1">{sub.question?.topic || (sub.question?.question_body ? sub.question.question_body.replace(/<[^>]*>?/gm, '').substring(0, 50) + "..." : `Question ID: ${sub.question_id}`)}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'Unknown Date'} • Score: {sub.score || 0}</p>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-semibold text-gray-500">
                                                    {isExpanded ? "Collapse" : "View Details"}
                                                </div>
                                            </button>

                                            {/* Accordion Body */}
                                            {isExpanded && (
                                                <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
                                                    <div className="mb-4 text-gray-800 dark:text-gray-200 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sub.question?.question_body }} />
                                                    
                                                    <div className="space-y-2 mt-4">
                                                        {options.map((opt, oIdx) => {
                                                            const isSelected = selectedOptionText == oIdx || selectedOptionText === opt.option;
                                                            const isCorrect = opt.isAnswer;
                                                            
                                                            let optClass = "p-3 rounded-xl border ";
                                                            if (isSelected && isCorrect) {
                                                                optClass += "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200";
                                                            } else if (isSelected && !isCorrect) {
                                                                optClass += "bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-200";
                                                            } else if (isCorrect) {
                                                                optClass += "bg-emerald-50/50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-300";
                                                            } else {
                                                                optClass += "bg-white border-gray-200 text-gray-600 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400";
                                                            }

                                                            return (
                                                                <div key={oIdx} className={optClass}>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="font-medium" dangerouslySetInnerHTML={{ __html: opt.option }} />
                                                                        {isSelected && <span className="text-xs uppercase font-bold tracking-wider">Your Answer</span>}
                                                                        {(!isSelected && isCorrect) && <span className="text-xs uppercase font-bold tracking-wider text-emerald-500">Correct Answer</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}

export default function StudentReportPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
            <StudentReportContent />
        </Suspense>
    );
}
