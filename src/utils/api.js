export const API_CONFIG = {
    // Base URLs (Proxy Paths)
    baseUrl: {
        admin: '/api/proxy/admin',
        student: '/api/proxy/student',
        teacher: '/api/proxy/teacher',
    },

    // Admin Endpoints
    admin: {
        login: '/universities/login',
        logout: '/universities/logout',
        me: '/admin/dashboard/profile',
        myBatches: '/api/university/admin/my-batches',
        myTeachers: '/api/university/admin/my-teachers',
        courseStructure: (courseId) => `/api/university/admin/course-structure/${courseId}`,
        sectionAnalytics: (sectionName) => `/api/university/admin/section-analytics/${sectionName}`,
        subUnitDetails: '/api/university/admin/analytics/sub-unit-details',
        unitCompletion: '/api/auth/teacher/teacher/analytics/unit-completion',
        sectionCompletion: '/api/auth/teacher/teacher/analytics/section-completion',
        getSectionsByBatch: '/api/university/admin/get-sections-by-batch',

        getPracticeCoursesByBatch: '/api/university/admin/get-practice-courses-by-batch',
        getExamCoursesByBatch: '/api/university/admin/get-exam-courses-by-batch',
        examDetails: '/api/auth/teacher/teacher/analytics/section-exam-progress',
        checkDetails: '/api/university/admin/check-details',
        updateDetails: '/admin/dashboard/profile',
        updatePassword: '/admin/dashboard/update-password',
        studentsSummary: '/admin/dashboard/students-summary',
        teachersSummary: '/admin/dashboard/teachers-summary',
        studentsBySection: '/admin/dashboard/students-by-section',
        getAllCourses: '/api/university/admin/get-courses-by-email',
        getCourseContent: '/api/university/admin/course/full-content',

        // Phase 2 New Analytics Endpoints (Mapped via local proxy)
        analytics: {
            summary: '/admin/analytics/summary',
            courseStudents: '/admin/analytics/course-students',
            proctoringSummary: '/admin/analytics/proctoring-summary',
            studentDeepDive: '/admin/analytics/student-deep-dive',
            sittingAttendance: '/admin/analytics/sitting-attendance',
            liveRoster: '/admin/analytics/live-roster',
            lectureExamConfig: '/admin/analytics/lecture-exam-config',
            sectionStudents: '/admin/analytics/section-students',
        },
        
        // Live Exams
        liveExams: '/admin/live-exams',
        extendAttempt: '/admin/extend-attempt',
        extendTime: '/admin/extend-time',
    },

    // Master Data
    masters: {
        sections: '/api/masters/sections',
        batches: '/api/masters/batches',
    },

    // Course & Structure
    courses: (batchId) => `/api/courses/${batchId}`,
    structure: (courseId) => `/api/structure/${courseId}`,

    // Student Data
    student: {
        lookup: '/api/lookup',
        history: '/api/student/history',
        attemptDetails: '/api/student/attempt-details',
    },

    // Analytics & Export
    analytics: {
        summary: '/api/analytics/summary',
        export: '/api/export/excel',
    }
};
