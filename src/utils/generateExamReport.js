// Ported verbatim from the legacy AdminPortal details-analysis page.
// Generates the styled A4 exam report HTML and opens it via a Blob URL.
export function generateExamReport(ctx) {
    const {
        studentInfo = {}, regNo = '', examName = '', sectionName = '',
        mcqDetails = null, codingDetails = null,
        telemetry = {}, envLogs = {},
        mcqAnalytics = {}, codingAnalytics = {},
        examStartedAt = null, examEndedAt = null, examDuration = null,
        mcqStartedAt = null, mcqEndedAt = null, mcqDuration = null,
        codingStartedAt = null, codingEndedAt = null, codingDuration = null,
        overallMcqScore = 0, maxMcqScore = 0,
        overallCodingScore = 0, maxCodingScore = 0,
        examTotalMarks = 0, examMcqMarks = 0, examCodingMarks = 0,
        displayTotalScore = 0, displayMaxScore = 0, finalPercentage = 0
    } = ctx;

    const formatTime = (d) => d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';

        const mcqSubs = mcqDetails?.submissions?.filter(s => s.type === 'mcq') || [];
        const codingSubs = codingDetails?.submissions?.filter(s => s.type === 'coding') || [];
        const now = new Date();
        const reportId = `RPT-${regNo}-${Date.now().toString(36).toUpperCase()}`;

        const esc = (str) => (str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const mcqRows = mcqSubs.map((sub, idx) => {
            const correctOpt = sub.options?.find(o => typeof o !== 'string' && o.isAnswer);
            const correctText = correctOpt ? esc(correctOpt.option) : '-';
            const isCorrect = sub.is_correct;
            return `<tr style="${idx % 2 === 0 ? '' : 'background:#f8fafc;'}">
                <td class="tc">${idx + 1}</td>
                <td class="tl" style="max-width:240px;">${esc(sub.question_title)}</td>
                <td class="tl" style="color:${isCorrect ? '#047857' : '#b91c1c'};font-weight:600;">${esc(sub.submitted_answer_text) || '<em style="color:#9ca3af;">Skipped</em>'}</td>
                <td class="tl" style="color:#1d4ed8;font-weight:600;">${correctText}</td>
                <td class="tc"><span class="badge ${isCorrect ? 'badge-pass' : 'badge-fail'}">${isCorrect ? '✓ Correct' : '✗ Wrong'}</span></td>
                <td class="tc" style="font-weight:700;">${sub.score_obtained || 0}</td>
            </tr>`;
        }).join('');

        const codingCards = codingSubs.map((sub, idx) => {
            const results = sub.formattedResult || [];
            const totalCases = results.length || 0;
            const passedCases = results.filter(r => Object.values(r)[0]?.testCasePassed).length;
            return `<div class="coding-card">
                <div class="coding-header">
                    <div>
                        <span class="coding-num">${idx + 1}</span>
                        <strong>${esc(sub.question_title) || 'Coding Challenge'}</strong>
                    </div>
                    <div class="coding-meta">
                        <span class="badge ${passedCases === totalCases && totalCases > 0 ? 'badge-pass' : 'badge-warn'}">Tests: ${passedCases}/${totalCases}</span>
                        <span style="font-weight:700;color:#6d28d9;">Score: ${sub.score_obtained || 0}/${(sub.total_question_marks || 60) / 10}</span>
                    </div>
                </div>
                ${sub.question_desc ? `<div class="coding-desc">${esc(sub.question_desc)}</div>` : ''}
                <div class="code-grid">
                    <div class="code-panel">
                        <div class="code-label">
                            <span class="code-dot" style="background:#ef4444;"></span>
                            <span class="code-dot" style="background:#f59e0b;"></span>
                            <span class="code-dot" style="background:#22c55e;"></span>
                            <span style="margin-left:6px;">Student's Submission</span>
                        </div>
                        <pre class="code-block code-dark">${esc(sub.submitted_answer || sub.submitted_code || '// No code submitted')}</pre>
                    </div>
                    <div class="code-panel">
                        <div class="code-label code-label-ref">
                            <span>✓ Reference Solution</span>
                        </div>
                        <pre class="code-block code-green">${esc(sub.correct_code || sub.expected_solution || '// Not available')}</pre>
                    </div>
                </div>
            </div>`;
        }).join('');

        const startCfg = envLogs?.start_config;
        const endCfg = envLogs?.end_config;
        const infoRow = (label, val) => val != null && val !== '' && val !== undefined ? `<tr><td class="info-label">${label}</td><td class="info-value">${val}</td></tr>` : '';

        const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Report Card — ${studentInfo?.name || regNo}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap');
    @page { size: A4; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    body { font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; background: #e2e8f0; min-height: 100vh; display: flex; justify-content: center; padding: 32px 0; }
    .paper { width: 210mm; min-height: auto; background: #fff; box-shadow: 0 25px 60px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08); border-radius: 4px; overflow: hidden; }

    /* Header */
    .report-header { background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #3b82f6 100%); color: #fff; padding: 28px 36px; position: relative; overflow: hidden; }
    .report-header::before { content: ''; position: absolute; top: -50%; right: -10%; width: 300px; height: 300px; background: rgba(255,255,255,0.05); border-radius: 50%; }
    .report-header::after { content: ''; position: absolute; bottom: -30%; left: 20%; width: 200px; height: 200px; background: rgba(255,255,255,0.03); border-radius: 50%; }
    .report-title { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; position: relative; z-index: 1; }
    .report-subtitle { font-size: 11px; opacity: 0.7; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px; position: relative; z-index: 1; }
    .report-meta { position: relative; z-index: 1; text-align: right; font-size: 10px; opacity: 0.8; line-height: 1.6; }
    .report-id { font-family: monospace; font-size: 9px; opacity: 0.5; margin-top: 4px; }

    /* Content */
    .content { padding: 28px 36px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2.5px; color: #1e40af; border-bottom: 2px solid #dbeafe; padding-bottom: 6px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
    .section-title::before { content: ''; width: 4px; height: 16px; background: linear-gradient(to bottom, #1e40af, #3b82f6); border-radius: 2px; }

    /* Info Tables */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-box { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .info-box-title { background: #f8fafc; padding: 8px 14px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    table.info { width: 100%; border-collapse: collapse; }
    .info-label { padding: 6px 14px; font-size: 11px; color: #64748b; width: 130px; border-bottom: 1px solid #f1f5f9; font-weight: 500; }
    .info-value { padding: 6px 14px; font-size: 11px; color: #0f172a; border-bottom: 1px solid #f1f5f9; font-weight: 600; font-family: 'Inter', monospace; }

    /* Score Banner */
    .score-banner { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; border: 2px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin: 16px 0; }
    .score-cell { text-align: center; padding: 16px 12px; }
    .score-cell:not(:last-child) { border-right: 2px solid #e2e8f0; }
    .score-num { font-size: 32px; font-weight: 900; line-height: 1; }
    .score-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-top: 4px; }

    /* Data Table */
    table.data { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; font-size: 11px; }
    table.data th { background: #f1f5f9; padding: 8px 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; border-bottom: 2px solid #e2e8f0; }
    table.data td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
    .tc { text-align: center; }
    .tl { text-align: left; }

    /* Badges */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; letter-spacing: 0.5px; }
    .badge-pass { background: #dcfce7; color: #166534; }
    .badge-fail { background: #fee2e2; color: #991b1b; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .badge-info { background: #dbeafe; color: #1e40af; }

    /* Coding */
    .coding-card { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; overflow: hidden; page-break-inside: avoid; }
    .coding-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .coding-num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; background: #7c3aed; color: #fff; font-size: 10px; font-weight: 800; margin-right: 8px; }
    .coding-meta { display: flex; align-items: center; gap: 10px; font-size: 10px; }
    .coding-desc { padding: 10px 14px; font-size: 11px; color: #475569; line-height: 1.6; border-bottom: 1px solid #e2e8f0; background: #fafafa; }
    .code-grid { display: grid; grid-template-columns: 1fr 1fr; }
    .code-panel { border-right: 1px solid #e2e8f0; }
    .code-panel:last-child { border-right: none; }
    .code-label { padding: 6px 12px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 4px; }
    .code-label-ref { color: #047857; background: #f0fdf4; }
    .code-dot { width: 7px; height: 7px; border-radius: 50%; }
    .code-block { margin: 0; padding: 10px 12px; font-size: 9.5px; line-height: 1.65; white-space: pre-wrap; word-wrap: break-word; font-family: 'Consolas', 'Monaco', monospace; }
    .code-dark { background: #1e293b; color: #cbd5e1; }
    .code-green { background: #f0fdf4; color: #166534; }

    /* Telemetry Grid */
    .tel-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .tel-item { padding: 8px 10px; border: 1px solid #f1f5f9; border-radius: 6px; background: #fafafa; }
    .tel-item-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; }
    .tel-item-value { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .tel-warn { color: #dc2626 !important; }

    /* Signatures */
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 48px; padding-top: 8px; }
    .sig-box { text-align: center; }
    .sig-line { border-top: 1.5px solid #94a3b8; margin-top: 48px; padding-top: 8px; }
    .sig-name { font-size: 10px; font-weight: 700; color: #334155; }
    .sig-date { font-size: 9px; color: #94a3b8; margin-top: 2px; }

    /* Footer */
    .report-footer { border-top: 2px solid #1e40af; margin-top: 28px; padding-top: 12px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }

    /* Print */
    @media print {
        body { background: #fff !important; padding: 0; }
        .paper { box-shadow: none; border-radius: 0; width: 100%; }
        .no-print { display: none !important; }
        .report-header { background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #3b82f6 100%) !important; color: #fff !important; }
        .score-cell { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .badge-pass { background: #dcfce7 !important; color: #166534 !important; }
        .badge-fail { background: #fee2e2 !important; color: #991b1b !important; }
        .badge-warn { background: #fef3c7 !important; color: #92400e !important; }
        .badge-info { background: #dbeafe !important; color: #1e40af !important; }
        .code-dark { background: #1e293b !important; color: #cbd5e1 !important; }
        .code-green { background: #f0fdf4 !important; color: #166534 !important; }
        .tel-item { background: #fafafa !important; border: 1px solid #e2e8f0 !important; }
        .info-box-title { background: #f8fafc !important; }
        .coding-num { background: #7c3aed !important; color: #fff !important; }
        .coding-header { background: #f8fafc !important; }
        .coding-desc { background: #fafafa !important; }
        .code-label { background: #f8fafc !important; }
        .code-label-ref { background: #f0fdf4 !important; }
        .section-title::before { background: linear-gradient(to bottom, #1e40af, #3b82f6) !important; }
        table.data th { background: #f1f5f9 !important; }
        .code-block { max-height: none !important; overflow: visible !important; }
        .coding-card { page-break-inside: avoid; }
    }
</style></head><body>
<div class="paper">

<!-- ═══ HEADER ═══ -->
<div class="report-header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
            <div class="report-title">Student Analysis Report</div>
            <div class="report-subtitle">Examination Scrutiny & Evaluation Document</div>
        </div>
        <div class="report-meta">
            <div>${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
            <div>${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="report-id">${reportId}</div>
        </div>
    </div>
</div>

<div class="content">

<!-- ═══ STUDENT + SCORE ═══ -->
<div class="section">
    <div class="info-grid">
        <div class="info-box">
            <div class="info-box-title">Student Information</div>
            <table class="info">
                ${infoRow('Full Name', studentInfo?.name || 'N/A')}
                ${infoRow('Registration No.', studentInfo?.regNo || regNo)}
                ${infoRow('Email', studentInfo?.email || '-')}
                ${infoRow('Section', studentInfo?.section || sectionName)}
                ${infoRow('Course / Exam', studentInfo?.course || examName)}
            </table>
        </div>
        <div class="info-box">
            <div class="info-box-title">Examination Details</div>
            <table class="info">
                ${infoRow('Exam Name', examName)}
                ${infoRow('Section', sectionName)}
                ${infoRow('Started', examStartedAt ? examStartedAt.toLocaleString() : 'N/A')}
                ${infoRow('Ended', examEndedAt ? examEndedAt.toLocaleString() : 'N/A')}
                ${infoRow('Duration', examDuration ? examDuration + ' minutes' : 'N/A')}
                ${infoRow('Completion', finalPercentage + '%')}
            </table>
        </div>
    </div>

    <div class="score-banner">
        <div class="score-cell" style="background:#eff6ff;">
            <div class="score-num" style="color:#1e40af;">${examTotalMarks || displayTotalScore}<span style="font-size:14px;font-weight:500;color:#64748b;">/${displayMaxScore}</span></div>
            <div class="score-label">Total Score</div>
        </div>
        <div class="score-cell" style="background:#f0fdf4;">
            <div class="score-num" style="color:#059669;">${examMcqMarks || overallMcqScore}</div>
            <div class="score-label">MCQ Marks</div>
        </div>
        <div class="score-cell" style="background:#faf5ff;">
            <div class="score-num" style="color:#7c3aed;">${examCodingMarks || overallCodingScore}</div>
            <div class="score-label">Coding Marks</div>
        </div>
    </div>
</div>

<!-- ═══ ACTIVITY TELEMETRY ═══ -->
<div class="section">
    <div class="section-title">Activity Telemetry</div>
    <div class="tel-grid">
        ${[
            ['Starting IP', telemetry.startingIp, false],
            ['Ending IP', telemetry.endingIp, false],
            ['Lost Focus', telemetry.lostFocusCount, telemetry.lostFocusCount > 0],
            ['Regained Focus', telemetry.regainedFocusCount, false],
            ['Face Warnings', (telemetry.faceWarnings || 0) + ' / ' + (telemetry.faceWarningsMax || 40), telemetry.faceWarnings > 0],
            ['Net Disconnects', telemetry.internetDisconnects, telemetry.internetDisconnects > 0],
            ['Offline Time', (telemetry.internetOfflineSeconds || 0) + 's', telemetry.internetOfflineSeconds > 0],
            ['Proctor Blocks', telemetry.blockedByProctorCount, telemetry.blockedByProctorCount > 0],
            ['Blocked Time', (telemetry.blockedSeconds || 0) + 's', false],
            ['Compile Clicks', telemetry.compileClicks, false],
            ['Submit Clicks', telemetry.submitClicks, false],
            ['Submit Reason', telemetry.submitReason || '-', false],
        ].map(([l, v, w]) => `<div class="tel-item"><div class="tel-item-label">${l}</div><div class="tel-item-value ${w ? 'tel-warn' : ''}">${v ?? '-'}</div></div>`).join('')}
    </div>
</div>

<!-- ═══ ENVIRONMENT LOGS ═══ -->
<div class="section">
    <div class="section-title">Environment Logs</div>
    <div class="info-grid">
        ${[{cfg: startCfg, label: 'Start Configuration'}, {cfg: endCfg, label: 'End Configuration'}].map(({cfg, label}) => `
            <div class="info-box">
                <div class="info-box-title">${label}</div>
                ${!cfg ? '<div style="padding:12px 14px;font-size:11px;color:#94a3b8;font-style:italic;">No config recorded.</div>' : `
                <table class="info">
                    ${cfg.os ? infoRow('OS', (cfg.os.version || cfg.os.platform) + ' (' + cfg.os.arch + ')') : ''}
                    ${cfg.os?.hostname ? infoRow('Hostname', cfg.os.hostname) : ''}
                    ${cfg.os?.release ? infoRow('Release', cfg.os.release) : ''}
                    ${cfg.network?.interfaces?.map(i => infoRow(i.interface, i.ip + ' — MAC: ' + i.mac)).join('') || ''}
                    ${cfg.proxy ? infoRow('Proxy', cfg.proxy.settings) : ''}
                    ${cfg.timestamp ? infoRow('Timestamp', new Date(cfg.timestamp).toLocaleString()) : ''}
                </table>`}
            </div>`).join('')}
    </div>
</div>

<!-- ═══ PROCTORING ANALYTICS ═══ -->
<div class="section">
    <div class="section-title">Proctoring Analytics</div>
    <div class="info-grid">
        <div class="info-box">
            <div class="info-box-title" style="color:#1e40af;">MCQ Section ${(mcqDuration || examDuration) ? '<span class="badge badge-info" style="margin-left:8px;">⏱ ' + (mcqDuration || examDuration) + 'm</span>' : ''}</div>
            <table class="info">
                ${infoRow('Started', (mcqStartedAt || examStartedAt) ? formatTime(mcqStartedAt || examStartedAt) : 'N/A')}
                ${infoRow('Ended', (mcqEndedAt || examEndedAt) ? formatTime(mcqEndedAt || examEndedAt) : 'N/A')}
                ${infoRow('Focus Lost', mcqAnalytics.focus_lost_count ?? telemetry.lostFocusCount ?? 0)}
                ${infoRow('Face Warnings', mcqAnalytics.face_warnings ?? telemetry.faceWarnings ?? 0)}
                ${infoRow('Network Health', mcqAnalytics.network_health || 'Stable')}
                ${infoRow('Blocked', (mcqAnalytics.blocked_seconds ?? 0) + 's')}
            </table>
        </div>
        <div class="info-box">
            <div class="info-box-title" style="color:#6d28d9;">Coding Section ${(codingDuration || examDuration) ? '<span class="badge" style="background:#f3e8ff;color:#6d28d9;margin-left:8px;">⏱ ' + (codingDuration || examDuration) + 'm</span>' : ''}</div>
            <table class="info">
                ${infoRow('Started', (codingStartedAt || examStartedAt) ? formatTime(codingStartedAt || examStartedAt) : 'N/A')}
                ${infoRow('Ended', (codingEndedAt || examEndedAt) ? formatTime(codingEndedAt || examEndedAt) : 'N/A')}
                ${infoRow('Focus Lost', codingAnalytics.focus_lost_count ?? 0)}
                ${infoRow('Tab Switches', codingAnalytics.tab_switches ?? 0)}
                ${infoRow('Network Health', codingAnalytics.network_health || 'Stable')}
                ${infoRow('Disconnects', codingAnalytics.network_disconnects ?? telemetry.internetDisconnects ?? 0)}
            </table>
        </div>
    </div>
</div>

<!-- ═══ MCQ RESPONSES ═══ -->
${mcqSubs.length > 0 ? `
<div class="section" style="page-break-before:auto;">
    <div class="section-title">MCQ Responses — <span style="font-weight:500;font-size:10px;color:#475569;">${mcqSubs.filter(s => s.is_correct).length}/${mcqSubs.length} Correct &nbsp;|&nbsp; Score: ${overallMcqScore || examMcqMarks}/${maxMcqScore || mcqSubs.length}</span></div>
    <table class="data">
        <thead><tr>
            <th class="tc" style="width:30px;">#</th>
            <th class="tl">Question</th>
            <th class="tl">Student's Answer</th>
            <th class="tl">Correct Answer</th>
            <th class="tc" style="width:70px;">Result</th>
            <th class="tc" style="width:40px;">Pts</th>
        </tr></thead>
        <tbody>${mcqRows}</tbody>
    </table>
</div>` : ''}

<!-- ═══ CODING RESPONSES ═══ -->
${codingSubs.length > 0 ? `
<div class="section" style="page-break-before:auto;">
    <div class="section-title">Coding Responses — <span style="font-weight:500;font-size:10px;color:#475569;">Score: ${overallCodingScore || examCodingMarks}/${maxCodingScore || codingSubs.reduce((s, c) => s + (c.total_question_marks || 0), 0) / 10 || 12}</span></div>
    ${codingCards}
</div>` : ''}

<!-- ═══ SIGNATURES ═══ -->
<div class="sig-grid">
    <div class="sig-box"><div class="sig-line"><div class="sig-name">Examiner</div><div class="sig-date">Date: _______________</div></div></div>
    <div class="sig-box"><div class="sig-line"><div class="sig-name">Head of Department</div><div class="sig-date">Date: _______________</div></div></div>
    <div class="sig-box"><div class="sig-line"><div class="sig-name">Controller of Examination</div><div class="sig-date">Date: _______________</div></div></div>
</div>

<!-- ═══ FOOTER ═══ -->
<div class="report-footer">
    <div>This is a system-generated examination report. All data is sourced from the proctored examination platform.</div>
    <div style="text-align:right;">${reportId}</div>
</div>

</div><!-- content -->
</div><!-- paper -->

<!-- Print Button -->
<div class="no-print" style="position:fixed;bottom:24px;right:24px;display:flex;gap:12px;">
    <button onclick="window.print()" style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:white;border:none;padding:14px 28px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(30,64,175,0.35);display:flex;align-items:center;gap:8px;">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        Save as PDF
    </button>
</div>

</body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.click();
        
        // Clean up the object URL after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
}
