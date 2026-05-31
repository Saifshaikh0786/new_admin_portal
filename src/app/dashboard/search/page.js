"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { API_CONFIG } from "@/utils/api";
import { getAdminToken } from "@/utils/cookies";
import { Search, Loader2, AlertCircle, GraduationCap, ChevronRight, BookOpen, Clock, Activity } from "lucide-react";

export default function StudentSearchPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [studentData, setStudentData] = useState(null);
    const [error, setError] = useState(null);
    const [courses, setCourses] = useState([]);

    // We use a simple debounce pattern
    useEffect(() => {
        if (!searchQuery.trim()) {
            setStudentData(null);
            setHasSearched(false);
            setCourses([]);
            setError(null);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            handleSearch(searchQuery);
        }, 800); // 800ms debounce

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSearch = async (query) => {
        setIsSearching(true);
        setError(null);
        setHasSearched(true);
        setStudentData(null);
        setCourses([]);

        try {
            const token = getAdminToken();
            const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

            // 1. Search for student by Reg ID
            const searchRes = await fetch(`${API_CONFIG.baseUrl.admin}/admin/dashboard/search-student`, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({
                    value: query,
                    university_id: user?.university_id || user?.universityId || user?.id
                })
            });

            const data = await searchRes.json();
            
            if (data.success && data.data && data.data.length > 0) {
                const student = data.data[0];
                setStudentData(student);
                
                // 2. Once we have the student, fetch their courses from their batch
                if (student.batch_id) {
                    fetchStudentCourses(student.batch_id, headers);
                }
            } else {
                setError("No student found with that Registration ID.");
            }
        } catch (e) {
            setError("Failed to search. Please check your network.");
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

    const handleCourseClick = (courseId) => {
        if (!studentData?.id) return;
        router.push(`/dashboard/report?student_id=${studentData.id}&course_id=${courseId}`);
    };

    return (
        <div className="space-y-4 animate-fadeIn pb-20">
            <div className="max-w-2xl mx-auto text-center mb-10 pt-10">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Student Search</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8">Quickly locate any student to view their comprehensive progress, exam records, and deep analytics.</p>
                
                {/* Search Input */}
                <div className="relative group max-w-xl mx-auto">
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
            </div>

            {/* Results Area */}
            <div className="max-w-5xl mx-auto">
                {error ? (
                    <div className="glass-panel p-8 text-center text-red-500 border-red-200 animate-fadeIn">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-semibold text-lg">{error}</p>
                    </div>
                ) : studentData ? (
                    <div className="space-y-4 animate-slideUp">
                        {/* Student Profile Card */}
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

                        {/* Courses List */}
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
        </div>
    );
}
