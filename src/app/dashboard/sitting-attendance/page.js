"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_CONFIG } from "@/utils/api";
import { getAdminToken } from "@/utils/cookies";
import { Loader2, AlertCircle, Download, MapPin, Users, Key, Calendar, ChevronDown, ChevronUp } from "lucide-react";

export default function SittingPlanPage() {
    const { user, loading: authLoading } = useAuth();
    
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [rooms, setRooms] = useState([]);
    const [teachers, setTeachers] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedRoom, setExpandedRoom] = useState(null);

    useEffect(() => {
        if (!authLoading && user) {
            fetchTeachers();
        }
    }, [authLoading, user]);

    useEffect(() => {
        if (!authLoading && user && dateFilter) {
            fetchSittingPlan();
        }
    }, [authLoading, user, dateFilter]);

    const fetchTeachers = async () => {
        try {
            const token = getAdminToken();
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.myTeachers}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                credentials: "include"
            });
            const data = await res.json();
            if (data.success) {
                setTeachers(data.data);
            }
        } catch (e) {
            console.error("Failed to fetch teachers", e);
        }
    };

    const fetchSittingPlan = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAdminToken();
            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.analytics.sittingAttendance}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                credentials: "include",
                body: JSON.stringify({ date: dateFilter })
            });
            const data = await res.json();
            
            if (data.success) {
                // Group by room
                const grouped = {};
                data.data.forEach(item => {
                    if (!grouped[item.room_number]) {
                        grouped[item.room_number] = {
                            room_number: item.room_number,
                            invigilator_id: item.invigilator_id,
                            exam_access_key: item.exam_access_key,
                            status: item.status,
                            date: item.date,
                            students: []
                        };
                    }
                    grouped[item.room_number].students.push(item);
                });
                
                setRooms(Object.values(grouped));
            } else {
                setError(data.message || "Failed to load sitting plan.");
            }
        } catch (e) {
            setError("Network error while fetching sitting plan.");
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        const rows = [["Room Number", "Date", "Status", "Access Key", "Invigilator ID", "Student Name", "Student Reg ID"]];
        rooms.forEach(r => {
            r.students.forEach(s => {
                rows.push([
                    r.room_number, 
                    new Date(r.date).toLocaleDateString(),
                    r.status,
                    r.exam_access_key,
                    r.invigilator_id,
                    s.student_name,
                    s.reg_id
                ]);
            });
        });

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sitting_plan_${dateFilter}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sitting Plan & Attendance</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage physical lab allocations and invigilator assignments.</p>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={exportToCSV} disabled={rooms.length === 0} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Date Filter */}
            <div className="glass-panel p-4 flex items-center gap-4 border border-gray-200 dark:border-slate-800 max-w-sm">
                <div className="w-full">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Date</label>
                    <input 
                        type="date" 
                        value={dateFilter} 
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center py-20">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Fetching allocations...</p>
                </div>
            ) : error ? (
                <div className="glass-panel p-8 text-center text-red-500 border-red-200">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-semibold">{error}</p>
                </div>
            ) : rooms.length === 0 ? (
                <div className="glass-panel p-12 text-center text-gray-500 border-dashed">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No sitting plan configured for {new Date(dateFilter).toLocaleDateString()}.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {rooms.map((room) => {
                        const invigilator = teachers.find(t => t.teacher_id === room.invigilator_id);
                        const isExpanded = expandedRoom === room.room_number;

                        return (
                            <div key={room.room_number} className="card overflow-hidden">
                                {/* Room Header */}
                                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border-b border-blue-100 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                                                <MapPin className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Room {room.room_number}</h3>
                                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{room.status === 'active' ? 'Active Exam Session' : 'Scheduled'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="bg-white/60 dark:bg-slate-900/50 p-3 rounded-lg border border-white/40 dark:border-slate-700/50">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase font-semibold mb-1"><Users className="w-3.5 h-3.5"/> Capacity</div>
                                            <div className="text-lg font-bold text-gray-900 dark:text-white">{room.students.length} Allocated</div>
                                        </div>
                                        <div className="bg-white/60 dark:bg-slate-900/50 p-3 rounded-lg border border-white/40 dark:border-slate-700/50">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase font-semibold mb-1"><Key className="w-3.5 h-3.5"/> Access Key</div>
                                            <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">{room.exam_access_key || '---'}</div>
                                        </div>
                                    </div>

                                    {/* Invigilator Info */}
                                    <div className="mt-4 flex items-center gap-3 p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-white dark:border-slate-700 shadow-sm">
                                        <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center font-bold text-sm">
                                            {invigilator?.teacher_name?.charAt(0) || "T"}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{invigilator?.teacher_name || room.invigilator_id || "Unassigned"}</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Invigilator</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Student List Toggle */}
                                <button 
                                    onClick={() => setExpandedRoom(isExpanded ? null : room.room_number)}
                                    className="w-full p-3 flex items-center justify-between text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <span>{isExpanded ? 'Hide' : 'View'} Allocated Students</span>
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>

                                {/* Expanded List */}
                                {isExpanded && (
                                    <div className="max-h-60 overflow-y-auto border-t border-gray-100 dark:border-slate-700 custom-scrollbar">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-slate-900/50 sticky top-0">
                                                <tr>
                                                    <th className="p-3 text-left font-semibold text-gray-500">Name</th>
                                                    <th className="p-3 text-right font-semibold text-gray-500">Reg ID</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {room.students.map((s, idx) => (
                                                    <tr key={idx} className="border-t border-gray-50 dark:border-slate-800/50">
                                                        <td className="p-3 font-medium text-gray-900 dark:text-white">{s.student_name}</td>
                                                        <td className="p-3 text-right text-gray-500 font-mono">{s.reg_id}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
