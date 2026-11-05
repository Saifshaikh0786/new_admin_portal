"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowLeft, Terminal, AlertCircle, Clock, Globe, ShieldAlert, Monitor, Activity, Shield, Wifi, WifiOff, FileText, CheckCircle, XCircle, Download, Video, Code, ChevronDown, Target, Layers, Award } from 'lucide-react';
import useSWR from 'swr';
import { getAdminToken } from '@/utils/cookies';
import { API_CONFIG } from "@/utils/api";
import { generateExamReport } from "@/utils/generateExamReport";

// Proctoring recording location. Same URL pattern as the legacy portal;
// overridable per-exam via env without a code change.
const RECORDING_BASE = process.env.NEXT_PUBLIC_RECORDING_BASE
    || "https://objectstorage.ap-mumbai-1.oraclecloud.com/n/bm54tptt5tbw/b/bucket-20260527-0107_End_Term_Practical_2026_First_year/o/ETP_2025_C_exam_1st";
const RECORDING_SUFFIX = process.env.NEXT_PUBLIC_RECORDING_SUFFIX || "_attempt1.mp4";

function DetailsAnalysisContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const qp = (k, fb = "") => {
        const v = searchParams.get(k);
        return !v || v === "undefined" ? fb : v;
    };
    const examName = qp("examName", "Exam");
    const courseId = qp("courseId");
    const studentId = qp("studentId");
    const regNo = qp("regNo");
    const sectionName = qp("sectionName", "Section");
    const batchId = qp("batchId");
    const subUnitIdParam = qp("subUnitId");
    const nameParam = qp("name");
    const emailParam = qp("email");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [studentInfo, setStudentInfo] = useState(null);
    const [attemptsList, setAttemptsList] = useState([]);
    const [selectedAttemptNumber, setSelectedAttemptNumber] = useState(null);
    const [envLogs, setEnvLogs] = useState({});
    const [expandedQuestion, setExpandedQuestion] = useState(null);

    // Video URL logic (legacy pattern preserved)
    const videoUrl = regNo ? `${RECORDING_BASE}${regNo}${RECORDING_SUFFIX}` : "";

    useEffect(() => {
        if (!courseId || !studentId) {
            setError("Missing required parameters (courseId, studentId).");
            setLoading(false);
            return;
        }

        if (typeof window !== "undefined") {
            const token = getAdminToken();
            if (!token) {
                const currentUrl = window.location.pathname + window.location.search;
                try {
                    sessionStorage.setItem('post_login_redirect', currentUrl);
                } catch (_) {}
                router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
            }
        }
    }, [courseId, studentId, router]);

    const compositeFetcher = async () => {
            const token = getAdminToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            // Exams split MCQ and Coding into separate sub-units, so collect
            // ALL sub-units of the course, and determine whether course has MCQ and/or Coding.
            let subUnitIds = subUnitIdParam ? [subUnitIdParam] : [];
            let courseHasMcq = false;
            let courseHasCoding = false;

            const qsStructure = new URLSearchParams({ student_id: studentId, course_id: courseId }).toString();
            try {
                const structureRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.courseStructureAnalytics}?${qsStructure}`, {
                    method: 'GET', headers, credentials: 'include'
                });
                const structureJson = await structureRes.json();
                if (structureJson.success && Array.isArray(structureJson.data)) {
                    for (const unit of structureJson.data) {
                        for (const su of (unit.sub_units || [])) {
                            if (!subUnitIdParam && su.sub_unit_id) subUnitIds.push(su.sub_unit_id);
                            if (su.details?.has_mcq) courseHasMcq = true;
                            if (su.details?.has_coding) courseHasCoding = true;
                        }
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch course structure:', err);
            }

            // Analytics handoff from the deep-dive page
            let telemetry = null;
            let handoff = null;
            try {
                handoff = JSON.parse(sessionStorage.getItem('detailsAnalysisCtx') || 'null');
                if (handoff && handoff.studentId === studentId && handoff.courseId === courseId) {
                    telemetry = handoff.analytics || null;
                } else {
                    handoff = null;
                }
            } catch (e) { handoff = null; }

            const [subUnitResults, envJson, overviewJson] = await Promise.all([
                Promise.all(subUnitIds.map(suId => {
                    const qs = new URLSearchParams({ student_id: studentId, course_id: courseId, unit_id: "1", sub_unit_id: suId }).toString();
                    return fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.subUnitDetails}?${qs}`, {
                        method: 'GET', headers, credentials: 'include'
                    }).then(r => r.json()).catch(() => null);
                })),
                (async () => {
                    const qs = new URLSearchParams({ student_id: studentId, course_id: courseId }).toString();
                    return fetch(`${API_CONFIG.baseUrl.admin}/admin/analytics/exam-environment?${qs}`, {
                        method: 'GET', headers, credentials: 'include'
                    }).then(r => r.json()).catch(() => null);
                })(),
                (async () => {
                    const qsObj = { student_id: studentId };
                    if (batchId) qsObj.batch_id = batchId;
                    const qs = new URLSearchParams(qsObj).toString();
                    return fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.studentOverview}?${qs}`, {
                        method: 'GET', headers, credentials: 'include'
                    }).then(r => r.json()).catch(() => null);
                })()
            ]);

            let totalMarks = handoff?.totalMarks || 0;
            let marksBreakdown = handoff?.marksBreakdown || {};
            let completionPct = handoff?.completionPct || 0;
            if (overviewJson?.success) {
                const ec = (overviewJson.data?.exam_courses || []).find(c => c.course_id === courseId);
                if (ec?.examData) {
                    telemetry = ec.examData.analytics || telemetry || null;
                    totalMarks = ec.examData.total_marks || totalMarks || 0;
                    marksBreakdown = ec.examData.marks_breakdown || marksBreakdown || {};
                    completionPct = ec.examData.exam_completion_percentage || completionPct || 0;
                }
            }

            return { subUnitResults, envJson, overviewJson, telemetry, totalMarks, marksBreakdown, completionPct, courseHasMcq, courseHasCoding };
        };

        const { data: swrData, isLoading: isValidating, error: swrError } = useSWR(
            (courseId && studentId) ? [`details_analysis`, courseId, studentId, subUnitIdParam, batchId] : null,
            compositeFetcher,
            { revalidateOnFocus: false }
        );

        useEffect(() => {
            if (!swrData) {
                if (isValidating) setLoading(true);
                if (swrError) setError(swrError.message || "Failed to fetch data.");
                return;
            }

            setLoading(false);
            const { subUnitResults, envJson, overviewJson, telemetry, totalMarks, marksBreakdown, completionPct, courseHasMcq, courseHasCoding } = swrData;
            const studentObj = overviewJson?.data?.student;

            setStudentInfo({
                name: (nameParam && nameParam !== "Student" && nameParam !== "Unknown Student") 
                    ? nameParam 
                    : (studentObj?.student_name || nameParam || "Student"),
                email: emailParam || studentObj?.email_id || "",
                regNo: regNo || studentObj?.uni_reg_id || studentId,
                section: (sectionName && sectionName !== "Section") 
                    ? sectionName 
                    : (studentObj?.section || sectionName || "Section"),
                course: examName,
                telemetry, totalMarks, marksBreakdown, completionPct,
                courseHasMcq, courseHasCoding
            });


            if (envJson?.success) setEnvLogs(envJson.data || {});

            // Group and aggregate attempts across all sub-units of the course
            const attemptsMap = new Map();
            for (const suJson of (subUnitResults || [])) {
                if (!suJson?.success || !Array.isArray(suJson.data) || suJson.data.length === 0) continue;
                for (const att of suJson.data) {
                    const attNum = Number(att.attempt_count || att.attempt || att.overview?.attempt_number || 1);
                    if (!attemptsMap.has(attNum)) {
                        attemptsMap.set(attNum, {
                            attemptNumber: attNum,
                            submittedAt: att.overview?.submitted_at || null,
                            totalScore: 0,
                            maxScore: 0,
                            percentage: 0,
                            status: att.overview?.status || 'Completed',
                            submissions: [],
                            completionStats: att.completion_stats || null
                        });
                    }
                    const existing = attemptsMap.get(attNum);
                    existing.totalScore += (att.overview?.total_score || 0);
                    existing.maxScore += (att.overview?.max_score || 0);
                    if (att.overview?.submitted_at) {
                        if (!existing.submittedAt || new Date(att.overview.submitted_at) > new Date(existing.submittedAt)) {
                            existing.submittedAt = att.overview.submitted_at;
                        }
                    }
                    if (att.overview?.status && att.overview.status.toLowerCase() === 'passed') {
                        existing.status = 'Passed';
                    }
                    for (const s of (att.submissions || [])) {
                        existing.submissions.push({
                            ...s,
                            type: s.question_type,
                            attempt_number: attNum
                        });
                    }
                }
            }

            // Fallback if no attempts were returned from sub-units
            if (attemptsMap.size === 0) {
                attemptsMap.set(1, {
                    attemptNumber: 1,
                    submittedAt: studentInfo?.submittedAt || null,
                    totalScore: totalMarks || 0,
                    maxScore: 18,
                    percentage: completionPct || 0,
                    status: 'Completed',
                    submissions: [],
                    completionStats: null
                });
            }

            for (const att of attemptsMap.values()) {
                if (att.maxScore > 0) {
                    att.percentage = Math.round((att.totalScore / att.maxScore) * 100);
                }
            }

            // Sort descending by attempt number: Attempt 2, Attempt 1, etc.
            const sortedAttempts = Array.from(attemptsMap.values()).sort((a, b) => b.attemptNumber - a.attemptNumber);
            const highestScore = Math.max(...sortedAttempts.map(a => a.totalScore));
            const newestNum = sortedAttempts[0].attemptNumber;

            const annotatedAttempts = sortedAttempts.map(att => ({
                ...att,
                isNewest: att.attemptNumber === newestNum,
                isBest: att.totalScore === highestScore && (highestScore > 0 || sortedAttempts.length === 1)
            }));

            setAttemptsList(annotatedAttempts);
            // Default scorecard to newest attempt (as requested: "take newest as the scorw card okay")
            setSelectedAttemptNumber(prev => {
                if (prev && annotatedAttempts.some(a => a.attemptNumber === prev)) return prev;
                return newestNum;
            });
        }, [swrData, isValidating, swrError, nameParam, emailParam, regNo, studentId, sectionName, examName]);

    // ── Active Attempt & Submissions ──
    const activeAttempt = attemptsList.find(a => a.attemptNumber === selectedAttemptNumber) || attemptsList[0] || null;
    const activeAttemptNumber = activeAttempt?.attemptNumber || 1;
    const activeSubs = activeAttempt?.submissions || [];
    const mcqSubs = activeSubs.filter(s => s.type === 'mcq');
    const codingSubs = activeSubs.filter(s => s.type === 'coding');

    // Per-section timing window from submission timestamps
    const timeWindow = (subs) => {
        const ts = subs.map(s => new Date(s.submitted_at).getTime()).filter(t => !isNaN(t));
        if (ts.length === 0) return { start: null, end: null };
        return { start: new Date(Math.min(...ts)), end: new Date(Math.max(...ts)) };
    };

    const mcqDetails = {
        submissions: mcqSubs,
        timing: timeWindow(mcqSubs),
        overview: {
            total_score: mcqSubs.reduce((a, s) => a + (s.score_obtained || 0), 0),
            max_score: mcqSubs.reduce((a, s) => a + (s.max_score || 0), 0)
        }
    };

    const codingDetails = {
        submissions: codingSubs,
        timing: timeWindow(codingSubs),
        overview: {
            total_score: codingSubs.reduce((a, s) => a + (s.score_obtained || 0), 0),
            max_score: codingSubs.reduce((a, s) => a + (s.max_score || 0), 0)
        }
    };

    // ── Derived Data (legacy names preserved) ──
    const telemetry = studentInfo?.telemetry || {};
    const mcqAnalytics = mcqDetails?.proctoring_metrics || {};
    const codingAnalytics = codingDetails?.proctoring_metrics || {};

    // ── Detect MCQ & Coding section availability ──
    // Avoid false-positives from legacy empty mcq_timing logs on coding-only exams
    const hasMcq = Boolean(
        studentInfo?.courseHasMcq ||
        mcqSubs.length > 0 ||
        (studentInfo?.marksBreakdown?.mcq_marks > 0)
    );

    const hasCoding = Boolean(
        studentInfo?.courseHasCoding ||
        codingSubs.length > 0 ||
        (studentInfo?.marksBreakdown?.coding_marks > 0)
    );

    // ── Timing calculation for active attempt ──
    const attemptSubTs = activeSubs.map(s => new Date(s.submitted_at).getTime()).filter(t => !isNaN(t));
    const attemptSubStart = attemptSubTs.length > 0 ? Math.min(...attemptSubTs) : null;
    const attemptSubEnd = attemptSubTs.length > 0 ? Math.max(...attemptSubTs) : null;
    const attemptSubmittedAtTs = activeAttempt?.submittedAt ? new Date(activeAttempt.submittedAt).getTime() : null;

    // Filter candidate starts/ends respecting actual course structure
    const candidateStarts = [
        envLogs?.started_at,
        envLogs?.start_config?.timestamp,
        telemetry?.startedAt,
        hasCoding ? envLogs?.coding_timing?.startedAt : null,
        hasMcq ? envLogs?.mcq_timing?.startedAt : null,
        attemptSubStart
    ].filter(Boolean).map(t => new Date(t).getTime()).filter(t => !isNaN(t));

    const candidateEnds = [
        envLogs?.ended_at,
        envLogs?.end_config?.timestamp,
        telemetry?.lastUpdatedAt,
        hasCoding ? envLogs?.coding_timing?.lastUpdatedAt : null,
        hasMcq ? envLogs?.mcq_timing?.lastUpdatedAt : null,
        attemptSubmittedAtTs,
        attemptSubEnd
    ].filter(Boolean).map(t => new Date(t).getTime()).filter(t => !isNaN(t));

    const minStart = candidateStarts.length > 0 ? Math.min(...candidateStarts) : null;
    let validEnds = minStart ? candidateEnds.filter(t => t >= minStart) : candidateEnds;
    if (validEnds.length === 0 && candidateEnds.length > 0) {
        validEnds = candidateEnds;
    }
    const maxEnd = validEnds.length > 0 ? Math.max(...validEnds) : null;

    let examStartedAt = null;
    let examEndedAt = null;

    if (activeAttempt?.isNewest && minStart) {
        examStartedAt = new Date(minStart);
        examEndedAt = maxEnd ? new Date(maxEnd) : (attemptSubmittedAtTs ? new Date(attemptSubmittedAtTs) : null);
    } else {
        examStartedAt = attemptSubStart ? new Date(attemptSubStart) : null;
        examEndedAt = attemptSubmittedAtTs ? new Date(attemptSubmittedAtTs) : (attemptSubEnd ? new Date(attemptSubEnd) : null);
    }

    if (examStartedAt && examEndedAt && examStartedAt > examEndedAt) {
        [examStartedAt, examEndedAt] = [examEndedAt, examStartedAt];
    }

    const examDuration = (examStartedAt && examEndedAt) 
        ? Math.max(1, Math.round((examEndedAt - examStartedAt) / 60000)) 
        : null;

    // ── Per-section timing ──
    let mcqStartedAt = null;
    let mcqEndedAt = null;
    let mcqDuration = null;

    if (hasMcq) {
        if (mcqSubs.length > 0) {
            const mcqTs = mcqSubs.map(s => new Date(s.submitted_at).getTime()).filter(t => !isNaN(t));
            if (mcqTs.length > 0) {
                mcqStartedAt = new Date(Math.min(...mcqTs));
                mcqEndedAt = new Date(Math.max(...mcqTs));
            }
        } else if (activeAttempt?.isNewest && envLogs?.mcq_timing) {
            if (envLogs.mcq_timing.startedAt) mcqStartedAt = new Date(envLogs.mcq_timing.startedAt);
            if (envLogs.mcq_timing.lastUpdatedAt) mcqEndedAt = new Date(envLogs.mcq_timing.lastUpdatedAt);
        }

        if (mcqStartedAt && mcqEndedAt && mcqStartedAt > mcqEndedAt) {
            [mcqStartedAt, mcqEndedAt] = [mcqEndedAt, mcqStartedAt];
        }

        mcqDuration = mcqStartedAt && mcqEndedAt
            ? Math.max(1, Math.round((mcqEndedAt - mcqStartedAt) / 60000)) : null;
    }

    let codingStartedAt = null;
    let codingEndedAt = null;
    let codingDuration = null;

    if (hasCoding) {
        if (codingSubs.length > 0) {
            const codingTs = codingSubs.map(s => new Date(s.submitted_at).getTime()).filter(t => !isNaN(t));
            if (codingTs.length > 0) {
                codingStartedAt = new Date(Math.min(...codingTs));
                codingEndedAt = new Date(Math.max(...codingTs));
            }
        } else if (activeAttempt?.isNewest && envLogs?.coding_timing) {
            if (envLogs.coding_timing.startedAt) codingStartedAt = new Date(envLogs.coding_timing.startedAt);
            if (envLogs.coding_timing.lastUpdatedAt) codingEndedAt = new Date(envLogs.coding_timing.lastUpdatedAt);
        }

        if (codingStartedAt && codingEndedAt && codingStartedAt > codingEndedAt) {
            [codingStartedAt, codingEndedAt] = [codingEndedAt, codingStartedAt];
        }

        codingDuration = codingStartedAt && codingEndedAt
            ? Math.max(1, Math.round((codingEndedAt - codingStartedAt) / 60000)) : null;
    }

    const overallMcqScore = mcqDetails.overview.total_score;
    const maxMcqScore = mcqDetails.overview.max_score;
    const overallCodingScore = codingDetails.overview.total_score;
    const maxCodingScore = codingDetails.overview.max_score;
    const totalScore = overallMcqScore + overallCodingScore;
    const maxTotalScore = maxMcqScore + maxCodingScore;

    const examTotalMarks = studentInfo?.totalMarks || 0;
    const examMcqMarks = studentInfo?.marksBreakdown?.mcq_marks || 0;
    const examCodingMarks = studentInfo?.marksBreakdown?.coding_marks || 0;
    const examCompletionPct = studentInfo?.completionPct || 0;

    const displayTotalScore = activeAttempt ? activeAttempt.totalScore : (totalScore > 0 ? totalScore : examTotalMarks);
    const displayMaxScore = (activeAttempt && activeAttempt.maxScore > 0)
        ? activeAttempt.maxScore
        : (maxTotalScore > 0 ? maxTotalScore : (examTotalMarks > 0 ? examTotalMarks : 18));
    const finalPercentage = displayMaxScore > 0
        ? Math.round((displayTotalScore / displayMaxScore) * 100)
        : (examCompletionPct || 0);

    const displayMcqScore = mcqSubs.length > 0
        ? overallMcqScore
        : (hasMcq ? (activeAttempt && !hasCoding ? displayTotalScore : examMcqMarks) : 0);

    const displayCodingScore = codingSubs.length > 0
        ? overallCodingScore
        : (hasCoding ? (activeAttempt && !hasMcq ? displayTotalScore : examCodingMarks) : 0);

    const formatTime = (d) => d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
    const formatDate = (d) => d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    const StatPill = ({ label, value, warn }) => (
        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{label}</span>
            <span className={`text-sm font-bold tabular-nums ${warn ? 'text-amber-400' : 'text-white'}`}>{value ?? '-'}</span>
        </div>
    );

    const generatePDF = () => generateExamReport({
        studentInfo, regNo, examName, sectionName,
        attemptNumber: activeAttemptNumber,
        isNewest: activeAttempt?.isNewest,
        isBest: activeAttempt?.isBest,
        mcqDetails, codingDetails,
        telemetry, envLogs, mcqAnalytics, codingAnalytics,
        examStartedAt, examEndedAt, examDuration,
        mcqStartedAt, mcqEndedAt, mcqDuration,
        codingStartedAt, codingEndedAt, codingDuration,
        overallMcqScore, maxMcqScore, overallCodingScore, maxCodingScore,
        examTotalMarks, examMcqMarks, examCodingMarks,
        displayTotalScore, displayMaxScore, finalPercentage,
        hasMcq, hasCoding
    });
    if (loading) {
        return (
            <div className="min-h-screen bg-[#060A13] flex items-center justify-center">
                <div className="flex flex-col items-center gap-5">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-b-violet-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                    </div>
                    <p className="text-gray-500 font-medium tracking-wide">Loading Analysis...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#060A13] flex items-center justify-center p-6">
                <div className="bg-red-500/5 border border-red-500/20 p-10 rounded-3xl max-w-lg text-center backdrop-blur-xl">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-500/10 flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-red-400 mb-2">Error Loading Data</h3>
                    <p className="text-red-400/60 mb-6">{error}</p>
                    <button onClick={() => router.back()} className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/25">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#060A13] text-white overflow-y-auto">
            {/* ═══ HEADER ═══ */}
            <div className="sticky top-0 z-50 bg-[#060A13]/80 backdrop-blur-2xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
                            <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">Student Analysis</h1>
                            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-widest">{examName} • {sectionName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {examStartedAt && (
                            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{formatDate(examStartedAt)}</span>
                            </div>
                        )}
                        <button
                            onClick={generatePDF}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95"
                        >
                            <Download className="w-4 h-4" />
                            Export PDF
                        </button>
                        <div className="px-5 py-2.5 bg-gradient-to-r from-blue-600/20 to-violet-600/20 border border-blue-500/20 rounded-2xl">
                            <div className="flex items-center justify-between gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                <span>Score</span>
                                {attemptsList.length > 1 && (
                                    <span className="text-indigo-400 font-bold">Attempt {activeAttemptNumber}</span>
                                )}
                            </div>
                            <div className="text-xl font-black bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent leading-tight">
                                {displayTotalScore}<span className="text-sm font-medium text-gray-500">/{displayMaxScore}</span>
                                <span className="text-xs font-normal text-gray-500 ml-1.5">({finalPercentage}%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8">

                {/* ═══ 0. ATTEMPT SELECTOR ═══ */}
                {attemptsList.length > 0 && (
                    <div className="bg-gradient-to-br from-[#0D1321] to-[#0A1628] rounded-3xl p-5 border border-white/5 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                    <Layers className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                                            Exam Attempts ({attemptsList.length})
                                        </h3>
                                        {attemptsList.length > 1 && (
                                            <span className="hidden sm:inline-block text-[10px] text-gray-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
                                                Click an attempt to inspect its scorecard &amp; submissions
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-2">
                                <span>Active Scorecard:</span>
                                <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                                    Attempt {activeAttemptNumber}
                                </span>
                                {activeAttempt?.isNewest && (
                                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                        Newest
                                    </span>
                                )}
                                {activeAttempt?.isBest && (
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                        Best Score
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Attempt Cards Grid */}
                        <div className={`grid grid-cols-1 ${attemptsList.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'sm:grid-cols-1 max-w-md'} gap-3`}>
                            {attemptsList.map((att) => {
                                const isSelected = att.attemptNumber === activeAttemptNumber;
                                return (
                                    <button
                                        key={att.attemptNumber}
                                        onClick={() => {
                                            setSelectedAttemptNumber(att.attemptNumber);
                                            setExpandedQuestion(null);
                                        }}
                                        className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden group cursor-pointer ${
                                            isSelected
                                                ? 'bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-violet-600/20 border-blue-500/50 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30'
                                                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                    Attempt {att.attemptNumber}
                                                </span>
                                                {isSelected && (
                                                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                                )}
                                            </div>
                                            <span className={`text-sm font-mono font-bold ${
                                                att.totalScore === att.maxScore && att.maxScore > 0
                                                    ? 'text-emerald-400'
                                                    : isSelected ? 'text-blue-300' : 'text-gray-400'
                                            }`}>
                                                {att.totalScore}/{att.maxScore || 18}
                                                <span className="text-xs font-normal text-gray-500 ml-1">({att.percentage}%)</span>
                                            </span>
                                        </div>

                                        {/* Badges */}
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                            {att.isNewest && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                                                    <Clock className="w-3 h-3" /> Newest
                                                </span>
                                            )}
                                            {att.isBest && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                                                    <Award className="w-3 h-3" /> Best Score
                                                </span>
                                            )}
                                            {att.submissions?.length === 0 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/5 text-gray-500 border border-white/5">
                                                    0 Submissions
                                                </span>
                                            )}
                                            {att.submittedAt && (
                                                <span className="text-[10px] text-gray-500 font-mono ml-auto">
                                                    {new Date(att.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ═══ 1. STUDENT PROFILE (VIDEO TEMPORARILY COMMENTED OUT) ═══ */}
                <div className="w-full">
                    {/* Profile Card */}
                    <div className="bg-gradient-to-br from-[#0D1321] to-[#0A1628] rounded-3xl p-6 sm:p-8 border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            {/* Left: Avatar & Identity */}
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/25 text-2xl font-black">
                                    {(studentInfo?.name || 'S')[0]}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">{studentInfo?.name || 'Student'}</h2>
                                    {studentInfo?.email ? (
                                        <div className="text-xs text-gray-400 mt-0.5">{studentInfo.email}</div>
                                    ) : null}
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <span className="text-[11px] font-mono font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-lg">
                                            REG: {studentInfo?.regNo || regNo || '—'}
                                        </span>
                                        <span className="text-[11px] font-medium text-slate-300 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg">
                                            Section: {studentInfo?.section || sectionName || '—'}
                                        </span>
                                        <span className="text-[11px] font-medium text-slate-300 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg">
                                            {studentInfo?.course || examName || 'Exam'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Scores & Duration */}
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Duration Badge */}
                                {examStartedAt && (
                                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                                            <Clock className="w-4 h-4 text-cyan-400" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Duration</div>
                                            <div className="text-sm font-bold text-white tabular-nums">
                                                {examDuration}m <span className="text-gray-400 font-normal text-xs">({formatTime(examStartedAt)} → {formatTime(examEndedAt)})</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Total Score */}
                                <div className="text-center min-w-[90px] py-3 px-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                                    <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Total Score</div>
                                    <div className="text-2xl font-black text-blue-400 tabular-nums">{displayTotalScore}</div>
                                </div>

                                {/* MCQ Score */}
                                {hasMcq && (
                                    <div className="text-center min-w-[80px] py-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">MCQ</div>
                                        <div className="text-2xl font-black text-emerald-400 tabular-nums">{displayMcqScore}</div>
                                    </div>
                                )}

                                {/* Coding Score */}
                                {hasCoding && (
                                    <div className="text-center min-w-[80px] py-3 px-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                                        <div className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Coding</div>
                                        <div className="text-2xl font-black text-violet-400 tabular-nums">{displayCodingScore}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ═══ TEMPORARILY COMMENTED OUT VIDEO PLAYER (Uncomment when all students have recording files) ═══ */}
                    {/*
                    <div className="mt-6 bg-black rounded-3xl overflow-hidden border border-white/5 shadow-2xl shadow-black/50 relative aspect-video flex items-center justify-center">
                        {videoUrl ? (
                            <video src={videoUrl} controls className="w-full h-full object-contain bg-black">
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <div className="text-center">
                                <Video className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                                <p className="text-sm text-gray-600">No recording available</p>
                            </div>
                        )}
                    </div>
                    */}
                </div>

                {/* ═══ 2. ACTIVITY TELEMETRY + ENV LOGS ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Telemetry */}
                    <div className="bg-gradient-to-br from-[#0D1321] to-[#0A1628] rounded-3xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><Activity className="w-4 h-4 text-amber-400" /></div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-300">Activity Telemetry</h3>
                            </div>
                            {Boolean(examDuration && examDuration > 0) && (
                                <div className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                                    {examDuration}m session
                                </div>
                            )}
                        </div>
                        {Object.keys(telemetry).length === 0 ? (
                            <div className="text-center py-8 text-gray-600 text-sm">No telemetry recorded for this attempt.</div>
                        ) : (
                            <div className="space-y-4">
                                {/* Network */}
                                <div>
                                    <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-cyan-400" /> Network
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <StatPill label="Starting IP" value={telemetry.startingIp} />
                                        <StatPill label="Ending IP" value={telemetry.endingIp} />
                                        <StatPill label="Disconnects" value={telemetry.internetDisconnects} warn={telemetry.internetDisconnects > 0} />
                                        <StatPill label="Offline" value={`${telemetry.internetOfflineSeconds || 0}s`} warn={telemetry.internetOfflineSeconds > 0} />
                                    </div>
                                </div>
                                {/* Client & Security */}
                                <div>
                                    <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-violet-400" /> Client &amp; Integrity
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <StatPill label="Client App" value={telemetry.environment || 'Electron-App'} />
                                        <StatPill label="Integrity" value={telemetry.isChromeBypass ? 'Bypass Detected' : 'Verified Secure'} warn={telemetry.isChromeBypass} />
                                        <StatPill label="Assigned Questions" value={telemetry.assigned_questions?.length ? `${telemetry.assigned_questions.length} Questions` : `${(codingDetails?.submissions?.length || 0) + (mcqDetails?.submissions?.length || 0)} Questions`} />
                                        <StatPill label="Browser/Engine" value={telemetry.browser || envLogs?.start_config?.browser || 'Secure Engine'} />
                                    </div>
                                </div>
                                {/* Focus & Security */}
                                <div>
                                    <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-amber-400" /> Focus &amp; Security
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <StatPill label="Lost Focus" value={telemetry.lostFocusCount} warn={telemetry.lostFocusCount > 0} />
                                        <StatPill label="Regained Focus" value={telemetry.regainedFocusCount} />
                                        <StatPill label="Face Warnings" value={`${telemetry.faceWarnings || 0} / ${telemetry.faceWarningsMax || 40}`} warn={telemetry.faceWarnings > 0} />
                                        <StatPill label="Proctor Blocks" value={telemetry.blockedByProctorCount} warn={telemetry.blockedByProctorCount > 0} />
                                        <StatPill label="Blocked Time" value={`${telemetry.blockedSeconds || 0}s`} warn={telemetry.blockedSeconds > 0} />
                                        <StatPill label="Submit Reason" value={telemetry.submitReason || '-'} />
                                    </div>
                                </div>
                                {/* Interactions */}
                                <div>
                                    <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-emerald-400" /> Interactions
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                            <div className="text-xl font-black text-blue-400">{telemetry.compileClicks ?? 0}</div>
                                            <div className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">Compiles</div>
                                        </div>
                                        <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                            <div className="text-xl font-black text-emerald-400">{telemetry.submitClicks ?? 0}</div>
                                            <div className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">Submits</div>
                                        </div>
                                        <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                            <div className="text-xl font-black text-gray-400">{telemetry.continueClicks ?? 0}</div>
                                            <div className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">Continues</div>
                                        </div>
                                    </div>
                                    {telemetry.perQuestion && Object.keys(telemetry.perQuestion).length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-white/5">
                                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                                Per-Question Activity Breakdown
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {Object.entries(telemetry.perQuestion).map(([qId, qData], idx) => (
                                                    <div key={qId} className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                                                        <div className="text-[10px] font-bold text-violet-400">Challenge {idx + 1}</div>
                                                        <div className="text-[11px] font-mono text-gray-300 font-bold mt-0.5">
                                                            {qData.compileClicks || 0} <span className="text-[9px] text-gray-500 font-normal">comp</span> • {qData.submitClicks || 0} <span className="text-[9px] text-gray-500 font-normal">sub</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Environment Logs */}
                    <div className="bg-gradient-to-br from-[#0D1321] to-[#0A1628] rounded-3xl border border-white/5 overflow-hidden">
                        <div className="px-6 pt-6 pb-4 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center"><FileText className="w-4 h-4 text-cyan-400" /></div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-300">Environment Logs</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/5">
                            {['start_config', 'end_config'].map(configType => {
                                const cfg = envLogs?.[configType];
                                const isStart = configType === 'start_config';
                                return (
                                    <div key={configType} className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${isStart ? 'text-emerald-400 bg-emerald-400/5 border border-emerald-500/10' : 'text-orange-400 bg-orange-400/5 border border-orange-500/10'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${isStart ? 'bg-emerald-400' : 'bg-orange-400'}`} />
                                                {isStart ? 'START' : 'END / LAST PUSH'}
                                            </div>
                                            {cfg?.timestamp && (
                                                <div className="text-[10px] text-gray-600 font-mono">{new Date(cfg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                            )}
                                        </div>
                                        {!cfg || Object.keys(cfg).length === 0 ? (
                                            <div className="text-xs text-gray-600 italic py-4 text-center">No config recorded.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {/* Public Ingress IP */}
                                                {(cfg.startingIp || cfg.endingIp || telemetry.startingIp || telemetry.endingIp) && (
                                                    <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className="w-4 h-4 rounded bg-emerald-500/20 flex items-center justify-center text-[8px] font-bold text-emerald-400">WAN</div>
                                                            <span className="text-[11px] font-bold text-gray-300">Public Gateway IP</span>
                                                        </div>
                                                        <div className="font-mono text-[11px] font-bold text-emerald-400 pl-6">
                                                            {isStart ? (cfg.startingIp || telemetry.startingIp || '128.185.168.221') : (cfg.endingIp || telemetry.endingIp || '128.185.168.221')}
                                                        </div>
                                                    </div>
                                                )}
                                                {cfg.os && (
                                                    <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center text-[8px] font-bold text-blue-400">OS</div>
                                                            <span className="text-[11px] font-bold text-gray-300">{cfg.os.version || cfg.os.platform}</span>
                                                        </div>
                                                        <div className="font-mono text-[10px] text-gray-500 space-y-0.5 pl-6">
                                                            <div>Arch: <span className="text-gray-400">{cfg.os.arch}</span></div>
                                                            <div>Host: <span className="text-gray-400">{cfg.os.hostname}</span></div>
                                                            {cfg.os.release && <div>Release: <span className="text-gray-400">{cfg.os.release}</span></div>}
                                                            {cfg.os.platform && <div>Platform: <span className="text-gray-400">{cfg.os.platform}</span></div>}
                                                        </div>
                                                    </div>
                                                )}
                                                {cfg.network?.interfaces?.map((iface, i) => (
                                                    <div key={i} className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className="w-4 h-4 rounded bg-cyan-500/20 flex items-center justify-center text-[8px] font-bold text-cyan-400">IP</div>
                                                            <span className="text-[11px] font-bold text-gray-300">{iface.interface}</span>
                                                        </div>
                                                        <div className="font-mono text-[10px] text-gray-500 space-y-0.5 pl-6">
                                                            <div>IP: <span className="text-cyan-400/80">{iface.ip}</span></div>
                                                            <div>MAC: <span className="text-gray-400">{iface.mac}</span></div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {cfg.proxy && (
                                                    <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5 flex items-center gap-2">
                                                        <div className="w-4 h-4 rounded bg-violet-500/20 flex items-center justify-center text-[8px] font-bold text-violet-400">P</div>
                                                        <span className="font-mono text-[10px] text-gray-500">Proxy: <span className="text-gray-400">{cfg.proxy.settings}</span></span>
                                                    </div>
                                                )}
                                                {cfg.timestamp && (
                                                    <div className="text-[10px] text-gray-600 font-mono pt-1 flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(cfg.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        {cfg.capturedAt && <span className="text-gray-700">• captured {new Date(cfg.capturedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {/* Proctoring Snapshots Audit Strip */}
                        {envLogs?.screenshots && envLogs.screenshots.length > 0 && (
                            <div className="px-6 py-4 bg-white/[0.01] border-t border-white/5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                        Proctoring Captures ({envLogs.screenshots.length} Snapshots)
                                    </div>
                                    <div className="text-[10px] text-gray-500">Auto-captured on key actions</div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {envLogs.screenshots.map((snap, i) => (
                                        <div key={i} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                                            <div>
                                                <div className="text-[11px] font-bold text-gray-300 capitalize">{snap.trigger.replace(/_/g, ' ')}</div>
                                                <div className="text-[10px] text-gray-500 font-mono">
                                                    {snap.timestamp ? new Date(typeof snap.timestamp === 'number' ? snap.timestamp : snap.timestamp).toLocaleTimeString() : '-'}
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Saved</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ 3. PROCTORING ANALYTICS ═══ */}
                <div className="bg-gradient-to-br from-[#0D1321] to-[#0A1628] rounded-3xl p-6 border border-white/5">
                    <div className="flex items-center gap-2.5 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center"><Target className="w-4 h-4 text-violet-400" /></div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-300">Proctoring Analytics</h3>
                    </div>
                    <div className={`grid grid-cols-1 ${hasMcq && hasCoding ? 'md:grid-cols-2' : ''} gap-6`}>
                        {/* MCQ Section */}
                        {hasMcq && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                    <div className="text-[11px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5" /> MCQ Section
                                    </div>
                                    {mcqDuration && (
                                        <div className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg border bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300 border-blue-500/20">
                                            ⏱ {mcqDuration}m
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <StatPill label="Started" value={mcqStartedAt ? formatTime(mcqStartedAt) : 'N/A'} />
                                    <StatPill label="Ended" value={mcqEndedAt ? formatTime(mcqEndedAt) : 'N/A'} />
                                    <StatPill label="Focus Lost" value={mcqAnalytics.focus_lost_count ?? telemetry.lostFocusCount ?? 0} warn={(mcqAnalytics.focus_lost_count || 0) > 0} />
                                    <StatPill label="Face Warnings" value={mcqAnalytics.face_warnings ?? telemetry.faceWarnings ?? 0} warn={(mcqAnalytics.face_warnings || 0) > 0} />
                                    <StatPill label="Net Health" value={mcqAnalytics.network_health || ((telemetry.internetDisconnects || 0) > 0 ? 'Unstable' : 'Stable')} warn={(telemetry.internetDisconnects || 0) > 0} />
                                    <StatPill label="Blocked" value={`${mcqAnalytics.blocked_seconds ?? telemetry.blockedSeconds ?? 0}s`} warn={(telemetry.blockedSeconds || 0) > 0} />
                                </div>
                            </div>
                        )}
                        {/* Coding Section */}
                        {hasCoding && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                    <div className="text-[11px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-2">
                                        <Code className="w-3.5 h-3.5" /> Coding Section
                                    </div>
                                    {codingDuration && (
                                        <div className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg border bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-300 border-violet-500/20">
                                            ⏱ {codingDuration}m
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <StatPill label="Started" value={codingStartedAt ? formatTime(codingStartedAt) : 'N/A'} />
                                    <StatPill label="Ended" value={codingEndedAt ? formatTime(codingEndedAt) : 'N/A'} />
                                    <StatPill label="Focus Lost" value={codingAnalytics.focus_lost_count ?? 0} warn={(codingAnalytics.focus_lost_count || 0) > 0} />
                                    <StatPill label="Tab Switches" value={codingAnalytics.tab_switches ?? 0} warn={(codingAnalytics.tab_switches || 0) > 0} />
                                    <StatPill label="Net Health" value={codingAnalytics.network_health || ((telemetry.internetDisconnects || 0) > 0 ? 'Unstable' : 'Stable')} warn={(telemetry.internetDisconnects || 0) > 0} />
                                    <StatPill label="Disconnects" value={codingAnalytics.network_disconnects ?? telemetry.internetDisconnects ?? 0} warn={(codingAnalytics.network_disconnects || 0) > 0} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ 4. MCQ RESPONSES ═══ */}
                {mcqDetails?.submissions?.length > 0 && (
                    <div className="rounded-3xl border border-white/5 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                                <span>MCQ Responses</span>
                                {attemptsList.length > 1 && (
                                    <span className="text-xs font-semibold text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full">
                                        Attempt {activeAttemptNumber}
                                    </span>
                                )}
                            </h2>
                            <div className="flex items-center gap-3">
                                <div className="px-4 py-1.5 bg-white/20 backdrop-blur rounded-full text-white text-sm font-bold">
                                    {mcqDetails.submissions.filter(s => s.type === 'mcq' && s.is_correct).length} / {mcqDetails.submissions.filter(s => s.type === 'mcq').length} Correct
                                </div>
                                <div className="px-4 py-1.5 bg-white/10 rounded-full text-white/80 text-sm font-bold">
                                    Score: {overallMcqScore || examMcqMarks} / {maxMcqScore || mcqDetails.submissions.filter(s => s.type === 'mcq').length}
                                </div>
                            </div>
                        </div>
                        <div className="bg-[#0D1321] p-6 space-y-3">
                            {mcqDetails.submissions.filter(s => s.type === 'mcq').map((sub, idx) => {
                                const isExpanded = expandedQuestion === `mcq-${idx}`;
                                return (
                                    <div key={idx} className="rounded-2xl border border-white/5 overflow-hidden bg-white/[0.02] hover:bg-white/[0.03] transition-all">
                                        <button
                                            onClick={() => setExpandedQuestion(isExpanded ? null : `mcq-${idx}`)}
                                            className="w-full px-5 py-4 flex items-center gap-4 text-left"
                                        >
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${sub.is_correct ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'}`}>
                                                {sub.is_correct ? '✓' : '✗'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-200 line-clamp-1">{sub.question_title || `Question ${idx + 1}`}</div>
                                                <div className="text-[11px] text-gray-500 mt-0.5">
                                                    Your answer: <span className={sub.is_correct ? 'text-emerald-400' : 'text-red-400'}>{sub.submitted_answer_text || 'Skipped'}</span>
                                                </div>
                                            </div>
                                            <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${sub.is_correct ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {sub.score_obtained || 0}/{1}
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isExpanded && (
                                            <div className="px-5 pb-5 pt-1 border-t border-white/5">
                                                <div className="bg-white/[0.03] rounded-xl p-4 mb-4 border border-white/5">
                                                    <pre className="text-[13px] text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{sub.question_title}</pre>
                                                </div>
                                                <div className="space-y-2">
                                                    {sub.options?.map((opt, i) => {
                                                        const optText = typeof opt === 'string' ? opt : (opt?.text ?? opt?.option ?? opt?.label ?? opt?.value ?? '');
                                                        const isCorrectOption = typeof opt === 'string' ? false : (opt?.is_correct === true || opt?.isAnswer === true || opt?.isCorrect === true || opt?.correct === true);
                                                        const isSelected = sub.submitted_answer_index === i || (sub.submitted_answer_text && optText && String(sub.submitted_answer_text).trim().toLowerCase() === String(optText).trim().toLowerCase());

                                                        let cls = "border-white/5 bg-white/[0.02]";
                                                        let badge = null;
                                                        if (isSelected && isCorrectOption) {
                                                            cls = "border-emerald-500/50 bg-emerald-500/10";
                                                            badge = <span className="text-[9px] font-bold uppercase bg-emerald-500 text-white px-1.5 py-0.5 rounded shrink-0">✓ Correct</span>;
                                                        } else if (isSelected && !isCorrectOption) {
                                                            cls = "border-red-500/50 bg-red-500/10";
                                                            badge = <span className="text-[9px] font-bold uppercase bg-red-500 text-white px-1.5 py-0.5 rounded shrink-0">✗ Wrong</span>;
                                                        } else if (isCorrectOption) {
                                                            cls = "border-blue-500/50 bg-blue-500/10";
                                                            badge = <span className="text-[9px] font-bold uppercase bg-blue-500 text-white px-1.5 py-0.5 rounded shrink-0">Answer</span>;
                                                        }

                                                        return (
                                                            <div key={i} className={`p-3 rounded-xl border ${cls} flex items-center gap-3`}>
                                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-current' : 'border-gray-700'}`}>
                                                                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                                                                </div>
                                                                <span className="text-sm text-gray-300 flex-1">{optText}</span>
                                                                {badge}
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
                )}

                {/* ═══ 5. CODING RESPONSES ═══ */}
                {codingDetails?.submissions?.length > 0 ? (
                    <div className="rounded-3xl border border-white/5 overflow-hidden">
                        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-5 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><Code className="w-4 h-4" /></div>
                                <span>Coding Responses</span>
                                {attemptsList.length > 1 && (
                                    <span className="text-xs font-semibold text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full">
                                        Attempt {activeAttemptNumber}
                                    </span>
                                )}
                            </h2>
                            <div className="px-4 py-1.5 bg-white/20 backdrop-blur rounded-full text-white text-sm font-bold">
                                Score: {displayCodingScore} / {displayMaxScore}
                            </div>
                        </div>
                        <div className="bg-[#0D1321] p-6 space-y-8">
                            {codingDetails.submissions.filter(s => s.type === 'coding').map((sub, idx) => {
                                const results = sub.formattedResult || [];
                                const totalCases = results.length || sub.test_cases?.length || 0;
                                const passedCases = results.filter(r => Object.values(r)[0]?.testCasePassed).length;
                                const isExpanded = expandedQuestion === `coding-${idx}`;

                                return (
                                    <div key={idx} className="rounded-2xl border border-white/5 overflow-hidden">
                                        {/* Header */}
                                        <button
                                            onClick={() => setExpandedQuestion(isExpanded ? null : `coding-${idx}`)}
                                            className="w-full px-6 py-4 flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.05] transition-colors border-b border-white/5"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center font-black text-sm shrink-0">{idx + 1}</div>
                                                <div className="text-left">
                                                    <div className="font-bold text-gray-200 text-sm">{sub.question_title || `Challenge ${idx + 1}`}</div>
                                                    <div className="text-[11px] text-gray-500 mt-0.5">{sub.question_desc?.slice(0, 80)}...</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                {telemetry.perQuestion?.[sub.question_id] && (
                                                    <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[11px] font-mono text-gray-400">
                                                        <Terminal className="w-3 h-3 text-cyan-400 shrink-0" />
                                                        <span>{telemetry.perQuestion[sub.question_id].compileClicks || 0} comp • {telemetry.perQuestion[sub.question_id].submitClicks || 0} sub</span>
                                                    </div>
                                                )}
                                                <div className={`px-3 py-1 rounded-lg text-[11px] font-bold ${passedCases === totalCases && totalCases > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                    {passedCases}/{totalCases} Passed
                                                </div>
                                                <div className="text-sm font-bold text-violet-400">
                                                    {sub.score_obtained || 0}/{(sub.total_question_marks || 60) / 10}
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="p-6 space-y-6 bg-[#080D18]">
                                                {/* Problem Description */}
                                                {sub.question_desc && (
                                                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Problem Statement</div>
                                                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{sub.question_desc}</p>
                                                    </div>
                                                )}

                                                {/* ── Side-by-side Code ── */}
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    {/* User Code */}
                                                    <div className="rounded-2xl overflow-hidden border border-white/5">
                                                        <div className="px-4 py-2.5 bg-[#1a1a2e] flex items-center justify-between border-b border-white/5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex gap-1.5">
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                                                                </div>
                                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider ml-2">Student&apos;s Code</span>
                                                            </div>
                                                            <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">C</span>
                                                        </div>
                                                        <div className="bg-[#0d0d1a] p-4 max-h-[450px] overflow-auto custom-scrollbar">
                                                            <pre className="text-[12px] font-mono text-gray-300 leading-[1.7] whitespace-pre">{sub.submitted_answer || sub.submitted_code || '// No code submitted'}</pre>
                                                        </div>
                                                    </div>

                                                    {/* Reference Code */}
                                                    <div className="rounded-2xl overflow-hidden border border-emerald-500/20">
                                                        <div className="px-4 py-2.5 bg-emerald-500/5 flex items-center justify-between border-b border-emerald-500/20">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex gap-1.5">
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20" />
                                                                </div>
                                                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider ml-2">Reference Solution</span>
                                                            </div>
                                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                        </div>
                                                        <div className="bg-emerald-500/[0.03] p-4 max-h-[450px] overflow-auto custom-scrollbar">
                                                            <pre className="text-[12px] font-mono text-emerald-300/80 leading-[1.7] whitespace-pre">{sub.correct_code || sub.solution_code || sub.expected_solution || sub.base_code || '// Reference solution not available.'}</pre>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ── Side-by-side Test Cases ── */}
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    {/* Sample Test Cases */}
                                                    {sub.test_cases?.filter(tc => tc.name?.includes('Sample')).length > 0 && (
                                                        <div className="rounded-2xl border border-white/5 overflow-hidden">
                                                            <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/5">
                                                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Sample Test Cases</span>
                                                            </div>
                                                            <div className="divide-y divide-white/5">
                                                                {sub.test_cases.filter(tc => tc.name?.includes('Sample')).map((tc, tcIdx) => (
                                                                    <div key={tcIdx} className="p-3 text-xs font-mono">
                                                                        <div className="text-[10px] text-gray-500 font-bold mb-1.5">{tc.name}</div>
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            <div>
                                                                                <div className="text-[9px] text-gray-600 uppercase font-bold mb-0.5">Input</div>
                                                                                <div className="text-gray-400 whitespace-pre-wrap bg-white/[0.02] rounded p-1.5">{tc.input}</div>
                                                                            </div>
                                                                            <div>
                                                                                <div className="text-[9px] text-gray-600 uppercase font-bold mb-0.5">Expected</div>
                                                                                <div className="text-blue-400 whitespace-pre-wrap bg-blue-500/5 rounded p-1.5">{tc.expected_output}</div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Hidden Test Case Results */}
                                                    {results.length > 0 && (
                                                        <div className="rounded-2xl border border-white/5 overflow-hidden">
                                                            <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
                                                                <span className="text-[10px] text-violet-400 font-bold uppercase tracking-widest">Hidden Test Results</span>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${passedCases === totalCases ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                                    {passedCases}/{totalCases}
                                                                </span>
                                                            </div>
                                                            <div className="divide-y divide-white/5 max-h-[350px] overflow-auto custom-scrollbar">
                                                                {results.map((resObj, rIdx) => {
                                                                    const key = Object.keys(resObj)[0];
                                                                    const res = resObj[key];
                                                                    const isPassed = res?.testCasePassed;
                                                                    return (
                                                                        <div key={rIdx} className={`p-3 flex items-start gap-2.5 ${isPassed ? 'bg-emerald-500/[0.02]' : 'bg-red-500/[0.02]'}`}>
                                                                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 ${isPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                                {isPassed ? '✓' : '✗'}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0 text-xs font-mono">
                                                                                <div className="grid grid-cols-3 gap-2">
                                                                                    {res?.input && (
                                                                                        <div>
                                                                                            <div className="text-[9px] text-gray-600 uppercase font-bold mb-0.5">Input</div>
                                                                                            <div className="text-gray-400 whitespace-pre-wrap">{res.input}</div>
                                                                                        </div>
                                                                                    )}
                                                                                    <div>
                                                                                        <div className="text-[9px] text-gray-600 uppercase font-bold mb-0.5">Expected</div>
                                                                                        <div className="text-blue-400 whitespace-pre-wrap">{res?.expectedOutput}</div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="text-[9px] text-gray-600 uppercase font-bold mb-0.5">Output</div>
                                                                                        <div className={`whitespace-pre-wrap ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>{res?.userOutput}</div>
                                                                                    </div>
                                                                                </div>
                                                                                {res?.compilerMessage && (
                                                                                    <div className="mt-1.5 text-red-400/70 bg-red-500/5 rounded p-1.5 text-[11px]">{res.compilerMessage}</div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Per-Question Compile/Submit Interactions */}
                                                {telemetry.perQuestion && telemetry.perQuestion[sub.question_id] && (
                                                    <div className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                                        <div className="text-[10px] text-gray-500 font-bold uppercase">Interactions:</div>
                                                        <StatPill label="Compiles" value={telemetry.perQuestion[sub.question_id].compileClicks} />
                                                        <StatPill label="Submits" value={telemetry.perQuestion[sub.question_id].submitClicks} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : hasCoding ? (
                    <div className="rounded-3xl border border-white/5 overflow-hidden">
                        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-5 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><Code className="w-4 h-4" /></div>
                                <span>Coding Responses</span>
                                {attemptsList.length > 1 && (
                                    <span className="text-xs font-semibold text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full">
                                        Attempt {activeAttemptNumber}
                                    </span>
                                )}
                            </h2>
                            <div className="px-4 py-1.5 bg-white/20 backdrop-blur rounded-full text-white text-sm font-bold">
                                Score: {displayCodingScore} / {displayMaxScore}
                            </div>
                        </div>
                        <div className="bg-[#0D1321] p-8 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center mx-auto mb-3">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-bold text-gray-200 mb-1">No Code Submissions for Attempt {activeAttemptNumber}</h3>
                            <p className="text-xs text-gray-500 max-w-md mx-auto">
                                This attempt concluded with score {displayCodingScore}/{displayMaxScore} without saved code submissions.
                                {attemptsList.length > 1 && " You can switch attempts in the Exam Attempts bar above to view code submissions from other attempts."}
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Bottom spacer */}
            <div className="h-12" />
        </div>
    );
}

export default function DetailsAnalysisPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#060A13] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="text-gray-500 font-medium">Loading Analysis...</p>
                </div>
            </div>
        }>
            <DetailsAnalysisContent />
        </Suspense>
    );
}


