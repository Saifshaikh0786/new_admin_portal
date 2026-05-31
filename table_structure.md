# Table Structures

## students_v2
- `student_id`
- `uni_id`
- `batch_id`
- `user_id`
- `uni_reg_id`
- `student_name`
- `email_id`
- `phone_num`
- `password_hash`
- `profile_image_link`
- `section`
- `account_type`
- `created_at`
- `updated_at`

## batches_v2
- `batch_id`
- `university_id`
- `batch_name`
- `starting_date`
- `ending_date`
- `batch_student_strength`
- `batch_instructor_id`
- `created_at`
- `updated_at`

## courses_v2
- `course_id`
- `university_id`
- `course_name`
- `course_code`
- `course_starting_date`
- `course_ending_date`
- `course_total_units`
- `course_type`
- `firebase_course_id`
- `created_at`
- `updated_at`

## units_v2
- `unit_id`
- `course_id`
- `university_id`
- `unit_name`
- `start_date`
- `end_date`
- `position`
- `firebase_id`
- `created_at`
- `updated_at`

## lectures_v2
- `lecture_id`
- `unit_id`
- `course_id`
- `university_id`
- `lecture_name`
- `lecture_type`
- `coding_questions_to_show`
- `mcq_questions_to_show`
- `shuffle_questions`
- `pdf_url`
- `pdf2_url`
- `video_url`
- `position`
- `firebase_id`
- `created_at`
- `updated_at`
- `sub_type`

## questions_v2
- `question_id`
- `lecture_id`
- `course_id`
- `university_id`
- `question_type`
- `topic`
- `difficulty`
- `marks`
- `has_image`
- `tags`
- `position`
- `firebase_id`
- `created_at`
- `updated_at`

## coding_details_v2
- `coding_id`
- `question_id`
- `description`
- `code_constraint`
- `input_format`
- `output_format`
- `sample_io`
- `hidden_test_cases`
- `language_id`
- `compiler_code`
- `starter_code`
- `starter_codes`
- `has_multi_starter`
- `has_header`
- `header`
- `has_footer`
- `footer`
- `has_files`
- `files`
- `has_whitelist`
- `whitelist`
- `has_blacklist`
- `blacklist`
- `images`

## Output Format `1` if eligible, `0` if not. | Use the `>=` operator directly in your logic. | Integer `age` | Integer 1 or 0 | [{"input":"18","output":"1"},{"input":"17","output":"0"},{"input":"25","output":"1"}] | [{"input":"100","output":"1"},{"input":"0","output":"0"},{"input":"19","output":"1"},{"input":"12","output":"0"},{"input":"50","output":"1"},{"input":"-1","output":"0"}] | 50 | {"code":"#include <stdio.h>\n\nint main() {\n    int age;\n    scanf(\"%d\", &age);\n    printf(\"%d\", age >= 18);\n    return 0;\n}","language":"C (GCC 9.2.0)"} | #include <stdio.h>  int main() {     int age;     scanf("%d", &age);     printf("%d", age >= 18);     return 0; } | NULL | false | false | NULL | false | NULL | false | [] | false | [] | false | [] | [] |
- `f47f0f7a-c251-4771-905c-9d8bf26ac77a`
- `64d828c6-0572-4711-9379-836569a2ca2f`
- `A cargo loader is trying to find a perfect pivot point inside a container. At this point, the total weight of items to the left must perfectly equal the total weight of items to the right.  You are given an array of N weights. Find the very first equilibrium index (0-based) where the sum of elements strictly to its left equals the sum of elements strictly to its right. The element at the index itself is not included in either sum. If no such index exists, print -1.`
- `Must track the left sum and right sum as you traverse. Avoid recalculating the total sum for every single index to maintain efficiency.`
- `Line 1: integer N (1 <= N <= 1000) Line 2: N space-separated integers (-1000 <= elements <= 1000)`
- `Single line: integer representing the 0-based equilibrium index, or -1 No trailing space. Line ends with newline.`
- `[{"input":"7\n-7 1 5 2 -4 3 0","output":"3"},{"input":"3\n1 2 3","output":"-1"},{"input":"3\n2 0 2","output":"1"}]`
- `[{"input":"1\n42","output":"0"},{"input":"4\n0 0 0 0","output":"0"},{"input":"5\n1 1 1 1 1","output":"2"},{"input":"2\n1 -1","output":"-1"},{"input":"6\n1 2 3 0 3 3","output":"3"},{"input":"5\n-1 -2 -3 -1 -2","output":"2"}]`
- `50`
- `{"code":"#include <stdio.h>\n\nint main() {\n    int n;\n    if(scanf(\"%d\", &n) != 1) return 0;\n    int arr[1005];\n    long long total = 0;\n    for(int i = 0; i < n; i++) {\n        scanf(\"%d\", &arr[i]);\n        total += arr[i];\n    }\n    long long left_sum = 0;\n    int found = -1;\n    for(int i = 0; i < n; i++) {\n        total -= arr[i];\n        if (left_sum == total) {\n            found = i;\n            break;\n        }\n        left_sum += arr[i];\n    }\n    printf(\"%d\\n\", found);\n    return 0;\n}","language":"c"}`
- `#include <stdio.h>  int main() {     int n;     scanf("%d", &n);          int arr[n];     for(int i = 0; i < n; i++) {         scanf("%d", &arr[i]);     }          // TODO: Process the array to find equilibrium index          // TODO: Print output          return 0; }`
- `{"50":"#include <stdio.h>\n\nint main() {\n    int n;\n    scanf(\"%d\", &n);\n    \n    int arr[n];\n    for(int i = 0; i < n; i++) {\n        scanf(\"%d\", &arr[i]);\n    }\n    \n    // TODO: Process the array to find equilibrium index\n    \n    // TODO: Print output\n    \n    return 0;\n}","54":"#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    \n    vector<int> arr(n);\n    for(int i = 0; i < n; i++) {\n        cin >> arr[i];\n    }\n    \n    // TODO: Process the array\n    \n    // TODO: Print output\n    \n    return 0;\n}","62":"import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n        int n = sc.nextInt();\n        int[] arr = new int[n];\n        \n        for(int i = 0; i < n; i++) {\n            arr[i] = sc.nextInt();\n        }\n        \n        // TODO: Process the array\n        \n        // TODO: Print output\n        \n        sc.close();\n    }\n}","63":"const readline = require('readline');\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\nlet lines = [];\nrl.on('line', (line) => {\n    lines.push(line);\n}).on('close', () => {\n    const n = parseInt(lines[0]);\n    const arr = lines[1].split(' ').map(Number);\n    \n    // TODO: Process the array\n    \n    // TODO: Print output using console.log()\n});","71":"n = int(input())\narr = list(map(int, input().split()))\n\n# TODO: Process the array\n\n# TODO: Print output"}`
- `true`
- `false`
- `NULL`
- `false`
- `NULL`
- `false`
- `[]`
- `false`
- `[]`
- `false`
- `[]`
- `[]`

## mcq_details_v2
- `mcq_id`
- `question_id`
- `question_body`
- `mcq_sub_type`
- `options`
- `unit_label`
- `lecture_label`
- `images`

## batch_courses_v2
- `batch_id`
- `course_id`
- `assigned_at`

## results_v2
- `result_id`
- `university_id`
- `student_id`
- `course_id`
- `lecture_id`
- `result_type`
- `marks_obtained`
- `total_marks`
- `attempt_count`
- `submitted_at`
- `updated_at`
- `submit_reason`

## exam_events_v2
- `event_id`
- `university_id`
- `student_id`
- `course_id`
- `lecture_id`
- `event_type`
- `event_timestamp`
- `metadata`

## resumed_questions_v2
- `resume_id`
- `university_id`
- `student_id`
- `course_id`
- `lecture_id`
- `question_id`
- `question_type`
- `status`
- `last_code`
- `updated_at`

## submission_history_v2
- `submission_id`
- `university_id`
- `student_id`
- `course_id`
- `lecture_id`
- `question_id`
- `submitted_code`
- `compile_status`
- `passed_test_cases`
- `total_test_cases`
- `score`
- `attempt`
- `full_result`
- `submitted_at`

## test_time_sync_v2
- `sync_id`
- `university_id`
- `student_id`
- `course_id`
- `lecture_id`
- `test_type`
- `start_time`
- `time_left`
- `time_spent`
- `total_duration`
- `created_at`
- `updated_at`

## student_exam_attempts_v2
- `attempt_id`
- `student_id`
- `university_id`
- `uni_reg_id`
- `mcq_exam_allowed_attempts`
- `coding_exam_allowed_attempts`
- `created_at`
- `updated_at`
- `course_id`
- `lecture_id`

## sitting_plan_v2
- `sitting_id`
- `university_id`
- `lecture_id`
- `room_number`
- `date_of_exam`
- `exam_status`
- `access_key`
- `student_list`
- `created_at`

## lecture_exam_config_v2
- `config_id`
- `lecture_id`
- `config`

## resumes_v2
- `student_id`
- `course_id`
- `lecture_id`
- `university_id`
- `subunit_coding_status`
- `subunit_mcq_status`
- `created_at`
- `updated_at`

## teachers_details_v2
- `teacher_id`
- `university_id`
- `teacher_name`
- `uni_reg_id`
- `teacher_email`
- `teacher_phone`
- `password_hash`
- `exam_room_name`
- `joining_id`
- `assigned_section`
- `created_at`
- `updated_at`

