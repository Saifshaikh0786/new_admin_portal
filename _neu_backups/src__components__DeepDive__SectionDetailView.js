import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Users, TrendingUp, AlertCircle, Search, ArrowUpDown, UserX, UserCheck, Loader2, Trophy, Medal, Timer, Clock, Hash, ChevronDown, ChevronUp, Award, Download, Eye, EyeOff, Wifi, WifiOff, ShieldAlert, MousePointerClick, Activity } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { Skeleton, SectionDetailSkeleton } from './Skeletons';
import { API_CONFIG } from '@/utils/api';
import { getAdminToken } from '@/utils/cookies';
import PortalWrapper from './PortalWrapper';

export default function SectionDetailView({ section, teachers = [], onBack, onStudentSelect, user, cache = {}, onUpdateCache }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'student_name', direction: 'asc' });
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalStudents, setTotalStudents] = useState(0);
    const itemsPerPage = 50;

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const getInitialCompletions = () => {
        const sectionName = typeof section === 'string' ? section : section.section_name || section;
        return cache[sectionName] || {};
    };

    const [courseCompletions, setCourseCompletions] = useState(getInitialCompletions());
    const [examDataMap, setExamDataMap] = useState({});

    // Progress Loading State
    const [progressData, setProgressData] = useState({});
    const [loadingProgress, setLoadingProgress] = useState(false);
    const [progressLoaded, setProgressLoaded] = useState(false);
    const [progressCount, setProgressCount] = useState({ current: 0, total: 0 });

    const sectionName = typeof section === 'string' ? section : section?.section_name || '';
    const userId = user?.university_id || user?.universityId || user?.id;

    // Helper functions
    const getStudentDisplayName = (student) => {
        if (student.student_name && student.student_name.trim()) {
            return student.student_name;
        }
        return null;
    };

    const isStudentRegistered = (student) => {
        return student.student_name && student.student_name.trim() !== '';
    };

    // Fetch Progress Function
    const fetchProgress = async (courses) => {
        // Optimized: Progress is now fetched in a single pass via section-matrix API
        setProgressLoaded(true);
    };

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!sectionName) return;

            setLoading(true);
            try {
                // Optimized: Now using unified POST /api/admin/analytics/section-matrix
                const url = `${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.sectionAnalytics(sectionName)}`;
                const token = getAdminToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                const res = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ 
                        section: sectionName,
                        page: currentPage,
                        limit: itemsPerPage,
                        sortBy: sortConfig.key,
                        order: sortConfig.direction,
                        search: debouncedSearchQuery
                    }),
                    credentials: 'include'
                });
                const json = await res.json();

                if (json.success && json.data) {
                    setData(json.data);
                    if (json.data.total_students) {
                        setTotalStudents(json.data.total_students);
                    }

                    const newExamMap = {};
                    const newCompletions = { ...courseCompletions };
                    const newProgressData = {};
                    let hasCompUpdates = false;

                    const courses = json.data.course_performance || [];
                    const students = json.data.student_performance || [];

                    // Initialize data structures
                    courses.forEach(c => {
                        newProgressData[c.course_id] = {};
                        if (c.average_score !== undefined) {
                            newCompletions[c.course_id] = c.average_score;
                            hasCompUpdates = true;
                            if (onUpdateCache) onUpdateCache(sectionName, c.course_id, c.average_score);
                        }
                    });

                    // Parse student performance directly from the matrix (0 API calls!)
                    students.forEach(s => {
                        (s.courses || []).forEach(c => {
                            if (c.is_exam) {
                                if (!newExamMap[c.course_id]) newExamMap[c.course_id] = { course_id: c.course_id, course_name: c.course_name, students: [] };
                                
                                let coding_marks = c.result_type?.toLowerCase() === 'coding' ? (c.marks_obtained || 0) : 0;
                                let mcq_marks = c.result_type?.toLowerCase() === 'mcq' ? (c.marks_obtained || 0) : 0;
                                
                                let existingStudent = newExamMap[c.course_id].students.find(es => (es.uni_reg_id && es.uni_reg_id === s.uni_reg_id) || es.student_name === s.student_name);
                                
                                if (existingStudent) {
                                    existingStudent.total_marks = (existingStudent.total_marks || 0) + (c.marks_obtained || 0);
                                    existingStudent.coding_marks = (existingStudent.coding_marks || 0) + coding_marks;
                                    existingStudent.mcq_marks = (existingStudent.mcq_marks || 0) + mcq_marks;
                                    existingStudent.exam_completion_percentage = Math.round(((existingStudent.exam_completion_percentage || 0) + (c.score_percent || 0)) / 2);
                                    if ((c.attempt_count || 0) > (existingStudent.attempt_count || 0)) existingStudent.attempt_count = c.attempt_count;
                                    
                                    if (c.result_type?.toLowerCase() === 'mcq' && c.submitted_at) existingStudent.mcq_submitted_at = c.submitted_at;
                                    if (c.result_type?.toLowerCase() === 'coding' && c.submitted_at) existingStudent.coding_submitted_at = c.submitted_at;
                                    
                                    if (c.status && c.status !== 'Pending') existingStudent.status = c.status;
                                    
                                    // Merge analytics if available
                                    if (c.analytics) {
                                        existingStudent.analytics = { ...existingStudent.analytics, ...c.analytics };
                                        if (c.analytics.debug_configs) {
                                            existingStudent.debug_configs = c.analytics.debug_configs;
                                        }
                                    }
                                } else {
                                    newExamMap[c.course_id].students.push({
                                        student_name: s.student_name,
                                        uni_reg_id: s.uni_reg_id,
                                        total_marks: c.marks_obtained || 0,
                                        coding_marks,
                                        mcq_marks,
                                        exam_completion_percentage: c.score_percent || 0,
                                        status: c.status,
                                        attempt_count: c.attempt_count || 0,
                                        mcq_submitted_at: c.result_type?.toLowerCase() === 'mcq' ? c.submitted_at : null,
                                        coding_submitted_at: c.result_type?.toLowerCase() === 'coding' ? c.submitted_at : null,
                                        analytics: c.analytics || {},
                                        debug_configs: c.analytics?.debug_configs || null
                                    });
                                }
                            } else {
                                newProgressData[c.course_id][s.student_name] = c.score_percent || 0;
                            }
                        });
                    });

                    if (hasCompUpdates) setCourseCompletions(newCompletions);
                    setExamDataMap(newExamMap);
                    setProgressData(newProgressData);
                    setProgressLoaded(true);
                }
            } catch (error) {
                console.error("Failed to fetch section analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [sectionName, currentPage, sortConfig, debouncedSearchQuery]);

    // Derived Analytics
    const regularCourses = React.useMemo(() => {
        if (!data?.course_performance) return [];
        return data.course_performance.filter(c => !c.is_exam);
    }, [data]);

    const examCourses = React.useMemo(() => {
        if (!data?.course_performance) return [];
        return data.course_performance.filter(c => c.is_exam);
    }, [data]);

    const [inspectingTest, setInspectingTest] = useState(null);
    const [sectionView, setSectionView] = useState('students'); // 'students' or 'tests'
    const [selectedExamCourse, setSelectedExamCourse] = useState(null);

    // Sorted and categorized students
    const sortedStudents = React.useMemo(() => {
        if (!data?.student_performance) return { registered: [], unregistered: [] };

        const filtered = data.student_performance;

        // Separate registered and unregistered students
        const registeredStudents = filtered.filter(s => s.student_name && s.student_name.trim() !== '');
        const unregisteredStudents = filtered.filter(s => !s.student_name || s.student_name.trim() === '');

        return { registered: registeredStudents, unregistered: unregisteredStudents };
    }, [data]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1); // Reset to page 1 on sort
    };

    // Export Logic
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [isExportingAllTests, setIsExportingAllTests] = useState(false);

    // Export Config Modal State
    const [showExportModal, setShowExportModal] = useState(false);
    const [courseStructures, setCourseStructures] = useState({});
    const [loadingStructures, setLoadingStructures] = useState(false);
    const [exportConfig, setExportConfig] = useState({
        selectedUnits: new Set(),
        includeOverall: true,
        includeMCQ: true,
        includeCoding: true
    });

    const fetchCourseStructures = async () => {
        setLoadingStructures(true);
        try {
            const structures = {};
            const allUnitKeys = new Set();
            const token = getAdminToken();

            await Promise.all(regularCourses.map(async (course) => {
                try {
                    const headers = {};
                    if (token) headers['Authorization'] = `Bearer ${token}`;
                    const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.courseStructure(course.course_id)}`, {
                        credentials: 'include',
                        headers
                    });
                    const json = await res.json();
                    const units = json.data || [];
                    structures[course.course_id] = {
                        name: course.course_name,
                        units: units.map(u => ({
                            unit_id: u.unit_id,
                            unit_name: u.unit_name || u.unit_title || 'Unit',
                            unit_title: u.unit_title || u.unit_name || null
                        }))
                    };
                    units.forEach(u => allUnitKeys.add(`${course.course_id}-${u.unit_id}`));
                } catch (e) {
                    console.error(`Failed to fetch structure for course ${course.course_id}`, e);
                }
            }));

            setCourseStructures(structures);
            setExportConfig(prev => ({ ...prev, selectedUnits: allUnitKeys }));
        } catch (e) {
            console.error('Failed to fetch course structures', e);
        } finally {
            setLoadingStructures(false);
        }
    };

    const handleOpenExport = () => {
        setShowExportModal(true);
        if (Object.keys(courseStructures).length === 0) {
            fetchCourseStructures();
        }
    };

    const toggleExportUnit = (key) => {
        setExportConfig(prev => {
            const next = new Set(prev.selectedUnits);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return { ...prev, selectedUnits: next };
        });
    };

    const toggleAllUnitsForCourse = (courseId, selectAll) => {
        setExportConfig(prev => {
            const next = new Set(prev.selectedUnits);
            const units = courseStructures[courseId]?.units || [];
            units.forEach(u => {
                const key = `${courseId}-${u.unit_id}`;
                if (selectAll) next.add(key);
                else next.delete(key);
            });
            return { ...prev, selectedUnits: next };
        });
    };

    const handleExport = async () => {
        if (!data) return;
        setShowExportModal(false);
        setIsExporting(true);
        setExportProgress(0);

        const { selectedUnits, includeOverall, includeMCQ, includeCoding } = exportConfig;

        try {
            const XLSX = await import('xlsx');
            
            // 1. Fetch ALL students for the section without pagination
            const token = getAdminToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const resAnalytics = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.sectionAnalytics(sectionName)}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ section: sectionName }), // No page/limit means all students
                credentials: 'include'
            });
            const jsonAnalytics = await resAnalytics.json();
            if (!jsonAnalytics.success || !jsonAnalytics.data) throw new Error("Failed to fetch section analytics for export");
            
            const allPerformance = jsonAnalytics.data.student_performance || [];
            const registered = allPerformance.filter(s => s.student_name && s.student_name.trim() !== '');
            const unregistered = allPerformance.filter(s => !s.student_name || s.student_name.trim() === '');
            const allStudents = [...registered, ...unregistered];

            // Format course selections for bulk API
            const courses_units = {};
            Object.entries(courseStructures).forEach(([cId, cData]) => {
                const units = cData.units.filter(u => selectedUnits.has(`${cId}-${u.unit_id}`)).map(u => u.unit_id);
                if (units.length > 0) courses_units[cId] = units;
            });

            const student_ids = allStudents.filter(s => isStudentRegistered(s)).map(s => s.student_name || s.uni_reg_id); 

            setExportProgress(30);

            // Fetch bulk data
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.bulkExportUnits}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ section_name: sectionName, courses_units, student_ids }),
                credentials: 'include'
            });
            const json = await res.json();
            const bulkData = json.data || {};
            
            setExportProgress(70);

            const exportRows = allStudents.map(student => {
                const isRegistered = isStudentRegistered(student);
                const row = {
                    'Name': student.student_name || 'Not Registered',
                    'Reg ID': student.uni_reg_id
                };

                // Overall section progress
                if (includeOverall) {
                    row['Overall Completion %'] = 0;
                    if (progressLoaded && isRegistered) {
                        let totalProg = 0, count = 0;
                        regularCourses.forEach(course => {
                            const p = progressData[course.course_id]?.[student.student_name];
                            if (typeof p === 'number') { totalProg += p; count++; }
                        });
                        row['Overall Completion %'] = count > 0 ? Math.round(totalProg / count) : 0;
                    }
                }

                // Add unit specific data
                if (isRegistered) {
                    const sData = bulkData[student.student_name || student.uni_reg_id] || {};
                    Object.entries(courses_units).forEach(([courseId, units]) => {
                        const courseData = courseStructures[courseId];
                        const cData = sData[courseId] || {};
                        units.forEach(unitId => {
                            const unitIndex = courseData.units.findIndex(u => u.unit_id === unitId);
                            const unitName = `Unit ${unitIndex + 1}`;
                            const uData = cData[unitId] || { overall_unit_completion: 0, mcq_score: 0, coding_score: 0 };
                            
                            if (includeOverall) row[`${courseData.name} - ${unitName} (%)`] = uData.overall_unit_completion ?? 0;
                            if (includeMCQ) row[`${courseData.name} - ${unitName} (MCQ %)`] = uData.mcq_score ?? 0;
                            if (includeCoding) row[`${courseData.name} - ${unitName} (Coding %)`] = uData.coding_score ?? 0;
                        });
                    });
                } else {
                     Object.entries(courses_units).forEach(([courseId, units]) => {
                        const courseData = courseStructures[courseId];
                        units.forEach(unitId => {
                            const unitIndex = courseData.units.findIndex(u => u.unit_id === unitId);
                            const unitName = `Unit ${unitIndex + 1}`;
                            if (includeOverall) row[`${courseData.name} - ${unitName} (%)`] = 0;
                            if (includeMCQ) row[`${courseData.name} - ${unitName} (MCQ %)`] = 0;
                            if (includeCoding) row[`${courseData.name} - ${unitName} (Coding %)`] = 0;
                        });
                    });
                }
                
                return row;
            });

            setExportProgress(90);

            // Generate Excel
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportRows);

            // Auto-width columns
            const colWidths = Object.keys(exportRows[0] || {}).map(key => ({ wch: Math.max(key.length, 10) }));
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, "Detailed Report");
            XLSX.writeFile(wb, `${data.section_metadata?.section_name || 'Section'}_Detailed_Report.xlsx`);

        } catch (e) {
            console.error("Export Failed", e);
            alert("Failed to export data. Please try again.");
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }
    };

    // Export All Tests as multi-sheet Excel
    const handleExportAllTests = async () => {
        if (examCourses.length === 0) return;
        setIsExportingAllTests(true);

        try {
            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();

            // 1. Fetch ALL students for the section without pagination
            const token = getAdminToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const resAnalytics = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.sectionAnalytics(sectionName)}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ section: sectionName }), // No page/limit means all students
                credentials: 'include'
            });
            const jsonAnalytics = await resAnalytics.json();
            const allPerformance = (jsonAnalytics.success && jsonAnalytics.data) ? (jsonAnalytics.data.student_performance || []) : [];

            // Build full examDataMap
            const fullExamMap = {};
            allPerformance.forEach(s => {
                (s.courses || []).forEach(c => {
                    if (c.is_exam) {
                        if (!fullExamMap[c.course_id]) fullExamMap[c.course_id] = { students: [] };
                        
                        let coding_marks = c.result_type?.toLowerCase() === 'coding' ? (c.marks_obtained || 0) : 0;
                        let mcq_marks = c.result_type?.toLowerCase() === 'mcq' ? (c.marks_obtained || 0) : 0;

                        let existingStudent = fullExamMap[c.course_id].students.find(es => (es.uni_reg_id && es.uni_reg_id === s.uni_reg_id) || es.student_name === s.student_name);
                        
                        if (existingStudent) {
                            existingStudent.total_marks = (existingStudent.total_marks || 0) + (c.marks_obtained || 0);
                            existingStudent.coding_marks = (existingStudent.coding_marks || 0) + coding_marks;
                            existingStudent.mcq_marks = (existingStudent.mcq_marks || 0) + mcq_marks;
                            existingStudent.exam_completion_percentage = Math.round(((existingStudent.exam_completion_percentage || 0) + (c.score_percent || 0)) / 2);
                            if ((c.attempt_count || 0) > (existingStudent.attempt_count || 0)) existingStudent.attempt_count = c.attempt_count;
                            if (c.submitted_at) existingStudent.submitted_at = c.submitted_at;
                        } else {
                            fullExamMap[c.course_id].students.push({
                                student_name: s.student_name,
                                uni_reg_id: s.uni_reg_id,
                                total_marks: c.marks_obtained || 0,
                                coding_marks,
                                mcq_marks,
                                exam_completion_percentage: c.score_percent || 0,
                                status: c.status,
                                attempt_count: c.attempt_count || 0,
                                submitted_at: c.submitted_at
                            });
                        }
                    }
                });
            });

            // ─── Summary Sheet ───
            const summaryRows = examCourses.map(course => {
                const examData = fullExamMap[course.course_id];
                const students = examData?.students || [];
                const marks = students.map(s => s.total_marks || 0);
                const completedCount = students.filter(s => s.exam_completion_percentage === 100).length;
                const durations = students.map(s => {
                    const start = s.debug_configs?.start_config?.timestamp;
                    const end = s.debug_configs?.end_config?.timestamp || s.debug_configs?.submit_config?.timestamp;
                    if (start && end) {
                        const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
                        return diff > 0 ? Math.round(diff) : null;
                    }
                    return null;
                }).filter(d => d !== null);

                return {
                    'Exam Name': course.course_name,
                    'Total Students': students.length,
                    'Avg Score': marks.length > 0 ? (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(1) : 0,
                    'Highest Score': marks.length > 0 ? Math.max(...marks) : 0,
                    'Lowest Score': marks.length > 0 ? Math.min(...marks) : 0,
                    'Completion Rate (%)': students.length > 0 ? Math.round((completedCount / students.length) * 100) : 0,
                    'Avg Duration (mins)': durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 'N/A',
                };
            });

            const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
            summaryWs['!cols'] = Object.keys(summaryRows[0] || {}).map(k => ({ wch: Math.max(k.length + 3, 14) }));
            XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

            // ─── Per-Exam Sheets ───
            examCourses.forEach(course => {
                const examData = fullExamMap[course.course_id];
                const students = examData?.students || [];
                if (students.length === 0) return;

                // Rank students
                const sorted = [...students].sort((a, b) => {
                    const diff = (b.total_marks || 0) - (a.total_marks || 0);
                    if (diff !== 0) return diff;
                    
                    const timeA = a.submitted_at ? new Date(a.submitted_at).getTime() : Infinity;
                    const timeB = b.submitted_at ? new Date(b.submitted_at).getTime() : Infinity;
                    if (timeA !== timeB) return timeA - timeB;

                    return (b.exam_completion_percentage || 0) - (a.exam_completion_percentage || 0);
                });
                // Helper: format network interfaces
                const fmtNet = (interfaces) => {
                    if (!interfaces || !Array.isArray(interfaces) || interfaces.length === 0) return '-';
                    return interfaces.map(iface => `${iface.interface || ''}: ${iface.ip || ''} (${iface.mac || ''})`).join(' | ');
                };

                const ranked = sorted.map((s, idx) => {
                    const currentRank = idx + 1;
                    const sc = s.debug_configs?.start_config || {};
                    const ec = s.debug_configs?.end_config || {};
                    const startTime = sc.timestamp;
                    const endTime = ec.timestamp || s.debug_configs?.submit_config?.timestamp;
                    let duration = null;
                    if (startTime && endTime) {
                        const diff = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000;
                        if (diff > 0) duration = Math.round(diff);
                    }
                    const an = s.analytics || {};
                    return {
                        'Rank': currentRank,
                        'Student Name': s.student_name || 'Not Registered',
                        'Reg ID': s.uni_reg_id,
                        'Completion (%)': s.exam_completion_percentage,
                        'Total Marks': s.total_marks,
                        'Coding Marks': s.marks_breakdown?.coding_marks || 0,
                        'MCQ Marks': s.marks_breakdown?.mcq_marks || 0,
                        'Duration (mins)': duration || '-',
                        // ── Analytics ──
                        'Started At': an.startedAt ? new Date(an.startedAt).toLocaleString() : '-',
                        'Last Updated At': an.lastUpdatedAt ? new Date(an.lastUpdatedAt).toLocaleString() : '-',
                        'Starting IP': an.startingIp || '-',
                        'Ending IP': an.endingIp || '-',
                        'Lost Focus': an.lostFocusCount ?? '-',
                        'Regained Focus': an.regainedFocusCount ?? '-',
                        'Face Warnings': an.faceWarnings ?? '-',
                        'Face Warnings Max': an.faceWarningsMax ?? '-',
                        'Internet Disconnects': an.internetDisconnects ?? '-',
                        'Offline Seconds': an.internetOfflineSeconds ?? '-',
                        'Blocked by Proctor': an.blockedByProctorCount ?? '-',
                        'Blocked Seconds': an.blockedSeconds ?? '-',
                        'Compile Clicks': an.compileClicks ?? '-',
                        'Submit Clicks': an.submitClicks ?? '-',
                        'Continue Clicks': an.continueClicks ?? '-',
                        'Submit Reason': an.submitReason || '-',
                        // ── Start Config ──
                        'Start Timestamp': startTime ? new Date(startTime).toLocaleString() : '-',
                        'Start Captured At': sc.capturedAt ? new Date(sc.capturedAt).toLocaleString() : '-',
                        'Start OS Platform': sc.os?.platform || '-',
                        'Start OS Version': sc.os?.version || '-',
                        'Start OS Release': sc.os?.release || '-',
                        'Start OS Arch': sc.os?.arch || '-',
                        'Start Hostname': sc.os?.hostname || '-',
                        'Start Network': fmtNet(sc.network?.interfaces),
                        'Start Proxy': sc.proxy?.settings || '-',
                        // ── End Config ──
                        'End Timestamp': endTime ? new Date(endTime).toLocaleString() : '-',
                        'End Captured At': ec.capturedAt ? new Date(ec.capturedAt).toLocaleString() : '-',
                        'End OS Platform': ec.os?.platform || '-',
                        'End OS Version': ec.os?.version || '-',
                        'End OS Release': ec.os?.release || '-',
                        'End OS Arch': ec.os?.arch || '-',
                        'End Hostname': ec.os?.hostname || '-',
                        'End Network': fmtNet(ec.network?.interfaces),
                        'End Proxy': ec.proxy?.settings || '-',
                    };
                });

                const ws = XLSX.utils.json_to_sheet(ranked);
                ws['!cols'] = Object.keys(ranked[0] || {}).map(k => ({ wch: Math.max(k.length + 3, 14) }));
                // Sheet name max 31 chars
                const sheetName = course.course_name.length > 31 ? course.course_name.substring(0, 28) + '...' : course.course_name;
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            const date = new Date().toISOString().split('T')[0];
            const fileName = `${data.section_metadata?.section_name || 'Section'}_All_Tests_${date}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } catch (e) {
            console.error('Export All Tests Failed', e);
            alert('Failed to export test results. Please try again.');
        } finally {
            setIsExportingAllTests(false);
        }
    };

    if (loading) {
        return <SectionDetailSkeleton />;
    }

    if (!data) return null;

    const { section_metadata, course_performance, student_performance } = data;

    return (
        <PortalWrapper>
        <div className="fixed inset-0 z-[120] flex flex-col bg-slate-50 dark:bg-[#0B0F19] animate-in fade-in slide-in-from-right duration-300 overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-[100px] pointer-events-none opacity-50 dark:opacity-100" />
            <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-gradient-to-tr from-violet-500/10 to-purple-500/10 blur-[100px] pointer-events-none opacity-30 dark:opacity-100" />

            {/* Header */}
            {!(sectionView === 'tests' && inspectingTest) && (
                <div className="relative flex items-center justify-between p-6 px-8 border-b border-gray-200 dark:border-white/5 bg-[var(--card)]/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl shrink-0 z-20 transition-all duration-300">
                    <div className="flex items-center gap-6">
                    <button onClick={onBack} className="group p-3 rounded-2xl bg-[var(--card)] dark:bg-[var(--card)]/5 border border-gray-200 dark:border-white/5 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 active:scale-95">
                        <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:-translate-x-1 transition-transform duration-300" />
                    </button>

                    <div className="space-y-1">
                        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                            {section_metadata?.section_name || sectionName}
                        </h2>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium flex-wrap">
                            {/* Total Students */}
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-[var(--card)] dark:bg-[var(--card)]/5 rounded-full border border-gray-200 dark:border-white/5 shadow-sm">
                                <Users className="w-3.5 h-3.5 text-gray-500" />
                                {totalStudents} Total
                            </span>
                            {/* Registered */}
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-full border border-emerald-200 dark:border-emerald-500/20 shadow-sm text-emerald-700 dark:text-emerald-400">
                                <UserCheck className="w-3.5 h-3.5" />
                                {sortedStudents.registered?.length || 0} Registered
                            </span>
                            {/* Unregistered */}
                            {(sortedStudents.unregistered?.length || 0) > 0 && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-500/10 rounded-full border border-orange-200 dark:border-orange-500/20 shadow-sm text-orange-700 dark:text-orange-400">
                                    <UserX className="w-3.5 h-3.5" />
                                    {sortedStudents.unregistered?.length || 0} Pending
                                </span>
                            )}
                            {/* Courses */}
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-[var(--card)] dark:bg-[var(--card)]/5 rounded-full border border-gray-200 dark:border-white/5 shadow-sm">
                                <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                                {course_performance?.length || 0} Courses
                            </span>
                            {/* Progress Loading Indicator */}
                            {loadingProgress && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-200 dark:border-blue-500/20 shadow-sm text-blue-700 dark:text-blue-400">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Loading Progress ({progressCount.current}/{progressCount.total})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Test Button — always visible */}
                    <button
                        onClick={() => {
                            if (sectionView === 'tests') {
                                setSectionView('students');
                                setSelectedExamCourse(null);
                                setInspectingTest(null);
                            } else {
                                setSectionView('tests');
                            }
                        }}
                        className={`group flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 shadow-lg hover:-translate-y-0.5 active:translate-y-0 font-bold text-sm tracking-wide ${sectionView === 'tests'
                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-violet-500/25 hover:shadow-violet-500/40'
                            : 'bg-[var(--card)] dark:bg-[var(--card)]/5 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 hover:border-violet-400 hover:shadow-violet-500/20'
                            }`}
                    >
                        <Trophy className="w-4 h-4" />
                        <span>Tests {examCourses.length > 0 ? `(${examCourses.length})` : ''}</span>
                    </button>
                    <button
                        onClick={handleOpenExport}
                        disabled={isExporting || loadingProgress}
                        className="group flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        {isExporting ? <CircularProgress percentage={exportProgress} size={18} strokeWidth={3} color="white" /> : <ArrowUpDown className="w-4 h-4 group-hover:animate-bounce" />}
                        <span className="font-bold text-sm tracking-wide">{isExporting ? 'Exporting...' : 'Export Report'}</span>
                    </button>
                </div>
            </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative z-10">

                {/* ──── TESTS VIEW ──── */}
                {sectionView === 'tests' && !inspectingTest && (
                    <div className="flex-1 p-8 overflow-auto">
                        <div className="max-w-5xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                    <div className="p-2 bg-violet-100 dark:bg-violet-500/20 rounded-lg text-violet-600 dark:text-violet-400">
                                        <Trophy className="w-5 h-5" />
                                    </div>
                                    Examinations
                                    <span className="text-sm font-normal text-gray-400 bg-gray-100 dark:bg-[var(--card)]/5 px-2 py-0.5 rounded-md">{examCourses.length} exams</span>
                                </h3>
                                {examCourses.length > 0 && (
                                    <button
                                        onClick={handleExportAllTests}
                                        disabled={isExportingAllTests}
                                        className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0 font-bold text-sm tracking-wide"
                                    >
                                        {isExportingAllTests ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 group-hover:animate-bounce" />}
                                        <span>{isExportingAllTests ? 'Exporting...' : 'Export All Tests'}</span>
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {examCourses.map(course => {
                                    const examData = examDataMap[course.course_id];
                                    const studentCount = examData?.students?.length || 0;
                                    const avgMarks = studentCount > 0
                                        ? (examData.students.reduce((sum, s) => sum + (s.total_marks || 0), 0) / studentCount).toFixed(1)
                                        : 0;
                                    const highest = studentCount > 0
                                        ? Math.max(...examData.students.map(s => s.total_marks || 0))
                                        : 0;

                                    return (
                                        <button
                                            key={course.course_id}
                                            onClick={() => setInspectingTest({ ...examData, course_id: course.course_id, course_name: course.course_name })}
                                            className="text-left group relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10 border border-violet-200 dark:border-violet-500/20 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/15 hover:border-violet-400/50 dark:hover:border-violet-500/40 hover:scale-[1.02] hover:-translate-y-1"
                                        >
                                            {/* Decorative */}
                                            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-violet-500/10 to-transparent rounded-bl-full -mr-6 -mt-6 group-hover:scale-110 transition-all" />

                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                                        <Trophy className="w-6 h-6" />
                                                    </div>
                                                    <span className="px-2 py-0.5 rounded-full bg-violet-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">Exam</span>
                                                </div>

                                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                                    {course.course_name}
                                                </h4>

                                                <div className="grid grid-cols-3 gap-3 mb-4">
                                                    <div className="text-center p-2 bg-[var(--card)]/80 dark:bg-[var(--card)]/5 rounded-lg border border-gray-200/50 dark:border-white/5">
                                                        <div className="text-lg font-black text-violet-600 dark:text-violet-400">{studentCount}</div>
                                                        <div className="text-[9px] text-gray-500 uppercase font-bold">Students</div>
                                                    </div>
                                                    <div className="text-center p-2 bg-[var(--card)]/80 dark:bg-[var(--card)]/5 rounded-lg border border-gray-200/50 dark:border-white/5">
                                                        <div className="text-lg font-black text-cyan-600 dark:text-cyan-400">{avgMarks}</div>
                                                        <div className="text-[9px] text-gray-500 uppercase font-bold">Avg Score</div>
                                                    </div>
                                                    <div className="text-center p-2 bg-[var(--card)]/80 dark:bg-[var(--card)]/5 rounded-lg border border-gray-200/50 dark:border-white/5">
                                                        <div className="text-lg font-black text-amber-600 dark:text-amber-400">{highest}</div>
                                                        <div className="text-[9px] text-gray-500 uppercase font-bold">Highest</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center text-sm text-violet-600 dark:text-violet-400 font-bold group-hover:text-violet-500 transition-colors">
                                                    View Results <ArrowLeft className="w-3 h-3 ml-1 rotate-180 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ──── INSPECTING A SPECIFIC TEST (inline, not overlay) ──── */}
                {sectionView === 'tests' && inspectingTest && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Back bar */}
                        <div className="px-8 pt-6 pb-2 shrink-0">
                            <button
                                onClick={() => setInspectingTest(null)}
                                className="inline-flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-500 font-bold transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to All Tests
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <TestDetailOverlay
                                test={inspectingTest}
                                students={student_performance}
                                sectionMetadata={section_metadata}
                                onClose={() => setInspectingTest(null)}
                                isInline={true}
                                onStudentSelect={onStudentSelect}
                            />
                        </div>
                    </div>
                )}

                {/* ──── STUDENTS VIEW (existing, only show when sectionView === 'students') ──── */}
                {sectionView === 'students' && (
                    <>
                        {/* LEFT: Course Performance Sidebar */}
                        <div className="w-full md:w-[380px] p-6 border-r border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#0f1523] overflow-y-auto custom-scrollbar shrink-0 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    Course Performance
                                </h3>
                                <span className="px-2 py-0.5 bg-gray-200 dark:bg-[var(--card)]/10 rounded-md text-[10px] font-bold text-gray-500 dark:text-gray-300">{regularCourses.length + examCourses.length} Courses</span>
                            </div>

                            <div className="space-y-4">
                                {regularCourses.map(course => {
                                    let avgProgress = null;
                                    let studentCount = 0;
                                    if (progressLoaded && progressData[course.course_id]) {
                                        const courseProgressData = progressData[course.course_id];
                                        const progressValues = Object.values(courseProgressData).filter(p => typeof p === 'number');
                                        if (progressValues.length > 0) {
                                            const sum = progressValues.reduce((acc, val) => acc + val, 0);
                                            avgProgress = Math.round(sum / progressValues.length);
                                            studentCount = progressValues.length;
                                        }
                                    }

                                    return (
                                        <div key={course.course_id} className="group p-5 rounded-2xl bg-[var(--card)] dark:bg-[#1A1F2E] border border-gray-200 dark:border-white/5 hover:border-cyan-500/30 dark:hover:border-cyan-500/30 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-bl-full -mr-4 -mt-4 transition-all group-hover:scale-110" />

                                            <div className="relative z-10">
                                                <div className="mb-4">
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{course.course_name}</h4>
                                                    {progressLoaded && studentCount > 0 && (
                                                        <p className="text-xs text-gray-400 mt-1">{studentCount} students with progress</p>
                                                    )}
                                                </div>

                                                {loadingProgress ? (
                                                    <div className="flex items-center gap-2 text-xs text-blue-500 bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Loading progress...</span>
                                                    </div>
                                                ) : progressLoaded && avgProgress !== null ? (
                                                    <div className="space-y-3">
                                                        <div className="flex items-end justify-between">
                                                            <div>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-1">Avg. Completion</span>
                                                                <span className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">{avgProgress}%</span>
                                                            </div>
                                                            <CircularProgress percentage={avgProgress} size={40} strokeWidth={4} color={avgProgress > 75 ? 'emerald' : avgProgress > 40 ? 'blue' : 'orange'} />
                                                        </div>
                                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-[var(--card)]/5 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-1000 ${avgProgress > 75 ? 'bg-emerald-500' : avgProgress > 40 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${avgProgress}%` }} />
                                                        </div>
                                                    </div>
                                                ) : progressLoaded ? (
                                                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 dark:bg-[var(--card)]/5 p-2 rounded-lg">
                                                        <AlertCircle className="w-3.5 h-3.5" /> No progress data available
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* EXAM COURSES */}
                                {examCourses.length > 0 && (
                                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/5">
                                        <h3 className="text-sm font-extrabold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-4 flex items-center gap-2">
                                            Examinations
                                        </h3>
                                        <div className="space-y-3">
                                            {examCourses.map(course => (
                                                <button 
                                                    key={course.course_id} 
                                                    onClick={() => setInspectingTest({ ...examDataMap[course.course_id], course_id: course.course_id, course_name: course.course_name })}
                                                    className="w-full text-left p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10 border border-violet-100 dark:border-violet-500/20 relative overflow-hidden group hover:border-violet-300 dark:hover:border-violet-500/40 hover:shadow-md transition-all cursor-pointer"
                                                >
                                                    <div className="relative z-10 flex gap-3 items-start">
                                                        <div className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-violet-200 dark:bg-violet-500/30 flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400"></div>
                                                        </div>
                                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{course.course_name}</h4>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Student Table */}
                        <div className="flex-1 p-8 overflow-hidden flex flex-col bg-slate-50 dark:bg-[#0B0F19]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                    <div className="p-2 bg-violet-100 dark:bg-violet-500/20 rounded-lg text-violet-600 dark:text-violet-400">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    Student Performance
                                    {loadingProgress && (
                                        <span className="flex items-center gap-1.5 text-sm font-normal text-blue-500">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading...
                                        </span>
                                    )}
                                </h3>

                                <div className="relative w-72 group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or Reg ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] dark:bg-[#1A1F2E] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-sm text-gray-900 dark:text-white placeholder-gray-400 transition-all shadow-sm"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-hidden border border-gray-200 dark:border-white/5 rounded-2xl bg-[var(--card)] dark:bg-[#1A1F2E] shadow-sm flex flex-col">
                                <div className="overflow-auto custom-scrollbar flex-1">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50/80 dark:bg-black/20 sticky top-0 backdrop-blur-md z-10 border-b border-gray-200 dark:border-white/5">
                                            <tr>
                                                <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--card)]/5 transition-colors" onClick={() => requestSort('student_name')}>
                                                    <div className="flex items-center gap-2">
                                                        Student Name
                                                        <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === 'student_name' ? 'text-cyan-500' : 'opacity-50'}`} />
                                                    </div>
                                                </th>
                                                <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--card)]/5 transition-colors" onClick={() => requestSort('uni_reg_id')}>
                                                    <div className="flex items-center gap-2">
                                                        Reg ID
                                                        <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === 'uni_reg_id' ? 'text-cyan-500' : 'opacity-50'}`} />
                                                    </div>
                                                </th>
                                                <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                {progressLoaded && regularCourses.map(course => (
                                                    <th
                                                        key={course.course_id}
                                                        className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--card)]/5 transition-colors group"
                                                        title={course.course_name}
                                                        onClick={() => requestSort(course.course_id)}
                                                    >
                                                        <div className="flex items-center justify-center gap-1">
                                                            {course.course_name.length > 15 ? course.course_name.substring(0, 12) + '...' : course.course_name}
                                                            <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === course.course_id ? 'text-cyan-500' : 'opacity-0 group-hover:opacity-50'} transition-opacity`} />
                                                        </div>
                                                    </th>
                                                ))}
                                                {loadingProgress && (
                                                    <th className="p-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                                            Loading...
                                                        </div>
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {/* Registered Students Section */}
                                            {sortedStudents.registered?.length > 0 && (
                                                <>
                                                    <tr className="bg-emerald-50/50 dark:bg-emerald-500/5">
                                                        <td colSpan={3 + (progressLoaded ? regularCourses.length : 0) + (loadingProgress ? 1 : 0)} className="p-3 px-5">
                                                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                                                <UserCheck className="w-3.5 h-3.5" />
                                                                Registered Students ({sortedStudents.registered.length})
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {sortedStudents.registered.map((student, idx) => (
                                                        <tr key={student.student_id || student.uni_reg_id}
                                                            onClick={() => onStudentSelect && onStudentSelect(student)}
                                                            className="hover:bg-gray-50 dark:hover:bg-[var(--card)]/[0.02] transition-colors group cursor-pointer"
                                                        >
                                                            <td className="p-4 px-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${['bg-red-100 text-red-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-yellow-100 text-yellow-600', 'bg-violet-100 text-violet-600'][idx % 5]}`}>
                                                                        {student.student_name?.[0]?.toUpperCase() || 'S'}
                                                                    </div>
                                                                    <div
                                                                        className="font-semibold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors cursor-pointer"
                                                                        onClick={() => onStudentSelect && onStudentSelect(student)}
                                                                    >
                                                                        {student.student_name}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 px-5 text-sm text-gray-500 dark:text-gray-400 font-mono">{student.uni_reg_id}</td>
                                                            <td className="p-4 px-5">
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                                                    <UserCheck className="w-3 h-3" />
                                                                    Active
                                                                </span>
                                                            </td>
                                                            {progressLoaded && regularCourses.map(course => {
                                                                const courseProgress = progressData[course.course_id];
                                                                const studentProgress = courseProgress?.[student.student_name] ?? null;

                                                                return (
                                                                    <td key={course.course_id} className="p-4 px-5 text-center">
                                                                        {studentProgress !== null ? (
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <CircularProgress
                                                                                    percentage={studentProgress}
                                                                                    size={30}
                                                                                    strokeWidth={3}
                                                                                    color={studentProgress > 80 ? 'emerald' : studentProgress > 40 ? 'blue' : 'orange'}
                                                                                />
                                                                                <span className={`text-xs font-bold ${studentProgress > 80 ? 'text-emerald-600' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                                    {studentProgress}%
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-xs text-gray-300 dark:text-gray-700">-</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                            {loadingProgress && (
                                                                <td className="p-4 px-5 text-center">
                                                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500 mx-auto" />
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </>
                                            )}

                                            {/* Unregistered Students Section */}
                                            {sortedStudents.unregistered?.length > 0 && (
                                                <>
                                                    <tr className="bg-orange-50/50 dark:bg-orange-500/5">
                                                        <td colSpan={3 + (progressLoaded ? regularCourses.length : 0) + (loadingProgress ? 1 : 0)} className="p-3 px-5">
                                                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                                                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                                                <UserX className="w-3.5 h-3.5" />
                                                                Not Yet Registered ({sortedStudents.unregistered.length})
                                                                <span className="font-normal text-orange-500/70 ml-2">— Students who haven't completed registration</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {sortedStudents.unregistered.map((student, idx) => (
                                                        <tr key={student.student_id || student.uni_reg_id || `unreg-${idx}`} className="hover:bg-orange-50/30 dark:hover:bg-orange-500/5 transition-colors">
                                                            <td className="p-4 px-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gray-100 dark:bg-[var(--card)]/10 text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600">
                                                                        ?
                                                                    </div>
                                                                    <div className="text-gray-400 dark:text-gray-500 italic">
                                                                        Not Registered
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 px-5 text-sm text-gray-500 dark:text-gray-400 font-mono">
                                                                {student.uni_reg_id}
                                                            </td>
                                                            <td className="p-4 px-5">
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                                                                    <UserX className="w-3 h-3" />
                                                                    Pending
                                                                </span>
                                                            </td>
                                                            {progressLoaded && regularCourses.map(course => (
                                                                <td key={course.course_id} className="p-4 px-5 text-center">
                                                                    <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                                                                </td>
                                                            ))}
                                                            {loadingProgress && (
                                                                <td className="p-4 px-5 text-center">
                                                                    <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </>
                                            )}

                                            {/* Empty State */}
                                            {(!sortedStudents.registered?.length && !sortedStudents.unregistered?.length) && (
                                                <tr>
                                                    <td colSpan={3 + (progressLoaded ? regularCourses.length : 0) + (loadingProgress ? 1 : 0)} className="p-12 text-center">
                                                        <div className="flex flex-col items-center gap-3 text-gray-400">
                                                            <Users className="w-12 h-12 opacity-30" />
                                                            <span className="text-sm font-medium">No students found</span>
                                                            {searchQuery && (
                                                                <button
                                                                    onClick={() => setSearchQuery('')}
                                                                    className="text-xs text-cyan-500 hover:text-cyan-600 underline"
                                                                >
                                                                    Clear search
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Pagination Controls */}
                                {totalStudents > itemsPerPage && (
                                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-white/5">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Showing <span className="text-gray-900 dark:text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, totalStudents)}</span> of <span className="text-gray-900 dark:text-white">{totalStudents}</span> students
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1 || loading}
                                                className="px-4 py-2 text-sm font-bold rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[var(--card)]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(p => p + 1)}
                                                disabled={currentPage * itemsPerPage >= totalStudents || loading}
                                                className="px-4 py-2 text-sm font-bold rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[var(--card)]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ──── Export Configuration Modal ──── */}
            {showExportModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-2xl max-h-[85vh] mx-4 bg-[var(--card)] dark:bg-[#0f1523] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                                    <Download className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">Export Configuration</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Select units and metrics to include in your Excel report</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[var(--card)]/10 transition-all"
                            >
                                <span className="text-2xl leading-none">&times;</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            
                            {/* INCLUDE METRICS */}
                            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#1A1F2E] border border-gray-200 dark:border-white/5">
                                <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">Include Metrics</h4>
                                <div className="flex flex-wrap items-center gap-6">
                                    {[
                                        { id: 'includeOverall', label: 'Overall Completion' },
                                        { id: 'includeMCQ', label: 'MCQ Scores' },
                                        { id: 'includeCoding', label: 'Coding Scores' }
                                    ].map(metric => (
                                        <button
                                            key={metric.id}
                                            onClick={() => setExportConfig(prev => ({ ...prev, [metric.id]: !prev[metric.id] }))}
                                            className="flex items-center gap-3 group"
                                        >
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                                exportConfig[metric.id] 
                                                    ? 'bg-cyan-500 border-cyan-500 shadow-sm shadow-cyan-500/30' 
                                                    : 'border-gray-300 dark:border-gray-600 group-hover:border-cyan-500/50'
                                            }`}>
                                                {exportConfig[metric.id] && (
                                                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{metric.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Course & Unit Selection */}
                            <div>
                                <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">Select Courses & Units</h4>

                                {loadingStructures ? (
                                    <div className="flex items-center justify-center gap-3 p-8 text-gray-400">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span className="text-sm font-medium">Loading course structures...</span>
                                    </div>
                                ) : Object.keys(courseStructures).length === 0 ? (
                                    <div className="text-center p-8 text-gray-400 text-sm">
                                        No courses available to configure.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {Object.entries(courseStructures).map(([courseId, courseData]) => {
                                            const allSelected = courseData.units.every(u => exportConfig.selectedUnits.has(`${courseId}-${u.unit_id}`));
                                            const noneSelected = courseData.units.every(u => !exportConfig.selectedUnits.has(`${courseId}-${u.unit_id}`));

                                            return (
                                                <div key={courseId} className="p-5 rounded-2xl bg-gray-50 dark:bg-[#1A1F2E] border border-gray-200 dark:border-white/5">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h5 className="font-bold text-gray-900 dark:text-white text-sm">{courseData.name}</h5>
                                                        <div className="flex items-center gap-3 text-xs font-bold">
                                                            <button
                                                                onClick={() => toggleAllUnitsForCourse(courseId, true)}
                                                                className={`transition-colors ${allSelected ? 'text-cyan-500' : 'text-gray-400 hover:text-cyan-500'}`}
                                                            >
                                                                Select All
                                                            </button>
                                                            <button
                                                                onClick={() => toggleAllUnitsForCourse(courseId, false)}
                                                                className={`transition-colors ${noneSelected ? 'text-gray-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                            >
                                                                None
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {courseData.units.map((unit, idx) => {
                                                            const key = `${courseId}-${unit.unit_id}`;
                                                            const isSelected = exportConfig.selectedUnits.has(key);
                                                            return (
                                                                <button
                                                                    key={key}
                                                                    onClick={() => toggleExportUnit(key)}
                                                                    className={`flex items-center gap-2.5 p-3 rounded-xl text-sm font-semibold text-left transition-all duration-200
                                                                        ${isSelected
                                                                            ? 'bg-cyan-500/10 border-2 border-cyan-500/50 text-cyan-700 dark:text-cyan-300 shadow-sm'
                                                                            : 'bg-[var(--card)] dark:bg-[var(--card)]/5 border-2 border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/10'
                                                                        }`}
                                                                >
                                                                    <div className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                                                                        ${isSelected
                                                                            ? 'bg-cyan-500 border-cyan-500 shadow-sm shadow-cyan-500/30'
                                                                            : 'border-gray-300 dark:border-gray-600'
                                                                        }`}
                                                                    >
                                                                        {isSelected && (
                                                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                            </svg>
                                                                        )}
                                                                    </div>
                                                                    {`Unit ${idx + 1}`}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 pt-4 border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
                            <div className="text-xs text-gray-400">
                                {exportConfig.selectedUnits.size} unit{exportConfig.selectedUnits.size !== 1 ? 's' : ''} selected
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowExportModal(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white bg-gray-100 dark:bg-[var(--card)]/5 hover:bg-gray-200 dark:hover:bg-[var(--card)]/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExport}
                                    disabled={exportConfig.selectedUnits.size === 0}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    Export Report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PortalWrapper>
    );
}

function TestDetailOverlay({ test, students, sectionMetadata, onClose, isInline = false, onStudentSelect }) {
    const examStudents = test?.students || [];
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });

    // ─── Ranking Logic ───────────────────────────────────────────────────────
    const rankedStudents = React.useMemo(() => {
        const sorted = [...examStudents].sort((a, b) => {
            // Primary: total_marks desc
            const marksDiff = (b.total_marks || 0) - (a.total_marks || 0);
            if (marksDiff !== 0) return marksDiff;
            
            // Secondary tiebreaker: time taken (using latest submitted_at as proxy, earliest first)
            const getSubmitTime = (s) => Math.max(
                s.coding_submitted_at ? new Date(s.coding_submitted_at).getTime() : 0,
                s.mcq_submitted_at ? new Date(s.mcq_submitted_at).getTime() : 0
            );
            const timeA = getSubmitTime(a) || Infinity;
            const timeB = getSubmitTime(b) || Infinity;
            if (timeA !== timeB) return timeA - timeB;

            // Tertiary tiebreaker: completion percentage desc
            return (b.exam_completion_percentage || 0) - (a.exam_completion_percentage || 0);
        });

        return sorted.map((student, idx) => {
            const currentRank = idx + 1;
            
            let duration = null;
            let mcq_duration = null;
            let coding_duration = null;
            let startTime = null;

            // Try to calculate duration from analytics or debug_configs
            if (student.analytics && student.analytics.startedAt) {
                const s = new Date(student.analytics.startedAt).getTime();
                startTime = student.analytics.startedAt;
                
                const mcqEnd = student.mcq_submitted_at ? new Date(student.mcq_submitted_at).getTime() : null;
                const codingEnd = student.coding_submitted_at ? new Date(student.coding_submitted_at).getTime() : null;

                if (mcqEnd) {
                    mcq_duration = Math.max(0, Math.round((mcqEnd - s) / 60000));
                }
                
                if (codingEnd && mcqEnd && codingEnd > mcqEnd) {
                    coding_duration = Math.round((codingEnd - mcqEnd) / 60000);
                } else if (codingEnd) {
                    coding_duration = Math.max(0, Math.round((codingEnd - s) / 60000));
                }

                const e = student.analytics.lastUpdatedAt ? new Date(student.analytics.lastUpdatedAt).getTime() : null;
                if (e) {
                    duration = Math.max(0, Math.round((e - s) / 60000));
                    if (codingEnd && mcqEnd && e > codingEnd && (e - mcqEnd) < 18000000) { 
                       coding_duration = Math.max(0, Math.round((e - mcqEnd) / 60000));
                    }
                }
            } else if (student.debug_configs?.start_config?.timestamp && student.debug_configs?.end_config?.timestamp) {
                const s = new Date(student.debug_configs.start_config.timestamp).getTime();
                const e = new Date(student.debug_configs.end_config.timestamp).getTime();
                if (e > s) duration = Math.round((e - s) / 60000);
                startTime = student.debug_configs.start_config.timestamp;
            }

            return {
                ...student,
                rank: currentRank,
                duration,
                mcq_duration,
                coding_duration,
                startTime,
                coding_marks: student.coding_marks !== undefined ? student.coding_marks : (student.marks_breakdown?.coding_marks || 0),
                mcq_marks: student.mcq_marks !== undefined ? student.mcq_marks : (student.marks_breakdown?.mcq_marks || 0),
            };
        });
    }, [examStudents]);

    // ─── Summary Stats ───────────────────────────────────────────────────────
    const stats = React.useMemo(() => {
        const marks = rankedStudents.map(s => s.total_marks || 0);
        const completedCount = rankedStudents.filter(s => s.exam_completion_percentage === 100).length;
        const durations = rankedStudents.map(s => s.duration).filter(d => d !== null);
        return {
            total: rankedStudents.length,
            avgScore: marks.length > 0 ? (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(1) : 0,
            highest: marks.length > 0 ? Math.max(...marks) : 0,
            lowest: marks.length > 0 ? Math.min(...marks) : 0,
            completionRate: rankedStudents.length > 0 ? Math.round((completedCount / rankedStudents.length) * 100) : 0,
            completedCount,
            avgDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
        };
    }, [rankedStudents]);

    // ─── Filter + Sort ───────────────────────────────────────────────────────
    const displayStudents = React.useMemo(() => {
        let filtered = rankedStudents;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(s =>
                (s.student_name || '').toLowerCase().includes(q) ||
                (s.uni_reg_id || '').toLowerCase().includes(q)
            );
        }

        const { key, direction } = sortConfig;
        const sorted = [...filtered].sort((a, b) => {
            let aVal, bVal;
            switch (key) {
                case 'rank': aVal = a.rank; bVal = b.rank; break;
                case 'student_name': aVal = (a.student_name || '').toLowerCase(); bVal = (b.student_name || '').toLowerCase(); break;
                case 'total_marks': aVal = a.total_marks || 0; bVal = b.total_marks || 0; break;
                case 'coding_marks': aVal = a.coding_marks; bVal = b.coding_marks; break;
                case 'mcq_marks': aVal = a.mcq_marks; bVal = b.mcq_marks; break;
                case 'completion': aVal = a.exam_completion_percentage || 0; bVal = b.exam_completion_percentage || 0; break;
                case 'duration': aVal = a.duration ?? 9999; bVal = b.duration ?? 9999; break;
                default: aVal = a.rank; bVal = b.rank;
            }
            if (typeof aVal === 'string') {
                return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        });
        return sorted;
    }, [rankedStudents, searchQuery, sortConfig]);

    const requestSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const renderSortIcon = (field) => {
        if (sortConfig.key !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
        return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-violet-500" /> : <ChevronDown className="w-3 h-3 text-violet-500" />;
    };

    const getRankBadge = (rank) => {
        if (rank === 1) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-black shadow-lg shadow-amber-500/40"><Trophy className="w-3.5 h-3.5" /> 1st</span>;
        if (rank === 2) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 text-xs font-black shadow-md"><Medal className="w-3.5 h-3.5" /> 2nd</span>;
        if (rank === 3) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs font-black shadow-md"><Medal className="w-3.5 h-3.5" /> 3rd</span>;
        const top10Cutoff = Math.ceil(rankedStudents.length * 0.1);
        if (rank <= top10Cutoff && rankedStudents.length >= 10) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-bold"><Award className="w-3 h-3" /> Top 10%</span>;
        return <span className="text-sm font-bold text-gray-500 dark:text-gray-400">#{rank}</span>;
    };

    const formatDuration = (mins) => {
        if (mins === null || mins === undefined) return '-';
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}h ${m}m`;
    };

    // ─── Helper: format network interfaces for export ─────────────────────────
    const formatNetworkInterfaces = (interfaces) => {
        if (!interfaces || !Array.isArray(interfaces) || interfaces.length === 0) return '-';
        return interfaces.map(iface => `${iface.interface || ''}: ${iface.ip || ''} (${iface.mac || ''})`).join(' | ');
    };

    // ─── Export ───────────────────────────────────────────────────────────────
    const handleExport = async () => {
        try {
            const XLSX = await import('xlsx');
            const exportData = displayStudents.map(s => {
                const sc = s.debug_configs?.start_config || {};
                const ec = s.debug_configs?.end_config || {};
                const an = s.analytics || {};

                return {
                    'Rank': s.rank,
                    'Student Name': s.student_name || 'Not Registered',
                    'Reg ID': s.uni_reg_id,
                    'Completion (%)': s.exam_completion_percentage,
                    'Total Marks': s.total_marks,
                    'Coding Marks': s.coding_marks,
                    'MCQ Marks': s.mcq_marks,
                    'Duration (mins)': s.duration || '-',
                    'Submitted At': s.submittedAt || '-',
                    // ── Analytics ──
                    'Started At': an.startedAt ? new Date(an.startedAt).toLocaleString() : '-',
                    'Last Updated At': an.lastUpdatedAt ? new Date(an.lastUpdatedAt).toLocaleString() : '-',
                    'Starting IP': an.startingIp || '-',
                    'Ending IP': an.endingIp || '-',
                    'Lost Focus': an.lostFocusCount ?? '-',
                    'Regained Focus': an.regainedFocusCount ?? '-',
                    'Face Warnings': an.faceWarnings ?? '-',
                    'Face Warnings Max': an.faceWarningsMax ?? '-',
                    'Internet Disconnects': an.internetDisconnects ?? '-',
                    'Offline Seconds': an.internetOfflineSeconds ?? '-',
                    'Blocked by Proctor': an.blockedByProctorCount ?? '-',
                    'Blocked Seconds': an.blockedSeconds ?? '-',
                    'Compile Clicks': an.compileClicks ?? '-',
                    'Submit Clicks': an.submitClicks ?? '-',
                    'Continue Clicks': an.continueClicks ?? '-',
                    'Submit Reason': an.submitReason || '-',
                    // ── Start Config ──
                    'Start Timestamp': sc.timestamp ? new Date(sc.timestamp).toLocaleString() : '-',
                    'Start Captured At': sc.capturedAt ? new Date(sc.capturedAt).toLocaleString() : '-',
                    'Start OS Platform': sc.os?.platform || '-',
                    'Start OS Version': sc.os?.version || '-',
                    'Start OS Release': sc.os?.release || '-',
                    'Start OS Arch': sc.os?.arch || '-',
                    'Start Hostname': sc.os?.hostname || '-',
                    'Start Network': formatNetworkInterfaces(sc.network?.interfaces),
                    'Start Proxy': sc.proxy?.settings || '-',
                    // ── End Config ──
                    'End Timestamp': ec.timestamp ? new Date(ec.timestamp).toLocaleString() : '-',
                    'End Captured At': ec.capturedAt ? new Date(ec.capturedAt).toLocaleString() : '-',
                    'End OS Platform': ec.os?.platform || '-',
                    'End OS Version': ec.os?.version || '-',
                    'End OS Release': ec.os?.release || '-',
                    'End OS Arch': ec.os?.arch || '-',
                    'End Hostname': ec.os?.hostname || '-',
                    'End Network': formatNetworkInterfaces(ec.network?.interfaces),
                    'End Proxy': ec.proxy?.settings || '-',
                };
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            const colWidths = Object.keys(exportData[0] || {}).map(key => ({ wch: Math.max(key.length + 3, 14) }));
            ws['!cols'] = colWidths;
            XLSX.utils.book_append_sheet(wb, ws, "Exam Results");
            XLSX.writeFile(wb, `${test?.section_name || 'Exam'}_Results_Ranked.xlsx`);
        } catch (e) {
            console.error("Export failed", e);
            alert("Failed to export exam results");
        }
    };

    const wrapperClass = isInline
        ? 'flex flex-col h-full overflow-hidden'
        : 'fixed inset-0 z-[70] flex flex-col bg-gray-50/50 dark:bg-[#0B0F19]/90 animate-in slide-in-from-right duration-300 backdrop-blur-sm';

    return (
        <div className={wrapperClass}>
            {/* Header */}
            <div className={`flex items-center justify-between p-6 px-8 border-b border-gray-200 dark:border-white/5 shrink-0 ${isInline ? 'bg-[var(--card)]/50 dark:bg-[#0f1523]/50' : 'bg-[var(--card)] shadow-lg dark:bg-[#0f1523]'}`}>
                <div className="flex items-center gap-6">
                    {!isInline && (
                        <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-[var(--card)]/5 rounded-2xl border border-gray-200 dark:border-white/5 hover:border-violet-500/30 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all hover:scale-105 active:scale-95 shadow-sm">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div>
                        <div className="text-xs text-violet-600 dark:text-violet-400 uppercase tracking-wider font-extrabold mb-1 flex items-center gap-2">
                            <Trophy className="w-3.5 h-3.5" /> Competitive Exam Results
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-3">
                            {test?.section_name || 'Exam Details'}
                            <span className="text-sm font-normal text-gray-400 bg-gray-100 dark:bg-[var(--card)]/5 px-2 py-0.5 rounded-md">{examStudents.length} Students</span>
                        </h2>
                        <div className="text-sm text-gray-500">{sectionMetadata?.section_name}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[var(--card)]/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-sm text-gray-900 dark:text-white placeholder-gray-400 transition-all w-56"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                ×
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-bold">Export</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 p-8 overflow-auto bg-slate-50 dark:bg-[#0B0F19]">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* ─── Summary Stats ──────────────────────────────── */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[
                            { label: 'Participants', value: stats.total, icon: Users, color: 'from-blue-500 to-indigo-500', iconColor: 'text-blue-400' },
                            { label: 'Avg Score', value: stats.avgScore, icon: TrendingUp, color: 'from-violet-500 to-purple-500', iconColor: 'text-violet-400' },
                            { label: 'Highest', value: stats.highest, icon: Trophy, color: 'from-amber-500 to-yellow-500', iconColor: 'text-amber-400' },
                            { label: 'Lowest', value: stats.lowest, icon: AlertCircle, color: 'from-red-500 to-orange-500', iconColor: 'text-red-400' },
                            { label: 'Completion', value: `${stats.completionRate}%`, icon: Award, color: 'from-emerald-500 to-teal-500', iconColor: 'text-emerald-400' },
                            { label: 'Avg Time', value: stats.avgDuration ? formatDuration(stats.avgDuration) : 'N/A', icon: Timer, color: 'from-cyan-500 to-blue-500', iconColor: 'text-cyan-400' },
                        ].map((stat, i) => (
                            <div key={i} className="group p-4 rounded-2xl bg-[var(--card)] dark:bg-[#1A1F2E] border border-gray-200 dark:border-white/5 hover:border-violet-500/30 dark:hover:border-violet-500/30 transition-all duration-300 shadow-sm hover:shadow-md">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                                        <stat.icon className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{stat.label}</span>
                                </div>
                                <div className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* ─── Results Table ──────────────────────────────── */}
                    <div className="bg-[var(--card)] dark:bg-[#1A1F2E] rounded-3xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-xl">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/5">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--card)]/5 transition-colors w-20" onClick={() => requestSort('rank')}>
                                        <div className="flex items-center gap-1.5"><Hash className="w-3 h-3" /> Rank {renderSortIcon("rank")}</div>
                                    </th>
                                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--card)]/5 transition-colors" onClick={() => requestSort('student_name')}>
                                        <div className="flex items-center gap-1.5">Student {renderSortIcon("student_name")}</div>
                                    </th>
                                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reg ID</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--card)]/5 transition-colors" onClick={() => requestSort('total_marks')}>
                                        <div className="flex items-center justify-center gap-1.5">Total {renderSortIcon("total_marks")}</div>
                                    </th>
                                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--card)]/5 transition-colors" onClick={() => requestSort('coding_marks')}>
                                        <div className="flex items-center justify-center gap-1.5">Coding {renderSortIcon("coding_marks")}</div>
                                    </th>
                                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--card)]/5 transition-colors" onClick={() => requestSort('mcq_marks')}>
                                        <div className="flex items-center justify-center gap-1.5">MCQ {renderSortIcon("mcq_marks")}</div>
                                    </th>
                                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--card)]/5 transition-colors" onClick={() => requestSort('completion')}>
                                        <div className="flex items-center justify-center gap-1.5">Status {renderSortIcon("completion")}</div>
                                    </th>
                                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-[var(--card)]/5 transition-colors" onClick={() => requestSort('duration')}>
                                        <div className="flex items-center justify-center gap-1.5"><Timer className="w-3 h-3" /> Time {renderSortIcon("duration")}</div>
                                    </th>
                                    <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                                        <div className="flex items-center justify-center gap-1.5"><Clock className="w-3 h-3" /> Submitted At</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {displayStudents.map((student, i) => {
                                    const isRegistered = student.student_name && student.student_name.trim() !== '';
                                    const maxMarks = stats.highest || 1;
                                    const scorePercent = Math.round(((student.total_marks || 0) / maxMarks) * 100);
                                    const codingMax = Math.max(...rankedStudents.map(s => s.coding_marks), 1);
                                    const mcqMax = Math.max(...rankedStudents.map(s => s.mcq_marks), 1);

                                    return (
                                        <React.Fragment key={student.uni_reg_id || i}>
                                        <tr
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onStudentSelect && isRegistered) {
                                                    onStudentSelect({ ...student, exam_course_id: test?.course_id, section_name: sectionMetadata?.section_name });
                                                }
                                            }}
                                            className={`transition-colors cursor-pointer ${!isRegistered ? 'opacity-50' : ''} ${student.rank <= 3 ? 'bg-gradient-to-r from-amber-50/30 dark:from-amber-500/5 to-transparent' : ''} hover:bg-violet-50/50 dark:hover:bg-violet-500/5`}
                                        >
                                            {/* Rank */}
                                            <td className="p-4 text-center">
                                                {getRankBadge(student.rank)}
                                            </td>
                                            {/* Name */}
                                            <td className="p-4">
                                                {isRegistered ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${student.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-500/30' : student.rank <= 3 ? 'bg-gradient-to-br from-violet-400 to-purple-500 text-white' : 'bg-gray-100 dark:bg-[var(--card)]/10 text-gray-600 dark:text-gray-300'}`}>
                                                            {student.student_name[0]?.toUpperCase() || 'S'}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={`font-bold ${student.rank <= 3 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>{student.student_name}</span>
                                                            {student.analytics && (
                                                                <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                                    <Activity className="w-2.5 h-2.5" /> Analytics available
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-gray-100 dark:bg-[var(--card)]/10 text-gray-400 border border-dashed border-gray-300 dark:border-gray-600">?</div>
                                                        <span className="text-gray-400 italic text-sm">Not Registered</span>
                                                    </div>
                                                )}
                                            </td>
                                            {/* Reg ID */}
                                            <td className="p-4 text-sm text-gray-500 font-mono">{student.uni_reg_id}</td>
                                            {/* Total Marks */}
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`text-lg font-black ${student.rank <= 3 ? 'bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent' : 'text-gray-900 dark:text-white'}`}>
                                                        {student.total_marks}
                                                    </span>
                                                    <div className="h-1 w-16 bg-gray-100 dark:bg-[var(--card)]/10 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-700 ${scorePercent > 80 ? 'bg-emerald-500' : scorePercent > 50 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${scorePercent}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Coding */}
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{student.coding_marks}</span>
                                                    <div className="h-1 w-12 bg-gray-100 dark:bg-[var(--card)]/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.round((student.coding_marks / codingMax) * 100)}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            {/* MCQ */}
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{student.mcq_marks}</span>
                                                    <div className="h-1 w-12 bg-gray-100 dark:bg-[var(--card)]/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.round((student.mcq_marks / mcqMax) * 100)}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Completion */}
                                            <td className="p-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${student.exam_completion_percentage === 100
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                    : student.exam_completion_percentage > 0
                                                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'
                                                        : 'bg-gray-100 text-gray-500 dark:bg-[var(--card)]/10 dark:text-gray-400'
                                                    }`}>
                                                    {student.exam_completion_percentage}%
                                                </span>
                                            </td>
                                            {/* Time */}
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    {student.mcq_duration !== null ? (
                                                        <span className="text-[10.5px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-violet-100 dark:border-violet-500/20">
                                                            MCQ: {formatDuration(student.mcq_duration)}
                                                        </span>
                                                    ) : null}
                                                    {student.coding_duration !== null ? (
                                                        <span className="text-[10.5px] font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-cyan-100 dark:border-cyan-500/20">
                                                            COD: {formatDuration(student.coding_duration)}
                                                        </span>
                                                    ) : null}
                                                    {student.mcq_duration === null && student.coding_duration === null && student.duration !== null ? (
                                                        <span className="text-[10.5px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[var(--card)]/10 px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-gray-200 dark:border-white/5">
                                                            TOT: {formatDuration(student.duration)}
                                                        </span>
                                                    ) : null}
                                                    {!student.duration && !student.mcq_duration && !student.coding_duration && (
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Submitted At */}
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    {student.mcq_submitted_at ? (
                                                        <span className="text-[10.5px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-violet-100 dark:border-violet-500/20">
                                                            MCQ: {new Date(student.mcq_submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    ) : null}
                                                    {student.coding_submitted_at ? (
                                                        <span className="text-[10.5px] font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-cyan-100 dark:border-cyan-500/20">
                                                            COD: {new Date(student.coding_submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    ) : null}
                                                    {!student.mcq_submitted_at && !student.coding_submitted_at && (
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        </React.Fragment>
                                    );
                                })}
                                {displayStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-3 text-gray-400">
                                                <Search className="w-10 h-10 opacity-30" />
                                                <span className="font-medium">No students match your search</span>
                                                <button onClick={() => setSearchQuery('')} className="text-xs text-violet-500 hover:text-violet-600 underline">Clear search</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

