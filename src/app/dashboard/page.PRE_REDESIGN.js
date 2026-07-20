/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_CONFIG } from '@/utils/api';
import { getAdminToken } from '@/utils/cookies';
import { BatchSkeleton, TeacherSkeleton, ListSkeleton, Skeleton, SectionSkeleton, DashboardSkeleton } from '../../components/DeepDive/Skeletons';
import StudentDetailView from '../../components/DeepDive/StudentDetailView';
import TeacherDetailView from '../../components/DeepDive/TeacherDetailView';
import ChangePasswordModal from '../../components/DeepDive/ChangePasswordModal';
import { Users, LayoutGrid, Layers, GraduationCap, Loader2, LogOut, ChevronRight, Search, FileText, Clock, AlertCircle, Sun, Moon, Key, BookOpen } from "lucide-react";
import Link from 'next/link';
import SectionDetailView from '../../components/DeepDive/SectionDetailView';
import BatchDetailView from '../../components/DeepDive/BatchDetailView';
import CourseDetailView from '../../components/DeepDive/CourseDetailView'; // [NEW]
import { useTheme } from '@/context/ThemeContext';

export default function DeepDiveDashboard() {
    const { user, logout, loading: authLoading } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const [view, setView] = useState('batches');
    const [searchQuery, setSearchQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showError, setShowError] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // Primary Data Lists
    const [batches, setBatches] = useState([]);
    const [sections, setSections] = useState([]);
    const [masterSections, setMasterSections] = useState([]); // Cache for client-side search
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [masterTeachers, setMasterTeachers] = useState([]); // Cache for client-side search
    const [courses, setCourses] = useState([]); // [NEW] Courses List
    const [masterCourses, setMasterCourses] = useState([]); // [NEW] Cache for search

    // --- Deep Dive States ---
    const [inspectingStudent, setInspectingStudent] = useState(null);
    const [inspectingTeacher, setInspectingTeacher] = useState(null);
    const [inspectingSection, setInspectingSection] = useState(null);
    const [inspectingBatch, setInspectingBatch] = useState(null);
    const [inspectingCourse, setInspectingCourse] = useState(null); // [NEW] Deep dive for course

    // 1. Batch/Course Navigation
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [batchCourses, setBatchCourses] = useState([]);

    // 2. Section Navigation
    const [selectedSection, setSelectedSection] = useState(null);
    const [sectionStudents, setSectionStudents] = useState([]);

    // 3. Cache for Section Completion
    const [sectionCompletionCache, setSectionCompletionCache] = useState({}); // { sectionName: { courseId: completion% } }

    const updateSectionCache = (sectionName, courseId, completion) => {
        setSectionCompletionCache(prev => ({
            ...prev,
            [sectionName]: {
                ...(prev[sectionName] || {}),
                [courseId]: completion
            }
        }));
    };

    // --- Custom History Management for Deep Dives ---
    const handlePopState = React.useCallback((e) => {
        if (inspectingStudent) {
            setInspectingStudent(null);
        } else if (inspectingSection) {
            setInspectingSection(null);
        } else if (inspectingCourse) {
            setInspectingCourse(null);
        } else if (inspectingTeacher) {
            setInspectingTeacher(null);
        } else if (inspectingBatch) {
            setInspectingBatch(null);
        }
    }, [inspectingStudent, inspectingSection, inspectingCourse, inspectingTeacher, inspectingBatch]);

    useEffect(() => {
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [handlePopState]);

    const pushOverlayState = () => window.history.pushState({ modal: true }, '');
    const popOverlayState = () => {
        if (window.history.state?.modal) {
            window.history.back();
        } else {
            handlePopState();
        }
    };






    // Initial Data Fetch
    useEffect(() => {
        if (!authLoading && user) {
            // Only fetch if empty to persist data across tab switches (unless explicit refresh needed)
            if (view === 'teachers' && teachers.length === 0) fetchTeachers();
            if (view === 'batches' && batches.length === 0) fetchBatches();
            if (view === 'sections' && sections.length === 0) fetchSections();
            if (view === 'courses' && courses.length === 0) fetchCourses(); // [NEW]
        }
    }, [authLoading, user, view]);

    // --- API Helpers ---

    const fetchWithAuth = async (url, options = {}) => {
        setLoading(true);
        try {
            const token = getAdminToken();
            const headers = {
                ...(options.headers || {})
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const res = await fetch(url, {
                ...options,
                credentials: 'include',
                headers
            });
            const data = await res.json();
            return data.data || data || [];
        } catch (e) {
            console.error("API Error", e);
            return [];
        } finally {
            setLoading(false);
        }
    };

    // --- Top Level Fetches ---

    const fetchTeachers = async () => {
        const data = await fetchWithAuth(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.myTeachers}`);
        const list = Array.isArray(data) ? data : [];
        setTeachers(list);
        setMasterTeachers(list);
    };

    const fetchBatches = async () => {
        const data = await fetchWithAuth(`${API_CONFIG.baseUrl.admin}/admin/dashboard/overview`);
        setBatches(Array.isArray(data) ? data : (data?.batches || []));
    };

    const fetchSections = async () => {
        const data = await fetchWithAuth(`${API_CONFIG.baseUrl.admin}${API_CONFIG.masters.sections}`);
        const list = Array.isArray(data) ? data : [];
        setSections(list);
        setMasterSections(list);
    };

    // [NEW] Fetch Courses
    const fetchCourses = async () => {
        setLoading(true);
        try {
            const identifier = user.uni_reg_id || user.email;

            const data = await fetchWithAuth(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getAllCourses}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: identifier })
            });

            // Handle various response structures
            let list = [];
            if (data.courses && Array.isArray(data.courses)) {
                list = data.courses;
            } else if (Array.isArray(data)) {
                list = data;
            }
            
            setCourses(list);
            setMasterCourses(list);
        } catch (error) {
            console.error('Error fetching courses:', error);
            setCourses([]);
        } finally {
            setLoading(false);
        }
    };

    // Live Filtering Effect
    useEffect(() => {
        const lowerQuery = searchQuery.toLowerCase().trim();

        if (view === 'teachers') {
            if (!lowerQuery) setTeachers(masterTeachers);
            else {
                const filtered = masterTeachers.filter(t =>
                    (t.teacher_name && t.teacher_name.toLowerCase().includes(lowerQuery)) ||
                    (t.uni_reg_id && String(t.uni_reg_id).toLowerCase().includes(lowerQuery)) ||
                    (t.teacher_email && t.teacher_email.toLowerCase().includes(lowerQuery))
                );
                setTeachers(filtered);
            }
        } else if (view === 'sections') {
            if (!lowerQuery) setSections(masterSections);
            else {
                const filtered = masterSections.filter(s =>
                    String(s).toLowerCase().includes(lowerQuery)
                );
                setSections(filtered);
            }
        } else if (view === 'courses') {
            if (!lowerQuery) setCourses(masterCourses);
            else {
                const filtered = masterCourses.filter(c =>
                    (c.course_name && c.course_name.toLowerCase().includes(lowerQuery)) ||
                    (c.course_code && c.course_code.toLowerCase().includes(lowerQuery))
                );
                setCourses(filtered);
            }
        }
    }, [searchQuery, view, masterTeachers, masterSections, masterCourses]);

    // --- Auth Loading Guard ---
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const handleSearch = async (e) => {
        e.preventDefault();

        // Only Students require server-side search on Submit
        if (view !== 'students') return;

        // Handle Empty Search (Reset)
        if (!searchQuery.trim()) {
            setStudents([]);
            return;
        }

        setLoading(true);
        setHasSearched(true);

        try {
            const res = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.student.lookup}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'uni_reg_id',
                    value: searchQuery,
                    university_id: user.university_id || user.universityId || user.id
                }),
                credentials: 'include'
            });
            const data = await res.json();
            const found = data.data || data;

            // Normalization Helper
            const normalizeStudent = (s) => {
                if (!s) return null;
                return {
                    ...s,
                    student_id: s.student_id || s.uuid || s._id,
                    uni_reg_id: s.uni_reg_id || s.reg_id
                };
            };

            // Strict check: if no ID, it's not a valid student
            if (Array.isArray(found)) {
                setStudents(found.map(normalizeStudent).filter(s => s && (s.uni_reg_id || s.student_id)));
            } else if (found && (found.uni_reg_id || found.reg_id || found.student_id || found.uuid)) {
                setStudents([normalizeStudent(found)]);
            } else {
                setStudents([]);
                setShowError(true);
            }
        } catch (e) {
            console.error("Search Error", e);
            setShowError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSectionClick = (sectionName) => {
        pushOverlayState();
        setInspectingSection({ section_name: sectionName, batch_name: 'Active Sections' });
    };

    const handleBatchClick = (batch) => {
        pushOverlayState();
        setInspectingBatch(batch);
    };

    const handleTeacherClick = (teacher) => {
        pushOverlayState();
        setInspectingTeacher(teacher);
    };

    const handleCourseClick = (course) => {
        pushOverlayState();
        setInspectingCourse(course);
    };

    const startStudentInspection = (student) => {
        pushOverlayState();
        setInspectingStudent(student);
    };

    // --- Deep Dive Actions ---

    const loadBatchCourses = async (batchId) => {
        setLoading(true);
        try {
            const data = await fetchWithAuth(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getPracticeCoursesByBatch}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batch_id: batchId })
            });

            if (data && data.courses) return data.courses;
            if (Array.isArray(data)) return data;
            return [];
        } catch (e) {
            console.error('Failed to fetch batch courses', e);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const openBatchModal = async (batchId) => {
        const courses = await loadBatchCourses(batchId);
        setBatchCourses(courses);
        setSelectedBatch(batchId);
    };

    const openSectionModal = async (section) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_CONFIG.baseUrl.student}${API_CONFIG.student.lookup}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'section',
                    value: section,
                    university_id: user.university_id || user.universityId || user.id
                }),
                credentials: 'include'
            });
            const data = await res.json();
            setSectionStudents(Array.isArray(data.data) ? data.data : [data.data].filter(Boolean));
            setSelectedSection(section);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const closeAll = () => {
        setSelectedBatch(null);
        setSelectedSection(null);
        setInspectingStudent(null);
    };

    // --- Render Helpers ---
    const getBatchStatus = (endDate) => {
        const isActive = new Date(endDate) > new Date();
        return isActive ?
            { label: 'Active', color: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' } :
            { label: 'Completed', color: 'text-slate-500 border-slate-500/20 bg-slate-500/10' };
    };

    if (authLoading) {
        return <DashboardSkeleton />;
    }

    if (!user) return null;

    return (
        <div className="min-h-screen text-gray-900 dark:text-gray-100 font-sans">
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />

            {/* Deep Dive Views (Overlay) */}
            {inspectingBatch && !inspectingSection && !inspectingStudent && (
                <BatchDetailView
                    batch={inspectingBatch}
                    onBack={() => window.history.back()}
                    onSectionSelect={(sectionName) => handleSectionClick(sectionName)}
                />
            )}

            {inspectingTeacher && (
                <TeacherDetailView
                    teacher={inspectingTeacher}
                    onBack={() => window.history.back()}
                    onSectionSelect={(section) => handleSectionClick(section)}
                    cache={sectionCompletionCache}
                    onUpdateCache={updateSectionCache}
                    user={user}
                />
            )}

            {inspectingStudent && (
                <StudentDetailView
                    student={inspectingStudent}
                    onBack={() => window.history.back()}
                    onStudentSelect={startStudentInspection}
                />
            )}

            {inspectingSection && !inspectingStudent && (
                <SectionDetailView
                    section={inspectingSection}
                    teachers={teachers.filter(t =>
                        t.assigned_section?.includes(
                            typeof inspectingSection === 'string' ? inspectingSection : inspectingSection.section_name
                        )
                    )}
                    onBack={() => window.history.back()}
                    onStudentSelect={startStudentInspection}
                    user={user}
                    cache={sectionCompletionCache}
                    onUpdateCache={updateSectionCache}
                />
            )}

            {inspectingCourse && (
                <CourseDetailView
                    course={inspectingCourse}
                    onBack={() => window.history.back()}
                />
            )}

            {/* Main Dashboard */}
            <div className={`transition-opacity duration-200 ${(inspectingStudent || inspectingSection || inspectingCourse || inspectingBatch || inspectingTeacher) ? 'opacity-0 pointer-events-none fixed inset-0' : 'opacity-100'}`}>

                {/* ===== HERO HEADER ===== */}
                <div className="relative overflow-hidden rounded-3xl mb-6 bg-gradient-to-r from-blue-600 via-blue-600 to-sky-600 dark:from-blue-700 dark:via-blue-700 dark:to-sky-700">
                    {/* Decorative circles (Google-style) */}
                    <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10" />
                    <div className="absolute -bottom-24 right-40 w-48 h-48 rounded-full bg-white/[0.07]" />
                    <div className="absolute top-8 right-72 w-16 h-16 rounded-full bg-white/10" />

                    <div className="relative px-8 py-8 md:py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <p className="text-blue-100 text-sm font-medium mb-1" suppressHydrationWarning>
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight" suppressHydrationWarning>
                                Welcome back, {user.name || 'Admin'} ðŸ‘‹
                            </h1>
                            <p className="text-blue-100/90 text-sm mt-1.5">
                                Here's what's happening across your institution today.
                            </p>
                        </div>

                        {/* Quick stats */}
                        <div className="flex gap-3">
                            <div className="bg-white/15 backdrop-blur rounded-2xl px-5 py-3.5 text-center min-w-[92px]">
                                <div className="text-2xl font-bold text-white tabular-nums">{batches.length}</div>
                                <div className="text-[11px] font-medium text-blue-100 uppercase tracking-wide mt-0.5">Batches</div>
                            </div>
                            <div className="bg-white/15 backdrop-blur rounded-2xl px-5 py-3.5 text-center min-w-[92px]">
                                <div className="text-2xl font-bold text-white tabular-nums">{sections.length}</div>
                                <div className="text-[11px] font-medium text-blue-100 uppercase tracking-wide mt-0.5">Sections</div>
                            </div>
                            <div className="bg-white/15 backdrop-blur rounded-2xl px-5 py-3.5 text-center min-w-[92px]">
                                <div className="text-2xl font-bold text-white tabular-nums">{courses.length}</div>
                                <div className="text-[11px] font-medium text-blue-100 uppercase tracking-wide mt-0.5">Courses</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== TOOLBAR: pill tabs + search ===== */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    {/* Pill Tabs (Material 3 style) */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {[
                            { id: 'batches', label: 'Batches', icon: LayoutGrid, count: batches.length, active: 'bg-sky-600 text-white shadow-lg shadow-sky-600/25', chip: 'bg-white/20 text-white', idle: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20', idleChip: 'bg-sky-200/60 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300' },
                            { id: 'sections', label: 'Sections', icon: Layers, count: sections.length, active: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25', chip: 'bg-white/20 text-white', idle: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20', idleChip: 'bg-emerald-200/60 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
                            { id: 'teachers', label: 'Teachers', icon: Users, count: teachers.length, active: 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25', chip: 'bg-white/20 text-white', idle: 'text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20', idleChip: 'bg-cyan-200/60 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300' },
                            { id: 'students', label: 'Students', icon: GraduationCap, active: 'bg-blue-600 text-white shadow-lg shadow-blue-600/25', chip: 'bg-white/20 text-white', idle: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20', idleChip: 'bg-blue-200/60 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' },
                            { id: 'courses', label: 'Courses', icon: BookOpen, count: courses.length, active: 'bg-amber-500 text-white shadow-lg shadow-amber-500/25', chip: 'bg-white/20 text-white', idle: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20', idleChip: 'bg-amber-200/60 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => { setView(item.id); setSearchQuery(''); }}
                                className={`flex items-center gap-2 pl-4 pr-3.5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${view === item.id ? item.active : item.idle}`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                                {item.count > 0 && (
                                    <span className={`text-xs tabular-nums px-2 py-0.5 rounded-full font-bold ${view === item.id ? item.chip : item.idleChip}`}>
                                        {item.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    {(view === 'students' || view === 'teachers' || view === 'sections' || view === 'courses') && (
                        <form onSubmit={handleSearch} className="relative w-full lg:w-80 shrink-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder={
                                    view === 'teachers' ? "Search by name or reg IDâ€¦" :
                                        view === 'sections' ? "Search sectionsâ€¦" :
                                            view === 'courses' ? "Search coursesâ€¦" :
                                                "Search by Uni Reg IDâ€¦"
                                }
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-full pl-11 pr-9 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition shadow-sm"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Ã—
                                </button>
                            )}
                        </form>
                    )}
                </div>

                {/* ===== CONTENT ===== */}
                <main>

                    {/* View: Batches */}
                    {view === 'batches' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {loading ? (
                                <>
                                    <BatchSkeleton /><BatchSkeleton /><BatchSkeleton />
                                    <BatchSkeleton /><BatchSkeleton /><BatchSkeleton />
                                </>
                            ) : (
                                batches.map((batch) => {
                                    const status = getBatchStatus(batch.ending_date);
                                    const isActive = status.label === 'Active';
                                    return (
                                        <button
                                            key={batch.batch_id}
                                            onClick={() => handleBatchClick(batch)}
                                            className="group relative text-left bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-gray-100 dark:border-slate-700/60 transition-all duration-300 overflow-hidden"
                                        >
                                            {/* Colored top strip */}
                                            <div className="h-1.5 bg-gradient-to-r from-sky-500 to-cyan-500" />

                                            <div className="p-6">
                                                <div className="flex items-start justify-between gap-3 mb-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-500/15 flex items-center justify-center shrink-0">
                                                        <LayoutGrid className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                                                    </div>
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isActive
                                                        ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                                        : 'bg-gray-100 dark:bg-slate-700/60 text-gray-500 dark:text-gray-400'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                                                        {status.label}
                                                    </span>
                                                </div>

                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 mb-4 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" title={batch.batch_name}>
                                                    {batch.batch_name}
                                                </h3>

                                                <div className="flex gap-3 mb-4">
                                                    <div className="flex-1 rounded-xl bg-sky-50 dark:bg-sky-500/10 px-4 py-3">
                                                        <div className="text-xl font-bold tabular-nums text-sky-700 dark:text-sky-300">{batch.batch_student_strength}</div>
                                                        <div className="text-[11px] font-medium text-sky-600/70 dark:text-sky-400/70 uppercase tracking-wide">Students</div>
                                                    </div>
                                                    <div className="flex-1 rounded-xl bg-blue-50 dark:bg-blue-500/10 px-4 py-3">
                                                        <div className="text-xl font-bold tabular-nums text-blue-700 dark:text-blue-300">{batch.registered_courses_id?.length || 0}</div>
                                                        <div className="text-[11px] font-medium text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wide">Courses</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-slate-700/60">
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {new Date(batch.starting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        {' â€“ '}
                                                        {new Date(batch.ending_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-sky-400 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                            {!loading && batches.length === 0 && (
                                <div className="col-span-full flex flex-col items-center py-24 text-gray-400 dark:text-gray-500">
                                    <LayoutGrid className="w-10 h-10 mb-3 opacity-30" />
                                    <p className="text-sm font-medium">No batches found</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* View: Sections */}
                    {view === 'sections' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                            {loading ? (
                                <>
                                    <SectionSkeleton /><SectionSkeleton /><SectionSkeleton /><SectionSkeleton />
                                    <SectionSkeleton /><SectionSkeleton /><SectionSkeleton /><SectionSkeleton />
                                </>
                            ) : (
                                sections.map((sec, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSectionClick(sec)}
                                        className="group relative text-left bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-gray-100 dark:border-slate-700/60 transition-all duration-300 overflow-hidden"
                                    >
                                        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
                                        <div className="p-5 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                <Layers className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{sec}</div>
                                                <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-0.5">Section</div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 shrink-0 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </button>
                                ))
                            )}
                            {!loading && sections.length === 0 && (
                                <div className="col-span-full flex flex-col items-center py-24 text-gray-400 dark:text-gray-500">
                                    <Layers className="w-10 h-10 mb-3 opacity-30" />
                                    <p className="text-sm font-medium">No sections found</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* View: Teachers */}
                    {view === 'teachers' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {loading ? (
                                <>
                                    <TeacherSkeleton /><TeacherSkeleton /><TeacherSkeleton />
                                    <TeacherSkeleton /><TeacherSkeleton /><TeacherSkeleton />
                                </>
                            ) : (
                                teachers.map((t, idx) => (
                                    <div key={idx} className="group relative flex flex-col bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-gray-100 dark:border-slate-700/60 transition-all duration-300 overflow-hidden">
                                        <div className="h-1.5 bg-gradient-to-r from-cyan-500 to-blue-500" />
                                        <div className="p-6 flex-1">
                                            <div className="flex items-center gap-4 mb-5">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-md">
                                                    {t.teacher_name
                                                        ? t.teacher_name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase()
                                                        : 'T'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate" title={t.teacher_name}>
                                                        {t.teacher_name || 'Unknown'}
                                                    </h3>
                                                    <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate" title={t.teacher_email}>
                                                        {t.teacher_email || 'No email'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-3 text-sm">
                                                <div className="flex justify-between items-center rounded-xl bg-cyan-50/70 dark:bg-cyan-500/10 px-4 py-2.5">
                                                    <span className="text-xs font-semibold uppercase tracking-wide text-cyan-700/70 dark:text-cyan-400/70">Reg ID</span>
                                                    <span className="font-mono text-[13px] font-bold text-cyan-800 dark:text-cyan-300">{t.uni_reg_id || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Sections</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {t.assigned_section && Array.isArray(t.assigned_section) && t.assigned_section.length > 0 ? (
                                                            t.assigned_section.map((sec, i) => (
                                                                <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                                                                    {sec}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-[13px] text-gray-400 dark:text-gray-500 italic">No sections assigned</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="px-6 pb-5">
                                            <button
                                                onClick={() => handleTeacherClick(t)}
                                                className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold shadow-sm shadow-cyan-600/20 transition-colors"
                                            >
                                                View details
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                            {!loading && teachers.length === 0 && (
                                <div className="col-span-full flex flex-col items-center py-24 text-gray-400 dark:text-gray-500">
                                    <Users className="w-10 h-10 mb-3 opacity-30" />
                                    <p className="text-sm font-medium">No teachers found</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* View: Students */}
                    {view === 'students' && (
                        <div className="max-w-3xl space-y-4">
                            {loading ? (
                                <ListSkeleton />
                            ) : (
                                <>
                                    {students.length === 0 && (
                                        <div className="flex flex-col items-center py-24 text-gray-400 dark:text-gray-500">
                                            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-4">
                                                <GraduationCap className="w-8 h-8 text-blue-400" />
                                            </div>
                                            <p className="text-sm font-medium">
                                                {hasSearched ? 'No student found with that ID' : 'Search for a student by Uni Reg ID'}
                                            </p>
                                        </div>
                                    )}
                                    {students.map((student, idx) => (
                                        <div key={idx} className="group relative flex items-center justify-between bg-white dark:bg-slate-800/80 rounded-2xl px-6 py-5 shadow-sm hover:shadow-xl border border-gray-100 dark:border-slate-700/60 transition-all duration-300 overflow-hidden">
                                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-blue-500" />
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-500 flex items-center justify-center text-white text-base font-bold shrink-0 shadow-md">
                                                    {(student.student_name || student.name || 'S')[0].toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                                        {student.student_name || student.name}
                                                    </h4>
                                                    <p className="text-[13px] font-mono text-gray-500 dark:text-gray-400 truncate">
                                                        {student.uni_reg_id || student.reg_id}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => startStudentInspection(student)}
                                                className="shrink-0 inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-600/20 transition-colors"
                                            >
                                                View details
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}

                    {/* View: Courses */}
                    {view === 'courses' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {loading ? (
                                <>
                                    <BatchSkeleton /><BatchSkeleton /><BatchSkeleton /><BatchSkeleton />
                                </>
                            ) : (
                                courses.map((course, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleCourseClick(course)}
                                        className="group relative flex items-center gap-4 text-left bg-white dark:bg-slate-800/80 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 border border-gray-100 dark:border-slate-700/60 transition-all duration-300 overflow-hidden"
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-500 to-orange-500" />
                                        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ml-1.5">
                                            <BookOpen className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" title={course.course_name}>
                                                {course.course_name || 'Untitled Course'}
                                            </h3>
                                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-0.5">Course</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 shrink-0 text-amber-400 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                ))
                            )}
                            {!loading && courses.length === 0 && (
                                <div className="col-span-full flex flex-col items-center py-24 text-gray-400 dark:text-gray-500">
                                    <BookOpen className="w-10 h-10 mb-3 opacity-30" />
                                    <p className="text-sm font-medium">No courses found</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>

                {/* --- MODALS --- */}

                {/* Batch Courses Modal */}
                {selectedBatch && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={closeAll}>
                        <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Courses in Batch</h3>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {batchCourses.map((c, i) => (
                                    <div key={i} className="px-4 py-3 bg-gray-50 dark:bg-slate-700/40 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300">{c.course_name}</div>
                                ))}
                            </div>
                            <button onClick={closeAll} className="mt-5 w-full h-10 rounded-full bg-gray-100 dark:bg-slate-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Close</button>
                        </div>
                    </div>
                )}

                {/* Section Students Modal */}
                {selectedSection && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={closeAll}>
                        <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Section {selectedSection}</h3>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {sectionStudents.map((s, i) => (
                                    <div key={i} className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-slate-700/40 rounded-xl">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.name} ({s.reg_id})</span>
                                        <button onClick={() => startStudentInspection(s)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">Inspect</button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={closeAll} className="mt-5 w-full h-10 rounded-full bg-gray-100 dark:bg-slate-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Close</button>
                        </div>
                    </div>
                )}

                {/* Error Modal */}
                {showError && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center">
                            <div className="w-14 h-14 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-7 h-7 text-red-500 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">Student Not Found</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">The Registration ID you entered does not exist in our records.</p>
                            <button
                                onClick={() => setShowError(false)}
                                className="w-full h-10 rounded-full bg-gray-100 dark:bg-slate-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
