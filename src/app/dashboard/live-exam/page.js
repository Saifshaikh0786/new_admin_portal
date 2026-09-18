"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  RotateCcw, 
  Trophy, 
  Filter, 
  Search, 
  Key, 
  RefreshCw, 
  ChevronRight, 
  Zap, 
  Award, 
  Building2, 
  ShieldAlert,
  Sliders,
  Copy,
  UserCheck,
  Sparkles,
  TrendingUp,
  Flame,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function LiveExamCommandCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("time");
  
  // Custom Slot Time Boundaries
  const [slot1Time, setSlot1Time] = useState({ start: "09:00", end: "12:30" });
  const [slot2Time, setSlot2Time] = useState({ start: "12:30", end: "14:50" });

  // Selected Student Inspector
  const [targetReg, setTargetReg] = useState("");

  const fetchLiveExamData = async () => {
    try {
      const res = await fetch("/api/proxy/admin/admin/analytics/live-exam-data");
      const json = await res.json();
      if (json && json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Error fetching live exam data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveExamData();
    const interval = setInterval(fetchLiveExamData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filtered and Sorted Events List
  const processedEvents = useMemo(() => {
    if (!data) return [];
    let events = [];

    // Combine active sessions
    (data.active_sessions || []).forEach(s => {
      events.push({
        id: `act_${s.student_id}_${s.course_code}`,
        type: "active",
        regId: s.uni_reg_id,
        name: s.student_name,
        section: s.section,
        course: s.course_code,
        statusText: "🟢 STARTED / TIMER ACTIVE",
        statusClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10",
        marks: null,
        marksFormatted: "-- / 18",
        time: s.last_active || s.start_time,
        timestamp: s.last_active ? new Date(s.last_active).getTime() : 0
      });
    });

    // Combine resumed sessions
    (data.resumed_sessions || []).forEach(s => {
      events.push({
        id: `res_${s.student_id}_${s.course_code}`,
        type: "resumed",
        regId: s.uni_reg_id,
        name: s.student_name,
        section: s.section,
        course: s.course_code,
        statusText: "⚡ RESUMED STATE",
        statusClass: "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/10",
        marks: null,
        marksFormatted: "-- / 18",
        time: s.last_active,
        timestamp: s.last_active ? new Date(s.last_active).getTime() : 0
      });
    });

    // Combine submissions
    (data.recent_submissions || []).forEach(s => {
      events.push({
        id: `sub_${s.student_id}_${s.course_code}_${s.submitted_at}`,
        type: "submitted",
        regId: s.uni_reg_id,
        name: s.student_name,
        section: s.section,
        course: s.course_code,
        statusText: `🏁 SUBMITTED (${s.result_type || 'graded'})`,
        statusClass: "bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-sky-500/10",
        marks: s.marks_obtained,
        marksFormatted: `${s.marks_obtained} / ${s.total_marks || 18}`,
        time: s.submitted_at,
        timestamp: s.submitted_at ? new Date(s.submitted_at).getTime() : 0
      });
    });

    // Combine retakes
    (data.recent_retakes || []).forEach(s => {
      events.push({
        id: `ret_${s.student_id}_${s.course_code}_${s.updated_at}`,
        type: "retake",
        regId: s.uni_reg_id,
        name: s.student_name,
        section: s.section || 'N/A',
        course: s.course_code,
        statusText: `🔄 RETAKE AUTHORIZED (${s.allowed_attempts} Allowed)`,
        statusClass: "bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-purple-500/10",
        marks: null,
        marksFormatted: "-- / 18",
        time: s.updated_at,
        timestamp: s.updated_at ? new Date(s.updated_at).getTime() : 0
      });
    });

    // Apply Course Filter
    if (selectedCourse !== "all") {
      events = events.filter(e => e.course === selectedCourse);
    }

    // Apply Status Filter
    if (selectedStatus !== "all") {
      events = events.filter(e => e.type === selectedStatus);
    }

    // Apply Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      events = events.filter(e => 
        (e.regId && e.regId.toLowerCase().includes(q)) ||
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.course && e.course.toLowerCase().includes(q))
      );
    }

    // Apply Sorting
    events.sort((a, b) => {
      if (sortBy === "score_desc") return (b.marks ?? -1) - (a.marks ?? -1);
      if (sortBy === "score_asc") return (a.marks ?? 999) - (b.marks ?? 999);
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "reg") return (a.regId || "").localeCompare(b.regId || "");
      return b.timestamp - a.timestamp;
    });

    return events;
  }, [data, selectedCourse, selectedStatus, searchQuery, sortBy]);

  // Execute 1-Tap Action
  const handleExecuteAction = async (actionType, courseCode = null) => {
    if (!targetReg.trim()) {
      toast.error("Please enter or select a Registration ID first!");
      return;
    }

    try {
      const res = await fetch("/api/proxy/admin/admin/analytics/live-exam-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regId: targetReg.trim(),
          actionType,
          courseCode
        })
      });
      const json = await res.json();
      if (json && json.success) {
        toast.success(json.message || "Action executed successfully!");
        fetchLiveExamData();
      } else {
        toast.error(json.message || "Action failed");
      }
    } catch (err) {
      toast.error("Network error executing action");
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const courseStats = data?.course_stats || {
    CSE205: { count: 0, avg_marks: 0, max_marks: 0 },
    CSE202: { count: 0, avg_marks: 0, max_marks: 0 },
    overall: { total_submissions: 0, overall_avg: 0 }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 p-4 md:p-8 space-y-6 font-sans relative overflow-hidden">
      <Toaster position="top-right" />

      {/* Ambient background glow effects */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[350px] bg-gradient-to-br from-indigo-600/15 via-purple-600/10 to-transparent blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[350px] bg-gradient-to-tr from-emerald-600/15 via-sky-600/10 to-transparent blur-[140px] pointer-events-none z-0" />

      {/* HEADER BAR WITH GLASSMORPHISM */}
      <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-400 flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/25 border border-indigo-400/30">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                Live Exam Command Center
              </h1>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[11px] tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE STREAM
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
              <span>CBT 1 Invigilator Dashboard</span>
              <span>•</span>
              <span className="text-slate-300 font-semibold">544 Students Scheduled</span>
              <span>•</span>
              <span>CSE205 & CSE202</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
          <button 
            onClick={fetchLiveExamData}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 font-bold rounded-2xl text-xs transition-all shadow-lg hover:shadow-indigo-500/10 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
            Sync Telemetry
          </button>
          <div className="px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/10">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Invigilator Mode Active
          </div>
        </div>
      </div>

      {/* CUSTOMIZABLE TIME SLOT SELECTOR BAR */}
      <div className="relative z-10 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 overflow-x-auto w-full lg:w-auto">
          <div className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase tracking-wider shrink-0 mr-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Exam Time Slot:
          </div>
          <button
            onClick={() => setSelectedSlot("all")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 ${
              selectedSlot === "all" ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500/40" : "bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            All Scheduled Slots
          </button>
          <button
            onClick={() => setSelectedSlot("slot1")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 ${
              selectedSlot === "slot1" ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500/40" : "bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Slot 1 ({slot1Time.start} – {slot1Time.end})
          </button>
          <button
            onClick={() => setSelectedSlot("slot2")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 ${
              selectedSlot === "slot2" ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500/40" : "bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Slot 2 ({slot2Time.start} – {slot2Time.end})
          </button>
        </div>

        {/* TIME SLOT BOUNDARY EDITOR */}
        <div className="flex items-center gap-3 text-xs bg-slate-950/90 border border-slate-800/80 px-4 py-2.5 rounded-2xl w-full lg:w-auto">
          <Sliders className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-slate-400 font-semibold shrink-0">Custom Boundaries:</span>
          <input 
            type="text" 
            value={slot1Time.start} 
            onChange={e => setSlot1Time(p => ({ ...p, start: e.target.value }))}
            className="w-14 bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1 text-center text-indigo-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
          />
          <span className="text-slate-500 font-mono">to</span>
          <input 
            type="text" 
            value={slot1Time.end} 
            onChange={e => setSlot1Time(p => ({ ...p, end: e.target.value }))}
            className="w-14 bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1 text-center text-indigo-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* TOP EXECUTIVE HERO METRICS & AVERAGE MARKS GRID */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 flex items-center gap-4 hover:border-emerald-500/40 hover:-translate-y-1 transition-all shadow-xl group">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl shrink-0 border border-emerald-500/20 group-hover:scale-110 transition-transform">
            🟢
          </div>
          <div>
            <div className="text-3xl font-black font-mono text-white tracking-tight">
              {data?.counts?.active_sessions_count || 0}
            </div>
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mt-1">
              Active Timers Running
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 flex items-center gap-4 hover:border-amber-500/40 hover:-translate-y-1 transition-all shadow-xl group">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl shrink-0 border border-amber-500/20 group-hover:scale-110 transition-transform">
            ⚡
          </div>
          <div>
            <div className="text-3xl font-black font-mono text-white tracking-tight">
              {data?.counts?.resumed_count || 0}
            </div>
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mt-1">
              Resumed Sessions
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 flex items-center gap-4 hover:border-sky-500/40 hover:-translate-y-1 transition-all shadow-xl group">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center text-2xl shrink-0 border border-sky-500/20 group-hover:scale-110 transition-transform">
            🏁
          </div>
          <div>
            <div className="text-3xl font-black font-mono text-white tracking-tight">
              {data?.counts?.submissions_count || 0}
            </div>
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mt-1">
              Total Submissions
            </div>
          </div>
        </div>

        {/* Metric 4: CSE205 Avg */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 flex items-center gap-4 hover:border-indigo-500/40 hover:-translate-y-1 transition-all shadow-xl group">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-2xl shrink-0 border border-indigo-500/20 group-hover:scale-110 transition-transform">
            📊
          </div>
          <div>
            <div className="text-3xl font-black font-mono text-indigo-400 tracking-tight">
              {courseStats.CSE205.avg_marks} <span className="text-xs text-slate-500 font-sans">/ 18</span>
            </div>
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mt-1">
              CSE205 (DSA) Avg Marks
            </div>
          </div>
        </div>

        {/* Metric 5: CSE202 Avg */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 flex items-center gap-4 hover:border-purple-500/40 hover:-translate-y-1 transition-all shadow-xl group">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-2xl shrink-0 border border-purple-500/20 group-hover:scale-110 transition-transform">
            🏆
          </div>
          <div>
            <div className="text-3xl font-black font-mono text-purple-400 tracking-tight">
              {courseStats.CSE202.avg_marks} <span className="text-xs text-slate-500 font-sans">/ 18</span>
            </div>
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mt-1">
              CSE202 (OOP) Avg Marks
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN DASHBOARD GRID */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT 2 COLUMNS: TELEMETRY STREAM & LEADERBOARDS */}
        <div className="lg:col-span-2 space-y-6">

          {/* PER-COURSE LEADERBOARDS & TOP RANKINGS */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-amber-400" />
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">Live Course Leaderboard & Top Scores</h2>
                  <p className="text-xs text-slate-400">Real-time ranking breakdown per course</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCourse("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    selectedCourse === "all" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" : "bg-slate-950/80 text-slate-400 border border-slate-800"
                  }`}
                >
                  All Courses
                </button>
                <button
                  onClick={() => setSelectedCourse("CSE205")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    selectedCourse === "CSE205" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" : "bg-slate-950/80 text-slate-400 border border-slate-800"
                  }`}
                >
                  CSE205 (DSA)
                </button>
                <button
                  onClick={() => setSelectedCourse("CSE202")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    selectedCourse === "CSE202" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" : "bg-slate-950/80 text-slate-400 border border-slate-800"
                  }`}
                >
                  CSE202 (OOP)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* CSE205 Top Rankers */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-inner">
                <div className="flex justify-between items-center text-xs font-black text-indigo-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    CSE205 (DSA) Top Rankers
                  </span>
                  <span className="bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20 text-indigo-300 font-mono">
                    Highest: {courseStats.CSE205.max_marks} / 18
                  </span>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                  {(data?.rankings?.CSE205 || []).length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-6">No submissions yet</div>
                  ) : (
                    (data?.rankings?.CSE205 || []).map((rank, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setTargetReg(rank.uni_reg_id)}
                        className="flex justify-between items-center text-xs bg-slate-900/90 hover:bg-slate-800/90 px-3.5 py-2.5 rounded-xl border border-slate-800 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`font-mono font-black w-5 text-center ${idx === 0 ? 'text-amber-400 text-sm' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-white">{rank.student_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">({rank.uni_reg_id})</div>
                          </div>
                        </div>
                        <span className="font-mono font-black text-emerald-400 text-sm">{rank.marks_obtained} pts</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* CSE202 Top Rankers */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-inner">
                <div className="flex justify-between items-center text-xs font-black text-purple-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    CSE202 (OOP) Top Rankers
                  </span>
                  <span className="bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20 text-purple-300 font-mono">
                    Highest: {courseStats.CSE202.max_marks} / 18
                  </span>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                  {(data?.rankings?.CSE202 || []).length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-6">No submissions yet</div>
                  ) : (
                    (data?.rankings?.CSE202 || []).map((rank, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setTargetReg(rank.uni_reg_id)}
                        className="flex justify-between items-center text-xs bg-slate-900/90 hover:bg-slate-800/90 px-3.5 py-2.5 rounded-xl border border-slate-800 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`font-mono font-black w-5 text-center ${idx === 0 ? 'text-amber-400 text-sm' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-white">{rank.student_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">({rank.uni_reg_id})</div>
                          </div>
                        </div>
                        <span className="font-mono font-black text-emerald-400 text-sm">{rank.marks_obtained} pts</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* LIVE TELEMETRY TABLE WITH PER-COLUMN FILTERING & SORTING */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2.5 tracking-tight">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Live Exam Telemetry Feed
                </h2>
                <p className="text-xs text-slate-400">Real-time student state transitions, timer events & submissions</p>
              </div>

              {/* SEARCH & SORT TOOLBAR */}
              <div className="flex flex-wrap gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Reg ID, Name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 shadow-inner"
                  />
                </div>

                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2 text-xs text-slate-300 font-bold focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">🟢 Active Timer</option>
                  <option value="resumed">⚡ Resumed</option>
                  <option value="submitted">🏁 Submitted</option>
                  <option value="retake">🔄 Retakes</option>
                </select>

                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2 text-xs text-slate-300 font-bold focus:outline-none"
                >
                  <option value="time">Sort by Time (Latest)</option>
                  <option value="score_desc">Sort by Marks (High to Low)</option>
                  <option value="score_asc">Sort by Marks (Low to High)</option>
                  <option value="name">Sort by Name</option>
                  <option value="reg">Sort by Reg ID</option>
                </select>
              </div>
            </div>

            {/* FEED TABLE */}
            <div className="overflow-x-auto border border-slate-800/80 rounded-2xl max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-black uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-800 z-10">
                  <tr>
                    <th className="p-4">Student & Reg ID</th>
                    <th className="p-4">Course</th>
                    <th className="p-4">Exam Status</th>
                    <th className="p-4">Marks</th>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {processedEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-500">
                        No matching exam events found
                      </td>
                    </tr>
                  ) : (
                    processedEvents.map(evt => (
                      <tr 
                        key={evt.id}
                        onClick={() => setTargetReg(evt.regId)}
                        className="hover:bg-indigo-600/10 cursor-pointer transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-extrabold text-white text-sm">{evt.name}</div>
                          <div className="font-mono text-[11px] text-sky-400 mt-0.5">{evt.regId} • Section {evt.section}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono font-bold text-[11px]">
                            {evt.course}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1.5 rounded-full border text-[11px] font-extrabold shadow-sm ${evt.statusClass}`}>
                            {evt.statusText}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-extrabold text-slate-200 text-sm">
                          {evt.marksFormatted}
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-400">
                          {evt.time ? new Date(evt.time).toLocaleTimeString() : "--:--"}
                        </td>
                        <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => { setTargetReg(evt.regId); handleExecuteAction("increase", "CSE205"); }}
                              className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-300 hover:text-white rounded-xl text-[11px] font-bold transition-all shadow-md active:scale-95"
                            >
                              +1 CSE205
                            </button>
                            <button
                              onClick={() => { setTargetReg(evt.regId); handleExecuteAction("increase", "CSE202"); }}
                              className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-xl text-[11px] font-bold transition-all shadow-md active:scale-95"
                            >
                              +1 CSE202
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: INVIGILATOR ACTION BOX & STUDENT SEARCH */}
        <div className="space-y-6">

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 space-y-5 shadow-2xl sticky top-6">
            <div className="border-b border-slate-800/80 pb-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2.5 tracking-tight">
                <Zap className="w-5 h-5 text-amber-400" />
                Invigilator Quick Control Box
              </h2>
              <p className="text-xs text-slate-400">Select student to view details & issue 1-tap retakes</p>
            </div>

            {/* SEARCH INPUT */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Registration ID:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Reg ID (e.g. 12215329)"
                  value={targetReg}
                  onChange={e => setTargetReg(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500 shadow-inner"
                />
              </div>
            </div>

            {/* 3 BIG 1-TAP ACTION BUTTONS */}
            <div className="space-y-3.5 pt-2">
              <button
                onClick={() => handleExecuteAction("increase", "CSE205")}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs rounded-2xl shadow-xl shadow-indigo-600/30 border border-indigo-500/40 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Zap className="w-4 h-4 text-indigo-300" />
                ⚡ +1 Attempt: CSE205 (DSA)
              </button>

              <button
                onClick={() => handleExecuteAction("increase", "CSE202")}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs rounded-2xl shadow-xl shadow-emerald-600/30 border border-emerald-500/40 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Zap className="w-4 h-4 text-emerald-300" />
                ⚡ +1 Attempt: CSE202 (OOP)
              </button>

              <button
                onClick={() => handleExecuteAction("reset_password")}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black text-xs rounded-2xl shadow-xl shadow-amber-600/30 border border-amber-500/40 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Key className="w-4 h-4 text-amber-300" />
                🔑 Reset Password to Reg ID
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
