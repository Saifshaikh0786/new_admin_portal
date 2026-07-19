'use client';

import { useState, useEffect } from 'react';
import {
    ArrowLeft, FileText, Shield, Clock, Wifi, WifiOff, EyeOff, MousePointerClick,
    Check, X, Code, Award, User, Calendar, Activity, ShieldAlert, Download, Loader2
} from 'lucide-react';
import { API_CONFIG, getAdminToken } from '@/utils/api';

const fmtDuration = (secs) => {
    if (secs === null || secs === undefined) return '-';
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default function ExamReportView({ studentId, courseId, onBack }) {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = getAdminToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const res = await fetch(`${API_CONFIG.baseUrl.admin}${API_CONFIG.admin.examFullReport}`, {
                    method: 'POST',
                    headers,
                    credentials: 'include',
                    body: JSON.stringify({ student_id: studentId, course_id: courseId })
                });
                const data = await res.json();
                if (data.success) setReport(data.data);
                else setError(data.message || 'Failed to load report');
            } catch (e) {
                setError('Failed to load report');
            } finally {
                setLoading(false);
            }
        };
        if (studentId && courseId) fetchReport();
    }, [studentId, courseId]);

    const handleGenerateReport = () => {
        if (!report) return;
        const r = report;
        const pf = r.proctoring || {};
        const flag = (cond) => cond ? 'style="color:#dc2626;font-weight:700"' : '';
        const html = `<!DOCTYPE html><html><head><title>Exam Report - ${esc(r.student?.name)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI',Arial,sans-serif; }
  body { padding:40px; color:#111827; font-size:13px; line-height:1.5; }
  .header { border-bottom:3px solid #4f46e5; padding-bottom:16px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-end; }
  h1 { font-size:22px; color:#312e81; } h2 { font-size:15px; margin:24px 0 10px; color:#312e81; border-bottom:1px solid #e5e7eb; padding-bottom:4px; }
  .meta { color:#6b7280; font-size:11px; text-align:right; }
  table { width:100%; border-collapse:collapse; margin-bottom:12px; }
  th, td { border:1px solid #d1d5db; padding:6px 10px; text-align:left; vertical-align:top; }
  th { background:#eef2ff; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#4338ca; }
  .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:12px; }
  .stat { border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; }
  .stat .lbl { font-size:10px; text-transform:uppercase; color:#6b7280; letter-spacing:0.05em; }
  .stat .val { font-size:16px; font-weight:800; }
  pre { background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; padding:10px; font-size:11px; white-space:pre-wrap; word-break:break-word; font-family:Consolas,monospace; }
  .ok { color:#059669; font-weight:700; } .bad { color:#dc2626; font-weight:700; }
  .qcard { border:1px solid #d1d5db; border-radius:8px; padding:12px; margin-bottom:14px; page-break-inside:avoid; }
  .qtitle { font-weight:700; margin-bottom:8px; }
  .opt { padding:4px 8px; margin:2px 0; border-radius:4px; }
  .opt.correct { background:#d1fae5; } .opt.wrong { background:#fee2e2; }
  .footer { margin-top:32px; padding-top:12px; border-top:1px solid #e5e7eb; font-size:10px; color:#9ca3af; text-align:center; }
  @media print { body { padding:20px; } }
</style></head><body>
<div class="header">
  <div><h1>Examination Report</h1>
  <div style="font-size:14px;color:#4b5563;margin-top:4px">${esc(r.university_name || '')}</div></div>
  <div class="meta">Generated: ${fmtDate(r.generated_at)}<br/>Confidential &mdash; For Institutional Use</div>
</div>
<h2>Candidate Details</h2>
<table><tr><th>Name</th><th>Registration ID</th><th>Section</th><th>Batch</th></tr>
<tr><td>${esc(r.student?.name)}</td><td>${esc(r.student?.reg_id)}</td><td>${esc(r.student?.section || '-')}</td><td>${esc(r.student?.batch || '-')}</td></tr></table>
<h2>Exam Summary</h2>
<table><tr><th>Exam</th><th>Score</th><th>MCQ Marks</th><th>Coding Marks</th><th>Attempts</th><th>Started</th><th>Submitted</th><th>Duration</th></tr>
<tr><td>${esc(r.exam?.course_name)}</td><td><b>${r.exam?.total_marks ?? 0}${r.exam?.max_marks ? ' / ' + r.exam.max_marks : ''}</b></td>
<td>${r.exam?.mcq_marks ?? 0}</td><td>${r.exam?.coding_marks ?? 0}</td><td>${r.exam?.attempt_count ?? '-'}</td>
<td>${fmtDate(r.exam?.started_at)}</td><td>${fmtDate(r.exam?.ended_at)}</td><td>${fmtDuration(r.exam?.duration_seconds)}</td></tr></table>
<h2>Proctoring &amp; Integrity</h2>
<div class="grid">
  <div class="stat"><div class="lbl">Starting IP</div><div class="val" style="font-size:12px">${esc(pf.starting_ip || '-')}</div></div>
  <div class="stat"><div class="lbl">Ending IP</div><div class="val" style="font-size:12px" ${flag(pf.ip_changed)}>${esc(pf.ending_ip || '-')}${pf.ip_changed ? ' (changed)' : ''}</div></div>
  <div class="stat"><div class="lbl">Lost Focus</div><div class="val" ${flag(pf.lost_focus > 0)}>${pf.lost_focus}</div></div>
  <div class="stat"><div class="lbl">Face Warnings</div><div class="val" ${flag(pf.face_warnings > 0)}>${pf.face_warnings}${pf.face_warnings_max ? '/' + pf.face_warnings_max : ''}</div></div>
  <div class="stat"><div class="lbl">Disconnects</div><div class="val" ${flag(pf.disconnects > 0)}>${pf.disconnects}</div></div>
  <div class="stat"><div class="lbl">Offline Time</div><div class="val">${fmtDuration(pf.offline_seconds)}</div></div>
  <div class="stat"><div class="lbl">Blocked by Proctor</div><div class="val" ${flag(pf.blocked_by_proctor > 0)}>${pf.blocked_by_proctor}</div></div>
  <div class="stat"><div class="lbl">Blocked Time</div><div class="val">${fmtDuration(pf.blocked_seconds)}</div></div>
  <div class="stat"><div class="lbl">Compile Clicks</div><div class="val">${pf.compile_clicks}</div></div>
  <div class="stat"><div class="lbl">Submit Clicks</div><div class="val">${pf.submit_clicks}</div></div>
  <div class="stat"><div class="lbl">Continue Clicks</div><div class="val">${pf.continue_clicks}</div></div>
  <div class="stat"><div class="lbl">Submit Reason</div><div class="val" style="font-size:11px">${esc(pf.submit_reason || '-')}</div></div>
</div>
${r.mcq_questions?.length ? `<h2>MCQ Responses (${r.mcq_questions.length})</h2>` +
  r.mcq_questions.map((q, i) => `<div class="qcard">
    <div class="qtitle">Q${i + 1}. ${esc(q.question)} <span class="${q.is_correct ? 'ok' : 'bad'}">[${q.score}/${q.max_score}]</span></div>
    ${(q.options || []).map((o, oi) => `<div class="opt ${oi === q.correct_index ? 'correct' : (oi === q.selected_index ? 'wrong' : '')}">
      ${String.fromCharCode(65 + oi)}. ${esc(o)}
      ${oi === q.selected_index ? ' <b>&larr; Student\u2019s Answer</b>' : ''}
      ${oi === q.correct_index ? ' <span class="ok">(Correct Answer)</span>' : ''}
    </div>`).join('')}
    ${q.selected_index === null ? '<div style="color:#9ca3af;font-style:italic;margin-top:4px">Not answered</div>' : ''}
  </div>`).join('') : ''}
${r.coding_questions?.length ? `<h2>Coding Responses (${r.coding_questions.length})</h2>` +
  r.coding_questions.map((q, i) => `<div class="qcard">
    <div class="qtitle">Q${i + 1}. ${esc(q.title)} <span class="${q.score === q.max_score && q.max_score > 0 ? 'ok' : 'bad'}">[${q.score}/${q.max_score}]</span>
      &mdash; ${q.passed_test_cases}/${q.total_test_cases} test cases passed</div>
    ${q.description ? `<div style="margin-bottom:8px;color:#4b5563">${esc(q.description)}</div>` : ''}
    <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#4338ca;margin:8px 0 4px">Student&rsquo;s Submitted Code</div>
    <pre>${esc(q.submitted_code || 'No code submitted')}</pre>
    ${q.solution_code ? `<div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#059669;margin:8px 0 4px">Reference Solution</div>
    <pre>${esc(q.solution_code)}</pre>` : ''}
    ${q.hidden_cases?.length ? `<table style="margin-top:8px"><tr><th>Test Case</th><th>Status</th></tr>
      ${q.hidden_cases.map(hc => `<tr><td>${esc(hc.name)}</td><td class="${hc.passed ? 'ok' : 'bad'}">${hc.passed === null ? 'Not Run' : (hc.passed ? 'PASSED' : 'FAILED')}</td></tr>`).join('')}</table>` : ''}
  </div>`).join('') : ''}
<div class="footer">This report was generated automatically by the EduCode Examination Platform. All timestamps are local. Report ID: ${Date.now().toString(36).toUpperCase()}</div>
<script>window.onload = () => setTimeout(() => window.print(), 300);</script>
</body></html>`;
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 p-8 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                    <div className="h-10 w-40 rounded-xl neu-raised animate-pulse" />
                    <div className="h-10 w-44 rounded-xl neu-raised animate-pulse" />
                </div>
                <div className="neu-raised rounded-3xl p-8 flex flex-col items-center justify-center min-h-[300px] gap-4">
                    <Loader2 className="w-10 h-10 text-[var(--neu-achieve)] animate-spin" />
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">Building Full Report...</div>
                    <div className="text-xs text-gray-400">Collecting scores, proctoring events, and every submission</div>
                </div>
                {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-3xl neu-raised animate-pulse" />)}
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="max-w-5xl mx-auto p-8">
                <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="neu-raised rounded-3xl p-12 text-center">
                    <X className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <div className="font-bold text-gray-700 dark:text-gray-200">{error || 'Report unavailable'}</div>
                </div>
            </div>
        );
    }

    const r = report;
    const pf = r.proctoring || {};
    const ProctorStat = ({ label, value, danger, icon: Icon }) => (
        <div className="p-3 rounded-xl neu-flat border border-gray-100 dark:border-white/5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                {Icon && <Icon className="w-3 h-3" />}{label}
            </div>
            <div className={`text-sm font-black ${danger ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>{value}</div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-in fade-in slide-in-from-right-8 duration-500">
            {/* Top bar */}
            <div className="sticky top-0 z-30 flex justify-between items-center px-3 py-2 rounded-xl neu-raised backdrop-blur-xl shadow-lg">
                <button onClick={onBack} className="group flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <div className="w-7 h-7 rounded-full neu-inset flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="font-medium">Back to Exam</span>
                </button>
                <button onClick={handleGenerateReport} className="neu-btn-primary px-4 py-1.5 rounded-lg text-sm font-bold transition-all hover:scale-105 flex items-center gap-2">
                    <Download className="w-4 h-4" /> Generate Report
                </button>
            </div>

            {/* Student + exam header */}
            <div className="neu-raised rounded-3xl overflow-hidden shadow-xl">
                <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-violet-300" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white">Full Exam Report</h2>
                            <p className="text-xs text-gray-400">{r.exam?.course_name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                        <Calendar className="w-3.5 h-3.5" /> Generated {fmtDate(r.generated_at)}
                    </div>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <ProctorStat label="Student" value={r.student?.name} icon={User} />
                    <ProctorStat label="Reg ID" value={r.student?.reg_id} />
                    <ProctorStat label="Section" value={r.student?.section || '-'} />
                    <ProctorStat label="Batch" value={r.student?.batch || '-'} />
                    <ProctorStat label="Total Score" value={`${r.exam?.total_marks ?? 0}${r.exam?.max_marks ? ' / ' + r.exam.max_marks : ''}`} icon={Award} />
                    <ProctorStat label="MCQ / Coding" value={`${r.exam?.mcq_marks ?? 0} / ${r.exam?.coding_marks ?? 0}`} />
                    <ProctorStat label="Duration" value={fmtDuration(r.exam?.duration_seconds)} icon={Clock} />
                    <ProctorStat label="Submitted" value={fmtDate(r.exam?.ended_at)} />
                </div>
            </div>

            {/* Proctoring */}
            <div className="neu-raised rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-[var(--neu-achieve)]" />
                    <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--neu-achieve)]">Proctoring &amp; Integrity</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <ProctorStat label="Starting IP" value={pf.starting_ip || '-'} icon={Wifi} />
                    <ProctorStat label="Ending IP" value={`${pf.ending_ip || '-'}${pf.ip_changed ? ' (changed)' : ''}`} danger={pf.ip_changed} icon={Wifi} />
                    <ProctorStat label="Lost Focus" value={pf.lost_focus} danger={pf.lost_focus > 0} icon={EyeOff} />
                    <ProctorStat label="Face Warnings" value={`${pf.face_warnings}${pf.face_warnings_max ? '/' + pf.face_warnings_max : ''}`} danger={pf.face_warnings > 0} icon={ShieldAlert} />
                    <ProctorStat label="Disconnects" value={pf.disconnects} danger={pf.disconnects > 0} icon={WifiOff} />
                    <ProctorStat label="Offline Time" value={fmtDuration(pf.offline_seconds)} danger={pf.offline_seconds > 0} />
                    <ProctorStat label="Blocked by Proctor" value={pf.blocked_by_proctor} danger={pf.blocked_by_proctor > 0} />
                    <ProctorStat label="Blocked Time" value={fmtDuration(pf.blocked_seconds)} />
                    <ProctorStat label="Compile Clicks" value={pf.compile_clicks} icon={MousePointerClick} />
                    <ProctorStat label="Submit Clicks" value={pf.submit_clicks} icon={MousePointerClick} />
                    <ProctorStat label="Continue Clicks" value={pf.continue_clicks} />
                    <ProctorStat label="Submit Reason" value={pf.submit_reason || '-'} />
                </div>
            </div>

            {/* MCQ Q&A */}
            {r.mcq_questions?.length > 0 && (
                <div className="neu-raised rounded-3xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-extrabold uppercase tracking-widest text-blue-500">MCQ Responses ({r.mcq_questions.length})</span>
                    </div>
                    <div className="space-y-5">
                        {r.mcq_questions.map((q, i) => (
                            <div key={q.question_id} className="neu-flat rounded-2xl p-5 border border-gray-100 dark:border-white/5">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="font-bold text-gray-900 dark:text-white text-sm">Q{i + 1}. {q.question}</div>
                                    <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-black ${q.is_correct ? 'bg-[var(--neu-success-soft)] text-[var(--neu-success)]' : 'bg-red-500/10 text-red-500'}`}>
                                        {q.score}/{q.max_score}
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {(q.options || []).map((opt, oi) => {
                                        const isSel = oi === q.selected_index;
                                        const isCor = oi === q.correct_index;
                                        return (
                                            <div key={oi} className={`px-3 py-2 rounded-lg text-sm flex items-center justify-between border ${isCor ? 'bg-[var(--neu-success-soft)] border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-[var(--neu-success)]' : isSel ? 'bg-red-50 dark:bg-[var(--neu-danger-soft)] border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400' : 'neu-inset border-transparent text-gray-600 dark:text-gray-300'}`}>
                                                <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                                                <span className="flex items-center gap-2 text-[10px] font-bold uppercase">
                                                    {isSel && <span>Student&rsquo;s Answer</span>}
                                                    {isCor && <Check className="w-4 h-4" />}
                                                    {isSel && !isCor && <X className="w-4 h-4" />}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {q.selected_index === null && <div className="text-xs italic text-gray-400 px-1">Not answered</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Coding Q&A */}
            {r.coding_questions?.length > 0 && (
                <div className="neu-raised rounded-3xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Code className="w-4 h-4 text-[var(--neu-success)]" />
                        <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--neu-success)]">Coding Responses ({r.coding_questions.length})</span>
                    </div>
                    <div className="space-y-6">
                        {r.coding_questions.map((q, i) => (
                            <div key={q.question_id} className="neu-flat rounded-2xl p-5 border border-gray-100 dark:border-white/5 space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white text-sm mb-1">Q{i + 1}. {q.title}</div>
                                        <div className="text-xs text-gray-400">{q.passed_test_cases}/{q.total_test_cases} test cases passed{q.lecture_name ? ` \u00b7 ${q.lecture_name}` : ''}</div>
                                    </div>
                                    <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-black ${q.score === q.max_score && q.max_score > 0 ? 'bg-[var(--neu-success-soft)] text-[var(--neu-success)]' : 'bg-amber-500/10 text-amber-500'}`}>
                                        {q.score}/{q.max_score}
                                    </span>
                                </div>
                                {q.description && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 neu-inset rounded-xl p-3 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">{q.description}</div>
                                )}
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-violet-500 mb-1.5 flex items-center gap-1"><Code className="w-3 h-3" /> Student&rsquo;s Submitted Code</div>
                                    <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs overflow-x-auto custom-scrollbar max-h-72"><code>{q.submitted_code || 'No code submitted'}</code></pre>
                                </div>
                                {q.solution_code && (
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--neu-success)] mb-1.5 flex items-center gap-1"><Check className="w-3 h-3" /> Reference Solution</div>
                                        <pre className="bg-gray-900 text-emerald-100 rounded-xl p-4 text-xs overflow-x-auto custom-scrollbar max-h-72"><code>{q.solution_code}</code></pre>
                                    </div>
                                )}
                                {q.hidden_cases?.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {q.hidden_cases.map((hc, hi) => (
                                            <div key={hi} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between border ${hc.passed === true ? 'bg-[var(--neu-success-soft)] border-emerald-200 dark:border-emerald-500/20 text-[var(--neu-success)]' : hc.passed === false ? 'bg-red-50 dark:bg-[var(--neu-danger-soft)] border-red-200 dark:border-red-500/20 text-red-500' : 'neu-inset border-transparent text-gray-400'}`}>
                                                <span>{hc.name}</span>
                                                {hc.passed === true ? <Check className="w-3.5 h-3.5" /> : hc.passed === false ? <X className="w-3.5 h-3.5" /> : <span className="text-[9px]">N/A</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
