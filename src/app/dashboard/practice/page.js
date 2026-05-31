"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { API_CONFIG } from "@/utils/api";
import { getAdminToken } from "@/utils/cookies";
import { Loader2, Download, Search, ChevronRight, AlertCircle, FileText, CheckCircle2, Clock } from "lucide-react";
import { CircularProgress } from "@/components/CircularProgress";

function PracticeTrackingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [sections, setSections] = useState([]);
    
    const [selectedBatch, setSelectedBatch] = useState(searchParams.get("batchId") || "");
    const [selectedSection, setSelectedSection] = useState("All");
    const [selectedCourse, setSelectedCourse] = useState("");

    const [studentsData, setStudentsData] = useState([]);
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

            // Fetch Batches from Overview API
            const bRes = await fetch(`${API_CONFIG.baseUrl.admin}/admin/dashboard/overview`, { method: "GET", headers, credentials: "include" });
            const bData = await bRes.json();
            if (bData.success && bData.data) {
                setBatches(bData.data.batches || []);
                
                // If a batch is pre-selected, fetch its courses
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
            const cRes = await fetch(`${API_CONFIG.baseUrl.admin}/coursesmetadata/batch/${batchId}`, {
                method: "GET",
                headers,
                credentials: "include"
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
            console.error("Failed to load courses", e);
        }
    };

    // Handle Filter Changes
    useEffect(() => {
        if (selectedBatch) {
            const token = getAdminToken();
            const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            fetchCoursesForBatch(selectedBatch, headers);
        }
    }, [selectedBatch]);

    // Fetch Table Data when Course changes
    useEffect(() => {
        if (selectedBatch && selectedCourse) {
            fetchTableData();
        }
    }, [selectedBatch, selectedCourse, selectedSection]);

    const fetchTableData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAdminToken();
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.analytics.courseStudents}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                credentials: "include",
                body: JSON.stringify({
                    batchId: selectedBatch,
                    section: selectedSection === "All" ? null : selectedSection,
                    courseId: selectedCourse
                })
            });
            
            const data = await res.json();
            if (data.success) {
                setStudentsData(data.data);
                
                // Extract unique sections
                const uniqueSections = [...new Set(data.data.map(s => s.section))].filter(Boolean);
                if (sections.length === 0) setSections(["All", ...uniqueSections]);
            } else {
                setError(data.message || "Failed to fetch data");
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
        
        const completed = studentsData.filter(s => s.course_status === 'completed').length;
        const inProgress = studentsData.filter(s => s.course_status === 'in_progress').length;
        const notStarted = studentsData.filter(s => s.course_status === 'not_started').length;
        
        const avgScore = Math.round(
            studentsData.reduce((acc, curr) => acc + (curr.overall_course_percent || 0), 0) / studentsData.length
        );

        return { completed, inProgress, notStarted, avgScore, total: studentsData.length };
    }, [studentsData]);

    const handleRowClick = (studentId) => {
        router.push(`/dashboard/report?student_id=${studentId}&course_id=${selectedCourse}`);
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Tracking</h1>
                    <p className="text-gray-500 dark:text-gray-400">Monitor student progress and scores across practice modules.</p>
                </div>
                
                <div className="flex gap-2">
                    <button className="btn-secondary flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Export CSV
                    </button>
                    <button className="btn-primary flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export PDF
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-panel p-4 flex flex-wrap items-center gap-4 border border-gray-200 dark:border-slate-800">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Select Batch</label>
                    <select 
                        value={selectedBatch} 
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                        <option value="">Select a batch...</option>
                        {batches.map(b => (
                            <option key={b.batch_id} value={b.batch_id}>{b.batch_name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Select Course</label>
                    <select 
                        value={selectedCourse} 
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        disabled={!selectedBatch || courses.length === 0}
                        className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 text-gray-900 dark:text-white disabled:opacity-50 focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                        {courses.length === 0 ? (
                            <option value="">No courses available</option>
                        ) : (
                            courses.map(c => (
                                <option key={c.course_id} value={c.course_id}>{c.course_name}</option>
                            ))
                        )}
                    </select>
                </div>

                <div className="w-48">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Section</label>
                    <select 
                        value={selectedSection} 
                        onChange={(e) => setSelectedSection(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                        {sections.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center py-20">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Fetching analytics data...</p>
                </div>
            ) : error ? (
                <div className="glass-panel p-8 text-center text-red-500 border-red-200">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-semibold">{error}</p>
                </div>
            ) : !selectedCourse ? (
                <div className="glass-panel p-12 text-center text-gray-500 border-dashed">
                    <p className="font-medium">Please select a Batch and Course to view analytics.</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    {metrics && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="card p-5 border-l-4 border-l-blue-500 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase">Avg Score</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{metrics.avgScore}%</p>
                                </div>
                                <CircularProgress percentage={metrics.avgScore} size={60} strokeWidth={6} color="blue" />
                            </div>
                            <div className="card p-5 border-l-4 border-l-emerald-500">
                                <p className="text-xs font-bold text-gray-500 uppercase">Completed</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{metrics.completed} <span className="text-sm font-normal text-gray-400">/ {metrics.total}</span></p>
                            </div>
                            <div className="card p-5 border-l-4 border-l-amber-500">
                                <p className="text-xs font-bold text-gray-500 uppercase">In Progress</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{metrics.inProgress}</p>
                            </div>
                            <div className="card p-5 border-l-4 border-l-red-500">
                                <p className="text-xs font-bold text-gray-500 uppercase">Not Started</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{metrics.notStarted}</p>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="card overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 dark:text-white">Student Roster</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search student..." 
                                    className="pl-9 pr-4 py-1.5 text-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-full focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-700">
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Student Info</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Section</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase">MCQ Score</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Coding Score</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Overall Progress</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentsData.map((student, i) => (
                                        <tr 
                                            key={student.student_id || i} 
                                            onClick={() => handleRowClick(student.student_id || student.reg_id)}
                                            className="border-b border-gray-100 dark:border-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                                        >
                                            <td className="p-4">
                                                <div className="font-semibold text-gray-900 dark:text-white">{student.student_name}</div>
                                                <div className="text-xs text-gray-500 font-mono mt-0.5">{student.reg_id}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="badge bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">{student.section}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                                                        <div className="h-full bg-violet-500" style={{ width: `${student.mcq_score_percent || 0}%` }} />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{student.mcq_score_percent || 0}%</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${student.coding_score_percent || 0}%` }} />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{student.coding_score_percent || 0}%</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {student.course_status === 'completed' ? (
                                                    <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"><CheckCircle2 className="w-3 h-3 mr-1 inline" /> Completed</span>
                                                ) : student.course_status === 'in_progress' ? (
                                                    <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><Clock className="w-3 h-3 mr-1 inline" /> In Progress</span>
                                                ) : (
                                                    <span className="badge bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400 border border-gray-200 dark:border-slate-700">Not Started</span>
                                                )}
                                                
                                                {/* Resume Info if applicable */}
                                                {(student.subunit_coding_status === 'resumed' || student.subunit_mcq_status === 'resumed') && (
                                                    <div className="mt-2 text-[10px] text-blue-500 flex items-center gap-1 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded w-fit">
                                                        Active in lecture right now
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button className="p-2 text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 rounded-lg transition-colors">
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {studentsData.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-500">No students found for this course.</td>
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

export default function PracticeTrackingPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
            <PracticeTrackingContent />
        </Suspense>
    );
}
