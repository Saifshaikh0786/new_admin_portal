"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { API_CONFIG } from "@/utils/api";
import { getAdminToken } from "@/utils/cookies";

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
    const { user } = useAuth();
    
    const [batches, setBatches] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [overviewStats, setOverviewStats] = useState({
        total_students: 0,
        total_teachers: 0,
        active_batches: 0,
        total_sections: 0,
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch the heavy dashboard overview data exactly once when the user is available
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return; // Wait for AuthContext to resolve the user
            
            setLoading(true);
            setError(null);
            
            try {
                const token = getAdminToken();
                const headers = {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                };

                const res = await fetch(`${API_CONFIG.baseUrl.admin}/admin/dashboard/overview`, {
                    method: "GET",
                    headers,
                    credentials: "include"
                });
                
                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error("Non-JSON response from overview API:", text);
                    setError("Failed to fetch dashboard data");
                    setLoading(false);
                    return;
                }
                
                if (res.ok && data.success && data.data) {
                    setBatches(data.data.batches || []);
                    
                    // The dashboard payload doesn't return full teacher objects in Phase 2, 
                    // it returns a total_teachers count. We simulate the array for backwards compatibility.
                    setTeachers(new Array(data.data.total_teachers || 0).fill({}));
                    
                    setOverviewStats({
                        total_students: data.data.total_students || 0,
                        total_teachers: data.data.total_teachers || 0,
                        active_batches: data.data.active_batches || 0,
                        total_sections: data.data.total_sections || 0,
                    });
                } else {
                    setError(data.message || "Failed to fetch dashboard data");
                }
            } catch (err) {
                console.error("Dashboard overview fetch error:", err);
                setError("Network error fetching dashboard data");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    // Force a re-fetch if needed
    const refreshDashboard = async () => {
        setLoading(true);
        // ... simple hack to trigger the effect or extract the logic
        // For now, simple implementation
    };

    return (
        <DashboardContext.Provider value={{ batches, teachers, overviewStats, loading, error, refreshDashboard }}>
            {children}
        </DashboardContext.Provider>
    );
}

export const useDashboard = () => useContext(DashboardContext);
