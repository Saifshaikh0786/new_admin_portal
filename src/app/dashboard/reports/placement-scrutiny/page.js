"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { 
  ArrowLeft, BarChart3, TrendingUp, Users, Award, ShieldCheck, 
  AlertTriangle, CheckCircle2, XCircle, Search, Filter, Download, 
  Printer, RefreshCw, Layers, Target, ChevronDown, ChevronUp, 
  Calendar, BookOpen, Clock, Sliders, ExternalLink,
  School, GraduationCap, FileSpreadsheet, Check, ArrowRight,
  TrendingDown, CheckCircle, Info, HelpCircle, Activity,
  FileText, Compass, ListTree, PieChart, Sparkles,
  User, Lock, Eye, EyeOff, Loader2, AlertCircle
} from "lucide-react";
import { API_CONFIG } from "@/utils/api";
import { swrFetcher } from "@/utils/fetcher";
import { getAdminToken } from "@/utils/cookies";

function PlacementScrutinyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const courseId = searchParams.get("courseId");
  const examNameParam = searchParams.get("examName") || "Examination";
  const batchId = searchParams.get("batchId") || "";
  const batchNameParam = searchParams.get("batchName") || "Academic Cohort";

  // Segmented Control Navigation: CHAPTERS, TOPICS, QUESTIONS, CURVES, BENCHMARKS
  const [activeTab, setActiveTab] = useState("CHAPTERS");
  const [selectedTopicStatus, setSelectedTopicStatus] = useState("ALL");
  const [selectedQuestionStatus, setSelectedQuestionStatus] = useState("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Dean Remedial Action Order Modal State
  const [remedialModalOpen, setRemedialModalOpen] = useState(false);
  const [activeRemedialItem, setActiveRemedialItem] = useState(null);
  const [remedialType, setRemedialType] = useState("CHAPTER"); // CHAPTER or TOPIC
  const [remedialDate, setRemedialDate] = useState("");
  const [remedialInstructor, setRemedialInstructor] = useState("");
  const [remedialDuration, setRemedialDuration] = useState("4 Hours (Hands-on Coding Lab)");
  const [remedialSuccessMsg, setRemedialSuccessMsg] = useState("");

  // Authentication and Role Detection (Strictly Teacher Verified)
  const [currentUserRole, setCurrentUserRole] = useState('teacher');
  const [authVerified, setAuthVerified] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token') || urlParams.get('sso_token');
      const teacherToken = localStorage.getItem('teacher_token') || urlToken;
      const teacherSession = localStorage.getItem('teacher_session');
      return Boolean(teacherToken || teacherSession);
    }
    return false;
  });

  // Inline Teacher Verification Form State
  const [verifyRegId, setVerifyRegId] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Question Inspector Modal & Accordion Expand States
  const [inspectingQuestion, setInspectingQuestion] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleExpand = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // SWR Fetching with 5-minute client cache matching backend
  const apiUrl = courseId 
    ? `${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.placementScrutinyReport}?course_id=${courseId}&batch_id=${batchId}`
    : null;

  const { data: rawData, error, isLoading, mutate } = useSWR(
    authVerified && apiUrl ? [apiUrl, "GET"] : null,
    swrFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const report = rawData?.data || rawData;

  const handleHardRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    if (!report) return;
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Sheet 1: Executive Scrutiny Brief
      const execSummary = [
        { Metric: "Course / Assessment Name", Value: report.exam_metadata?.course_name || examNameParam },
        { Metric: "Course Identifier", Value: courseId },
        { Metric: "Batch / Department", Value: batchNameParam },
        { Metric: "Enrolled Students", Value: report.executive_summary?.enrolled_count || 0 },
        { Metric: "Attempted Students", Value: report.executive_summary?.attempted_count || 0 },
        { Metric: "Cohort Participation Rate", Value: `${report.executive_summary?.participation_rate || 0}%` },
        { Metric: "Cohort Average Score", Value: `${report.executive_summary?.average_score || 0} / ${report.exam_metadata?.max_exam_marks || 100}` },
        { Metric: "Cohort Average Score %", Value: `${report.executive_summary?.average_score_percent || 0}%` },
        { Metric: "Cohort Median Score", Value: report.executive_summary?.median_score || 0 },
        { Metric: "Tier 1 Product Ready (>=75%)", Value: `${report.placement_funnel?.tier1_placement_ready?.count || 0} (${report.placement_funnel?.tier1_placement_ready?.pct || 0}%)` },
        { Metric: "Tier 2 Trainable Cohort (50-74%)", Value: `${report.placement_funnel?.tier2_trainable?.count || 0} (${report.placement_funnel?.tier2_trainable?.pct || 0}%)` },
        { Metric: "Tier 3 Remedial Required (<50%)", Value: `${report.placement_funnel?.tier3_remedial_required?.count || 0} (${report.placement_funnel?.tier3_remedial_required?.pct || 0}%)` },
        { Metric: "Total Questions Assessed", Value: report.executive_summary?.total_questions_tested || 0 },
        { Metric: "Total Syllabus Topics Tested", Value: report.executive_summary?.total_topics_covered || 0 },
        { Metric: "Critical Gap Topics Flagged", Value: report.executive_summary?.critical_weak_topics_count || 0 }
      ];
      const wsExec = XLSX.utils.json_to_sheet(execSummary);
      XLSX.utils.book_append_sheet(wb, wsExec, "Executive KPI Summary");

      // Sheet 2: Academic Chapters Scrutiny
      if (report.chapter_vulnerability_matrix?.length) {
        const chRows = report.chapter_vulnerability_matrix.map(ch => ({
          "Chapter Name": ch.chapter_name,
          "Status": ch.status,
          "Pass Rate %": `${ch.accuracy_percent}%`,
          "Failure Rate %": `${ch.failure_rate_percent}%`,
          "Questions Tested": ch.question_count,
          "Total Attempts": ch.total_attempts,
          "Why Students Failed (Diagnostic)": ch.why_failed,
          "How to Remediate (Pedagogy)": ch.how_to_fix
        }));
        const wsChapters = XLSX.utils.json_to_sheet(chRows);
        XLSX.utils.book_append_sheet(wb, wsChapters, "Chapter Scrutiny & Actions");
      }

      // Sheet 3: Topic Vulnerability Matrix
      if (report.topic_vulnerability_matrix?.length) {
        const topicRows = report.topic_vulnerability_matrix.map(t => ({
          "Topic": t.topic,
          "Chapter": t.chapter_name || "Core Syllabus",
          "Status": t.status,
          "Pass Rate %": `${t.avg_score_percent ?? t.accuracy_percent}%`,
          "Questions": t.question_count,
          "Attempts": t.total_attempts,
          "Why Students Failed": t.why_failed,
          "How to Remediate": t.how_to_fix
        }));
        const wsTopics = XLSX.utils.json_to_sheet(topicRows);
        XLSX.utils.book_append_sheet(wb, wsTopics, "Topic Diagnostics");
      }

      // Sheet 4: Question Deep Dive
      if (report.questions_deep_dive?.length) {
        const qRows = report.questions_deep_dive.map((q, idx) => ({
          "Index": idx + 1,
          "Question Title": q.title,
          "Chapter": q.chapter_name || "Core Syllabus",
          "Topic": q.topic,
          "Difficulty": q.difficulty,
          "Total Attempts": q.total_attempts,
          "Full Solves": q.full_solves,
          "Partial Solves": q.partial_solves,
          "Unpassed": q.zero_solves,
          "Full Solve Rate %": `${q.full_solve_rate}%`,
          "Avg Test Case Pass %": `${q.avg_test_case_pass_rate}%`,
          "Status": q.status
        }));
        const wsQ = XLSX.utils.json_to_sheet(qRows);
        XLSX.utils.book_append_sheet(wb, wsQ, "Question Test Case Audit");
      }

      // Sheet 5: Section Benchmarks
      if (report.section_benchmarks?.length) {
        const secRows = report.section_benchmarks.map(s => ({
          "Section": s.section,
          "Attempted Students": s.attempted,
          "Average Score": s.avg_score,
          "Tier 1 Placement Ready %": `${s.placement_ready_pct}%`
        }));
        const wsSec = XLSX.utils.json_to_sheet(secRows);
        XLSX.utils.book_append_sheet(wb, wsSec, "Section Rankings");
      }

      const safeName = (report.exam_metadata?.course_name || examNameParam).replace(/[^a-zA-Z0-9]/g, "_");
      XLSX.writeFile(wb, `${safeName}_Academic_Scrutiny_Document.xlsx`);
    } catch (err) {
      console.error("Failed to export Excel report:", err);
      alert("Failed to export Excel report. Please try again.");
    }
  };

  // Filtered Chapters
  const chaptersList = useMemo(() => {
    return report?.chapter_vulnerability_matrix || [];
  }, [report]);

  // Filtered Topics
  const filteredTopics = useMemo(() => {
    if (!report?.topic_vulnerability_matrix) return [];
    return report.topic_vulnerability_matrix.filter(t => {
      const matchStatus = selectedTopicStatus === "ALL" || t.status === selectedTopicStatus;
      const matchSearch = searchQuery === "" || 
        t.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.chapter_name && t.chapter_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchStatus && matchSearch;
    });
  }, [report, selectedTopicStatus, searchQuery]);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    if (!report?.questions_deep_dive) return [];
    return report.questions_deep_dive.filter(q => {
      const matchStatus = selectedQuestionStatus === "ALL" || q.status === selectedQuestionStatus;
      const matchDiff = selectedDifficulty === "ALL" || q.difficulty === selectedDifficulty;
      const matchSearch = searchQuery === "" || 
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.chapter_name && q.chapter_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (Array.isArray(q.tags) && q.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchStatus && matchDiff && matchSearch;
    });
  }, [report, selectedQuestionStatus, selectedDifficulty, searchQuery]);

  // Indexed Questions by Chapter and Topic for O(1) instantaneous access and high-attrition ranking
  const { questionsByChapter, questionsByTopic } = useMemo(() => {
    const byChapter = {};
    const byTopic = {};
    if (!report?.questions_deep_dive) return { questionsByChapter: byChapter, questionsByTopic: byTopic };

    for (const q of report.questions_deep_dive) {
      const chKey = q.chapter_name || "Core Syllabus";
      if (!byChapter[chKey]) byChapter[chKey] = [];
      byChapter[chKey].push(q);

      const topKey = q.topic || "Core Module";
      if (!byTopic[topKey]) byTopic[topKey] = [];
      byTopic[topKey].push(q);
    }

    // Sort each group so highest attrition (most zero_solves / lowest solve rate) comes first
    for (const key in byChapter) {
      byChapter[key].sort((a, b) => b.zero_solves - a.zero_solves || a.full_solve_rate - b.full_solve_rate);
    }
    for (const key in byTopic) {
      byTopic[key].sort((a, b) => b.zero_solves - a.zero_solves || a.full_solve_rate - b.full_solve_rate);
    }

    return { questionsByChapter: byChapter, questionsByTopic: byTopic };
  }, [report?.questions_deep_dive]);

  // Generate SVG Points for Smooth Bell-Curve Gaussian Spline (Unconditional Hook Execution)
  const curvePoints = useMemo(() => {
    const buckets = report?.score_distribution_curve;
    if (!buckets?.length) return null;
    const width = 600;
    const height = 180;
    const maxVal = Math.max(...buckets.map(b => b.pct), 1);
    
    // Compute normalized coordinates
    const pts = buckets.map((b, i) => {
      const x = 40 + (i / (buckets.length - 1)) * (width - 80);
      const y = height - 30 - ((b.pct / maxVal) * (height - 60));
      return { x, y };
    });

    if (pts.length < 2) return null;

    // Generate smooth cubic bezier SVG path
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const mx = (curr.x + next.x) / 2;
      path += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`;
    }
    return { path, pts, height, width };
  }, [report?.score_distribution_curve]);

  const openRemedialModal = (item, type = "CHAPTER") => {
    setActiveRemedialItem(item);
    setRemedialType(type);
    setRemedialSuccessMsg("");
    setRemedialDate(new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0]);
    setRemedialInstructor("Department Senior Faculty / Lab Lead");
    setRemedialDuration("4 Hours (Hands-on Coding Lab)");
    setRemedialModalOpen(true);
  };

  const handleScheduleRemedialSubmit = (e) => {
    e.preventDefault();
    const title = remedialType === "CHAPTER" ? activeRemedialItem?.chapter_name : activeRemedialItem?.topic;
    setRemedialSuccessMsg(`Improvement Directive for "${title}" scheduled on ${remedialDate} (${remedialDuration}). Departmental notice dispatched.`);
    setTimeout(() => {
      setRemedialModalOpen(false);
      setRemedialSuccessMsg("");
    }, 2400);
  };

  // 1. Ingest URL token if arriving via shared authenticated link
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token') || urlParams.get('sso_token');

    if (urlToken && urlToken.length > 20) {
      localStorage.setItem('teacher_token', urlToken);
      localStorage.setItem('admin_token', urlToken);
      setCurrentUserRole('teacher');
      setAuthVerified(true);

      // Clean token from address bar
      urlParams.delete('token');
      urlParams.delete('sso_token');
      const cleanQuery = urlParams.toString();
      const cleanUrl = window.location.pathname + (cleanQuery ? '?' + cleanQuery : '');
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // 2. Auth error detection from API response
  const isAuthError = Boolean(
    (report && (report.error === 'Missing or invalid Authorization header' || report.error === 'Invalid or expired token' || String(report.error || '').includes('Forbidden') || String(report.error || '').includes('Unauthorized') || String(report.message || '').includes('Unauthorized'))) ||
    (error && (error.status === 401 || error.status === 403 || String(error.message || '').includes('401') || String(error.message || '').includes('403')))
  );

  useEffect(() => {
    if (isAuthError) {
      setAuthVerified(false);
      setVerifyError('Session expired or unauthorized. Please verify your teacher credentials.');
    }
  }, [isAuthError]);

  // Handler: In-Place Teacher Verification
  const handleTeacherUnlock = async (e) => {
    e.preventDefault();
    setVerifyError('');
    setVerifyLoading(true);

    try {
      const trimmedRegId = verifyRegId.trim();
      const trimmedPassword = verifyPassword.trim();

      if (!trimmedRegId || !trimmedPassword) {
        setVerifyError('Registration ID and password are required');
        setVerifyLoading(false);
        return;
      }

      // Official Teacher Portal Login API
      const res = await fetch('https://teacherportal.theeducode.com/api/proxy/backend/auth/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uni_reg_id: trimmedRegId, password: trimmedPassword })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const token = data.token || data.teacher?.token;
        if (token) {
          localStorage.setItem('teacher_token', token);
          localStorage.setItem('admin_token', token);
        }
        if (data.teacher) {
          localStorage.setItem('teacher_session', JSON.stringify(data.teacher));
        }

        setCurrentUserRole('teacher');
        setAuthVerified(true);
        mutate();
      } else {
        setVerifyError(data.error || data.message || 'Invalid Teacher Registration ID or Password');
      }
    } catch (err) {
      console.error('Teacher unlock error:', err);
      setVerifyError('Unable to connect to Teacher Portal. Please check your credentials.');
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── INLINE TEACHER VERIFICATION GATEWAY ──
  // If user is not verified as a teacher, show the gateway card in-place (NEVER open the admin panel)
  if (!authVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F19] text-white px-4 relative overflow-hidden font-sans">
        {/* Ambient Blur Spheres */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[140px] pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-indigo-600 p-[2px] mb-3 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-[#0E131F] rounded-[14px] flex items-center justify-center">
              <span className="text-orange-400 font-mono font-bold text-lg">&lt;/&gt;</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">TheEduCode</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium tracking-wide">University Teacher Portal</p>
        </div>

        {/* Teacher Access Card */}
        <div className="w-full max-w-[420px] bg-[#121826]/90 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl z-10">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 p-5 text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              FACULTY RESTRICTED
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Teacher Access</h2>
            <p className="text-xs text-slate-400 mt-1">Please authenticate with Teacher credentials to unlock this report</p>
          </div>

          <form onSubmit={handleTeacherUnlock} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                REGISTRATION ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={verifyRegId}
                  onChange={(e) => setVerifyRegId(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Enter your registration ID"
                  className="w-full pl-10 pr-4 py-3 bg-[#0B0F19]/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                PASSWORD
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showVerifyPassword ? "text" : "password"}
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-3 bg-[#0B0F19]/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowVerifyPassword(!showVerifyPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showVerifyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {verifyError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={verifyLoading}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-indigo-500/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {verifyLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Unlock Scrutiny Report</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500 z-10">
          <p className="font-medium text-slate-400">Powered by TheEduCode</p>
          <p className="text-[11px] mt-0.5 text-slate-600">© 2026 TheEduCode. All rights reserved.</p>
        </div>
      </div>
    );
  }

  if (!courseId) {
    if (typeof window !== 'undefined') {
      const defaultStudentUrl = '/dashboard/details-analysis?examName=AI+Proctored+Test+CSE+202&courseId=fe3be34e-8747-4cdf-b0ea-949582281173&studentId=6b897907-2eb0-4d49-9504-56e071a6d7db&regNo=12510455&name=Haranipharvathy+R&email=&sectionName=K3P25CC-G1&batchId=f47808e1-b538-4d4a-96d2-adee2f101478';
      router.replace(defaultStudentUrl);
    }
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <h2 className="text-base font-semibold text-white mb-1">Redirecting to Student Analysis...</h2>
        <p className="text-slate-400 text-xs">Opening detailed analytics report...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] text-neutral-800 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
        <div className="text-center space-y-1">
          <h3 className="text-base font-semibold text-neutral-900 tracking-tight">Generating Academic Scrutiny</h3>
          <p className="text-xs text-neutral-500">Evaluating student test cases, syllabus chapters, and learning outcomes...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] text-neutral-800 flex flex-col items-center justify-center p-6">
        <XCircle className="w-10 h-10 text-neutral-400 mb-3" />
        <h2 className="text-xl font-semibold text-neutral-900 mb-1 tracking-tight">Unable to Load Assessment Data</h2>
        <p className="text-neutral-500 text-sm mb-6 max-w-md text-center">
          {error?.message || "Failed to load examination analytics. No student submissions recorded yet for this assessment."}
        </p>
        <div className="flex items-center gap-3">
          <button onClick={handleHardRefresh} className="px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <button onClick={() => window.close()} className="px-5 py-2.5 rounded-full bg-white border border-neutral-300 text-neutral-700 font-medium text-sm hover:bg-neutral-50">
            Close
          </button>
        </div>
      </div>
    );
  }

  const { exam_metadata, executive_summary, placement_funnel, score_distribution_curve, topic_vulnerability_matrix, questions_deep_dive, section_benchmarks, chapter_vulnerability_matrix } = report;

  const weakChapters = chapter_vulnerability_matrix?.filter(c => c.status === "CRITICAL_WEAK") || [];
  const weakTopics = topic_vulnerability_matrix?.filter(t => t.status === "CRITICAL_WEAK") || [];
  const tier1Pct = placement_funnel?.tier1_placement_ready?.pct || 0;
  const tier1Count = placement_funnel?.tier1_placement_ready?.count || 0;
  const tier2Count = placement_funnel?.tier2_trainable?.count || 0;
  const tier3Count = placement_funnel?.tier3_remedial_required?.count || 0;

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-neutral-800 font-sans selection:bg-blue-100 relative overflow-x-hidden">
      {/* Ambient Apple Fluid Color Spheres in Background */}
      <div className="fixed top-[-10%] right-[-5%] w-[650px] h-[650px] bg-gradient-to-br from-blue-400/20 via-indigo-400/15 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-[35%] left-[-8%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-400/18 via-pink-400/12 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[15%] w-[700px] h-[700px] bg-gradient-to-r from-emerald-400/15 via-teal-400/12 to-transparent rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Print Specific CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background: #ffffff !important;
            color: #171717 !important;
          }
          .no-print {
            display: none !important;
          }
          .card-print {
            box-shadow: none !important;
            border: 1px solid #e5e5ea !important;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Subtle Apple Document Watermark in Background */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.015] z-0 select-none">
        <span className="text-[120px] font-bold text-neutral-900 tracking-widest uppercase rotate-[-25deg]">
          TheEduCode
        </span>
      </div>

      {/* Top Navigation & Action Bar (no-print) */}
      <header className="sticky top-0 z-40 bg-white/75 backdrop-blur-2xl border-b border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.03)] px-6 lg:px-12 py-3.5 flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.close()}
            className="w-9 h-9 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200/80 flex items-center justify-center transition-all shadow-xs active:scale-95"
            title="Close Tab"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20">
                Academic Scrutiny
              </span>
              <span className="text-xs text-neutral-500 font-semibold">
                {batchNameParam}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                currentUserRole === 'teacher'
                  ? 'bg-purple-500/10 text-purple-700 border border-purple-500/20'
                  : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
              }`}>
                {currentUserRole === 'teacher' ? 'Teacher Access' : 'University Admin'}
              </span>
            </div>
            <h1 className="text-lg font-bold text-neutral-900 tracking-tight mt-0.5">
              {exam_metadata?.course_name || examNameParam}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{executive_summary?.attempted_count || 0} Submissions Audited</span>
          </div>

          <button
            onClick={handleHardRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200/80 flex items-center justify-center transition-all shadow-xs active:scale-95"
            title="Refresh Analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E6] hover:to-[#7C4DE8] text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/25 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Advanced Report</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200/80 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-500" />
            <span>Print / PDF</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full px-6 lg:px-12 py-8 space-y-8 relative z-10 max-w-[1500px] mx-auto">
        
        {/* 1. Dean's Executive Briefing Card (Apple Card Styling) */}
        <div className="p-8 rounded-3xl bg-white/85 backdrop-blur-2xl border border-white/80 shadow-[0_4px_30px_rgba(0,0,0,0.04)] space-y-6 card-print">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-neutral-100">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full">
                  Assessment Evaluation Document
                </span>
                <span className="text-neutral-300">•</span>
                <span className="text-xs text-neutral-500 font-mono font-medium">
                  {courseId}
                </span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
                {exam_metadata?.course_name || examNameParam}
              </h2>
              <p className="text-sm text-neutral-600 max-w-3xl leading-relaxed">
                {tier1Pct < 30 ? (
                  <span>
                    <strong className="text-rose-700 font-bold">Curriculum Gap Alert: </strong>
                    Only <span className="text-rose-700 font-extrabold">{tier1Pct}%</span> ({tier1Count} students) met the corporate technical threshold (≥75%). <span className="font-semibold text-neutral-900">{weakChapters.length} academic chapters</span> and <span className="font-semibold text-neutral-900">{weakTopics.length} syllabus topics</span> exhibit significant failure rates (&lt;40%), requiring targeted departmental remedial labs prior to next-round company interviews.
                  </span>
                ) : (
                  <span>
                    Comprehensive academic diagnostic assessing student comprehension across syllabus chapters, identifying specific cognitive blind spots, and detailing structured pedagogical actions.
                  </span>
                )}
              </p>
            </div>

            {/* Placement Funnel Tiers (Apple Pill Style) */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/15 border border-emerald-500/30 text-center min-w-[125px] shadow-xs">
                <div className="text-3xl font-black text-emerald-700 tracking-tight">{tier1Count}</div>
                <div className="text-xs font-bold text-emerald-900 mt-0.5">Product Ready</div>
                <div className="text-[10px] text-emerald-700 font-bold mt-1 bg-emerald-500/15 rounded-full px-2 py-0.5 inline-block">{tier1Pct}% of cohort</div>
              </div>
              <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-blue-500/15 border border-blue-500/30 text-center min-w-[125px] shadow-xs">
                <div className="text-3xl font-black text-blue-700 tracking-tight">{tier2Count}</div>
                <div className="text-xs font-bold text-blue-900 mt-0.5">Trainable</div>
                <div className="text-[10px] text-blue-700 font-bold mt-1 bg-blue-500/15 rounded-full px-2 py-0.5 inline-block">{placement_funnel?.tier2_trainable?.pct || 0}% of cohort</div>
              </div>
              <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-500/10 via-red-500/5 to-rose-500/15 border border-rose-500/30 text-center min-w-[125px] shadow-xs">
                <div className="text-3xl font-black text-rose-700 tracking-tight">{tier3Count}</div>
                <div className="text-xs font-bold text-rose-900 mt-0.5">Remedial Focus</div>
                <div className="text-[10px] text-rose-700 font-bold mt-1 bg-rose-500/15 rounded-full px-2 py-0.5 inline-block">{placement_funnel?.tier3_remedial_required?.pct || 0}% of cohort</div>
              </div>
            </div>
          </div>

          {/* 4 Core Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-50/70 via-white to-white border border-blue-100/90 shadow-xs hover:border-blue-200 transition-all">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-1 flex items-center justify-between">
                <span>Participation</span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-blue-950 mt-1">{executive_summary?.attempted_count || 0}</div>
              <div className="text-xs text-blue-700/80 font-medium mt-1">of {executive_summary?.enrolled_count || 0} enrolled ({executive_summary?.participation_rate || 0}%)</div>
            </div>

            <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-50/70 via-white to-white border border-purple-100/90 shadow-xs hover:border-purple-200 transition-all">
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700 mb-1 flex items-center justify-between">
                <span>Cohort Average</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-purple-950 mt-1">
                {executive_summary?.average_score || 0} <span className="text-xs text-purple-500 font-normal">/ {exam_metadata?.max_exam_marks || 100}</span>
              </div>
              <div className="text-xs text-purple-700/80 font-medium mt-1">Median: {executive_summary?.median_score || 0} marks</div>
            </div>

            <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-white border border-indigo-100/90 shadow-xs hover:border-indigo-200 transition-all">
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-1 flex items-center justify-between">
                <span>Questions Assessed</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-indigo-950 mt-1">{executive_summary?.total_questions_tested || 0}</div>
              <div className="text-xs text-indigo-700/80 font-medium mt-1">across {chaptersList.length} syllabus chapters</div>
            </div>

            <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-50/70 via-white to-white border border-rose-100/90 shadow-xs hover:border-rose-200 transition-all">
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700 mb-1 flex items-center justify-between">
                <span>Remedial Chapters Flagged</span>
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-rose-600 mt-1">{weakChapters.length}</div>
              <div className="text-xs text-rose-700/80 font-medium mt-1">Out of {chaptersList.length} curriculum chapters</div>
            </div>
          </div>
        </div>

        {/* 2. Apple Segmented Control Tab Navigation (no-print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/60 pb-3 no-print">
          <div className="inline-flex p-1.5 rounded-full bg-neutral-200/70 backdrop-blur-xl border border-white/60 shadow-inner overflow-x-auto">
            {[
              { id: "CHAPTERS", label: "Curriculum Chapters", count: chaptersList.length, color: "text-indigo-600 bg-indigo-50" },
              { id: "TOPICS", label: "Topic Diagnostics", count: filteredTopics.length, color: "text-blue-600 bg-blue-50" },
              { id: "QUESTIONS", label: "Question Scrutiny", count: report.questions_deep_dive?.length || 0, color: "text-purple-600 bg-purple-50" },
              { id: "CURVES", label: "Cohort Curves", color: "text-emerald-600 bg-emerald-50" },
              { id: "BENCHMARKS", label: "Section Benchmarks", count: report.section_benchmarks?.length || 0, color: "text-amber-600 bg-amber-50" }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? "bg-white text-neutral-900 shadow-md font-extrabold"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? tab.color : "bg-neutral-300/60 text-neutral-600"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chapter, topic, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xl border border-neutral-200 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-full sm:w-64 shadow-xs"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: CURRICULUM CHAPTERS (Syllabus Units) */}
        {/* ========================================================================= */}
        {activeTab === "CHAPTERS" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 tracking-tight">
                  Academic Chapters & Curriculum Units
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  High-level syllabus diagnostic revealing which core textbook chapters caused student attrition, why students failed, and the pedagogical strategy to remediate.
                </p>
              </div>
              <span className="text-xs text-neutral-400 font-medium">{chaptersList.length} Chapters Audited</span>
            </div>

            <div className="space-y-4">
              {chaptersList.map((ch, idx) => {
                const isWeak = ch.status === "CRITICAL_WEAK";
                const isMod = ch.status === "MODERATE";
                const total = ch.total_attempts || 0;
                const passPct = ch.accuracy_percent || 0;
                const failPct = ch.failure_rate_percent || Math.max(0, 100 - passPct);
                const passedCount = ch.passed_count ?? Math.round((total * passPct) / 100);
                const partialCount = ch.partial_count ?? 0;
                const failedCount = ch.failed_count ?? Math.max(0, total - passedCount - partialCount);
                const passedWidth = total > 0 ? (passedCount / total) * 100 : 0;
                const partialWidth = total > 0 ? (partialCount / total) * 100 : 0;

                const chQuestions = questionsByChapter[ch.chapter_name] || [];
                const isExpanded = !!expandedSections[`ch_${idx}`];

                return (
                  <div key={idx} className={`p-7 rounded-3xl backdrop-blur-xl transition-all duration-300 space-y-5 card-print ${
                    isWeak 
                      ? "bg-white/95 border border-rose-200/70 shadow-[0_4px_24px_rgba(244,63,94,0.04)] hover:border-rose-300" 
                      : isMod 
                      ? "bg-white/95 border border-amber-200/70 shadow-[0_4px_24px_rgba(245,158,11,0.03)] hover:border-amber-300" 
                      : "bg-white/95 border border-emerald-200/70 shadow-[0_4px_24px_rgba(16,185,129,0.03)] hover:border-emerald-300"
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-neutral-400">
                            Unit {idx + 1}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase flex items-center gap-1.5 ${
                            isWeak 
                              ? "bg-rose-50 text-rose-700 border border-rose-200/70" 
                              : isMod 
                              ? "bg-amber-50 text-amber-700 border border-amber-200/70" 
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                          }`}>
                            {isWeak && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                            {isWeak ? "Remedial Focus • Improvement Class Needed" : isMod ? "Moderate Comprehension" : "Mastered"}
                          </span>
                        </div>
                        <h4 className="text-xl font-extrabold text-neutral-900 tracking-tight">
                          {ch.chapter_name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-6 sm:text-right shrink-0">
                        <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 text-center min-w-[95px]">
                          <div className="text-2xl font-black text-emerald-700 tracking-tight">
                            {passPct}%
                          </div>
                          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Pass Rate</div>
                        </div>
                        <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200/60 text-center min-w-[95px]">
                          <div className="text-2xl font-black text-rose-700 tracking-tight">
                            {failPct}%
                          </div>
                          <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Failure Rate</div>
                        </div>
                      </div>
                    </div>

                    {/* Micro-Stat Grid (Dean & Non-Technical Executive Friendly) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      <div className="p-3.5 rounded-2xl bg-blue-50/40 border border-blue-100/80 shadow-2xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Total Assessed</div>
                        <div className="text-lg font-black text-blue-950 mt-0.5 tabular-nums">
                          {total} <span className="text-xs font-semibold text-blue-600">students</span>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100/80 shadow-2xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Passed (100% Solved)</div>
                        <div className="text-lg font-black text-emerald-950 mt-0.5 tabular-nums">
                          {passedCount} <span className="text-xs font-bold text-emerald-600">({passPct}%)</span>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-100/80 shadow-2xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Partial Solves</div>
                        <div className="text-lg font-black text-amber-950 mt-0.5 tabular-nums">
                          {partialCount} <span className="text-xs font-semibold text-amber-600">students</span>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-rose-50/40 border border-rose-100/80 shadow-2xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Failed / Unpassed</div>
                        <div className="text-lg font-black text-rose-950 mt-0.5 tabular-nums">
                          {failedCount} <span className="text-xs font-bold text-rose-600">({failPct}%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Segmented Progress Bar (Apple Emerald & Amber with Rose Track) */}
                    <div className="space-y-1.5">
                      <div className="h-2.5 rounded-full bg-rose-100/70 overflow-hidden flex shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                          style={{ width: `${passedWidth}%` }}
                          title={`Passed: ${passedCount} (${passPct}%)`}
                        />
                        <div 
                          className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                          style={{ width: `${partialWidth}%` }}
                          title={`Partial: ${partialCount}`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500">
                        <span className="flex items-center gap-2">
                          <span className="text-emerald-700 font-extrabold">{passedCount} passed</span> • 
                          <span className="text-amber-700 font-extrabold">{partialCount} partial</span> • 
                          <span className="text-rose-700 font-extrabold">{failedCount} failed</span>
                        </span>
                        <span>{ch.question_count} Questions Tested • {ch.topics?.length || 0} Syllabus Topics</span>
                      </div>
                    </div>

                    {/* In-Depth Dean Diagnostics: Why & How */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* WHY (The Diagnostic Root Cause) */}
                      <div className="p-4 rounded-2xl bg-rose-50/30 border border-rose-100/80 space-y-1.5 shadow-2xs">
                        <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                          <span>Why Students Failed (Technical Root Cause)</span>
                        </div>
                        <p className="text-xs text-rose-950/85 leading-relaxed font-normal">
                          {ch.why_failed}
                        </p>
                      </div>

                      {/* HOW (The Pedagogical Action Plan) */}
                      <div className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-100/80 space-y-1.5 shadow-2xs">
                        <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>How to Remediate (Pedagogical Action Plan)</span>
                        </div>
                        <p className="text-xs text-emerald-950/85 leading-relaxed font-normal">
                          {ch.how_to_fix}
                        </p>
                      </div>
                    </div>

                    {/* Chapter Action Controls (Refined Apple Pills) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 no-print">
                      <div className="flex items-center gap-2">
                        {isWeak && (
                          <button
                            onClick={() => openRemedialModal(ch, "CHAPTER")}
                            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/70 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                          >
                            <Calendar className="w-3.5 h-3.5 text-rose-600" />
                            <span>Schedule class for this</span>
                          </button>
                        )}
                        {chQuestions.length > 0 && (
                          <button
                            onClick={() => toggleExpand(`ch_${idx}`)}
                            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-neutral-700 bg-neutral-100/80 hover:bg-neutral-200/70 border border-neutral-200/70 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                          >
                            <FileText className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{isExpanded ? "Hide Questions" : `Inspect Questions (${chQuestions.length})`}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3 text-neutral-400" /> : <ChevronDown className="w-3 h-3 text-neutral-400" />}
                          </button>
                        )}
                      </div>

                      <div className="text-[11px] text-neutral-400 font-medium flex items-center gap-2">
                        <span>{chQuestions.length} Questions Tested</span>
                        <span>•</span>
                        <span className="text-rose-600 font-semibold">{failedCount} Failed in Chapter</span>
                      </div>
                    </div>

                    {/* Grouped Questions Breakdown (Image 2 style with "Get Question" inspect modal) */}
                    {isExpanded && chQuestions.length > 0 && (
                      <div className="pt-3 space-y-3 border-t border-neutral-100">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                            <span>Top Attrition Questions in this Chapter</span>
                            <span className="text-[10px] font-normal text-neutral-400 normal-case">(Ranked by student failure count)</span>
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          {chQuestions.map((q, qIdx) => {
                            const fullSolvePct = q.total_attempts > 0 ? (q.full_solves / q.total_attempts) * 100 : 0;
                            const partialSolvePct = q.total_attempts > 0 ? (q.partial_solves / q.total_attempts) * 100 : 0;
                            const isQWeak = q.full_solve_rate < 40;

                            return (
                              <div 
                                key={q.question_id || qIdx}
                                className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-2.5 hover:border-neutral-300 transition-all"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-mono font-bold text-neutral-400">#{qIdx + 1}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                                        isQWeak 
                                          ? "bg-rose-50 text-rose-700 border border-rose-200" 
                                          : q.full_solve_rate < 70 
                                          ? "bg-amber-50 text-amber-700 border border-amber-200" 
                                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      }`}>
                                        {isQWeak ? "CRITICAL WEAK" : q.full_solve_rate < 70 ? "MODERATE" : "MASTERED"}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700 border border-neutral-200/70">
                                        {q.difficulty}
                                      </span>
                                      <span className="text-xs font-bold text-neutral-800">
                                        {q.topic}
                                      </span>
                                    </div>
                                    <p className="text-xs text-neutral-600 line-clamp-1">
                                      {q.description || q.title}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-3 sm:text-right shrink-0">
                                    <div className="text-right">
                                      <div className="text-base font-black text-emerald-700 tabular-nums">
                                        {q.full_solve_rate}%
                                      </div>
                                      <div className="text-[9px] uppercase font-bold text-neutral-400">
                                        100% Passed
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-base font-black text-blue-700 tabular-nums">
                                        {q.avg_test_case_pass_rate}%
                                      </div>
                                      <div className="text-[9px] uppercase font-bold text-neutral-400">
                                        Avg Test Pass
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setInspectingQuestion(q)}
                                      className="ml-2 px-3 py-1.5 rounded-full text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/70 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 shrink-0"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Get Question</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Dual Progress Bar & Micro Solves Stats */}
                                <div className="space-y-1">
                                  <div className="h-2 rounded-full bg-rose-100/70 overflow-hidden flex shadow-inner">
                                    <div 
                                      className="h-full bg-emerald-500 transition-all duration-500"
                                      style={{ width: `${fullSolvePct}%` }}
                                      title={`Full Solves: ${q.full_solves}`}
                                    />
                                    <div 
                                      className="h-full bg-amber-400 transition-all duration-500"
                                      style={{ width: `${partialSolvePct}%` }}
                                      title={`Partial Solves: ${q.partial_solves}`}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] font-medium text-neutral-500">
                                    <span>
                                      <strong className="text-emerald-700 font-bold">{q.full_solves} full solves</strong> • 
                                      <strong className="text-amber-700 font-bold"> {q.partial_solves} partial</strong> • 
                                      <strong className="text-rose-700 font-bold"> {q.zero_solves} failed</strong>
                                    </span>
                                    <span>Total attempts: <strong className="text-neutral-800 font-bold">{q.total_attempts}</strong></span>
                                  </div>
                                </div>

                                {/* Tags */}
                                {Array.isArray(q.tags) && q.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-0.5">
                                    {q.tags.map((tag, tIdx) => (
                                      <span key={tIdx} className="px-2 py-0.5 rounded-full text-[9px] bg-neutral-100 text-neutral-600 font-mono font-medium border border-neutral-200/60">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
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

        {/* ========================================================================= */}
        {/* TAB 2: TOPIC DIAGNOSTICS */}
        {/* ========================================================================= */}
        {activeTab === "TOPICS" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 tracking-tight">
                  Granular Syllabus Topic Diagnostics
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Detailed evaluation of every sub-topic tested, ranked by student error frequency with specific instructional prescriptions.
                </p>
              </div>

              {/* Status Filter */}
              <div className="inline-flex p-1 rounded-full bg-neutral-200/60 text-xs no-print">
                {[
                  { id: "ALL", label: "All" },
                  { id: "CRITICAL_WEAK", label: "Remedial Focus (<40%)" },
                  { id: "MODERATE", label: "Moderate" },
                  { id: "STRONG", label: "Mastered" }
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedTopicStatus(filter.id)}
                    className={`px-3 py-1 rounded-full font-medium transition-all ${
                      selectedTopicStatus === filter.id
                        ? "bg-white text-neutral-900 shadow-xs font-semibold"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTopics.map((t, idx) => {
                const isWeak = t.status === "CRITICAL_WEAK";
                const isMod = t.status === "MODERATE";
                const passRate = t.avg_score_percent ?? t.accuracy_percent ?? 0;
                const failRate = t.failure_rate_percent ?? Math.max(0, 100 - passRate);
                const total = t.total_attempts || 0;
                const passedCount = t.passed_count ?? Math.round((total * passRate) / 100);
                const partialCount = t.partial_count ?? 0;
                const failedCount = t.failed_count ?? Math.max(0, total - passedCount - partialCount);
                const passedWidth = total > 0 ? (passedCount / total) * 100 : 0;
                const partialWidth = total > 0 ? (partialCount / total) * 100 : 0;

                const tQuestions = questionsByTopic[t.topic] || [];
                const isExpanded = !!expandedSections[`top_${idx}`];

                return (
                  <div key={idx} className={`p-6 rounded-3xl backdrop-blur-xl transition-all duration-300 space-y-4 card-print ${
                    isWeak 
                      ? "bg-white/95 border border-rose-200/70 shadow-[0_4px_24px_rgba(244,63,94,0.04)] hover:border-rose-300" 
                      : isMod 
                      ? "bg-white/95 border border-amber-200/70 shadow-[0_4px_24px_rgba(245,158,11,0.03)] hover:border-amber-300" 
                      : "bg-white/95 border border-emerald-200/70 shadow-[0_4px_24px_rgba(16,185,129,0.03)] hover:border-emerald-300"
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase flex items-center gap-1.5 ${
                            isWeak 
                              ? "bg-rose-50 text-rose-700 border border-rose-200/70" 
                              : isMod 
                              ? "bg-amber-50 text-amber-700 border border-amber-200/70" 
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                          }`}>
                            {isWeak && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                            {isWeak ? "Remedial Focus • Improvement Class" : isMod ? "Moderate Comprehension" : "Mastered"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-semibold">
                          <span className="uppercase tracking-wider text-neutral-600">{t.chapter_name || "Core Syllabus"}</span>
                          <span>•</span>
                          <span>{t.lecture_name || "Module"}</span>
                        </div>
                        <h4 className="text-base font-extrabold text-neutral-900 tracking-tight leading-snug">
                          {t.topic}
                        </h4>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 text-center min-w-[85px]">
                          <div className="text-xl font-black text-emerald-700 tracking-tight">
                            {passRate}%
                          </div>
                          <div className="text-[10px] text-rose-700 font-bold uppercase mt-0.5">
                            {failRate}% Failed
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Micro-Stat Grid (Dean & Non-Technical Executive Friendly) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5">
                      <div className="p-3 rounded-2xl bg-blue-50/40 border border-blue-100/80 shadow-2xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Total Assessed</div>
                        <div className="text-base font-black text-blue-950 mt-0.5 tabular-nums">
                          {total} <span className="text-xs font-semibold text-blue-600">students</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-emerald-50/40 border border-emerald-100/80 shadow-2xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Passed (100%)</div>
                        <div className="text-base font-black text-emerald-950 mt-0.5 tabular-nums">
                          {passedCount} <span className="text-xs font-bold text-emerald-600">({passRate}%)</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-amber-50/40 border border-amber-100/80 shadow-2xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Partial Solves</div>
                        <div className="text-base font-black text-amber-950 mt-0.5 tabular-nums">
                          {partialCount} <span className="text-xs font-semibold text-amber-600">students</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-rose-50/40 border border-rose-100/80 shadow-2xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Failed / Zero</div>
                        <div className="text-base font-black text-rose-950 mt-0.5 tabular-nums">
                          {failedCount} <span className="text-xs font-bold text-rose-600">({failRate}%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Segmented Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="h-2.5 rounded-full bg-rose-100/70 overflow-hidden flex shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                          style={{ width: `${passedWidth}%` }}
                          title={`Passed: ${passedCount} (${passRate}%)`}
                        />
                        <div 
                          className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                          style={{ width: `${partialWidth}%` }}
                          title={`Partial: ${partialCount}`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500">
                        <span className="flex items-center gap-2">
                          <span className="text-emerald-700 font-extrabold">{passedCount} passed</span> • 
                          <span className="text-amber-700 font-extrabold">{partialCount} partial</span> • 
                          <span className="text-rose-700 font-extrabold">{failedCount} failed</span>
                        </span>
                        <span>{t.question_count} Questions Tested • {total} Attempts</span>
                      </div>
                    </div>

                    {/* Diagnostic Callouts */}
                    <div className="p-4 rounded-2xl bg-white/80 border border-neutral-200/80 space-y-2.5 text-xs shadow-2xs">
                      <div className="p-2.5 rounded-xl bg-rose-50/40 border border-rose-100/80">
                        <strong className="text-rose-900 flex items-center gap-1.5 font-bold mb-0.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                          <span>Why Students Failed (Technical Root Cause):</span>
                        </strong>
                        <span className="text-rose-950/85 leading-relaxed font-normal">{t.why_failed}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-100/80">
                        <strong className="text-emerald-900 flex items-center gap-1.5 font-bold mb-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Remedial Action Plan (How to Remediate):</span>
                        </strong>
                        <span className="text-emerald-950/85 leading-relaxed font-normal">{t.how_to_fix}</span>
                      </div>
                    </div>

                    {/* Topic Action Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-neutral-100 no-print">
                      <div className="flex items-center gap-2">
                        {isWeak && (
                          <button
                            onClick={() => openRemedialModal(t, "TOPIC")}
                            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/70 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                          >
                            <Calendar className="w-3.5 h-3.5 text-rose-600" />
                            <span>Schedule class for this</span>
                          </button>
                        )}
                        {tQuestions.length > 0 && (
                          <button
                            onClick={() => toggleExpand(`top_${idx}`)}
                            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-neutral-700 bg-neutral-100/80 hover:bg-neutral-200/70 border border-neutral-200/70 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                          >
                            <FileText className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{isExpanded ? "Hide Questions" : `Inspect Questions (${tQuestions.length})`}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3 text-neutral-400" /> : <ChevronDown className="w-3 h-3 text-neutral-400" />}
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-medium">
                        {tQuestions.length} Questions tested
                      </div>
                    </div>

                    {/* Grouped Topic Questions Breakdown (Image 2 style with "Get Question") */}
                    {isExpanded && tQuestions.length > 0 && (
                      <div className="pt-3 space-y-2.5 border-t border-neutral-100">
                        <div className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider">
                          Questions for {t.topic}
                        </div>
                        <div className="space-y-2">
                          {tQuestions.map((q, qIdx) => {
                            const fullSolvePct = q.total_attempts > 0 ? (q.full_solves / q.total_attempts) * 100 : 0;
                            const partialSolvePct = q.total_attempts > 0 ? (q.partial_solves / q.total_attempts) * 100 : 0;
                            const isQWeak = q.full_solve_rate < 40;

                            return (
                              <div 
                                key={q.question_id || qIdx}
                                className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-2 hover:border-neutral-300 transition-all"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[11px] font-mono font-bold text-neutral-400">#{qIdx + 1}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                                        isQWeak 
                                          ? "bg-rose-50 text-rose-700 border border-rose-200" 
                                          : q.full_solve_rate < 70 
                                          ? "bg-amber-50 text-amber-700 border border-amber-200" 
                                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      }`}>
                                        {isQWeak ? "CRITICAL WEAK" : q.full_solve_rate < 70 ? "MODERATE" : "MASTERED"}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-neutral-100 text-neutral-700 border border-neutral-200/70">
                                        {q.difficulty}
                                      </span>
                                      <span className="text-xs font-bold text-neutral-800">
                                        {q.title}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-neutral-600 line-clamp-1">
                                      {q.description || q.title}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2.5 sm:text-right shrink-0">
                                    <div className="text-right">
                                      <div className="text-sm font-black text-emerald-700 tabular-nums">
                                        {q.full_solve_rate}%
                                      </div>
                                      <div className="text-[8px] uppercase font-bold text-neutral-400">
                                        Passed
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setInspectingQuestion(q)}
                                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/70 transition-all flex items-center gap-1 shadow-2xs active:scale-95 shrink-0"
                                    >
                                      <ExternalLink className="w-3 h-3 text-blue-600" />
                                      <span>Get Question</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="h-1.5 rounded-full bg-rose-100/70 overflow-hidden flex shadow-inner">
                                    <div 
                                      className="h-full bg-emerald-500 transition-all duration-500"
                                      style={{ width: `${fullSolvePct}%` }}
                                    />
                                    <div 
                                      className="h-full bg-amber-400 transition-all duration-500"
                                      style={{ width: `${partialSolvePct}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] font-medium text-neutral-500">
                                    <span>
                                      <strong className="text-emerald-700 font-bold">{q.full_solves} passed</strong> • 
                                      <strong className="text-rose-700 font-bold"> {q.zero_solves} failed</strong>
                                    </span>
                                    <span>Attempts: <strong className="text-neutral-800 font-bold">{q.total_attempts}</strong></span>
                                  </div>
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
        )}

        {/* ========================================================================= */}
        {/* TAB 3: QUESTION SCRUTINY */}
        {/* ========================================================================= */}
        {activeTab === "QUESTIONS" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 tracking-tight">
                  Itemized Question & Test Case Performance
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Full question bank audit displaying test-case pass ratios and individual student solve rates.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 no-print">
                <select
                  value={selectedQuestionStatus}
                  onChange={(e) => setSelectedQuestionStatus(e.target.value)}
                  className="py-1.5 px-3 rounded-full bg-white border border-neutral-200 text-xs text-neutral-700 font-medium focus:outline-none"
                >
                  <option value="ALL">All Outcomes</option>
                  <option value="CRITICAL_WEAK">Remedial Focus (&lt;40%)</option>
                  <option value="MODERATE">Moderate (40-69%)</option>
                  <option value="STRONG">Mastered (≥70%)</option>
                </select>

                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="py-1.5 px-3 rounded-full bg-white border border-neutral-200 text-xs text-neutral-700 font-medium focus:outline-none"
                >
                  <option value="ALL">All Difficulties</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {filteredQuestions.map((q, idx) => {
                const fullSolvePct = q.total_attempts > 0 ? (q.full_solves / q.total_attempts) * 100 : 0;
                const partialSolvePct = q.total_attempts > 0 ? (q.partial_solves / q.total_attempts) * 100 : 0;

                return (
                  <div key={q.question_id || idx} className="p-6 rounded-3xl bg-white/90 backdrop-blur-xl border border-neutral-200/90 shadow-2xs card-print space-y-3.5 hover:border-blue-200 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-neutral-400">#{idx + 1}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            q.difficulty === "EASY"
                              ? "bg-emerald-500/15 text-emerald-700 border border-emerald-300"
                              : q.difficulty === "HARD"
                              ? "bg-rose-500/15 text-rose-700 border border-rose-300"
                              : "bg-amber-500/15 text-amber-700 border border-amber-300"
                          }`}>
                            {q.difficulty}
                          </span>
                          <span className="text-xs font-bold text-neutral-700">
                            {q.chapter_name || "Core Syllabus"}
                          </span>
                          <span className="text-neutral-300">•</span>
                          <span className="text-xs font-semibold text-blue-600">
                            {q.topic}
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold text-neutral-900 leading-snug">
                          {q.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-right shrink-0">
                        <div className="p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 text-center min-w-[85px]">
                          <div className="text-xl font-black text-emerald-700 tracking-tight">
                            {q.full_solve_rate}%
                          </div>
                          <div className="text-[10px] text-emerald-800 uppercase font-bold">100% Passed</div>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-blue-50/60 border border-blue-200/60 text-center min-w-[85px]">
                          <div className="text-xl font-black text-blue-700 tracking-tight">
                            {q.avg_test_case_pass_rate}%
                          </div>
                          <div className="text-[10px] text-blue-800 uppercase font-bold">Avg Test Pass</div>
                        </div>
                        <button
                          onClick={() => setInspectingQuestion(q)}
                          className="px-3.5 py-2 rounded-full text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/70 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                          <span>Get Question</span>
                        </button>
                      </div>
                    </div>

                    {/* Micro-Stat Grid for Question */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5">
                      <div className="p-3 rounded-2xl bg-blue-50/40 border border-blue-100/80 shadow-2xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Total Attempts</div>
                        <div className="text-sm font-black text-blue-950 mt-0.5 tabular-nums">
                          {q.total_attempts} <span className="text-xs font-semibold text-blue-600">attempts</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-emerald-50/40 border border-emerald-100/80 shadow-2xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Passed (100%)</div>
                        <div className="text-sm font-black text-emerald-950 mt-0.5 tabular-nums">
                          {q.full_solves} <span className="text-xs font-bold text-emerald-600">({q.full_solve_rate}%)</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-amber-50/40 border border-amber-100/80 shadow-2xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Partial Solves</div>
                        <div className="text-sm font-black text-amber-950 mt-0.5 tabular-nums">
                          {q.partial_solves} <span className="text-xs font-semibold text-amber-600">students</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-rose-50/40 border border-rose-100/80 shadow-2xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Failed / Zero</div>
                        <div className="text-sm font-black text-rose-950 mt-0.5 tabular-nums">
                          {q.zero_solves} <span className="text-xs font-bold text-rose-600">({Math.max(0, 100 - q.full_solve_rate)}%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar (Apple Duo-Tone) */}
                    <div className="space-y-1.5">
                      <div className="h-2.5 rounded-full bg-rose-100/80 overflow-hidden flex shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                          style={{ width: `${fullSolvePct}%` }}
                          title={`Full Solves: ${q.full_solves}`}
                        />
                        <div 
                          className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                          style={{ width: `${partialSolvePct}%` }}
                          title={`Partial Solves: ${q.partial_solves}`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500">
                        <span className="flex items-center gap-2">
                          <span className="text-emerald-700 font-extrabold">{q.full_solves} passed</span> • 
                          <span className="text-amber-700 font-extrabold">{q.partial_solves} partial</span> • 
                          <span className="text-rose-700 font-extrabold">{q.zero_solves} failed</span>
                        </span>
                        <span className="text-neutral-500">Avg Test Case Pass Rate: <strong className="text-blue-700 font-bold">{q.avg_test_case_pass_rate}%</strong></span>
                      </div>
                    </div>

                    {/* Tags */}
                    {Array.isArray(q.tags) && q.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {q.tags.map((tag, tagIdx) => (
                          <span key={tagIdx} className="px-2.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 font-mono font-semibold border border-blue-200/60">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: COHORT PERFORMANCE CURVES (Smooth Vector Graphs) */}
        {/* ========================================================================= */}
        {activeTab === "CURVES" && (
          <div className="p-8 rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/80 shadow-[0_4px_30px_rgba(0,0,0,0.04)] space-y-8 card-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-neutral-900 tracking-tight">
                  Cohort Bell Curve & Normal Score Dispersion
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Smooth mathematical density distribution illustrating assessment score calibration across standard deviation bands.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="px-3 py-1.5 rounded-2xl bg-purple-50 text-purple-800 border border-purple-200">
                  Median: <strong className="font-extrabold">{executive_summary?.median_score || 0} marks</strong>
                </span>
                <span className="px-3 py-1.5 rounded-2xl bg-blue-50 text-blue-800 border border-blue-200">
                  Mean (μ): <strong className="font-extrabold">{executive_summary?.average_score || 0} marks</strong>
                </span>
              </div>
            </div>

            {/* Smooth SVG Spline Chart (Vibrant Apple Blue-Indigo-Purple Gradient) */}
            {curvePoints?.pts && (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-blue-50/40 via-purple-50/20 to-white border border-blue-100/80 flex flex-col items-center shadow-xs">
                <svg viewBox={`0 0 ${curvePoints.width} ${curvePoints.height}`} className="w-full max-w-2xl overflow-visible">
                  <defs>
                    <linearGradient id="appleCurveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0071E3" stopOpacity="0.25" />
                      <stop offset="50%" stopColor="#5856D6" stopOpacity="0.10" />
                      <stop offset="100%" stopColor="#AF52DE" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="appleCurveStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0071E3" />
                      <stop offset="50%" stopColor="#5856D6" />
                      <stop offset="100%" stopColor="#AF52DE" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal baseline */}
                  <line x1="40" y1={curvePoints.height - 30} x2={curvePoints.width - 40} y2={curvePoints.height - 30} stroke="#E5E5EA" strokeWidth="1.5" strokeDasharray="4 4" />

                  {/* Shaded Area under Curve */}
                  <path
                    d={`${curvePoints.path} L ${curvePoints.width - 40} ${curvePoints.height - 30} L 40 ${curvePoints.height - 30} Z`}
                    fill="url(#appleCurveGrad)"
                  />

                  {/* Main Spline Curve with vibrant Apple gradient stroke */}
                  <path
                    d={curvePoints.path}
                    fill="none"
                    stroke="url(#appleCurveStrokeGrad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Data Points & Values */}
                  {curvePoints.pts.map((pt, i) => (
                    <g key={i}>
                      <circle cx={pt.x} cy={pt.y} r="5" fill="#FFFFFF" stroke="#0071E3" strokeWidth="2.5" />
                      <text x={pt.x} y={pt.y - 12} textAnchor="middle" className="text-[11px] font-mono font-bold fill-neutral-800">
                        {score_distribution_curve[i]?.pct}%
                      </text>
                      <text x={pt.x} y={curvePoints.height - 12} textAnchor="middle" className="text-[11px] font-sans font-bold fill-neutral-500">
                        {score_distribution_curve[i]?.bucket || score_distribution_curve[i]?.range}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            )}

            {/* Histogram Breakdown with Apple System Colors */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {score_distribution_curve?.map((b, i) => {
                const colors = [
                  "bg-rose-50/70 border-rose-200/90 text-rose-700",
                  "bg-orange-50/70 border-orange-200/90 text-orange-700",
                  "bg-amber-50/70 border-amber-200/90 text-amber-700",
                  "bg-blue-50/70 border-blue-200/90 text-blue-700",
                  "bg-emerald-50/70 border-emerald-200/90 text-emerald-700"
                ];
                const cStyle = colors[i % colors.length];
                return (
                  <div key={b.bucket || b.range} className={`p-4 rounded-3xl border shadow-2xs text-center ${cStyle}`}>
                    <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">{b.bucket || b.range}</div>
                    <div className="text-2xl font-black mt-1 tracking-tight">{b.pct}%</div>
                    <div className="text-xs font-semibold opacity-90 mt-0.5">{b.count} students</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SECTION BENCHMARKS */}
        {/* ========================================================================= */}
        {activeTab === "BENCHMARKS" && (
          <div className="p-8 rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/80 shadow-[0_4px_30px_rgba(0,0,0,0.04)] space-y-6 card-print">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-neutral-900 tracking-tight">
                  Classroom Section Rankings
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Academic ranking of all classroom cohorts in the examination.
                </p>
              </div>
              <span className="text-xs font-bold text-neutral-500 px-3 py-1 rounded-full bg-neutral-100">{section_benchmarks?.length || 0} Sections Audited</span>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-neutral-200/80 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100/70 text-neutral-500 uppercase font-bold tracking-wider border-b border-neutral-200/80">
                  <tr>
                    <th className="py-3.5 px-5">Rank</th>
                    <th className="py-3.5 px-5">Section</th>
                    <th className="py-3.5 px-5">Attempted</th>
                    <th className="py-3.5 px-5">Average Score</th>
                    <th className="py-3.5 px-5">Placement Ready %</th>
                    <th className="py-3.5 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {section_benchmarks?.map((sec, idx) => (
                    <tr key={sec.section} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-4 px-5">
                        <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                          idx === 0 
                            ? "bg-amber-100 text-amber-800 border border-amber-300 shadow-xs" 
                            : idx === 1 
                            ? "bg-slate-100 text-slate-800 border border-slate-300 shadow-xs" 
                            : idx === 2 
                            ? "bg-orange-100 text-orange-800 border border-orange-300 shadow-xs" 
                            : "text-neutral-400 font-mono"
                        }`}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-bold text-neutral-900 text-sm">{sec.section}</td>
                      <td className="py-4 px-5 font-semibold text-neutral-700">{sec.attempted}</td>
                      <td className="py-4 px-5 font-extrabold text-neutral-900 text-sm">{sec.avg_score}</td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-neutral-900 min-w-[36px]">{sec.placement_ready_pct}%</span>
                          <div className="w-28 h-2 rounded-full bg-neutral-100 overflow-hidden shadow-inner">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400"
                              style={{ width: `${sec.placement_ready_pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        {sec.placement_ready_pct < 40 ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 border border-rose-300 flex items-center gap-1.5 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Improvement Focus
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-300 flex items-center gap-1.5 w-fit">
                            On Track
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Dean's Official Remedial Order Modal (Apple Sheet Style) */}
      {remedialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-in fade-in duration-200 no-print">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-neutral-200 p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-neutral-400">
                  Academic Remedial Directive
                </span>
                <h3 className="text-xl font-semibold text-neutral-900 mt-1 tracking-tight">
                  Schedule Improvement Class
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Target Curriculum: <strong className="text-neutral-900">{remedialType === "CHAPTER" ? activeRemedialItem?.chapter_name : activeRemedialItem?.topic}</strong>
                </p>
              </div>
              <button 
                onClick={() => setRemedialModalOpen(false)}
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {remedialSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-neutral-100 border border-neutral-300 text-neutral-900 text-xs font-semibold flex items-center gap-3">
                <Check className="w-5 h-5 text-neutral-700 shrink-0" />
                <span>{remedialSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleScheduleRemedialSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Assigned Department Faculty</label>
                  <input
                    type="text"
                    required
                    value={remedialInstructor}
                    onChange={(e) => setRemedialInstructor(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-400 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-700 font-semibold mb-1">Target Date</label>
                    <input
                      type="date"
                      required
                      value={remedialDate}
                      onChange={(e) => setRemedialDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-400 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-700 font-semibold mb-1">Duration</label>
                    <input
                      type="text"
                      required
                      value={remedialDuration}
                      onChange={(e) => setRemedialDuration(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-400 font-medium"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#FBFBFD] border border-neutral-200/60 text-neutral-600 space-y-1">
                  <div className="font-semibold text-neutral-900">Recommended Instructional Directive:</div>
                  <div className="text-[11px] leading-relaxed">
                    {activeRemedialItem?.how_to_fix || activeRemedialItem?.action_recommendation}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRemedialModalOpen(false)}
                    className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium shadow-xs"
                  >
                    Confirm & Dispatch Notice
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Question Inspector Modal (Apple Sheet Style) */}
      {inspectingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200 no-print">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white border border-neutral-200/80 shadow-2xl relative overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-neutral-100 flex items-start justify-between bg-neutral-50/50">
              <div className="space-y-1.5 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-200">
                    Question Scrutiny
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    inspectingQuestion.difficulty === "EASY"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : inspectingQuestion.difficulty === "HARD"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {inspectingQuestion.difficulty}
                  </span>
                  <span className="text-xs font-semibold text-neutral-500">
                    {inspectingQuestion.chapter_name || "Core Syllabus"}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 tracking-tight leading-snug">
                  {inspectingQuestion.title}
                </h3>
                <div className="text-xs text-blue-600 font-semibold">
                  Topic: {inspectingQuestion.topic}
                </div>
              </div>
              <button
                onClick={() => setInspectingQuestion(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center text-sm transition-all shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Question Problem Statement / Prompt */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Problem Statement / Question Prompt</span>
                </div>
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/70 font-sans text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap select-text max-h-[260px] overflow-y-auto">
                  {inspectingQuestion.description || inspectingQuestion.title || "Full question body registered in assessment module."}
                </div>
              </div>

              {/* Performance Breakdown */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Student Assessment Cohort Statistics</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
                    <div className="text-[10px] font-bold text-blue-700 uppercase">Total Attempts</div>
                    <div className="text-base font-black text-blue-950 mt-0.5 tabular-nums">{inspectingQuestion.total_attempts}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase">100% Passed</div>
                    <div className="text-base font-black text-emerald-950 mt-0.5 tabular-nums">{inspectingQuestion.full_solves} ({inspectingQuestion.full_solve_rate}%)</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100">
                    <div className="text-[10px] font-bold text-amber-700 uppercase">Partial Solves</div>
                    <div className="text-base font-black text-amber-950 mt-0.5 tabular-nums">{inspectingQuestion.partial_solves}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-50/50 border border-rose-100">
                    <div className="text-[10px] font-bold text-rose-700 uppercase">Failed / Zero</div>
                    <div className="text-base font-black text-rose-950 mt-0.5 tabular-nums">{inspectingQuestion.zero_solves} ({Math.max(0, 100 - inspectingQuestion.full_solve_rate)}%)</div>
                  </div>
                </div>
              </div>

              {/* Test Case Average Pass Rate */}
              <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-neutral-900">Average Test-Case Pass Ratio</div>
                  <div className="text-[11px] text-neutral-500">Percentage of automated hidden & sample unit tests passed across all attempts</div>
                </div>
                <div className="text-xl font-black text-blue-700 tabular-nums">
                  {inspectingQuestion.avg_test_case_pass_rate}%
                </div>
              </div>

              {/* Tags */}
              {Array.isArray(inspectingQuestion.tags) && inspectingQuestion.tags.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Syllabus Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectingQuestion.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="px-2.5 py-0.5 rounded-full text-[10px] bg-neutral-100 text-neutral-700 font-mono font-medium border border-neutral-200/70">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <button
                type="button"
                onClick={() => {
                  const targetTopic = report?.topic_vulnerability_matrix?.find(t => t.topic === inspectingQuestion.topic);
                  setInspectingQuestion(null);
                  if (targetTopic) {
                    openRemedialModal(targetTopic, "TOPIC");
                  }
                }}
                className="px-4 py-2 rounded-full text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5 text-rose-600" />
                <span>Schedule class for this topic</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectingQuestion(null)}
                className="px-5 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs shadow-xs transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function PlacementScrutinyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Loading Scrutiny...</p>
        </div>
      </div>
    }>
      <PlacementScrutinyContent />
    </Suspense>
  );
}
