"use client";

import { createContext, useState, useEffect, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { API_CONFIG } from "../utils/api";
import { setAdminToken, clearAdminToken, getAdminToken } from "../utils/cookies";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Initialize user from localStorage to survive Fast Refresh
    const [user, setUserState] = useState(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('admin_user');
            if (cached) {
                try { return JSON.parse(cached); } catch (e) {}
            }
        }
        return null;
    });
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Wrapper to keep localStorage in sync
    const setUser = (userData) => {
        setUserState(userData);
        if (typeof window !== 'undefined') {
            if (userData) {
                localStorage.setItem('admin_user', JSON.stringify(userData));
            } else {
                localStorage.removeItem('admin_user');
            }
        }
    };

    // Helper for API calls to ensure consistent config
    const apiCall = async (url, options = {}) => {
        const token = getAdminToken();
        const defaultHeaders = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
            credentials: "include", // CRITICAL: Required for HttpOnly Cookies
        };

        return fetch(url, config);
    };

    // 1. Check Session (On Mount & Route Change)
    const checkSession = async (isBackground = false) => {
        try {
            // Don't show loading if it's a background check or we already have a user
            if (!user && !isBackground) setLoading(true);

            // Fast-path: Check if valid teacher session is present
            if (typeof window !== 'undefined') {
                const teacherSessionStr = localStorage.getItem('teacher_session');
                const token = getAdminToken();
                if (teacherSessionStr && token) {
                    try {
                        const parsed = JSON.parse(teacherSessionStr);
                        if (parsed && (parsed.id || parsed.teacher_id || parsed.name)) {
                            setUser(parsed);
                            if (!isBackground) setLoading(false);
                            return;
                        }
                    } catch (_) {}
                }
            }

            // Use verify endpoint from centralized config
            const url = `${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.me}`;

            // For cross-origin requests (Vercel backend), we might need different credentials settings
            // But relying on existing 'include' for cookies as per instructions.
            const res = await apiCall(url, { method: "GET" });

            if (res.ok) {
                const data = await res.json();
                // New Backend returns: { success: true, data: { admin: ..., university: ... } }
                if (data.success && data.data) {
                    setUser(data.data.admin || data.data.teacher || data.data);
                } else {
                    // Invalid session
                    handleLogout();
                }
            } else {
                // 401 or 403 indicates invalid session (Token expired/invalid)
                if (res.status === 401 || res.status === 403) {
                    handleLogout();
                } else {
                    console.error("Backend error during session check:", res.status);
                    // Do not logout on 500s or 502s, as they might be temporary backend restarts
                }
            }
        } catch (error) {
            console.error("Session check failed (Network Error / Fast Refresh):", error);
            // DO NOT clear user on network error. This is what causes logouts during Fast Refresh!
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
        // Only redirect if we are strictly in a protected route
        if (pathname.includes("/dashboard")) {
            router.push("/login");
        }
    };

    useEffect(() => {
        checkSession();

        // Background Session Check (every 10 minutes)
        const intervalId = setInterval(() => {
            checkSession(true);
        }, 600000); // 10 minutes = 600000ms

        return () => clearInterval(intervalId);
    }, []); // Run once on mount

    // 2. Login Function
    const login = async (credentials, role = 'admin') => {
        try {
            setLoading(true);
            const isTeacher = role === 'teacher';

            if (isTeacher) {
                const regId = (credentials.uni_reg_id || credentials.regId || credentials.email || '').trim();
                const pwd = (credentials.password || '').trim();

                if (!regId || !pwd) {
                    return { success: false, error: 'Registration ID and password are required' };
                }

                // Call the official Teacher Portal login endpoint
                const teacherUrl = 'https://teacherportal.theeducode.com/api/proxy/backend/auth/teacher/login';
                const res = await fetch(teacherUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uni_reg_id: regId, password: pwd })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    const token = data.token || data.teacher?.token;
                    if (token) {
                        setAdminToken(token);
                    }
                    if (data.teacher) {
                        localStorage.setItem('teacher_session', JSON.stringify(data.teacher));
                        setUser(data.teacher);
                    }
                    return { success: true, token, teacher: data.teacher };
                } else {
                    return { success: false, error: data.error || data.message || "Invalid Registration ID or Password" };
                }
            }

            // Administrator login
            const url = `${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.login}`;
            const bodyPayload = { email: credentials.email, password: credentials.password };

            const res = await apiCall(url, {
                method: "POST",
                body: JSON.stringify(bodyPayload),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                if (data.token) {
                    setAdminToken(data.token);
                } else {
                    console.error('No token found in login response!');
                }

                await checkSession();
                return { success: true };
            } else {
                return { success: false, error: data.message || "Invalid Credentials" };
            }
        } catch (error) {
            return { success: false, error: "Network error. Please try again." };
        } finally {
            setLoading(false);
        }
    };

    // 3. Logout Function
    const logout = async () => {
        try {
            setLoading(true);
            const url = `${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.logout}`;
            await apiCall(url, { method: "POST" }); // Assuming this clears the cookie
            clearAdminToken(); // Clear token from localStorage
            handleLogout();
            router.push("/login");
        } catch (error) {
            console.error("Logout failed:", error);
            // Even if API call fails, clear local token
            clearAdminToken();
            handleLogout();
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, logout, checkSession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
