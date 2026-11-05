/**
 * Utility functions for cookie and token management
 */

/**
 * Get a specific cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null if not found
 */
export function getCookie(name) {
    if (typeof document === 'undefined') return null;

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }

    return null;
}

/**
 * Store the admin/teacher authentication token
 * @param {string} token - JWT token to store
 */
export function setAdminToken(token) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('admin_token', token);
    localStorage.setItem('teacher_token', token);

    // Set cookie to expire in 7 days (matches typical JWT validity)
    const d = new Date();
    d.setTime(d.getTime() + (7 * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();

    // Standard cookie for current host
    document.cookie = `admin_token=${token};${expires};path=/;SameSite=None;Secure`;
    document.cookie = `teacher_token=${token};${expires};path=/;SameSite=None;Secure`;

    // Cross-subdomain sharing support for teacherportal.theeducode.com & admin.theeducode.com
    if (window.location.hostname.includes('theeducode.com')) {
        document.cookie = `admin_token=${token};${expires};path=/;domain=.theeducode.com;SameSite=None;Secure`;
        document.cookie = `teacher_token=${token};${expires};path=/;domain=.theeducode.com;SameSite=None;Secure`;
    }
}

/**
 * Get the authentication token across Admin & Teacher portals
 * Checks URL SSO params, localStorage, and shared cross-subdomain cookies
 * @returns {string|null} Authentication token or null
 */
export function getAdminToken() {
    if (typeof window === 'undefined') return null;

    // Priority 0: URL search param (?token=... or ?sso_token=...) when opened from teacherportal
    if (typeof window !== 'undefined' && window.location.search) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token') || urlParams.get('sso_token');
            if (urlToken && urlToken.length > 20) {
                // Ingest and persist so all subsequent requests and tabs remain authenticated
                localStorage.setItem('admin_token', urlToken);
                localStorage.setItem('teacher_token', urlToken);
                setAdminToken(urlToken);

                // Clean URL from address bar without reloading
                urlParams.delete('token');
                urlParams.delete('sso_token');
                const cleanQuery = urlParams.toString();
                const cleanUrl = window.location.pathname + (cleanQuery ? '?' + cleanQuery : '');
                window.history.replaceState({}, document.title, cleanUrl);

                return urlToken;
            }
        } catch (_) {}
    }

    // Priority 1: Direct admin_token in localStorage or cookie
    const tokenFromStorage = localStorage.getItem('admin_token');
    if (tokenFromStorage) return tokenFromStorage;

    const cookieToken = getCookie('admin_token');
    if (cookieToken) return cookieToken;

    // Priority 2: Teacher token from teacherportal (teacher_token)
    const teacherTokenStorage = localStorage.getItem('teacher_token');
    if (teacherTokenStorage) return teacherTokenStorage;

    const teacherTokenCookie = getCookie('teacher_token');
    if (teacherTokenCookie) return teacherTokenCookie;

    // Priority 3: Teacher session object (from teacherportal.theeducode.com)
    const teacherSessionStr = localStorage.getItem('teacher_session');
    if (teacherSessionStr) {
        try {
            const parsed = JSON.parse(teacherSessionStr);
            if (parsed?.token) return parsed.token;
            if (parsed?.data?.token) return parsed.data.token;
        } catch (_) {}
    }

    // Priority 4: University portal token (university_token)
    const uniTokenStorage = localStorage.getItem('university_token');
    if (uniTokenStorage) return uniTokenStorage;

    const uniTokenCookie = getCookie('university_token');
    if (uniTokenCookie) return uniTokenCookie;

    // Priority 5: Generic token fallback
    const genericToken = localStorage.getItem('token') || getCookie('token');
    if (genericToken) return genericToken;

    return null;
}

/**
 * Clear the authentication token across all scopes
 */
export function clearAdminToken() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('teacher_token');
    localStorage.removeItem('teacher_session');
    localStorage.removeItem('university_token');
    localStorage.removeItem('token');

    // Clear the cookie by setting expiry to past date
    const past = "expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = `admin_token=; ${past}`;
    document.cookie = `teacher_token=; ${past}`;
    document.cookie = `university_token=; ${past}`;

    if (window.location.hostname.includes('theeducode.com')) {
        document.cookie = `admin_token=; ${past} domain=.theeducode.com;`;
        document.cookie = `teacher_token=; ${past} domain=.theeducode.com;`;
        document.cookie = `university_token=; ${past} domain=.theeducode.com;`;
    }
}
