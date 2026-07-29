/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useState, useEffect } from 'react';
import useSWR, { mutate, preload } from 'swr';
import { useAuth } from '@/context/AuthContext';
import { API_CONFIG } from '@/utils/api';
import { getAdminToken } from '@/utils/cookies';
import { BatchSkeleton, TeacherSkeleton, ListSkeleton, Skeleton, SectionSkeleton, DashboardSkeleton } from '../../components/DeepDive/Skeletons';
import StudentDetailView from '../../components/DeepDive/StudentDetailView';
import TeacherDetailView from '../../components/DeepDive/TeacherDetailView';
import ChangePasswordModal from '../../components/DeepDive/ChangePasswordModal';
import { Users, LayoutGrid, Layers, GraduationCap, Loader2, LogOut, ChevronRight, Search, FileText, Clock, AlertCircle, Sun, Moon, Key, BookOpen, Trophy, TrendingUp, ArrowLeft } from "lucide-react";
import Link from 'next/link';
import SectionDetailView from '../../components/DeepDive/SectionDetailView';
import BatchDetailView from '../../components/DeepDive/BatchDetailView';
import CourseDetailView from '../../components/DeepDive/CourseDetailView'; // [NEW]
import PortalWrapper from '../../components/DeepDive/PortalWrapper';
import { useTheme } from '@/context/ThemeContext';
import { swrFetcher } from '@/utils/fetcher';

export default function DeepDiveDashboard() {
    const { user, logout, loading: authLoading } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const [view, setView] = useState('batches');
    const [searchQuery, setSearchQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showError, setShowError] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // SWR Data Fetching
    const { data: batchesData, isLoading: batchesLoading } = useSWR(
        user ? [`${API_CONFIG.baseUrl.admin}/admin/dashboard/overview`, 'GET'] : null, swrFetcher, { revalidateOnFocus: false }
    );
    const { data: sectionsData, isLoading: sectionsLoading } = useSWR(
        user ? [`${API_CONFIG.baseUrl.admin}${API_CONFIG.masters.sections}`, 'GET'] : null, swrFetcher, { revalidateOnFocus: false }
    );
    const { data: teachersData, isLoading: teachersLoading } = useSWR(
        user ? [`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.myTeachers}`, 'GET'] : null, swrFetcher, { revalidateOnFocus: false }
    );
    const { data: coursesData, isLoading: coursesLoading } = useSWR(
        user ? [`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getAllCourses}?email=${encodeURIComponent(user.uni_reg_id || user.email)}`, 'GET'] : null, swrFetcher, { revalidateOnFocus: false }
    );
    
    const masterBatches = Array.isArray(batchesData) ? batchesData : (batchesData?.batches || []);
    const masterSections = Array.isArray(sectionsData?.data) ? sectionsData.data : (Array.isArray(sectionsData) ? sectionsData : []);
    const masterTeachers = Array.isArray(teachersData) ? teachersData : [];
    
    let masterCourses = [];
    if (coursesData?.courses && Array.isArray(coursesData.courses)) masterCourses = coursesData.courses;
    else if (Array.isArray(coursesData)) masterCourses = coursesData;

    const [students, setStudents] = useState([]); // Students remain manual search

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

    // --- Home "Today" blocks (new workflow) ---
    const [liveSummary, setLiveSummary] = useState(null);        // { active_test_takers, ongoing_rooms, upcoming_rooms }
    const [attentionSections, setAttentionSections] = useState(null); // ranked worst-first
    const [recentItems, setRecentItems] = useState([]);          // localStorage-backed shortcuts

    const recordRecent = (type, label, payload) => {
        try {
            const key = 'educode_recent_items';
            const prev = JSON.parse(localStorage.getItem(key) || '[]');
            const next = [{ type, label, payload, ts: Date.now() },
                ...prev.filter(i => !(i.type === type && i.label === label))].slice(0, 5);
            localStorage.setItem(key, JSON.stringify(next));
            setRecentItems(next);
        } catch (e) { /* non-critical */ }
    };

    useEffect(() => {
        try { setRecentItems(JSON.parse(localStorage.getItem('educode_recent_items') || '[]')); } catch (e) { }
    }, []);

    // Fetch Today blocks once after auth (non-blocking, independent failures)
    useEffect(() => {
        if (authLoading || !user) return;
        const token = getAdminToken();
        const opts = { headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' };
        fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.liveSummary}`, opts)
            .then(r => r.json()).then(d => { if (d?.success) setLiveSummary(d.data); })
            .catch(() => setLiveSummary({ active_test_takers: 0, ongoing_rooms: 0, upcoming_rooms: 0 }));
        fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.needsAttention}`, opts)
            .then(r => r.json()).then(d => { if (d?.success) setAttentionSections(d.data.sections || []); })
            .catch(() => setAttentionSections([]));
    }, [authLoading, user]);

    // --- Exams tab state ---
    const [examsOverview, setExamsOverview] = useState(null);      // null = not loaded yet
    const [examsLoading, setExamsLoading] = useState(false);
    const [inspectingExam, setInspectingExam] = useState(null);    // exam aggregate object
    const [examStudents, setExamStudents] = useState([]);
    const [examStudentsLoading, setExamStudentsLoading] = useState(false);
    const [examStudentsPage, setExamStudentsPage] = useState(1);
    const [examStudentsTotal, setExamStudentsTotal] = useState(0);
    const [examSectionFilter, setExamSectionFilter] = useState('');
    const [examGridSearch, setExamGridSearch] = useState('');           // filters exam cards client-side
    const [sectionChipSearch, setSectionChipSearch] = useState('');     // filters section chips in drill-down
    const [examStudentSearch, setExamStudentSearch] = useState('');     // server-side student search
    const [examStudentsMode, setExamStudentsMode] = useState('attempted'); // 'attempted' | 'not_attempted'

    // Debounce the student search -> server
    useEffect(() => {
        if (!inspectingExam) return;
        const t = setTimeout(() => {
            loadExamStudents(inspectingExam, 1, examSectionFilter, examStudentSearch, examStudentsMode);
        }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examStudentSearch]);

    // --- Preload Section Matrices ---
    useEffect(() => {
        if (!user || !masterSections || masterSections.length === 0) return;
        const token = getAdminToken();
        if (!token) return;
        
        let isMounted = true;
        const fetchAll = async () => {
            for (const section of masterSections) {
                if (!isMounted) break;
                const sectionNameStr = typeof section === 'string' ? section : section?.section_name;
                if (!sectionNameStr) continue;
                
                const qs = new URLSearchParams({
                    section: sectionNameStr,
                    page: 1,
                    limit: 50,
                    sortBy: 'student_name',
                    order: 'asc',
                    search: ''
                }).toString();
                
                const key = [`${API_CONFIG.baseUrl.admin}/admin/analytics/section-matrix?${qs}`, 'GET'];
                
                try {
                    swrFetcher(key).then(data => {
                        if (isMounted) mutate(key, data, { revalidate: false });
                    }).catch(() => {});
                    // Stagger the network requests by 200ms to prevent flooding the backend
                    await new Promise(r => setTimeout(r, 200));
                } catch (e) {}
            }
        };
        fetchAll();

        return () => { isMounted = false; };
    }, [user, masterSections]);

    const filteredExamsOverview = React.useMemo(() => {
        if (!examsOverview) return null;
        const q = examGridSearch.trim().toLowerCase();
        if (!q) return examsOverview;
        return examsOverview.filter(e => (e.course_name || '').toLowerCase().includes(q));
    }, [examsOverview, examGridSearch]);

    const fetchExamsOverview = async () => {
        setExamsLoading(true);
        try {
            const token = getAdminToken();
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.examsOverview}`, {
                headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include'
            });
            const json = await res.json();
            if (json?.success) setExamsOverview(json.data.exams || []);
            else setExamsOverview([]);
        } catch (e) { console.error('Exams overview error', e); setExamsOverview([]); }
        finally { setExamsLoading(false); }
    };

    const loadExamStudents = async (exam, page = 1, sectionFilter = '', search = '', mode = 'attempted') => {
        setExamStudentsLoading(true);
        try {
            const token = getAdminToken();
            const queryParams = new URLSearchParams({
                course_id: exam.course_id,
                page,
                limit: 50,
                ...(sectionFilter && { section: sectionFilter }),
                ...(search && { search }),
                mode
            }).toString();
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.examAttemptedStudents}?${queryParams}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                credentials: 'include'
            });
            const json = await res.json();
            if (json?.success) {
                setExamStudents(json.data || []);
                setExamStudentsTotal(json.pagination?.total || 0);
                setExamStudentsPage(page);
            }
        } catch (e) { console.error('Exam students error', e); }
        finally { setExamStudentsLoading(false); }
    };

    const downloadExamCSV = async (exam) => {
        try {
            const token = getAdminToken();
            const allStudents = [];
            for (const mode of ['attempted', 'not_attempted']) {
                let page = 1, total = 0;
                do {
                    const qs = new URLSearchParams({ course_id: exam.course_id, page, limit: 200, mode }).toString();
                    const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.examAttemptedStudents}?${qs}`, {
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        credentials: 'include'
                    });
                    const json = await res.json();
                    if (!json?.success) break;
                    allStudents.push(...(json.data || []));
                    total = json.pagination?.total || 0;
                    page++;
                } while (allStudents.length < total);
            }
            if (!allStudents.length) { console.warn('No students from exam-attempted-students API'); return; }
            const envPromises = allStudents.map((st, idx) =>
                fetch(`${API_CONFIG.baseUrl.admin}/admin/analytics/exam-environment?student_id=${st.student_id}&course_id=${exam.course_id}`, {
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    credentials: 'include'
                }).then(r => r.json()).then(envJson => {
                    if (!envJson?.success) return;
                    const env = envJson.data || {};
                    const sc = env.start_config || {};
                    const ec = env.end_config || {};
                    st.start_timestamp = sc.timestamp || '';
                    st.start_captured_at = sc.capturedAt || '';
                    st.start_os_platform = sc.os?.platform ?? sc.osPlatform ?? '';
                    st.start_os_version = sc.os?.version ?? sc.osVersion ?? '';
                    st.start_os_release = sc.os?.release ?? sc.osRelease ?? '';
                    st.start_os_arch = sc.os?.arch ?? sc.osArch ?? '';
                    st.start_hostname = sc.os?.hostname ?? sc.hostname ?? '';
                    st.start_network = sc.network?.interfaces ? sc.network.interfaces.map(i => `${i.interface||''} IP:${i.ip||''} MAC:${i.mac||''}`).join('; ') : (sc.network ? JSON.stringify(sc.network) : '');
                    st.start_proxy = sc.proxy?.settings ? `Proxy: ${sc.proxy.settings}` : (sc.proxy ? JSON.stringify(sc.proxy) : '');
                    st.end_timestamp = ec.timestamp || '';
                    st.end_captured_at = ec.capturedAt || '';
                    st.end_os_platform = ec.os?.platform ?? ec.osPlatform ?? '';
                    st.end_os_version = ec.os?.version ?? ec.osVersion ?? '';
                    st.end_os_release = ec.os?.release ?? ec.osRelease ?? '';
                    st.end_os_arch = ec.os?.arch ?? ec.osArch ?? '';
                    st.end_hostname = ec.os?.hostname ?? ec.hostname ?? '';
                    st.end_network = ec.network?.interfaces ? ec.network.interfaces.map(i => `${i.interface||''} IP:${i.ip||''} MAC:${i.mac||''}`).join('; ') : (ec.network ? JSON.stringify(ec.network) : '');
                    st.end_proxy = ec.proxy?.settings ? `Proxy: ${ec.proxy.settings}` : (ec.proxy ? JSON.stringify(ec.proxy) : '');
                }).catch(() => {})
            );
            await Promise.all(envPromises);
            allStudents.sort((a, b) => (b.total_marks_obtained || 0) - (a.total_marks_obtained || 0));
            const columns = [
                { key: 'rank', label: 'Rank' },
                { key: 'student_name', label: 'Student Name' },
                { key: 'uni_reg_id', label: 'Registration ID' },
                { key: 'course_score_percent', label: 'Completion (%)' },
                { key: 'total_marks_obtained', label: 'Total Marks' },
                { key: 'coding_marks', label: 'Coding Marks' },
                { key: 'mcq_marks', label: 'MCQ Marks' },
                { key: 'duration', label: 'Duration (Minutes)' },
                { key: 'exam_submitted_at', label: 'Submitted At' },
                { key: 'exam_started_at', label: 'Started At' },
                { key: 'last_activity', label: 'Last Updated At' },
                { key: 'starting_ip', label: 'Starting IP Address' },
                { key: 'ending_ip', label: 'Ending IP Address' },
                { key: 'lost_focus_count', label: 'Lost Focus Count' },
                { key: 'regained_focus_count', label: 'Regained Focus Count' },
                { key: 'face_warnings', label: 'Face Detection Warnings' },
                { key: 'face_warnings_max', label: 'Maximum Face Warnings' },
                { key: 'internet_disconnects', label: 'Internet Disconnect Count' },
                { key: 'internet_offline_seconds', label: 'Offline Duration (Seconds)' },
                { key: 'blocked_by_proctor', label: 'Blocked by Proctor' },
                { key: 'blocked_seconds', label: 'Blocked Duration (Seconds)' },
                { key: 'compile_clicks', label: 'Compile Attempts' },
                { key: 'submit_clicks', label: 'Code Submission Attempts' },
                { key: 'continue_clicks', label: 'Continue Button Clicks' },
                { key: 'submit_reason', label: 'Submission Reason' },
                { key: 'start_timestamp', label: 'Start Timestamp' },
                { key: 'start_captured_at', label: 'Start Device Capture Time' },
                { key: 'start_os_platform', label: 'Start OS Platform' },
                { key: 'start_os_version', label: 'Start OS Version' },
                { key: 'start_os_release', label: 'Start OS Release' },
                { key: 'start_os_arch', label: 'Start OS Architecture' },
                { key: 'start_hostname', label: 'Start Hostname' },
                { key: 'start_network', label: 'Start Network Type' },
                { key: 'start_proxy', label: 'Start Proxy Status' },
                { key: 'end_timestamp', label: 'End Timestamp' },
                { key: 'end_captured_at', label: 'End Device Capture Time' },
                { key: 'end_os_platform', label: 'End OS Platform' },
                { key: 'end_os_version', label: 'End OS Version' },
                { key: 'end_os_release', label: 'End OS Release' },
                { key: 'end_os_arch', label: 'End OS Architecture' },
                { key: 'end_hostname', label: 'End Hostname' },
                { key: 'end_network', label: 'End Network Type' },
                { key: 'end_proxy', label: 'End Proxy Status' }
            ];
            const header = columns.map(c => c.label).join(',');
            const csv = [header, ...allStudents.map((r, i) => {
                r.rank = i + 1;
                const s = r.exam_started_at ? new Date(r.exam_started_at) : null;
                const e = r.exam_submitted_at ? new Date(r.exam_submitted_at) : (r.last_activity ? new Date(r.last_activity) : null);
                r.duration = (s && e) ? Math.round((e - s) / 60000) : (r.exam_duration_seconds ? Math.round(r.exam_duration_seconds / 60) : '');
                return columns.map(c => `"${r[c.key] ?? ''}"`).join(',');
            })].join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${exam.course_name.replace(/[^a-zA-Z0-9]/g, '_')}_export.csv`; a.click();
            URL.revokeObjectURL(url);
        } catch (e) { console.error('Export error', e); }
    };

    const openExamDrilldown = (exam) => {
        pushOverlayState();
        setInspectingExam(exam);
        setExamSectionFilter('');
        setSectionChipSearch('');
        setExamStudentSearch('');
        setExamStudentsMode('attempted');
        setExamStudents([]);
        loadExamStudents(exam, 1, '');
    };

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
        } else if (inspectingExam) {
            setInspectingExam(null);
        }
    }, [inspectingStudent, inspectingSection, inspectingCourse, inspectingTeacher, inspectingBatch, inspectingExam]);

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






    // --- Heuristic Client-Side Prefetching ---
    const trackClick = (tabId) => {
        if (!user) return;
        try {
            const key = `educode_tab_clicks_${user?.email || 'guest'}`;
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            data[tabId] = (data[tabId] || 0) + 1;
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) { }
    };

    useEffect(() => {
        if (!authLoading && user) {
            try {
                const key = `educode_tab_clicks_${user?.email || 'guest'}`;
                const data = JSON.parse(localStorage.getItem(key) || '{}');
                const sortedTabs = Object.entries(data).sort((a, b) => b[1] - a[1]);
                const topTabs = sortedTabs.slice(0, 2).map(entry => entry[0]);
                
                const allTabs = [
                    { id: 'batches', prefetch: () => preload([`${API_CONFIG.baseUrl.admin}/admin/dashboard/overview`, 'GET'], swrFetcher) },
                    { id: 'sections', prefetch: () => preload([`${API_CONFIG.baseUrl.admin}${API_CONFIG.masters.sections}`, 'GET'], swrFetcher) },
                    { id: 'teachers', prefetch: () => preload([`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.myTeachers}`, 'GET'], swrFetcher) },
                    { id: 'courses', prefetch: () => preload([`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getAllCourses}?email=${encodeURIComponent(user?.uni_reg_id || user?.email)}`, 'GET'], swrFetcher) },
                    { id: 'exams', prefetch: () => preload([`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.examsOverview}`, 'GET'], swrFetcher) },
                ];
                
                topTabs.forEach(tabId => {
                    const tab = allTabs.find(t => t.id === tabId);
                    if (tab && tab.prefetch) {
                        tab.prefetch();
                    }
                });
            } catch (e) { }
        }
    }, [authLoading, user]);

    // Computed loading state from SWR
    useEffect(() => {
        setLoading(
            (view === 'batches' && batchesLoading) ||
            (view === 'sections' && sectionsLoading) ||
            (view === 'teachers' && teachersLoading) ||
            (view === 'courses' && coursesLoading)
        );
    }, [view, batchesLoading, sectionsLoading, teachersLoading, coursesLoading]);

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

    // Computed Live Filtering from SWR cache
    const lowerQuery = searchQuery.toLowerCase().trim();
    
    const batches = masterBatches;
    
    const sections = lowerQuery 
        ? masterSections.filter(s => String(s).toLowerCase().includes(lowerQuery))
        : masterSections;
        
    const teachers = lowerQuery
        ? masterTeachers.filter(t => (t.teacher_name && t.teacher_name.toLowerCase().includes(lowerQuery)) || (t.uni_reg_id && String(t.uni_reg_id).toLowerCase().includes(lowerQuery)) || (t.teacher_email && t.teacher_email.toLowerCase().includes(lowerQuery)))
        : masterTeachers;
        
    const courses = lowerQuery
        ? masterCourses.filter(c => (c.course_name && c.course_name.toLowerCase().includes(lowerQuery)) || (c.course_code && c.course_code.toLowerCase().includes(lowerQuery)))
        : masterCourses;

    // --- Auth Loading Guard ---
    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
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
        recordRecent('section', sectionName, { section_name: sectionName });
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
        if (student?.student_name) recordRecent('student', student.student_name, student);
        pushOverlayState();
        setInspectingStudent(student);
    };

    // --- Deep Dive Actions ---

    const loadBatchCourses = async (batchId) => {
        setLoading(true);
        try {
            const data = await fetchWithAuth(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getPracticeCoursesByBatch}?batch_id=${encodeURIComponent(batchId)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
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
        <div className="min-h-screen neu-page text-[#111827] dark:text-gray-100 font-sans">
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

            {/* Exam Drill-down Overlay */}
            {inspectingExam && !inspectingStudent && (
                <PortalWrapper>
                <div className="fixed inset-0 z-[120] flex flex-col neu-page overflow-hidden font-sans animate-in fade-in slide-in-from-right duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 px-8 border-b border-[var(--neu-divider)] neu-raised shrink-0 z-20">
                        <div className="flex items-center gap-5">
                            <button onClick={() => window.history.back()} className="group p-3 rounded-2xl neu-raised transition-all duration-300 active:scale-95">
                                <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:-translate-x-1 transition-transform duration-300" />
                            </button>
                            <div>
                                <div className="text-xs text-amber-500 uppercase tracking-wider font-extrabold mb-1 flex items-center gap-2">
                                    <Trophy className="w-3.5 h-3.5" /> Exam Overview
                                </div>
                                <h2 className="text-xl font-bold text-[#111827] dark:text-white">{inspectingExam.course_name}</h2>
                            </div>
                        </div>
                        <button onClick={() => downloadExamCSV(inspectingExam)}
                            className="group px-4 py-2.5 rounded-2xl neu-raised text-sm font-bold text-[#6B7280] dark:text-gray-300 hover:text-[#111827] dark:hover:text-white flex items-center gap-2 transition-all active:scale-95">
                            <FileText className="w-4 h-4" /> Export CSV
                        </button>
                    </div>

                    <div className="flex-1 p-8 overflow-auto neu-page">
                        <div className="max-w-7xl mx-auto space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'Enrolled', value: inspectingExam.enrolled, icon: Users },
                                    { label: 'Attempted', value: inspectingExam.attempted, icon: GraduationCap },
                                    { label: 'Avg (Attempted)', value: inspectingExam.avg_attempted, icon: TrendingUp },
                                    { label: 'Avg (All)', value: inspectingExam.avg_all, icon: TrendingUp },
                                ].map((stat, i) => (
                                    <div key={i} className="p-4 rounded-2xl neu-raised">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 rounded-lg neu-tile flex items-center justify-center">
                                                <stat.icon className="w-4 h-4 neu-accent-text" />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{stat.label}</span>
                                        </div>
                                        <div className="text-2xl font-black text-[#111827] dark:text-white tabular-nums">{stat.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Section-wise breakdown */}
                            {inspectingExam.sections?.length > 0 && (
                                <div className="neu-raised rounded-[24px] p-5">
                                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                                        <h3 className="text-sm font-bold text-[#111827] dark:text-white">Section-wise (attempted avg)</h3>
                                        {inspectingExam.sections.length > 8 && (
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                                                <input type="text" placeholder="Filter sections..." value={sectionChipSearch}
                                                    onChange={(e) => setSectionChipSearch(e.target.value)}
                                                    className="pl-9 pr-3 py-1.5 neu-inset rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] outline-none w-44" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => { setExamSectionFilter(''); loadExamStudents(inspectingExam, 1, '', examStudentSearch, examStudentsMode); }}
                                            className={`neu-badge text-[11px] cursor-pointer ${examSectionFilter === '' ? 'neu-badge-achieve' : ''}`}>
                                            All sections
                                        </button>
                                        {inspectingExam.sections
                                            .filter(s => !sectionChipSearch.trim() || s.section.toLowerCase().includes(sectionChipSearch.trim().toLowerCase()))
                                            .map(s => (
                                            <button key={s.section}
                                                onClick={() => { setExamSectionFilter(s.section); loadExamStudents(inspectingExam, 1, s.section, examStudentSearch, examStudentsMode); }}
                                                className={`neu-badge text-[11px] cursor-pointer tabular-nums ${examSectionFilter === s.section ? 'neu-badge-achieve' : ''}`}>
                                                {s.section} · {s.avg_attempted} avg · {s.attempted}/{s.enrolled}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Students table (paginated — safe for large cohorts) */}
                            <div className="neu-raised rounded-[24px] overflow-hidden">
                                <div className="flex items-center justify-between gap-3 p-4 px-5 border-b border-[var(--neu-divider)] flex-wrap">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="text-sm font-bold text-[#111827] dark:text-white">
                                            {examStudentsMode === 'attempted' ? 'Attempted' : 'Not Attempted'} Students <span className="text-[#94A3B8] font-semibold">({examStudentsTotal})</span>
                                        </h3>
                                        {/* Attempted / Not-attempted toggle */}
                                        <div className="flex gap-1 neu-inset rounded-full p-1">
                                            {[['attempted', 'Attempted'], ['not_attempted', 'Not Attempted']].map(([m, lbl]) => (
                                                <button key={m}
                                                    onClick={() => { setExamStudentsMode(m); loadExamStudents(inspectingExam, 1, examSectionFilter, examStudentSearch, m); }}
                                                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${examStudentsMode === m ? 'neu-btn-primary' : 'text-[#6B7280] dark:text-gray-400'}`}>
                                                    {lbl}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Student search (server-side, debounced) */}
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                                            <input type="text" placeholder="Search name or reg ID..." value={examStudentSearch}
                                                onChange={(e) => setExamStudentSearch(e.target.value)}
                                                className="pl-9 pr-3 py-1.5 neu-inset rounded-xl text-xs text-[#111827] dark:text-white placeholder-[#94A3B8] outline-none w-52" />
                                        </div>
                                    </div>
                                    {examStudentsTotal > 50 && (
                                        <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] dark:text-gray-400">
                                            <button
                                                disabled={examStudentsPage <= 1 || examStudentsLoading}
                                                onClick={() => loadExamStudents(inspectingExam, examStudentsPage - 1, examSectionFilter, examStudentSearch, examStudentsMode)}
                                                className="neu-badge cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
                                            <span className="tabular-nums">Page {examStudentsPage} / {Math.max(1, Math.ceil(examStudentsTotal / 50))}</span>
                                            <button
                                                disabled={examStudentsPage >= Math.ceil(examStudentsTotal / 50) || examStudentsLoading}
                                                onClick={() => loadExamStudents(inspectingExam, examStudentsPage + 1, examSectionFilter, examStudentSearch, examStudentsMode)}
                                                className="neu-badge cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
                                        </div>
                                    )}
                                </div>
                                {examStudentsLoading ? (
                                    <div className="p-6"><ListSkeleton /></div>
                                ) : examStudents.length === 0 ? (
                                    <div className="p-12 text-center text-[#94A3B8] dark:text-gray-500 text-sm font-medium">
                                        No {examStudentsMode === 'attempted' ? 'attempted' : 'non-attempted'} students{examSectionFilter ? ` in ${examSectionFilter}` : ''}{examStudentSearch ? ` matching "${examStudentSearch}"` : ''}.
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="border-b border-[var(--neu-divider)]">
                                            <tr>
                                                <th className="p-3 px-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">#</th>
                                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reg ID</th>
                                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Section</th>
                                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Marks</th>
                                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">MCQ</th>
                                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Coding</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--neu-divider)]">
                                            {examStudents.map((s, i) => (
                                                <tr key={s.student_id || i}
                                                    onClick={() => startStudentInspection({ ...s, student_name: s.student_name, uni_reg_id: s.uni_reg_id })}
                                                    className="hover:bg-[var(--neu-achieve-soft)] transition-colors cursor-pointer">
                                                    <td className="p-3 px-5 text-sm font-bold text-[#94A3B8] tabular-nums">{(examStudentsPage - 1) * 50 + i + 1}</td>
                                                    <td className="p-3 text-sm font-semibold text-[#111827] dark:text-white">{s.student_name || '—'}</td>
                                                    <td className="p-3 text-sm text-[#6B7280] dark:text-gray-400 tabular-nums">{s.uni_reg_id || '—'}</td>
                                                    <td className="p-3"><span className="neu-inset text-[11px] font-semibold px-2 py-0.5 rounded-full text-[#6B7280] dark:text-gray-400">{s.section || '—'}</span></td>
                                                    <td className="p-3 text-center text-sm font-bold text-[#111827] dark:text-white tabular-nums">{s.total_marks_obtained ?? 0}</td>
                                                    <td className="p-3 text-center text-sm text-[#6B7280] dark:text-gray-400 tabular-nums">{s.mcq_marks ?? '—'}</td>
                                                    <td className="p-3 text-center text-sm text-[#6B7280] dark:text-gray-400 tabular-nums">{s.coding_marks ?? '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                </PortalWrapper>
            )}

            {/* Main Dashboard */}
            <div className={`transition-opacity duration-200 ${(inspectingStudent || inspectingSection || inspectingCourse || inspectingBatch || inspectingTeacher || inspectingExam) ? 'opacity-0 pointer-events-none fixed inset-0' : 'opacity-100'}`}>

                {/* ===== HERO HEADER ===== */}
                <div className="relative rounded-[26px] mb-6 neu-raised">
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
                            <div className="neu-inset rounded-2xl px-5 py-4 text-center min-w-[96px] transition-transform duration-200 hover:scale-[1.02]">
                                <div className="text-[26px] leading-8 font-bold text-[#111827] dark:text-white tabular-nums">{batches.length}</div>
                                <div className="text-[11px] font-semibold text-[#6B7280] dark:text-violet-300 uppercase tracking-wide mt-0.5">Batches</div>
                            </div>
                            <div className="neu-inset rounded-2xl px-5 py-4 text-center min-w-[96px] transition-transform duration-200 hover:scale-[1.02]">
                                <div className="text-[26px] leading-8 font-bold text-[#111827] dark:text-white tabular-nums">{sections.length}</div>
                                <div className="text-[11px] font-semibold text-[#6B7280] dark:text-emerald-300 uppercase tracking-wide mt-0.5">Sections</div>
                            </div>
                            <div className="neu-inset rounded-2xl px-5 py-4 text-center min-w-[96px] transition-transform duration-200 hover:scale-[1.02]">
                                <div className="text-[26px] leading-8 font-bold text-[#111827] dark:text-white tabular-nums">{courses.length}</div>
                                <div className="text-[11px] font-semibold text-[#6B7280] dark:text-amber-300 uppercase tracking-wide mt-0.5">Courses</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== TODAY STRIP: answers with zero clicks ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

                    {/* Live now */}
                    <div className="neu-raised rounded-[24px] p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-8 h-8 rounded-xl neu-chip neu-chip-danger flex items-center justify-center"><Clock className="w-4 h-4" /></span>
                            <h3 className="font-bold text-[#111827] dark:text-white text-sm">Live right now</h3>
                        </div>
                        {liveSummary === null ? (
                            <Skeleton className="h-10 rounded-xl" />
                        ) : (liveSummary.active_test_takers > 0 || liveSummary.ongoing_rooms > 0) ? (
                            <div className="flex flex-wrap gap-2">
                                <Link href="/dashboard/live-exams" className="neu-badge neu-badge-danger">
                                    {liveSummary.active_test_takers} student{liveSummary.active_test_takers === 1 ? '' : 's'} taking exams →
                                </Link>
                                <Link href="/dashboard/live-roster" className="neu-badge neu-badge-warn">
                                    {liveSummary.ongoing_rooms} room{liveSummary.ongoing_rooms === 1 ? '' : 's'} ongoing →
                                </Link>
                            </div>
                        ) : (
                            <p className="text-sm text-[#6B7280] dark:text-gray-400">
                                No exams running.{liveSummary.upcoming_rooms > 0 ? ` ${liveSummary.upcoming_rooms} scheduled — ` : ' '}
                                {liveSummary.upcoming_rooms > 0 && <Link href="/dashboard/live-roster" className="text-[var(--neu-accent)] font-semibold">view schedule</Link>}
                            </p>
                        )}
                    </div>

                    {/* Needs attention */}
                    <div className="neu-raised rounded-[24px] p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-8 h-8 rounded-xl neu-chip neu-chip-warn flex items-center justify-center"><AlertCircle className="w-4 h-4" /></span>
                            <h3 className="font-bold text-[#111827] dark:text-white text-sm">Needs attention</h3>
                        </div>
                        {attentionSections === null ? (
                            <Skeleton className="h-10 rounded-xl" />
                        ) : attentionSections.length === 0 ? (
                            <p className="text-sm text-[#6B7280] dark:text-gray-400">No practice data yet — nothing to flag.</p>
                        ) : (
                            <div className="space-y-2">
                                {attentionSections.slice(0, 3).map(s => (
                                    <button key={s.section} onClick={() => handleSectionClick(s.section)}
                                        className="w-full flex items-center justify-between neu-inset rounded-xl px-3 py-2 text-left neu-hover">
                                        <span className="text-sm font-semibold text-[#111827] dark:text-white">{s.section}</span>
                                        <span className="flex items-center gap-2">
                                            {s.at_risk_count > 0 && <span className="neu-badge neu-badge-danger text-[10px]">{s.at_risk_count} below 40%</span>}
                                            <span className="text-xs font-bold text-[#6B7280] dark:text-gray-400 tabular-nums">{s.avg_score}% avg</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recently viewed */}
                    <div className="neu-raised rounded-[24px] p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-8 h-8 rounded-xl neu-chip neu-chip-info flex items-center justify-center"><Search className="w-4 h-4" /></span>
                            <h3 className="font-bold text-[#111827] dark:text-white text-sm">Pick up where you left off</h3>
                        </div>
                        {recentItems.length === 0 ? (
                            <p className="text-sm text-[#6B7280] dark:text-gray-400">
                                Sections and students you open will appear here for one-click return.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {recentItems.map((item, i) => (
                                    <button key={i}
                                        onClick={() => item.type === 'section' ? handleSectionClick(item.label) : startStudentInspection(item.payload)}
                                        className={`neu-badge ${item.type === 'section' ? 'neu-badge-achieve' : 'neu-badge-info'}`}>
                                        {item.type === 'section' ? <Layers className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== TOOLBAR: pill tabs + search ===== */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    {/* Pill Tabs */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 neu-raised rounded-full p-1.5 w-fit max-w-full">
                        {[
                            { id: 'batches', label: 'Batches', icon: LayoutGrid, count: batches.length, prefetch: () => preload([`${API_CONFIG.baseUrl.admin}/admin/dashboard/overview`, 'GET'], swrFetcher) },
                            { id: 'sections', label: 'Sections', icon: Layers, count: sections.length, prefetch: () => preload([`${API_CONFIG.baseUrl.admin}${API_CONFIG.masters.sections}`, 'GET'], swrFetcher) },
                            { id: 'teachers', label: 'Teachers', icon: Users, count: teachers.length, prefetch: () => preload([`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.myTeachers}`, 'GET'], swrFetcher) },
                            { id: 'students', label: 'Students', icon: GraduationCap },
                            { id: 'courses', label: 'Courses', icon: BookOpen, count: courses.length, prefetch: () => preload([`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getAllCourses}?email=${encodeURIComponent(user?.uni_reg_id || user?.email)}`, 'GET'], swrFetcher) },
                            { id: 'exams', label: 'Exams', icon: Trophy, count: examsOverview?.length, prefetch: () => preload([`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.examsOverview}`, 'GET'], swrFetcher) },
                        ].map(item => (
                            <button
                                key={item.id}
                                onMouseEnter={item.prefetch}
                                onClick={() => { setView(item.id); trackClick(item.id); setSearchQuery(''); if (item.id === 'exams' && examsOverview === null) fetchExamsOverview(); }}
                                className={`flex items-center gap-2 pl-4 pr-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${view === item.id
                                    ? 'neu-btn-primary'
                                    : 'text-[#6B7280] dark:text-gray-400 hover:text-[#111827] dark:hover:text-white hover:bg-[#F6F4F0] dark:hover:bg-slate-700/50'}`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                                {item.count > 0 && (
                                    <span className={`text-xs tabular-nums px-2 py-0.5 rounded-full font-bold ${view === item.id ? 'bg-white/20 text-white' : 'neu-inset text-[#94A3B8] dark:text-gray-400'}`}>
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
                                className="w-full h-11 neu-inset rounded-[14px] pl-11 pr-9 text-sm text-[#111827] dark:text-white placeholder-[#94A3B8] dark:placeholder-gray-500 outline-none focus:border-[#7C3AED] dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition"
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
                                            className="group relative text-left neu-raised rounded-[24px] neu-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                        >
                                            <div className="p-6">
                                                <div className="flex items-start justify-between gap-3 mb-4">
                                                    <div className="w-12 h-12 rounded-2xl neu-tile flex items-center justify-center shrink-0">
                                                        <LayoutGrid className="w-6 h-6 neu-accent-text" />
                                                    </div>
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isActive
                                                        ? 'neu-tile text-[#10B981] dark:text-emerald-400'
                                                        : 'neu-inset text-[#94A3B8] dark:text-gray-400'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#10B981] animate-pulse' : 'bg-[#94A3B8]'}`} />
                                                        {status.label}
                                                    </span>
                                                </div>

                                                <h3 className="text-lg font-bold text-[#111827] dark:text-white line-clamp-2 mb-4 group-hover:text-[var(--neu-accent)] transition-colors" title={batch.batch_name}>
                                                    {batch.batch_name}
                                                </h3>

                                                <div className="flex gap-3 mb-4">
                                                    <div className="flex-1 rounded-2xl neu-inset px-4 py-3">
                                                        <div className="text-xl font-bold tabular-nums text-[#111827] dark:text-white">{batch.batch_student_strength}</div>
                                                        <div className="text-[11px] font-semibold text-[#94A3B8] dark:text-gray-500 uppercase tracking-wide">Students</div>
                                                    </div>
                                                    <div className="flex-1 rounded-2xl neu-inset px-4 py-3">
                                                        <div className="text-xl font-bold tabular-nums text-[#111827] dark:text-white">{batch.registered_courses_id?.length || 0}</div>
                                                        <div className="text-[11px] font-semibold text-[#94A3B8] dark:text-gray-500 uppercase tracking-wide">Courses</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-gray-400 pt-3 border-t border-[var(--neu-dark)] dark:border-white/5">
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                                                        {new Date(batch.starting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        {' - '}
                                                        {new Date(batch.ending_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 neu-accent-text group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                            {!loading && batches.length === 0 && (
                                <div className="col-span-full flex flex-col items-center py-24 text-[#94A3B8] dark:text-gray-500">
                                    <div className="w-16 h-16 rounded-[20px] neu-raised flex items-center justify-center mb-4">
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
                                        className="group relative text-left neu-raised rounded-[24px] neu-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                    >
                                        <div className="p-5 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl neu-tile flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                <Layers className="w-6 h-6 text-[#10B981] dark:text-emerald-400" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-base font-bold text-[#111827] dark:text-white truncate group-hover:text-[var(--neu-accent)] transition-colors">{sec}</div>
                                                <div className="text-xs font-medium text-[#94A3B8] dark:text-gray-500 mt-0.5">Section</div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 shrink-0 text-[#94A3B8] group-hover:text-[var(--neu-accent)] group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </button>
                                ))
                            )}
                            {!loading && sections.length === 0 && (
                                <div className="col-span-full flex flex-col items-center py-24 text-[#94A3B8] dark:text-gray-500">
                                    <div className="w-16 h-16 rounded-[20px] neu-raised flex items-center justify-center mb-4">
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
                                    <div key={idx} className="group relative flex flex-col neu-raised rounded-[24px] neu-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                                        <div className="p-6 flex-1">
                                            <div className="flex items-center gap-4 mb-5">
                                                <div className="w-12 h-12 rounded-full neu-tile flex items-center justify-center shrink-0 neu-accent-text text-sm font-bold">
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
                                                <div className="flex justify-between items-center rounded-2xl neu-inset px-4 py-2.5">
                                                    <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8] dark:text-gray-500">Reg ID</span>
                                                    <span className="font-mono text-[13px] font-bold text-[#111827] dark:text-gray-200">{t.uni_reg_id || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8] dark:text-gray-500 mb-2">Sections</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {t.assigned_section && Array.isArray(t.assigned_section) && t.assigned_section.length > 0 ? (
                                                            t.assigned_section.map((sec, i) => (
                                                                <span key={i} className="px-2.5 py-1 rounded-full neu-tile text-[#10B981] dark:text-emerald-400 text-xs font-semibold">
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
                                                className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-[14px] neu-btn-primary text-sm font-semibold"
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
                                    <div className="w-16 h-16 rounded-[20px] neu-raised flex items-center justify-center mb-4">
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
                                            <div className="w-16 h-16 rounded-full neu-inset flex items-center justify-center mb-4">
                                                <GraduationCap className="w-8 h-8 neu-accent-text" />
                                            </div>
                                            <p className="text-sm font-medium">
                                                {hasSearched ? 'No student found with that ID' : 'Search for a student by Uni Reg ID'}
                                            </p>
                                        </div>
                                    )}
                                    {students.map((student, idx) => (
                                        <div key={idx} className="group relative flex items-center justify-between neu-raised rounded-[24px] px-6 py-5 neu-hover hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-12 h-12 rounded-full neu-tile flex items-center justify-center neu-accent-text text-base font-bold shrink-0">
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
                                                className="shrink-0 inline-flex items-center gap-1.5 h-10 px-5 rounded-[14px] neu-btn-primary text-sm font-semibold"
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
                                        className="group relative flex items-center gap-4 text-left neu-raised rounded-[24px] p-5 neu-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                    >
                                        <div className="w-12 h-12 rounded-2xl neu-tile flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                            <BookOpen className="w-6 h-6 neu-accent-text" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-[15px] font-bold text-[#111827] dark:text-white line-clamp-2 group-hover:text-[var(--neu-accent)] transition-colors" title={course.course_name}>
                                                {course.course_name || 'Untitled Course'}
                                            </h3>
                                            <p className="text-xs font-medium text-[#94A3B8] dark:text-gray-500 mt-0.5">Course</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 shrink-0 text-[#94A3B8] group-hover:text-[var(--neu-accent)] group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))
                            )}
                            {!loading && courses.length === 0 && (
                                <div className="col-span-full flex flex-col items-center py-24 text-[#94A3B8] dark:text-gray-500">
                                    <div className="w-16 h-16 rounded-[20px] neu-raised flex items-center justify-center mb-4">
                                        <BookOpen className="w-7 h-7 opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium">No courses found</p>
                                </div>
                            )}
                        </div>
                    )}
                    {/* View: Exams */}
                    {view === 'exams' && (
                        <>
                        <div className="flex justify-end mb-4">
                            <div className="relative w-full lg:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                                <input type="text" placeholder="Search exams..." value={examGridSearch}
                                    onChange={(e) => setExamGridSearch(e.target.value)}
                                    className="w-full h-11 neu-inset rounded-[14px] pl-11 pr-9 text-sm text-[#111827] dark:text-white placeholder-[#94A3B8] dark:placeholder-gray-500 outline-none transition" />
                                {examGridSearch && (
                                    <button onClick={() => setExamGridSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">×</button>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {(examsLoading || examsOverview === null) ? (
                                <><BatchSkeleton /><BatchSkeleton /><BatchSkeleton /></>
                            ) : filteredExamsOverview.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center py-24 text-[#94A3B8] dark:text-gray-500">
                                    <div className="w-16 h-16 rounded-[20px] neu-raised flex items-center justify-center mb-4">
                                        <Trophy className="w-7 h-7 opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium">{examGridSearch ? `No exams match "${examGridSearch}"` : 'No exam data found'}</p>
                                </div>
                            ) : (
                                filteredExamsOverview.map((exam) => (
                                    <button
                                        key={exam.course_id}
                                        onClick={() => openExamDrilldown(exam)}
                                        className="group relative text-left neu-raised rounded-[24px] p-6 neu-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                    >
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-11 h-11 rounded-2xl neu-tile flex items-center justify-center shrink-0">
                                                <Trophy className="w-5 h-5 text-amber-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-[15px] font-bold text-[#111827] dark:text-white line-clamp-2 group-hover:text-[var(--neu-accent)] transition-colors" title={exam.course_name}>
                                                    {exam.course_name || 'Untitled Exam'}
                                                </h3>
                                                <p className="text-xs font-medium text-[#94A3B8] dark:text-gray-500 mt-0.5">
                                                    {exam.attempted} of {exam.enrolled} attempted
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            <div className="neu-inset rounded-xl px-2 py-2.5 text-center">
                                                <div className="text-lg font-bold text-[#111827] dark:text-white tabular-nums">{exam.avg_attempted}</div>
                                                <div className="text-[9px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wide">Avg (Attempted)</div>
                                            </div>
                                            <div className="neu-inset rounded-xl px-2 py-2.5 text-center">
                                                <div className="text-lg font-bold text-[#111827] dark:text-white tabular-nums">{exam.avg_all}</div>
                                                <div className="text-[9px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wide">Avg (All)</div>
                                            </div>
                                            <div className="neu-inset rounded-xl px-2 py-2.5 text-center">
                                                <div className="text-lg font-bold text-[#111827] dark:text-white tabular-nums">{exam.highest}</div>
                                                <div className="text-[9px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wide">Highest</div>
                                            </div>
                                        </div>
                                        {exam.sections?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {exam.sections.slice(0, 4).map(s => (
                                                    <span key={s.section} className="neu-inset text-[10px] font-semibold text-[#6B7280] dark:text-gray-400 px-2 py-1 rounded-full tabular-nums">
                                                        {s.section}: {s.avg_attempted} avg · {s.attempted}/{s.enrolled}
                                                    </span>
                                                ))}
                                                {exam.sections.length > 4 && (
                                                    <span className="text-[10px] font-semibold text-[#94A3B8] px-1 py-1">+{exam.sections.length - 4} more</span>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                        </>
                    )}
                </main>

                {/* --- MODALS --- */}

                {/* Batch Courses Modal */}
                {selectedBatch && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0F172A]/30 dark:bg-black/60 backdrop-blur-sm" onClick={closeAll}>
                        <div className="neu-raised rounded-[24px] w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-[#111827] dark:text-white mb-4">Courses in Batch</h3>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {batchCourses.map((c, i) => (
                                    <div key={i} className="px-4 py-3 neu-inset rounded-2xl text-sm font-medium text-[#111827] dark:text-gray-300">{c.course_name}</div>
                                ))}
                            </div>
                            <button onClick={closeAll} className="mt-5 w-full h-10 rounded-[14px] neu-btn-secondary text-sm font-semibold transition-colors">Close</button>
                        </div>
                    </div>
                )}

                {/* Section Students Modal */}
                {selectedSection && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0F172A]/30 dark:bg-black/60 backdrop-blur-sm" onClick={closeAll}>
                        <div className="neu-raised rounded-[24px] w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-[#111827] dark:text-white mb-4">Section {selectedSection}</h3>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {sectionStudents.map((s, i) => (
                                    <div key={i} className="flex justify-between items-center px-4 py-3 neu-inset rounded-2xl">
                                        <span className="text-sm font-medium text-[#111827] dark:text-gray-300">{s.name} ({s.reg_id})</span>
                                        <button onClick={() => startStudentInspection(s)} className="text-xs font-semibold neu-accent-text px-3 py-1.5 rounded-full neu-inset hover:bg-[#E7DBF7] dark:hover:bg-violet-500/20 transition-colors">Inspect</button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={closeAll} className="mt-5 w-full h-10 rounded-[14px] neu-btn-secondary text-sm font-semibold transition-colors">Close</button>
                        </div>
                    </div>
                )}

                {/* Error Modal */}
                {showError && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0F172A]/30 dark:bg-black/60 backdrop-blur-sm">
                        <div className="neu-raised p-6 rounded-[24px] max-w-sm w-full text-center">
                            <div className="w-14 h-14 bg-[#FEF2F2] dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-7 h-7 text-[#EF4444] dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-[#111827] dark:text-white mb-1.5">Student Not Found</h3>
                            <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-5">The Registration ID you entered does not exist in our records.</p>
                            <button
                                onClick={() => setShowError(false)}
                                className="w-full h-10 rounded-[14px] neu-btn-secondary text-sm font-semibold transition-colors"
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
