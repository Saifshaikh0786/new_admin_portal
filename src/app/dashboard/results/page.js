"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { API_CONFIG } from "@/utils/api";
import { getAdminToken } from "@/utils/cookies";
import { Loader2, Download, Search, AlertCircle, ShieldAlert, MonitorOff, Focus, Clock, Key, Shield, ChevronRight, FileText, FileSpreadsheet } from "lucide-react";
import { CircularProgress } from "@/components/CircularProgress";
import * as XLSX from "xlsx";

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
    const [selectedSection, setSelectedSection] = useState(searchParams.get("section") || "All");
    const [selectedCourse, setSelectedCourse] = useState(searchParams.get("courseId") || "");
    const [selectedUnit, setSelectedUnit] = useState(searchParams.get("unitId") || "");
    const [selectedLecture, setSelectedLecture] = useState(searchParams.get("lectureId") || "");

    const [studentsData, setStudentsData] = useState([]);
    const [examConfig, setExamConfig] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

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
                if (configData.success) {
                    setExamConfig(configData.data);
                }
            } catch (e) {
                console.error("Failed to fetch exam config", e);
            }
        };
        fetchConfig();
    }, [selectedLecture]);

    // URL Syncing
    useEffect(() => {
        setPage(1);
        const params = new URLSearchParams(searchParams.toString());
        let changed = false;
        
        if (selectedBatch && selectedBatch !== params.get("batchId")) { params.set("batchId", selectedBatch); changed = true; }
        if (selectedCourse && selectedCourse !== params.get("courseId")) { params.set("courseId", selectedCourse); changed = true; }
        if (selectedUnit && selectedUnit !== params.get("unitId")) { params.set("unitId", selectedUnit); changed = true; }
        if (selectedLecture && selectedLecture !== params.get("lectureId")) { params.set("lectureId", selectedLecture); changed = true; }
        if (selectedSection && selectedSection !== params.get("section")) { params.set("section", selectedSection); changed = true; }
        
        if (changed) {
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [selectedBatch, selectedCourse, selectedUnit, selectedLecture, selectedSection, searchParams, router]);

    const handleExport = async (format) => {
        if (!selectedBatch || !selectedCourse || !selectedLecture) return;
        setIsExporting(true);
        try {
            const token = getAdminToken();
            const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            
            const scoresRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.analytics.sectionStudents}`, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({
                    batch_id: selectedBatch,
                    section: selectedSection === "All" ? null : selectedSection,
                    course_id: selectedCourse,
                    lecture_id: selectedLecture,
                    page: 1,
                    limit: 10000 // Fetch all for export
                })
            });
            const scoresData = await scoresRes.json();
            if (!scoresData.success) throw new Error("Failed to fetch scores");
            
            const lectureScores = scoresData.data || [];
            const studentIds = lectureScores.map(s => s.student_id);

            const proctorRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.analytics.proctoringSummary}`, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({
                    batch_id: selectedBatch,
                    section: selectedSection === "All" ? null : selectedSection,
                    course_id: selectedCourse,
                    lecture_id: selectedLecture,
                    student_ids: studentIds
                })
            });
            const proctorData = await proctorRes.json();
            
            const merged = lectureScores.map(score => {
                const proc = (proctorData.data || []).find(p => p.student_id === score.student_id) || {};
                return {
                    ...score,
                    focus_lost_count: proc.focus_lost_count || 0,
                    tab_switches_count: proc.tab_switch_count || 0,
                    disconnects_count: proc.disconnect_count || 0,
                    mcq_marks: score.result_type === 'mcq' ? score.marks_obtained : 0,
                    coding_marks: score.result_type === 'coding' ? score.marks_obtained : 0
                };
            });
            
            const studentMap = {};
            merged.forEach(row => {
                if (!studentMap[row.student_id]) {
                    studentMap[row.student_id] = { ...row };
                } else {
                    studentMap[row.student_id].mcq_marks += row.mcq_marks;
                    studentMap[row.student_id].coding_marks += row.coding_marks;
                    studentMap[row.student_id].marks_obtained += Number(row.marks_obtained || 0);
                }
            });

            const finalData = Object.values(studentMap);
            
            const exportData = finalData.map(s => ({
                "Student Name": s.student_name || "N/A",
                "Reg ID": s.reg_id || "N/A",
                "Section": s.section || "N/A",
                "MCQ Score": s.mcq_marks || 0,
                "Coding Score": s.coding_marks || 0,
                "Total Score": s.marks_obtained || 0,
                "Tab Switches": s.tab_switches_count || 0,
                "Focus Lost": s.focus_lost_count || 0,
                "Disconnects": s.disconnects_count || 0,
                "Submitted": s.is_submitted ? "Yes" : "No",
                "Submitted At": s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "N/A"
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "ResultsData");
            
            if (format === 'csv') {
                XLSX.writeFile(workbook, `Exam_Results_${selectedBatch}_${selectedCourse}.csv`);
            } else {
                XLSX.writeFile(workbook, `Exam_Results_${selectedBatch}_${selectedCourse}.xlsx`);
            }
        } catch (e) {
            console.error("Export error", e);
            alert("Error exporting data.");
        } finally {
            setIsExporting(false);
        }
    };

    // Fetch Table Data
    const fetchExamData = async (currentPage = page) => {
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
                    course_id: selectedCourse,
                    lecture_id: selectedLecture,
                    page: currentPage,
                    limit: 100
                })
            });
            const scoresData = await scoresRes.json();
            
            let lectureScores = [];
            let studentIds = [];
            if (scoresData.success) {
                // Since backend now filters by lecture_id, all scores are for this lecture
                lectureScores = scoresData.data || [];
                studentIds = lectureScores.map(s => s.student_id);
                if (scoresData.pagination) {
                    setTotalPages(scoresData.pagination.totalPages || 1);
                }
            }
            
            // 2. Fetch Proctoring Summary
            const proctorRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.analytics.proctoringSummary}`, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({
                    batch_id: selectedBatch,
                    section: selectedSection === "All" ? null : selectedSection,
                    course_id: selectedCourse,
                    lecture_id: selectedLecture,
                    student_ids: studentIds
                })
            });
            const proctorData = await proctorRes.json();

            if (scoresData.success && proctorData.success) {
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
                        coding_marks: score.result_type === 'coding' ? score.marks_obtained : 0,
                        mcq_max: score.result_type === 'mcq' ? (Number(score.total_possible_marks) || Number(score.total_marks)) : 0,
                        coding_max: score.result_type === 'coding' ? (Number(score.total_possible_marks) || Number(score.total_marks)) : 0
                    };
                });
                
                // Group by student since mcq and coding might be separate rows
                const studentMap = {};
                merged.forEach(row => {
                    if (!studentMap[row.student_id]) {
                        studentMap[row.student_id] = { ...row };
                        // Ensure total_marks is treated as a number
                        studentMap[row.student_id].total_marks = Number(row.total_marks || 0);
                        studentMap[row.student_id].mcq_max = Number(row.mcq_max || 0);
                        studentMap[row.student_id].coding_max = Number(row.coding_max || 0);
                    } else {
                        studentMap[row.student_id].mcq_marks += row.mcq_marks;
                        studentMap[row.student_id].coding_marks += row.coding_marks;
                        studentMap[row.student_id].marks_obtained += Number(row.marks_obtained || 0);
                        studentMap[row.student_id].total_marks += Number(row.total_marks || 0);
                        studentMap[row.student_id].mcq_max = Math.max(studentMap[row.student_id].mcq_max || 0, Number(row.mcq_max || 0));
                        studentMap[row.student_id].coding_max = Math.max(studentMap[row.student_id].coding_max || 0, Number(row.coding_max || 0));
                    }
                });

                const finalData = Object.values(studentMap);
                setStudentsData(finalData);

                const uniqueSections = [...new Set(finalData.map(s => s.section))].filter(Boolean);
                if (sections.length === 0) setSections([...uniqueSections, "All"]);
            } else {
                setError(scoresData.message || "Failed to fetch exam data");
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
        
        let presentCount = 0;
        let passCount = 0;
        let totalMcq = 0;
        let totalCoding = 0;
        let sumTotalMarks = 0;
        
        let examMcqMax = 0;
        let examCodingMax = 0;
        
        // Use passing percentage from exam config if available, default 50
        const passPercentStr = examConfig?.config?.passing_percentage || examConfig?.config?.['passing-percentage'] || 50;
        const passPercent = parseFloat(passPercentStr);

        studentsData.forEach(s => {
            const mcq = Number(s.mcq_marks) || 0;
            const coding = Number(s.coding_marks) || 0;
            
            // Total score OBTAINED is the sum of MCQ and Coding
            const scoreObtained = (s.marks_obtained !== undefined && s.marks_obtained !== null) 
                ? Number(s.marks_obtained) 
                : (mcq + coding);

            examMcqMax = Math.max(examMcqMax, s.mcq_max || 0);
            examCodingMax = Math.max(examCodingMax, s.coding_max || 0);

            // A student is considered present ONLY if they have a submit reason
            const isPresent = !!s.submit_reason;
            
            if (isPresent) {
                presentCount++;
                totalMcq += mcq;
                totalCoding += coding;
                sumTotalMarks += scoreObtained;

                // Pass calculation
                let scorePercent = 0;
                
                if (s.score_percent !== undefined && s.score_percent !== null) {
                    scorePercent = Number(s.score_percent);
                } else if (s.course_score_percent !== undefined && s.course_score_percent !== null) {
                    scorePercent = Number(s.course_score_percent);
                } else {
                    // We don't have a direct percentage. Try to use total_marks if it exists as the max possible marks.
                    const maxMarks = Number(s.total_possible_marks) || Number(s.total_marks) || 100; 
                    scorePercent = (scoreObtained / maxMarks) * 100;
                }

                if (scorePercent >= passPercent) {
                    passCount++;
                }
            }
        });

        const totalStudents = studentsData.length;
        const examTotalMax = examMcqMax + examCodingMax;
        
        return {
            totalStudents,
            presentCount,
            passCount,
            passRate: presentCount > 0 ? Math.round((passCount / presentCount) * 100) : 0,
            avgMcq: presentCount > 0 ? (totalMcq / presentCount).toFixed(1) : "0.0",
            avgCoding: presentCount > 0 ? (totalCoding / presentCount).toFixed(1) : "0.0",
            avgTotal: presentCount > 0 ? (sumTotalMarks / presentCount).toFixed(1) : "0.0",
            examMcqMax,
            examCodingMax,
            examTotalMax
        };
    }, [studentsData, examConfig]);

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
                    <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl neu-chip neu-chip-accent flex items-center justify-center shrink-0"><Shield className="w-6 h-6" /></div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">Exam & Proctoring Results</h1></div>
                    <p className="text-gray-500 dark:text-gray-400">Deep behavioral analytics and secure exam proctoring logs.</p>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => handleExport('csv')}
                        disabled={isExporting || !selectedBatch || !selectedCourse || !selectedLecture}
                        className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        Export CSV
                    </button>
                    <button 
                        onClick={() => handleExport('excel')}
                        disabled={isExporting || !selectedBatch || !selectedCourse || !selectedLecture}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                        Export Excel
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="neu-raised p-4 flex flex-nowrap items-center gap-4 border border-[var(--neu-divider)] overflow-x-auto custom-scrollbar">
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
                        onClick={() => {
                            setPage(1);
                            fetchExamData(1);
                        }}
                        disabled={!selectedBatch || !selectedCourse || !selectedLecture || loading}
                        className="px-6 py-2.5 neu-btn-primary text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px]"
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
                <div className="neu-raised p-8 text-center text-red-500 border-red-200">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-semibold">{error}</p>
                </div>
            ) : !selectedLecture ? (
                <div className="neu-raised p-12 text-center text-gray-500 border-dashed">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                            <div className="p-5 rounded-2xl neu-raised neu-hover flex flex-col justify-center border-t-4 border-t-[#4A9BD9]">
                                <p className="text-xs font-bold text-gray-500 uppercase">Attendance</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{metrics.presentCount}</p>
                                    <p className="text-sm font-semibold text-gray-500">/ {metrics.totalStudents}</p>
                                </div>
                            </div>
                            <div className="p-5 rounded-2xl neu-raised neu-hover flex flex-col justify-center border-t-4 border-t-[var(--neu-accent)]">
                                <p className="text-xs font-bold text-gray-500 uppercase">Avg Total Marks</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{metrics.avgTotal}</p>
                                    {metrics.examTotalMax > 0 && <p className="text-sm font-semibold text-gray-500">/ {metrics.examTotalMax}</p>}
                                </div>
                            </div>
                            <div className="p-5 rounded-2xl neu-raised neu-hover flex flex-col justify-center border-t-4 border-t-[var(--neu-warn)]">
                                <p className="text-xs font-bold text-gray-500 uppercase">Avg MCQ Score</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{metrics.avgMcq}</p>
                                    {metrics.examMcqMax > 0 && <p className="text-sm font-semibold text-gray-500">/ {metrics.examMcqMax}</p>}
                                </div>
                            </div>
                            <div className="p-5 rounded-2xl neu-raised neu-hover flex flex-col justify-center border-t-4 border-t-[var(--neu-achieve)]">
                                <p className="text-xs font-bold text-gray-500 uppercase">Avg Coding Score</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{metrics.avgCoding}</p>
                                    {metrics.examCodingMax > 0 && <p className="text-sm font-semibold text-gray-500">/ {metrics.examCodingMax}</p>}
                                </div>
                            </div>
                            <div className="p-5 rounded-2xl neu-raised neu-hover flex flex-col justify-center border-t-4 border-t-[var(--neu-success)]">
                                <p className="text-xs font-bold text-gray-500 uppercase">Class Pass Rate</p>
                                <p className="text-3xl font-black text-gray-900 dark:text-white mt-2">{metrics.passRate}%</p>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="card overflow-hidden">
                        <div className="p-4 border-b border-[var(--neu-divider)] bg-gray-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 dark:text-white">Proctoring & Result Logs</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" placeholder="Search Reg ID..." className="pl-9 pr-4 py-1.5 text-sm neu-inset rounded-full focus:ring-2 focus:ring-blue-500" />
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
                                        const mcq = Number(student.mcq_marks) || 0;
                                        const coding = Number(student.coding_marks) || 0;
                                        const totalScore = (student.marks_obtained !== undefined && student.marks_obtained !== null) 
                                            ? Number(student.marks_obtained) 
                                            : (mcq + coding);
                                        const allowedAttempts = Number(student.allowed_attempts || 1);
                                        const mcqMax = student.mcq_max || 0;
                                        const codingMax = student.coding_max || 0;
                                        const totalMax = mcqMax + codingMax || student.total_marks || 0;
                                        const isPresent = !!(student.submit_reason || student.submission_reason);
                                        
                                        return (
                                            <tr 
                                                key={student.student_id} 
                                                onClick={() => handleRowClick(student.student_id)}
                                                className="border-b border-gray-100 dark:border-slate-800 hover:bg-[var(--neu-achieve-soft)] dark:hover:bg-slate-800/50 cursor-pointer group"
                                            >
                                                <td className="p-4 font-semibold text-gray-900 dark:text-white">
                                                    {student.student_name}
                                                </td>
                                                <td className="p-4 text-sm text-gray-500 font-mono">
                                                    {student.reg_id}
                                                </td>
                                                <td className="p-4 text-center font-medium">
                                                    {!isPresent ? <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded">ABS</span> : <>{student.mcq_marks || 0} {mcqMax > 0 && <span className="text-xs text-gray-400">/ {mcqMax}</span>}</>}
                                                </td>
                                                <td className="p-4 text-center font-medium">
                                                    {!isPresent ? <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded">ABS</span> : <>{student.coding_marks || 0} {codingMax > 0 && <span className="text-xs text-gray-400">/ {codingMax}</span>}</>}
                                                </td>
                                                <td className="p-4 text-center font-bold text-gray-900 dark:text-white">
                                                    {!isPresent ? <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded">ABS</span> : <>{totalScore.toFixed(1)} {totalMax > 0 && <span className="text-xs text-gray-400 font-normal">/ {totalMax}</span>}</>}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`text-xs uppercase font-medium ${!isPresent ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                                        {!isPresent ? "Absent" : (student.submit_reason || student.submission_reason || "Auto Submitted")}
                                                    </span>
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
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="p-4 border-t border-[var(--neu-divider)] neu-raised flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Page <span className="font-semibold text-gray-900 dark:text-white">{page}</span> of <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span>
                                </span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => {
                                            const newPage = Math.max(1, page - 1);
                                            setPage(newPage);
                                            fetchExamData(newPage);
                                        }}
                                        disabled={page === 1}
                                        className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
                                    >
                                        Previous
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const newPage = Math.min(totalPages, page + 1);
                                            setPage(newPage);
                                            fetchExamData(newPage);
                                        }}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
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
