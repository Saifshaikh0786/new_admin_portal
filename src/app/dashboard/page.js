"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_CONFIG } from "@/utils/api";
import { getAdminToken } from "@/utils/cookies";
import { Users, BookOpen, UserCheck, Activity, Award, LayoutGrid, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OverviewPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [batches, setBatches] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedBatchForAction, setSelectedBatchForAction] = useState(null);

    useEffect(() => {
        if (!authLoading && user) {
            fetchData();
        }
    }, [authLoading, user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = getAdminToken();
            const headers = {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            };

            // Fetch Batches
            const batchesRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.myBatches}`, {
                method: "POST",
                headers,
                credentials: "include"
            });
            const batchesData = await batchesRes.json();
            if (batchesData.success && batchesData.data) {
                setBatches(batchesData.data);
            }

            // Fetch Teachers
            const teachersRes = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.myTeachers}`, {
                method: "POST",
                headers,
                credentials: "include"
            });
            const teachersData = await teachersRes.json();
            if (teachersData.success && teachersData.data) {
                setTeachers(teachersData.data);
            }

        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    // Derived Statistics
    const totalStudents = batches.reduce((acc, curr) => acc + (curr.batch_student_strength || 0), 0);
    const totalCourses = batches.reduce((acc, curr) => acc + (curr.registered_courses_id?.length || 0), 0);

    const summaryCards = [
        { title: "Total Students", value: totalStudents, icon: Users, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
        { title: "Active Batches", value: batches.length, icon: LayoutGrid, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
        { title: "Total Courses", value: totalCourses, icon: BookOpen, color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-900/30" },
        { title: "Faculty Members", value: teachers.length, icon: UserCheck, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
    ];

    if (loading || authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading Dashboard Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Action Modal */}
            {selectedBatchForAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-gray-100 dark:border-slate-700 animate-slideInRight">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Select Action</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Where would you like to navigate for batch <span className="font-semibold">{selectedBatchForAction.batch_name}</span>?
                        </p>
                        
                        <div className="space-y-3">
                            <button
                                onClick={() => router.push(`/dashboard/practice?batchId=${selectedBatchForAction.batch_id}`)}
                                className="w-full flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/50 transition-colors group"
                            >
                                <span className="font-semibold text-blue-700 dark:text-blue-300">Practice Analytics</span>
                                <ChevronRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => router.push(`/dashboard/results?batchId=${selectedBatchForAction.batch_id}`)}
                                className="w-full flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 transition-colors group"
                            >
                                <span className="font-semibold text-emerald-700 dark:text-emerald-300">Exam Results</span>
                                <ChevronRight className="w-5 h-5 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                        
                        <button
                            onClick={() => setSelectedBatchForAction(null)}
                            className="mt-6 w-full py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Overview</h1>
                <p className="text-gray-600 dark:text-gray-400">High-level summary of all batches and active students.</p>
            </div>

            {/* Summary Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {summaryCards.map((card, idx) => (
                    <div key={idx} className="glass-card p-6 border-l-4" style={{ borderLeftColor: card.color.split('-')[1] }}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${card.bg}`}>
                                <card.icon className={`w-6 h-6 ${card.color}`} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{card.title}</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Batches Grid */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-blue-500" />
                    Active Batches
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {batches.map((batch) => {
                        // Find assigned teacher if applicable
                        const assignedTeacher = teachers.find(t => t.teacher_id === batch.coordinator_id);

                        return (
                            <button
                                key={batch.batch_id}
                                onClick={() => setSelectedBatchForAction(batch)}
                                className="group text-left relative p-6 rounded-2xl bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                            >
                                {/* Gradient Glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-violet-500/0 group-hover:from-blue-500/5 group-hover:to-violet-500/5 transition-all duration-300" />

                                <div className="relative">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {batch.batch_name}
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                                            <div className="text-2xl font-bold text-blue-600">{batch.batch_student_strength || 0}</div>
                                            <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Students</div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                                            <div className="text-2xl font-bold text-violet-600">{batch.registered_courses_id?.length || 0}</div>
                                            <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Courses</div>
                                        </div>
                                    </div>

                                    {assignedTeacher && (
                                        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                {assignedTeacher.teacher_name?.charAt(0) || "T"}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{assignedTeacher.teacher_name}</p>
                                                <p className="text-xs text-gray-500 truncate">Coordinator</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 font-medium pt-4 border-t border-gray-100 dark:border-slate-700">
                                        <span>{new Date(batch.starting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        <span className="text-gray-300 dark:text-slate-600">→</span>
                                        <span>{new Date(batch.ending_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    {batches.length === 0 && !loading && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500">
                            <LayoutGrid className="w-12 h-12 mb-3 opacity-20" />
                            <p>No active batches found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
