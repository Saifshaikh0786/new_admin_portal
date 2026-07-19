import React, { useState, useEffect } from 'react';
import { ArrowLeft, Layers, Users, TrendingUp, AlertCircle, Search, ArrowRight } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { Skeleton } from './Skeletons';
import { API_CONFIG } from '@/utils/api';
import { getAdminToken } from '@/utils/cookies';
import PortalWrapper from './PortalWrapper';

export default function BatchDetailView({ batch, onBack, onSectionSelect }) {
    const [sections, setSections] = useState([]);
    const [courses, setCourses] = useState([]); // Added courses state
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchBatchData = async () => {
            setLoading(true);
            try {
                const token = getAdminToken();
                const headers = { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                };

                // 1. Fetch Sections using New API
                const secRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getSectionsByBatch}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ batch_id: batch.batch_id }),
                    credentials: 'include'
                });
                const secData = await secRes.json();

                let batchSections = [];

                if (secData.success && secData.data) {
                    // secData.data.sections is array of strings: ["K24AD", "K23TU"]
                    // We need to map them to objects for the UI
                    const sectionNames = secData.data.sections || [];
                    batchSections = sectionNames.map(name => ({
                        section_name: name,
                        batch_id: batch.batch_id,
                        // Placeholders as new API doesn't provide these yet
                        student_count: 0,
                        progress: 0
                    }));
                }

                setSections(batchSections);

                // 2. Fetch Courses using New API
                const courseRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.getPracticeCoursesByBatch}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ batch_id: batch.batch_id }),
                    credentials: 'include'
                });
                const courseData = await courseRes.json();

                // New API Response Structure: { success: true, data: { courses: [...] } } or similar
                // Based on get-sections pattern, likely data.courses or just data array
                let courseList = [];
                if (courseData.success && courseData.data) {
                    if (Array.isArray(courseData.data)) {
                        courseList = courseData.data;
                    } else if (courseData.data.courses) {
                        courseList = courseData.data.courses;
                    }
                }

                setCourses(courseList);

            } catch (error) {
                console.error("Failed to fetch batch data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (batch) {
            fetchBatchData();
        }
    }, [batch]);

    // Derived Analytics from Sections
    const analytics = React.useMemo(() => {
        if (!sections.length) return null;
        return {
            totalSections: sections.length,
            totalStudents: sections.reduce((acc, sec) => acc + (sec.student_count || 0), 0),
            avgProgress: Math.round(sections.reduce((acc, sec) => acc + (sec.progress || 0), 0) / sections.length),
            totalCourses: courses.length
        };
    }, [sections, courses]);

    const filteredSections = sections.filter(sec =>
        sec.section_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (<PortalWrapper><div className="fixed inset-0 flex flex-col neu-page animate-in fade-in slide-in-from-right duration-300 overflow-hidden z-[120]"
        >
            {/* Background Effects */}
            <div className="absolute top-0 left-0 h-[400px] w-[400px] bg-[var(--neu-achieve-soft)] blur-[100px] pointer-events-none transform-gpu opacity-50 dark:opacity-100" />

            {/* Header */}
            <div className="relative flex items-center justify-between p-8 border-b border-[var(--neu-divider)] neu-raised backdrop-blur-xl shrink-0 shadow-lg">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="group p-3 rounded-full neu-tile text-gray-700 dark:text-gray-300 hover:text-[var(--neu-accent)] transition-all duration-300 active:shadow-[var(--neu-shadow-inset)]">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold text-[var(--neu-accent)] mb-2">{batch.batch_name}</h2>
                        <div className="flex gap-4 text-sm font-medium">
                            <span className="neu-badge neu-badge-achieve">
                                <Users className="w-4 h-4" />
                                {batch.batch_student_strength || 0} Students
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* LEFT: Analytics Panel */}
                <div className="w-[400px] neu-flat border-r border-[var(--neu-divider)] p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar">

                    {/* Key Metrics */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-[var(--neu-achieve)] dark:text-[var(--neu-achieve)]" />
                            Performance Overview
                        </h3>

                        <div className="p-4 rounded-xl neu-raised">
                            <div className="text-gray-500 dark:text-gray-400 text-xs uppercase mb-2">Total Sections</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics?.totalSections || 0}</div>
                        </div>
                    </div>

                    {/* Registered Courses List */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                            Registered Courses ({courses.length})
                        </h3>
                        <div className="space-y-3">
                            {courses.length > 0 ? (
                                courses.map((course, i) => (
                                    <div key={i} className="p-4 rounded-xl neu-raised neu-hover transition-colors">
                                        <div className="font-bold text-gray-900 dark:text-white text-sm">{course.course_name || course.course_title || 'Untitled Course'}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 rounded-xl neu-raised text-center text-gray-500 text-sm italic">
                                    No courses found for this batch.
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* RIGHT: Sections List */}
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar neu-page">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Layers className="w-5 h-5 text-[var(--neu-achieve)] dark:text-[var(--neu-achieve)]" />
                                Sections in Batch
                            </h3>
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Filter sections..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="neu-inset rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none w-64 transition-all"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-[var(--card)]/5" />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredSections.length > 0 ? (
                                    filteredSections.map((sec, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => onSectionSelect(sec.section_name || sec.name)}
                                            className="text-left group p-5 rounded-2xl neu-raised neu-hover transition-all duration-300"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="w-10 h-10 rounded-xl neu-chip neu-chip-accent flex items-center justify-center font-bold text-lg">
                                                    {sec.section_name?.[0] || 'S'}
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[var(--neu-achieve)] dark:group-hover:text-violet-400 -translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all" />
                                            </div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{sec.section_name}</h4>

                                        </button>
                                    ))
                                ) : (
                                    <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-500 neu-inset rounded-2xl">
                                        <div className="neu-empty-icon w-16 h-16 mb-4"><Layers className="w-8 h-8" /></div>
                                        <p>No sections found for this batch.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )</PortalWrapper>);
}



