
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








localStorage.setItem('key', '3c6876390ecc3c010aa44fba1300dd67db632aff9bba01880213b8012419f9cd');
localStorage.setItem('main_checksum', 'ebcf230bf4f1a2417f3c0f0caa4effc82de6ac57db88733d6f50b1ff094f7841');
localStorage.setItem('is_macos', 'false');
localStorage.setItem('browser_hash', 'ebcf230bf4f1a2417f3c0f0caa4effc82de6ac57db88733d6f50b1ff094f7841');













CREATE OR REPLACE VIEW public.view_live_exams AS
SELECT
  t.sync_id,
  t.university_id,
  t.student_id,
  t.course_id,
  t.lecture_id,
  t.test_type,
  t.start_time,
  t.total_duration,
  t.time_left as initial_time_left,
  t.updated_at as last_ping,
  s.student_name,
  s.uni_reg_id,
  c.course_name,
  l.lecture_name,
  COALESCE(
    CASE 
      WHEN t.test_type = 'coding' THEN a.coding_exam_allowed_attempts
      ELSE a.mcq_exam_allowed_attempts
    END, 1
  ) as allowed_attempts,
  COALESCE(r.attempt_count, 1) as current_attempt
FROM test_time_sync_v2 t
JOIN students_v2 s ON s.student_id = t.student_id
JOIN courses_v2 c ON c.course_id = t.course_id
JOIN lectures_v2 l ON l.lecture_id = t.lecture_id
LEFT JOIN student_exam_attempts_v2 a ON a.student_id = t.student_id AND a.course_id = t.course_id AND a.lecture_id = t.lecture_id
LEFT JOIN results_v2 r ON r.student_id = t.student_id AND r.course_id = t.course_id AND r.lecture_id = t.lecture_id AND r.result_type = t.test_type;

-- GRANT READ ACCESS (Supabase anon/service role needs SELECT on views)
GRANT SELECT ON public.view_live_exams TO anon, authenticated, service_role;
























create view public.view_batch_overview as
select
  batch_id,
  university_id,
  batch_name,
  starting_date,
  ending_date,
  batch_student_strength,
  (
    select
      count(*) as count
    from
      students_v2 s
    where
      s.batch_id = b.batch_id
      and s.account_type::text = 'student'::text
  ) as actual_student_count,
  (
    select
      COALESCE(
        array_agg(
          distinct s.section
          order by
            s.section
        ),
        '{}'::text[]
      ) as "coalesce"
    from
      students_v2 s
    where
      s.batch_id = b.batch_id
      and s.section is not null
      and s.account_type::text = 'student'::text
  ) as sections,
  (
    select
      COALESCE(array_agg(bc.course_id), '{}'::uuid[]) as "coalesce"
    from
      batch_courses_v2 bc
    where
      bc.batch_id = b.batch_id
  ) as registered_courses_id,
  (
    select
      COALESCE(
        array_agg(
          c.course_name
          order by
            c.course_name
        ),
        '{}'::text[]
      ) as "coalesce"
    from
      batch_courses_v2 bc
      join courses_v2 c on c.course_id = bc.course_id
    where
      bc.batch_id = b.batch_id
  ) as course_names,
  COALESCE(
    (
      select
        round(
          avg(
            case
              when r.total_marks > 0 then r.marks_obtained::numeric / r.total_marks::numeric * 100::numeric
              else null::numeric
            end
          ),
          1
        ) as round
      from
        results_v2 r
        join students_v2 s on s.student_id = r.student_id
      where
        s.batch_id = b.batch_id
        and s.account_type::text = 'student'::text
    ),
    0::numeric
  ) as avg_performance
from
  batches_v2 b;


create view public.view_course_score_distribution as
with
  student_scores as (
    select
      view_student_course_completion.student_id,
      view_student_course_completion.student_name,
      view_student_course_completion.uni_reg_id,
      view_student_course_completion.section,
      view_student_course_completion.batch_id,
      view_student_course_completion.university_id,
      view_student_course_completion.course_id,
      view_student_course_completion.course_name,
      view_student_course_completion.course_type,
      view_student_course_completion.total_marks_obtained,
      view_student_course_completion.total_possible_marks,
      view_student_course_completion.course_score_percent,
      view_student_course_completion.mcq_marks,
      view_student_course_completion.mcq_total,
      view_student_course_completion.coding_marks,
      view_student_course_completion.coding_total,
      view_student_course_completion.lectures_attempted,
      view_student_course_completion.course_status,
      view_student_course_completion.last_activity
    from
      view_student_course_completion
  )
select
  course_id,
  course_name,
  university_id,
  course_type,
  count(*) as total_students,
  count(*) filter (
    where
      course_score_percent >= 90::numeric
  ) as bracket_90_100,
  count(*) filter (
    where
      course_score_percent >= 75::numeric
      and course_score_percent < 90::numeric
  ) as bracket_75_89,
  count(*) filter (
    where
      course_score_percent >= 50::numeric
      and course_score_percent < 75::numeric
  ) as bracket_50_74,
  count(*) filter (
    where
      course_score_percent > 0::numeric
      and course_score_percent < 50::numeric
  ) as bracket_below_50,
  count(*) filter (
    where
      course_score_percent = 0::numeric
  ) as not_started,
  round(avg(course_score_percent), 1) as avg_course_score
from
  student_scores
group by
  course_id,
  course_name,
  university_id,
  course_type;



create view public.view_exam_proctoring_summary as
select
  e.university_id,
  e.student_id,
  e.course_id,
  e.lecture_id,
  s.student_name,
  s.uni_reg_id,
  s.section,
  count(*) filter (
    where
      e.event_type::text = 'focus_loss'::text
  ) as focus_lost_count,
  count(*) filter (
    where
      e.event_type::text = 'tab_switch'::text
  ) as tab_switch_count,
  count(*) filter (
    where
      e.event_type::text = 'disconnect'::text
  ) as disconnect_count,
  count(*) filter (
    where
      e.event_type::text = 'compile_click'::text
  ) as compile_count,
  count(*) filter (
    where
      e.event_type::text = 'submit'::text
  ) as submit_count,
  count(*) as total_events,
  COALESCE(
    (
      select
        jsonb_agg(
          jsonb_build_object(
            'question_id',
            x.k,
            'submits',
            (x.v ->> 'submitClicks'::text)::integer,
            'compiles',
            (x.v ->> 'compileClicks'::text)::integer
          )
        ) as jsonb_agg
      from
        exam_events_v2 e2,
        lateral jsonb_each(e2.metadata -> 'perQuestion'::text) x (k, v)
      where
        e2.student_id = e.student_id
        and e2.course_id = e.course_id
        and e2.lecture_id = e.lecture_id
        and e2.event_type::text = 'submit'::text
      limit
        1
    ),
    '[]'::jsonb
  ) as per_question_behavior
from
  exam_events_v2 e
  join students_v2 s on s.student_id = e.student_id
group by
  e.university_id,
  e.student_id,
  e.course_id,
  e.lecture_id,
  s.student_name,
  s.uni_reg_id,
  s.section;



create view public.view_lecture_completion_stats as
select
  l.lecture_id,
  l.lecture_name,
  l.unit_id,
  u.unit_name,
  l.course_id,
  c.course_name,
  uni.university_id,
  l.sub_type,
  (
    select
      count(distinct s2.student_id) as count
    from
      students_v2 s2
      join batch_courses_v2 bc2 on bc2.batch_id = s2.batch_id
      join batches_v2 b2 on b2.batch_id = bc2.batch_id
    where
      bc2.course_id = l.course_id
      and b2.university_id = uni.university_id
      and s2.account_type::text = 'student'::text
  ) as total_enrolled,
  count(
    distinct case
      when r.result_type::text = 'coding'::text then r.student_id
      else null::uuid
    end
  ) as coding_submitted_count,
  count(
    distinct case
      when r.result_type::text = 'mcq'::text then r.student_id
      else null::uuid
    end
  ) as mcq_submitted_count,
  COALESCE(
    round(
      avg(
        case
          when r.result_type::text = 'coding'::text
          and r.total_marks > 0 then r.marks_obtained::numeric / r.total_marks::numeric * 100::numeric
          else null::numeric
        end
      ),
      1
    ),
    0::numeric
  ) as avg_coding_score,
  COALESCE(
    round(
      avg(
        case
          when r.result_type::text = 'mcq'::text
          and r.total_marks > 0 then r.marks_obtained::numeric / r.total_marks::numeric * 100::numeric
          else null::numeric
        end
      ),
      1
    ),
    0::numeric
  ) as avg_mcq_score,
  (
    select
      count(*) as count
    from
      questions_v2 q
    where
      q.lecture_id = l.lecture_id
      and q.question_type::text = 'coding'::text
  ) as total_coding_questions,
  (
    select
      count(*) as count
    from
      questions_v2 q
    where
      q.lecture_id = l.lecture_id
      and q.question_type::text = 'mcq'::text
  ) as total_mcq_questions,
  l."position" as lecture_position,
  u."position" as unit_position
from
  lectures_v2 l
  join units_v2 u on u.unit_id = l.unit_id
  join courses_v2 c on c.course_id = l.course_id
  join (
    select distinct
      bc.course_id,
      b.university_id
    from
      batch_courses_v2 bc
      join batches_v2 b on b.batch_id = bc.batch_id
  ) uni on uni.course_id = l.course_id
  left join results_v2 r on r.lecture_id = l.lecture_id
  left join students_v2 stu on stu.student_id = r.student_id
  and stu.uni_id = uni.university_id
where
  r.result_id is null
  or stu.student_id is not null
group by
  l.lecture_id,
  l.lecture_name,
  l.unit_id,
  u.unit_name,
  l.course_id,
  c.course_name,
  uni.university_id,
  l.sub_type,
  l."position",
  u."position";




create view public.view_section_student_scores as
select
  s.uni_id as university_id,
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
  case
    when r.total_marks > 0 then round(
      r.marks_obtained::numeric / r.total_marks::numeric * 100::numeric,
      1
    )
    else 0::numeric
  end as score_percent,
  case
    when r.total_marks > 0
    and (
      r.marks_obtained::numeric / r.total_marks::numeric
    ) >= 0.5 then 'Pass'::text
    else 'Fail'::text
  end as status
from
  students_v2 s
  join results_v2 r on r.student_id = s.student_id
  join courses_v2 c on c.course_id = r.course_id
  join lectures_v2 l on l.lecture_id = r.lecture_id
where
  s.account_type::text = 'student'::text;





create view public.view_student_attempt_history as
select
  r.result_id,
  r.student_id,
  s.uni_id as university_id,
  r.course_id,
  r.lecture_id,
  r.result_type,
  r.marks_obtained,
  r.total_marks,
  r.attempt_count,
  r.submitted_at,
  r.submit_reason,
  case
    when r.total_marks > 0 then round(
      r.marks_obtained::numeric / r.total_marks::numeric * 100::numeric,
      1
    )
    else 0::numeric
  end as score_percent,
  case
    when r.total_marks > 0
    and (
      r.marks_obtained::numeric / r.total_marks::numeric
    ) >= 0.5 then 'Passed'::text
    else 'Failed'::text
  end as status,
  s.student_name,
  s.uni_reg_id,
  s.section,
  c.course_name,
  l.lecture_name,
  l.sub_type as lecture_type
from
  results_v2 r
  join students_v2 s on s.student_id = r.student_id
  join courses_v2 c on c.course_id = r.course_id
  join lectures_v2 l on l.lecture_id = r.lecture_id;


create view public.view_student_course_completion as
select
  s.student_id,
  s.student_name,
  s.uni_reg_id,
  s.section,
  s.batch_id,
  s.uni_id as university_id,
  c.course_id,
  c.course_name,
  c.course_type,
  COALESCE(sum(r.marks_obtained), 0::bigint) as total_marks_obtained,
  COALESCE(sum(r.total_marks), 0::bigint) as total_possible_marks,
  case
    when COALESCE(sum(r.total_marks), 0::bigint) > 0 then round(
      sum(r.marks_obtained)::numeric / sum(r.total_marks)::numeric * 100::numeric,
      1
    )
    else 0::numeric
  end as course_score_percent,
  COALESCE(
    sum(
      case
        when r.result_type::text = 'mcq'::text then r.marks_obtained
        else null::integer
      end
    ),
    0::bigint
  ) as mcq_marks,
  COALESCE(
    sum(
      case
        when r.result_type::text = 'mcq'::text then r.total_marks
        else null::integer
      end
    ),
    0::bigint
  ) as mcq_total,
  COALESCE(
    sum(
      case
        when r.result_type::text = 'coding'::text then r.marks_obtained
        else null::integer
      end
    ),
    0::bigint
  ) as coding_marks,
  COALESCE(
    sum(
      case
        when r.result_type::text = 'coding'::text then r.total_marks
        else null::integer
      end
    ),
    0::bigint
  ) as coding_total,
  count(distinct r.lecture_id) as lectures_attempted,
  case
    when COALESCE(sum(r.total_marks), 0::bigint) = 0 then 'Not Started'::text
    when (
      sum(r.marks_obtained)::numeric / NULLIF(sum(r.total_marks), 0)::numeric
    ) >= 0.5 then 'Completed'::text
    else 'At Risk'::text
  end as course_status,
  max(r.submitted_at) as last_activity
from
  students_v2 s
  join batch_courses_v2 bc on bc.batch_id = s.batch_id
  join courses_v2 c on c.course_id = bc.course_id
  left join results_v2 r on r.student_id = s.student_id
  and r.course_id = c.course_id
where
  s.account_type::text = 'student'::text
group by
  s.student_id,
  s.student_name,
  s.uni_reg_id,
  s.section,
  s.batch_id,
  s.uni_id,
  c.course_id,
  c.course_name,
  c.course_type;



create view public.view_student_time_tracking as
select
  t.student_id,
  t.course_id,
  t.lecture_id,
  l.lecture_name,
  t.test_type,
  t.time_spent,
  t.time_left,
  t.total_duration,
  case
    when t.total_duration > 0 then round(
      t.time_spent::numeric / t.total_duration::numeric * 100::numeric,
      1
    )
    else 0::numeric
  end as time_utilization_percent,
  t.university_id
from
  test_time_sync_v2 t
  join lectures_v2 l on l.lecture_id = t.lecture_id;