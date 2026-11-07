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
  User, Lock, Eye, EyeOff, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, SlidersHorizontal
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

  // Authentication and Role Detection (Admin or Teacher Verified)
  const [currentUserRole, setCurrentUserRole] = useState(() => {
    if (typeof window !== 'undefined') {
      const adminTok = getAdminToken() || localStorage.getItem('admin_token');
      if (adminTok) return 'admin';
    }
    return 'teacher';
  });

  const [authVerified, setAuthVerified] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token') || urlParams.get('sso_token');
      const adminToken = getAdminToken() || localStorage.getItem('admin_token');
      const teacherToken = localStorage.getItem('teacher_token') || urlToken;
      const teacherSession = localStorage.getItem('teacher_session');
      return Boolean(adminToken || teacherToken || teacherSession);
    }
    return false;
  });

  // Placement Talent Roster & Shortlist Filter States
  const [rosterTierFilter, setRosterTierFilter] = useState("ALL"); // ALL, TIER_1, TIER_2, TIER_3
  const [rosterArchetypeFilter, setRosterArchetypeFilter] = useState("ALL");
  const [rosterPackageFilter, setRosterPackageFilter] = useState("ALL"); // ALL, SUPER_DREAM, CORE_TECH, MASS_IT
  const [rosterSectionFilter, setRosterSectionFilter] = useState("ALL");
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterCutoffPct, setRosterCutoffPct] = useState(0);
  const [rosterPage, setRosterPage] = useState(1);
  const rosterPerPage = 25;

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

      // Sheet 6: Corporate Placement Roster
      if (report.placement_roster?.length) {
        const rosterRows = report.placement_roster.map((c, idx) => ({
          "Rank": idx + 1,
          "Registration Number": c.uni_reg_id,
          "Candidate Name": c.student_name,
          "Classroom Section": c.section,
          "Score Obtained": c.highest_marks,
          "Max Marks": c.max_marks,
          "Score Percentage": `${c.score_percent}%`,
          "Placement Tier": c.tier_label,
          "Candidate Archetype": c.archetype || "Evaluated",
          "Questions Attempted": c.questions_attempted,
          "Questions Fully Solved": c.questions_solved,
          "Submission Timestamp": c.submitted_at ? new Date(c.submitted_at).toLocaleString() : 'N/A'
        }));
        const wsRoster = XLSX.utils.json_to_sheet(rosterRows);
        XLSX.utils.book_append_sheet(wb, wsRoster, "Corporate Placement Roster");
      }

      // Sheet 7: Competency Radar Benchmarks
      if (report.competency_radar?.length) {
        const compRows = report.competency_radar.map(comp => ({
          "Competency Dimension": comp.competency,
          "Cohort Mastery %": `${comp.cohort_score_pct}%`,
          "Industry Hiring Target %": `${comp.industry_target_pct}%`,
          "Competency Gap %": `${comp.gap_percent}%`,
          "Status": comp.status,
          "Corporate Hiring Impact": comp.hiring_impact
        }));
        const wsComp = XLSX.utils.json_to_sheet(compRows);
        XLSX.utils.book_append_sheet(wb, wsComp, "Competency Benchmarks");
      }

      // Sheet 8: Speed vs Accuracy Archetypes (Mettl)
      if (report.speed_accuracy_matrix?.length) {
        const archRows = report.speed_accuracy_matrix.map(q => ({
          "Quadrant Profile": q.quadrant,
          "Candidate Count": q.count,
          "Cohort Percentage": `${q.pct}%`,
          "Recruiter Verdict": q.hiring_verdict,
          "Faculty Remedial Directive": q.pedagogy_directive
        }));
        const wsArch = XLSX.utils.json_to_sheet(archRows);
        XLSX.utils.book_append_sheet(wb, wsArch, "Speed vs Accuracy Matrix");
      }

      // Sheet 9: NBA / NAAC Accreditation OBE Attainment
      if (report.accreditation_summary?.course_outcomes?.length) {
        const obeRows = report.accreditation_summary.course_outcomes.map(co => ({
          "Course Outcome": co.code,
          "Competency Statement": co.statement,
          "Target Attainment %": `${co.target_attainment_pct}%`,
          "Actual Attained %": `${co.actual_attainment_pct}%`,
          "Accreditation Status": co.status
        }));
        const wsOBE = XLSX.utils.json_to_sheet(obeRows);
        XLSX.utils.book_append_sheet(wb, wsOBE, "Accreditation OBE Audit");
      }

      const safeName = (report.exam_metadata?.course_name || examNameParam).replace(/[^a-zA-Z0-9]/g, "_");
      XLSX.writeFile(wb, `${safeName}_Academic_Scrutiny_Document.xlsx`);
    } catch (err) {
      console.error("Failed to export Excel report:", err);
      alert("Failed to export Excel report. Please try again.");
    }
  };

  // Dedicated Recruiter Shortlist Excel Exporter
  const handleExportRecruiterShortlist = async () => {
    if (!filteredRoster || filteredRoster.length === 0) {
      alert("No candidates meet the active filters to export.");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const rows = filteredRoster.map((c, idx) => ({
        "Rank": idx + 1,
        "Registration Number": c.uni_reg_id,
        "Candidate Name": c.student_name,
        "Classroom Section": c.section,
        "Score Obtained": c.highest_marks,
        "Max Marks": c.max_marks,
        "Score Percentage": `${c.score_percent}%`,
        "Placement Tier": c.tier_label,
        "Questions Attempted": c.questions_attempted,
        "Questions Fully Solved": c.questions_solved,
        "Submission Timestamp": c.submitted_at ? new Date(c.submitted_at).toLocaleString() : 'N/A'
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Recruiter Shortlist");
      const safeName = (report.exam_metadata?.course_name || examNameParam).replace(/[^a-zA-Z0-9]/g, "_");
      XLSX.writeFile(wb, `${safeName}_Corporate_Shortlist_${rosterTierFilter}.xlsx`);
    } catch (err) {
      console.error("Failed to export Recruiter Shortlist:", err);
      alert("Failed to export Recruiter Shortlist.");
    }
  };

  // Available Classroom Sections from Roster
  const availableSections = useMemo(() => {
    if (!report?.placement_roster) return [];
    return [...new Set(report.placement_roster.map(c => c.section).filter(Boolean))].sort();
  }, [report?.placement_roster]);

  // Filtered Candidate Roster
  const filteredRoster = useMemo(() => {
    if (!report?.placement_roster) return [];
    return report.placement_roster.filter(c => {
      const matchTier = rosterTierFilter === "ALL" || c.tier === rosterTierFilter;
      const matchSection = rosterSectionFilter === "ALL" || c.section === rosterSectionFilter;
      const matchCutoff = (c.score_percent || 0) >= rosterCutoffPct;
      const matchArchetype = rosterArchetypeFilter === "ALL" || c.archetype === rosterArchetypeFilter;
      const matchPackage = rosterPackageFilter === "ALL" || 
        (rosterPackageFilter === "SUPER_DREAM" && (c.score_percent || 0) >= 75) ||
        (rosterPackageFilter === "CORE_TECH" && (c.score_percent || 0) >= 50 && (c.score_percent || 0) < 75) ||
        (rosterPackageFilter === "MASS_IT" && (c.score_percent || 0) < 50);
      const q = rosterSearch.toLowerCase().trim();
      const matchSearch = !q || 
        (c.student_name || "").toLowerCase().includes(q) || 
        (c.uni_reg_id || "").toLowerCase().includes(q);
      return matchTier && matchSection && matchCutoff && matchArchetype && matchPackage && matchSearch;
    });
  }, [report?.placement_roster, rosterTierFilter, rosterSectionFilter, rosterCutoffPct, rosterArchetypeFilter, rosterPackageFilter, rosterSearch]);

  // Paginated Roster with defensive page clamping
  const totalRosterPages = Math.max(1, Math.ceil(filteredRoster.length / rosterPerPage));
  const safeRosterPage = Math.min(Math.max(1, rosterPage), totalRosterPages);

  const paginatedRoster = useMemo(() => {
    const start = (safeRosterPage - 1) * rosterPerPage;
    return filteredRoster.slice(start, start + rosterPerPage);
  }, [filteredRoster, safeRosterPage]);

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

  // Generate SVG Coordinates for Industry Competency Radar Chart
  const radarData = useMemo(() => {
    const list = report?.competency_radar;
    if (!list || list.length < 3) return null;
    const cx = 175;
    const cy = 175;
    const r = 110;
    const n = list.length;

    // Concentric Polygon Rings at 25%, 50%, 75%, 100%
    const rings = [0.25, 0.50, 0.75, 1.0].map(pct => {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = cx + pct * r * Math.cos(angle);
        const y = cy + pct * r * Math.sin(angle);
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
      return { pct: Math.round(pct * 100), points: pts.join(" ") };
    });

    // Radial Axis lines & Label Positions
    const axes = list.map((item, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x2 = cx + r * Math.cos(angle);
      const y2 = cy + r * Math.sin(angle);
      const lx = cx + (r + 28) * Math.cos(angle);
      const ly = cy + (r + 14) * Math.sin(angle);
      return { ...item, angle, x2, y2, lx, ly };
    });

    // Cohort Actual Polygon
    const cohortPoints = list.map((item, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const dist = (Math.min(100, Math.max(5, item.cohort_score_pct)) / 100) * r;
      return `${(cx + dist * Math.cos(angle)).toFixed(1)},${(cy + dist * Math.sin(angle)).toFixed(1)}`;
    }).join(" ");

    // Industry Benchmark Target Polygon (70-80%)
    const targetPoints = list.map((item, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const dist = (item.industry_target_pct / 100) * r;
      return `${(cx + dist * Math.cos(angle)).toFixed(1)},${(cy + dist * Math.sin(angle)).toFixed(1)}`;
    }).join(" ");

    return { cx, cy, r, rings, axes, cohortPoints, targetPoints };
  }, [report?.competency_radar]);

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

  // 1. Ingest URL token if arriving via shared authenticated link or detect active session
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
    } else {
      const adminTok = getAdminToken() || localStorage.getItem('admin_token');
      if (adminTok) {
        setCurrentUserRole('admin');
        setAuthVerified(true);
      }
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

            {/* Placement Funnel Tiers (Interactive Apple Pills) */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { setActiveTab("ROSTER"); setRosterTierFilter("TIER_1"); }}
                className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/15 border border-emerald-500/30 text-center min-w-[125px] shadow-xs hover:border-emerald-500/60 hover:scale-[1.03] transition-all cursor-pointer group text-left"
                title="Filter Roster: Tier 1 Placement Ready Candidates"
              >
                <div className="text-3xl font-black text-emerald-700 tracking-tight group-hover:text-emerald-800">{tier1Count}</div>
                <div className="text-xs font-bold text-emerald-900 mt-0.5 flex items-center justify-between">
                  <span>Product Ready</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-700" />
                </div>
                <div className="text-[10px] text-emerald-700 font-bold mt-1 bg-emerald-500/15 rounded-full px-2 py-0.5 inline-block">{tier1Pct}% of cohort</div>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("ROSTER"); setRosterTierFilter("TIER_2"); }}
                className="p-4 rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-blue-500/15 border border-blue-500/30 text-center min-w-[125px] shadow-xs hover:border-blue-500/60 hover:scale-[1.03] transition-all cursor-pointer group text-left"
                title="Filter Roster: Tier 2 Trainable Candidates"
              >
                <div className="text-3xl font-black text-blue-700 tracking-tight group-hover:text-blue-800">{tier2Count}</div>
                <div className="text-xs font-bold text-blue-900 mt-0.5 flex items-center justify-between">
                  <span>Trainable</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-700" />
                </div>
                <div className="text-[10px] text-blue-700 font-bold mt-1 bg-blue-500/15 rounded-full px-2 py-0.5 inline-block">{placement_funnel?.tier2_trainable?.pct || 0}% of cohort</div>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("ROSTER"); setRosterTierFilter("TIER_3"); }}
                className="p-4 rounded-3xl bg-gradient-to-br from-rose-500/10 via-red-500/5 to-rose-500/15 border border-rose-500/30 text-center min-w-[125px] shadow-xs hover:border-rose-500/60 hover:scale-[1.03] transition-all cursor-pointer group text-left"
                title="Filter Roster: Tier 3 Remedial Candidates"
              >
                <div className="text-3xl font-black text-rose-700 tracking-tight group-hover:text-rose-800">{tier3Count}</div>
                <div className="text-xs font-bold text-rose-900 mt-0.5 flex items-center justify-between">
                  <span>Remedial Focus</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-rose-700" />
                </div>
                <div className="text-[10px] text-rose-700 font-bold mt-1 bg-rose-500/15 rounded-full px-2 py-0.5 inline-block">{placement_funnel?.tier3_remedial_required?.pct || 0}% of cohort</div>
              </button>
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

          {/* TPO Campus CTC Salary Package Projections (HackerRank & Campus Drive Standards) */}
          <div className="pt-4 border-t border-neutral-100/90">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                  Campus Placement Salary Projections & Corporate Eligibility
                </span>
              </div>
              <span className="text-[11px] text-neutral-500 font-medium">
                Calibrated against Tier-1 Product vs Mass IT Service hiring thresholds
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Super Dream */}
              <button
                type="button"
                onClick={() => { setActiveTab("ROSTER"); setRosterPackageFilter("SUPER_DREAM"); setRosterTierFilter("ALL"); }}
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-500/30 hover:border-emerald-500/60 hover:scale-[1.01] transition-all text-left group cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800">
                    SUPER DREAM COHORT
                  </span>
                  <span className="text-xs font-extrabold text-emerald-800">₹10 - ₹42 LPA</span>
                </div>
                <div className="text-2xl font-black text-emerald-950 mt-2">
                  {tier1Count} Candidates <span className="text-xs text-emerald-700 font-semibold">({tier1Pct}%)</span>
                </div>
                <p className="text-[11px] text-emerald-900/80 font-medium mt-1">
                  Google, Microsoft, Amazon, Oracle, Adobe, Atlassian, Flipkart
                </p>
                <div className="text-[10px] text-emerald-700 font-bold mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>View Super Dream Shortlist</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Core Tech */}
              <button
                type="button"
                onClick={() => { setActiveTab("ROSTER"); setRosterPackageFilter("CORE_TECH"); setRosterTierFilter("ALL"); }}
                className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-indigo-500/10 border border-blue-500/30 hover:border-blue-500/60 hover:scale-[1.01] transition-all text-left group cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-800">
                    CORE ENGINEERING
                  </span>
                  <span className="text-xs font-extrabold text-blue-800">₹6 - ₹10 LPA</span>
                </div>
                <div className="text-2xl font-black text-blue-950 mt-2">
                  {tier2Count} Candidates <span className="text-xs text-blue-700 font-semibold">({placement_funnel?.tier2_trainable?.pct || 0}%)</span>
                </div>
                <p className="text-[11px] text-blue-900/80 font-medium mt-1">
                  Cisco, Deloitte, Cognizant Digital, Accenture Advance, Capgemini
                </p>
                <div className="text-[10px] text-blue-700 font-bold mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>View Core Tech Shortlist</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Mass IT Services */}
              <button
                type="button"
                onClick={() => { setActiveTab("ROSTER"); setRosterPackageFilter("MASS_IT"); setRosterTierFilter("ALL"); }}
                className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-orange-500/10 border border-amber-500/30 hover:border-amber-500/60 hover:scale-[1.01] transition-all text-left group cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800">
                    MASS IT & OPERATIONS
                  </span>
                  <span className="text-xs font-extrabold text-amber-800">₹3.5 - ₹5.5 LPA</span>
                </div>
                <div className="text-2xl font-black text-amber-950 mt-2">
                  {tier3Count} Candidates <span className="text-xs text-amber-700 font-semibold">({placement_funnel?.tier3_remedial_required?.pct || 0}%)</span>
                </div>
                <p className="text-[11px] text-amber-900/80 font-medium mt-1">
                  TCS Ninja, Infosys Operations, Wipro Elite, Tech Mahindra
                </p>
                <div className="text-[10px] text-amber-700 font-bold mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>View Services Cohort</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Apple Segmented Control Tab Navigation (no-print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/60 pb-3 no-print">
          <div className="inline-flex p-1.5 rounded-full bg-neutral-200/70 backdrop-blur-xl border border-white/60 shadow-inner overflow-x-auto max-w-full">
            {[
              { id: "ROSTER", label: "Talent Roster", count: filteredRoster.length, color: "text-teal-700 bg-teal-50" },
              { id: "COMPETENCY", label: "Skills Radar", color: "text-indigo-700 bg-indigo-50" },
              { id: "ARCHETYPES", label: "Speed vs Accuracy", color: "text-blue-700 bg-blue-50" },
              { id: "HEATMAP", label: "Section Heatmap", count: report.section_chapter_heatmap?.length || 0, color: "text-amber-700 bg-amber-50" },
              { id: "ACCREDITATION", label: "Accreditation (OBE)", color: "text-rose-700 bg-rose-50" },
              { id: "CHAPTERS", label: "Curriculum Chapters", count: chaptersList.length, color: "text-violet-700 bg-violet-50" },
              { id: "TOPICS", label: "Topic Diagnostics", count: filteredTopics.length, color: "text-cyan-700 bg-cyan-50" },
              { id: "QUESTIONS", label: "Question Scrutiny", count: report.questions_deep_dive?.length || 0, color: "text-purple-700 bg-purple-50" },
              { id: "CURVES", label: "Score Curves", color: "text-emerald-700 bg-emerald-50" },
              { id: "BENCHMARKS", label: "Classroom Rankings", count: report.section_benchmarks?.length || 0, color: "text-orange-700 bg-orange-50" }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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
        {/* TAB 4: PLACEMENT TALENT ROSTER & CORPORATE SHORTLIST */}
        {/* ========================================================================= */}
        {activeTab === "ROSTER" && (
          <div className="space-y-6">
            {/* Roster Header & Controls */}
            <div className="p-6 rounded-3xl bg-white/85 backdrop-blur-2xl border border-white/80 shadow-[0_4px_30px_rgba(0,0,0,0.04)] space-y-6 card-print">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-neutral-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-teal-700 bg-teal-50 border border-teal-200/60 px-2.5 py-0.5 rounded-full">
                      TPO & Corporate Shortlist
                    </span>
                    <span className="text-xs text-neutral-400 font-semibold">•</span>
                    <span className="text-xs text-neutral-500 font-semibold">
                      {filteredRoster.length} of {report.placement_roster?.length || 0} Candidates Shortlisted
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-neutral-900 tracking-tight mt-1">
                    Candidate Placement Roster & Technical Standings
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Individual candidate scores, classroom sections, technical thresholds, and direct links to comprehensive telemetry inspection.
                  </p>
                </div>

                {/* Export & Actions */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={handleExportRecruiterShortlist}
                    className="px-4 py-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-500/25 transition-all active:scale-95 cursor-pointer"
                    title="Export currently filtered candidates to Excel for corporate recruiters"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Shortlist ({filteredRoster.length})</span>
                  </button>
                </div>
              </div>

              {/* Filters & Cutoff Simulator Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Search */}
                <div className="md:col-span-4 relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => { setRosterSearch(e.target.value); setRosterPage(1); }}
                    placeholder="Search candidate name or reg number..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-neutral-100/80 border border-neutral-200/70 text-xs font-medium text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                  />
                  {rosterSearch && (
                    <button 
                      onClick={() => { setRosterSearch(""); setRosterPage(1); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Section Filter */}
                <div className="md:col-span-3">
                  <select
                    value={rosterSectionFilter}
                    onChange={(e) => { setRosterSectionFilter(e.target.value); setRosterPage(1); }}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-100/80 border border-neutral-200/70 text-xs font-semibold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                  >
                    <option value="ALL">All Sections ({availableSections.length} sections)</option>
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Eligibility Cutoff Slider */}
                <div className="md:col-span-5 flex items-center gap-3 p-2.5 rounded-2xl bg-teal-50/60 border border-teal-100">
                  <SlidersHorizontal className="w-4 h-4 text-teal-600 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-teal-900">
                      <span>Recruiter Cutoff: ≥ {rosterCutoffPct}%</span>
                      <span>{Math.round(((exam_metadata?.max_exam_marks || 18) * rosterCutoffPct) / 100)} marks</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={rosterCutoffPct}
                      onChange={(e) => { setRosterCutoffPct(Number(e.target.value)); setRosterPage(1); }}
                      className="w-full accent-teal-600 cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
                    />
                  </div>
                  {rosterCutoffPct > 0 && (
                    <button
                      onClick={() => { setRosterCutoffPct(0); setRosterPage(1); }}
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-900 px-2 py-1 rounded-md bg-teal-200/60 shrink-0"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Enhanced Recruiter & TPO Filter Controls */}
              <div className="space-y-3 pt-1">
                {/* 1. Corporate Salary / CTC Brackets */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mr-1">CTC Bracket:</span>
                  {[
                    { id: "ALL", label: "All Packages", color: "text-neutral-700 bg-neutral-100" },
                    { id: "SUPER_DREAM", label: "Super Dream (₹10-42 LPA)", count: tier1Count, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                    { id: "CORE_TECH", label: "Core Tech (₹6-10 LPA)", count: tier2Count, color: "text-blue-700 bg-blue-50 border-blue-200" },
                    { id: "MASS_IT", label: "Mass IT (₹3.5-5.5 LPA)", count: tier3Count, color: "text-amber-700 bg-amber-50 border-amber-200" }
                  ].map(p => {
                    const isSel = rosterPackageFilter === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setRosterPackageFilter(p.id); setRosterPage(1); }}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                          isSel 
                            ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" 
                            : "bg-white text-neutral-600 border-neutral-200/80 hover:bg-neutral-50"
                        }`}
                      >
                        <span>{p.label}</span>
                        {p.count !== undefined && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isSel ? "bg-white/20 text-white" : p.color}`}>
                            {p.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 2. Candidate Cognitive Archetypes (Mettl Framework) */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mr-1">Candidate Profile:</span>
                  {[
                    { id: "ALL", label: "All Profiles" },
                    { id: "Elite Day-1 Ready", label: "Elite Day-1 Ready" },
                    { id: "Methodical Engineer", label: "Methodical Engineer" },
                    { id: "Impulsive / Rushed", label: "Impulsive / Rushed" },
                    { id: "Remedial Support", label: "Remedial Support" }
                  ].map(a => {
                    const isSel = rosterArchetypeFilter === a.id;
                    return (
                      <button
                        key={a.id}
                        onClick={() => { setRosterArchetypeFilter(a.id); setRosterPage(1); }}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                          isSel 
                            ? "bg-teal-700 text-white border-teal-700 shadow-sm" 
                            : "bg-white text-neutral-600 border-neutral-200/80 hover:bg-neutral-50"
                        }`}
                      >
                        <span>{a.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 3. Readiness Tiers */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mr-1">Readiness Tier:</span>
                  {[
                    { id: "ALL", label: "All Candidates", count: report.placement_roster?.length || 0, color: "text-neutral-700 bg-neutral-100" },
                    { id: "TIER_1", label: "Tier 1: Placement Ready (≥75%)", count: tier1Count, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                    { id: "TIER_2", label: "Tier 2: Trainable (50-74%)", count: tier2Count, color: "text-blue-700 bg-blue-50 border-blue-200" },
                    { id: "TIER_3", label: "Tier 3: Remedial Focus (<50%)", count: tier3Count, color: "text-rose-700 bg-rose-50 border-rose-200" }
                  ].map(t => {
                    const isSel = rosterTierFilter === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => { setRosterTierFilter(t.id); setRosterPage(1); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                          isSel 
                            ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" 
                            : "bg-white text-neutral-600 border-neutral-200/80 hover:bg-neutral-50"
                        }`}
                      >
                        <span>{t.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isSel ? "bg-white/20 text-white" : t.color}`}>
                          {t.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Candidate Table */}
            <div className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/80 shadow-[0_4px_30px_rgba(0,0,0,0.04)] overflow-hidden card-print">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/80 border-b border-neutral-200/60 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                      <th className="py-3.5 px-5 w-16 text-center">Rank</th>
                      <th className="py-3.5 px-5">Candidate</th>
                      <th className="py-3.5 px-5">Section</th>
                      <th className="py-3.5 px-5">Score & Accuracy</th>
                      <th className="py-3.5 px-5 text-center">Placement Tier</th>
                      <th className="py-3.5 px-5 text-center">Questions</th>
                      <th className="py-3.5 px-5 text-right">Telemetry Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-xs">
                    {paginatedRoster.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-neutral-400 font-medium">
                          No candidates match the selected filters or cutoff threshold.
                        </td>
                      </tr>
                    ) : (
                      paginatedRoster.map((c, idx) => {
                        const globalRank = (safeRosterPage - 1) * rosterPerPage + idx + 1;
                        const isGold = globalRank === 1;
                        const isSilver = globalRank === 2;
                        const isBronze = globalRank === 3;
                        
                        const studentDetailsUrl = `/dashboard/details-analysis?examName=${encodeURIComponent(exam_metadata?.course_name || examNameParam)}&courseId=${courseId}&studentId=${c.student_id}&regNo=${encodeURIComponent(c.uni_reg_id)}&name=${encodeURIComponent(c.student_name)}&sectionName=${encodeURIComponent(c.section)}&batchId=${batchId}`;

                        return (
                          <tr key={c.student_id || idx} className="hover:bg-neutral-50/80 transition-colors group">
                            {/* Rank */}
                            <td className="py-4 px-5 text-center">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${
                                isGold 
                                  ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-xs" 
                                  : isSilver 
                                  ? "bg-slate-200 text-slate-800 border border-slate-300"
                                  : isBronze 
                                  ? "bg-amber-700/10 text-amber-900 border border-amber-600/30"
                                  : "text-neutral-500 font-medium"
                              }`}>
                                #{globalRank}
                              </span>
                            </td>

                            {/* Candidate */}
                            <td className="py-4 px-5">
                              <div className="font-mono font-bold text-neutral-900 text-xs tracking-tight">
                                {c.uni_reg_id}
                              </div>
                              <div className="text-[11px] text-neutral-500 font-medium truncate max-w-[200px]">
                                {c.student_name !== c.uni_reg_id ? c.student_name : `Student ${c.uni_reg_id}`}
                              </div>
                            </td>

                            {/* Section */}
                            <td className="py-4 px-5">
                              <span className="px-2.5 py-1 rounded-xl bg-neutral-100 text-neutral-700 font-semibold text-[11px] border border-neutral-200/60">
                                {c.section}
                              </span>
                            </td>

                            {/* Score & Progress */}
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3">
                                <div className="min-w-[70px]">
                                  <span className="font-extrabold text-neutral-900 text-sm">{c.highest_marks}</span>
                                  <span className="text-[11px] text-neutral-400 font-normal"> / {c.max_marks}</span>
                                  <span className="ml-1.5 text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded-md">
                                    {c.score_percent}%
                                  </span>
                                </div>
                                <div className="w-24 h-2 rounded-full bg-neutral-100 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      c.tier === "TIER_1" 
                                        ? "bg-gradient-to-r from-emerald-500 to-teal-500" 
                                        : c.tier === "TIER_2" 
                                        ? "bg-gradient-to-r from-blue-500 to-indigo-500" 
                                        : "bg-gradient-to-r from-rose-400 to-red-500"
                                    }`}
                                    style={{ width: `${Math.min(100, c.score_percent)}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Placement Tier & Archetype */}
                            <td className="py-4 px-5 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  c.tier === "TIER_1"
                                    ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/20"
                                    : c.tier === "TIER_2"
                                    ? "bg-blue-500/10 text-blue-800 border-blue-500/20"
                                    : "bg-rose-500/10 text-rose-800 border-rose-500/20"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    c.tier === "TIER_1" ? "bg-emerald-500" : c.tier === "TIER_2" ? "bg-blue-500" : "bg-rose-500"
                                  }`} />
                                  <span>{c.tier_label}</span>
                                </span>
                                {c.archetype && (
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-md ${
                                    c.archetype === 'Elite Day-1 Ready'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : c.archetype === 'Methodical Engineer'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : c.archetype === 'Impulsive / Rushed'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                                  }`}>
                                    {c.archetype}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Questions */}
                            <td className="py-4 px-5 text-center">
                              <span className="text-xs font-semibold text-neutral-700">
                                <strong className="text-emerald-700 font-bold">{c.questions_solved}</strong> / {c.questions_attempted} solved
                              </span>
                            </td>

                            {/* Action */}
                            <td className="py-4 px-5 text-right">
                              <a
                                href={studentDetailsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-900 text-neutral-700 hover:text-white font-bold text-[11px] transition-all shadow-xs group-hover:border-neutral-300"
                              >
                                <span>Inspect Analysis</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {filteredRoster.length > rosterPerPage && (
                <div className="p-4 bg-neutral-50/80 border-t border-neutral-200/60 flex items-center justify-between text-xs text-neutral-600">
                  <div>
                    Showing <strong className="font-bold text-neutral-900">{(safeRosterPage - 1) * rosterPerPage + 1}</strong> to <strong className="font-bold text-neutral-900">{Math.min(safeRosterPage * rosterPerPage, filteredRoster.length)}</strong> of <strong className="font-bold text-neutral-900">{filteredRoster.length}</strong> candidates
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRosterPage(p => Math.max(1, p - 1))}
                      disabled={safeRosterPage === 1}
                      className="px-3 py-1.5 rounded-xl bg-white border border-neutral-200/80 hover:bg-neutral-100 text-neutral-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>
                    <span className="px-3 py-1 font-semibold text-neutral-500">
                      Page {safeRosterPage} of {totalRosterPages}
                    </span>
                    <button
                      onClick={() => setRosterPage(p => Math.min(totalRosterPages, p + 1))}
                      disabled={safeRosterPage === totalRosterPages}
                      className="px-3 py-1.5 rounded-xl bg-white border border-neutral-200/80 hover:bg-neutral-100 text-neutral-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: INDUSTRY COMPETENCY RADAR (HackerRank Skills Matrix Benchmark) */}
        {/* ========================================================================= */}
        {activeTab === "COMPETENCY" && (
          <div className="space-y-6">
            <div className="p-8 rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/80 shadow-[0_4px_30px_rgba(0,0,0,0.04)] card-print space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-full">
                      HackerRank & ABET Competency Radar
                    </span>
                    <span className="text-xs text-neutral-400 font-semibold">•</span>
                    <span className="text-xs text-neutral-500 font-semibold">5 Core Technical Competencies</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-neutral-900 tracking-tight mt-1">
                    Industry Skills Matrix & Technical Competency Benchmark
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Multi-axial radar map calibrating student cohort mastery against Tier-1 Corporate Technical Hiring standards (70% - 80% baseline).
                  </p>
                </div>

                {/* Radar Legend */}
                <div className="flex items-center gap-4 text-xs font-bold shrink-0 bg-neutral-50 px-4 py-2.5 rounded-2xl border border-neutral-200/60">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-indigo-600 shadow-xs" />
                    <span className="text-indigo-950 font-bold">University Cohort</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-rose-500" />
                    <span className="text-rose-700 font-bold">Corporate Bar (75%)</span>
                  </div>
                </div>
              </div>

              {/* Spider Chart & Executive Summary Split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* SVG Radar Chart (Pentagon) */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center p-4">
                  {radarData ? (
                    <svg viewBox="0 0 350 350" className="w-full max-w-[340px] h-auto drop-shadow-sm select-none">
                      {/* Concentric Grid Rings */}
                      {radarData.rings.map((ring, idx) => (
                        <g key={idx}>
                          <polygon
                            points={ring.points}
                            fill="none"
                            stroke="#E5E7EB"
                            strokeWidth="1.2"
                            strokeDasharray={idx === 3 ? "none" : "3 3"}
                          />
                          <text x={radarData.cx + 4} y={radarData.cy - (idx + 1) * (radarData.r / 4) + 10} className="text-[9px] fill-neutral-400 font-mono font-semibold">
                            {ring.pct}%
                          </text>
                        </g>
                      ))}

                      {/* Radial Axis Lines */}
                      {radarData.axes.map((ax, idx) => (
                        <g key={idx}>
                          <line
                            x1={radarData.cx}
                            y1={radarData.cy}
                            x2={ax.x2}
                            y2={ax.y2}
                            stroke="#E5E7EB"
                            strokeWidth="1.2"
                          />
                          <text
                            x={ax.lx}
                            y={ax.ly}
                            textAnchor="middle"
                            className="text-[10px] fill-neutral-700 font-bold tracking-tight"
                          >
                            {ax.competency.split(" ")[0]}
                          </text>
                        </g>
                      ))}

                      {/* Industry Benchmark Target Polygon (Red Dashed) */}
                      <polygon
                        points={radarData.targetPoints}
                        fill="rgba(244, 63, 94, 0.05)"
                        stroke="#F43F5E"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />

                      {/* Cohort Actual Polygon (Vibrant Indigo Gradient Fill) */}
                      <polygon
                        points={radarData.cohortPoints}
                        fill="rgba(99, 102, 241, 0.28)"
                        stroke="#6366F1"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      />

                      {/* Radar Center Hub */}
                      <circle cx={radarData.cx} cy={radarData.cy} r="3" fill="#6366F1" />
                    </svg>
                  ) : (
                    <div className="py-12 text-center text-xs text-neutral-400">
                      Evaluating competency dimensions...
                    </div>
                  )}
                  <span className="text-[11px] font-semibold text-neutral-400 mt-2">
                    Multi-axial skill projection based on {report.executive_summary?.total_questions_tested || 0} evaluated questions
                  </span>
                </div>

                {/* Right Side: Key Competency Findings */}
                <div className="lg:col-span-7 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                    Technical Competency Diagnostics & Hiring Gap Analysis
                  </h4>
                  {(report.competency_radar || []).map((comp, idx) => {
                    const isDeficit = comp.status === 'CRITICAL_DEFICIT';
                    const isPartial = comp.status === 'PARTIAL';
                    return (
                      <div 
                        key={comp.id || idx}
                        className={`p-4 rounded-2xl border transition-all ${
                          isDeficit 
                            ? 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50/70' 
                            : isPartial 
                            ? 'bg-amber-50/40 border-amber-200/80 hover:bg-amber-50/70' 
                            : 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-neutral-900">{comp.competency}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isDeficit ? 'bg-rose-100 text-rose-800' : isPartial ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isDeficit ? `Deficit: -${comp.gap_percent}%` : isPartial ? `Gap: -${comp.gap_percent}%` : 'Benchmark Met'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-extrabold text-neutral-900">{comp.cohort_score_pct}%</span>
                            <span className="text-[10px] text-neutral-400">/ {comp.industry_target_pct}% Target</span>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-neutral-200/70 overflow-hidden mt-2 relative">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              isDeficit ? 'bg-rose-500' : isPartial ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${comp.cohort_score_pct}%` }}
                          />
                          {/* Target Tick */}
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-neutral-900 z-10"
                            style={{ left: `${comp.industry_target_pct}%` }}
                            title={`Target: ${comp.industry_target_pct}%`}
                          />
                        </div>

                        <p className="text-[11px] text-neutral-600 mt-2 leading-relaxed">
                          <strong className="text-neutral-800 font-semibold">Corporate Impact: </strong>{comp.hiring_impact}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: SPEED VS ACCURACY MATRIX (Mercer | Mettl 4-Quadrant Framework) */}
        {/* ========================================================================= */}
        {activeTab === "ARCHETYPES" && (
          <div className="space-y-6">
            <div className="p-8 rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/80 shadow-[0_4px_30px_rgba(0,0,0,0.04)] card-print space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full">
                      Mercer | Mettl Signature Assessment
                    </span>
                    <span className="text-xs text-neutral-400 font-semibold">•</span>
                    <span className="text-xs text-neutral-500 font-semibold">Cognitive & Execution Archetypes</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-neutral-900 tracking-tight mt-1">
                    Speed vs Accuracy Quadrant & Behavioral Archetypes
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Evaluates student problem-solving approach under timed pressure, distinguishing impulsive guessers from methodical and elite problem-solvers.
                  </p>
                </div>
              </div>

              {/* 2x2 Quadrant Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(report.speed_accuracy_matrix || []).map((quad, idx) => {
                  const isQ1 = idx === 0;
                  const isQ2 = idx === 1;
                  const isQ3 = idx === 2;
                  const isQ4 = idx === 3;

                  return (
                    <div 
                      key={idx}
                      className={`p-6 rounded-3xl border transition-all shadow-xs relative overflow-hidden group ${
                        isQ1 
                          ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white border-emerald-500/30' 
                          : isQ2 
                          ? 'bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white border-blue-500/30' 
                          : isQ3 
                          ? 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border-amber-500/30' 
                          : 'bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-white border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            isQ1 ? 'bg-emerald-500/20 text-emerald-800' : isQ2 ? 'bg-blue-500/20 text-blue-800' : isQ3 ? 'bg-amber-500/20 text-amber-800' : 'bg-rose-500/20 text-rose-800'
                          }`}>
                            {quad.quadrant.split(":")[0]}
                          </span>
                          <h4 className="text-base font-extrabold text-neutral-900 tracking-tight mt-1.5">
                            {quad.quadrant.split(":")[1]?.trim() || quad.quadrant}
                          </h4>
                          <p className="text-xs text-neutral-500 font-medium mt-0.5">
                            {quad.profile}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className={`text-3xl font-black ${
                            isQ1 ? 'text-emerald-700' : isQ2 ? 'text-blue-700' : isQ3 ? 'text-amber-700' : 'text-rose-700'
                          }`}>
                            {quad.count}
                          </div>
                          <span className="text-[11px] font-bold text-neutral-500">
                            {quad.pct}% of cohort
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-neutral-200/50 space-y-2.5 text-xs">
                        <div className="p-3 rounded-2xl bg-white/80 border border-neutral-100 shadow-xs">
                          <strong className="text-neutral-900 font-bold block mb-0.5">Recruiter Verdict:</strong>
                          <span className="text-neutral-600 leading-relaxed">{quad.hiring_verdict}</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-white/80 border border-neutral-100 shadow-xs">
                          <strong className="text-neutral-900 font-bold block mb-0.5">Faculty Action Directive:</strong>
                          <span className="text-neutral-600 leading-relaxed">{quad.pedagogy_directive}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("ROSTER");
                            setRosterArchetypeFilter(
                              isQ1 ? "Elite Day-1 Ready" : isQ2 ? "Methodical Engineer" : isQ3 ? "Impulsive / Rushed" : "Remedial Support"
                            );
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isQ1 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' 
                              : isQ2 
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' 
                              : isQ3 
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs' 
                              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                          }`}
                        >
                          <span>Inspect {quad.count} Candidates</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: SECTION CHAPTER HEATMAP (Dean's Curricular Matrix) */}
        {/* ========================================================================= */}
        {activeTab === "HEATMAP" && (
          <div className="space-y-6">
            <div className="p-8 rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/80 shadow-[0_4px_30px_rgba(0,0,0,0.04)] card-print space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-full">
                      Dean Academic Diagnostics
                    </span>
                    <span className="text-xs text-neutral-400 font-semibold">•</span>
                    <span className="text-xs text-neutral-500 font-semibold">Curriculum Cross-Tabulation</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-neutral-900 tracking-tight mt-1">
                    Classroom Section × Curriculum Chapter Heatmap
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Matrix displaying student pass rates by classroom section across individual textbook chapters, pinpointing section-specific syllabus weaknesses.
                  </p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 text-xs font-bold shrink-0 bg-neutral-50 px-4 py-2 rounded-2xl border border-neutral-200/60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-emerald-500" />
                    <span className="text-neutral-700">Strong (≥70%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-amber-400" />
                    <span className="text-neutral-700">Moderate (40-69%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-rose-500" />
                    <span className="text-neutral-700">Critical (&lt;40%)</span>
                  </div>
                </div>
              </div>

              {/* Heatmap Matrix Table */}
              <div className="overflow-x-auto rounded-2xl border border-neutral-200/80">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/90 border-b border-neutral-200 text-[11px] font-extrabold text-neutral-600 uppercase tracking-wider">
                      <th className="py-3 px-5">Classroom Section</th>
                      {chaptersList.map(ch => (
                        <th key={ch.chapter_name} className="py-3 px-5 text-center min-w-[140px]">
                          {ch.chapter_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-xs">
                    {(report.section_chapter_heatmap || []).length === 0 ? (
                      <tr>
                        <td colSpan={chaptersList.length + 1} className="py-10 text-center text-neutral-400">
                          Cross-tabulating section metrics...
                        </td>
                      </tr>
                    ) : (
                      (report.section_chapter_heatmap || []).map((secRow, idx) => (
                        <tr key={secRow.section || idx} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3.5 px-5 font-mono font-bold text-neutral-900">
                            Section {secRow.section}
                          </td>
                          {chaptersList.map(ch => {
                            const val = secRow.chapters?.[ch.chapter_name] ?? 0;
                            const isHigh = val >= 70;
                            const isMed = val >= 40 && val < 70;
                            return (
                              <td key={ch.chapter_name} className="py-3.5 px-5 text-center">
                                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-xl font-mono font-bold text-xs ${
                                  isHigh 
                                    ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30' 
                                    : isMed 
                                    ? 'bg-amber-400/20 text-amber-900 border border-amber-400/40' 
                                    : 'bg-rose-500/15 text-rose-800 border border-rose-500/30'
                                }`}>
                                  {val}%
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: ACCREDITATION (NBA / NAAC Outcome-Based Education OBE Audit) */}
        {/* ========================================================================= */}
        {activeTab === "ACCREDITATION" && (
          <div className="space-y-6">
            <div className="p-8 rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/80 shadow-[0_4px_30px_rgba(0,0,0,0.04)] card-print space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-rose-700 bg-rose-50 border border-rose-200/60 px-2.5 py-0.5 rounded-full">
                      NBA / NAAC Criterion 3 Audit
                    </span>
                    <span className="text-xs text-neutral-400 font-semibold">•</span>
                    <span className="text-xs text-neutral-500 font-semibold">Outcome-Based Education (OBE)</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-neutral-900 tracking-tight mt-1">
                    Course Outcome (CO) Attainment & Remedial Accreditation Dossier
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Formal curriculum audit documentation evaluating CO attainment targets, pedagogical deficiency justifications, and institutional remedial actions.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Accreditation Dossier</span>
                  </button>
                </div>
              </div>

              {/* OBE Course Outcome Matrix Table */}
              <div className="overflow-x-auto rounded-2xl border border-neutral-200/80">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/90 border-b border-neutral-200 text-[11px] font-extrabold text-neutral-600 uppercase tracking-wider">
                      <th className="py-3 px-5 w-20">CO Code</th>
                      <th className="py-3 px-5">Course Outcome Competency Statement</th>
                      <th className="py-3 px-5 text-center">Mapped Chapters</th>
                      <th className="py-3 px-5 text-center">Target</th>
                      <th className="py-3 px-5 text-center">Attained</th>
                      <th className="py-3 px-5 text-center">Accreditation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-xs">
                    {(report.accreditation_summary?.course_outcomes || []).map((co, idx) => {
                      const isSub = co.status === 'SUB_THRESHOLD_REMEDIAL';
                      return (
                        <tr key={co.code || idx} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-4 px-5 font-mono font-extrabold text-neutral-900">
                            {co.code}
                          </td>
                          <td className="py-4 px-5 font-medium text-neutral-800 max-w-md">
                            {co.statement}
                          </td>
                          <td className="py-4 px-5 text-center font-semibold text-neutral-600">
                            {(co.mapped_chapters || []).join(", ")}
                          </td>
                          <td className="py-4 px-5 text-center font-mono font-bold text-neutral-600">
                            {co.target_attainment_pct}%
                          </td>
                          <td className="py-4 px-5 text-center font-mono font-extrabold text-neutral-900">
                            <span className={isSub ? 'text-rose-700' : 'text-emerald-700'}>
                              {co.actual_attainment_pct}%
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold border ${
                              isSub 
                                ? 'bg-rose-500/10 text-rose-800 border-rose-500/20' 
                                : 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isSub ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                              <span>{isSub ? 'Sub-Threshold (Remedial Mandate)' : 'Attainment Satisfied'}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Official Academic Board Verdict */}
              <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Academic Board & Dean Review Finding
                  </h4>
                  <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                    {report.accreditation_summary?.overall_obe_verdict || "Remedial Directives mandated to fulfill Criterion 3 compliance."} Department lead is requested to schedule laboratory workshops on pointer dereferencing and memory leak resolution before next audit review.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: COHORT PERFORMANCE CURVES (Smooth Vector Graphs) */}
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
