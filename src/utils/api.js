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
        myBatches: '/admin/dashboard/overview',
        myTeachers: '/admin/dashboard/teachers-summary',
        courseStructure: (courseId) => `/admin/analytics/course-structure/${courseId}`,
        courseStructureAnalytics: '/admin/analytics/course-structure-analytics',
        sectionAnalytics: (sectionName) => `/admin/analytics/section-matrix`, // This will be used as POST
        subUnitDetails: '/admin/analytics/sub-unit-details',
        unitCompletion: '/admin/analytics/unit-completion',
        bulkExportUnits: '/admin/analytics/bulk-export-units',
        sectionCompletion: '/admin/analytics/section-completion',
        getSectionsByBatch: '/admin/dashboard/get-sections-by-batch',
        needsAttention: '/admin/dashboard/attention',
        liveSummary: '/admin/dashboard/live-summary',
        examsOverview: '/admin/analytics/exams-overview',
        examAttemptedStudents: '/admin/analytics/exam-attempted-students',

        getPracticeCoursesByBatch: '/admin/dashboard/get-practice-courses-by-batch',
        getExamCoursesByBatch: '/admin/courses/get-exam-courses-by-batch', // Assuming you'll add this if needed
        examDetails: '/admin/analytics/section-exam-progress',
        checkDetails: '/api/university/admin/check-details',
        updateDetails: '/admin/dashboard/profile',
        updatePassword: '/admin/dashboard/update-password',
        studentsSummary: '/admin/dashboard/students-summary',
        teachersSummary: '/admin/dashboard/teachers-summary',
        studentsBySection: '/admin/dashboard/students-by-section',
        studentDeepDive: '/admin/analytics/student-deep-dive',
        studentOverview: '/admin/analytics/student-overview',
        getAllCourses: '/admin/courses/getAllCourses',
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
        sections: '/admin/dashboard/sections',
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
