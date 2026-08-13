const s = {
    "student_id": "22e2c585-7fc5-4291-b35d-b26d28fcc5e1",
    "student_name": "BISHAL SARKAR",
    "uni_reg_id": "12516077",
    "exam_duration_seconds": 6324,
    "start_timestamp": "2026-05-15T04:10:20.983+00:00",
    "start_os_platform": "win32",
    "start_config": "{\"os\":{\"arch\":\"x64\",\"release\":\"10.0.26200\",\"version\":\"Windows 11 Pro\",\"hostname\":\"MOTINDROSARKAR\",\"platform\":\"win32\"},\"proxy\":{\"settings\":\"DIRECT\"},\"network\":{\"interfaces\":[{\"ip\":\"172.16.31.128\",\"mac\":\"00:0c:29:b4:32:0d\",\"interface\":\"Ethernet\"}]},\"timestamp\":\"2026-05-15T04:10:21.541Z\",\"capturedAt\":\"2026-05-15T04:10:23.552Z\"}",
    "end_config": "{}"
};

const parseJSON = (str) => {
    if (!str) return {};
    if (typeof str === 'object') return str;
    try { return JSON.parse(str); } catch { return {}; }
};
const safe = (v) => {
    if (v === null || v === undefined || v === '') return '-';
    if (typeof v === 'object') {
        try { return JSON.stringify(v).replace(/\"/g, '\''); } catch { return '-'; }
    }
    return String(v).replace(/\"/g, '\'');
};
const fmtDurSecs = (secs) => {
    if (!secs || isNaN(secs)) return '-';
    return String(Math.round(secs / 60));
};
const fmtTime = (ts) => {
    if (!ts) return '-';
    try { return new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }); } catch { return String(ts); }
};

const sc = parseJSON(s.start_config);
const ec = parseJSON(s.end_config);
const scOs = sc.os || {};
const ecOs = ec.os || {};

const row = [
    1,
    safe(s.student_name),
    safe(s.uni_reg_id),
    safe(s.section),
    safe(s.course_score_percent),
    safe(s.total_marks_obtained),
    safe(s.coding_marks),
    safe(s.mcq_marks),
    fmtDurSecs(s.exam_duration_seconds),
    fmtTime(s.exam_submitted_at || s.end_timestamp),
    fmtTime(s.exam_started_at || s.start_timestamp || sc.timestamp),
    fmtTime(s.exam_submitted_at || s.end_timestamp || ec.lastUpdatedAt),
    safe(s.starting_ip || ec.startingIp || ''),
    safe(s.ending_ip || ec.endingIp || ''),
    safe(s.lost_focus_count ?? ec.lostFocusCount ?? 0),
    safe(s.regained_focus_count ?? ec.regainedFocusCount ?? 0),
    safe(s.face_warnings ?? ec.faceWarnings ?? 0),
    safe(s.face_warnings_max ?? ec.faceWarningsMax ?? 0),
    safe(s.internet_disconnects ?? ec.internetDisconnects ?? 0),
    safe(s.internet_offline_seconds ?? ec.internetOfflineSeconds ?? 0),
    safe(s.blocked_by_proctor ?? ec.blockedByProctorCount ?? 0),
    safe(s.blocked_seconds ?? ec.blockedSeconds ?? 0),
    safe(s.compile_clicks ?? ec.compileClicks ?? 0),
    safe(s.submit_clicks ?? ec.submitClicks ?? 0),
    safe(s.continue_clicks ?? ec.continueClicks ?? 0),
    safe(s.submit_reason || ec.submitReason || ''),
    fmtTime(s.start_timestamp || sc.timestamp || ''),
    fmtTime(s.start_captured_at || sc.capturedAt || ''),
    safe(s.start_os_platform || scOs.platform || ''),
    safe(s.start_os_version || scOs.version || ''),
    safe(s.start_os_release || scOs.release || ''),
    safe(s.start_os_arch || scOs.arch || ''),
    safe(s.start_hostname || scOs.hostname || ''),
    safe(s.start_network || (sc.network ? JSON.stringify(sc.network) : '') || ''),
    safe(s.start_proxy || (sc.proxy ? JSON.stringify(sc.proxy) : '') || ''),
];

console.log(row.join(','));
