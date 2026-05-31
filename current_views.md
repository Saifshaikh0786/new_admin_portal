-- ═══════════════════════════════════════════════════════════════════════════
-- ADMIN DASHBOARD VIEWS — Run in Supabase SQL Editor
-- Replaces: APIs/src/routes/university_admin.js (1474 lines)
--           APIs/src/routes/student_dashboard.js (587 lines)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- VIEW 1: view_section_student_scores
-- Purpose: Section analytics matrix — per-student, per-course scores
-- Replaces: /admin/section-analytics/:sectionName (lines 343-513)
-- Usage:    SELECT * FROM view_section_student_scores
--           WHERE university_id = '<uid>' AND section = 'A';
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.view_section_student_scores AS
SELECT
  s.uni_id            AS university_id,
  s.student_id,
  s.student_name,
  s.uni_reg_id,
  s.section,
  s.batch_id,
  c.course_id,
  c.course_name,
  r.result_type,
  r.lecture_id,
  l.lecture_name,
  r.marks_obtained,
  r.total_marks,
  r.attempt_count,
  r.submitted_at,
  r.submit_reason,
  -- Pre-computed percentage (avoids JS-side Math.round loops)
  CASE
    WHEN r.total_marks > 0
    THEN ROUND((r.marks_obtained::numeric / r.total_marks::numeric) * 100, 1)
    ELSE 0
  END AS score_percent,
  -- Pass/fail at 50% threshold (matches old API logic)
  CASE
    WHEN r.total_marks > 0 AND (r.marks_obtained::numeric / r.total_marks::numeric) >= 0.5
    THEN 'Pass'
    ELSE 'Fail'
  END AS status
FROM students_v2 s
JOIN results_v2 r ON r.student_id = s.student_id
JOIN courses_v2 c ON c.course_id = r.course_id
JOIN lectures_v2 l ON l.lecture_id = r.lecture_id
WHERE s.account_type = 'student';


-- ─────────────────────────────────────────────────────────────────────────
-- VIEW 2: view_lecture_completion_stats
-- Purpose: Per-lecture completion rates + average scores
-- Replaces: hardcoded 75% / 82 / 65 analytics in old API
-- Usage:    SELECT * FROM view_lecture_completion_stats
--           WHERE course_id = '<course_uuid>';
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.view_lecture_completion_stats AS
SELECT
  l.lecture_id,
  l.lecture_name,
  l.unit_id,
  u.unit_name,
  l.course_id,
  c.course_name,
  uni.university_id,
  l.sub_type,
  
  -- Total students enrolled in this university for this course
  (
    SELECT COUNT(DISTINCT s2.student_id)
    FROM students_v2 s2
    JOIN batch_courses_v2 bc2 ON bc2.batch_id = s2.batch_id
    JOIN batches_v2 b2 ON b2.batch_id = bc2.batch_id
    WHERE bc2.course_id = l.course_id
      AND b2.university_id = uni.university_id
      AND s2.account_type = 'student'
  ) AS total_enrolled,

  -- Students who submitted coding
  COUNT(DISTINCT CASE WHEN r.result_type = 'coding' THEN r.student_id END) AS coding_submitted_count,
  -- Students who submitted MCQ
  COUNT(DISTINCT CASE WHEN r.result_type = 'mcq' THEN r.student_id END) AS mcq_submitted_count,

  -- Average coding score %
  COALESCE(
    ROUND(
      AVG(CASE WHEN r.result_type = 'coding' AND r.total_marks > 0
        THEN (r.marks_obtained::numeric / r.total_marks::numeric) * 100
      END), 1
    ), 0
  ) AS avg_coding_score,

  -- Average MCQ score %
  COALESCE(
    ROUND(
      AVG(CASE WHEN r.result_type = 'mcq' AND r.total_marks > 0
        THEN (r.marks_obtained::numeric / r.total_marks::numeric) * 100
      END), 1
    ), 0
  ) AS avg_mcq_score,

  -- Total questions available
  (SELECT COUNT(*) FROM questions_v2 q WHERE q.lecture_id = l.lecture_id AND q.question_type = 'coding') AS total_coding_questions,
  (SELECT COUNT(*) FROM questions_v2 q WHERE q.lecture_id = l.lecture_id AND q.question_type = 'mcq') AS total_mcq_questions,
  
  -- Sorting positions (appended at the end to satisfy Postgres REPLACE rules)
  l.position AS lecture_position,
  u.position AS unit_position

FROM lectures_v2 l
JOIN units_v2 u ON u.unit_id = l.unit_id
JOIN courses_v2 c ON c.course_id = l.course_id
-- Get all universities that have this course assigned
JOIN (
  SELECT DISTINCT bc.course_id, b.university_id 
  FROM batch_courses_v2 bc 
  JOIN batches_v2 b ON b.batch_id = bc.batch_id
) uni ON uni.course_id = l.course_id
-- Join results for this lecture filtering by students belonging to this university
LEFT JOIN results_v2 r ON r.lecture_id = l.lecture_id 
LEFT JOIN students_v2 stu ON stu.student_id = r.student_id AND stu.uni_id = uni.university_id
WHERE (r.result_id IS NULL OR stu.student_id IS NOT NULL) -- ensures we only count results for this uni, or keep the row if no results
GROUP BY l.lecture_id, l.lecture_name, l.unit_id, u.unit_name, l.course_id, c.course_name, uni.university_id, l.sub_type, l.position, u.position;



-- ─────────────────────────────────────────────────────────────────────────
-- VIEW 3: view_student_attempt_history
-- Purpose: Individual student deep-dive — all attempts + per-question scores
-- Replaces: /admin/analytics/sub-unit-details (lines 526-791)
-- Usage:    SELECT * FROM view_student_attempt_history
--           WHERE student_id = '<uuid>' AND course_id = '<uuid>';
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.view_student_attempt_history AS
SELECT
  r.result_id,
  r.student_id,
  s.uni_id AS university_id,
  r.course_id,
  r.lecture_id,
  r.result_type,
  r.marks_obtained,
  r.total_marks,
  r.attempt_count,
  r.submitted_at,
  r.submit_reason,
  CASE
    WHEN r.total_marks > 0
    THEN ROUND((r.marks_obtained::numeric / r.total_marks::numeric) * 100, 1)
    ELSE 0
  END AS score_percent,
  CASE
    WHEN r.total_marks > 0 AND (r.marks_obtained::numeric / r.total_marks::numeric) >= 0.5
    THEN 'Passed'
    ELSE 'Failed'
  END AS status,
  -- Student info
  s.student_name,
  s.uni_reg_id,
  s.section,
  -- Course + lecture info
  c.course_name,
  l.lecture_name,
  l.sub_type AS lecture_type
FROM results_v2 r
JOIN students_v2 s ON s.student_id = r.student_id
JOIN courses_v2 c ON c.course_id = r.course_id
JOIN lectures_v2 l ON l.lecture_id = r.lecture_id;


-- ─────────────────────────────────────────────────────────────────────────
-- VIEW 4: view_batch_overview
-- Purpose: Batch-level dashboard summary
-- Replaces: /admin/my-batches + sections logic + student counts
-- Usage:    SELECT * FROM view_batch_overview
--           WHERE university_id = '<uid>';
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.view_batch_overview AS
SELECT
  b.batch_id,
  b.university_id,
  b.batch_name,
  b.starting_date,
  b.ending_date,
  b.batch_student_strength,

  -- Actual enrolled student count
  (SELECT COUNT(*) FROM students_v2 s WHERE s.batch_id = b.batch_id AND s.account_type = 'student') AS actual_student_count,

  -- Distinct sections in this batch
  (
    SELECT COALESCE(array_agg(DISTINCT s.section ORDER BY s.section), '{}')
    FROM students_v2 s
    WHERE s.batch_id = b.batch_id AND s.section IS NOT NULL AND s.account_type = 'student'
  ) AS sections,

  -- Array of course IDs assigned to this batch (used by frontend .length)
  (
    SELECT COALESCE(array_agg(bc.course_id), '{}')
    FROM batch_courses_v2 bc 
    WHERE bc.batch_id = b.batch_id
  ) AS registered_courses_id,

  -- Array of course names assigned to this batch
  (
    SELECT COALESCE(array_agg(c.course_name ORDER BY c.course_name), '{}')
    FROM batch_courses_v2 bc
    JOIN courses_v2 c ON c.course_id = bc.course_id
    WHERE bc.batch_id = b.batch_id
  ) AS course_names,

  -- Average score across all results for students in this batch
  COALESCE(
    (
      SELECT ROUND(AVG(
        CASE WHEN r.total_marks > 0
          THEN (r.marks_obtained::numeric / r.total_marks::numeric) * 100
        END
      ), 1)
      FROM results_v2 r
      JOIN students_v2 s ON s.student_id = r.student_id
      WHERE s.batch_id = b.batch_id AND s.account_type = 'student'
    ), 0
  ) AS avg_performance

FROM batches_v2 b;


-- ─────────────────────────────────────────────────────────────────────────
-- VIEW 5: view_student_course_completion (NEW)
-- Purpose: TRUE score-based course completion per student
-- Usage:    SELECT * FROM view_student_course_completion WHERE course_id = '...'
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.view_student_course_completion AS
SELECT 
    s.student_id,
    s.student_name,
    s.uni_reg_id,
    s.section,
    s.batch_id,
    s.uni_id AS university_id,
    c.course_id,
    c.course_name,
    c.course_type,
    -- Raw marks
    COALESCE(SUM(r.marks_obtained), 0) AS total_marks_obtained,
    COALESCE(SUM(r.total_marks), 0) AS total_possible_marks,
    -- True Course Score %
    CASE 
        WHEN COALESCE(SUM(r.total_marks), 0) > 0 
        THEN ROUND((SUM(r.marks_obtained)::numeric / SUM(r.total_marks)::numeric) * 100, 1)
        ELSE 0 
    END AS course_score_percent,
    -- MCQ-specific
    COALESCE(SUM(CASE WHEN r.result_type = 'mcq' THEN r.marks_obtained END), 0) AS mcq_marks,
    COALESCE(SUM(CASE WHEN r.result_type = 'mcq' THEN r.total_marks END), 0) AS mcq_total,
    -- Coding-specific
    COALESCE(SUM(CASE WHEN r.result_type = 'coding' THEN r.marks_obtained END), 0) AS coding_marks,
    COALESCE(SUM(CASE WHEN r.result_type = 'coding' THEN r.total_marks END), 0) AS coding_total,
    -- Number of lectures attempted
    COUNT(DISTINCT r.lecture_id) AS lectures_attempted,
    -- Status
    CASE 
        WHEN COALESCE(SUM(r.total_marks), 0) = 0 THEN 'Not Started'
        WHEN (SUM(r.marks_obtained)::numeric / NULLIF(SUM(r.total_marks), 0)::numeric) >= 0.5 THEN 'Completed'
        ELSE 'At Risk'
    END AS course_status,
    -- Latest submission timestamp
    MAX(r.submitted_at) AS last_activity
FROM students_v2 s
JOIN batch_courses_v2 bc ON bc.batch_id = s.batch_id
JOIN courses_v2 c ON c.course_id = bc.course_id
LEFT JOIN results_v2 r ON r.student_id = s.student_id AND r.course_id = c.course_id
WHERE s.account_type = 'student'
GROUP BY s.student_id, s.student_name, s.uni_reg_id, s.section, s.batch_id, s.uni_id,
         c.course_id, c.course_name, c.course_type;


-- ─────────────────────────────────────────────────────────────────────────
-- VIEW 6: view_exam_proctoring_summary (NEW)
-- Purpose: Proctoring + Behavioral tracking (Compile vs Submit) per lecture
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.view_exam_proctoring_summary AS
SELECT
    e.university_id,
    e.student_id,
    e.course_id,
    e.lecture_id,
    s.student_name,
    s.uni_reg_id,
    s.section,
    -- Proctoring violations
    COUNT(*) FILTER (WHERE e.event_type = 'focus_loss') AS focus_lost_count,
    COUNT(*) FILTER (WHERE e.event_type = 'tab_switch') AS tab_switch_count,
    COUNT(*) FILTER (WHERE e.event_type = 'disconnect') AS disconnect_count,
    -- Behavioral: Compile vs Submit counts
    COUNT(*) FILTER (WHERE e.event_type = 'compile_click') AS compile_count,
    COUNT(*) FILTER (WHERE e.event_type = 'submit') AS submit_count,
    COUNT(*) AS total_events
FROM exam_events_v2 e
JOIN students_v2 s ON s.student_id = e.student_id
GROUP BY e.university_id, e.student_id, e.course_id, e.lecture_id,
         s.student_name, s.uni_reg_id, s.section;


-- ─────────────────────────────────────────────────────────────────────────
-- VIEW 7: view_course_score_distribution (NEW)
-- Purpose: Pre-calculated brackets for the Score Distribution charts
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.view_course_score_distribution AS
WITH student_scores AS (
    SELECT * FROM view_student_course_completion
)
SELECT 
    course_id,
    course_name,
    university_id,
    course_type,
    COUNT(*) AS total_students,
    COUNT(*) FILTER (WHERE course_score_percent >= 90) AS bracket_90_100,
    COUNT(*) FILTER (WHERE course_score_percent >= 75 AND course_score_percent < 90) AS bracket_75_89,
    COUNT(*) FILTER (WHERE course_score_percent >= 50 AND course_score_percent < 75) AS bracket_50_74,
    COUNT(*) FILTER (WHERE course_score_percent > 0 AND course_score_percent < 50) AS bracket_below_50,
    COUNT(*) FILTER (WHERE course_score_percent = 0) AS not_started,
    ROUND(AVG(course_score_percent), 1) AS avg_course_score
FROM student_scores
GROUP BY course_id, course_name, university_id, course_type;


-- ═══════════════════════════════════════════════════════════════════════════
-- GRANT READ ACCESS (Supabase anon/service role needs SELECT on views)
-- ═══════════════════════════════════════════════════════════════════════════
GRANT SELECT ON public.view_section_student_scores TO anon, authenticated, service_role;
GRANT SELECT ON public.view_lecture_completion_stats TO anon, authenticated, service_role;
GRANT SELECT ON public.view_student_attempt_history TO anon, authenticated, service_role;
GRANT SELECT ON public.view_batch_overview TO anon, authenticated, service_role;
GRANT SELECT ON public.view_student_course_completion TO anon, authenticated, service_role;
GRANT SELECT ON public.view_exam_proctoring_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.view_course_score_distribution TO anon, authenticated, service_role;
