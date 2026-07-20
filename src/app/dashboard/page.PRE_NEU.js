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
        <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0B0F19] text-[#111827] dark:text-gray-100 font-sans">
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
                <div className="relative rounded-[26px] mb-6 bg-white dark:bg-slate-800/80 border border-[#E7ECF4] dark:border-slate-700/60 shadow-[0_10px_25px_rgba(15,23,42,0.05)]">
                    <div className="relative px-8 py-8 md:py-9 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <p className="text-[#94A3B8] dark:text-gray-500 text-[13px] font-medium mb-1.5" suppressHydrationWarning>
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                            <h1 className="text-2xl md:text-[32px] font-bold text-[#111827] dark:text-white tracking-tight" suppressHydrationWarning>
                                Welcome back, {user.name || 'Admin'}
                            </h1>
                            <p className="text-[#6B7280] dark:text-gray-400 text-[15px] mt-1.5">
                                Here's what's happening across your institution today.
                            </p>
                        </div>

                        {/* Quick stats */}
                        <div className="flex gap-3">
                            <div className="bg-[#F1EAFB] dark:bg-violet-500/10 rounded-2xl px-5 py-4 text-center min-w-[96px] transition-transform duration-200 hover:scale-[1.02]">
                                <div className="text-[26px] leading-8 font-bold text-[#111827] dark:text-white tabular-nums">{batches.length}</div>
                                <div className="text-[11px] font-semibold text-[#6B7280] dark:text-violet-300 uppercase tracking-wide mt-0.5">Batches</div>
                            </div>
                            <div className="bg-[#E6F6F1] dark:bg-emerald-500/10 rounded-2xl px-5 py-4 text-center min-w-[96px] transition-transform duration-200 hover:scale-[1.02]">
                                <div className="text-[26px] leading-8 font-bold text-[#111827] dark:text-white tabular-nums">{sections.length}</div>
                                <div className="text-[11px] font-semibold text-[#6B7280] dark:text-emerald-300 uppercase tracking-wide mt-0.5">Sections</div>
                            </div>
                            <div className="bg-[#FDF1E7] dark:bg-amber-500/10 rounded-2xl px-5 py-4 text-center min-w-[96px] transition-transform duration-200 hover:scale-[1.02]">
                                <div className="text-[26px] leading-8 font-bold text-[#111827] dark:text-white tabular-nums">{courses.length}</div>
                                <div className="text-[11px] font-semibold text-[#6B7280] dark:text-amber-300 uppercase tracking-wide mt-0.5">Courses</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== TOOLBAR: pill tabs + search ===== */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    {/* Pill Tabs */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 bg-white dark:bg-slate-800/80 border border-[#E7ECF4] dark:border-slate-700/60 rounded-full p-1.5 shadow-[0_2px_6px_rgba(15,23,42,0.04)] w-fit max-w-full">
                        {[
                            { id: 'batches', label: 'Batches', icon: LayoutGrid, count: batches.length },
                            { id: 'sections', label: 'Sections', icon: Layers, count: sections.length },
                            { id: 'teachers', label: 'Teachers', icon: Users, count: teachers.length },
                            { id: 'students', label: 'Students', icon: GraduationCap },
                            { id: 'courses', label: 'Courses', icon: BookOpen, count: courses.length },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => { setView(item.id); setSearchQuery(''); }}
                                className={`flex items-center gap-2 pl-4 pr-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${view === item.id
                                    ? 'bg-[#7C3AED] text-white shadow-[0_6px_14px_rgba(124,58,237,0.30)]'
                                    : 'text-[#6B7280] dark:text-gray-400 hover:text-[#111827] dark:hover:text-white hover:bg-[#F6F4F0] dark:hover:bg-slate-700/50'}`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                                {item.count > 0 && (
                                    <span className={`text-xs tabular-nums px-2 py-0.5 rounded-full font-bold ${view === item.id ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] dark:bg-slate-700 text-[#94A3B8] dark:text-gray-400'}`}>
                                        {item.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    {(view === 'students' || view === 'teachers' || view === 'sections' || view === 'courses') && (
                        <form onSubmit={handleSearch} className="relative w-full lg:w-80 shrink-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                            <input
                                type="text"
                                placeholder={
                                    view === 'teachers' ? "Search by name or reg ID..." :
                                        view === 'sections' ? "Search sections..." :
                                            view === 'courses' ? "Search courses..." :
                                                "Search by Uni Reg ID..."
                                }
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 bg-white dark:bg-slate-800/80 border border-[#E7ECF4] dark:border-slate-700 rounded-[14px] pl-11 pr-9 text-sm text-[#111827] dark:text-white placeholder-[#94A3B8] dark:placeholder-gray-500 outline-none focus:border-[#7C3AED] dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition shadow-[inset_0_2px_4px_rgba(15,23,42,0.03),0_2px_6px_rgba(15,23,42,0.04)]"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-[#94A3B8] hover:text-[#6B7280] dark:hover:text-gray-300 hover:bg-[#F6F4F0] dark:hover:bg-slate-700 transition-colors"
                                >
                                    ×
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
                                            className="group relative text-left bg-white dark:bg-slate-800/80 rounded-[24px] border border-[#E7ECF4] dark:border-slate-700/60 shadow-[0_10px_25px_rgba(15,23,42,0.05)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.09)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                        >
                                            <div className="p-6">
                                                <div className="flex items-start justify-between gap-3 mb-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-[#F1EAFB] dark:bg-violet-500/15 flex items-center justify-center shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_5px_rgba(124,58,237,0.10)]">
                                                        <LayoutGrid className="w-6 h-6 text-[#7C3AED] dark:text-violet-400" />
                                                    </div>
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isActive
                                                        ? 'bg-[#E6F6F1] dark:bg-emerald-500/15 text-[#10B981] dark:text-emerald-400'
                                                        : 'bg-[#F1F5F9] dark:bg-slate-700/60 text-[#94A3B8] dark:text-gray-400'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#10B981] animate-pulse' : 'bg-[#94A3B8]'}`} />
                                                        {status.label}
                                                    </span>
                                                </div>

                                                <h3 className="text-lg font-bold text-[#111827] dark:text-white line-clamp-2 mb-4 group-hover:text-[#7C3AED] dark:group-hover:text-blue-400 transition-colors" title={batch.batch_name}>
                                                    {batch.batch_name}
                                                </h3>

                                                <div className="flex gap-3 mb-4">
                                                    <div className="flex-1 rounded-2xl bg-[#F6F4F0] dark:bg-slate-700/40 px-4 py-3">
                                                        <div className="text-xl font-bold tabular-nums text-[#111827] dark:text-white">{batch.batch_student_strength}</div>
                                                        <div className="text-[11px] font-semibold text-[#94A3B8] dark:text-gray-500 uppercase tracking-wide">Students</div>
                                                    </div>
                                                    <div className="flex-1 rounded-2xl bg-[#F6F4F0] dark:bg-slate-700/40 px-4 py-3">
                                                        <div className="text-xl font-bold tabular-nums text-[#111827] dark:text-white">{batch.registered_courses_id?.length || 0}</div>
                                                        <div className="text-[11px] font-semibold text-[#94A3B8] dark:text-gray-500 uppercase tracking-wide">Courses</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-gray-400 pt-3 border-t border-[#E7ECF4] dark:border-slate-700/60">
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                                                        {new Date(batch.starting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        {' - '}
                                                        {new Date(batch.ending_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-[#7C3AED] group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                            {!loading && batches.length === 0 && (
                                <div className="col-span-full flex flex-col items-center py-24 text-[#94A3B8] dark:text-gray-500">
                                    <div className="w-16 h-16 rounded-[20px] bg-white dark:bg-slate-800 border border-[#E7ECF4] dark:border-slate-700 shadow-[0_2px_6px_rgba(15,23,42,0.04)] flex items-center justify-center mb-4">
                                        <LayoutGrid className="w-7 h-7 opacity-40" />
                                    </div>
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
                                        className="group relative text-left bg-white dark:bg-slate-800/80 rounded-[24px] border border-[#E7ECF4] dark:border-slate-700/60 shadow-[0_10px_25px_rgba(15,23,42,0.05)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.09)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                    >
                                        <div className="p-5 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-[#E6F6F1] dark:bg-emerald-500/15 flex items-center justify-center shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_5px_rgba(16,185,129,0.10)] group-hover:scale-105 transition-transform">
                                                <Layers className="w-6 h-6 text-[#10B981] dark:text-emerald-400" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-base font-bold text-[#111827] dark:text-white truncate group-hover:text-[#10B981] dark:group-hover:text-emerald-400 transition-colors">{sec}</div>
                                                <div className="text-xs font-medium text-[#94A3B8] dark:text-gray-500 mt-0.5">Section</div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 shrink-0 text-[#94A3B8] group-hover:text-[#10B981] group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </button>
                                ))
                            )}
                            {!loading && sections.length === 0 && (
                                <div className="col-span-full flex flex-col items-center py-24 text-[#94A3B8] dark:text-gray-500">
                                    <div className="w-16 h-16 rounded-[20px] bg-white dark:bg-slate-800 border border-[#E7ECF4] dark:border-slate-700 shadow-[0_2px_6px_rgba(15,23,42,0.04)] flex items-center justify-center mb-4">
                                        <Layers className="w-7 h-7 opacity-40" />
                                    </div>
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
                                    <div key={idx} className="group relative flex flex-col bg-white dark:bg-slate-800/80 rounded-[24px] border border-[#E7ECF4] dark:border-slate-700/60 shadow-[0_10px_25px_rgba(15,23,42,0.05)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.09)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                                        <div className="p-6 flex-1">
                                            <div className="flex items-center gap-4 mb-5">
                                                <div className="w-12 h-12 rounded-full bg-[#F1EAFB] dark:bg-violet-500/15 flex items-center justify-center shrink-0 text-[#7C3AED] dark:text-violet-400 text-sm font-bold shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_5px_rgba(124,58,237,0.10)]">
                                                    {t.teacher_name
                                                        ? t.teacher_name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase()
                                                        : 'T'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-base font-bold text-[#111827] dark:text-white truncate" title={t.teacher_name}>
                                                        {t.teacher_name || 'Unknown'}
                                                    </h3>
                                                    <p className="text-[13px] text-[#6B7280] dark:text-gray-400 truncate" title={t.teacher_email}>
                                                        {t.teacher_email || 'No email'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-3 text-sm">
                                                <div className="flex justify-between items-center rounded-2xl bg-[#F6F4F0] dark:bg-slate-700/40 px-4 py-2.5">
                                                    <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8] dark:text-gray-500">Reg ID</span>
                                                    <span className="font-mono text-[13px] font-bold text-[#111827] dark:text-gray-200">{t.uni_reg_id || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8] dark:text-gray-500 mb-2">Sections</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {t.assigned_section && Array.isArray(t.assigned_section) && t.assigned_section.length > 0 ? (
                                                            t.assigned_section.map((sec, i) => (
                                                                <span key={i} className="px-2.5 py-1 rounded-full bg-[#E6F6F1] dark:bg-emerald-500/15 text-[#10B981] dark:text-emerald-400 text-xs font-semibold">
                                                                    {sec}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-[13px] text-[#94A3B8] dark:text-gray-500 italic">No sections assigned</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="px-6 pb-5">
                                            <button
                                                onClick={() => handleTeacherClick(t)}
                                                className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-[14px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold shadow-[0_6px_14px_rgba(124,58,237,0.25)] active:scale-[0.98] transition-all"
                                            >
                                                View details
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                            {!loading && teachers.length === 0 && (
                                <div className="col-span-full flex flex-col items-center py-24 text-[#94A3B8] dark:text-gray-500">
                                    <div className="w-16 h-16 rounded-[20px] bg-white dark:bg-slate-800 border border-[#E7ECF4] dark:border-slate-700 shadow-[0_2px_6px_rgba(15,23,42,0.04)] flex items-center justify-center mb-4">
                                        <Users className="w-7 h-7 opacity-40" />
                                    </div>
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
                                        <div className="flex flex-col items-center py-24 text-[#94A3B8] dark:text-gray-500">
                                            <div className="w-16 h-16 rounded-full bg-[#F1EAFB] dark:bg-violet-500/10 flex items-center justify-center mb-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_5px_rgba(124,58,237,0.08)]">
                                                <GraduationCap className="w-8 h-8 text-[#7C3AED]" />
                                            </div>
                                            <p className="text-sm font-medium">
                                                {hasSearched ? 'No student found with that ID' : 'Search for a student by Uni Reg ID'}
                                            </p>
                                        </div>
                                    )}
                                    {students.map((student, idx) => (
                                        <div key={idx} className="group relative flex items-center justify-between bg-white dark:bg-slate-800/80 rounded-[24px] px-6 py-5 border border-[#E7ECF4] dark:border-slate-700/60 shadow-[0_10px_25px_rgba(15,23,42,0.05)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.09)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-12 h-12 rounded-full bg-[#F1EAFB] dark:bg-violet-500/15 flex items-center justify-center text-[#7C3AED] dark:text-violet-400 text-base font-bold shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_5px_rgba(124,58,237,0.10)]">
                                                    {(student.student_name || student.name || 'S')[0].toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-base font-bold text-[#111827] dark:text-white truncate">
                                                        {student.student_name || student.name}
                                                    </h4>
                                                    <p className="text-[13px] font-mono text-[#6B7280] dark:text-gray-400 truncate">
                                                        {student.uni_reg_id || student.reg_id}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => startStudentInspection(student)}
                                                className="shrink-0 inline-flex items-center gap-1.5 h-10 px-5 rounded-[14px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold shadow-[0_6px_14px_rgba(124,58,237,0.25)] active:scale-[0.98] transition-all"
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
                                        className="group relative flex items-center gap-4 text-left bg-white dark:bg-slate-800/80 rounded-[24px] p-5 border border-[#E7ECF4] dark:border-slate-700/60 shadow-[0_10px_25px_rgba(15,23,42,0.05)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.09)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-[#FDF1E7] dark:bg-amber-500/15 flex items-center justify-center shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_5px_rgba(245,158,11,0.10)] group-hover:scale-105 transition-transform">
                                            <BookOpen className="w-6 h-6 text-[#F59E0B] dark:text-amber-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-[15px] font-bold text-[#111827] dark:text-white line-clamp-2 group-hover:text-[#F59E0B] dark:group-hover:text-amber-400 transition-colors" title={course.course_name}>
                                                {course.course_name || 'Untitled Course'}
                                            </h3>
                                            <p className="text-xs font-medium text-[#94A3B8] dark:text-gray-500 mt-0.5">Course</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 shrink-0 text-[#94A3B8] group-hover:text-[#F59E0B] group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))
                            )}
                            {!loading && courses.length === 0 && (
                                <div className="col-span-full flex flex-col items-center py-24 text-[#94A3B8] dark:text-gray-500">
                                    <div className="w-16 h-16 rounded-[20px] bg-white dark:bg-slate-800 border border-[#E7ECF4] dark:border-slate-700 shadow-[0_2px_6px_rgba(15,23,42,0.04)] flex items-center justify-center mb-4">
                                        <BookOpen className="w-7 h-7 opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium">No courses found</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>

                {/* --- MODALS --- */}

                {/* Batch Courses Modal */}
                {selectedBatch && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0F172A]/30 dark:bg-black/60 backdrop-blur-sm" onClick={closeAll}>
                        <div className="bg-white dark:bg-slate-800 rounded-[24px] w-full max-w-lg p-6 border border-[#E7ECF4] dark:border-slate-700 shadow-[0_20px_40px_rgba(15,23,42,0.14)]" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-[#111827] dark:text-white mb-4">Courses in Batch</h3>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {batchCourses.map((c, i) => (
                                    <div key={i} className="px-4 py-3 bg-[#F6F4F0] dark:bg-slate-700/40 rounded-2xl text-sm font-medium text-[#111827] dark:text-gray-300">{c.course_name}</div>
                                ))}
                            </div>
                            <button onClick={closeAll} className="mt-5 w-full h-10 rounded-[14px] bg-[#F1F5F9] dark:bg-slate-700 text-sm font-semibold text-[#6B7280] dark:text-gray-300 hover:bg-[#E7ECF4] dark:hover:bg-slate-600 transition-colors">Close</button>
                        </div>
                    </div>
                )}

                {/* Section Students Modal */}
                {selectedSection && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0F172A]/30 dark:bg-black/60 backdrop-blur-sm" onClick={closeAll}>
                        <div className="bg-white dark:bg-slate-800 rounded-[24px] w-full max-w-lg p-6 border border-[#E7ECF4] dark:border-slate-700 shadow-[0_20px_40px_rgba(15,23,42,0.14)]" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-[#111827] dark:text-white mb-4">Section {selectedSection}</h3>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {sectionStudents.map((s, i) => (
                                    <div key={i} className="flex justify-between items-center px-4 py-3 bg-[#F6F4F0] dark:bg-slate-700/40 rounded-2xl">
                                        <span className="text-sm font-medium text-[#111827] dark:text-gray-300">{s.name} ({s.reg_id})</span>
                                        <button onClick={() => startStudentInspection(s)} className="text-xs font-semibold text-[#7C3AED] dark:text-violet-400 px-3 py-1.5 rounded-full bg-[#F1EAFB] dark:bg-violet-500/10 hover:bg-[#E7DBF7] dark:hover:bg-violet-500/20 transition-colors">Inspect</button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={closeAll} className="mt-5 w-full h-10 rounded-[14px] bg-[#F1F5F9] dark:bg-slate-700 text-sm font-semibold text-[#6B7280] dark:text-gray-300 hover:bg-[#E7ECF4] dark:hover:bg-slate-600 transition-colors">Close</button>
                        </div>
                    </div>
                )}

                {/* Error Modal */}
                {showError && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0F172A]/30 dark:bg-black/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-[#E7ECF4] dark:border-slate-700 shadow-[0_20px_40px_rgba(15,23,42,0.14)] max-w-sm w-full text-center">
                            <div className="w-14 h-14 bg-[#FEF2F2] dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-7 h-7 text-[#EF4444] dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-[#111827] dark:text-white mb-1.5">Student Not Found</h3>
                            <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-5">The Registration ID you entered does not exist in our records.</p>
                            <button
                                onClick={() => setShowError(false)}
                                className="w-full h-10 rounded-[14px] bg-[#F1F5F9] dark:bg-slate-700 text-sm font-semibold text-[#6B7280] dark:text-gray-300 hover:bg-[#E7ECF4] dark:hover:bg-slate-600 transition-colors"
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
