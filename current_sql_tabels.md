-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.app_updates_v2 (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  os text NOT NULL UNIQUE,
  update_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_updates_v2_pkey PRIMARY KEY (id)
);
CREATE TABLE public.batch_courses_v2 (
  batch_id uuid NOT NULL,
  course_id uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT batch_courses_v2_pkey PRIMARY KEY (batch_id, course_id),
  CONSTRAINT batch_courses_v2_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches_v2(batch_id),
  CONSTRAINT batch_courses_v2_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses_v2(course_id)
);
CREATE TABLE public.batches (
  batch_name text NOT NULL,
  starting_date date NOT NULL,
  ending_date date NOT NULL,
  university_id uuid,
  batch_student_strength integer,
  batch_instructor_id uuid,
  batch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  registered_courses_id ARRAY DEFAULT '{}'::uuid[],
  CONSTRAINT batches_pkey PRIMARY KEY (batch_id),
  CONSTRAINT batches_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(uid)
);
CREATE TABLE public.batches_v2 (
  university_id uuid NOT NULL,
  batch_name text NOT NULL,
  starting_date date NOT NULL,
  ending_date date NOT NULL,
  batch_student_strength integer,
  batch_instructor_id uuid,
  batch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT batches_v2_pkey PRIMARY KEY (batch_id),
  CONSTRAINT batches_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid)
);
CREATE TABLE public.coding_details_v2 (
  question_id uuid NOT NULL UNIQUE,
  description text NOT NULL,
  code_constraint text,
  input_format text,
  output_format text,
  language_id integer,
  compiler_code jsonb,
  starter_code text,
  starter_codes jsonb,
  header text,
  footer text,
  coding_id uuid NOT NULL DEFAULT gen_random_uuid(),
  sample_io jsonb DEFAULT '[]'::jsonb,
  hidden_test_cases jsonb DEFAULT '[]'::jsonb,
  has_multi_starter boolean DEFAULT false,
  has_header boolean DEFAULT false,
  has_footer boolean DEFAULT false,
  has_files boolean DEFAULT false,
  files jsonb DEFAULT '[]'::jsonb,
  has_whitelist boolean DEFAULT false,
  whitelist ARRAY DEFAULT '{}'::text[],
  has_blacklist boolean DEFAULT false,
  blacklist ARRAY DEFAULT '{}'::text[],
  images jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT coding_details_v2_pkey PRIMARY KEY (coding_id),
  CONSTRAINT coding_details_v2_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions_v2(question_id)
);
CREATE TABLE public.courses (
  course_name text NOT NULL,
  course_code text,
  course_starting_date date NOT NULL,
  course_ending_date date NOT NULL,
  course_duration interval,
  course_total_units integer NOT NULL,
  course_id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id character varying NOT NULL DEFAULT 'UNKNOWN'::character varying,
  CONSTRAINT courses_pkey PRIMARY KEY (course_id)
);
CREATE TABLE public.courses_v2 (
  university_id uuid NOT NULL,
  course_name text NOT NULL,
  course_code text,
  course_starting_date date NOT NULL,
  course_ending_date date NOT NULL,
  firebase_course_id text,
  course_id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_total_units integer NOT NULL DEFAULT 0,
  course_type character varying NOT NULL DEFAULT 'practice'::character varying CHECK (course_type::text = ANY (ARRAY['practice'::character varying, 'exam'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT courses_v2_pkey PRIMARY KEY (course_id),
  CONSTRAINT courses_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid)
);
CREATE TABLE public.exam_events_v2 (
  university_id uuid NOT NULL,
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  lecture_id uuid NOT NULL,
  event_type character varying NOT NULL CHECK (event_type::text = ANY (ARRAY['focus_loss'::character varying, 'tab_switch'::character varying, 'ip_change'::character varying, 'compile_click'::character varying, 'disconnect'::character varying, 'reconnect'::character varying, 'submit'::character varying, 'exam_start'::character varying, 'exam_end'::character varying]::text[])),
  event_id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_timestamp timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT exam_events_v2_pkey PRIMARY KEY (event_id),
  CONSTRAINT exam_events_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid),
  CONSTRAINT exam_events_v2_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students_v2(student_id),
  CONSTRAINT exam_events_v2_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses_v2(course_id),
  CONSTRAINT exam_events_v2_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures_v2(lecture_id)
);
CREATE TABLE public.exam_live_state_v2 (
  university_id uuid NOT NULL,
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  lecture_id uuid NOT NULL,
  question_id uuid NOT NULL,
  current_code text,
  state_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying NOT NULL DEFAULT 'resumed'::character varying CHECK (status::text = ANY (ARRAY['resumed'::character varying, 'autosaved'::character varying]::text[])),
  last_autosave_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT exam_live_state_v2_pkey PRIMARY KEY (state_id),
  CONSTRAINT exam_live_state_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid),
  CONSTRAINT exam_live_state_v2_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students_v2(student_id),
  CONSTRAINT exam_live_state_v2_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses_v2(course_id),
  CONSTRAINT exam_live_state_v2_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures_v2(lecture_id),
  CONSTRAINT exam_live_state_v2_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions_v2(question_id)
);
CREATE TABLE public.hackathon_students (
  student_name character varying NOT NULL,
  email character varying NOT NULL,
  phone text NOT NULL,
  registration_id character varying NOT NULL,
  student_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ref_no text NOT NULL DEFAULT '1234567890'::text,
  referral_code character varying,
  CONSTRAINT hackathon_students_pkey PRIMARY KEY (student_id, student_name, email, phone, registration_id)
);
CREATE TABLE public.lecture_exam_config_v2 (
  lecture_id uuid NOT NULL UNIQUE,
  config_id uuid NOT NULL DEFAULT gen_random_uuid(),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT lecture_exam_config_v2_pkey PRIMARY KEY (config_id),
  CONSTRAINT lecture_exam_config_v2_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures_v2(lecture_id)
);
CREATE TABLE public.lectures_v2 (
  unit_id uuid NOT NULL,
  course_id uuid NOT NULL,
  university_id uuid NOT NULL,
  lecture_name text NOT NULL,
  pdf_url text,
  pdf2_url text,
  video_url text,
  firebase_id text,
  lecture_id uuid NOT NULL DEFAULT gen_random_uuid(),
  lecture_type character varying NOT NULL DEFAULT 'practice'::character varying CHECK (lecture_type::text = ANY (ARRAY['practice'::character varying, 'exam'::character varying]::text[])),
  coding_questions_to_show integer DEFAULT 0,
  mcq_questions_to_show integer DEFAULT 0,
  shuffle_questions boolean DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  sub_type character varying DEFAULT 'practice'::character varying CHECK (sub_type::text = ANY (ARRAY['exam'::character varying, 'practice'::character varying, 'pdf'::character varying]::text[])),
  CONSTRAINT lectures_v2_pkey PRIMARY KEY (lecture_id),
  CONSTRAINT lectures_v2_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units_v2(unit_id),
  CONSTRAINT lectures_v2_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses_v2(course_id),
  CONSTRAINT lectures_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid)
);
CREATE TABLE public.mcq_details_v2 (
  question_id uuid NOT NULL UNIQUE,
  question_body text NOT NULL,
  mcq_sub_type character varying,
  unit_label text,
  lecture_label text,
  mcq_id uuid NOT NULL DEFAULT gen_random_uuid(),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  images jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT mcq_details_v2_pkey PRIMARY KEY (mcq_id),
  CONSTRAINT mcq_details_v2_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions_v2(question_id)
);
CREATE TABLE public.questions_v2 (
  lecture_id uuid NOT NULL,
  course_id uuid NOT NULL,
  university_id uuid NOT NULL,
  question_type character varying NOT NULL CHECK (question_type::text = ANY (ARRAY['mcq'::character varying, 'coding'::character varying]::text[])),
  topic text,
  difficulty character varying CHECK (difficulty::text = ANY (ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying]::text[])),
  firebase_id text,
  question_id uuid NOT NULL DEFAULT gen_random_uuid(),
  marks integer DEFAULT 0,
  has_image boolean DEFAULT false,
  tags ARRAY DEFAULT '{}'::text[],
  position integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT questions_v2_pkey PRIMARY KEY (question_id),
  CONSTRAINT questions_v2_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures_v2(lecture_id),
  CONSTRAINT questions_v2_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses_v2(course_id),
  CONSTRAINT questions_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid)
);
CREATE TABLE public.results (
  university_id uuid,
  student_id uuid,
  course_id uuid,
  unit_id character varying,
  sub_unit_id character varying,
  result_type text CHECK (result_type = ANY (ARRAY['mcq'::text, 'coding'::text])),
  marks_obtained numeric,
  total_marks numeric,
  analytics json,
  start_config json,
  end_config json,
  result_id uuid NOT NULL DEFAULT gen_random_uuid(),
  submitted_at timestamp without time zone DEFAULT now(),
  attempt_count numeric DEFAULT '1'::numeric,
  CONSTRAINT results_pkey PRIMARY KEY (result_id),
  CONSTRAINT results_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(course_id),
  CONSTRAINT results_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id),
  CONSTRAINT results_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(uid)
);
CREATE TABLE public.results_v2 (
  university_id uuid NOT NULL,
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  lecture_id uuid NOT NULL,
  result_type character varying NOT NULL CHECK (result_type::text = ANY (ARRAY['mcq'::character varying, 'coding'::character varying]::text[])),
  result_id uuid NOT NULL DEFAULT gen_random_uuid(),
  marks_obtained integer NOT NULL DEFAULT 0,
  total_marks integer NOT NULL DEFAULT 0,
  attempt_count integer NOT NULL DEFAULT 1 CHECK (attempt_count >= 1),
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  submit_reason character varying NOT NULL DEFAULT 'manual'::character varying CHECK (submit_reason::text = ANY (ARRAY['manual'::character varying, 'time_up'::character varying, 'auto_submit'::character varying, 'tab_violation'::character varying, 'focus_violation'::character varying]::text[])),
  CONSTRAINT results_v2_pkey PRIMARY KEY (result_id),
  CONSTRAINT results_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid),
  CONSTRAINT results_v2_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students_v2(student_id),
  CONSTRAINT results_v2_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses_v2(course_id),
  CONSTRAINT results_v2_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures_v2(lecture_id)
);
CREATE TABLE public.resumed_questions_v2 (
  university_id uuid NOT NULL,
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  lecture_id uuid NOT NULL,
  question_id uuid NOT NULL,
  question_type character varying NOT NULL CHECK (question_type::text = ANY (ARRAY['mcq'::character varying, 'coding'::character varying]::text[])),
  last_code text,
  resume_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying NOT NULL DEFAULT 'not_started'::character varying CHECK (status::text = ANY (ARRAY['not_started'::character varying, 'resumed'::character varying, 'completed'::character varying]::text[])),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resumed_questions_v2_pkey PRIMARY KEY (resume_id),
  CONSTRAINT resumed_questions_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid),
  CONSTRAINT resumed_questions_v2_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students_v2(student_id),
  CONSTRAINT resumed_questions_v2_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses_v2(course_id),
  CONSTRAINT resumed_questions_v2_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures_v2(lecture_id),
  CONSTRAINT resumed_questions_v2_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions_v2(question_id)
);
CREATE TABLE public.resumes (
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  unit_id text NOT NULL,
  sub_unit_id text NOT NULL,
  resumed_coding_question_ids ARRAY,
  resumed_mcq_question_ids ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  subunit_coding_status text NOT NULL DEFAULT 'not_started'::text,
  subunit_mcq_status text NOT NULL DEFAULT 'not_started'::text,
  CONSTRAINT resumes_pkey PRIMARY KEY (student_id, course_id, unit_id, sub_unit_id),
  CONSTRAINT fk_course FOREIGN KEY (course_id) REFERENCES public.courses(course_id),
  CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.resumes_v2 (
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  lecture_id uuid NOT NULL,
  university_id uuid NOT NULL,
  subunit_coding_status character varying NOT NULL DEFAULT 'not_started'::character varying CHECK (subunit_coding_status::text = ANY (ARRAY['not_started'::character varying, 'resumed'::character varying, 'completed'::character varying]::text[])),
  subunit_mcq_status character varying NOT NULL DEFAULT 'not_started'::character varying CHECK (subunit_mcq_status::text = ANY (ARRAY['not_started'::character varying, 'resumed'::character varying, 'completed'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resumes_v2_pkey PRIMARY KEY (student_id, course_id, lecture_id),
  CONSTRAINT resumes_v2_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students_v2(student_id),
  CONSTRAINT resumes_v2_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses_v2(course_id),
  CONSTRAINT resumes_v2_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures_v2(lecture_id),
  CONSTRAINT resumes_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid)
);
CREATE TABLE public.sitting_plan (
  room_number text NOT NULL UNIQUE,
  sitting_id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_list jsonb NOT NULL DEFAULT '["demouser1", "demouser2", "demouser3", "demouser4", "demouser5", "demouser6", "demouser7", "demouser8", "demouser9", "demouser10", "demouser11", "demouser12", "demouser13", "demouser14", "demouser15", "demouser16", "demouser17", "demouser18", "demouser19", "demouser20"]'::jsonb,
  date_of_exam text NOT NULL DEFAULT '09-12-2025'::text,
  exam_status text NOT NULL DEFAULT 'pending'::text CHECK (exam_status = ANY (ARRAY['done'::text, 'pending'::text, 'ongoing'::text, 'assigned'::text])),
  access_key text,
  CONSTRAINT sitting_plan_pkey PRIMARY KEY (sitting_id)
);
CREATE TABLE public.sitting_plan_v2 (
  university_id uuid NOT NULL,
  lecture_id uuid,
  room_number text NOT NULL,
  date_of_exam date NOT NULL,
  access_key text,
  sitting_id uuid NOT NULL DEFAULT gen_random_uuid(),
  exam_status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (exam_status::text = ANY (ARRAY['pending'::character varying, 'assigned'::character varying, 'ongoing'::character varying, 'done'::character varying]::text[])),
  student_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sitting_plan_v2_pkey PRIMARY KEY (sitting_id),
  CONSTRAINT sitting_plan_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid),
  CONSTRAINT sitting_plan_v2_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures_v2(lecture_id)
);
CREATE TABLE public.student_exam_attempts_v2 (
  student_id uuid NOT NULL,
  university_id uuid NOT NULL,
  uni_reg_id text NOT NULL,
  attempt_id uuid NOT NULL DEFAULT gen_random_uuid(),
  mcq_exam_allowed_attempts integer NOT NULL DEFAULT 1,
  coding_exam_allowed_attempts integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  course_id uuid,
  lecture_id uuid,
  CONSTRAINT student_exam_attempts_v2_pkey PRIMARY KEY (attempt_id),
  CONSTRAINT student_exam_attempts_v2_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students_v2(student_id),
  CONSTRAINT student_exam_attempts_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid),
  CONSTRAINT student_exam_attempts_v2_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses_v2(course_id),
  CONSTRAINT student_exam_attempts_v2_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures_v2(lecture_id)
);
CREATE TABLE public.student_submission (
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  unit_id character varying NOT NULL,
  sub_unit_id character varying NOT NULL,
  question_id character varying NOT NULL,
  status character varying NOT NULL,
  last_submitted_code character varying,
  score numeric,
  attempt numeric,
  submission_id uuid NOT NULL DEFAULT gen_random_uuid(),
  last_submission timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  formattedResult jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT student_submission_pkey PRIMARY KEY (submission_id),
  CONSTRAINT fk_course FOREIGN KEY (course_id) REFERENCES public.courses(course_id),
  CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.studentexamattempts (
  studentid uuid NOT NULL,
  uni_reg_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mcq_exam_allowed_attempts integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  coding_exam_allowed_attempts integer NOT NULL DEFAULT 1,
  CONSTRAINT studentexamattempts_pkey PRIMARY KEY (id),
  CONSTRAINT studentexamattempts_studentid_fkey FOREIGN KEY (studentid) REFERENCES public.students(student_id)
);
CREATE TABLE public.students (
  user_id text NOT NULL UNIQUE,
  password text NOT NULL,
  profile_image_link text,
  uni_id uuid,
  batch_id uuid,
  uni_reg_id text NOT NULL UNIQUE,
  section text,
  student_id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone_num text,
  student_name text,
  email_id text,
  CONSTRAINT students_pkey PRIMARY KEY (student_id),
  CONSTRAINT students_uni_id_fkey FOREIGN KEY (uni_id) REFERENCES public.universities(uid),
  CONSTRAINT students_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(batch_id)
);
CREATE TABLE public.students_v2 (
  uni_id uuid NOT NULL,
  batch_id uuid,
  user_id text NOT NULL UNIQUE,
  uni_reg_id text NOT NULL UNIQUE,
  student_name text NOT NULL,
  email_id text,
  phone_num text,
  password_hash text NOT NULL,
  profile_image_link text,
  section text,
  student_id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_type character varying NOT NULL DEFAULT 'student'::character varying CHECK (account_type::text = ANY (ARRAY['student'::character varying, 'demo'::character varying, 'faculty'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT students_v2_pkey PRIMARY KEY (student_id),
  CONSTRAINT students_v2_uni_id_fkey FOREIGN KEY (uni_id) REFERENCES public.universities_v2(uid),
  CONSTRAINT students_v2_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches_v2(batch_id)
);
CREATE TABLE public.submission_history_v2 (
  university_id uuid NOT NULL,
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  lecture_id uuid NOT NULL,
  question_id uuid NOT NULL,
  submitted_code text,
  compile_status character varying,
  passed_test_cases integer,
  total_test_cases integer,
  score integer,
  submission_id uuid NOT NULL DEFAULT gen_random_uuid(),
  attempt integer NOT NULL DEFAULT 1 CHECK (attempt >= 1),
  full_result jsonb DEFAULT '[]'::jsonb,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT submission_history_v2_pkey PRIMARY KEY (submission_id),
  CONSTRAINT submission_history_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid),
  CONSTRAINT submission_history_v2_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students_v2(student_id),
  CONSTRAINT submission_history_v2_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses_v2(course_id),
  CONSTRAINT submission_history_v2_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures_v2(lecture_id),
  CONSTRAINT submission_history_v2_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions_v2(question_id)
);
CREATE TABLE public.system_config (
  id integer NOT NULL DEFAULT 1,
  is_downtime boolean DEFAULT false,
  downtime_msg text DEFAULT 'System is under maintenance. Please try again later.'::text,
  is_banner boolean DEFAULT false,
  banner_msg text DEFAULT ''::text,
  banner_color character varying DEFAULT 'orange'::character varying,
  banner_dismiss boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.system_config_v2 (
  id integer NOT NULL DEFAULT 1,
  is_downtime boolean DEFAULT false,
  downtime_msg text DEFAULT 'System is under maintenance. Please try again later.'::text,
  is_banner boolean DEFAULT false,
  banner_msg text DEFAULT ''::text,
  banner_color character varying DEFAULT 'orange'::character varying,
  banner_dismiss boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_config_v2_pkey PRIMARY KEY (id)
);
CREATE TABLE public.teachers_details (
  university_id uuid,
  uni_reg_id text NOT NULL UNIQUE,
  teacher_email text,
  teacher_phone text,
  password text,
  exam_room_name text,
  sitting_id uuid,
  joining_id text,
  teacher_id uuid NOT NULL DEFAULT gen_random_uuid(),
  assigned_section ARRAY DEFAULT '{}'::text[],
  teacher_name text,
  CONSTRAINT teachers_details_pkey PRIMARY KEY (teacher_id),
  CONSTRAINT teachers_details_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(uid)
);
CREATE TABLE public.teachers_details_v2 (
  university_id uuid NOT NULL,
  teacher_name text NOT NULL,
  uni_reg_id text NOT NULL UNIQUE,
  teacher_email text,
  teacher_phone text,
  password_hash text,
  exam_room_name text,
  joining_id text,
  teacher_id uuid NOT NULL DEFAULT gen_random_uuid(),
  assigned_section ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT teachers_details_v2_pkey PRIMARY KEY (teacher_id),
  CONSTRAINT teachers_details_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid)
);
CREATE TABLE public.test_time_sync (
  studentid uuid NOT NULL,
  courseid uuid NOT NULL,
  unitid character varying NOT NULL,
  subunitid character varying NOT NULL,
  testtype character varying NOT NULL,
  starttime bigint NOT NULL,
  timeleft bigint NOT NULL,
  time_spent bigint NOT NULL DEFAULT 0,
  total_duration bigint NOT NULL DEFAULT 0,
  syncid integer NOT NULL DEFAULT nextval('test_time_sync_syncid_seq'::regclass),
  CONSTRAINT test_time_sync_pkey PRIMARY KEY (syncid),
  CONSTRAINT fk_course FOREIGN KEY (courseid) REFERENCES public.courses(course_id),
  CONSTRAINT fk_student FOREIGN KEY (studentid) REFERENCES public.students(student_id)
);
CREATE TABLE public.test_time_sync_v2 (
  university_id uuid NOT NULL,
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  lecture_id uuid NOT NULL,
  test_type character varying NOT NULL CHECK (test_type::text = ANY (ARRAY['mcq'::character varying, 'coding'::character varying]::text[])),
  start_time bigint NOT NULL,
  time_left bigint CHECK (time_left >= 0),
  total_duration bigint CHECK (total_duration >= 0),
  sync_id uuid NOT NULL DEFAULT gen_random_uuid(),
  time_spent bigint NOT NULL DEFAULT 0 CHECK (time_spent >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT test_time_sync_v2_pkey PRIMARY KEY (sync_id),
  CONSTRAINT test_time_sync_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid),
  CONSTRAINT test_time_sync_v2_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students_v2(student_id),
  CONSTRAINT test_time_sync_v2_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses_v2(course_id),
  CONSTRAINT test_time_sync_v2_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures_v2(lecture_id)
);
CREATE TABLE public.units_v2 (
  course_id uuid NOT NULL,
  university_id uuid NOT NULL,
  unit_name text NOT NULL,
  start_date date,
  end_date date,
  firebase_id text,
  unit_id uuid NOT NULL DEFAULT gen_random_uuid(),
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT units_v2_pkey PRIMARY KEY (unit_id),
  CONSTRAINT units_v2_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses_v2(course_id),
  CONSTRAINT units_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid)
);
CREATE TABLE public.universities (
  uni_name text NOT NULL,
  uni_mail_id text NOT NULL UNIQUE,
  uni_contact_num text NOT NULL,
  uni_student_strength integer,
  monthly_charge numeric,
  uni_user_id_suffix text NOT NULL,
  uid uuid NOT NULL DEFAULT gen_random_uuid(),
  password character varying NOT NULL DEFAULT '123456789'::character varying,
  CONSTRAINT universities_pkey PRIMARY KEY (uid)
);
CREATE TABLE public.universities_v2 (
  uni_name text NOT NULL,
  uni_mail_id text NOT NULL UNIQUE,
  uni_contact_num text NOT NULL,
  uni_student_strength integer,
  monthly_charge numeric,
  uni_user_id_suffix text NOT NULL,
  uid uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT universities_v2_pkey PRIMARY KEY (uid)
);
CREATE TABLE public.university_admins (
  university_id uuid NOT NULL,
  admin_name text NOT NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  admin_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT university_admins_pkey PRIMARY KEY (admin_id),
  CONSTRAINT fk_university FOREIGN KEY (university_id) REFERENCES public.universities(uid)
);
CREATE TABLE public.university_admins_v2 (
  university_id uuid NOT NULL,
  admin_name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  admin_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT university_admins_v2_pkey PRIMARY KEY (admin_id),
  CONSTRAINT university_admins_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid)
);
CREATE TABLE public.upload_sessions (
  student_reg_id text NOT NULL,
  room_name text NOT NULL,
  date text NOT NULL,
  bucket text NOT NULL,
  key text NOT NULL,
  upload_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text DEFAULT 'in_progress'::text,
  parts jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  attempt integer NOT NULL DEFAULT 1,
  CONSTRAINT upload_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.upload_sessions_v2 (
  university_id uuid NOT NULL,
  student_id uuid NOT NULL,
  course_id uuid,
  lecture_id uuid,
  room_name text NOT NULL,
  date date NOT NULL,
  bucket text NOT NULL,
  key text NOT NULL,
  upload_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'in_progress'::text CHECK (status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'failed'::text])),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  attempt integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT upload_sessions_v2_pkey PRIMARY KEY (id),
  CONSTRAINT upload_sessions_v2_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities_v2(uid),
  CONSTRAINT upload_sessions_v2_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students_v2(student_id),
  CONSTRAINT upload_sessions_v2_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses_v2(course_id),
  CONSTRAINT upload_sessions_v2_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures_v2(lecture_id)
);