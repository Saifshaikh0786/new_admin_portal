"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { API_CONFIG } from "@/utils/api";
import { getAdminToken } from "@/utils/cookies";
import { Loader2, Download, Search, AlertCircle, ShieldAlert, MonitorOff, Focus, Clock, Key, Shield, ChevronRight } from "lucide-react";
import { CircularProgress } from "@/components/CircularProgress";

export default function ExamResultsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [sections, setSections] = useState([]);
    const [lectures, setLectures] = useState([]);
    
    const [selectedBatch, setSelectedBatch] = useState(searchParams.get("batchId") || "");
    const [selectedSection, setSelectedSection] = useState("All");
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedLecture, setSelectedLecture] = useState("");

    const [studentsData, setStudentsData] = useState([]);
    const [examConfig, setExamConfig] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Initial Fetch for Filters
    useEffect(() => {
        if (!authLoading && user) {
            fetchFilters();
        }
    }, [authLoading, user]);

    const fetchFilters = async () => {
        try {
            const token = getAdminToken();
            const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

            const bRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.myBatches}`, { method: "POST", headers, credentials: "include" });
            const bData = await bRes.json();
            if (bData.success) {
                setBatches(bData.data);
                if (selectedBatch) {
                    fetchCoursesForBatch(selectedBatch, headers);
                }
            }
        } catch (e) {
            console.error("Failed to load filters", e);
        }
    };

    const fetchCoursesForBatch = async (batchId, headers) => {
        try {
            const cRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getExamCoursesByBatch}`, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({ batch_id: batchId })
            });
            const cData = await cRes.json();
            if (cData.success) {
                const list = Array.isArray(cData.data) ? cData.data : cData.data.courses || [];
                setCourses(list);
                if (list.length > 0 && !selectedCourse) {
                    setSelectedCourse(list[0].course_id);
                }
            }
        } catch (e) {
            console.error("Failed to load exam courses", e);
        }
    };

    // When Batch Changes
    useEffect(() => {
        if (selectedBatch) {
            const token = getAdminToken();
            const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            fetchCoursesForBatch(selectedBatch, headers);
        }
    }, [selectedBatch]);

    // When Course Changes, fetch lectures/structure
    useEffect(() => {
        if (selectedCourse) {
            fetchLecturesForCourse(selectedCourse);
        }
    }, [selectedCourse]);

    const fetchLecturesForCourse = async (courseId) => {
        try {
            const token = getAdminToken();
            const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.courseStructure(courseId)}`, {
                headers, credentials: "include"
            });
            const data = await res.json();
            if (data.success && data.data) {
                // Flatten units to get all lectures
                const allLectures = [];
                data.data.forEach(unit => {
                    unit.sub_units?.forEach(su => {
                        if (su.type === 'lecture' || su.type === 'exam') allLectures.push(su);
                    });
                });
                setLectures(allLectures);
                if (allLectures.length > 0) setSelectedLecture(allLectures[0].lecture_id || allLectures[0].id);
            }
        } catch (e) {
            console.error("Failed to load lectures", e);
        }
    };

    // Fetch Table Data & Config when Lecture changes
    useEffect(() => {
        if (selectedBatch && selectedCourse && selectedLecture) {
            fetchExamData();
        }
    }, [selectedBatch, selectedCourse, selectedSection, selectedLecture]);

    const fetchExamData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAdminToken();
            const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            
            // 1. Fetch Students & Proctoring data
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.analytics.proctoringSummary}`, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({
                    batchId: selectedBatch,
                    section: selectedSection === "All" ? null : selectedSection,
                    courseId: selectedCourse,
                    lectureId: selectedLecture
                })
            });
            
            const data = await res.json();
            if (data.success) {
                setStudentsData(data.data);
                const uniqueSections = [...new Set(data.data.map(s => s.section))].filter(Boolean);
                if (sections.length === 0) setSections(["All", ...uniqueSections]);
            } else {
                setError(data.message || "Failed to fetch exam data");
            }

            // 2. Fetch Exam Config
            const configRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.analytics.lectureExamConfig}?lecture_id=${selectedLecture}`, {
                headers, credentials: "include"
            });
            const configData = await configRes.json();
            if (configData.success) {
                setExamConfig(configData.data);
            }

        } catch (e) {
            setError("Network Error");
        } finally {
            setLoading(false);
        }
    };

    // Calculate Summary Metrics
    const metrics = useMemo(() => {
        if (!studentsData.length) return null;
        
        let avgFocusLost = 0, avgTabSwitches = 0, avgDisconnects = 0, passCount = 0;
        
        studentsData.forEach(s => {
            avgFocusLost += parseInt(s.focus_lost_count || 0);
            avgTabSwitches += parseInt(s.tab_switches_count || 0);
            avgDisconnects += parseInt(s.disconnects_count || 0);
            // Assume passing is >= 50% average
            const avgScore = ((s.mcq_marks || 0) + (s.coding_marks || 0)) / 2;
            if (avgScore >= 50) passCount++;
        });

        const len = studentsData.length;
        return {
            passRate: Math.round((passCount / len) * 100),
            focusLost: (avgFocusLost / len).toFixed(1),
            tabSwitches: (avgTabSwitches / len).toFixed(1),
            disconnects: (avgDisconnects / len).toFixed(1)
        };
    }, [studentsData]);

    const handleRowClick = (studentId) => {
        router.push(`/dashboard/report?student_id=${studentId}&course_id=${selectedCourse}`);
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Exam & Proctoring Results</h1>
                    <p className="text-gray-500 dark:text-gray-400">Deep behavioral analytics and secure exam proctoring logs.</p>
                </div>
                
                <div className="flex gap-2">
                    <button className="btn-secondary flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-panel p-4 flex flex-wrap items-center gap-4 border border-gray-200 dark:border-slate-800">
                <div className="w-48">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Batch</label>
                    <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                        <option value="">Select...</option>
                        {batches.map(b => <option key={b.batch_id} value={b.batch_id}>{b.batch_name}</option>)}
                    </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Exam Course</label>
                    <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} disabled={!selectedBatch} className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white disabled:opacity-50 focus:ring-2 focus:ring-blue-500">
                        {courses.length === 0 ? <option value="">No exam courses</option> : courses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}
                    </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Specific Lecture/Exam</label>
                    <select value={selectedLecture} onChange={(e) => setSelectedLecture(e.target.value)} disabled={!selectedCourse} className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white disabled:opacity-50 focus:ring-2 focus:ring-blue-500">
                        {lectures.length === 0 ? <option value="">No lectures</option> : lectures.map(l => <option key={l.lecture_id || l.id} value={l.lecture_id || l.id}>{l.name}</option>)}
                    </select>
                </div>

                <div className="w-32">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Section</label>
                    <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
                        {sections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center py-20">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Analyzing proctoring logs...</p>
                </div>
            ) : error ? (
                <div className="glass-panel p-8 text-center text-red-500 border-red-200">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-semibold">{error}</p>
                </div>
            ) : !selectedLecture ? (
                <div className="glass-panel p-12 text-center text-gray-500 border-dashed">
                    <p className="font-medium">Please select an Exam/Lecture to view results.</p>
                </div>
            ) : (
                <>
                    {/* Top Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Exam Config Card */}
                        <div className="card p-5 bg-gradient-to-br from-slate-800 to-slate-900 text-white md:col-span-1 border-none relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Shield className="w-24 h-24" /></div>
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-amber-400"/> Exam Rules</h3>
                            <div className="space-y-3 relative z-10">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Duration:</span>
                                    <span className="font-semibold flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400"/> {examConfig?.duration || 0} mins</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Pass Marks:</span>
                                    <span className="font-semibold">{examConfig?.passing_percentage || 50}%</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Proctoring:</span>
                                    <span className="font-semibold text-emerald-400">Strict Mode</span>
                                </div>
                            </div>
                        </div>

                        {/* Metrics */}
                        {metrics && (
                            <>
                                <div className="card p-5 border-l-4 border-l-emerald-500 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase">Class Pass Rate</p>
                                        <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">{metrics.passRate}%</p>
                                    </div>
                                    <CircularProgress percentage={metrics.passRate} size={70} strokeWidth={6} color="emerald" />
                                </div>
                                <div className="card p-5 border-l-4 border-l-amber-500">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Avg Tab Switches</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600"><MonitorOff className="w-6 h-6" /></div>
                                        <p className="text-3xl font-black text-gray-900 dark:text-white">{metrics.tabSwitches}</p>
                                    </div>
                                </div>
                                <div className="card p-5 border-l-4 border-l-red-500">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Avg Focus Lost</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600"><Focus className="w-6 h-6" /></div>
                                        <p className="text-3xl font-black text-gray-900 dark:text-white">{metrics.focusLost}</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Table */}
                    <div className="card overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 dark:text-white">Proctoring & Result Logs</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" placeholder="Search Reg ID..." className="pl-9 pr-4 py-1.5 text-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-full focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-700">
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Student</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Score</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center whitespace-nowrap">Allowed Attempts</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center whitespace-nowrap">Tab Switch</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center whitespace-nowrap">Focus Lost</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center whitespace-nowrap">Network Drop</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center whitespace-nowrap">Behavior</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {studentsData.map((student, i) => {
                                        const totalScore = ((student.mcq_marks || 0) + (student.coding_marks || 0)) / 2;
                                        const isSuspicious = parseInt(student.tab_switches_count) > 5 || parseInt(student.focus_lost_count) > 10;
                                        const allowedAttempts = student.allowed_attempts || 1; // From joining student_exam_attempts_v2

                                        return (
                                            <tr 
                                                key={student.student_id || i} 
                                                onClick={() => handleRowClick(student.student_id)}
                                                className="border-b border-gray-100 dark:border-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-800/50 cursor-pointer group"
                                            >
                                                <td className="p-4">
                                                    <div className="font-semibold text-gray-900 dark:text-white">{student.student_name}</div>
                                                    <div className="text-xs text-gray-500 font-mono mt-0.5">{student.reg_id}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-900 dark:text-white">{totalScore.toFixed(1)}%</div>
                                                    <div className="text-[10px] text-gray-500 mt-0.5">MCQ: {student.mcq_marks} | Code: {student.coding_marks}</div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="badge bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
                                                        {allowedAttempts}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`font-mono font-medium ${parseInt(student.tab_switches_count) > 3 ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                                                        {student.tab_switches_count || 0}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`font-mono font-medium ${parseInt(student.focus_lost_count) > 5 ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                                                        {student.focus_lost_count || 0}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="font-mono text-gray-600 dark:text-gray-400">{student.disconnects_count || 0}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {isSuspicious ? (
                                                        <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                                                            <ShieldAlert className="w-3 h-3 mr-1 inline" /> Suspicious
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                            Clean
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {studentsData.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-gray-500">No exam data found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
