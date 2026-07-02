"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { API_CONFIG } from "@/utils/api";
import { getAdminToken } from "@/utils/cookies";
import { Search, Loader2, AlertCircle, GraduationCap, ChevronRight, BookOpen, Activity, Users } from "lucide-react";

export default function StudentSearchPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { batches, loading: dashboardLoading } = useDashboard();
    
    // View Mode Toggle
    const [viewMode, setViewMode] = useState("search"); // "search" | "directory"

    // Search Mode States
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [studentData, setStudentData] = useState(null);
    const [searchError, setSearchError] = useState(null);
    const [courses, setCourses] = useState([]);

    // Directory Mode States
    const [selectedBatch, setSelectedBatch] = useState("");
    const [sections, setSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState("");
    const [directoryStudents, setDirectoryStudents] = useState([]);
    const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
    const [directoryError, setDirectoryError] = useState(null);

    // ==========================================
    // SEARCH MODE LOGIC
    // ==========================================
    useEffect(() => {
        if (viewMode !== 'search') return;

        if (!searchQuery.trim()) {
            setStudentData(null);
            setHasSearched(false);
            setCourses([]);
            setSearchError(null);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            handleSearch(searchQuery);
        }, 800);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, viewMode]);

    const handleSearch = async (query) => {
        setIsSearching(true);
        setSearchError(null);
        setHasSearched(true);
        setStudentData(null);
        setCourses([]);

        try {
            const token = getAdminToken();
            const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

            const searchRes = await fetch(`${API_CONFIG.baseUrl.admin}/admin/dashboard/search-student`, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({
                    uni_reg_id: query,
                    university_id: user?.university_id || user?.universityId || user?.id
                })
            });

            const data = await searchRes.json();
            
            if (data.success && data.data && data.data.student) {
                const student = data.data.student;
                setStudentData({
                    id: student.student_id,
                    name: student.student_name,
                    uni_reg_id: student.uni_reg_id,
                    section: student.section,
                    batch_id: student.batch_id,
                    batch_name: data.data.batch?.batch_name || student.batch_id
                });
                
                if (data.data.enrolled_courses && data.data.enrolled_courses.length > 0) {
                    setCourses(data.data.enrolled_courses);
                } else if (student.batch_id) {
                    fetchStudentCourses(student.batch_id, headers);
                }
            } else {
                setSearchError(data.message || "No student found with that Registration ID.");
            }
        } catch (e) {
            setSearchError("Failed to search. Please check your network.");
        } finally {
            setIsSearching(false);
        }
    };

    const fetchStudentCourses = async (batchId, headers) => {
        try {
            const cRes = await fetch(`${API_CONFIG.baseUrl.admin}/coursesmetadata/batch/${batchId}`, {
                method: "GET",
                headers,
                credentials: "include"
            });
            const cData = await cRes.json();
            if (cData.success) {
                setCourses(Array.isArray(cData.data) ? cData.data : cData.data.courses || []);
            }
        } catch (e) {
            console.error("Failed to load courses for batch", e);
        }
    };

    // ==========================================
    // DIRECTORY MODE LOGIC
    // ==========================================
    // Auto-select batch if only 1 exists
    useEffect(() => {
        if (!dashboardLoading && batches.length === 1 && !selectedBatch) {
            setSelectedBatch(batches[0].batch_id);
        }
    }, [batches, dashboardLoading, selectedBatch]);

    useEffect(() => {
        if (selectedBatch) {
            const batchObj = batches.find(b => b.batch_id === selectedBatch);
            if (batchObj && batchObj.sections) {
                setSections(batchObj.sections);
                setSelectedSection("");
                setDirectoryStudents([]);
            }
        }
    }, [selectedBatch, batches]);

    useEffect(() => {
        if (selectedBatch && selectedSection && viewMode === 'directory') {
            fetchDirectoryStudents();
        }
    }, [selectedBatch, selectedSection, viewMode]);

    const fetchDirectoryStudents = async () => {
        setIsLoadingDirectory(true);
        setDirectoryError(null);
        try {
            const token = getAdminToken();
            const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            const res = await fetch(`${API_CONFIG.baseUrl.admin}/admin/dashboard/students-by-section`, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({ batch_id: selectedBatch, section: selectedSection })
            });
            const data = await res.json();
            if (data.success && data.data) {
                setDirectoryStudents(data.data.students || []);
            } else {
                setDirectoryError(data.message || "Failed to load directory");
            }
        } catch(e) {
            setDirectoryError("Network Error");
        } finally {
            setIsLoadingDirectory(false);
        }
    };

    const handleDirectoryStudentClick = (student) => {
        setSearchQuery(student.uni_reg_id);
        setStudentData({
            id: student.student_id,
            name: student.student_name,
            uni_reg_id: student.uni_reg_id,
            section: student.section,
            batch_id: student.batch_id
        });
        setViewMode("search");
        setHasSearched(true);
        
        if (student.batch_id) {
            const token = getAdminToken();
            const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            fetchStudentCourses(student.batch_id, headers);
        }
    };

    const handleCourseClick = (courseId) => {
        if (!studentData?.id) return;
        router.push(`/dashboard/report?student_id=${studentData.id}&course_id=${courseId}`);
    };

    return (
        <div className="space-y-4 animate-fadeIn pb-20">
            <div className="max-w-2xl mx-auto text-center mb-10 pt-10">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Student Search</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8">Quickly locate any student to view their comprehensive progress, exam records, and deep analytics.</p>
                
                <div className="flex justify-center gap-4 mb-8">
                    <button 
                        onClick={() => setViewMode('search')}
                        className={`px-6 py-2 rounded-full font-semibold transition-all ${viewMode === 'search' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                    >
                        <Search className="w-4 h-4 inline mr-2" />
                        Search by ID
                    </button>
                    <button 
                        onClick={() => setViewMode('directory')}
                        className={`px-6 py-2 rounded-full font-semibold transition-all ${viewMode === 'directory' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                    >
                        <Users className="w-4 h-4 inline mr-2" />
                        Browse Directory
                    </button>
                </div>
            </div>

            {viewMode === 'search' ? (
                <>
                    <div className="relative group max-w-xl mx-auto mb-10">
                        <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 transition-colors duration-300 ${isSearching ? 'text-blue-500' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by University Reg ID..."
                            className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-2xl pl-14 pr-12 py-4 text-lg font-medium focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all duration-300 shadow-lg focus:shadow-blue-500/20 text-gray-900 dark:text-white"
                        />
                        {isSearching && (
                            <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            </div>
                        )}
                    </div>

                    <div className="max-w-5xl mx-auto">
                        {searchError ? (
                            <div className="glass-panel p-8 text-center text-red-500 border-red-200 animate-fadeIn">
                                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="font-semibold text-lg">{searchError}</p>
                            </div>
                        ) : studentData ? (
                            <div className="space-y-4 animate-slideUp">
                                <div className="glass-card p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
                                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-500/30">
                                        {studentData.name?.charAt(0) || "S"}
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{studentData.name}</h2>
                                        <p className="text-blue-600 dark:text-blue-400 font-mono text-lg mb-4">{studentData.uni_reg_id}</p>
                                        
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
                                            <div className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4"/> Batch: {studentData.batch_name || studentData.batch_id}</div>
                                            <div className="flex items-center gap-1.5"><BookOpen className="w-4 h-4"/> Section: {studentData.section || "N/A"}</div>
                                            <div className="flex items-center gap-1.5"><Activity className="w-4 h-4"/> Status: Active</div>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">Assigned Courses</h3>
                                {courses.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {courses.map(course => (
                                            <button
                                                key={course.course_id}
                                                onClick={() => handleCourseClick(course.course_id)}
                                                className="group text-left p-5 rounded-xl bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-violet-500/0 group-hover:from-blue-500/5 group-hover:to-violet-500/5 transition-all" />
                                                <div className="relative">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                            <BookOpen className="w-5 h-5" />
                                                        </div>
                                                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white line-clamp-2 mt-2">{course.course_name}</h4>
                                                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-4 font-semibold group-hover:underline">View Deep Dive Report →</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-8 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700 text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                                        <p>Loading assigned courses...</p>
                                    </div>
                                )}
                            </div>
                        ) : hasSearched && !isSearching ? (
                            <div className="glass-panel p-12 text-center text-gray-500 border-dashed">
                                <p className="font-medium">No student data found.</p>
                            </div>
                        ) : null}
                    </div>
                </>
            ) : (
                <div className="max-w-5xl mx-auto">
                    <div className="glass-panel p-4 flex flex-wrap gap-4 border border-gray-200 dark:border-slate-800 mb-8">
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
                        <div className="w-48">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Section</label>
                            <select 
                                value={selectedSection} 
                                onChange={(e) => setSelectedSection(e.target.value)}
                                disabled={!selectedBatch || sections.length === 0}
                                className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 text-gray-900 dark:text-white disabled:opacity-50 focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                                <option value="">Select section...</option>
                                {sections.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {isLoadingDirectory ? (
                        <div className="flex flex-col items-center py-20">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                            <p className="text-gray-500 font-medium">Fetching directory...</p>
                        </div>
                    ) : directoryError ? (
                        <div className="glass-panel p-8 text-center text-red-500 border-red-200 animate-fadeIn">
                            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="font-semibold text-lg">{directoryError}</p>
                        </div>
                    ) : directoryStudents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fadeIn">
                            {directoryStudents.map(student => (
                                <button 
                                    key={student.student_id}
                                    onClick={() => handleDirectoryStudentClick(student)}
                                    className="group text-left p-5 rounded-xl bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                                            {student.student_name?.charAt(0) || "S"}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{student.student_name}</h4>
                                            <p className="text-xs text-gray-500 font-mono">{student.uni_reg_id}</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-2">
                                        Section: {student.section}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : selectedBatch && selectedSection ? (
                        <div className="glass-panel p-12 text-center text-gray-500 border-dashed">
                            <p className="font-medium">No students found in this section.</p>
                        </div>
                    ) : (
                        <div className="glass-panel p-12 text-center text-gray-500 border-dashed">
                            <p className="font-medium">Select a batch and section to view directory.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
