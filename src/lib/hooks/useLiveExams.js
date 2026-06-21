import { useState, useEffect, useCallback } from 'react';
import { API_CONFIG } from '@/utils/api';
import { getAdminToken } from '@/utils/cookies';

export function useLiveExams() {
    const [liveExams, setLiveExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLiveExams = useCallback(async () => {
        try {
            const token = getAdminToken();
            const headers = {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            };

            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.liveExams}`, {
                method: "GET",
                headers,
                credentials: "include"
            });

            const data = await res.json();
            if (data.success) {
                setLiveExams(data.data || []);
                setError(null);
            } else {
                setError(data.message || "Failed to fetch live exams");
            }
        } catch (err) {
            setError("Network error while fetching live exams");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch and polling every 30 seconds
    useEffect(() => {
        fetchLiveExams();
        const intervalId = setInterval(fetchLiveExams, 30000);
        return () => clearInterval(intervalId);
    }, [fetchLiveExams]);

    const extendTime = async (studentId, courseId, lectureId, testType, extraTimeMs) => {
        try {
            const token = getAdminToken();
            const headers = {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            };

            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.extendTime}`, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({ studentId, courseId, lectureId, testType, extraTimeMs })
            });

            const data = await res.json();
            if (data.success) {
                await fetchLiveExams(); // Refresh data
                return { success: true, message: data.message };
            } else {
                return { success: false, message: data.message || "Failed to extend time" };
            }
        } catch (err) {
            console.error("Extend time error:", err);
            return { success: false, message: "Network error" };
        }
    };

    const extendAttempt = async (studentId, courseId, lectureId, testType) => {
        try {
            const token = getAdminToken();
            const headers = {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            };

            const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.extendAttempt}`, {
                method: "POST",
                headers,
                credentials: "include",
                body: JSON.stringify({ studentId, courseId, lectureId, testType })
            });

            const data = await res.json();
            if (data.success) {
                await fetchLiveExams(); // Refresh data
                return { success: true, message: data.message };
            } else {
                return { success: false, message: data.message || "Failed to extend attempt" };
            }
        } catch (err) {
            console.error("Extend attempt error:", err);
            return { success: false, message: "Network error" };
        }
    };

    return {
        liveExams,
        loading,
        error,
        refreshLiveExams: fetchLiveExams,
        extendTime,
        extendAttempt
    };
}
