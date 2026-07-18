"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { API_CONFIG } from "@/utils/api";
import { getAdminToken } from "@/utils/cookies";
import { Loader2, AlertCircle, Calendar, Users, CheckCircle2, PlayCircle, Clock, Download, RefreshCw, ChevronDown, FileText, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

function LiveDashboardRosterContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    
    const [dateFilter, setDateFilter] = useState(searchParams.get("date") || new Date().toISOString().split('T')[0]);
    const [metrics, setMetrics] = useState({ total_scheduled: 0, completed: 0, ongoing: 0, not_started: 0 });
    const [students, setStudents] = useState([]);
    
    // Pagination
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    // URL Sync
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (dateFilter && dateFilter !== params.get("date")) {
            params.set("date", dateFilter);
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [dateFilter, searchParams, router]);

    // Initial load and date change
    useEffect(() => {
        if (!authLoading && user && dateFilter) {
            fetchRoster(1, true);
        }
    }, [authLoading, user, dateFilter]);

    const handleExport = async (format) => {
        setIsExporting(true);
        try {
            const token = getAdminToken();
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.analytics.liveRoster}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                credentials: "include",
                body: JSON.stringify({ date: dateFilter, page: 1, limit: 10000 })
            });
            const data = await res.json();
            
            if (data.success && data.data && data.data.rows) {
                const exportData = data.data.rows.map(s => {
                    let status = "Not Started";
                    if (s.submitted_at) status = "Submitted";
                    else if (s.coding_status !== 'not_started' || s.mcq_status !== 'not_started') status = "Ongoing";

                    return {
                        "Student Name": s.student_name || "N/A",
                        "Reg ID": s.reg_id || "N/A",
                        "Section": s.section || "N/A",
                        "Batch": s.batch_name || "N/A",
                        "Course": s.course_name || "N/A",
                        "Lecture": s.lecture_name || "N/A",
                        "Status": status,
                        "Submitted At": s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "N/A"
                    };
                });

                const worksheet = XLSX.utils.json_to_sheet(exportData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "LiveRoster");
                
                if (format === 'csv') {
                    XLSX.writeFile(workbook, `Live_Roster_${dateFilter}.csv`);
                } else {
                    XLSX.writeFile(workbook, `Live_Roster_${dateFilter}.xlsx`);
                }
            } else {
                alert("Failed to fetch data for export.");
            }
        } catch (e) {
            console.error("Export error", e);
            alert("Error exporting data.");
        } finally {
            setIsExporting(false);
        }
    };

    const fetchRoster = async (pageNumber = 1, isNewDate = false) => {
        if (isNewDate) {
            setLoading(true);
            setPage(1);
        } else {
            setLoadingMore(true);
        }
        setError(null);

        try {
            const token = getAdminToken();
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.analytics.liveRoster}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                credentials: "include",
                body: JSON.stringify({ date: dateFilter, page: pageNumber, limit: 50 })
            });
            const data = await res.json();
            
            if (data.success) {
                setMetrics(data.data.metrics);
                setHasMore(data.data.pagination.has_more);
                
                if (isNewDate) {
                    setStudents(data.data.rows);
                } else {
                    setStudents(prev => [...prev, ...data.data.rows]);
                }
            } else {
                setError(data.message || "Failed to load live roster.");
            }
        } catch (e) {
            setError("Network error while fetching roster.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchRoster(nextPage, false);
    };

    const getStatusBadge = (student) => {
        if (student.submitted_at) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-semibold border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Submitted
                </span>
            );
        }
        if (student.coding_status !== 'not_started' || student.mcq_status !== 'not_started') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-semibold border border-blue-200 dark:border-blue-800">
                    <PlayCircle className="w-3.5 h-3.5 animate-pulse" />
                    Ongoing
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300 rounded-full text-xs font-semibold border border-gray-200 dark:border-slate-600">
                <Clock className="w-3.5 h-3.5" />
                Not Started
            </span>
        );
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-20 p-6">
            {/* Header & Date Picker */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Users className="w-8 h-8 text-blue-500" />
                        Live Dashboard Roster
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Monitor all scheduled exams, active participants, and final results in real-time.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
                    <div className="relative group">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl font-medium focus:border-blue-500 dark:focus:border-blue-500 outline-none transition-all shadow-sm text-gray-700 dark:text-gray-200"
                        />
                    </div>
                    <button 
                        onClick={() => fetchRoster(1, true)}
                        className="p-2.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl hover:border-blue-500 hover:text-blue-500 transition-all shadow-sm"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleExport('csv')}
                            disabled={isExporting}
                            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                            Export CSV
                        </button>
                        <button 
                            onClick={() => handleExport('excel')}
                            disabled={isExporting}
                            className="btn-primary flex items-center gap-2 disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                            Export Excel
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 flex items-center gap-3 animate-slideInRight">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <p className="font-medium">{error}</p>
                </div>
            )}

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-gray-50 dark:bg-slate-700/50 rounded-full group-hover:scale-110 transition-transform duration-500 ease-out" />
                    <Users className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-4 relative z-10" />
                    <div className="text-3xl font-bold text-gray-900 dark:text-white relative z-10 mb-1">{metrics.total_scheduled}</div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 relative z-10">Total Scheduled</div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-50 dark:bg-green-900/10 rounded-full group-hover:scale-110 transition-transform duration-500 ease-out" />
                    <CheckCircle2 className="w-8 h-8 text-green-500 mb-4 relative z-10" />
                    <div className="text-3xl font-bold text-gray-900 dark:text-white relative z-10 mb-1">{metrics.completed}</div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 relative z-10">Completed</div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 dark:bg-blue-900/10 rounded-full group-hover:scale-110 transition-transform duration-500 ease-out" />
                    <PlayCircle className="w-8 h-8 text-blue-500 mb-4 relative z-10" />
                    <div className="text-3xl font-bold text-gray-900 dark:text-white relative z-10 mb-1">{metrics.ongoing}</div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 relative z-10">Ongoing</div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-50 dark:bg-orange-900/10 rounded-full group-hover:scale-110 transition-transform duration-500 ease-out" />
                    <Clock className="w-8 h-8 text-orange-400 mb-4 relative z-10" />
                    <div className="text-3xl font-bold text-gray-900 dark:text-white relative z-10 mb-1">{metrics.not_started}</div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 relative z-10">Not Started</div>
                </div>
            </div>

            {/* Main Data Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-slate-700 uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-4">Student Details</th>
                                <th className="px-6 py-4">Room & Section</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Scores / Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                            {loading && students.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
                                        Fetching roster...
                                    </td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        No students scheduled for this date.
                                    </td>
                                </tr>
                            ) : (
                                students.map((student, idx) => (
                                    <tr key={`${student.student_id}-${student.sitting_id}-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                                                    {student.student_name?.charAt(0) || "S"}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white text-base">{student.student_name}</div>
                                                    <div className="text-gray-500 dark:text-gray-400 font-mono text-xs">{student.uni_reg_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-semibold text-gray-800 dark:text-gray-200">Room: {student.room_number}</div>
                                            <div className="text-gray-500 text-xs">Section: {student.section || "N/A"}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(student)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {student.submitted_at ? (
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white">
                                                        {student.marks_obtained !== null ? `${student.marks_obtained} / ${student.total_marks || '-'}` : "Processing..."}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                                                        {student.submit_reason === "timeup" ? "Auto-Submitted (Time Up)" : 
                                                         student.submit_reason === "user_submission" ? "Manual Submit" : 
                                                         student.submit_reason || "Completed"}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">Waiting for submission...</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Lazy Loading Trigger */}
                {hasMore && (
                    <div className="p-4 bg-gray-50 dark:bg-slate-900/30 border-t border-gray-200 dark:border-slate-700 flex justify-center">
                        <button 
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-full font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-600 transition-all shadow-sm disabled:opacity-50"
                        >
                            {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                            {loadingMore ? "Loading more..." : "Load More Students"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function LiveDashboardRosterPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        }>
            <LiveDashboardRosterContent />
        </Suspense>
    );
}
