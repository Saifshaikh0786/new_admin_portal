"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { API_CONFIG } from "@/utils/api";
import { getAdminToken } from "@/utils/cookies";
import { Loader2, Download, Search, AlertCircle, ShieldAlert, MonitorOff, Focus, Clock, Key, Shield, ChevronRight } from "lucide-react";
import { CircularProgress } from "@/components/CircularProgress";

function ExamResultsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { batches, loading: dashboardLoading } = useDashboard();
    
    // Derived state for dropdowns
    const [courses, setCourses] = useState([]);
    const [sections, setSections] = useState([]);
    const [units, setUnits] = useState([]);
    const [lectures, setLectures] = useState([]);
    
    const [selectedBatch, setSelectedBatch] = useState(searchParams.get("batchId") || "");
    const [selectedSection, setSelectedSection] = useState("All");
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedUnit, setSelectedUnit] = useState("");
    const [selectedLecture, setSelectedLecture] = useState("");

    const [studentsData, setStudentsData] = useState([]);
    const [examConfig, setExamConfig] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Populate Dropdowns from Cached Batches
    useEffect(() => {
        if (batches.length > 0) {
            // Find selected batch or default to the first one
            const batch = batches.find(b => b.batch_id === selectedBatch) || batches[0];
            if (batch) {
                if (selectedBatch !== batch.batch_id) {
                    setSelectedBatch(batch.batch_id);
                    setSelectedSection("All");
                }
                
                setSections([...(batch.sections || []), "All"]);
            }
        }
    }, [batches, selectedBatch]);
                
    // Fetch Course Metadata when Batch changes
    useEffect(() => {
        if (selectedBatch) {
            fetchCoursesForBatch(selectedBatch);
        }
    }, [selectedBatch]);

    const fetchCoursesForBatch = async (batchId) => {
        try {
            const token = getAdminToken();
            const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            const cRes = await fetch(`${API_CONFIG.baseUrl.admin}/coursesmetadata/batch/${batchId}`, {
                method: "GET",
                headers,
                credentials: "include"
            });
            const cData = await cRes.json();
            if (cData.success) {
                const list = Array.isArray(cData.data) ? cData.data : cData.data.courses || [];
                // Filter ONLY exam courses!
                const examCourses = list.filter(c => c.course_type === 'exam');
                setCourses(examCourses);
                if (examCourses.length > 0 && !examCourses.find(c => c.course_id === selectedCourse)) {
                    setSelectedCourse(examCourses[0].course_id);
                }
            }
        } catch (e) {
            console.error("Failed to load courses", e);
        }
    };

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
            const res = await fetch(`${API_CONFIG.baseUrl.admin}/courses/${courseId}`, {
                method: "GET",
                headers, 
                credentials: "include"
            });
            const data = await res.json();
            if (data.success && data.data && data.data.units) {
                const fetchedUnits = data.data.units;
                setUnits(fetchedUnits);
                
                if (fetchedUnits.length > 0) {
                    setSelectedUnit(fetchedUnits[0].unit_id);
                } else {
                    setSelectedUnit("");
                }
            }
        } catch (e) {
            console.error("Failed to load course structure", e);
        }
    };

    // When Unit changes, update lectures
    useEffect(() => {
        if (selectedUnit && units.length > 0) {
            const unit = units.find(u => u.unit_id === selectedUnit);
            if (unit && unit.sub_units) {
                const unitLectures = unit.sub_units.filter(su => su.type === 'lecture' || su.type === 'exam' || su.sub_type === 'exam');
                setLectures(unitLectures);
                if (unitLectures.length > 0) {
                    setSelectedLecture(unitLectures[0].lecture_id || unitLectures[0].id);
                } else {
                    setSelectedLecture("");
                }
            } else {
                setLectures([]);
                setSelectedLecture("");
            }
        }
    }, [selectedUnit, units]);

    // Fetch Exam Config immediately when Lecture changes
    useEffect(() => {
        const fetchConfig = async () => {
            if (!selectedLecture) {
                setExamConfig(null);
                return;
            }
            try {
                const token = getAdminToken();
                const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
                const configRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.analytics.lectureExamConfig}?lecture_id=${selectedLecture}`, {
                    headers, credentials: "include"
                });
                const configData = await configRes.json();
                console.log("=== RAW EXAM CONFIG RESPONSE ===", JSON.stringify(configData, null, 2));
                if (configData.success) {
                    console.log("=== CONFIG DATA ===", JSON.stringify(configData.data, null, 2));
                    console.log("=== CONFIG.CONFIG ===", JSON.stringify(configData.data?.config, null, 2));
                    setExamConfig(configData.data);
                }
            } catch (e) {
                console.error("Failed to fetch exam config", e);
            }
        };
        fetchConfig();
    }, [selectedLecture]);

    // Fetch Table Data when Fetch Button is clicked
    const fetchExamData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAdminToken();
            const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            
            // 1. Fetch Students Scores
            const scoresRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.analytics.sectionStudents}`, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({
                    batch_id: selectedBatch,
                    section: selectedSection === "All" ? null : selectedSection,
                    course_id: selectedCourse
                })
            });
            const scoresData = await scoresRes.json();
            
            // 2. Fetch Proctoring Summary
            const proctorRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.analytics.proctoringSummary}`, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({
                    batch_id: selectedBatch,
                    section: selectedSection === "All" ? null : selectedSection,
                    course_id: selectedCourse,
                    lecture_id: selectedLecture
                })
            });
            const proctorData = await proctorRes.json();

            if (scoresData.success && proctorData.success) {
                // Filter scores for selected lecture
                const lectureScores = (scoresData.data || []).filter(s => s.lecture_id === selectedLecture);

                // Merge
                const merged = lectureScores.map(score => {
                    const proc = (proctorData.data || []).find(p => p.student_id === score.student_id) || {};
                    return {
                        ...score,
                        focus_lost_count: proc.focus_lost_count || 0,
                        tab_switches_count: proc.tab_switch_count || 0,
                        disconnects_count: proc.disconnect_count || 0,
                        compile_count: proc.compile_count || 0,
                        submit_count: proc.submit_count || 0,
                        mcq_marks: score.result_type === 'mcq' ? score.marks_obtained : 0,
                        coding_marks: score.result_type === 'coding' ? score.marks_obtained : 0
                    };
                });
                
                // Group by student since mcq and coding might be separate rows
                const studentMap = {};
                merged.forEach(row => {
                    if (!studentMap[row.student_id]) {
                        studentMap[row.student_id] = { ...row };
                    } else {
                        studentMap[row.student_id].mcq_marks += row.mcq_marks;
                        studentMap[row.student_id].coding_marks += row.coding_marks;
                        studentMap[row.student_id].marks_obtained += row.marks_obtained;
                    }
                });

                const finalData = Object.values(studentMap);
                setStudentsData(finalData);

                const uniqueSections = [...new Set(finalData.map(s => s.section))].filter(Boolean);
                if (sections.length === 0) setSections([...uniqueSections, "All"]);
            } else {
                setError(data.message || "Failed to fetch exam data");
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

    // Helper to format ms to mins
    const formatMinutes = (val) => {
        if (!val) return 0;
        const num = parseInt(val, 10);
        if (isNaN(num)) return 0;
        if (num > 1000) return Math.round(num / 60000);
        return num;
    };

    return (
        <div className="space-y-4 animate-fadeIn pb-20">
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
            <div className="glass-panel p-4 flex flex-nowrap items-center gap-4 border border-gray-200 dark:border-slate-800 overflow-x-auto custom-scrollbar">
                <div className="flex-shrink-0 w-40">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Batch</label>
                    <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 truncate">
                        <option value="">Select...</option>
                        {batches.map(b => <option key={b.batch_id} value={b.batch_id}>{b.batch_name}</option>)}
                    </select>
                </div>

                <div className="flex-shrink-0 w-28">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Section</label>
                    <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 truncate">
                        {sections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Exam Course</label>
                    <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} disabled={!selectedBatch} className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-gray-900 dark:text-white disabled:opacity-50 focus:ring-2 focus:ring-blue-500 truncate">
                        {courses.length === 0 ? <option value="">No exam courses</option> : courses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}
                    </select>
                </div>
                
                {/* Unit dropdown */}
                <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Unit</label>
                    <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} disabled={!selectedCourse} className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-gray-900 dark:text-white disabled:opacity-50 focus:ring-2 focus:ring-blue-500 truncate">
                        {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_name || u.name}</option>)}
                    </select>
                </div>
                
                {/* Lecture/Exam dropdown */}
                <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Specific Lecture</label>
                    <select value={selectedLecture} onChange={(e) => setSelectedLecture(e.target.value)} disabled={!selectedUnit} className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-gray-900 dark:text-white disabled:opacity-50 focus:ring-2 focus:ring-blue-500 truncate">
                        {lectures.map(l => <option key={l.lecture_id || l.id} value={l.lecture_id || l.id}>{l.lecture_name || l.name}</option>)}
                    </select>
                </div>
                
                {/* Fetch Button */}
                <div className="flex-none flex-shrink-0 ml-auto self-end">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Fetch</label>
                    <button 
                        onClick={fetchExamData}
                        disabled={!selectedBatch || !selectedCourse || !selectedLecture || loading}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px]"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Fetch Data
                    </button>
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
                    {/* Exam Config Card - Full Width Strip */}
                    <div className="card p-5 bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none relative overflow-hidden w-full">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 p-4 opacity-10"><Shield className="w-32 h-32" /></div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
                            <h3 className="font-bold text-lg flex items-center gap-2 whitespace-nowrap"><Key className="w-5 h-5 text-amber-400"/> Exam Rules</h3>
                            <div className="flex flex-wrap items-center w-full md:w-auto">
                                <div className="flex items-center gap-2 whitespace-nowrap mr-6 mb-2 mt-2">
                                    <span className="text-slate-400 text-sm">MCQ Time:</span>
                                    <span className="font-semibold flex items-center gap-1"><Clock className="w-4 h-4 text-blue-400"/> {formatMinutes(examConfig?.config?.['mcq-duration-ms'] || examConfig?.config?.['mcq-duration-min'] || examConfig?.config?.['time-for-mcq'])} mins</span>
                                </div>
                                <div className="flex items-center gap-2 whitespace-nowrap mr-6 mb-2 mt-2">
                                    <span className="text-slate-400 text-sm">Coding Time:</span>
                                    <span className="font-semibold flex items-center gap-1"><Clock className="w-4 h-4 text-blue-400"/> {formatMinutes(examConfig?.config?.['coding-duration-ms'] || examConfig?.config?.['coding-duration-min'] || examConfig?.config?.['time-for-coding'])} mins</span>
                                </div>
                                <div className="flex items-center gap-2 whitespace-nowrap mr-6 mb-2 mt-2">
                                    <span className="text-slate-400 text-sm">Pass Marks:</span>
                                    <span className="font-semibold text-lg">{examConfig?.config?.passing_percentage || examConfig?.config?.['passing-percentage'] || 50}%</span>
                                </div>
                                <div className="flex items-center gap-2 md:ml-auto whitespace-nowrap mb-2 mt-2">
                                    <span className="text-slate-400 text-sm">Proctoring:</span>
                                    <span className="font-semibold text-emerald-400 bg-emerald-900/30 px-3 py-1 rounded-full text-sm">Strict Mode</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Stats Grid */}
                    {metrics && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                        </div>
                    )}

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
                                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-slate-800/50">
                                        <th className="p-4">Name</th>
                                        <th className="p-4">Reg No</th>
                                        <th className="p-4 text-center">MCQ Score</th>
                                        <th className="p-4 text-center">Coding Score</th>
                                        <th className="p-4 text-center">Total Marks</th>
                                        <th className="p-4 text-center">Reason of Submit</th>
                                        <th className="p-4 text-center">Allowed Attempts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentsData.map(student => {
                                        const totalScore = student.total_marks || (Number(student.mcq_marks || 0) + Number(student.coding_marks || 0));
                                        const allowedAttempts = Number(student.extra_attempts || 0) + 1;
                                        
                                        return (
                                            <tr 
                                                key={student.student_id} 
                                                onClick={() => handleRowClick(student.student_id)}
                                                className="border-b border-gray-100 dark:border-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-800/50 cursor-pointer group"
                                            >
                                                <td className="p-4 font-semibold text-gray-900 dark:text-white">
                                                    {student.student_name}
                                                </td>
                                                <td className="p-4 text-sm text-gray-500 font-mono">
                                                    {student.reg_id}
                                                </td>
                                                <td className="p-4 text-center font-medium">
                                                    {student.mcq_marks || 0}
                                                </td>
                                                <td className="p-4 text-center font-medium">
                                                    {student.coding_marks || 0}
                                                </td>
                                                <td className="p-4 text-center font-bold text-gray-900 dark:text-white">
                                                    {totalScore.toFixed(1)}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-xs text-gray-500 uppercase font-medium">{student.submit_reason || student.submission_reason || "Auto Submitted"}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="badge bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
                                                        {allowedAttempts}
                                                    </span>
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

export default function ExamResultsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
            <ExamResultsContent />
        </Suspense>
    );
}
